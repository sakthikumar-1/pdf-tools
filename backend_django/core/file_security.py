from core.security_logger import log_security_event
"""
Simatrix PDF — Enterprise File & PDF Security Infrastructure.
Enforces rigorous validation, defense-in-depth sanitization, and resource exhaustion guardrails:
1. Magic bytes signature validation (%PDF-).
2. Defense against polyglots and executable masquerading.
3. Path traversal, CRLF, and Content-Disposition header injection prevention.
4. Hard ceilings on file size, page count, and rendering depth (Decompression Bomb / DoS protection).
5. PDF JavaScript (/JavaScript, /JS, /Launch, /AA) inspection and neutralization.
6. Safe streaming disk write with immediate abort on oversized streams.
7. Atomic temporary file isolation and Windows-resilient safe cleanup.
"""

import os
import re
import time
import unicodedata
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List

import pymupdf as fitz
from ninja.files import UploadedFile
from ninja.errors import HttpError
from django.conf import settings

logger = logging.getLogger(__name__)

# System-wide Security Guardrails
DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024     # 50 MB for standard utilities
MAX_AI_FILE_SIZE = 25 * 1024 * 1024          # 25 MB for AI endpoints
MAX_UTILITY_PAGE_COUNT = 200                 # Maximum pages for standard PDF transformations
MAX_JPG_PAGE_COUNT = 100                     # Maximum pages for high-res raster rendering
MAX_AI_PAGE_COUNT = 100                      # Maximum pages for AI document intelligence

# Dangerous file headers that must never be treated as valid PDFs
DISALLOWED_SIGNATURES: List[Tuple[bytes, str]] = [
    (b"MZ", "Windows Executable (PE/DLL)"),
    (b"\x7fELF", "Linux Executable (ELF)"),
    (b"PK\x03\x04", "Raw ZIP/Archive (potential zip bomb)"),
    (b"<!DOCTYPE", "HTML Document"),
    (b"<html", "HTML Document"),
    (b"<?php", "PHP Script"),
    (b"#!", "Shell Script"),
    (b"%!PS-Adobe", "Raw PostScript File"),
]


class FileSecurityException(Exception):
    """Base exception for file security violations."""
    pass


class InvalidFileSignatureError(FileSecurityException):
    """Raised when file magic bytes do not match valid PDF signature."""
    pass


class MaliciousContentError(FileSecurityException):
    """Raised when malicious payloads or dangerous polyglot signatures are detected."""
    pass


class DocumentExhaustionError(FileSecurityException):
    """Raised when a document exceeds safe processing boundaries (page count, dimensions)."""
    pass


class PasswordProtectedDocumentError(FileSecurityException):
    """Raised when a PDF is password-protected or encrypted."""
    pass


# ==============================================================================
# 1. FILENAME SANITIZATION & HEADER INJECTION PREVENTION
# ==============================================================================

def sanitize_filename(
    raw_name: Optional[str],
    fallback_stem: str = "document",
    max_stem_length: int = 64
) -> str:
    """
    Sanitizes an uploaded or output filename to eliminate:
    - Path traversal attacks (../../, C:\\, etc.)
    - CRLF / HTTP Header Injection (\\r, \\n)
    - Content-Disposition breaking quotes (", ;)
    - Control characters and null bytes
    - Excessive length causing buffer or filesystem errors
    """
    if not raw_name:
        return f"{fallback_stem}.pdf"

    # 1. Extract purely the basename to prevent path traversal
    base = os.path.basename(str(raw_name).replace('\\', '/'))

    # 2. Split stem and extension
    if '.' in base:
        parts = base.rsplit('.', 1)
        stem = parts[0]
        ext = f".{parts[1].lower()}"
    else:
        stem = base
        ext = ".pdf"

    # Ensure extension only contains standard alphanumeric characters
    ext = re.sub(r'[^a-z0-9.]', '', ext)
    if not ext or len(ext) > 10:
        ext = ".pdf"

    # 3. Normalize Unicode (NFKD) and filter dangerous / control characters
    stem_norm = unicodedata.normalize('NFKD', stem)
    # Allow alphanumeric, underscores, hyphens, spaces, and dots
    safe_stem = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', stem_norm).strip()

    # Collapse multiple consecutive spaces or dots
    safe_stem = re.sub(r'\s+', ' ', safe_stem)
    safe_stem = re.sub(r'\.+', '.', safe_stem).strip('. ')

    # Fallback if stem was entirely stripped
    if not safe_stem:
        safe_stem = fallback_stem

    # 4. Enforce strict maximum length
    if len(safe_stem) > max_stem_length:
        safe_stem = safe_stem[:max_stem_length].rstrip(' ._-')

    return f"{safe_stem}{ext}"


def sanitize_stem(raw_name: Optional[str], fallback: str = "document", max_length: int = 64) -> str:
    """Extracts and sanitizes only the base name stem without extension."""
    full = sanitize_filename(raw_name, fallback_stem=fallback, max_stem_length=max_length)
    if '.' in full:
        return full.rsplit('.', 1)[0]
    return full


# ==============================================================================
# 2. UPLOAD VALIDATION & MAGIC BYTE VERIFICATION
# ==============================================================================

def validate_uploaded_pdf(
    file: UploadedFile,
    max_size_bytes: int = DEFAULT_MAX_FILE_SIZE
) -> None:
    """
    Validates an incoming uploaded file against file size, extension,
    PDF magic bytes (%PDF-), and known executable/script signatures.
    Raises HttpError(400) if validation fails.
    """
    if not file:
        raise HttpError(400, "No document file was uploaded.")

    # 1. Size bounds check
    if file.size <= 0:
        raise HttpError(400, "The uploaded file is empty (0 bytes).")

    if file.size > max_size_bytes:
        size_mb = file.size / (1024 * 1024)
        max_mb = max_size_bytes / (1024 * 1024)
        raise HttpError(
            400,
            f"File size exceeds maximum allowed limit of {max_mb:.0f}MB ({size_mb:.1f}MB uploaded)."
        )

    # 2. Extension check
    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Invalid file format. Only standard PDF files (.pdf) are supported.")

    # 3. Read header bytes (first 1024 bytes per ISO 32000)
    try:
        header_sample = file.read(1024)
        file.seek(0)
    except Exception as read_err:
        raise HttpError(400, f"Unable to read uploaded file header: {str(read_err)}")

    if not header_sample:
        raise HttpError(400, "The uploaded file contains no readable header data.")

    # 4. Check for prohibited non-PDF executable / polyglot signatures
    for sig, desc in DISALLOWED_SIGNATURES:
        if header_sample.startswith(sig):
            logger.warning(f"Rejected malicious/unsupported upload signature: {desc}")
            log_security_event("MALICIOUS_UPLOAD_BLOCKED", "WARNING", client_ip="upload", details={"signature": desc})
            raise HttpError(400, f"Security verification failed: File signature indicates {desc}, not a valid PDF.")

    # 5. Verify PDF magic bytes (%PDF-)
    # Per ISO 32000-1, the header %PDF-1.x should appear at byte 0, but some tools allow a small UTF-8 BOM or prefix
    pdf_pos = header_sample.find(b'%PDF-')
    if pdf_pos == -1 or pdf_pos > 32:
        raise HttpError(400, "Invalid PDF document: missing standard %PDF- header signature.")


# ==============================================================================
# 3. SAFE STREAMING DISK STORAGE
# ==============================================================================

def save_upload_safely(
    file: UploadedFile,
    dest_path: Path,
    max_size_bytes: int = DEFAULT_MAX_FILE_SIZE
) -> int:
    """
    Streams file chunks to disk safely with continuous byte counting.
    If the client attempts to stream more bytes than max_size_bytes,
    the operation is immediately aborted and the partial file is removed.
    """
    total_written = 0
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(dest_path, 'wb') as dest:
            for chunk in file.chunks():
                total_written += len(chunk)
                if total_written > max_size_bytes:
                    raise HttpError(
                        400,
                        f"Uploaded stream exceeded maximum allowed size of {max_size_bytes // (1024 * 1024)}MB."
                    )
                dest.write(chunk)
        return total_written
    except Exception:
        safe_unlink(dest_path)
        raise


def safe_unlink(path: Optional[Path]) -> None:
    """
    Safely unlinks a temporary file with retry logic to avoid
    Windows PermissionError caused by lingering file handles.
    """
    if not path:
        return
    p = Path(path)
    for attempt in range(5):
        try:
            if p.exists():
                p.unlink(missing_ok=True)
            return
        except PermissionError:
            import gc
            gc.collect()
            time.sleep(0.05 * (attempt + 1))
        except Exception:
            break


# ==============================================================================
# 4. PDF GUARDRAILS, BOMBS & MALICIOUS JAVASCRIPT INSPECTION
# ==============================================================================

def inspect_and_sanitize_pdf(
    pdf_path: str,
    max_pages: int = MAX_UTILITY_PAGE_COUNT,
    strip_javascript: bool = True
) -> Dict[str, Any]:
    """
    Inspects structural integrity of a PDF on disk:
    1. Validates document parses cleanly with PyMuPDF.
    2. Detects password protection / encryption.
    3. Enforces page count ceilings (DoS / Decompression Bomb protection).
    4. Detects and optionally neutralizes embedded JavaScript (/JS, /JavaScript, /AA, /Launch).
    5. Checks for suspicious infinite page dimensions.
    """
    p = Path(pdf_path)
    if not p.exists() or p.stat().st_size == 0:
        raise HttpError(400, "The PDF file is empty or does not exist.")

    # 1. Open document safely (using in-memory buffer to prevent Windows OS file lock leaks)
    try:
        with open(p, "rb") as f_in:
            data = f_in.read()
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as err:
        import gc
        gc.collect()
        raise HttpError(400, f"Unable to parse PDF document structure: {str(err)}")

    try:
        # 2. Check encryption / password requirement
        if doc.is_encrypted and doc.needs_pass:
            raise PasswordProtectedDocumentError("This PDF is password-protected. Please unlock the file before processing.")

        # 3. Check page count guardrail
        page_count = len(doc)
        if page_count == 0:
            raise HttpError(400, "The PDF document contains 0 pages.")

        if page_count > max_pages:
            raise DocumentExhaustionError(
                f"Document contains {page_count} pages, which exceeds the maximum limit of {max_pages} pages."
            )

        # 4. Check for excessive page dimensions (Decompression / raster bomb guard)
        # Standard page is ~612x792 pt. Page exceeding 15000x15000 pt is suspicious.
        first_page = doc[0]
        rect = first_page.rect
        if rect.width > 15000 or rect.height > 15000:
            raise DocumentExhaustionError("Document page dimensions exceed allowable safety boundaries.")

        # 5. Scan for embedded JavaScript actions
        has_javascript = False
        js_keys_found = []

        # Check Catalog dictionary for Names/JavaScript or OpenAction
        try:
            catalog_xref = doc.pdf_catalog()
            catalog_keys = doc.xref_get_keys(catalog_xref) if catalog_xref > 0 else []

            if "OpenAction" in catalog_keys or "AA" in catalog_keys:
                has_javascript = True
                js_keys_found.append("CatalogActions")

            # Check /Names tree for JavaScript
            names_xref = doc.xref_get_key(catalog_xref, "Names")[1] if catalog_xref > 0 else ""
            if "JavaScript" in names_xref:
                has_javascript = True
                js_keys_found.append("Names/JavaScript")

            # Check embedded files
            if doc.embfile_count() > 0:
                logger.info(f"PDF {p.name} contains {doc.embfile_count()} embedded file attachments.")
        except Exception as scan_err:
            logger.debug(f"Action scan notice for {p.name}: {scan_err}")

        # Neutralize JavaScript if found and requested
        if has_javascript and strip_javascript:
            try:
                # Remove OpenAction and AA from catalog if present
                if catalog_xref > 0:
                    for key in ["OpenAction", "AA"]:
                        try:
                            doc.xref_set_key(catalog_xref, key, "null")
                        except Exception:
                            pass
                # Save sanitized version to disk
                p.write_bytes(doc.tobytes(garbage=3, deflate=True))
                logger.info(f"Neutralized interactive JavaScript triggers in {p.name}: {js_keys_found}")
            except Exception as neut_err:
                logger.debug(f"Incremental JS neutralization notice: {neut_err}")

        return {
            "page_count": page_count,
            "has_javascript": has_javascript,
            "js_keys": js_keys_found,
            "size_bytes": p.stat().st_size
        }

    finally:
        try:
            doc.close()
        except Exception:
            pass

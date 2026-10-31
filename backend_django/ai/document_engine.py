"""
Production Document Processing Engine for Simatrix AI.
Provides unified, secure PDF ingestion, validation, page-by-page text extraction,
scanned/corrupt/empty file detection, SHA-256 hashing, and metadata parsing.
"""

import os
import re
import time
import uuid
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field

import pymupdf as fitz
from django.conf import settings

logger = logging.getLogger(__name__)

# System Guardrail Limits for AI Operations
MAX_AI_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_AI_PAGE_COUNT = 50                     # 50 pages max for AI processing
MIN_READABLE_TEXT_CHARS = 15
SCANNED_PAGE_CHAR_THRESHOLD = 40


class DocumentEngineException(Exception):
    """Base exception for all document engine errors."""
    pass


class InvalidPdfError(DocumentEngineException):
    """Raised when the document is not a valid PDF or is corrupted."""
    pass


class PasswordProtectedPdfError(DocumentEngineException):
    """Raised when the PDF is encrypted or password-protected."""
    pass


class ScannedPdfError(DocumentEngineException):
    """Raised when the document is an image-only / scanned PDF without text streams."""
    pass


class EmptyPdfError(DocumentEngineException):
    """Raised when the document has no readable digital text."""
    pass


class FileLimitExceededError(DocumentEngineException):
    """Raised when the document exceeds size or page count limits."""
    pass


@dataclass
class DocumentPage:
    """Represents a single extracted page with character and image metrics."""
    page_number: int
    text: str
    char_count: int
    word_count: int
    image_count: int
    estimated_tokens: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "text": self.text,
            "char_count": self.char_count,
            "word_count": self.word_count,
            "image_count": self.image_count,
            "estimated_tokens": self.estimated_tokens
        }


@dataclass
class ExtractedDocument:
    """
    Unified internal representation of an ingested document.
    Shared across all eight Simatrix AI document tools.
    """
    document_id: str
    filename: str
    page_count: int
    pages: List[DocumentPage]
    full_text: str
    char_count: int
    word_count: int
    estimated_tokens: int
    sha256: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    warning: Optional[str] = None
    extraction_time_ms: int = 0

    def get_page_text(self, page_number: int) -> Optional[str]:
        for page in self.pages:
            if page.page_number == page_number:
                return page.text
        return None

    def to_summary_dict(self) -> Dict[str, Any]:
        """Safe client-facing dictionary (zero file paths exposed)."""
        return {
            "document_id": self.document_id,
            "filename": self.filename,
            "page_count": self.page_count,
            "char_count": self.char_count,
            "word_count": self.word_count,
            "estimated_tokens": self.estimated_tokens,
            "sha256": self.sha256,
            "has_warning": bool(self.warning),
            "warning": self.warning
        }


def safe_unlink_temp_file(path: Union[str, Path]) -> None:
    """Safely unlinks a file on Windows without raising PermissionError."""
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


def extract_document(
    source: Union[str, Path, bytes],
    filename: Optional[str] = None,
    max_size_bytes: int = MAX_AI_FILE_SIZE_BYTES,
    max_pages: int = MAX_AI_PAGE_COUNT
) -> ExtractedDocument:
    """
    Universal ingestion function for all AI document tools.
    Reads PDF bytes safely into memory, calculates SHA-256 checksum,
    validates page structure, extracts text with [Page X] preservation,
    and returns a standardized ExtractedDocument dataclass.
    """
    start_time = time.time()
    doc_id = uuid.uuid4().hex

    # 1. Read bytes safely
    if isinstance(source, (str, Path)):
        p = Path(source)
        if not p.exists():
            raise InvalidPdfError("The specified PDF file does not exist.")
        file_size = p.stat().st_size
        if file_size > max_size_bytes:
            raise FileLimitExceededError(
                f"File size ({file_size // (1024 * 1024)}MB) exceeds maximum allowed limit of {max_size_bytes // (1024 * 1024)}MB."
            )
        try:
            with open(p, 'rb') as f:
                file_bytes = f.read()
        except Exception as e:
            raise InvalidPdfError(f"Failed to read file: {str(e)}")
        doc_filename = filename or p.name
    elif isinstance(source, bytes):
        file_bytes = source
        file_size = len(file_bytes)
        if file_size > max_size_bytes:
            raise FileLimitExceededError(
                f"File size exceeds maximum allowed limit of {max_size_bytes // (1024 * 1024)}MB."
            )
        doc_filename = filename or f"document_{doc_id[:8]}.pdf"
    else:
        raise InvalidPdfError("Invalid source type provided. Expected file path or bytes.")

    # 2. Validate magic bytes (%PDF-)
    if not file_bytes.startswith(b'%PDF-'):
        raise InvalidPdfError("Uploaded file is not a valid PDF document (missing %PDF- header).")

    # 3. Calculate SHA-256 for integrity and official demo document detection
    sha256_hash = hashlib.sha256(file_bytes).hexdigest().lower()

    # 4. Open document via PyMuPDF stream
    doc = None
    try:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise InvalidPdfError(f"Failed to parse PDF document structure: {str(exc)}")

        # Check encryption / password
        if doc.is_encrypted or doc.needs_pass:
            raise PasswordProtectedPdfError(
                "This PDF document is encrypted or password-protected. "
                "Please unlock or decrypt the document before AI processing."
            )

        total_pages = len(doc)
        if total_pages == 0:
            raise EmptyPdfError("This PDF document contains 0 pages.")

        if total_pages > max_pages:
            raise FileLimitExceededError(
                f"Document contains {total_pages} pages, which exceeds the maximum limit of {max_pages} pages."
            )

        pages: List[DocumentPage] = []
        total_chars = 0
        total_images = 0
        pages_with_scant_text = 0

        for page_idx in range(total_pages):
            page_obj = doc[page_idx]
            raw_text = (page_obj.get_text() or '').strip()
            images = page_obj.get_images()
            img_count = len(images)
            total_images += img_count

            clean_chars = len(re.sub(r'\s+', '', raw_text))
            total_chars += clean_chars

            if clean_chars < SCANNED_PAGE_CHAR_THRESHOLD and img_count > 0:
                pages_with_scant_text += 1

            # Word and token heuristics
            word_count = len(raw_text.split()) if raw_text else 0
            # Token heuristic: roughly 3.8 to 4.0 chars per token in English, higher for code/symbols
            est_tokens = max(1, len(raw_text) // 4) if raw_text else 0

            pages.append(DocumentPage(
                page_number=page_idx + 1,
                text=raw_text,
                char_count=len(raw_text),
                word_count=word_count,
                image_count=img_count,
                estimated_tokens=est_tokens
            ))

        # 5. Scanned / Image-Only PDF Detection
        if total_chars < 50 and total_images > 0:
            raise ScannedPdfError(
                "This document appears to be a scanned image or image-only PDF with no extractable text. "
                "Please upload a PDF containing digital text."
            )

        # 6. Completely Empty PDF Detection
        if total_chars < MIN_READABLE_TEXT_CHARS:
            raise EmptyPdfError(
                "This PDF document does not contain any readable text. "
                "Please ensure the document contains digital text."
            )

        # 7. Partial Scanned Warning
        warning = None
        if total_pages > 2 and pages_with_scant_text >= (total_pages * 0.7) and total_chars < (total_pages * 80):
            warning = (
                "Notice: Several pages in this document appear to be scanned images. "
                "Analysis was generated using the available digital text only."
            )

        # 8. Build full formatted text with explicit page boundaries
        full_text_blocks = []
        for p in pages:
            if p.text:
                full_text_blocks.append(f"--- [Page {p.page_number}] ---\n{p.text}")
        full_text = "\n\n".join(full_text_blocks)

        total_words = len(full_text.split())
        doc_tokens = sum(p.estimated_tokens for p in pages)

        # 9. Extract metadata safely
        meta = {}
        try:
            raw_meta = doc.metadata or {}
            meta = {
                "title": (raw_meta.get("title") or "").strip(),
                "author": (raw_meta.get("author") or "").strip(),
                "subject": (raw_meta.get("subject") or "").strip(),
                "producer": (raw_meta.get("producer") or "").strip(),
                "creation_date": (raw_meta.get("creationDate") or "").strip()
            }
        except Exception:
            pass

        exec_ms = max(1, int((time.time() - start_time) * 1000))

        return ExtractedDocument(
            document_id=doc_id,
            filename=doc_filename,
            page_count=total_pages,
            pages=pages,
            full_text=full_text,
            char_count=len(full_text),
            word_count=total_words,
            estimated_tokens=doc_tokens,
            sha256=sha256_hash,
            metadata=meta,
            warning=warning,
            extraction_time_ms=exec_ms
        )

    finally:
        # Always close PyMuPDF handle so Windows allows safe deletion of temp files
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass


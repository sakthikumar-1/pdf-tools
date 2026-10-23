"""
Protect PDF Engine for Simatrix Academy PDF Tools.
Provides native 256-bit AES encryption for PDF files using PyMuPDF.
Eliminates all dependencies on external system binaries (e.g. qpdf).
"""

import time
import logging
from pathlib import Path
from typing import Dict, Any

import pymupdf as fitz

from .word_engine import (
    WordEngineException,
    InvalidPdfError,
    PasswordProtectedPdfError
)

logger = logging.getLogger(__name__)


class ProtectEngineException(WordEngineException):
    """Base exception for PDF protection failures."""
    pass


def protect_pdf_document(
    input_pdf_path: str,
    output_pdf_path: str,
    password: str
) -> Dict[str, Any]:
    """
    Encrypts a PDF document with 256-bit AES password encryption.

    Args:
        input_pdf_path: Path to the source PDF document.
        output_pdf_path: Path where the encrypted PDF will be saved.
        password: The user password required to open/decrypt the document.

    Returns:
        dict containing page_count, size_bytes, execution_time_ms.
    """
    start_time = time.time()
    input_path = Path(input_pdf_path)
    output_path = Path(output_pdf_path)

    if not input_path.exists() or input_path.stat().st_size == 0:
        raise InvalidPdfError("The source PDF document does not exist or is empty.")

    if not password or not password.strip():
        raise ProtectEngineException("A non-empty password is required to protect the document.")

    # Validate %PDF- magic bytes
    with open(input_pdf_path, 'rb') as f:
        header = f.read(5)
    if not header.startswith(b'%PDF-'):
        raise InvalidPdfError("The uploaded file does not have a valid PDF header.")

    try:
        doc = fitz.open(input_pdf_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF document: {str(err)}")

    if doc.is_encrypted and doc.needs_pass:
        doc.close()
        raise PasswordProtectedPdfError("The document is already password-protected.")

    page_count = len(doc)
    if page_count == 0:
        doc.close()
        raise InvalidPdfError("The PDF document contains 0 pages.")

    try:
        # Save document with 256-bit AES encryption and standard accessibility permissions
        doc.save(
            str(output_path),
            encryption=fitz.PDF_ENCRYPT_AES_256,
            user_pw=password,
            owner_pw=password,
            permissions=fitz.PDF_PERM_ACCESSIBILITY | fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY
        )
    except Exception as enc_err:
        raise ProtectEngineException(f"Encryption failed: {str(enc_err)}")
    finally:
        doc.close()

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise ProtectEngineException("Encryption completed but the output file is missing or empty.")

    output_size = output_path.stat().st_size
    duration_ms = int((time.time() - start_time) * 1000)

    logger.info(
        f"Protected PDF generated successfully: {output_path.name} "
        f"({page_count} pages, {output_size} bytes in {duration_ms}ms)"
    )

    return {
        "page_count": page_count,
        "size_bytes": output_size,
        "execution_time_ms": duration_ms
    }

"""
Protect PDF Engine for Simatrix Academy PDF Tools.
Provides native 256-bit AES encryption for PDF files using pypdf.
Eliminates all dependencies on external system binaries (e.g. qpdf).
"""

import time
import logging
from pathlib import Path
from typing import Dict, Any

import pypdf

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
        reader = pypdf.PdfReader(str(input_path))
    except Exception as err:
        import gc
        gc.collect()
        raise InvalidPdfError(f"Unable to parse PDF document: {str(err)}")

    if reader.is_encrypted:
        try:
            res = reader.decrypt("")
            if res == 0:
                raise PasswordProtectedPdfError("The document is already password-protected.")
        except PasswordProtectedPdfError:
            raise
        except Exception:
            raise PasswordProtectedPdfError("The document is already password-protected.")

    page_count = len(reader.pages)
    if page_count == 0:
        raise InvalidPdfError("The PDF document contains 0 pages.")

    try:
        # Build encrypted PDF using 256-bit AES encryption and standard permissions
        writer = pypdf.PdfWriter()
        writer.append(reader)
        writer.encrypt(
            user_password=password,
            owner_password=password,
            algorithm="AES-256",
            permissions_flag=pypdf.constants.UserAccessPermissions.PRINT |
                             pypdf.constants.UserAccessPermissions.EXTRACT
        )
        with open(str(output_path), "wb") as f_out:
            writer.write(f_out)
    except Exception as enc_err:
        raise ProtectEngineException(f"Encryption failed: {str(enc_err)}")

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

import os
import time
import uuid
import logging
from pathlib import Path
from typing import Optional, Dict, Any

import pymupdf as fitz
from pdf2docx import Converter
from docx import Document
from django.conf import settings

logger = logging.getLogger(__name__)


class WordEngineException(Exception):
    """Base exception for Word engine failures."""
    pass


class InvalidPdfError(WordEngineException):
    """Raised when the uploaded file is not a valid PDF."""
    pass


class PasswordProtectedPdfError(WordEngineException):
    """Raised when the PDF requires a password to open."""
    pass


def inspect_pdf_document(pdf_path: str) -> Dict[str, Any]:
    """
    Inspects PDF document structure, encryption status, and text layer presence.
    """
    path_obj = Path(pdf_path)
    if not path_obj.exists() or path_obj.stat().st_size == 0:
        raise InvalidPdfError("The PDF document does not exist or is empty.")

    # Verify %PDF- header magic bytes
    with open(pdf_path, 'rb') as f:
        header = f.read(5)
    if not header.startswith(b'%PDF-'):
        raise InvalidPdfError("The uploaded file does not have a valid PDF header.")

    try:
        doc = fitz.open(pdf_path)
    except Exception as err:
        import gc
        gc.collect()
        raise InvalidPdfError(f"Unable to parse PDF document: {str(err)}")

    if doc.is_encrypted and doc.needs_pass:
        doc.close()
        raise PasswordProtectedPdfError("This PDF is password-protected. Please remove the password before converting.")

    page_count = len(doc)
    if page_count == 0:
        doc.close()
        raise InvalidPdfError("The PDF document contains 0 pages.")

    total_text_chars = 0
    for page in doc:
        total_text_chars += len(page.get_text().strip())

    is_scanned = total_text_chars == 0
    doc.close()

    return {
        "page_count": page_count,
        "is_scanned": is_scanned,
        "text_chars": total_text_chars,
    }


def clean_docx_artifacts(docx_path: str) -> None:
    """
    Post-processes the generated DOCX to fix character encoding artifacts,
    such as broken bullet glyphs (\ufffd) into standard Unicode bullets.
    """
    try:
        doc = Document(docx_path)
        modified = False

        for paragraph in doc.paragraphs:
            if '\ufffd' in paragraph.text:
                modified = True
                for run in paragraph.runs:
                    if '\ufffd' in run.text:
                        run.text = run.text.replace('\ufffd', '• ')

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        if '\ufffd' in paragraph.text:
                            modified = True
                            for run in paragraph.runs:
                                if '\ufffd' in run.text:
                                    run.text = run.text.replace('\ufffd', '• ')

        if modified:
            doc.save(docx_path)
    except Exception as exc:
        logger.warning(f"DOCX post-processing notice: {exc}")


def convert_pdf_to_docx(
    input_pdf_path: str,
    output_docx_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Converts a PDF document to Microsoft Word (.docx) using rule-based layout reconstruction.
    Preserves words, column boundaries, text styling, and page flow.
    """
    start_time = time.perf_counter()

    # 1. Inspect and validate PDF
    meta = inspect_pdf_document(input_pdf_path)
    page_count = meta["page_count"]
    is_scanned = meta["is_scanned"]

    # 2. Determine target output path in isolated storage
    if not output_docx_path:
        filename = f"{uuid.uuid4().hex}_converted.docx"
        output_dir = getattr(settings, 'OUTPUTS_DIR', Path(input_pdf_path).parent)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_docx_path = str(output_dir / filename)

    # 3. Perform conversion via pdf2docx Converter
    cv = None
    try:
        cv = Converter(str(input_pdf_path))
        cv.convert(str(output_docx_path))
    except Exception as err:
        logger.error(f"pdf2docx conversion error: {err}", exc_info=True)
        raise WordEngineException(f"Failed to reconstruct DOCX layout: {str(err)}")
    finally:
        if cv is not None:
            try:
                cv.close()
            except Exception:
                pass

    # 4. Clean artifacts & bullet glyphs
    clean_docx_artifacts(str(output_docx_path))

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    file_size = os.path.getsize(output_docx_path)

    return {
        "success": True,
        "output_path": str(output_docx_path),
        "output_filename": Path(output_docx_path).name,
        "page_count": page_count,
        "size_bytes": file_size,
        "is_scanned": is_scanned,
        "execution_time_ms": elapsed_ms,
    }

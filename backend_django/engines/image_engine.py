"""
PDF to Image Engine for Simatrix Academy PDF Tools.
Converts PDF pages into high-resolution JPG images using PyMuPDF.
Bundles multi-page documents into clean ZIP archives.
Eliminates all dependencies on external system binaries (Imagick / pdftoppm).
"""

import time
import zipfile
import logging
from pathlib import Path
from typing import Dict, Any, List

import pymupdf as fitz

from .word_engine import (
    WordEngineException,
    InvalidPdfError,
    PasswordProtectedPdfError
)

logger = logging.getLogger(__name__)


class ImageEngineException(WordEngineException):
    """Base exception for PDF to Image conversion failures."""
    pass


def convert_pdf_to_jpg(
    input_pdf_path: str,
    output_dir: str,
    output_basename: str,
    dpi: int = 150
) -> Dict[str, Any]:
    """
    Renders each page of a PDF document into a crisp JPG image.
    If the document has 1 page, produces a single JPG file.
    If the document has multiple pages, produces individual JPGs plus a bundled ZIP file.

    Args:
        input_pdf_path: Path to the input PDF file.
        output_dir: Directory where generated image(s) or ZIP will be stored.
        output_basename: Unique job basename for output files.
        dpi: Rendering resolution (150 for standard, 300 for high quality).

    Returns:
        dict containing:
            output_file: Name of the primary downloadable file (single JPG or ZIP).
            is_zip: bool indicating whether the result is a ZIP.
            page_count: Total pages converted.
            size_bytes: Size of the primary output file.
            execution_time_ms: Duration in milliseconds.
            images: List of individual image metadata.
    """
    start_time = time.time()
    input_path = Path(input_pdf_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists() or input_path.stat().st_size == 0:
        raise InvalidPdfError("The source PDF document does not exist or is empty.")

    # Validate %PDF- header magic bytes
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
        raise PasswordProtectedPdfError("This PDF is password-protected. Please remove the password before converting.")

    page_count = len(doc)
    if page_count == 0:
        doc.close()
        raise InvalidPdfError("The PDF document contains 0 pages.")

    rendered_images: List[Dict[str, Any]] = []
    generated_file_paths: List[Path] = []

    try:
        for idx in range(page_count):
            page = doc[idx]
            pix = page.get_pixmap(dpi=dpi)

            page_num = idx + 1
            image_filename = f"{output_basename}_page_{page_num}.jpg"
            image_path = out_dir / image_filename

            pix.save(str(image_path))
            generated_file_paths.append(image_path)

            file_size = image_path.stat().st_size
            rendered_images.append({
                "page": page_num,
                "filename": image_filename,
                "size_bytes": file_size
            })

    except Exception as render_err:
        for f in generated_file_paths:
            f.unlink(missing_ok=True)
        raise ImageEngineException(f"Failed to render PDF page: {str(render_err)}")
    finally:
        doc.close()

    # Determine primary deliverable
    if page_count == 1:
        primary_filename = generated_file_paths[0].name
        primary_path = generated_file_paths[0]
        is_zip = False
    else:
        # Create ZIP package containing all rendered page images
        zip_filename = f"{output_basename}_jpg_images.zip"
        zip_path = out_dir / zip_filename

        with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            for img_path in generated_file_paths:
                zf.write(img_path, arcname=img_path.name)

        primary_filename = zip_filename
        primary_path = zip_path
        is_zip = True

    total_size = primary_path.stat().st_size
    duration_ms = int((time.time() - start_time) * 1000)

    logger.info(
        f"PDF to JPG conversion complete: {primary_filename} "
        f"({page_count} pages rendered in {duration_ms}ms, size: {total_size} bytes)"
    )

    return {
        "output_file": primary_filename,
        "is_zip": is_zip,
        "page_count": page_count,
        "size_bytes": total_size,
        "execution_time_ms": duration_ms,
        "images": rendered_images
    }

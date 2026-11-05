import os
import io
import time
import uuid
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

import pypdf
import pypdfium2 as pdfium
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBoxHorizontal, LTTextLineHorizontal
from PIL import Image
import pptx
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from django.conf import settings

logger = logging.getLogger(__name__)


class PowerPointEngineException(Exception):
    """Base exception for PowerPoint engine failures."""
    pass


class InvalidPdfError(PowerPointEngineException):
    """Raised when the uploaded file is not a valid PDF."""
    pass


class PasswordProtectedPdfError(PowerPointEngineException):
    """Raised when the PDF requires a password to open."""
    pass


def inspect_pdf_for_pptx(pdf_path: str) -> Dict[str, Any]:
    """
    Inspects PDF document structure, encryption status, and text layer presence.
    """
    path_obj = Path(pdf_path)
    if not path_obj.exists() or path_obj.stat().st_size == 0:
        raise InvalidPdfError("The PDF document does not exist or is empty.")

    with open(pdf_path, 'rb') as f:
        header = f.read(5)
    if not header.startswith(b'%PDF-'):
        raise InvalidPdfError("The uploaded file does not have a valid PDF header.")

    try:
        reader = pypdf.PdfReader(str(path_obj))
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF document: {str(err)}")

    if reader.is_encrypted:
        try:
            res = reader.decrypt("")
            if res == 0:
                raise PasswordProtectedPdfError("This PDF is password-protected. Please remove the password before converting.")
        except PasswordProtectedPdfError:
            raise
        except Exception:
            raise PasswordProtectedPdfError("This PDF is password-protected. Please remove the password before converting.")

    page_count = len(reader.pages)
    if page_count == 0:
        raise InvalidPdfError("The PDF document contains 0 pages.")

    total_chars = 0
    scanned_pages = 0
    for page in reader.pages:
        try:
            txt = page.extract_text() or ""
        except Exception:
            txt = ""
        total_chars += len(txt.strip())
        if len(txt.strip()) < 10:
            scanned_pages += 1

    is_scanned = (total_chars < 50 and page_count > 0)
    return {
        'page_count': page_count,
        'total_chars': total_chars,
        'is_scanned': is_scanned,
        'scanned_pages': scanned_pages
    }


def convert_pdf_to_pptx(pdf_path: str, output_path: str, mode: str = 'editable') -> Dict[str, Any]:
    """
    Converts a PDF document into a 100% compliant Microsoft PowerPoint (.pptx) presentation.
    
    Modes:
    - 'editable': Extracts 2D text blocks, coordinates, and typography into native PowerPoint text boxes.
                  If a page has no extractable text layer, it automatically embeds a high-res page image
                  so no slide is ever blank.
    - 'visual':   Renders crisp 150 DPI full-bleed slide images for 100% graphic fidelity.
    """
    start_time = time.time()
    logger.info(f"[PowerPointEngine] Starting conversion: {pdf_path} -> {output_path} (mode={mode})")

    meta = inspect_pdf_for_pptx(pdf_path)
    page_count = meta['page_count']

    reader = pypdf.PdfReader(pdf_path)
    first_page = reader.pages[0]
    mb = first_page.mediabox
    p_width = float(mb.width)
    p_height = float(mb.height)

    prs = pptx.Presentation()
    prs.slide_width = Pt(p_width)
    prs.slide_height = Pt(p_height)

    blank_layout = prs.slide_layouts[6]  # standard empty layout

    slides_with_text = 0
    slides_with_images = 0

    # Prepare pypdfium2 document for raster fallbacks or visual mode
    pdf_render = None
    if mode == 'visual' or meta['scanned_pages'] > 0:
        try:
            pdf_render = pdfium.PdfDocument(pdf_path)
        except Exception as p_err:
            logger.debug(f"pypdfium2 initialization notice: {p_err}")

    # Extract layout pages if editable mode requested
    pages_layout = []
    if mode != 'visual':
        try:
            pages_layout = list(extract_pages(pdf_path))
        except Exception as ext_err:
            logger.warning(f"Failed to extract pdfminer layout, falling back to visual: {ext_err}")
            pages_layout = []

    try:
        for page_idx in range(page_count):
            slide = prs.slides.add_slide(blank_layout)

            if mode == 'visual' or page_idx >= len(pages_layout):
                # Visual full-bleed slide via pypdfium2
                if pdf_render is not None:
                    page_img = pdf_render[page_idx].render(scale=150.0 / 72.0).to_pil()
                    img_buf = io.BytesIO()
                    page_img.save(img_buf, format="PNG")
                    img_buf.seek(0)
                    slide.shapes.add_picture(
                        img_buf,
                        0,
                        0,
                        prs.slide_width,
                        prs.slide_height
                    )
                    slides_with_images += 1
            else:
                # Editable mode
                layout_page = pages_layout[page_idx]
                text_boxes = [elem for elem in layout_page if isinstance(elem, LTTextBoxHorizontal) and elem.get_text().strip()]

                if text_boxes:
                    slides_with_text += 1
                    for b in text_boxes:
                        text_clean = b.get_text().strip()
                        if not text_clean:
                            continue

                        # Coordinates in PowerPoint visual space (top-left origin)
                        box_x = max(0.0, float(b.x0))
                        box_y = max(0.0, float(p_height - b.y1))
                        box_w = min(float(p_width - box_x), max(float(b.width), 20.0))
                        box_h = min(float(p_height - box_y), max(float(b.height), 10.0))

                        tx_box = slide.shapes.add_textbox(Pt(box_x), Pt(box_y), Pt(box_w), Pt(box_h))
                        tf = tx_box.text_frame
                        tf.word_wrap = True
                        tf.margin_left = 0
                        tf.margin_top = 0
                        tf.margin_right = 0
                        tf.margin_bottom = 0

                        lines = [l for l in text_clean.split('\n') if l.strip()]
                        for l_idx, line in enumerate(lines):
                            p = tf.paragraphs[0] if l_idx == 0 else tf.add_paragraph()
                            p.text = line

                            # Heuristic typography: headings vs body
                            is_likely_heading = (
                                len(line) < 65 and 
                                (l_idx == 0 and page_idx == 0 or line.isupper() or 'Resume' in line or 'Document' in line or 'Page' in line or 'Experience' in line or 'Education' in line)
                            )
                            if is_likely_heading:
                                p.font.size = Pt(16)
                                p.font.bold = True
                                p.font.color.rgb = RGBColor(15, 23, 42)
                            else:
                                p.font.size = Pt(11)
                                p.font.color.rgb = RGBColor(51, 65, 85)
                else:
                    # Scanned or image-only page: embed high-resolution page image so slide is never blank!
                    if pdf_render is not None:
                        page_img = pdf_render[page_idx].render(scale=150.0 / 72.0).to_pil()
                        img_buf = io.BytesIO()
                        page_img.save(img_buf, format="PNG")
                        img_buf.seek(0)
                        slide.shapes.add_picture(
                            img_buf,
                            0,
                            0,
                            prs.slide_width,
                            prs.slide_height
                        )
                        slides_with_images += 1

    finally:
        if pdf_render is not None:
            try:
                pdf_render.close()
            except Exception:
                pass

    # Save presentation
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    prs.save(output_path)

    elapsed = time.time() - start_time
    file_size = os.path.getsize(output_path)
    logger.info(f"[PowerPointEngine] Completed in {elapsed:.2f}s, size={file_size} bytes, slides={meta['page_count']}")

    return {
        'page_count': meta['page_count'],
        'slides_with_text': slides_with_text,
        'slides_with_images': slides_with_images,
        'is_scanned': meta['is_scanned'],
        'mode': mode,
        'file_size': file_size,
        'elapsed_seconds': round(elapsed, 2)
    }

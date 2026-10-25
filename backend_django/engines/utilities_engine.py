import os
import time
import math
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

import pymupdf as fitz
from django.conf import settings

logger = logging.getLogger(__name__)


class UtilitiesEngineException(Exception):
    """Base exception for utility engine errors."""
    pass


class InvalidPdfError(UtilitiesEngineException):
    """Raised when an uploaded document is invalid or empty."""
    pass


def parse_page_range_py(range_str: str, total_pages: int) -> List[int]:
    """Parses range string (e.g. '1-3, 5') into 0-based page index list."""
    if not range_str or range_str.strip().lower() == 'all':
        return list(range(total_pages))

    result = set()
    parts = range_str.split(',')
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            s_str, e_str = part.split('-', 1)
            try:
                s = int(s_str.strip())
                e = int(e_str.strip())
                start = max(1, min(s, e))
                end = min(total_pages, max(s, e))
                for p in range(start, end + 1):
                    result.add(p - 1)
            except ValueError:
                continue
        else:
            try:
                p = int(part)
                if 1 <= p <= total_pages:
                    result.add(p - 1)
            except ValueError:
                continue

    return sorted(list(result))


def hex_to_rgb_py(hex_str: str) -> tuple:
    """Converts hex '#334155' to float RGB tuple (0.0 to 1.0)."""
    clean = hex_str.lstrip('#').strip()
    if len(clean) == 3:
        clean = ''.join([c * 2 for c in clean])
    try:
        r = int(clean[0:2], 16) / 255.0
        g = int(clean[2:4], 16) / 255.0
        b = int(clean[4:6], 16) / 255.0
        return (r, g, b)
    except Exception:
        return (0.0, 0.0, 0.0)


def add_page_numbers_py(input_path: str, output_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Adds customized page numbering to selected pages in PDF."""
    opts = options or {}
    start_num = int(opts.get('startNumber', 1))
    fmt = str(opts.get('format', 'Page {n}'))
    position = str(opts.get('position', 'bottom-right'))
    font_size = float(opts.get('fontSize', 11))
    font_color = hex_to_rgb_py(opts.get('fontColor', '#334155'))
    margin_pt = float(opts.get('marginPt', 36))
    page_range = str(opts.get('pageRange', 'all'))

    doc = fitz.open(input_path)
    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        raise InvalidPdfError("PDF contains 0 pages.")

    target_indices = parse_page_range_py(page_range, total_pages)
    target_set = set(target_indices)

    numbered_count = 0
    for idx, page in enumerate(doc):
        if idx in target_set:
            num = start_num + numbered_count
            txt = fmt.replace('{n}', str(num)).replace('{total}', str(total_pages))

            rect = page.rect
            tw = fitz.get_text_length(txt, fontname="helv", fontsize=font_size)
            th = font_size

            # Position calculations in visual page coordinate space
            if position == 'bottom-left':
                x = margin_pt
                y = rect.height - margin_pt
            elif position == 'bottom-center':
                x = (rect.width - tw) / 2
                y = rect.height - margin_pt
            elif position == 'bottom-right':
                x = rect.width - margin_pt - tw
                y = rect.height - margin_pt
            elif position == 'top-left':
                x = margin_pt
                y = margin_pt + th
            elif position == 'top-center':
                x = (rect.width - tw) / 2
                y = margin_pt + th
            else:  # top-right
                x = rect.width - margin_pt - tw
                y = margin_pt + th

            visual_pt = fitz.Point(x, y)
            raw_pt = visual_pt * page.derotation_matrix
            page.insert_text(
                raw_pt,
                txt,
                fontname="helv",
                fontsize=font_size,
                color=font_color,
                rotate=page.rotation
            )
            numbered_count += 1

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    doc.close()

    return {
        'page_count': total_pages,
        'numbered_pages': numbered_count,
        'size_bytes': os.path.getsize(output_path)
    }


def watermark_pdf_py(input_path: str, output_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Applies text or image watermark to selected PDF pages."""
    opts = options or {}
    text = str(opts.get('text', 'CONFIDENTIAL')).strip()
    if not text:
        text = 'CONFIDENTIAL'
    opacity = max(0.05, min(1.0, float(opts.get('opacity', 0.35))))
    rotation = float(opts.get('rotation', 45))
    font_size = float(opts.get('fontSize', 48))
    color = hex_to_rgb_py(opts.get('color', '#EF4444'))
    position = str(opts.get('position', 'center'))
    page_range = str(opts.get('pageRange', 'all'))

    doc = fitz.open(input_path)
    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        raise InvalidPdfError("PDF contains 0 pages.")

    target_indices = parse_page_range_py(page_range, total_pages)
    target_set = set(target_indices)

    watermarked_count = 0
    for idx, page in enumerate(doc):
        if idx in target_set:
            rect = page.rect
            tw = fitz.get_text_length(text, fontname="helv", fontsize=font_size)

            if position in ('center', 'diagonal'):
                v_pt = fitz.Point(rect.width / 2 - (tw / 2), rect.height / 2)
            else:
                x = 36 if 'left' in position else (rect.width - tw - 36)
                y = 36 + font_size if 'top' in position else (rect.height - 36)
                v_pt = fitz.Point(x, y)

            raw_pt = v_pt * page.derotation_matrix
            total_angle = float((rotation + page.rotation) % 360)

            page.insert_text(
                raw_pt,
                text,
                fontname="helv",
                fontsize=font_size,
                color=color,
                stroke_opacity=opacity,
                fill_opacity=opacity,
                morph=(raw_pt, fitz.Matrix(total_angle))
            )
            watermarked_count += 1

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    doc.close()

    return {
        'page_count': total_pages,
        'watermarked_pages': watermarked_count,
        'size_bytes': os.path.getsize(output_path)
    }


def crop_pdf_py(input_path: str, output_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Crops PDF pages based on top, bottom, left, right margin values."""
    opts = options or {}
    margins = opts.get('cropMargins', {})
    top = float(margins.get('top', 36))
    bottom = float(margins.get('bottom', 36))
    left = float(margins.get('left', 36))
    right = float(margins.get('right', 36))
    page_range = str(opts.get('pageRange', 'all'))

    if top < 0 or bottom < 0 or left < 0 or right < 0:
        raise UtilitiesEngineException("Crop margins cannot be negative.")

    doc = fitz.open(input_path)
    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        raise InvalidPdfError("PDF contains 0 pages.")

    target_indices = parse_page_range_py(page_range, total_pages)
    target_set = set(target_indices)

    cropped_count = 0
    for idx, page in enumerate(doc):
        if idx in target_set:
            r = page.rect
            new_rect = fitz.Rect(r.x0 + left, r.y0 + top, r.x1 - right, r.y1 - bottom)
            if new_rect.width <= 20 or new_rect.height <= 20:
                doc.close()
                raise UtilitiesEngineException(f"Crop margins too large on page {idx + 1}. Remaining width/height must exceed 20pt.")
            raw_cropbox = new_rect * page.derotation_matrix
            page.set_cropbox(raw_cropbox)
            cropped_count += 1

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    doc.close()

    return {
        'page_count': total_pages,
        'cropped_pages': cropped_count,
        'size_bytes': os.path.getsize(output_path)
    }


def edit_metadata_py(input_path: str, output_path: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Reads and updates PDF document metadata while preserving pages."""
    meta = metadata or {}
    doc = fitz.open(input_path)
    current_meta = doc.metadata or {}

    new_meta = {
        'title': meta.get('title', current_meta.get('title', '')),
        'author': meta.get('author', current_meta.get('author', '')),
        'subject': meta.get('subject', current_meta.get('subject', '')),
        'keywords': meta.get('keywords', current_meta.get('keywords', '')),
        'creator': meta.get('creator', current_meta.get('creator', 'Simatrix PDF Tools')),
        'producer': meta.get('producer', current_meta.get('producer', 'Simatrix PDF Tools')),
    }

    doc.set_metadata(new_meta)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    total_pages = len(doc)
    doc.close()

    return {
        'page_count': total_pages,
        'metadata': new_meta,
        'size_bytes': os.path.getsize(output_path)
    }


def reorder_pages_py(input_path: str, output_path: str, order: List[int], rotations: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    """Reorders pages in a PDF document based on a list of 1-based page numbers."""
    if not order or not isinstance(order, list):
        raise UtilitiesEngineException("Order list must be a non-empty array of page numbers.")

    doc = fitz.open(input_path)
    total_pages = len(doc)

    # Convert 1-based to 0-based and validate
    zero_based_order = []
    for p in order:
        p_int = int(p)
        if not (1 <= p_int <= total_pages):
            doc.close()
            raise UtilitiesEngineException(f"Invalid page index {p_int}. Document has pages 1 to {total_pages}.")
        zero_based_order.append(p_int - 1)

    # Reorder using PyMuPDF select()
    doc.select(zero_based_order)

    # Apply rotations if requested
    if rotations and isinstance(rotations, dict):
        for idx, page in enumerate(doc):
            orig_page_num = order[idx]
            rot = int(rotations.get(str(orig_page_num), rotations.get(orig_page_num, 0)))
            if rot != 0:
                page.set_rotation((page.rotation + rot) % 360)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    doc.close()

    return {
        'page_count': len(zero_based_order),
        'reordered_order': order,
        'size_bytes': os.path.getsize(output_path)
    }

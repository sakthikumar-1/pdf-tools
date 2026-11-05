import os
import io
import time
import math
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

import pypdf
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib import colors
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
    """Adds customized page numbering to selected pages in PDF using ReportLab + pypdf."""
    opts = options or {}
    start_num = int(opts.get('startNumber', 1))
    fmt = str(opts.get('format', 'Page {n}'))
    position = str(opts.get('position', 'bottom-right'))
    font_size = float(opts.get('fontSize', 11))
    color_rgb = hex_to_rgb_py(opts.get('fontColor', '#334155'))
    margin_pt = float(opts.get('marginPt', 36))
    page_range = str(opts.get('pageRange', 'all'))

    try:
        reader = pypdf.PdfReader(input_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF: {str(err)}")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise InvalidPdfError("PDF contains 0 pages.")

    target_indices = parse_page_range_py(page_range, total_pages)
    target_set = set(target_indices)

    writer = pypdf.PdfWriter()
    numbered_count = 0

    for idx, page in enumerate(reader.pages):
        if idx in target_set:
            num = start_num + numbered_count
            txt = fmt.replace('{n}', str(num)).replace('{total}', str(total_pages))

            mb = page.mediabox
            page_w = float(mb.width)
            page_h = float(mb.height)

            tw = stringWidth(txt, "Helvetica", font_size)
            th = font_size

            # In ReportLab coordinate space, (0, 0) is bottom-left
            if position == 'bottom-left':
                x = margin_pt
                y = margin_pt
            elif position == 'bottom-center':
                x = (page_w - tw) / 2
                y = margin_pt
            elif position == 'bottom-right':
                x = page_w - margin_pt - tw
                y = margin_pt
            elif position == 'top-left':
                x = margin_pt
                y = page_h - margin_pt - th
            elif position == 'top-center':
                x = (page_w - tw) / 2
                y = page_h - margin_pt - th
            else:  # top-right
                x = page_w - margin_pt - tw
                y = page_h - margin_pt - th

            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=(page_w, page_h))
            can.setFont("Helvetica", font_size)
            can.setFillColor(colors.Color(color_rgb[0], color_rgb[1], color_rgb[2]))
            can.drawString(x, y, txt)
            can.save()

            packet.seek(0)
            overlay = pypdf.PdfReader(packet)
            if len(overlay.pages) > 0:
                page.merge_page(overlay.pages[0])

            numbered_count += 1

        writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    return {
        'page_count': total_pages,
        'numbered_pages': numbered_count,
        'size_bytes': os.path.getsize(output_path)
    }


def watermark_pdf_py(input_path: str, output_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Applies text or image watermark to selected PDF pages using ReportLab + pypdf."""
    opts = options or {}
    text = str(opts.get('text', 'CONFIDENTIAL')).strip()
    if not text:
        text = 'CONFIDENTIAL'
    opacity = max(0.05, min(1.0, float(opts.get('opacity', 0.35))))
    rotation = float(opts.get('rotation', 45))
    font_size = float(opts.get('fontSize', 48))
    color_rgb = hex_to_rgb_py(opts.get('color', '#EF4444'))
    position = str(opts.get('position', 'center'))
    page_range = str(opts.get('pageRange', 'all'))

    try:
        reader = pypdf.PdfReader(input_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF: {str(err)}")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise InvalidPdfError("PDF contains 0 pages.")

    target_indices = parse_page_range_py(page_range, total_pages)
    target_set = set(target_indices)

    writer = pypdf.PdfWriter()
    watermarked_count = 0

    for idx, page in enumerate(reader.pages):
        if idx in target_set:
            mb = page.mediabox
            page_w = float(mb.width)
            page_h = float(mb.height)

            tw = stringWidth(text, "Helvetica-Bold", font_size)

            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=(page_w, page_h))
            can.saveState()
            can.setFont("Helvetica-Bold", font_size)
            can.setFillColor(colors.Color(color_rgb[0], color_rgb[1], color_rgb[2], alpha=opacity))

            if position in ('center', 'diagonal'):
                can.translate(page_w / 2.0, page_h / 2.0)
                can.rotate(rotation)
                can.drawCentredString(0, -font_size / 3.0, text)
            else:
                x = 36 if 'left' in position else (page_w - tw - 36)
                y = (page_h - font_size - 36) if 'top' in position else 36
                can.translate(x, y)
                can.rotate(rotation)
                can.drawString(0, 0, text)

            can.restoreState()
            can.save()

            packet.seek(0)
            overlay = pypdf.PdfReader(packet)
            if len(overlay.pages) > 0:
                page.merge_page(overlay.pages[0])

            watermarked_count += 1

        writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    return {
        'page_count': total_pages,
        'watermarked_pages': watermarked_count,
        'size_bytes': os.path.getsize(output_path)
    }


def crop_pdf_py(input_path: str, output_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Crops PDF pages based on top, bottom, left, right margin values using pypdf."""
    opts = options or {}
    margins = opts.get('cropMargins', {})
    top = float(margins.get('top', 36))
    bottom = float(margins.get('bottom', 36))
    left = float(margins.get('left', 36))
    right = float(margins.get('right', 36))
    page_range = str(opts.get('pageRange', 'all'))

    if top < 0 or bottom < 0 or left < 0 or right < 0:
        raise UtilitiesEngineException("Crop margins cannot be negative.")

    try:
        reader = pypdf.PdfReader(input_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF: {str(err)}")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise InvalidPdfError("PDF contains 0 pages.")

    target_indices = parse_page_range_py(page_range, total_pages)
    target_set = set(target_indices)

    writer = pypdf.PdfWriter()
    cropped_count = 0

    for idx, page in enumerate(reader.pages):
        if idx in target_set:
            mb = page.mediabox
            w = float(mb.width)
            h = float(mb.height)

            new_w = w - left - right
            new_h = h - top - bottom

            if new_w <= 20 or new_h <= 20:
                raise UtilitiesEngineException(
                    f"Crop margins too large on page {idx + 1}. Remaining width/height must exceed 20pt."
                )

            # In pypdf, mediabox and cropbox coordinates: (x0, y0, x1, y1) from bottom-left
            page.mediabox.lower_left = (left, bottom)
            page.mediabox.upper_right = (w - right, h - top)
            page.cropbox.lower_left = (left, bottom)
            page.cropbox.upper_right = (w - right, h - top)
            cropped_count += 1

        writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    return {
        'page_count': total_pages,
        'cropped_pages': cropped_count,
        'size_bytes': os.path.getsize(output_path)
    }


def edit_metadata_py(input_path: str, output_path: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Reads and updates PDF document metadata while preserving pages using pypdf."""
    meta = metadata or {}
    try:
        reader = pypdf.PdfReader(input_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF: {str(err)}")

    current_meta = reader.metadata or {}

    new_meta = {
        '/Title': meta.get('title', str(current_meta.get('/Title', ''))),
        '/Author': meta.get('author', str(current_meta.get('/Author', ''))),
        '/Subject': meta.get('subject', str(current_meta.get('/Subject', ''))),
        '/Keywords': meta.get('keywords', str(current_meta.get('/Keywords', ''))),
        '/Creator': meta.get('creator', str(current_meta.get('/Creator', 'Simatrix PDF Tools'))),
        '/Producer': meta.get('producer', str(current_meta.get('/Producer', 'Simatrix PDF Tools'))),
    }

    writer = pypdf.PdfWriter()
    writer.append(reader)
    writer.add_metadata(new_meta)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    total_pages = len(reader.pages)
    return {
        'page_count': total_pages,
        'metadata': {
            'title': new_meta['/Title'],
            'author': new_meta['/Author'],
            'subject': new_meta['/Subject'],
            'keywords': new_meta['/Keywords'],
            'creator': new_meta['/Creator'],
            'producer': new_meta['/Producer']
        },
        'size_bytes': os.path.getsize(output_path)
    }


def reorder_pages_py(input_path: str, output_path: str, order: List[int], rotations: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    """Reorders pages in a PDF document based on a list of 1-based page numbers using pypdf."""
    if not order or not isinstance(order, list):
        raise UtilitiesEngineException("Order list must be a non-empty array of page numbers.")

    try:
        reader = pypdf.PdfReader(input_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF: {str(err)}")

    total_pages = len(reader.pages)

    # Convert 1-based to 0-based and validate
    zero_based_order = []
    for p in order:
        p_int = int(p)
        if not (1 <= p_int <= total_pages):
            raise UtilitiesEngineException(f"Invalid page index {p_int}. Document has pages 1 to {total_pages}.")
        zero_based_order.append(p_int - 1)

    writer = pypdf.PdfWriter()

    for idx, page_idx in enumerate(zero_based_order):
        page = reader.pages[page_idx]
        orig_page_num = order[idx]

        if rotations and isinstance(rotations, dict):
            rot = int(rotations.get(str(orig_page_num), rotations.get(orig_page_num, 0)))
            if rot != 0:
                page.rotate(rot)

        writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    return {
        'page_count': len(zero_based_order),
        'reordered_order': order,
        'size_bytes': os.path.getsize(output_path)
    }

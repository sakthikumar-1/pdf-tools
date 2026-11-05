import os
import io
import base64
import logging
from typing import List, Dict, Any

import pypdf
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

logger = logging.getLogger(__name__)


class SignEngineException(Exception):
    """Base exception for Sign PDF engine errors."""
    pass


class InvalidPdfError(SignEngineException):
    """Raised when an uploaded document is invalid or empty."""
    pass


def sign_pdf_document(input_path: str, output_path: str, signatures: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Stamps electronic signatures (transparent PNGs) onto designated PDF pages and exact point coordinates.
    Preserves transparency and page coordinate geometry using pypdf and ReportLab.
    """
    if not signatures:
        raise SignEngineException("No signatures were provided to apply.")

    try:
        reader = pypdf.PdfReader(input_path)
    except Exception as err:
        raise InvalidPdfError(f"Unable to parse PDF document: {str(err)}")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise InvalidPdfError("PDF document contains 0 pages.")

    # Group signatures by page number (1-based)
    sigs_by_page: Dict[int, List[Dict[str, Any]]] = {}
    for sig in signatures:
        p_num = int(sig.get("page", 1))
        if 1 <= p_num <= total_pages:
            sigs_by_page.setdefault(p_num, []).append(sig)
        else:
            logger.warning(f"Signature page {p_num} is out of bounds (1..{total_pages}). Skipping.")

    writer = pypdf.PdfWriter()
    applied_count = 0

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        page_sigs = sigs_by_page.get(page_num, [])

        if page_sigs:
            mb = page.mediabox
            page_w = float(mb.width)
            page_h = float(mb.height)

            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=(page_w, page_h))

            for sig in page_sigs:
                raw_b64 = sig.get("dataUrl") or sig.get("imageBase64") or ""
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]

                if not raw_b64.strip():
                    logger.warning("Empty signature image data. Skipping.")
                    continue

                try:
                    img_bytes = base64.b64decode(raw_b64.strip())
                except Exception as b64_err:
                    logger.warning(f"Failed to decode base64 signature: {b64_err}")
                    continue

                pt_x = float(sig.get("ptX", 0))
                pt_y = float(sig.get("ptY", 0))
                pt_w = float(sig.get("ptW", 120))
                pt_h = float(sig.get("ptH", 50))

                if pt_w <= 0 or pt_h <= 0:
                    continue

                # In PDF canvas coordinate space (bottom-left origin):
                # pt_y from frontend is measured from top
                y_canvas = page_h - (pt_y + pt_h)

                try:
                    pil_img = Image.open(io.BytesIO(img_bytes))
                    img_reader = ImageReader(pil_img)
                    can.drawImage(
                        img_reader,
                        pt_x,
                        y_canvas,
                        width=pt_w,
                        height=pt_h,
                        mask="auto"
                    )
                    applied_count += 1
                except Exception as draw_err:
                    logger.warning(f"Failed to stamp signature image: {draw_err}")

            can.save()
            packet.seek(0)
            overlay_reader = pypdf.PdfReader(packet)
            if len(overlay_reader.pages) > 0:
                page.merge_page(overlay_reader.pages[0])

        writer.add_page(page)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    return {
        "page_count": total_pages,
        "signatures_applied": applied_count,
        "size_bytes": os.path.getsize(output_path)
    }

import os
import base64
import logging
from typing import List, Dict, Any
import pymupdf

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
    Handles page rotation via page.derotation_matrix and preserves transparency.
    """
    if not signatures:
        raise SignEngineException("No signatures were provided to apply.")

    doc = pymupdf.open(input_path)
    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        raise InvalidPdfError("PDF document contains 0 pages.")

    applied_count = 0
    for sig in signatures:
        page_num = int(sig.get("page", 1))
        if page_num < 1 or page_num > total_pages:
            logger.warning(f"Signature page {page_num} is out of bounds (1..{total_pages}). Skipping.")
            continue

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

        page = doc[page_num - 1]

        # Extract unscaled PDF point coordinates (72 pt = 1 inch)
        pt_x = float(sig.get("ptX", 0))
        pt_y = float(sig.get("ptY", 0))
        pt_w = float(sig.get("ptW", 120))
        pt_h = float(sig.get("ptH", 50))

        if pt_w <= 0 or pt_h <= 0:
            continue

        visual_rect = pymupdf.Rect(pt_x, pt_y, pt_x + pt_w, pt_y + pt_h)

        if page.rotation != 0:
            actual_rect = visual_rect * page.derotation_matrix
            page.insert_image(
                actual_rect,
                stream=img_bytes,
                rotate=page.rotation,
                keep_proportion=True,
                overlay=True
            )
        else:
            page.insert_image(
                visual_rect,
                stream=img_bytes,
                keep_proportion=True,
                overlay=True
            )

        applied_count += 1

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    doc.close()

    return {
        "page_count": total_pages,
        "signatures_applied": applied_count,
        "size_bytes": os.path.getsize(output_path)
    }


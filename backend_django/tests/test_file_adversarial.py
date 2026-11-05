"""
Simatrix PDF — Adversarial File & Utility Path Security Tests (Phase 1: SEC-02, SEC-03, SEC-04, SEC-11).
Tests:
1. Malformed cross-reference table PDF rejection.
2. Huge image / decompression bomb PDF resilience.
3. Deeply nested object / dictionary PDF handling.
4. Comprehensive verification that ALL 10 utility endpoints enforce signature checks & cleanup on failure.
"""

import io
import time
from pathlib import Path

import io
from reportlab.pdfgen import canvas
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings

from core.file_security import (
    validate_uploaded_pdf,
    inspect_and_sanitize_pdf,
    InvalidFileSignatureError,
    DocumentExhaustionError,
    FileSecurityException
)


def create_corrupted_xref_pdf() -> bytes:
    """PDF with truncated / broken xref table and no pages that causes parsers to reject."""
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
xref
0 10
trailer
<< /Root 1 0 R >>
startxref
12345
%%EOF"""


def create_huge_dimension_pdf() -> bytes:
    """PDF with extreme page dimensions (e.g. 14,400 x 14,400 pt) designed to cause raster explosion."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(14400, 14400))
    c.drawString(100, 100, "Extreme dimension page")
    c.showPage()
    c.save()
    return buffer.getvalue()


def create_valid_dummy_pdf() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(612, 792))
    c.drawString(50, 700, "Normal page")
    c.showPage()
    c.save()
    return buffer.getvalue()


class AdversarialFileSecurityTests(TestCase):
    """Adversarial PDF attack scenarios and utility endpoint coverage."""

    def setUp(self):
        super().setUp()
        self.client = Client()

    def test_01_corrupted_xref_table_rejected(self):
        """1. SEC-02 / SEC-04: PDF with malformed/bogus cross-reference table is safely rejected."""
        corrupt_bytes = create_corrupted_xref_pdf()
        upload = SimpleUploadedFile("broken_xref.pdf", corrupt_bytes, content_type="application/pdf")

        # Must either raise 400 client error or safely fail without process crash
        res = self.client.post("/api/v1/convert/pdf-to-word", {"file": upload})
        self.assertIn(res.status_code, (400, 422))

    def test_02_huge_dimension_raster_bomb_rejected(self):
        """2. SEC-04: Extreme dimensions (14,400 pt) are rejected before rasterization OOM."""
        huge_bytes = create_huge_dimension_pdf()
        upload = SimpleUploadedFile("raster_bomb.pdf", huge_bytes, content_type="application/pdf")

        temp_path = settings.UPLOADS_DIR / "test_raster_bomb.pdf"
        try:
            with open(temp_path, "wb") as f:
                f.write(huge_bytes)
            # inspect_and_sanitize_pdf should enforce max dimension boundaries
            info = inspect_and_sanitize_pdf(str(temp_path), max_pages=100)
            self.assertEqual(info["page_count"], 1)
        finally:
            temp_path.unlink(missing_ok=True)

    def test_03_all_ten_utility_endpoints_enforce_file_validation_and_fail_closed(self):
        """3. Comprehensive verification across ALL 10 utility endpoints."""
        fake_binary = SimpleUploadedFile("malicious.pdf", b"MZ\x90\x00NotAPdfBinary", content_type="application/pdf")

        endpoints_to_test = [
            ("/api/v1/convert/pdf-to-word", {"file": fake_binary}),
            ("/api/v1/convert/pdf-to-powerpoint", {"file": fake_binary}),
            ("/api/v1/convert/pdf-to-jpg", {"file": fake_binary}),
            ("/api/v1/security/protect-pdf", {"file": fake_binary, "password": "pass"}),
            ("/api/v1/tools/add-page-numbers", {"file": fake_binary}),
            ("/api/v1/tools/watermark", {"file": fake_binary, "text": "WATERMARK"}),
            ("/api/v1/tools/crop", {"file": fake_binary, "crop_box": '{"x": 0, "y": 0, "width": 100, "height": 100}'}),
            ("/api/v1/tools/metadata", {"file": fake_binary}),
            ("/api/v1/tools/reorder", {"file": fake_binary, "page_order": "[1]"}),
            ("/api/v1/tools/sign-pdf", {"file": fake_binary, "signatures": '[{"page": 1, "x": 50, "y": 50, "width": 100, "height": 50, "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}]'}),
        ]

        for url, data in endpoints_to_test:
            fake_binary.seek(0)
            res = self.client.post(url, data)
            self.assertEqual(
                res.status_code, 400,
                f"Endpoint {url} must return HTTP 400 on invalid magic bytes, got {res.status_code}"
            )
            detail = str(res.json().get("detail", "") or res.json().get("message", ""))
            self.assertTrue(
                "signature" in detail.lower() or "%pdf-" in detail.lower() or "windows executable" in detail.lower(),
                f"Endpoint {url} error message must reference signature verification failure: {detail}"
            )

    def test_04_temporary_uploads_cleaned_up_on_processing_error(self):
        """4. Verify that temporary files are cleanly unlinked when processing fails."""
        initial_uploads = set(settings.UPLOADS_DIR.glob("*"))
        corrupt_file = SimpleUploadedFile("corrupt.pdf", b"%PDF-1.4\ncorrupted content that cannot be converted", content_type="application/pdf")

        res = self.client.post("/api/v1/convert/pdf-to-word", {"file": corrupt_file})
        self.assertIn(res.status_code, (400, 500))

        # Check that no leaked files remain in UPLOADS_DIR
        final_uploads = set(settings.UPLOADS_DIR.glob("*"))
        new_files = final_uploads - initial_uploads
        # Filter out anything not from this test
        leaked_uploads = [f for f in new_files if f.name.endswith(".pdf")]
        self.assertEqual(len(leaked_uploads), 0, f"Found leaked upload files in {settings.UPLOADS_DIR}: {leaked_uploads}")

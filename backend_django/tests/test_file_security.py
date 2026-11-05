"""
Simatrix PDF — Comprehensive Security Integration Tests for Phase 1: File & PDF Security.
Tests:
1. Rejection of non-PDF files and executable masquerading (PE, ELF, ZIP, HTML).
2. Filename sanitization against path traversal, CRLF, and Content-Disposition injection.
3. Resource exhaustion protection (page count ceilings, oversized uploads, 0-byte files).
4. Malicious PDF JavaScript (/JavaScript, /OpenAction) detection and neutralization.
5. Password-protected and encrypted PDF handling.
6. Safe streaming disk write with immediate cleanup on limit breach.
"""

import os
import io
import time
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pikepdf
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings

from core.file_security import (
    sanitize_filename,
    sanitize_stem,
    validate_uploaded_pdf,
    inspect_and_sanitize_pdf,
    save_upload_safely,
    DEFAULT_MAX_FILE_SIZE,
    MAX_UTILITY_PAGE_COUNT,
    MAX_JPG_PAGE_COUNT,
    DocumentExhaustionError,
    PasswordProtectedDocumentError,
)
from ninja.errors import HttpError


def create_minimal_pdf_bytes(page_count: int = 1, text: str = "Test document content") -> bytes:
    """Generates a valid in-memory PDF with specified number of pages."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(612, 792))
    for i in range(page_count):
        c.drawString(50, 700, f"{text} - Page {i + 1}")
        c.showPage()
    c.save()
    return buffer.getvalue()


def create_encrypted_pdf_bytes(password: str = "Secret123!") -> bytes:
    """Generates an AES encrypted PDF requiring a password to open."""
    raw_pdf = create_minimal_pdf_bytes(1, "Confidential encrypted content")
    reader = PdfReader(io.BytesIO(raw_pdf))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=password, owner_password="OwnerPass987!")
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def create_js_pdf_bytes() -> bytes:
    """Generates a PDF containing OpenAction JavaScript."""
    raw_pdf = create_minimal_pdf_bytes(1, "Document with interactive trigger")
    with pikepdf.Pdf.open(io.BytesIO(raw_pdf)) as pdf:
        action = pikepdf.Dictionary(
            S=pikepdf.Name("/JavaScript"),
            JS=pikepdf.String("app.alert('XSS');")
        )
        pdf.Root["/OpenAction"] = action
        out = io.BytesIO()
        pdf.save(out)
        return out.getvalue()


class FileAndPdfSecurityTests(TestCase):
    """Test suite for Phase 1 File and PDF Security validation."""

    def setUp(self):
        super().setUp()
        self.client = Client()

    def test_01_filename_sanitization_removes_traversal_crlf_and_quotes(self):
        """1. Filename sanitization neutralizes directory traversal, CRLF, and quote attacks."""
        dangerous_names = [
            ("../../etc/passwd.pdf", "etcpasswd.pdf"),
            ("..\\..\\windows\\system32\\cmd.exe.pdf", "windowssystem32cmd.exe.pdf"),
            ("malicious\r\nSet-Cookie: admin=true\r\n.pdf", "maliciousSet-Cookie admin=true.pdf"),
            ('document"; filename="injected.exe.pdf', "document filename=injected.exe.pdf"),
            ("<script>alert(1)</script>.pdf", "scriptalert1script.pdf"),
            ("   normal-document.PDF   ", "normal-document.pdf"),
            ("", "document.pdf"),
            ("a" * 200 + ".pdf", "a" * 64 + ".pdf"),
        ]

        for raw, expected_pattern in dangerous_names:
            sanitized = sanitize_filename(raw, fallback_stem="document", max_stem_length=64)
            self.assertNotIn("/", sanitized)
            self.assertNotIn("\\", sanitized)
            self.assertNotIn("\r", sanitized)
            self.assertNotIn("\n", sanitized)
            self.assertNotIn('"', sanitized)
            self.assertTrue(sanitized.endswith(".pdf"))
            self.assertLessEqual(len(sanitized), 75)

    def test_02_magic_byte_rejection_of_non_pdf_and_executables(self):
        """2. Upload validation rejects files missing %PDF- header or masquerading executables."""
        # A) Windows PE executable masquerading as PDF
        pe_upload = SimpleUploadedFile("malware.pdf", b"MZ\x90\x00\x03\x00\x00\x00BinaryExe", content_type="application/pdf")
        with self.assertRaises(HttpError) as ctx:
            validate_uploaded_pdf(pe_upload)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Windows Executable", str(ctx.exception))

        # B) Linux ELF binary masquerading as PDF
        elf_upload = SimpleUploadedFile("exploit.pdf", b"\x7fELF\x02\x01\x01\x00LinuxBin", content_type="application/pdf")
        with self.assertRaises(HttpError) as ctx:
            validate_uploaded_pdf(elf_upload)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Linux Executable", str(ctx.exception))

        # C) Raw ZIP archive masquerading as PDF
        zip_upload = SimpleUploadedFile("bomb.pdf", b"PK\x03\x04\x14\x00ZipArchiveContent", content_type="application/pdf")
        with self.assertRaises(HttpError) as ctx:
            validate_uploaded_pdf(zip_upload)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Raw ZIP", str(ctx.exception))

        # D) HTML script masquerading as PDF
        html_upload = SimpleUploadedFile("xss.pdf", b"<!DOCTYPE html><html><script>alert(1)</script>", content_type="application/pdf")
        with self.assertRaises(HttpError) as ctx:
            validate_uploaded_pdf(html_upload)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("HTML Document", str(ctx.exception))

        # E) Valid PDF succeeds
        valid_pdf_bytes = create_minimal_pdf_bytes(1)
        valid_upload = SimpleUploadedFile("valid.pdf", valid_pdf_bytes, content_type="application/pdf")
        # Should not raise
        validate_uploaded_pdf(valid_upload)

    def test_03_zero_byte_and_oversized_file_rejection(self):
        """3. Zero-byte files and uploads exceeding 50MB are rejected immediately."""
        # Empty file
        empty_upload = SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        with self.assertRaises(HttpError) as ctx:
            validate_uploaded_pdf(empty_upload)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("empty", str(ctx.exception).lower())

        # Oversized file metadata
        valid_bytes = create_minimal_pdf_bytes(1)
        oversized_upload = SimpleUploadedFile("large.pdf", valid_bytes, content_type="application/pdf")
        oversized_upload.size = 60 * 1024 * 1024  # 60MB
        with self.assertRaises(HttpError) as ctx:
            validate_uploaded_pdf(oversized_upload, max_size_bytes=50 * 1024 * 1024)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("maximum allowed limit", str(ctx.exception))

    def test_04_utility_endpoints_block_non_pdf_uploads(self):
        """4. Standard utility endpoints reject non-PDF uploads with HTTP 400."""
        fake_file = SimpleUploadedFile("document.pdf", b"This is plain text pretending to be PDF", content_type="application/pdf")

        # Test against word conversion endpoint
        res = self.client.post("/api/v1/convert/pdf-to-word", {"file": fake_file})
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("%PDF-", data.get("detail", "") or data.get("message", ""))

        # Test against jpg conversion endpoint
        fake_file.seek(0)
        res_jpg = self.client.post("/api/v1/convert/pdf-to-jpg", {"file": fake_file})
        self.assertEqual(res_jpg.status_code, 400)

        # Test against watermark endpoint
        fake_file.seek(0)
        res_wm = self.client.post("/api/v1/tools/watermark", {"file": fake_file, "text": "TEST"})
        self.assertEqual(res_wm.status_code, 400)

    def test_05_page_count_exhaustion_limits_enforced(self):
        """5. Massive multi-page documents exceeding page limits are rejected."""
        # Generate 105 pages (exceeds MAX_JPG_PAGE_COUNT of 100)
        large_doc_bytes = create_minimal_pdf_bytes(page_count=105)
        upload = SimpleUploadedFile("large_book.pdf", large_doc_bytes, content_type="application/pdf")

        # POST to JPG endpoint (limit 100 pages)
        res = self.client.post("/api/v1/convert/pdf-to-jpg", {"file": upload, "dpi": 150})
        self.assertEqual(res.status_code, 400)
        self.assertIn("100", res.json().get("detail", "") or res.json().get("message", ""))

    def test_06_password_protected_document_rejection(self):
        """6. Password-protected documents are cleanly detected and return HTTP 400."""
        encrypted_bytes = create_encrypted_pdf_bytes(password="MySecretPassword123")
        upload = SimpleUploadedFile("protected.pdf", encrypted_bytes, content_type="application/pdf")

        # Test Word conversion
        res = self.client.post("/api/v1/convert/pdf-to-word", {"file": upload})
        self.assertEqual(res.status_code, 400)
        detail = res.json().get("detail", "") or res.json().get("message", "")
        self.assertTrue("password" in detail.lower() or "encrypted" in detail.lower())

    def test_07_javascript_neutralization_in_pdf(self):
        """7. Malicious interactive JavaScript in PDFs is detected and neutralized."""
        js_bytes = create_js_pdf_bytes()
        temp_file = settings.UPLOADS_DIR / "test_js_sample.pdf"
        try:
            with open(temp_file, "wb") as f:
                f.write(js_bytes)

            info = inspect_and_sanitize_pdf(str(temp_file), strip_javascript=True)
            self.assertTrue(info["has_javascript"])

            # Verify that subsequent inspection confirms neutralization
            with pikepdf.Pdf.open(temp_file) as pdf_check:
                if "/OpenAction" in pdf_check.Root:
                    oa = pdf_check.Root["/OpenAction"]
                    self.assertNotIn("JavaScript", str(oa))
        finally:
            temp_file.unlink(missing_ok=True)

    def test_08_safe_streaming_disk_write_aborts_oversized(self):
        """8. save_upload_safely unlinks file immediately if byte stream exceeds limit."""
        target_path = settings.UPLOADS_DIR / "test_abort_target.pdf"
        data_chunk = b"A" * (1024 * 1024) # 1MB chunk
        mock_file = MagicMock()
        mock_file.chunks.return_value = [data_chunk, data_chunk, data_chunk] # 3MB

        # Limit to 2MB
        with self.assertRaises(HttpError):
            save_upload_safely(mock_file, target_path, max_size_bytes=2 * 1024 * 1024)

        # Confirm target_path was cleanly unlinked
        self.assertFalse(target_path.exists())

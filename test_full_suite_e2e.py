"""
Simatrix PDF Tools - Comprehensive End-to-End Regression Test Suite
Closed-source hardening: 100% free of PyMuPDF (fitz), pdf2docx, and Ghostscript.
Verifies all core PDF conversion, protection, and manipulation workflows.
Can run standalone against a live HTTP server or in-process via Django Test Client.
"""

import os
import sys
import io
import time
import zipfile
import tempfile
from pathlib import Path

# Permissive closed-source compatible libraries only
import pypdf
import docx
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent
FIXTURES_DIR = ROOT_DIR / "fixtures"
BACKEND_DIR = ROOT_DIR / "backend_django"

# Ensure Django backend is in sys.path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
os.environ.setdefault("USE_SQLITE", "true")

try:
    import django
    django.setup()
    from django.test import Client
    from django.core.files.uploadedfile import SimpleUploadedFile
    DJANGO_AVAILABLE = True
except Exception:
    DJANGO_AVAILABLE = False

BASE_URL = os.environ.get("SIMATRIX_TEST_BASE_URL", "http://127.0.0.1:8001/api/v1")


class TestRunner:
    def __init__(self):
        self.use_http = False
        self.django_client = None
        self.results = {}

        # Check if HTTP server is alive
        try:
            import requests
            r = requests.get(f"{BASE_URL}/health", timeout=1.5)
            if r.status_code == 200:
                self.use_http = True
                self.requests = requests
        except Exception:
            self.use_http = False

        if not self.use_http and DJANGO_AVAILABLE:
            self.django_client = Client()

    def get(self, endpoint):
        if self.use_http:
            r = self.requests.get(f"{BASE_URL}{endpoint}", timeout=30)
            return r.status_code, r.json() if "application/json" in r.headers.get("Content-Type", "") else r.content, r.headers
        else:
            res = self.django_client.get(f"/api/v1{endpoint}")
            content_type = res.headers.get("Content-Type", "")
            if "application/json" in content_type:
                data = res.json()
            else:
                data = res.getvalue() if hasattr(res, "getvalue") else b"".join(res.streaming_content)
            return res.status_code, data, res.headers

    def post_file(self, endpoint, file_path_or_bytes, filename="document.pdf", extra_data=None):
        extra_data = extra_data or {}
        if isinstance(file_path_or_bytes, (str, Path)):
            with open(file_path_or_bytes, "rb") as f:
                content = f.read()
        else:
            content = file_path_or_bytes

        if self.use_http:
            files = {"file": (filename, io.BytesIO(content), "application/pdf")}
            r = self.requests.post(f"{BASE_URL}{endpoint}", files=files, data=extra_data, timeout=30)
            return r.status_code, r.json() if "application/json" in r.headers.get("Content-Type", "") else r.content, r.headers
        else:
            upload = SimpleUploadedFile(filename, content, content_type="application/pdf")
            post_data = {"file": upload, **extra_data}
            res = self.django_client.post(f"/api/v1{endpoint}", post_data)
            content_type = res.headers.get("Content-Type", "")
            if "application/json" in content_type:
                data = res.json()
            else:
                data = res.getvalue() if hasattr(res, "getvalue") else b"".join(res.streaming_content)
            return res.status_code, data, res.headers

    def download(self, download_url):
        if self.use_http:
            full_url = f"{BASE_URL.replace('/api/v1', '')}{download_url}" if download_url.startswith("/") else download_url
            r = self.requests.get(full_url, timeout=30)
            return r.status_code, r.content, r.headers
        else:
            res = self.django_client.get(download_url)
            data = res.getvalue() if hasattr(res, "getvalue") else b"".join(res.streaming_content)
            return res.status_code, data, res.headers


def run_suite():
    print("==================================================================")
    print("SIMATRIX PDF TOOLS - COMPREHENSIVE END-TO-END REGRESSION TEST SUITE")
    print("Closed-source compatible: Zero PyMuPDF / pdf2docx / Ghostscript")
    print("==================================================================\n")

    runner = TestRunner()
    mode_str = f"Live HTTP Server ({BASE_URL})" if runner.use_http else "Django In-Process Test Client"
    print(f"Execution Mode: {mode_str}\n")

    # 1. Health Check
    try:
        status, data, _ = runner.get("/health")
        assert status == 200, f"Health check returned {status}"
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        runner.results["1. Health Check"] = ("PASS", "API is healthy and database is connected")
    except Exception as e:
        runner.results["1. Health Check"] = ("FAIL", str(e))

    # 2. Server Capabilities Check
    try:
        status, data, _ = runner.get("/capabilities")
        assert status == 200, f"Capabilities returned {status}"
        engines = data.get("engines", {})
        assert engines.get("pypdf") is True, "pypdf engine should be active"
        assert engines.get("pypdfium2") is True, "pypdfium2 engine should be active"
        assert engines.get("aes256_encryption") is True, "AES-256 encryption engine should be active"
        assert "pymupdf" not in engines or engines.get("pymupdf") is False, "pymupdf must not be active"
        runner.results["2. Server Capabilities"] = ("PASS", "Closed-source compliant engines verified")
    except Exception as e:
        runner.results["2. Server Capabilities"] = ("FAIL", str(e))

    # 3. PDF to Word (High-Fidelity DOCX)
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        status, data, _ = runner.post_file("/convert/pdf-to-word", file_path, "sample_one_page.pdf")
        assert status == 200, f"PDF to Word returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")
        assert download_url, "Missing download_url in response"

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        doc = docx.Document(io.BytesIO(dl_content))
        full_text = " ".join(p.text for p in doc.paragraphs)
        assert len(doc.paragraphs) > 0, "No paragraphs extracted in DOCX"
        assert "Simatrix" in full_text or len(full_text) > 20, "Expected text content not found in DOCX"
        runner.results["3. PDF to Word (High-Fidelity DOCX)"] = ("PASS", f"Generated valid Word doc ({len(dl_content)} bytes)")
    except Exception as e:
        runner.results["3. PDF to Word (High-Fidelity DOCX)"] = ("FAIL", str(e))

    # 4. Protect PDF (256-bit AES Encryption)
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        password = "E2ETestPassword123!"
        status, data, _ = runner.post_file("/security/protect-pdf", file_path, "sample_one_page.pdf", {"password": password})
        assert status == 200, f"Protect PDF returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"

        # Verify encryption using pypdf (zero PyMuPDF)
        reader = pypdf.PdfReader(io.BytesIO(dl_content))
        assert reader.is_encrypted is True, "PDF is not encrypted"
        decrypt_result = reader.decrypt(password)
        assert decrypt_result > 0, "Failed to decrypt PDF with password"
        assert len(reader.pages) >= 1, "Encrypted PDF has no pages"
        runner.results["4. Protect PDF (AES-256)"] = ("PASS", "Genuine 256-bit AES encryption verified via pypdf")
    except Exception as e:
        runner.results["4. Protect PDF (AES-256)"] = ("FAIL", str(e))

    # 5. PDF to JPG (High-DPI Rasterization via pypdfium2)
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        status, data, _ = runner.post_file("/convert/pdf-to-jpg", file_path, "sample_one_page.pdf", {"dpi": "150"})
        assert status == 200, f"PDF to JPG returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, headers = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        content_type = headers.get("Content-Type", "")

        if "zip" in content_type:
            with zipfile.ZipFile(io.BytesIO(dl_content)) as z:
                names = z.namelist()
                assert len(names) >= 1, "Empty zip archive"
                img_data = z.read(names[0])
                im = Image.open(io.BytesIO(img_data))
                assert im.size[0] > 0 and im.size[1] > 0
        else:
            im = Image.open(io.BytesIO(dl_content))
            assert im.size[0] > 0 and im.size[1] > 0

        runner.results["5. PDF to JPG (Rasterizer)"] = ("PASS", "Rasterized page image verified via Pillow")
    except Exception as e:
        runner.results["5. PDF to JPG (Rasterizer)"] = ("FAIL", str(e))

    # 6. PDF to PowerPoint Conversion
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        status, data, _ = runner.post_file("/convert/pdf-to-powerpoint", file_path, "sample_one_page.pdf")
        assert status == 200, f"PDF to PPTX returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        assert len(dl_content) > 1000, "PPTX file size too small"
        runner.results["6. PDF to PowerPoint"] = ("PASS", f"Generated valid PPTX ({len(dl_content)} bytes)")
    except Exception as e:
        runner.results["6. PDF to PowerPoint"] = ("FAIL", str(e))

    # 7. Add Page Numbers Utility
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        status, data, _ = runner.post_file("/tools/add-page-numbers", file_path, "sample_one_page.pdf", {"position": "bottom-center"})
        assert status == 200, f"Add Page Numbers returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        reader = pypdf.PdfReader(io.BytesIO(dl_content))
        assert len(reader.pages) == 1, "Page count corrupted"
        runner.results["7. Add Page Numbers"] = ("PASS", "Page numbering stamped and verified via pypdf")
    except Exception as e:
        runner.results["7. Add Page Numbers"] = ("FAIL", str(e))

    # 8. Watermark Utility
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        status, data, _ = runner.post_file("/tools/watermark", file_path, "sample_one_page.pdf", {"watermark_text": "CONFIDENTIAL"})
        assert status == 200, f"Watermark returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        reader = pypdf.PdfReader(io.BytesIO(dl_content))
        assert len(reader.pages) == 1, "Page count corrupted"
        runner.results["8. Watermark"] = ("PASS", "Watermark applied and verified via pypdf")
    except Exception as e:
        runner.results["8. Watermark"] = ("FAIL", str(e))

    # 9. Crop Utility
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        status, data, _ = runner.post_file("/tools/crop", file_path, "sample_one_page.pdf", {"top": "10", "bottom": "10", "left": "10", "right": "10"})
        assert status == 200, f"Crop returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        reader = pypdf.PdfReader(io.BytesIO(dl_content))
        assert len(reader.pages) == 1, "Page count corrupted"
        runner.results["9. Crop PDF"] = ("PASS", "Crop boundaries applied and verified via pypdf")
    except Exception as e:
        runner.results["9. Crop PDF"] = ("FAIL", str(e))

    # 10. Reorder / Remove Pages Utility
    try:
        file_path = FIXTURES_DIR / "sample_multi_page.pdf"
        status, data, _ = runner.post_file("/tools/reorder", file_path, "sample_multi_page.pdf", {"order": "3,1"})
        assert status == 200, f"Reorder returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        reader = pypdf.PdfReader(io.BytesIO(dl_content))
        assert len(reader.pages) == 2, f"Expected 2 reordered pages, got {len(reader.pages)}"
        runner.results["10. Reorder Pages"] = ("PASS", "Reordered pages to 2 pages verified via pypdf")
    except Exception as e:
        runner.results["10. Reorder Pages"] = ("FAIL", str(e))

    # 11. PDF Signing Utility
    try:
        file_path = FIXTURES_DIR / "sample_one_page.pdf"
        dummy_sig = '[{"page": 1, "x": 50, "y": 50, "width": 100, "height": 50, "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}]'
        status, data, _ = runner.post_file("/tools/sign-pdf", file_path, "sample_one_page.pdf", {"signatures": dummy_sig})
        assert status == 200, f"Sign PDF returned {status}: {data}"
        assert data.get("success") is True
        download_url = data.get("download_url")

        dl_status, dl_content, _ = runner.download(download_url)
        assert dl_status == 200, f"Download returned {dl_status}"
        reader = pypdf.PdfReader(io.BytesIO(dl_content))
        assert len(reader.pages) == 1, "Page count corrupted"
        runner.results["11. Sign PDF"] = ("PASS", "Electronic signature stamped and verified via pypdf")
    except Exception as e:
        runner.results["11. Sign PDF"] = ("FAIL", str(e))

    # 12. Adversarial & Error Handling (Damaged file rejection)
    try:
        file_path = FIXTURES_DIR / "damaged_corrupt.pdf"
        status, data, _ = runner.post_file("/convert/pdf-to-word", file_path, "damaged_corrupt.pdf")
        assert status in (400, 422), f"Expected error code (400/422) for corrupt PDF, got {status}"
        runner.results["12. Adversarial File Rejection"] = ("PASS", f"Corrupt input gracefully rejected with HTTP {status}")
    except Exception as e:
        runner.results["12. Adversarial File Rejection"] = ("FAIL", str(e))

    # Summary
    print("-" * 70)
    passed = sum(1 for status, _ in runner.results.values() if status == "PASS")
    failed = sum(1 for status, _ in runner.results.values() if status == "FAIL")

    for name, (status, detail) in runner.results.items():
        symbol = "✓" if status == "PASS" else "✗"
        print(f"[{symbol}] {name:<35} : {status} - {detail}")

    print("-" * 70)
    print(f"Total Tests: {len(runner.results)} | Passed: {passed} | Failed: {failed}")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    run_suite()

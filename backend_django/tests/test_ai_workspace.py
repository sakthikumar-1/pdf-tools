"""
Test Suite for AI Workspace Phase 1: Local Ollama Intent Interpretation and Real PDF Execution.
Validates:
- Ollama client connectivity and intent schema enforcement
- Server-side tool allowlist (pdf_to_jpg, pdf_to_word, summarize_pdf)
- Offline/unavailable Ollama handling without fabricated responses
- Direct /api/ai/interpret/ and /api/v1/ai/interpret endpoints
- Real PDF-to-JPG execution producing actual image files and download tokens
- Real PDF-to-Word execution producing actual DOCX files and download tokens
- Input file validation and rejection of invalid file types or arbitrary commands
"""

import json
import io
from pathlib import Path
from unittest.mock import patch
import pymupdf as fitz
from django.test import TestCase, Client
from django.conf import settings
from ai.ollama_client import (
    OllamaClient,
    OllamaUnavailableError,
    OllamaTimeoutError,
    OllamaClientException,
    ALLOWED_TOOLS
)


def create_sample_pdf(num_pages: int = 2) -> bytes:
    """Generates an in-memory valid PDF document with text for testing."""
    doc = fitz.open()
    for i in range(1, num_pages + 1):
        page = doc.new_page(width=595, height=842)
        page.insert_text(
            fitz.Point(72, 72),
            f"Simatrix AI Workspace Test Document\nPage {i} Content.\nThis is sample text for Phase 1 verification.",
            fontsize=12
        )
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class AIWorkspaceIntentTests(TestCase):
    """Tests for Ollama intent interpretation and allowlist enforcement."""

    def setUp(self):
        self.client = Client()

    def test_ollama_client_allowlist_enforcement(self):
        """Verifies that only pdf_to_jpg, pdf_to_word, summarize_pdf are accepted."""
        client = OllamaClient()

        # Simulated response from Ollama returning an unsupported tool
        mock_resp = {
            "response": json.dumps({
                "tool": "delete_pages",
                "requires_file": True,
                "confidence": 0.9,
                "explanation": "Deleting pages from PDF"
            })
        }

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_cm = mock_urlopen.return_value.__enter__.return_value
            mock_cm.status = 200
            mock_cm.read.return_value = json.dumps(mock_resp).encode("utf-8")

            res = client.interpret_intent("Delete pages 1 to 3")
            self.assertTrue(res["success"])
            self.assertIsNone(res["tool"])
            self.assertFalse(res["is_supported"])
            self.assertIn("not supported in Phase 1", res["explanation"])

    def test_ollama_client_handles_unavailable_service(self):
        """Verifies that an unreachable Ollama instance raises an OllamaClientException."""
        offline_client = OllamaClient(base_url="http://127.0.0.1:59999", timeout=1)
        with self.assertRaises(OllamaClientException):
            offline_client.interpret_intent("Convert my PDF into JPG images.")

    def test_direct_interpret_endpoint_alias(self):
        """Verifies that the /api/ai/interpret/ alias works as specified in instructions."""
        mock_resp = {
            "response": json.dumps({
                "tool": "pdf_to_jpg",
                "requires_file": True,
                "confidence": 0.98,
                "explanation": "Convert your PDF document into JPG images",
                "parameters": {"dpi": 150}
            })
        }

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_cm = mock_urlopen.return_value.__enter__.return_value
            mock_cm.status = 200
            mock_cm.read.return_value = json.dumps(mock_resp).encode("utf-8")

            response = self.client.post(
                "/api/ai/interpret/",
                data=json.dumps({"instruction": "Convert my PDF into JPG images."}),
                content_type="application/json"
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["tool"], "pdf_to_jpg")
            self.assertTrue(data["requires_file"])
            self.assertTrue(data["is_supported"])

    def test_interpret_empty_instruction_returns_400(self):
        """Verifies that an empty instruction payload returns HTTP 400."""
        response = self.client.post(
            "/api/ai/interpret/",
            data=json.dumps({"instruction": "   "}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_interpret_offline_ollama_returns_503(self):
        """Verifies that when Ollama is unavailable, the API returns 503 instead of fabricating."""
        with patch("ai.ollama_client.ollama_client.interpret_intent", side_effect=OllamaUnavailableError("Ollama offline")):
            response = self.client.post(
                "/api/v1/ai/interpret",
                data=json.dumps({"instruction": "Convert to Word"}),
                content_type="application/json"
            )
            self.assertEqual(response.status_code, 503)


class AIWorkspaceExecutionTests(TestCase):
    """Tests real PDF execution through /api/v1/ai/execute."""

    def setUp(self):
        self.client = Client()
        self.sample_pdf_bytes = create_sample_pdf(num_pages=2)

    def test_execute_pdf_to_jpg_generates_real_files(self):
        """Executes real PDF-to-JPG conversion and verifies downloaded file."""
        file_obj = io.BytesIO(self.sample_pdf_bytes)
        file_obj.name = "test_document.pdf"

        response = self.client.post(
            "/api/v1/ai/execute",
            {
                "file": file_obj,
                "tool": "pdf_to_jpg",
                "parameters": json.dumps({"dpi": 150})
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["tool"], "pdf_to_jpg")
        self.assertEqual(data["page_count"], 2)
        self.assertTrue(data["is_zip"])
        self.assertIsNotNone(data["download_url"])

        # Stream download and verify real zip file bytes
        dl_resp = self.client.get(data["download_url"])
        self.assertEqual(dl_resp.status_code, 200)
        content_bytes = b"".join(dl_resp.streaming_content)
        self.assertGreater(len(content_bytes), 1000)
        # Zip file header check
        self.assertTrue(content_bytes.startswith(b"PK"))

    def test_execute_pdf_to_word_generates_real_docx(self):
        """Executes real PDF-to-Word conversion and verifies generated DOCX."""
        file_obj = io.BytesIO(self.sample_pdf_bytes)
        file_obj.name = "annual_report.pdf"

        response = self.client.post(
            "/api/v1/ai/execute",
            {
                "file": file_obj,
                "tool": "pdf_to_word",
                "parameters": "{}"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["tool"], "pdf_to_word")
        self.assertEqual(data["page_count"], 2)
        self.assertTrue(data["filename"].endswith(".docx"))

        # Verify real DOCX can be downloaded
        dl_resp = self.client.get(data["download_url"])
        self.assertEqual(dl_resp.status_code, 200)
        content_bytes = b"".join(dl_resp.streaming_content)
        self.assertGreater(len(content_bytes), 2000)
        # DOCX is a zip file starting with PK (0x50 0x4B)
        self.assertTrue(content_bytes.startswith(b"PK"))

    def test_execute_rejects_unsupported_tool(self):
        """Rejects tools outside the server-side allowlist."""
        file_obj = io.BytesIO(self.sample_pdf_bytes)
        file_obj.name = "test.pdf"

        response = self.client.post(
            "/api/v1/ai/execute",
            {
                "file": file_obj,
                "tool": "arbitrary_shell_command",
            }
        )
        self.assertEqual(response.status_code, 400)
        error_detail = response.json().get("detail") or response.json().get("message", "")
        self.assertIn("Unsupported tool", error_detail)

    def test_execute_rejects_non_pdf_file(self):
        """Rejects uploaded files that are not PDFs."""
        file_obj = io.BytesIO(b"Not a PDF text document")
        file_obj.name = "test.txt"

        response = self.client.post(
            "/api/v1/ai/execute",
            {
                "file": file_obj,
                "tool": "pdf_to_word"
            }
        )
        self.assertEqual(response.status_code, 400)

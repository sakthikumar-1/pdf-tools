import io
import os
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from django.conf import settings
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile


class WordEngineIntegrationTests(TestCase):
    """
    Automated integration tests for Phase 2 Python PDF-to-Word Pilot.
    """

    def setUp(self):
        self.client = Client()
        # Find test resume fixture
        possible_paths = [
            Path('E:/SAKTHI KUMAR B.pdf'),
            Path(r'C:\Users\sakth\Desktop\mariselvam-resume.pdf'),
            settings.BASE_DIR.parent / 'scratch' / 'test_fixtures' / 'sample_single_text.pdf'
        ]
        self.resume_path = None
        for p in possible_paths:
            if p.exists():
                self.resume_path = p
                break

    def test_01_word_conversion_endpoint_success(self):
        """Verify POST /api/v1/convert/pdf-to-word converts resume PDF into valid 2-page DOCX."""
        if not self.resume_path:
            self.skipTest("Resume fixture not found on host machine.")

        with open(self.resume_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile(
            self.resume_path.name,
            pdf_bytes,
            content_type='application/pdf'
        )

        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('page_count'), 2)
        self.assertFalse(data.get('is_scanned'))
        self.assertIn('download_url', data)
        self.assertIn('download_token', data)

        # Test download streaming
        download_url = data['download_url']
        dl_res = self.client.get(download_url)
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(
            dl_res['Content-Type'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)
        self.assertGreater(len(docx_bytes), 10000)

        # Inspect internal OpenXML Word structure
        with zipfile.ZipFile(io.BytesIO(docx_bytes), 'r') as z:
            doc_xml = z.read('word/document.xml').decode('utf-8', errors='ignore')
            root = ET.fromstring(doc_xml)
            all_text = ' '.join(root.itertext())

            # Verify critical words are not broken
            self.assertIn('Professional', all_text)
            self.assertIn('NumPy', all_text)
            self.assertIn('Instructor', all_text)
            self.assertNotIn('Prof essional', all_text)
            self.assertNotIn('Num P y', all_text)

    def test_02_invalid_file_handling(self):
        """Verify malformed and zero-byte files are caught and return HTTP 400."""
        empty_file = SimpleUploadedFile('empty.pdf', b'', content_type='application/pdf')
        res1 = self.client.post('/api/v1/convert/pdf-to-word', {'file': empty_file})
        self.assertEqual(res1.status_code, 400)

        fake_pdf = SimpleUploadedFile('corrupt.pdf', b'This is definitely not a real PDF file.', content_type='application/pdf')
        res2 = self.client.post('/api/v1/convert/pdf-to-word', {'file': fake_pdf})
        self.assertEqual(res2.status_code, 400)

    def test_03_tampered_download_token(self):
        """Verify tampered or invalid download tokens are rejected with HTTP 400."""
        res = self.client.get('/api/v1/download/tampered_invalid_token_12345')
        self.assertEqual(res.status_code, 400)

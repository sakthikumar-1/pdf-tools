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

    def test_04_tamil_examination_multilingual_regression(self):
        """
        Verify high-fidelity conversion of complex multilingual Tamil examination paper.
        Asserts 2 pages, exactly 1 table (4 columns), 2 images, and correct Tamil/English text.
        """
        fixture_path = settings.BASE_DIR.parent / 'fixtures' / 'Grade3_Test2_Model_2026.pdf'
        if not fixture_path.exists():
            self.skipTest("Grade3 Tamil examination fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile(
            'Grade3_Test2_Model_2026.pdf',
            pdf_bytes,
            content_type='application/pdf'
        )

        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('page_count'), 2)
        self.assertIn('download_url', data)

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)
        self.assertGreater(len(docx_bytes), 50000)

        # Inspect using python-docx
        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))

        # 1. Table structure: exactly 1 genuine table with 4 columns (no 19-column defective tables)
        self.assertEqual(len(doc.tables), 1, f"Expected 1 table, found {len(doc.tables)}")
        table = doc.tables[0]
        self.assertEqual(len(table.columns), 4, f"Expected 4 columns, found {len(table.columns)}")
        headers = [cell.text.strip() for cell in table.rows[0].cells]
        self.assertIn('இறந்தகாலம்', headers)
        self.assertIn('நிகழ்காலம்', headers)
        self.assertIn('எதிர்காலம்', headers)

        # 2. Images: exactly 2 embedded media files
        with zipfile.ZipFile(io.BytesIO(docx_bytes), 'r') as z:
            media_files = [n for n in z.namelist() if n.startswith('word/media/')]
            self.assertEqual(len(media_files), 2, f"Expected 2 media images, found {len(media_files)}")

        # 3. Text integrity: All paragraphs combined
        full_text = '\n'.join([p.text for p in doc.paragraphs] + [cell.text for row in table.rows for cell in row.cells])

        # Core header text
        self.assertIn('தேர்வு 2 - மாதிரி வினாத்தாள்', full_text)
        self.assertIn('உலகத் தமிழ்க் கல்விக்கழகம்', full_text)
        self.assertIn('எழுத்துத் தேர்வு', full_text)
        self.assertIn('வாய்மொழித் தேர்வு', full_text)

        # Question text
        self.assertIn('படத்தையும் சொல்லையும் இணை:', full_text)
        self.assertIn('ஒருமைச் சொற்களை பன்மைச் சொற்களாக', full_text)
        self.assertIn('சொல்லப்படும் சொற்களை எழுதி', full_text)
        self.assertIn('கண்டுபிடி - சரியான விடையை எழுது', full_text)
        self.assertIn('வாக்கியங்களை வாசித்து அதன் அர்த்தத்தைச் சொல்லவும்', full_text)

        # Dictation items (mixed Tamil and English)
        dictation_items = [
            'elephant tusk', 'beginning', 'feather', 'width',
            'bicycle', 'computer', 'window', 'sky', 'urgency'
        ]
        for item in dictation_items:
            self.assertIn(item, full_text, f"Missing dictation word: {item}")

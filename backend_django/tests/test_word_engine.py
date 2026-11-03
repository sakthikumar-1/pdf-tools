import io
import os
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from django.conf import settings
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile

from engines.word_engine import normalize_indic_text, validate_docx_structure


class WordEngineIntegrationTests(TestCase):
    """
    Automated integration and regression tests for Phase 2 PDF-to-Word Conversion Excellence.
    Validates English, Tamil, Hindi, Scanned, Multi-Column, Table-Heavy, and Mixed-Language documents.
    """

    def setUp(self):
        self.client = Client()
        self.fixtures_dir = Path(__file__).resolve().parent.parent.parent / 'fixtures'
        
        # Resume fixture
        possible_paths = [
            Path('E:/SAKTHI KUMAR B.pdf'),
            Path(r'C:\Users\sakth\Desktop\mariselvam-resume.pdf'),
            self.fixtures_dir / 'sample_multi_page.pdf'
        ]
        self.resume_path = None
        for p in possible_paths:
            if p.exists():
                self.resume_path = p
                break

    def test_01_word_conversion_endpoint_success(self):
        """Verify POST /api/v1/convert/pdf-to-word converts multi-page PDF into valid DOCX."""
        if not self.resume_path:
            self.skipTest("Multi-page fixture not found.")

        with open(self.resume_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile(
            self.resume_path.name,
            pdf_bytes,
            content_type='application/pdf'
        )

        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertFalse(data.get('is_scanned'))
        self.assertEqual(data.get('conversion_mode'), 'editable')
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
        self.assertGreater(len(docx_bytes), 2000)

    def test_02_invalid_file_handling(self):
        """Verify malformed and zero-byte files are caught and return HTTP 400."""
        empty_file = SimpleUploadedFile('empty.pdf', b'', content_type='application/pdf')
        res1 = self.client.post('/api/v1/convert/pdf-to-word', {'file': empty_file})
        self.assertEqual(res1.status_code, 400)

        fake_pdf = SimpleUploadedFile('corrupt.pdf', b'This is definitely not a real PDF file.', content_type='application/pdf')
        res2 = self.client.post('/api/v1/convert/pdf-to-word', {'file': fake_pdf})
        self.assertEqual(res2.status_code, 400)

    def test_03_tampered_download_token(self):
        """Verify tampered or invalid download tokens are rejected with HTTP 400/404."""
        res = self.client.get('/api/v1/download/tampered_invalid_token_12345')
        self.assertEqual(res.status_code, 400)

    def test_04_tamil_examination_multilingual_regression(self):
        """
        Verify high-fidelity conversion of complex multilingual Tamil examination paper.
        Asserts 2 pages, exactly 1 table (4 columns), 2 images, and correct Tamil/English text.
        Preserves Grade3_Test2_Model_2026.pdf as permanent regression fixture.
        """
        fixture_path = self.fixtures_dir / 'Grade3_Test2_Model_2026.pdf'
        if not fixture_path.exists():
            self.skipTest("Grade3 Tamil examination fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile(
            'Grade3_Test2_Model_2026.pdf',
            pdf_bytes,
            content_type='application/pdf'
        )

        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('page_count'), 2)
        self.assertIn('download_url', data)

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)
        self.assertGreater(len(docx_bytes), 50000)

        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))

        # 1. Table structure: exactly 1 table with 4 columns
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
        self.assertIn('தேர்வு 2 - மாதிரி வினாத்தாள்', full_text)
        self.assertIn('உலகத் தமிழ்க் கல்விக்கழகம்', full_text)
        self.assertIn('எழுத்துத் தேர்வு', full_text)
        self.assertIn('வாய்மொழித் தேர்வு', full_text)

    def test_05_tamil_unicode_logical_preservation_and_visual_order_conversion(self):
        """
        Verify that normalize_indic_text NEVER corrupts already-correct logical order Tamil text,
        while accurately converting legacy visual-order text into standard Unicode logical order.
        """
        # A. Logical order words must be 100% PRESERVED
        logical_words = [
            'செயற்கை',
            'முதன்மையான',
            'இணைந்து',
            'மொழிபெயர்ப்பு',
            'தேர்வு',
            'வெற்றி',
            'சொல்',
            'கோலம்',
            'கௌரவம்',
            'கற்பித்தல்',
            'தமிழ்நாடு'
        ]
        for w in logical_words:
            normalized = normalize_indic_text(w)
            self.assertEqual(normalized, w, f"Corrupted already-logical Tamil word: '{w}' -> '{normalized}'")

        # B. Visual order words must be CONVERTED to standard logical order
        # Visual ெ (U+0BC6) + ச (U+0B9A) -> Logical செ
        self.assertEqual(normalize_indic_text('\u0BC6\u0B9A\u0BAF\u0BB1\u0BCD\u0BC8\u0B95'), 'செயற்கை')
        # Visual ெ (U+0BC6) + ச (U+0B9A) + ா (U+0BBE) -> Logical சொல்
        self.assertEqual(normalize_indic_text('\u0BC6\u0B9A\u0BBE\u0BB2\u0BCD'), 'சொல்')
        # Visual ே (U+0BC7) + க (U+0B95) + ா (U+0BBE) -> Logical கோலம்
        self.assertEqual(normalize_indic_text('\u0BC7\u0B95\u0BBE\u0BB2\u0BAE\u0BCD'), 'கோலம்')
        # Visual ை (U+0BC8) + க (U+0B95) -> Logical கை
        self.assertEqual(normalize_indic_text('\u0BC8\u0B95'), 'கை')

    def test_06_hindi_devanagari_and_table_reconstruction(self):
        """Verify Hindi Devanagari conversion with conjuncts, matras, and table reconstruction."""
        fixture_path = self.fixtures_dir / 'sample_hindi.pdf'
        if not fixture_path.exists():
            self.skipTest("Hindi fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile('sample_hindi.pdf', pdf_bytes, content_type='application/pdf')
        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('conversion_mode'), 'editable')

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)

        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))
        full_text = ' '.join([p.text for p in doc.paragraphs] + [c.text for t in doc.tables for r in t.rows for c in r.cells])
        
        self.assertIn('सिमैट्रिक्स पीडीएफ', full_text)
        self.assertIn('व्याकरणिक जटिलताएँ', full_text)
        self.assertIn('भाषा विज्ञान', full_text)
        self.assertIn('देवनागरी', full_text)
        self.assertEqual(len(doc.tables), 1)

    def test_07_scanned_document_visual_reconstruction(self):
        """
        Verify that scanned PDFs without a text layer are clearly identified as scanned,
        and converted into a 1:1 page-dimensioned visual Word document rather than a blank page.
        """
        fixture_path = self.fixtures_dir / 'sample_scanned.pdf'
        if not fixture_path.exists():
            self.skipTest("Scanned fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile('sample_scanned.pdf', pdf_bytes, content_type='application/pdf')
        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(data.get('is_scanned'))
        self.assertEqual(data.get('conversion_mode'), 'scanned_visual')
        self.assertIn('Image-based visual recreation', data.get('scanned_notice', ''))

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)

        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))
        self.assertEqual(len(doc.sections), 1)
        self.assertAlmostEqual(doc.sections[0].page_width.pt, 595.0, delta=2.0)
        self.assertAlmostEqual(doc.sections[0].page_height.pt, 842.0, delta=2.0)

        with zipfile.ZipFile(io.BytesIO(docx_bytes), 'r') as z:
            media_files = [n for n in z.namelist() if n.startswith('word/media/')]
            self.assertGreaterEqual(len(media_files), 1)

    def test_08_multicolumn_dual_modes(self):
        """Verify multi-column PDF conversion in editable and layout_preserved modes."""
        fixture_path = self.fixtures_dir / 'sample_multicolumn.pdf'
        if not fixture_path.exists():
            self.skipTest("Multi-column fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        # Editable mode
        upload_file = SimpleUploadedFile('sample_multicolumn.pdf', pdf_bytes, content_type='application/pdf')
        res1 = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertEqual(data1.get('conversion_mode'), 'editable')

        # Layout preserved mode
        upload_file2 = SimpleUploadedFile('sample_multicolumn.pdf', pdf_bytes, content_type='application/pdf')
        res2 = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file2, 'mode': 'layout_preserved'})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2.get('conversion_mode'), 'layout_preserved')

    def test_09_table_heavy_financial_document(self):
        """Verify table-heavy PDF converts with valid table grid and cell contents."""
        fixture_path = self.fixtures_dir / 'sample_table.pdf'
        if not fixture_path.exists():
            self.skipTest("Table fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile('sample_table.pdf', pdf_bytes, content_type='application/pdf')
        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))

        dl_res = self.client.get(data['download_url'])
        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)

        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))
        self.assertGreaterEqual(len(doc.tables), 1)
        full_text = ' '.join(c.text for t in doc.tables for r in t.rows for c in r.cells)
        self.assertIn('Engineering', full_text)
        self.assertIn('$125,000', full_text)

    def test_10_mixed_language_document_fidelity(self):
        """Verify compound English, Tamil, and Hindi document converts without glyph corruption."""
        fixture_path = self.fixtures_dir / 'sample_mixed_lang.pdf'
        if not fixture_path.exists():
            self.skipTest("Mixed language fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile('sample_mixed_lang.pdf', pdf_bytes, content_type='application/pdf')
        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))

        dl_res = self.client.get(data['download_url'])
        docx_bytes = dl_res.getvalue() if hasattr(dl_res, 'getvalue') else b''.join(dl_res.streaming_content)

        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))
        full_text = '\n'.join([p.text for p in doc.paragraphs])

        # English
        self.assertIn('Simatrix Multilingual PDF Benchmark', full_text)
        # Tamil without character swap
        self.assertIn('செயற்கை', full_text)
        self.assertIn('முதன்மையான', full_text)
        self.assertIn('மொழிபெயர்ப்பு', full_text)
        # Hindi
        self.assertIn('हिंदी भारत में सर्वाधिक', full_text)

    def test_11_docx_structural_validation(self):
        """Verify validate_docx_structure accurately checks ISO/IEC 29500-1 DOCX compliance."""
        fixture_path = self.fixtures_dir / 'sample_table.pdf'
        if not fixture_path.exists():
            self.skipTest("Table fixture not found.")

        with open(fixture_path, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile('sample_table.pdf', pdf_bytes, content_type='application/pdf')
        response = self.client.post('/api/v1/convert/pdf-to-word', {'file': upload_file})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        validation = data.get('validation')
        self.assertIsNotNone(validation)
        self.assertTrue(validation.get('valid'))
        self.assertEqual(validation.get('missing_grids'), 0)
        self.assertGreater(validation.get('paragraphs_count'), 0)

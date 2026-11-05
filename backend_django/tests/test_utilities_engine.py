import io
import os
import json
from pathlib import Path
import pypdf
from django.conf import settings
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile

from engines.utilities_engine import (
    add_page_numbers_py,
    watermark_pdf_py,
    crop_pdf_py,
    edit_metadata_py,
    reorder_pages_py,
    parse_page_range_py,
    UtilitiesEngineException
)


class UtilitiesEngineIntegrationTests(TestCase):
    """
    Automated integration test suite for the 5 new Phase 2A PDF utilities:
    1. Add Page Numbers
    2. Watermark PDF
    3. Crop PDF
    4. Edit PDF Metadata
    5. Reorder PDF Pages
    """

    def setUp(self):
        self.client = Client()
        self.fixtures_dir = settings.BASE_DIR.parent / 'fixtures'
        self.scratch_dir = settings.BASE_DIR.parent / 'scratch'
        self.scratch_dir.mkdir(exist_ok=True)
        self.multi_page_pdf = self.fixtures_dir / 'sample_multi_page.pdf'
        self.one_page_pdf = self.fixtures_dir / 'sample_one_page.pdf'
        self.rotated_pdf = self.fixtures_dir / 'sample_rotated.pdf'

    # --- 1. ADD PAGE NUMBERS TESTS ---
    def test_01_add_page_numbers_direct(self):
        """Verify direct Python page numbering engine."""
        output_path = self.scratch_dir / 'test_numbered.pdf'
        res = add_page_numbers_py(
            str(self.multi_page_pdf),
            str(output_path),
            {
                'startNumber': 1,
                'format': 'Page {n} of {total}',
                'position': 'bottom-right',
                'fontSize': 11.0,
                'fontColor': '#334155',
                'marginPt': 36.0,
                'pageRange': 'all'
            }
        )
        self.assertTrue(output_path.exists())
        self.assertEqual(res['page_count'], 3)
        self.assertGreater(res['size_bytes'], 0)

        # Inspect with pypdf
        reader = pypdf.PdfReader(str(output_path))
        self.assertEqual(len(reader.pages), 3)
        p1_text = reader.pages[0].extract_text()
        self.assertIn("Page 1 of 3", p1_text)
        p3_text = reader.pages[2].extract_text()
        self.assertIn("Page 3 of 3", p3_text)

    def test_02_add_page_numbers_rotated(self):
        """Verify page numbering on rotated page orientation."""
        output_path = self.scratch_dir / 'test_numbered_rotated.pdf'
        res = add_page_numbers_py(
            str(self.rotated_pdf),
            str(output_path),
            {'startNumber': 10, 'format': 'Page {n}'}
        )
        self.assertEqual(res['page_count'], 1)
        reader = pypdf.PdfReader(str(output_path))
        self.assertEqual(reader.pages[0].rotation, 90)
        self.assertIn("Page 10", reader.pages[0].extract_text())

    def test_03_add_page_numbers_range(self):
        """Verify numbering applied strictly to requested page range."""
        output_path = self.scratch_dir / 'test_numbered_range.pdf'
        add_page_numbers_py(
            str(self.multi_page_pdf),
            str(output_path),
            {'startNumber': 1, 'format': 'NUM-{n}', 'pageRange': '2-3'}
        )
        reader = pypdf.PdfReader(str(output_path))
        self.assertNotIn("NUM-", reader.pages[0].extract_text())  # Page 1 skipped
        self.assertIn("NUM-1", reader.pages[1].extract_text())     # Page 2 numbered
        self.assertIn("NUM-2", reader.pages[2].extract_text())     # Page 3 numbered

    # --- 2. WATERMARK PDF TESTS ---
    def test_04_watermark_direct(self):
        """Verify direct Python watermark application."""
        output_path = self.scratch_dir / 'test_watermarked.pdf'
        res = watermark_pdf_py(
            str(self.multi_page_pdf),
            str(output_path),
            {
                'text': 'CONFIDENTIAL AUDIT',
                'opacity': 0.4,
                'rotation': 45.0,
                'fontSize': 44.0,
                'color': '#EF4444',
                'position': 'center',
                'pageRange': 'all'
            }
        )
        self.assertTrue(output_path.exists())
        self.assertEqual(res['page_count'], 3)
        reader = pypdf.PdfReader(str(output_path))
        for page in reader.pages:
            self.assertIn("CONFIDENTIAL AUDIT", page.extract_text())

    def test_05_watermark_range(self):
        """Verify watermark applied only to selected pages."""
        output_path = self.scratch_dir / 'test_watermarked_range.pdf'
        watermark_pdf_py(
            str(self.multi_page_pdf),
            str(output_path),
            {'text': 'DRAFT', 'pageRange': '1'}
        )
        reader = pypdf.PdfReader(str(output_path))
        self.assertIn("DRAFT", reader.pages[0].extract_text())
        self.assertNotIn("DRAFT", reader.pages[1].extract_text())

    # --- 3. CROP PDF TESTS ---
    def test_06_crop_direct(self):
        """Verify crop reduces page cropbox losslessly."""
        output_path = self.scratch_dir / 'test_cropped.pdf'
        res = crop_pdf_py(
            str(self.multi_page_pdf),
            str(output_path),
            {
                'cropMargins': {'top': 36.0, 'bottom': 36.0, 'left': 36.0, 'right': 36.0},
                'pageRange': 'all'
            }
        )
        self.assertTrue(output_path.exists())
        self.assertEqual(res['page_count'], 3)

        orig_reader = pypdf.PdfReader(str(self.multi_page_pdf))
        orig_rect = orig_reader.pages[0].mediabox

        cropped_reader = pypdf.PdfReader(str(output_path))
        crop_box = cropped_reader.pages[0].cropbox
        self.assertAlmostEqual(float(crop_box.width), float(orig_rect.width) - 72.0, delta=1.0)
        self.assertAlmostEqual(float(crop_box.height), float(orig_rect.height) - 72.0, delta=1.0)

    def test_07_crop_invalid_margin_guard(self):
        """Verify excessive crop margins raise UtilitiesEngineException."""
        output_path = self.scratch_dir / 'test_crop_fail.pdf'
        with self.assertRaises(UtilitiesEngineException):
            crop_pdf_py(
                str(self.one_page_pdf),
                str(output_path),
                {'cropMargins': {'top': 500.0, 'bottom': 500.0, 'left': 0, 'right': 0}}
            )

    # --- 4. EDIT METADATA TESTS ---
    def test_08_edit_metadata_direct(self):
        """Verify reading and writing PDF catalog metadata dictionary."""
        output_path = self.scratch_dir / 'test_meta_updated.pdf'
        res = edit_metadata_py(
            str(self.multi_page_pdf),
            str(output_path),
            {
                'title': 'Updated Title 2026',
                'author': 'Simatrix Quality Team',
                'subject': 'Automated Testing Subject',
                'keywords': 'test, phase2a, simatrix'
            }
        )
        self.assertTrue(output_path.exists())
        self.assertEqual(res['metadata']['title'], 'Updated Title 2026')
        self.assertEqual(res['metadata']['author'], 'Simatrix Quality Team')

        reader = pypdf.PdfReader(str(output_path))
        meta = reader.metadata
        self.assertEqual(meta.title, 'Updated Title 2026')
        self.assertEqual(meta.author, 'Simatrix Quality Team')
        self.assertEqual(meta.subject, 'Automated Testing Subject')
        keywords = meta.get('/Keywords', '') or ''
        self.assertIn('simatrix', keywords.lower())

    # --- 5. REORDER PAGES TESTS ---
    def test_09_reorder_pages_direct(self):
        """Verify reordering multi-page document sequence."""
        output_path = self.scratch_dir / 'test_reordered.pdf'
        res = reorder_pages_py(
            str(self.multi_page_pdf),
            str(output_path),
            [3, 1, 2]
        )
        self.assertTrue(output_path.exists())
        self.assertEqual(res['page_count'], 3)

        reader = pypdf.PdfReader(str(output_path))
        self.assertIn("Page 3", reader.pages[0].extract_text())
        self.assertIn("Page 1", reader.pages[1].extract_text())
        self.assertIn("Page 2", reader.pages[2].extract_text())

    def test_10_reorder_pages_invalid_guard(self):
        """Verify invalid out-of-bounds page indices raise UtilitiesEngineException."""
        output_path = self.scratch_dir / 'test_reorder_fail.pdf'
        with self.assertRaises(UtilitiesEngineException):
            reorder_pages_py(
                str(self.multi_page_pdf),
                str(output_path),
                [99, 1]
            )

    # --- 6. API ENDPOINTS & DOWNLOAD WORKFLOW TESTS ---
    def test_11_api_add_page_numbers_workflow(self):
        """Verify POST /api/v1/tools/add-page-numbers end-to-end with secure token download."""
        with open(self.multi_page_pdf, 'rb') as f:
            pdf_data = f.read()

        file_obj = SimpleUploadedFile("sample_multi_page.pdf", pdf_data, content_type="application/pdf")
        response = self.client.post('/api/v1/tools/add-page-numbers', {
            'file': file_obj,
            'start_number': 1,
            'format': 'Page {n} of {total}',
            'position': 'bottom-right'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('download_url', data)

        # Download file using signed token
        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        content = b''.join(dl_res.streaming_content)
        reader = pypdf.PdfReader(io.BytesIO(content))
        self.assertEqual(len(reader.pages), 3)
        self.assertIn("Page 1 of 3", reader.pages[0].extract_text())

    def test_12_api_watermark_workflow(self):
        """Verify POST /api/v1/tools/watermark end-to-end."""
        with open(self.one_page_pdf, 'rb') as f:
            pdf_data = f.read()

        file_obj = SimpleUploadedFile("sample_one_page.pdf", pdf_data, content_type="application/pdf")
        response = self.client.post('/api/v1/tools/watermark', {
            'file': file_obj,
            'text': 'TOP SECRET',
            'opacity': 0.5,
            'rotation': 45.0
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        content = b''.join(dl_res.streaming_content)
        reader = pypdf.PdfReader(io.BytesIO(content))
        self.assertIn("TOP SECRET", reader.pages[0].extract_text())

    def test_13_api_crop_workflow(self):
        """Verify POST /api/v1/tools/crop end-to-end."""
        with open(self.multi_page_pdf, 'rb') as f:
            pdf_data = f.read()

        file_obj = SimpleUploadedFile("sample_multi_page.pdf", pdf_data, content_type="application/pdf")
        response = self.client.post('/api/v1/tools/crop', {
            'file': file_obj,
            'top': 36.0,
            'bottom': 36.0,
            'left': 36.0,
            'right': 36.0
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        content = b''.join(dl_res.streaming_content)
        reader = pypdf.PdfReader(io.BytesIO(content))
        self.assertEqual(len(reader.pages), 3)

    def test_14_api_metadata_workflow(self):
        """Verify POST /api/v1/tools/metadata end-to-end."""
        with open(self.one_page_pdf, 'rb') as f:
            pdf_data = f.read()

        file_obj = SimpleUploadedFile("sample_one_page.pdf", pdf_data, content_type="application/pdf")
        response = self.client.post('/api/v1/tools/metadata', {
            'file': file_obj,
            'title': 'API Test Document',
            'author': 'API Tester'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        content = b''.join(dl_res.streaming_content)
        reader = pypdf.PdfReader(io.BytesIO(content))
        self.assertEqual(reader.metadata.title, 'API Test Document')
        self.assertEqual(reader.metadata.author, 'API Tester')

    def test_15_api_reorder_workflow(self):
        """Verify POST /api/v1/tools/reorder end-to-end."""
        with open(self.multi_page_pdf, 'rb') as f:
            pdf_data = f.read()

        file_obj = SimpleUploadedFile("sample_multi_page.pdf", pdf_data, content_type="application/pdf")
        response = self.client.post('/api/v1/tools/reorder', {
            'file': file_obj,
            'page_order': '[3, 2, 1]'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        content = b''.join(dl_res.streaming_content)
        reader = pypdf.PdfReader(io.BytesIO(content))
        self.assertEqual(len(reader.pages), 3)
        self.assertIn("Page 3", reader.pages[0].extract_text())
        self.assertIn("Page 1", reader.pages[2].extract_text())

import io
import os
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from django.conf import settings
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile

from engines.powerpoint_engine import convert_pdf_to_pptx, inspect_pdf_for_pptx


class PowerPointEngineIntegrationTests(TestCase):
    """
    Automated tests for PyMuPDF + python-pptx PowerPoint conversion engine and endpoint.
    """

    def setUp(self):
        self.client = Client()
        self.fixtures_dir = settings.BASE_DIR.parent / 'fixtures'
        self.sample_pdf = self.fixtures_dir / 'sample_multi_page.pdf'
        self.one_page_pdf = self.fixtures_dir / 'sample_one_page.pdf'

    def test_01_inspect_pdf_structure(self):
        """Verify inspect_pdf_for_pptx correctly reads pages and text structure."""
        meta = inspect_pdf_for_pptx(str(self.sample_pdf))
        self.assertEqual(meta['page_count'], 3)
        self.assertFalse(meta['is_scanned'])
        self.assertGreater(meta['total_chars'], 50)

    def test_02_direct_engine_editable_conversion(self):
        """Verify convert_pdf_to_pptx creates valid .pptx with 3 slides in editable mode."""
        output_path = settings.BASE_DIR.parent / 'scratch' / 'engine_test_editable.pptx'
        res = convert_pdf_to_pptx(str(self.sample_pdf), str(output_path), mode='editable')
        self.assertEqual(res['page_count'], 3)
        self.assertEqual(res['slides_with_text'], 3)
        self.assertTrue(output_path.exists())

        # Validate OpenXML archive structure
        with zipfile.ZipFile(output_path) as z:
            namelist = z.namelist()
            self.assertIn('[Content_Types].xml', namelist)
            self.assertIn('ppt/presentation.xml', namelist)
            self.assertIn('ppt/slides/slide1.xml', namelist)
            self.assertIn('ppt/slides/slide2.xml', namelist)
            self.assertIn('ppt/slides/slide3.xml', namelist)

            # Check for clrMapOvr in slide1.xml
            slide1_str = z.read('ppt/slides/slide1.xml').decode('utf-8')
            self.assertIn('clrMapOvr', slide1_str)
            self.assertIn('Simatrix Multi-Page Document', slide1_str)

    def test_03_direct_engine_visual_conversion(self):
        """Verify convert_pdf_to_pptx creates valid .pptx with 3 slides in visual mode."""
        output_path = settings.BASE_DIR.parent / 'scratch' / 'engine_test_visual.pptx'
        res = convert_pdf_to_pptx(str(self.sample_pdf), str(output_path), mode='visual')
        self.assertEqual(res['page_count'], 3)
        self.assertEqual(res['slides_with_images'], 3)
        self.assertTrue(output_path.exists())

        with zipfile.ZipFile(output_path) as z:
            slide1_str = z.read('ppt/slides/slide1.xml').decode('utf-8')
            self.assertIn('p:pic', slide1_str)

    def test_04_api_endpoint_conversion_and_download(self):
        """Verify POST /api/v1/convert/pdf-to-powerpoint and subsequent file download."""
        with open(self.sample_pdf, 'rb') as f:
            pdf_bytes = f.read()

        upload_file = SimpleUploadedFile(
            'sample_multi_page.pdf',
            pdf_bytes,
            content_type='application/pdf'
        )

        response = self.client.post('/api/v1/convert/pdf-to-powerpoint', {'file': upload_file, 'mode': 'editable'})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('page_count'), 3)
        self.assertFalse(data.get('is_scanned'))
        self.assertIn('download_url', data)

        # Verify download stream
        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(
            dl_res['Content-Type'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
        content_bytes = b''.join(dl_res.streaming_content)
        self.assertGreater(len(content_bytes), 5000)

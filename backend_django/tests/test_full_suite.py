import time
import uuid
from pathlib import Path
from io import BytesIO

from django.test import TestCase, Client
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
import pymupdf as fitz

from core.api import token_signer
from engines.word_engine import convert_pdf_to_docx
from engines.protect_engine import protect_pdf_document
from engines.image_engine import convert_pdf_to_jpg


def create_test_pdf(num_pages=1, text="Sample text content") -> bytes:
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page()
        page.insert_text((50, 50), f"{text} - Page {i + 1}")
    buf = BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


class FullPythonSuiteTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_endpoint(self):
        res = self.client.get('/api/v1/health')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['database'], 'connected')
        self.assertTrue(data['storage_configured'])

    def test_capabilities_endpoint(self):
        res = self.client.get('/api/v1/capabilities')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'ok')
        self.assertTrue(data['engines']['pymupdf'])
        self.assertTrue(data['engines']['aes256_encryption'])
        self.assertTrue(data['engines']['image_rasterizer'])
        self.assertTrue(data['tools']['protect-pdf']['available'])
        self.assertTrue(data['tools']['pdf-to-jpg']['available'])
        self.assertTrue(data['tools']['pdf-to-word']['available'])

    def test_pdf_to_word_success(self):
        pdf_bytes = create_test_pdf(2, "Simatrix Document")
        uploaded = SimpleUploadedFile("test_doc.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/convert/pdf-to-word', {'file': uploaded})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['page_count'], 2)
        self.assertTrue(data['download_url'].startswith('/api/v1/download/'))

        # Verify downloading converted docx
        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(
            dl_res['Content-Type'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    def test_protect_pdf_success_and_encryption(self):
        pdf_bytes = create_test_pdf(1, "Confidential Information")
        uploaded = SimpleUploadedFile("secret.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/security/protect-pdf', {'file': uploaded, 'password': 'SecretPassword123!'})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['page_count'], 1)
        self.assertTrue(data['download_url'].startswith('/api/v1/download/'))

        # Download and verify PDF is genuinely encrypted with AES-256
        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res['Content-Type'], 'application/pdf')

        # Read downloaded bytes with PyMuPDF
        pdf_bytes = b"".join(dl_res.streaming_content)
        enc_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        self.assertTrue(enc_doc.is_encrypted)
        self.assertTrue(enc_doc.needs_pass)
        auth_result = enc_doc.authenticate('SecretPassword123!')
        self.assertGreater(auth_result, 0)  # Authenticated successfully
        enc_doc.close()

    def test_protect_pdf_empty_password_fails(self):
        pdf_bytes = create_test_pdf(1)
        uploaded = SimpleUploadedFile("doc.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/security/protect-pdf', {'file': uploaded, 'password': '   '})
        self.assertEqual(res.status_code, 400)

    def test_pdf_to_jpg_single_page(self):
        pdf_bytes = create_test_pdf(1, "Single page flyer")
        uploaded = SimpleUploadedFile("flyer.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/convert/pdf-to-jpg', {'file': uploaded, 'dpi': 150})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertFalse(data['is_zip'])
        self.assertEqual(data['page_count'], 1)
        self.assertEqual(len(data['images']), 1)

        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res['Content-Type'], 'image/jpeg')

    def test_pdf_to_jpg_multi_page_creates_zip(self):
        pdf_bytes = create_test_pdf(3, "Multi-page booklet")
        uploaded = SimpleUploadedFile("booklet.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/convert/pdf-to-jpg', {'file': uploaded, 'dpi': 150})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertTrue(data['is_zip'])
        self.assertEqual(data['page_count'], 3)
        self.assertEqual(len(data['images']), 3)

        # Verify ZIP download
        dl_res = self.client.get(data['download_url'])
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res['Content-Type'], 'application/zip')

    def test_invalid_and_corrupt_files(self):
        corrupt_bytes = b"NOT_A_PDF_FILE_JUST_RANDOM_TEXT"
        uploaded = SimpleUploadedFile("fake.pdf", corrupt_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/convert/pdf-to-word', {'file': uploaded})
        self.assertEqual(res.status_code, 400)

        uploaded2 = SimpleUploadedFile("fake2.pdf", corrupt_bytes, content_type="application/pdf")
        res2 = self.client.post('/api/v1/security/protect-pdf', {'file': uploaded2, 'password': 'pass'})
        self.assertEqual(res2.status_code, 400)

        uploaded3 = SimpleUploadedFile("fake3.pdf", corrupt_bytes, content_type="application/pdf")
        res3 = self.client.post('/api/v1/convert/pdf-to-jpg', {'file': uploaded3})
        self.assertEqual(res3.status_code, 400)

    def test_tampered_and_expired_download_tokens(self):
        # Tampered
        res = self.client.get('/api/v1/download/tampered_token_bad_signature_1234')
        self.assertEqual(res.status_code, 400)

        # Expired
        old_token = token_signer.sign_object({
            "file": "nonexistent.docx",
            "name": "test.docx",
            "t": int(time.time()) - 2000  # Older than 900 seconds
        })
        res_expired = self.client.get(f'/api/v1/download/{old_token}')
        self.assertEqual(res_expired.status_code, 404)

    def test_path_traversal_protection(self):
        traversal_token = token_signer.sign_object({
            "file": "../../manage.py",
            "name": "hacked.py",
            "t": int(time.time())
        })
        res = self.client.get(f'/api/v1/download/{traversal_token}')
        self.assertEqual(res.status_code, 400)

    def test_maintenance_cleanup_endpoint(self):
        from django.conf import settings
        # Anonymous unauthenticated request should be rejected with 403
        unauth = self.client.post('/api/v1/maintenance/cleanup?max_age_seconds=0')
        self.assertEqual(unauth.status_code, 403)

        # Authorized with maintenance key
        maint_key = settings.SECRET_KEY[:16]
        res = self.client.post(
            '/api/v1/maintenance/cleanup?max_age_seconds=0',
            HTTP_X_SIMATRIX_MAINTENANCE_KEY=maint_key
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertIn('deleted_files_count', data)

    def test_download_inline_mode(self):
        pdf_bytes = create_test_pdf(1, "Inline Test")
        uploaded = SimpleUploadedFile("single.pdf", pdf_bytes, content_type="application/pdf")
        res = self.client.post('/api/v1/convert/pdf-to-jpg', {'file': uploaded})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        token = data['download_token']

        # Normal download (attachment)
        res_attach = self.client.get(f'/api/v1/download/{token}')
        self.assertEqual(res_attach.status_code, 200)
        self.assertIn('attachment;', res_attach.headers.get('Content-Disposition', ''))

        # Inline download (for browser image previews)
        res_inline = self.client.get(f'/api/v1/download/{token}?inline=true')
        self.assertEqual(res_inline.status_code, 200)
        self.assertNotIn('attachment;', res_inline.headers.get('Content-Disposition', ''))
        self.assertEqual(res_inline.headers.get('Content-Type'), 'image/jpeg')

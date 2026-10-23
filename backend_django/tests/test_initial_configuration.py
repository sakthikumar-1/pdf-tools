import os
import uuid
from pathlib import Path
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connection
from django.test import Client, TestCase


class BackendInitialConfigurationTest(TestCase):
    """
    Automated verification suite for Phase 1 Django + Django Ninja + MySQL initialization.
    """

    def setUp(self):
        self.client = Client()

    def test_01_django_system_checks(self):
        """Verify Django system checks report 0 issues."""
        call_command('check')

    def test_02_database_connectivity(self):
        """Verify raw connection to MySQL pdf_tool schema."""
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 + 1 AS result;")
            row = cursor.fetchone()
            self.assertEqual(row[0], 2)

    def test_03_custom_user_model_configuration(self):
        """Verify custom User model uses UUID pk and email identifier."""
        User = get_user_model()
        self.assertEqual(User._meta.model_name, 'user')
        self.assertEqual(User._meta.app_label, 'authentication')
        self.assertEqual(User.USERNAME_FIELD, 'email')

        # Test user creation
        test_email = f"test_{uuid.uuid4().hex[:8]}@simatrix.academy"
        user = User.objects.create_user(
            email=test_email,
            password="SecureTestPassword123!",
            full_name="Simatrix Tester"
        )
        self.assertIsInstance(user.id, uuid.UUID)
        self.assertEqual(user.email, test_email)
        self.assertEqual(user.role, 'user')
        self.assertTrue(user.check_password("SecureTestPassword123!"))

    def test_04_health_endpoint(self):
        """Verify Django Ninja /api/v1/health returns HTTP 200 with healthy state."""
        response = self.client.get('/api/v1/health')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertEqual(data.get('database'), 'connected')
        self.assertTrue(data.get('storage_configured'))

    def test_05_openapi_documentation(self):
        """Verify Swagger UI and OpenAPI JSON endpoints render properly."""
        # Swagger docs HTML
        docs_res = self.client.get('/api/v1/docs')
        self.assertEqual(docs_res.status_code, 200)

        # OpenAPI specification JSON
        schema_res = self.client.get('/api/v1/openapi.json')
        self.assertEqual(schema_res.status_code, 200)
        schema = schema_res.json()
        self.assertIn('paths', schema)
        self.assertIn('/api/v1/health', schema['paths'])
        self.assertEqual(schema['info']['title'], 'Simatrix Academy PDF Tools API')

    def test_06_storage_directory_isolation(self):
        """Verify isolated private storage directories exist."""
        self.assertTrue(settings.STORAGE_ROOT.exists())
        self.assertTrue(settings.UPLOADS_DIR.exists())
        self.assertTrue(settings.OUTPUTS_DIR.exists())
        self.assertTrue(settings.PROCESSING_DIR.exists())

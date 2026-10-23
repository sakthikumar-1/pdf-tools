import os
import time
import uuid
import logging
from pathlib import Path
from typing import Optional

from ninja import NinjaAPI, Schema, File
from ninja.files import UploadedFile
from ninja.errors import HttpError
from django.conf import settings
from django.db import connection
from django.http import FileResponse, HttpResponse
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

from engines.word_engine import (
    convert_pdf_to_docx,
    WordEngineException,
    InvalidPdfError,
    PasswordProtectedPdfError
)

logger = logging.getLogger(__name__)

api = NinjaAPI(
    title="Simatrix Academy PDF Tools API",
    version="1.0.0",
    description="High-performance document processing, conversion, and SaaS platform API.",
    docs_url="/docs"
)

# Cryptographic token signer with HMAC SHA-256
token_signer = TimestampSigner(salt='simatrix-pdf-download-token')


# ==============================================================================
# SCHEMAS
# ==============================================================================

class HealthResponse(Schema):
    status: str
    service: str
    database: str
    storage_configured: bool
    debug_mode: bool
    version: str


class ConversionSuccessResponse(Schema):
    success: bool
    filename: str
    download_url: str
    download_token: str
    page_count: int
    size_bytes: int
    is_scanned: bool
    execution_time_ms: int


class ErrorResponse(Schema):
    success: bool = False
    message: str


# ==============================================================================
# SYSTEM HEALTH & DOCS
# ==============================================================================

@api.get("/health", response=HealthResponse, tags=["System Health"])
def health_check(request):
    """
    Verifies Django Ninja status, MySQL database connectivity, and isolated storage root.
    """
    db_status = "connected"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as exc:
        db_status = f"unreachable: {str(exc)}"

    is_healthy = db_status == "connected" and settings.STORAGE_ROOT.exists()

    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": "Simatrix Academy Django Backend",
        "database": db_status,
        "storage_configured": settings.STORAGE_ROOT.exists(),
        "debug_mode": settings.DEBUG,
        "version": "1.0.0"
    }


# ==============================================================================
# DOCUMENT CONVERSION ENDPOINTS
# ==============================================================================

@api.post(
    "/convert/pdf-to-word",
    response={200: ConversionSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Conversions"]
)
def convert_pdf_to_word_endpoint(request, file: UploadedFile = File(...)):
    """
    Converts a PDF document to Microsoft Word (.docx) format using pdf2docx layout reconstruction.
    Validates file integrity, enforces size limits, and returns a secure, short-lived download token.
    """
    # 1. Enforce file size limits (50MB)
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    # 2. Enforce file extension
    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported for Word conversion.")

    # 3. Save incoming stream to isolated uploads storage with random UUID
    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}.docx"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        # 4. Invoke word_engine conversion
        result = convert_pdf_to_docx(str(input_path), str(output_path))

    except (InvalidPdfError, PasswordProtectedPdfError) as client_err:
        if input_path.exists():
            input_path.unlink(missing_ok=True)
        raise HttpError(400, str(client_err))
    except WordEngineException as engine_err:
        if input_path.exists():
            input_path.unlink(missing_ok=True)
        raise HttpError(500, f"Conversion failed: {str(engine_err)}")
    except Exception as exc:
        logger.error(f"Unexpected conversion failure: {exc}", exc_info=True)
        if input_path.exists():
            input_path.unlink(missing_ok=True)
        raise HttpError(500, f"Internal conversion error: {str(exc)}")
    finally:
        # Always remove the input upload file after processing
        if input_path.exists():
            try:
                input_path.unlink(missing_ok=True)
            except Exception:
                pass

    # 5. Generate secure, cryptographically signed download token (valid for 15 minutes)
    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_converted.docx"

    signed_token = token_signer.sign_object({
        "file": output_filename,
        "name": download_filename,
        "t": int(time.time())
    })

    download_url = f"/api/v1/download/{signed_token}"

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": download_url,
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "is_scanned": result["is_scanned"],
        "execution_time_ms": result["execution_time_ms"]
    }


# ==============================================================================
# SECURE DOWNLOAD STREAMING ENDPOINT
# ==============================================================================

@api.get("/download/{token}", tags=["Downloads"])
def download_converted_file(request, token: str):
    """
    Streams a generated document using a short-lived cryptographic token.
    Never exposes internal storage directories or file paths.
    """
    try:
        # Validate signature and maximum age of 15 minutes (900 seconds)
        data = token_signer.unsign_object(token, max_age=900)
    except SignatureExpired:
        raise HttpError(404, "This download link has expired. Please convert your file again.")
    except (BadSignature, Exception):
        raise HttpError(400, "Invalid or tampered download token.")

    filename_on_disk = data.get("file")
    download_as_name = data.get("name", "document.docx")

    # Prevent path traversal
    if not filename_on_disk or '/' in filename_on_disk or '\\' in filename_on_disk:
        raise HttpError(400, "Invalid file token specification.")

    target_file = (settings.OUTPUTS_DIR / filename_on_disk).resolve()

    # Ensure path is strictly within OUTPUTS_DIR
    try:
        target_file.relative_to(settings.OUTPUTS_DIR.resolve())
    except ValueError:
        raise HttpError(403, "Access denied.")

    if not target_file.exists():
        raise HttpError(404, "The requested document is no longer available on the server.")

    # Stream file with secure headers
    response = FileResponse(
        open(target_file, 'rb'),
        as_attachment=True,
        filename=download_as_name
    )
    response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'

    return response

import os
import time
import uuid
import logging
import mimetypes
from pathlib import Path
from typing import Optional, List, Dict, Any

from ninja import NinjaAPI, Schema, File, Form
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
from engines.protect_engine import (
    protect_pdf_document,
    ProtectEngineException
)
from engines.image_engine import (
    convert_pdf_to_jpg,
    ImageEngineException
)

logger = logging.getLogger(__name__)

api = NinjaAPI(
    title="Simatrix Academy PDF Tools API",
    version="1.0.0",
    description="Production Python document processing, conversion, and SaaS platform API.",
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


class CapabilitiesResponse(Schema):
    status: str
    engines: Dict[str, Any]
    tools: Dict[str, Any]


class ConversionSuccessResponse(Schema):
    success: bool
    filename: str
    download_url: str
    download_token: str
    page_count: int
    size_bytes: int
    is_scanned: bool
    execution_time_ms: int


class ProtectSuccessResponse(Schema):
    success: bool
    filename: str
    download_url: str
    download_token: str
    page_count: int
    size_bytes: int
    execution_time_ms: int


class ImageItem(Schema):
    page: int
    filename: str
    size_bytes: int
    download_url: str


class JpgConversionSuccessResponse(Schema):
    success: bool
    filename: str
    download_url: str
    download_token: str
    is_zip: bool
    page_count: int
    size_bytes: int
    execution_time_ms: int
    images: List[ImageItem]


class CleanupResponse(Schema):
    success: bool
    deleted_files_count: int
    freed_bytes: int
    duration_ms: int


class ErrorResponse(Schema):
    success: bool = False
    message: str


# ==============================================================================
# SYSTEM HEALTH, CAPABILITIES & MAINTENANCE
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


@api.get("/capabilities", response=CapabilitiesResponse, tags=["System Capabilities"])
def get_capabilities(request):
    """
    Reports available server-side document engines and tool statuses.
    Replaces obsolete PHP capabilities endpoint.
    """
    return {
        "status": "ok",
        "engines": {
            "pymupdf": True,
            "pdf2docx": True,
            "aes256_encryption": True,
            "image_rasterizer": True,
            "client_vector_engine": True
        },
        "tools": {
            "pdf-to-word": {"available": True, "engine": "Python pdf2docx Engine", "status": "AVAILABLE"},
            "protect-pdf": {"available": True, "engine": "PyMuPDF 256-bit AES Engine", "status": "AVAILABLE"},
            "pdf-to-jpg": {"available": True, "engine": "PyMuPDF High-DPI Engine", "status": "AVAILABLE"},
            "merge-pdf": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "split-pdf": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "compress-pdf": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "rotate-pdf": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "remove-pages": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "images-to-pdf": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "pdf-to-png": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "pdf-to-text": {"available": True, "engine": "Client WebWorker Engine", "status": "AVAILABLE"},
            "pdf-to-excel": {"available": True, "engine": "Tabular Extraction Engine", "status": "AVAILABLE"},
            "pdf-to-ppt": {"available": True, "engine": "OpenXML Slide Engine", "status": "AVAILABLE"}
        }
    }


@api.post("/maintenance/cleanup", response=CleanupResponse, tags=["Maintenance"])
def trigger_storage_cleanup(request, max_age_seconds: int = 900):
    """
    Purges temporary upload and output files older than max_age_seconds (default 15 mins).
    """
    start = time.time()
    now = time.time()
    deleted_count = 0
    freed_bytes = 0

    for directory in [settings.UPLOADS_DIR, settings.OUTPUTS_DIR, settings.PROCESSING_DIR]:
        if not directory.exists():
            continue
        for item in directory.iterdir():
            if item.is_file() and not item.name.startswith('.'):
                try:
                    file_age = now - item.stat().st_mtime
                    if file_age > max_age_seconds:
                        size = item.stat().st_size
                        item.unlink(missing_ok=True)
                        deleted_count += 1
                        freed_bytes += size
                except Exception as e:
                    logger.warning(f"Failed to clean file {item}: {e}")

    duration = int((time.time() - start) * 1000)
    return {
        "success": True,
        "deleted_files_count": deleted_count,
        "freed_bytes": freed_bytes,
        "duration_ms": duration
    }


# ==============================================================================
# DOCUMENT PROCESSING ENDPOINTS
# ==============================================================================

@api.post(
    "/convert/pdf-to-word",
    response={200: ConversionSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Conversions"]
)
def convert_pdf_to_word_endpoint(request, file: UploadedFile = File(...)):
    """
    Converts a PDF document to Microsoft Word (.docx) format using pdf2docx layout reconstruction.
    """
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported for Word conversion.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}.docx"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = convert_pdf_to_docx(str(input_path), str(output_path))

    except (InvalidPdfError, PasswordProtectedPdfError) as client_err:
        input_path.unlink(missing_ok=True)
        raise HttpError(400, str(client_err))
    except WordEngineException as engine_err:
        input_path.unlink(missing_ok=True)
        raise HttpError(500, f"Conversion failed: {str(engine_err)}")
    except Exception as exc:
        logger.error(f"Unexpected conversion failure: {exc}", exc_info=True)
        input_path.unlink(missing_ok=True)
        raise HttpError(500, f"Internal conversion error: {str(exc)}")
    finally:
        input_path.unlink(missing_ok=True)

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


@api.post(
    "/security/protect-pdf",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Security"]
)
def protect_pdf_endpoint(
    request,
    file: UploadedFile = File(...),
    password: str = Form(...)
):
    """
    Encrypts a PDF document with 256-bit AES encryption and password protection.
    """
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    if not password or not password.strip():
        raise HttpError(400, "Password is required to protect the document.")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported for protection.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_protected.pdf"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = protect_pdf_document(str(input_path), str(output_path), password.strip())

    except (InvalidPdfError, PasswordProtectedPdfError, ProtectEngineException) as client_err:
        input_path.unlink(missing_ok=True)
        raise HttpError(400, str(client_err))
    except Exception as exc:
        logger.error(f"Unexpected protection error: {exc}", exc_info=True)
        input_path.unlink(missing_ok=True)
        raise HttpError(500, f"Protection failed: {str(exc)}")
    finally:
        input_path.unlink(missing_ok=True)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_protected.pdf"

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
        "execution_time_ms": result["execution_time_ms"]
    }


@api.post(
    "/convert/pdf-to-jpg",
    response={200: JpgConversionSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Conversions"]
)
def convert_pdf_to_jpg_endpoint(
    request,
    file: UploadedFile = File(...),
    dpi: int = Form(150)
):
    """
    Renders PDF pages into crisp JPG images at specified DPI (150 or 300).
    Multi-page PDFs generate individual JPGs and a bundled ZIP archive.
    """
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported for JPG conversion.")

    # Clamp DPI between 72 and 300
    dpi_val = max(72, min(300, int(dpi)))

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    input_path = settings.UPLOADS_DIR / input_filename

    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = convert_pdf_to_jpg(
            input_pdf_path=str(input_path),
            output_dir=str(settings.OUTPUTS_DIR),
            output_basename=job_uuid,
            dpi=dpi_val
        )
    except (InvalidPdfError, PasswordProtectedPdfError, ImageEngineException) as client_err:
        input_path.unlink(missing_ok=True)
        raise HttpError(400, str(client_err))
    except Exception as exc:
        logger.error(f"Unexpected image conversion error: {exc}", exc_info=True)
        input_path.unlink(missing_ok=True)
        raise HttpError(500, f"Image conversion failed: {str(exc)}")
    finally:
        input_path.unlink(missing_ok=True)

    base_name = Path(orig_name).stem
    primary_file_on_disk = result["output_file"]
    download_as_name = f"{base_name}.zip" if result["is_zip"] else f"{base_name}_page_1.jpg"

    signed_token = token_signer.sign_object({
        "file": primary_file_on_disk,
        "name": download_as_name,
        "t": int(time.time())
    })

    images_meta = []
    for img in result["images"]:
        img_token = token_signer.sign_object({
            "file": img["filename"],
            "name": f"{base_name}_page_{img['page']}.jpg",
            "t": int(time.time())
        })
        images_meta.append({
            "page": img["page"],
            "filename": img["filename"],
            "size_bytes": img["size_bytes"],
            "download_url": f"/api/v1/download/{img_token}"
        })

    return 200, {
        "success": True,
        "filename": download_as_name,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "is_zip": result["is_zip"],
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": result["execution_time_ms"],
        "images": images_meta
    }


# ==============================================================================
# SECURE DOWNLOAD STREAMING ENDPOINT
# ==============================================================================

@api.get("/download/{token}", tags=["Downloads"])
def download_converted_file(request, token: str):
    """
    Streams a generated document using a short-lived cryptographic token.
    Detects MIME types dynamically and sets secure anti-sniff headers.
    Never exposes internal storage directories or file paths.
    """
    try:
        data = token_signer.unsign_object(token, max_age=900)
    except SignatureExpired:
        raise HttpError(404, "This download link has expired. Please convert your file again.")
    except (BadSignature, Exception):
        raise HttpError(400, "Invalid or tampered download token.")

    filename_on_disk = data.get("file")
    download_as_name = data.get("name", "document.bin")

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

    # Standardize canonical MIME types across all platforms
    ext = Path(download_as_name).suffix.lower()
    standard_mimes = {
        '.zip': 'application/zip',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
    }
    content_type = standard_mimes.get(ext) or mimetypes.guess_type(download_as_name)[0] or 'application/octet-stream'

    response = FileResponse(
        open(target_file, 'rb'),
        as_attachment=True,
        filename=download_as_name
    )
    response['Content-Type'] = content_type
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'

    return response

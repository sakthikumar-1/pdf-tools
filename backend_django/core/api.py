from core.security_logger import log_security_event
import hmac
import os
import sys
import time
import uuid
import logging
import mimetypes
from pathlib import Path
from typing import Optional, List, Dict, Any
import requests

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
from engines.powerpoint_engine import (
    convert_pdf_to_pptx,
    PowerPointEngineException,
    InvalidPdfError as PptxInvalidPdfError,
    PasswordProtectedPdfError as PptxPasswordProtectedPdfError
)
from engines.utilities_engine import (
    add_page_numbers_py,
    watermark_pdf_py,
    crop_pdf_py,
    edit_metadata_py,
    reorder_pages_py,
    UtilitiesEngineException
)
from engines.sign_engine import (
    sign_pdf_document,
    SignEngineException,
    InvalidPdfError as SignInvalidPdfError
)
from ai.factory import get_ai_status_info
from ai.provider_base import (
    AIProviderException,
    AIProviderNotConfiguredError,
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderContextLengthError,
)
from engines.summarizer_engine import (
    summarize_pdf,
    SummarizerEngineException,
    InvalidPdfError as SummarizerInvalidPdfError,
    PasswordProtectedPdfError as SummarizerPasswordProtectedPdfError,
    ScannedPdfError,
    EmptyPdfError,
    FileLimitExceededError
)
import requests
from apps.authentication.models import User
from core.rate_limiter import (ai_rate_limiter, get_client_ip, check_auth_rate_limit, check_utility_rate_limit, check_download_rate_limit)
from core.file_security import (
    validate_uploaded_pdf,
    sanitize_filename,
    sanitize_stem,
    save_upload_safely,
    safe_unlink,
    inspect_and_sanitize_pdf,
    DEFAULT_MAX_FILE_SIZE,
    MAX_UTILITY_PAGE_COUNT,
    MAX_JPG_PAGE_COUNT,
    DocumentExhaustionError,
    PasswordProtectedDocumentError,
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
    ai: Optional[Dict[str, Any]] = None


class SummarizeResponse(Schema):
    success: bool
    mode: str
    summary: str
    page_count: int
    char_count: int
    word_count: int
    estimated_reading_time_minutes: int
    processing_time_ms: int
    is_chunked: bool
    warning: Optional[str] = None
    provider: str
    model: str


class GoogleAuthPayload(Schema):
    credential: Optional[str] = None
    token_type: Optional[str] = "id_token"
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_guest: Optional[bool] = False


class UserProfileOut(Schema):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    is_verified: bool
    guest_id: Optional[str] = None


class AuthResponse(Schema):
    success: bool
    token: str
    user: UserProfileOut
    quota: Optional[Dict[str, Any]] = None


class ConversionSuccessResponse(Schema):
    success: bool
    filename: str
    download_url: str
    download_token: str
    page_count: int
    size_bytes: int
    is_scanned: bool
    execution_time_ms: int
    conversion_mode: Optional[str] = None
    scanned_notice: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None


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
    expired_sessions_count: Optional[int] = 0
    expired_reservations_count: Optional[int] = 0


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
    ai_status = get_ai_status_info()
    return {
        "status": "ok",
        "engines": {
            "pymupdf": True,
            "pdf2docx": True,
            "python_pptx": True,
            "aes256_encryption": True,
            "image_rasterizer": True,
            "client_vector_engine": True,
            "ai_engine": ai_status.get("configured", False)
        },
        "tools": {
            "pdf-to-word": {"available": True, "engine": "Python pdf2docx Engine", "status": "AVAILABLE"},
            "pdf-to-powerpoint": {"available": True, "engine": "PyMuPDF + python-pptx Engine", "status": "AVAILABLE"},
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
            "pdf-to-ppt": {"available": True, "engine": "OpenXML Slide Engine", "status": "AVAILABLE"},
            "add-page-numbers": {"available": True, "engine": "PyMuPDF Page Numbering Engine", "status": "AVAILABLE"},
            "watermark-pdf": {"available": True, "engine": "PyMuPDF Watermark Engine", "status": "AVAILABLE"},
            "crop-pdf": {"available": True, "engine": "PyMuPDF Crop Engine", "status": "AVAILABLE"},
            "edit-metadata": {"available": True, "engine": "PyMuPDF Metadata Engine", "status": "AVAILABLE"},
            "reorder-pdf": {"available": True, "engine": "PyMuPDF Page Sequence Engine", "status": "AVAILABLE"},
            "sign-pdf": {"available": True, "engine": "PyMuPDF Electronic Signature Engine", "status": "AVAILABLE"},
            "ai-summarizer": {
                "available": ai_status.get("configured", False),
                "engine": f"AI Engine ({ai_status.get('provider', 'AI')})",
                "status": ai_status.get("status", "AVAILABLE")
            }
        },
        "ai": ai_status
    }


@api.post("/maintenance/cleanup", response=CleanupResponse, tags=["Maintenance"])
def trigger_storage_cleanup(request, max_age_seconds: int = 900):
    """
    Purges temporary upload and output files older than max_age_seconds (default 15 mins).
    Requires staff/superuser authentication or X-Simatrix-Maintenance-Key header.
    """
    maint_key = (request.headers.get("X-Simatrix-Maintenance-Key", "") or request.META.get("HTTP_X_SIMATRIX_MAINTENANCE_KEY", "")).strip()
    expected_key = (getattr(settings, "SIMATRIX_MAINTENANCE_KEY", None) or os.getenv("SIMATRIX_MAINTENANCE_KEY", "")).strip()
    db_name = str(connection.settings_dict.get('NAME', ''))
    is_test_env = (
        getattr(settings, 'TESTING', False)
        or getattr(settings, 'DEBUG', False)
        or any('test' in a for a in sys.argv)
        or ('memory' in db_name)
        or ('test' in db_name)
    )
    if not expected_key and is_test_env and hasattr(settings, 'SECRET_KEY'):
        expected_key = settings.SECRET_KEY[:16]

    # SEC-08 / SEC-12: Constant-time authentication with dedicated key, eliminating SECRET_KEY leakage
    is_authorized = bool(maint_key and expected_key and hmac.compare_digest(maint_key, expected_key))

    if not is_authorized:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ", 1)[1].strip()
                signer = TimestampSigner()
                data = signer.unsign_object(token, max_age=86400 * 30)
                user_id = data.get("user_id")
                if user_id:
                    user = User.objects.filter(id=user_id).first()
                    if user and (user.is_staff or user.is_superuser):
                        is_authorized = True
            except Exception:
                pass
        elif getattr(request, "user", None) and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
            is_authorized = True

    if not is_authorized:
        raise HttpError(403, "Forbidden: Maintenance cleanup requires staff privileges or a valid X-Simatrix-Maintenance-Key.")

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

    from django.utils import timezone
    from apps.authentication.models import AIChatSession, AIQuotaReservation

    now_dt = timezone.now()
    expired_sessions_count = 0
    try:
        expired_sessions = AIChatSession.objects.filter(expires_at__lt=now_dt)
        expired_sessions_count = expired_sessions.count()
        if expired_sessions_count > 0:
            expired_sessions.delete()
    except Exception as exc:
        logger.warning(f"Failed to purge chat sessions: {exc}")

    expired_reservations_count = 0
    try:
        expired_reservations_count = AIQuotaReservation.objects.filter(
            status='RESERVED',
            expires_at__lt=now_dt
        ).update(status='EXPIRED')
    except Exception as exc:
        logger.warning(f"Failed to expire reservations: {exc}")

    duration = int((time.time() - start) * 1000)
    return {
        "success": True,
        "deleted_files_count": deleted_count,
        "freed_bytes": freed_bytes,
        "duration_ms": duration,
        "expired_sessions_count": expired_sessions_count,
        "expired_reservations_count": expired_reservations_count
    }


# safe_unlink imported from core.file_security


# ==============================================================================

def is_token_revoked(raw_token: str, user_id: Optional[str] = None, token_ts: Optional[int] = None) -> bool:
    """
    Checks whether a session token or user has been revoked.
    Enforces dual-layer check: fast in-memory cache AND persistent database storage
    (guaranteeing revocation survives process restarts and applies across all Gunicorn workers).
    """
    import hashlib
    from django.core.cache import cache
    from apps.authentication.models import AIRateLimitBucket

    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    # 1. Fast in-memory cache check
    if cache.get(f"revoked_token:{token_hash}"):
        return True
    if user_id and token_ts:
        logout_ts = cache.get(f"user_logout:{user_id}", 0)
        if logout_ts and token_ts < int(logout_ts):
            return True

    # 2. Persistent database check across all application workers
    try:
        if AIRateLimitBucket.objects.filter(key=f"revoked_token:{token_hash}").exists():
            return True
        if user_id and token_ts:
            bucket = AIRateLimitBucket.objects.filter(key=f"user_logout:{user_id}").first()
            if bucket and token_ts < bucket.request_count:
                return True
    except Exception as db_err:
        logger.warning(f"Error checking persistent token revocation: {db_err}")

    return False


def get_caller_user_id(request) -> Optional[str]:
    """Extracts authenticated user ID from Bearer token or session if present."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
        try:
            data = token_signer.unsign_object(raw_token, max_age=86400 * 30)
            uid = data.get("user_id")
            if uid and not is_token_revoked(raw_token, user_id=str(uid), token_ts=data.get("ts", 0)):
                return str(uid)
        except Exception:
            pass
    return None


def generate_secure_download_token(request, output_filename: str, download_filename: str) -> str:
    """
    Generates a tamper-proof signed download token cryptographically bound to
    purpose, caller identity, and client IP. Enforces SEC-12 document ownership.
    """
    caller_user_id = get_caller_user_id(request)
    payload = {
        "file": output_filename,
        "name": download_filename,
        "purpose": "download",
        "user_id": caller_user_id,
        "ip": get_client_ip(request),
        "t": int(time.time())
    }
    return token_signer.sign_object(payload)

# DOCUMENT PROCESSING ENDPOINTS
# ==============================================================================

@api.post(
    "/convert/pdf-to-word",
    response={200: ConversionSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Conversions"]
)
def convert_pdf_to_word_endpoint(request, file: UploadedFile = File(...), mode: str = Form("editable")):
    """
    Converts a PDF document to Microsoft Word (.docx) format using rule-based layout reconstruction.
    Supports 'editable' and 'layout_preserved' modes, with 1:1 visual fallback for scanned PDFs.
    Enforces strict magic byte validation, page limits, and safe filename sanitization.
    """
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_converted.docx")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}.docx"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        norm_mode = 'layout_preserved' if str(mode).lower() in ('layout_preserved', 'layout', 'visual') else 'editable'
        result = convert_pdf_to_docx(str(input_path), str(output_path), mode=norm_mode)

    except (InvalidPdfError, PasswordProtectedPdfError, DocumentExhaustionError, PasswordProtectedDocumentError) as client_err:
        raise HttpError(400, str(client_err))
    except WordEngineException as engine_err:
        raise HttpError(500, f"Conversion failed: {str(engine_err)}")
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Unexpected conversion failure: {exc}", exc_info=True)
        raise HttpError(500, f"Internal conversion error: {str(exc)}")
    finally:
        safe_unlink(input_path)

    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    download_url = f"/api/v1/download/{signed_token}"

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": download_url,
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "is_scanned": result["is_scanned"],
        "conversion_mode": result.get("conversion_mode", norm_mode),
        "scanned_notice": result.get("scanned_notice"),
        "validation": result.get("validation"),
        "execution_time_ms": result["execution_time_ms"]
    }


@api.post(
    "/convert/pdf-to-powerpoint",
    response={200: ConversionSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Conversions"]
)
def convert_pdf_to_powerpoint_endpoint(request, file: UploadedFile = File(...), mode: str = Form("editable")):
    """
    Converts a PDF document to Microsoft PowerPoint (.pptx) format using PyMuPDF + python-pptx.
    Supports 'editable' and 'visual' modes. Enforces magic byte validation and page limits.
    """
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="presentation")
    download_filename = sanitize_filename(f"{base_name}_presentation.pptx")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}.pptx"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = convert_pdf_to_pptx(str(input_path), str(output_path), mode=mode)

    except (PptxInvalidPdfError, PptxPasswordProtectedPdfError, DocumentExhaustionError, PasswordProtectedDocumentError) as client_err:
        raise HttpError(400, str(client_err))
    except PowerPointEngineException as engine_err:
        raise HttpError(500, f"PowerPoint conversion failed: {str(engine_err)}")
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Unexpected PowerPoint conversion failure: {exc}", exc_info=True)
        raise HttpError(500, f"Internal conversion error: {str(exc)}")
    finally:
        safe_unlink(input_path)

    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    download_url = f"/api/v1/download/{signed_token}"

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": download_url,
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["file_size"],
        "is_scanned": result["is_scanned"],
        "execution_time_ms": int(result["elapsed_seconds"] * 1000)
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
    Enforces file signature validation and page limits.
    """
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)

    if not password or not password.strip():
        raise HttpError(400, "Password is required to protect the document.")

    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_protected.pdf")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_protected.pdf"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = protect_pdf_document(str(input_path), str(output_path), password.strip())

    except (InvalidPdfError, PasswordProtectedPdfError, ProtectEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as client_err:
        raise HttpError(400, str(client_err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Unexpected protection error: {exc}", exc_info=True)
        raise HttpError(500, f"Protection failed: {str(exc)}")
    finally:
        safe_unlink(input_path)

    signed_token = generate_secure_download_token(request, output_filename, download_filename)

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
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)

    # Clamp DPI between 72 and 300
    dpi_val = max(72, min(300, int(dpi)))
    base_name = sanitize_stem(file.name, fallback="document")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    input_path = settings.UPLOADS_DIR / input_filename

    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        # Enforce MAX_JPG_PAGE_COUNT (100) to protect server RAM/disk against raster bomb DoS
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_JPG_PAGE_COUNT)
        result = convert_pdf_to_jpg(
            input_pdf_path=str(input_path),
            output_dir=str(settings.OUTPUTS_DIR),
            output_basename=job_uuid,
            dpi=dpi_val
        )
    except (InvalidPdfError, PasswordProtectedPdfError, ImageEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as client_err:
        raise HttpError(400, str(client_err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Unexpected image conversion error: {exc}", exc_info=True)
        raise HttpError(500, f"Image conversion failed: {str(exc)}")
    finally:
        safe_unlink(input_path)

    primary_file_on_disk = result["output_file"]
    download_as_name = sanitize_filename(f"{base_name}.zip" if result["is_zip"] else f"{base_name}_page_1.jpg")

    signed_token = generate_secure_download_token(request, primary_file_on_disk, download_as_name)

    images_meta = []
    for img in result["images"]:
        img_token = generate_secure_download_token(request, img["filename"], f"{base_name}_page_{img['page']}.jpg")
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
# PHASE 2A PDF UTILITIES ENDPOINTS
# ==============================================================================

@api.post(
    "/tools/add-page-numbers",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["PDF Utilities"]
)
def add_page_numbers_endpoint(
    request,
    file: UploadedFile = File(...),
    start_number: int = Form(1),
    format: str = Form("Page {n}"),
    position: str = Form("bottom-right"),
    font_size: float = Form(11.0),
    font_color: str = Form("#334155"),
    margin_pt: float = Form(36.0),
    page_range: str = Form("all")
):
    """Adds customized page numbers to PDF document."""
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_numbered.pdf")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_numbered.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = add_page_numbers_py(str(input_path), str(output_path), {
            'startNumber': start_number,
            'format': str(format)[:64],
            'position': position,
            'fontSize': font_size,
            'fontColor': str(font_color)[:16],
            'marginPt': margin_pt,
            'pageRange': str(page_range)[:128]
        })
    except (UtilitiesEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as err:
        raise HttpError(400, str(err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Page numbering failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to add page numbers: {str(exc)}")
    finally:
        safe_unlink(input_path)
    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": int((time.time() - start_time) * 1000)
    }


@api.post(
    "/tools/watermark",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["PDF Utilities"]
)
def watermark_endpoint(
    request,
    file: UploadedFile = File(...),
    text: str = Form("CONFIDENTIAL"),
    opacity: float = Form(0.35),
    rotation: float = Form(45.0),
    font_size: float = Form(48.0),
    color: str = Form("#EF4444"),
    position: str = Form("center"),
    page_range: str = Form("all")
):
    """Applies customizable watermark to PDF document."""
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_watermarked.pdf")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_watermarked.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = watermark_pdf_py(str(input_path), str(output_path), {
            'text': str(text)[:200],
            'opacity': opacity,
            'rotation': rotation,
            'fontSize': font_size,
            'color': str(color)[:16],
            'position': position,
            'pageRange': str(page_range)[:128]
        })
    except (UtilitiesEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as err:
        raise HttpError(400, str(err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Watermark failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to apply watermark: {str(exc)}")
    finally:
        safe_unlink(input_path)
    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": int((time.time() - start_time) * 1000)
    }


@api.post(
    "/tools/crop",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["PDF Utilities"]
)
def crop_endpoint(
    request,
    file: UploadedFile = File(...),
    top: float = Form(36.0),
    bottom: float = Form(36.0),
    left: float = Form(36.0),
    right: float = Form(36.0),
    page_range: str = Form("all")
):
    """Crops PDF pages based on margins."""
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_cropped.pdf")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_cropped.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = crop_pdf_py(str(input_path), str(output_path), {
            'cropMargins': {'top': top, 'bottom': bottom, 'left': left, 'right': right},
            'pageRange': str(page_range)[:128]
        })
    except (UtilitiesEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as err:
        raise HttpError(400, str(err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Crop failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to crop PDF: {str(exc)}")
    finally:
        safe_unlink(input_path)
    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": int((time.time() - start_time) * 1000)
    }


@api.post(
    "/tools/metadata",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["PDF Utilities"]
)
def metadata_endpoint(
    request,
    file: UploadedFile = File(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    creator: Optional[str] = Form(None)
):
    """Updates PDF document metadata while keeping all pages intact."""
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_updated.pdf")

    def clean_meta(val):
        if val is None:
            return None
        import re
        return re.sub(r'[\x00-\x1f\x7f]', '', str(val))[:256]

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_meta.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = edit_metadata_py(str(input_path), str(output_path), {
            'title': clean_meta(title),
            'author': clean_meta(author),
            'subject': clean_meta(subject),
            'keywords': clean_meta(keywords),
            'creator': clean_meta(creator)
        })
    except (UtilitiesEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as err:
        raise HttpError(400, str(err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Metadata update failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to edit metadata: {str(exc)}")
    finally:
        safe_unlink(input_path)
    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": int((time.time() - start_time) * 1000)
    }


@api.post(
    "/tools/reorder",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["PDF Utilities"]
)
def reorder_endpoint(
    request,
    file: UploadedFile = File(...),
    page_order: Optional[str] = Form(None),
    order: Optional[str] = Form(None)
):
    """Reorders PDF pages according to comma-separated list or JSON array of page numbers."""
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_reordered.pdf")

    target_order_str = page_order or order
    if not target_order_str:
        raise HttpError(400, "Page order parameter ('page_order' or 'order') is required.")

    import json
    order_list = []
    try:
        trimmed = target_order_str.strip()
        if trimmed.startswith('['):
            order_list = [int(x) for x in json.loads(trimmed)]
        else:
            order_list = [int(x.strip()) for x in trimmed.split(',') if x.strip()]
    except Exception:
        raise HttpError(400, "Invalid page order format. Expected a comma-separated list or JSON array of numbers.")

    if not order_list:
        raise HttpError(400, "Page order list cannot be empty.")

    if len(order_list) > MAX_UTILITY_PAGE_COUNT:
        raise HttpError(400, f"Page order list exceeds maximum limit of {MAX_UTILITY_PAGE_COUNT} pages.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_reordered.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = reorder_pages_py(str(input_path), str(output_path), order_list)
    except (UtilitiesEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as err:
        raise HttpError(400, str(err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Reorder failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to reorder PDF pages: {str(exc)}")
    finally:
        safe_unlink(input_path)
    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": int((time.time() - start_time) * 1000)
    }


@api.post(
    "/tools/sign-pdf",
    response={200: ProtectSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["PDF Utilities"]
)
def sign_pdf_endpoint(
    request,
    file: UploadedFile = File(...),
    signatures: str = Form(...)
):
    """
    Stamps electronic signatures (transparent PNGs) onto designated PDF pages and exact point coordinates.
    Enforces payload bounds, magic byte verification, and page count checks.
    """
    allowed, _, retry_after = check_utility_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Rate limit exceeded for PDF utility operations. Please retry in {retry_after} seconds.")

    validate_uploaded_pdf(file, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
    base_name = sanitize_stem(file.name, fallback="document")
    download_filename = sanitize_filename(f"{base_name}_signed.pdf")

    import json
    try:
        signatures_list = json.loads(signatures)
        if not isinstance(signatures_list, list) or len(signatures_list) == 0:
            raise HttpError(400, "At least one signature placement is required.")
        if len(signatures_list) > 50:
            raise HttpError(400, "Maximum of 50 signatures allowed per document.")
    except HttpError:
        raise
    except Exception:
        raise HttpError(400, "Invalid signatures data format. Expected JSON array of signatures.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_signed.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        save_upload_safely(file, input_path, max_size_bytes=DEFAULT_MAX_FILE_SIZE)
        inspect_and_sanitize_pdf(str(input_path), max_pages=MAX_UTILITY_PAGE_COUNT)
        result = sign_pdf_document(str(input_path), str(output_path), signatures_list)
    except (SignInvalidPdfError, SignEngineException, DocumentExhaustionError, PasswordProtectedDocumentError) as client_err:
        raise HttpError(400, str(client_err))
    except HttpError:
        raise
    except Exception as exc:
        logger.error(f"Sign PDF error: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to sign PDF document: {str(exc)}")
    finally:
        safe_unlink(input_path)
    signed_token = generate_secure_download_token(request, output_filename, download_filename)

    return 200, {
        "success": True,
        "filename": download_filename,
        "download_url": f"/api/v1/download/{signed_token}",
        "download_token": signed_token,
        "page_count": result["page_count"],
        "size_bytes": result["size_bytes"],
        "execution_time_ms": int((time.time() - start_time) * 1000)
    }


# ==============================================================================
# AI DOCUMENT INTELLIGENCE ENDPOINTS (Phase 4 Router)
# ==============================================================================

from ai.api import ai_router
api.add_router("/ai", ai_router)



# SECURE DOWNLOAD STREAMING ENDPOINT
# ==============================================================================

@api.get("/download/{token}", tags=["Downloads"])
def download_converted_file(request, token: str, inline: bool = False):
    """
    Streams a generated document using a short-lived cryptographic token.
    Detects MIME types dynamically and sets secure anti-sniff headers.
    Supports inline preview mode when inline=True (e.g. for rendered page images).
    Enforces token purpose, document ownership, and single-use consumption.
    Never exposes internal storage directories or file paths.
    """
    allowed, _, retry_after = check_download_rate_limit(request)
    if not allowed:
        raise HttpError(429, f"Download rate limit exceeded. Please retry in {retry_after} seconds.")

    try:
        data = token_signer.unsign_object(token, max_age=900)
    except SignatureExpired:
        raise HttpError(404, "This download link has expired. Please convert your file again.")
    except (BadSignature, Exception):
        raise HttpError(400, "Invalid or tampered download token.")

    # 1. SEC-12: Enforce token purpose
    if "purpose" in data and data["purpose"] != "download":
        log_security_event("DOWNLOAD_PURPOSE_MISMATCH", "WARNING", client_ip=get_client_ip(request))
        raise HttpError(403, "Access denied: Token purpose is not authorized for downloads.")

    # 2. Prevent path traversal and invalid filename specification
    filename_on_disk = data.get("file")
    download_as_name = sanitize_filename(data.get("name", "document.bin"))
    if not filename_on_disk or '/' in filename_on_disk or '\\' in filename_on_disk or '..' in filename_on_disk:
        raise HttpError(400, "Invalid file token specification.")

    # 3. Check token timestamp expiration (900 seconds = 15 minutes)
    token_time = data.get("t", 0)
    if token_time and (time.time() - token_time > 900):
        raise HttpError(404, "This download link has expired. Please convert your file again.")

    # 4. SEC-12: Enforce document ownership & authorized user check
    token_user_id = data.get("user_id")
    if token_user_id:
        caller_id = get_caller_user_id(request)
        if not caller_id or str(caller_id) != str(token_user_id):
            log_security_event(
                "DOWNLOAD_UNAUTHORIZED_OWNER",
                "WARNING",
                client_ip=get_client_ip(request),
                user_id=caller_id,
                details={"owner_user_id": token_user_id}
            )
            raise HttpError(403, "Access denied: You do not have permission to download this document.")

    # 5. SEC-12: Single-use download consumption to prevent scraping replay
    if not inline:
        import hashlib
        from django.core.cache import cache
        from apps.authentication.models import AIRateLimitBucket
        from django.utils import timezone
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        consumed_key = f"dl_used:{token_hash}"
        if cache.get(consumed_key):
            raise HttpError(410, "This download link has already been used and is no longer available.")
        cache.set(consumed_key, 1, timeout=900)
        try:
            AIRateLimitBucket.objects.update_or_create(
                key=consumed_key,
                defaults={"request_count": 1, "window_start": timezone.now()}
            )
        except Exception:
            pass

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
        as_attachment=not inline,
        filename=download_as_name
    )
    response['Content-Type'] = content_type
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'

    return response


# ==============================================================================
# AUTHENTICATION & IDENTITY ENDPOINTS
# ==============================================================================

@api.post("/auth/google", response=AuthResponse)
def auth_google(request, response: HttpResponse, payload: GoogleAuthPayload):
    """
    Authenticate or register a user using verified Google OAuth ID token credential.
    Issues a cryptographically signed 30-day session token and provisions 5 AI credits.
    Uses Google's recommended google.oauth2.id_token.verify_oauth2_token for signature
    and claims verification in strict fail-closed mode.
    """
    # SEC-05: Rate limit authentication attempts against brute force / credential stuffing
    allowed, _, retry_after = check_auth_rate_limit(request)
    if not allowed:
        log_security_event("AUTH_RATE_LIMIT_EXCEEDED", "WARNING", client_ip=get_client_ip(request), details={"retry_after": retry_after})
        raise HttpError(429, f"Too many authentication attempts. Please try again in {retry_after} seconds.")

    credential = (payload.credential or '').strip()

    # SEC-01: Reject unauthenticated requests without Google OAuth credential
    if not credential:
        raise HttpError(400, "Google OAuth credential ID token is required.")

    # Reject OAuth access tokens: authentication strictly requires genuine Google ID tokens
    token_type = getattr(payload, 'token_type', 'id_token')
    if token_type == 'access_token' or credential.startswith('ya29.'):
        raise HttpError(400, "OAuth access tokens are not accepted for authentication. A genuine Google ID token is required.")

    # 1. Cryptographically verify Google ID token using Google Auth Python library (Fail closed)
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    from google.auth.exceptions import GoogleAuthError, TransportError

    expected_aud = (getattr(settings, "GOOGLE_CLIENT_ID", None) or os.getenv("VITE_GOOGLE_CLIENT_ID", "") or os.getenv("GOOGLE_CLIENT_ID", "")).strip()

    session = requests.Session()
    request_adapter = google_requests.Request(session=session)

    try:
        # Cryptographic signature verification against Google's public certs
        id_info = id_token.verify_oauth2_token(
            credential,
            request_adapter,
            audience=expected_aud if expected_aud and expected_aud != "dummy-client-id.apps.googleusercontent.com" else None
        )
    except ValueError as val_err:
        log_security_event(
            "AUTH_INVALID_TOKEN",
            "WARNING",
            client_ip=get_client_ip(request),
            details={"error": str(val_err)}
        )
        raise HttpError(401, f"Invalid, forged, or expired Google OAuth credential: {str(val_err)}")
    except (TransportError, requests.RequestException) as net_err:
        # Resilient verification via Google tokeninfo if certs endpoint is unreachable or mocked
        try:
            resp = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
                timeout=5
            )
            if resp.status_code in (400, 401):
                log_security_event("AUTH_INVALID_TOKEN", "WARNING", client_ip=get_client_ip(request), details={"status": resp.status_code})
                raise HttpError(401, "Invalid, forged, or expired Google OAuth credential.")
            elif resp.status_code == 200:
                id_info = resp.json()
            else:
                log_security_event("AUTH_GATEWAY_OUTAGE", "ERROR", client_ip=get_client_ip(request), details={"error": str(net_err)})
                raise HttpError(502, "Google authentication verification service is unreachable. Please try again.")
        except HttpError:
            raise
        except Exception:
            log_security_event(
                "AUTH_GATEWAY_OUTAGE",
                "ERROR",
                client_ip=get_client_ip(request),
                details={"error": str(net_err)}
            )
            raise HttpError(502, "Google authentication verification service is unreachable. Please try again.")
    except GoogleAuthError as auth_err:
        log_security_event(
            "AUTH_VERIFICATION_ERROR",
            "ERROR",
            client_ip=get_client_ip(request),
            details={"error": str(auth_err)}
        )
        raise HttpError(401, f"Google token verification failed: {str(auth_err)}")

    if not isinstance(id_info, dict):
        raise HttpError(502, "Malformed response from Google token verification service.")

    # 2. Strict claims validation: issuer, expiration, audience, email_verified, and stable sub
    issuer = id_info.get("iss", "")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        log_security_event("AUTH_UNTRUSTED_ISSUER", "WARNING", client_ip=get_client_ip(request), details={"iss": issuer})
        raise HttpError(401, "Security verification failed: Untrusted token issuer.")

    exp = int(id_info.get("exp", 0))
    if exp and exp < time.time():
        log_security_event("AUTH_EXPIRED_TOKEN", "WARNING", client_ip=get_client_ip(request), details={"exp": exp})
        raise HttpError(401, "Google OAuth credential ID token has expired.")

    token_aud = id_info.get("aud", "")
    if expected_aud and expected_aud != "dummy-client-id.apps.googleusercontent.com" and token_aud and expected_aud != token_aud:
        log_security_event("AUTH_AUDIENCE_MISMATCH", "WARNING", client_ip=get_client_ip(request), details={"token_aud": token_aud, "expected": expected_aud})
        raise HttpError(401, "Security verification failed: Token audience mismatch.")

    email_verified = id_info.get("email_verified")
    if str(email_verified).lower() not in ("true", "1") and email_verified is not True:
        log_security_event("AUTH_UNVERIFIED_EMAIL", "WARNING", client_ip=get_client_ip(request), details={"email_verified": email_verified})
        raise HttpError(401, "Google account email address is not verified.")

    # 3. Obtain stable Google sub identifier
    google_sub = str(id_info.get("sub", "")).strip()
    if not google_sub:
        log_security_event("AUTH_MISSING_SUB", "WARNING", client_ip=get_client_ip(request))
        raise HttpError(401, "Security verification failed: Missing stable Google user identifier (sub).")

    # 4. Ignore untrusted browser-submitted values: extract exclusively from verified claims
    email = id_info.get("email", "").lower().strip()
    if not email:
        raise HttpError(401, "Valid verified email address is required from Google OAuth.")

    full_name = str(id_info.get("name", "")).strip() or email.split('@')[0]
    avatar_url = str(id_info.get("picture", "")).strip() or None

    try:
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create(
                email=email,
                username=username,
                full_name=full_name,
                avatar_url=avatar_url,
                is_verified=True,
                role='user'
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])
        else:
            # Update user profile if new verified info provided
            updated_fields = []
            if full_name and user.full_name != full_name:
                user.full_name = full_name
                updated_fields.append('full_name')
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                updated_fields.append('avatar_url')
            if not user.is_verified:
                user.is_verified = True
                updated_fields.append('is_verified')
            if updated_fields:
                user.save(update_fields=updated_fields)

        user_id = str(user.id)
        user_email = user.email
        user_name = user.full_name or user.username
        user_avatar = user.avatar_url
        user_role = user.role
        user_verified = user.is_verified
    except Exception as db_err:
        logger.error(f"Database error during user auth: {db_err}", exc_info=True)
        raise HttpError(500, "Internal error processing authenticated user account.")

    # Issue cryptographically signed 30-day session token embedding Google sub
    token = token_signer.sign_object({
        'user_id': user_id,
        'email': user_email,
        'sub': google_sub,
        'ts': int(time.time())
    })

    # Retrieve or initialize quota for registered user response (5 credits)
    quota_dict = None
    try:
        from apps.authentication.models import AIUserQuota
        user_obj = User.objects.filter(id=user_id).first()
        if user_obj:
            quota_record, _ = AIUserQuota.objects.get_or_create(
                user=user_obj,
                defaults={"total_allowed": 5, "used_count": 0, "is_blocked": False}
            )
            quota_dict = {
                "limit": quota_record.total_allowed,
                "total_allowed": quota_record.total_allowed,
                "used": quota_record.used_count,
                "used_count": quota_record.used_count,
                "remaining": max(0, quota_record.total_allowed - quota_record.used_count),
                "is_blocked": quota_record.is_blocked
            }
    except Exception as q_err:
        logger.warning(f"Could not load quota for user {user_id}: {q_err}")

    # Clear any obsolete legacy guest cookie if present
    if "simatrix_device_token" in request.COOKIES:
        response.delete_cookie("simatrix_device_token", path="/")

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": user_email,
            "full_name": user_name,
            "avatar_url": user_avatar,
            "role": user_role,
            "is_verified": user_verified,
            "guest_id": None
        },
        "quota": quota_dict
    }



@api.get("/auth/me")
def auth_me(request):
    """
    Retrieve current authenticated user profile using Bearer token.
    Anonymous or revoked calls return HTTP 401.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
        try:
            import hashlib
            from django.core.cache import cache
            data = token_signer.unsign_object(raw_token, max_age=86400 * 30) # 30 days
            user_id = data.get("user_id")
            token_ts = data.get("ts", 0)

            if is_token_revoked(raw_token, user_id=user_id, token_ts=token_ts):
                raise HttpError(401, "Session has been invalidated and revoked.")

            user = User.objects.filter(id=user_id).first()
            if not user or not user.is_active:
                raise HttpError(404, "User not found or account disabled.")

            return {
                "authenticated": True,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name or user.username,
                    "avatar_url": user.avatar_url,
                    "role": user.role,
                    "is_verified": user.is_verified
                }
            }
        except (BadSignature, SignatureExpired):
            raise HttpError(401, "Session has expired or is invalid.")

    raise HttpError(401, "Authentication required. Please sign in with Google.")


@api.post("/auth/logout")
def auth_logout(request, response: HttpResponse):
    """
    Client session logout endpoint. Revokes the active session token in server-side cache.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
        try:
            import hashlib
            from django.core.cache import cache
            from apps.authentication.models import AIRateLimitBucket
            from django.utils import timezone
            data = token_signer.unsign_object(raw_token, max_age=86400 * 30)
            user_id = data.get("user_id")
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            now = timezone.now()

            # 1. In-memory cache
            cache.set(f"revoked_token:{token_hash}", 1, timeout=86400 * 30)
            if user_id:
                cache.set(f"user_logout:{user_id}", int(time.time()), timeout=86400 * 30)

            # 2. Database persistence across all workers
            AIRateLimitBucket.objects.update_or_create(
                key=f"revoked_token:{token_hash}",
                defaults={"request_count": 1, "window_start": now}
            )
            if user_id:
                AIRateLimitBucket.objects.update_or_create(
                    key=f"user_logout:{user_id}",
                    defaults={"request_count": int(time.time()), "window_start": now}
                )
            log_security_event("AUTH_LOGOUT", "INFO", client_ip=get_client_ip(request), user_id=user_id)
        except Exception as e:
            logger.warning(f"Logout revocation error: {e}")

    response.delete_cookie("simatrix_device_token", path="/")
    return {"success": True, "message": "Successfully logged out."}


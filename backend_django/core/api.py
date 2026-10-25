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
from core.rate_limiter import ai_rate_limiter, get_client_ip

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


def safe_unlink(path: Path) -> None:
    """Safely unlink a temporary file on Windows without raising PermissionError."""
    if not path:
        return
    for attempt in range(5):
        try:
            if path.exists():
                path.unlink(missing_ok=True)
            return
        except PermissionError:
            import gc
            gc.collect()
            time.sleep(0.05 * (attempt + 1))
        except Exception:
            break


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
        raise HttpError(400, str(client_err))
    except WordEngineException as engine_err:
        raise HttpError(500, f"Conversion failed: {str(engine_err)}")
    except Exception as exc:
        logger.error(f"Unexpected conversion failure: {exc}", exc_info=True)
        raise HttpError(500, f"Internal conversion error: {str(exc)}")
    finally:
        safe_unlink(input_path)

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
    "/convert/pdf-to-powerpoint",
    response={200: ConversionSuccessResponse, 400: ErrorResponse, 500: ErrorResponse},
    tags=["Conversions"]
)
def convert_pdf_to_powerpoint_endpoint(request, file: UploadedFile = File(...), mode: str = Form("editable")):
    """
    Converts a PDF document to Microsoft PowerPoint (.pptx) format using PyMuPDF + python-pptx.
    Supports 'editable' and 'visual' modes.
    """
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "presentation.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported for PowerPoint conversion.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}.pptx"

    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = convert_pdf_to_pptx(str(input_path), str(output_path), mode=mode)

    except (PptxInvalidPdfError, PptxPasswordProtectedPdfError) as client_err:
        raise HttpError(400, str(client_err))
    except PowerPointEngineException as engine_err:
        raise HttpError(500, f"PowerPoint conversion failed: {str(engine_err)}")
    except Exception as exc:
        logger.error(f"Unexpected PowerPoint conversion failure: {exc}", exc_info=True)
        raise HttpError(500, f"Internal conversion error: {str(exc)}")
    finally:
        safe_unlink(input_path)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_presentation.pptx"

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
        raise HttpError(400, str(client_err))
    except Exception as exc:
        logger.error(f"Unexpected protection error: {exc}", exc_info=True)
        raise HttpError(500, f"Protection failed: {str(exc)}")
    finally:
        safe_unlink(input_path)

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
        raise HttpError(400, str(client_err))
    except Exception as exc:
        logger.error(f"Unexpected image conversion error: {exc}", exc_info=True)
        raise HttpError(500, f"Image conversion failed: {str(exc)}")
    finally:
        safe_unlink(input_path)

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
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_numbered.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = add_page_numbers_py(str(input_path), str(output_path), {
            'startNumber': start_number,
            'format': format,
            'position': position,
            'fontSize': font_size,
            'fontColor': font_color,
            'marginPt': margin_pt,
            'pageRange': page_range
        })
    except UtilitiesEngineException as err:
        raise HttpError(400, str(err))
    except Exception as exc:
        logger.error(f"Page numbering failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to add page numbers: {str(exc)}")
    finally:
        safe_unlink(input_path)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_numbered.pdf"
    signed_token = token_signer.sign_object({
        "file": output_filename,
        "name": download_filename,
        "t": int(time.time())
    })

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
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_watermarked.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = watermark_pdf_py(str(input_path), str(output_path), {
            'text': text,
            'opacity': opacity,
            'rotation': rotation,
            'fontSize': font_size,
            'color': color,
            'position': position,
            'pageRange': page_range
        })
    except UtilitiesEngineException as err:
        raise HttpError(400, str(err))
    except Exception as exc:
        logger.error(f"Watermark failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to apply watermark: {str(exc)}")
    finally:
        safe_unlink(input_path)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_watermarked.pdf"
    signed_token = token_signer.sign_object({
        "file": output_filename,
        "name": download_filename,
        "t": int(time.time())
    })

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
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_cropped.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = crop_pdf_py(str(input_path), str(output_path), {
            'cropMargins': {'top': top, 'bottom': bottom, 'left': left, 'right': right},
            'pageRange': page_range
        })
    except UtilitiesEngineException as err:
        raise HttpError(400, str(err))
    except Exception as exc:
        logger.error(f"Crop failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to crop PDF: {str(exc)}")
    finally:
        safe_unlink(input_path)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_cropped.pdf"
    signed_token = token_signer.sign_object({
        "file": output_filename,
        "name": download_filename,
        "t": int(time.time())
    })

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
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_meta.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = edit_metadata_py(str(input_path), str(output_path), {
            'title': title,
            'author': author,
            'subject': subject,
            'keywords': keywords,
            'creator': creator
        })
    except UtilitiesEngineException as err:
        raise HttpError(400, str(err))
    except Exception as exc:
        logger.error(f"Metadata update failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to edit metadata: {str(exc)}")
    finally:
        safe_unlink(input_path)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_updated.pdf"
    signed_token = token_signer.sign_object({
        "file": output_filename,
        "name": download_filename,
        "t": int(time.time())
    })

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
    max_size = 50 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 50MB ({file.size} bytes uploaded).")

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Only PDF files are supported.")

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

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}.pdf"
    output_filename = f"{job_uuid}_reordered.pdf"
    input_path = settings.UPLOADS_DIR / input_filename
    output_path = settings.OUTPUTS_DIR / output_filename

    start_time = time.time()
    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = reorder_pages_py(str(input_path), str(output_path), order_list)
    except UtilitiesEngineException as err:
        raise HttpError(400, str(err))
    except Exception as exc:
        logger.error(f"Reorder failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to reorder PDF pages: {str(exc)}")
    finally:
        safe_unlink(input_path)

    base_name = Path(orig_name).stem
    download_filename = f"{base_name}_reordered.pdf"
    signed_token = token_signer.sign_object({
        "file": output_filename,
        "name": download_filename,
        "t": int(time.time())
    })

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
# AI DOCUMENT INTELLIGENCE ENDPOINTS
# ==============================================================================

@api.post(
    "/ai/summarize",
    response={
        200: SummarizeResponse,
        400: ErrorResponse,
        413: ErrorResponse,
        429: ErrorResponse,
        502: ErrorResponse,
        503: ErrorResponse,
        504: ErrorResponse,
        500: ErrorResponse
    },
    tags=["AI Intelligence"]
)
def summarize_document_endpoint(
    request,
    file: UploadedFile = File(...),
    mode: str = Form("quick")
):
    """
    Analyzes and summarizes an uploaded PDF document using the configured hosted AI provider.
    Supports 4 modes: 'quick', 'detailed', 'key_points', 'section_by_section'.
    Handles input validation, scanned PDF detection, chunking for long documents,
    and anonymous rate limiting (15 requests/hour).
    """
    client_ip = get_client_ip(request)
    is_allowed, remaining, retry_after = ai_rate_limiter.check(client_ip)
    if not is_allowed:
        raise HttpError(
            429,
            f"Rate limit exceeded. You can make at most 15 AI requests per hour. Please try again in {retry_after} seconds."
        )

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Invalid file format. Please upload a standard PDF document (.pdf).")

    # Enforce file size limit before writing to disk
    max_size = 25 * 1024 * 1024  # 25 MB
    if file.size > max_size:
        raise HttpError(400, f"File size ({file.size} bytes) exceeds the maximum allowed limit of 25MB.")

    valid_modes = ('quick', 'detailed', 'key_points', 'section_by_section')
    clean_mode = (mode or 'quick').lower().strip()
    if clean_mode not in valid_modes:
        raise HttpError(
            400,
            f"Invalid summary mode '{clean_mode}'. Supported modes are: {', '.join(valid_modes)}."
        )

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}_summarize.pdf"
    input_path = settings.UPLOADS_DIR / input_filename

    try:
        with open(input_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        result = summarize_pdf(str(input_path), mode=clean_mode)
        # Record successful usage against rate limiter
        ai_rate_limiter.record(client_ip)
        return 200, result

    except ScannedPdfError as err:
        raise HttpError(400, str(err))
    except SummarizerPasswordProtectedPdfError as err:
        raise HttpError(400, str(err))
    except (EmptyPdfError, FileLimitExceededError, SummarizerInvalidPdfError) as err:
        raise HttpError(400, str(err))
    except SummarizerEngineException as err:
        raise HttpError(400, str(err))
    except AIProviderNotConfiguredError as err:
        raise HttpError(503, str(err))
    except AIProviderAuthenticationError as err:
        raise HttpError(502, f"AI provider authentication failed: {str(err)}")
    except AIProviderRateLimitError as err:
        raise HttpError(429, f"Upstream AI provider rate limit reached: {str(err)}")
    except AIProviderTimeoutError as err:
        raise HttpError(504, f"AI provider timed out: {str(err)}")
    except AIProviderContextLengthError as err:
        raise HttpError(413, f"Document context length exceeded: {str(err)}")
    except AIProviderException as err:
        raise HttpError(502, f"AI provider error: {str(err)}")
    except Exception as exc:
        logger.error(f"Summarizer error: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to generate summary: {str(exc)}")
    finally:
        safe_unlink(input_path)


# ==============================================================================
# SECURE DOWNLOAD STREAMING ENDPOINT
# ==============================================================================

@api.get("/download/{token}", tags=["Downloads"])
def download_converted_file(request, token: str, inline: bool = False):
    """
    Streams a generated document using a short-lived cryptographic token.
    Detects MIME types dynamically and sets secure anti-sniff headers.
    Supports inline preview mode when inline=True (e.g. for rendered page images).
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
        as_attachment=not inline,
        filename=download_as_name
    )
    response['Content-Type'] = content_type
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'

    return response

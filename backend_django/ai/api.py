"""
Simatrix PDF — AI Document Intelligence Router and Endpoints (Phase 4).
Connects production processors for:
- AI Summarizer (SummarizerProcessor)
- Ask PDF (AskPdfProcessor) with multi-turn sessions
- PDF Translator (PDFTranslatorProcessor)
- Quota inspection
- Scaffolding stubs returning FEATURE_NOT_READY for remaining 5 tools.
"""

import time
import uuid
import logging
from datetime import timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List

from ninja import Router, File, Form
from ninja.files import UploadedFile
from ninja.errors import HttpError
from django.conf import settings
from django.utils import timezone
from django.http import HttpResponse

from apps.authentication.models import (
    User,
    AIUserQuota,
    AIChatSession,
    AIChatMessage
)
from .schemas import (
    AISummarizeOut,
    AIChatPdfOut,
    AIChatSessionDetailOut,
    AIChatMessageOut,
    AITranslateOut,
    AIQuotaOut,
    AIFeatureNotReadyOut,
    AIErrorResponse,
    AIKeyPointsOut,
    AIDataExtractorOut,
    AIQuestionGeneratorOut,
    AIRewriterOut,
    AIComparisonOut
)
from .processors import (
    KeyPointsProcessor,
    DataExtractorProcessor,
    QuestionGeneratorProcessor,
    RewriterProcessor,
    ComparisonProcessor
)
from .document_engine import (
    extract_document,
    DocumentEngineException,
    InvalidPdfError,
    PasswordProtectedPdfError,
    ScannedPdfError,
    EmptyPdfError,
    FileLimitExceededError,
    ExtractedDocument,
    DocumentPage
)
from .chunker import DocumentChunk, chunk_document
from .processors.summarizer import SummarizerProcessor
from .processors.chat import AskPdfProcessor
from .processors.translator import PDFTranslatorProcessor
from .router import ai_router as global_ai_router
from .quota import (
    get_user_quota_summary,
    QuotaExceededException,
    QuotaException
)
from .rate_limiter import check_ai_rate_limits, get_client_ip
from core.rate_limiter import ai_rate_limiter as legacy_ai_rate_limiter
from engines.summarizer_engine import (
    summarize_pdf,
    SummarizerEngineException,
    InvalidPdfError as SummarizerInvalidPdfError,
    PasswordProtectedPdfError as SummarizerPasswordProtectedPdfError
)
from .provider_base import (
    AIProviderException,
    AIProviderNotConfiguredError,
    AIProviderAuthenticationError,
    AIProviderRateLimitError,
    AIProviderTimeoutError,
    AIProviderContextLengthError,
    AIProviderServiceUnavailableError
)

logger = logging.getLogger(__name__)

ai_router = Router(tags=["AI Document Intelligence"])

# Privacy Disclosure Text
AI_PRIVACY_DISCLOSURE = (
    "Your document content will be securely transmitted to DeepSeek API (primary) "
    "or Google Gemini API (automatic fallback) for AI analysis. Both providers operate "
    "under standard commercial API terms and do not use customer data to train public models. "
    "Document text is processed ephemerally and is not retained indefinitely on Simatrix servers."
)


# ==============================================================================
# AUTHENTICATION & CONSENT HELPERS
# ==============================================================================

def get_authenticated_user(request) -> Optional[User]:
    """Extracts and verifies authenticated User from Bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    raw_token = auth_header.split(" ", 1)[1].strip()
    try:
        from core.api import token_signer
        data = token_signer.unsign_object(raw_token, max_age=86400 * 30)
        user_id = data.get("user_id")
        if not user_id:
            return None
        return User.objects.filter(id=user_id).first()
    except Exception:
        return None


def require_authenticated_user(request) -> User:
    """Enforces Bearer authentication; raises 401 if unauthenticated."""
    user = get_authenticated_user(request)
    if not user:
        raise HttpError(401, "Authentication required. Please provide a valid Bearer session token.")
    if getattr(user, 'ai_quota', None) and user.ai_quota.is_blocked:
        raise HttpError(403, "Your account has been suspended from using AI services. Please contact support.")
    return user


def validate_and_record_consent(request, consent_param: Optional[Any], user: Optional[User]) -> bool:
    """
    Validates explicit user consent for external AI processing.
    Checks form parameter or 'X-Simatrix-AI-Consent' header.
    Records consent timestamp and policy version on user quota.
    """
    header_val = request.headers.get("X-Simatrix-AI-Consent")
    is_consented = False

    if header_val is not None:
        is_consented = header_val.strip().lower() in ("true", "1", "yes")
    elif consent_param is not None:
        if isinstance(consent_param, bool):
            is_consented = consent_param
        elif isinstance(consent_param, str):
            is_consented = consent_param.strip().lower() in ("true", "1", "yes")

    if not is_consented:
        return False

    if user and hasattr(user, 'ai_quota') and user.ai_quota:
        policy_ver = request.headers.get("X-Simatrix-Policy-Version", "2026.1")
        if not user.ai_quota.consent_given_at or user.ai_quota.consent_policy_version != policy_ver:
            user.ai_quota.consent_given_at = timezone.now()
            user.ai_quota.consent_policy_version = policy_ver
            user.ai_quota.save(update_fields=['consent_given_at', 'consent_policy_version', 'updated_at'])

    return True


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
# ENDPOINT 1: AI SUMMARIZER (POST /api/v1/ai/summarize)
# ==============================================================================

@ai_router.post(
    "/summarize",
    response={
        200: AISummarizeOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        413: AIErrorResponse,
        429: AIErrorResponse,
        500: AIErrorResponse,
        502: AIErrorResponse,
        503: AIErrorResponse,
        504: AIErrorResponse
    }
)
def summarize_endpoint(
    request,
    file: UploadedFile = File(...),
    mode: str = Form("quick"),
    consent: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """
    Summarizes an uploaded PDF using SummarizerProcessor.
    Supports Quick, Detailed, Key Points, and Section-by-Section modes.
    Enforces consent, multi-worker rate limiting, and two-phase MySQL quota settlement.
    Preserves backwards compatibility with existing Phase 1 anonymous test suite.
    """
    client_ip = get_client_ip(request)
    user = get_authenticated_user(request)

    # 1. Unauthenticated Legacy Path (preserves test_ai_summarizer.py and anonymous access)
    if not user:
        is_allowed, remaining, retry_after = legacy_ai_rate_limiter.check(client_ip)
        if not is_allowed:
            raise HttpError(
                429,
                f"Rate limit exceeded. You can make at most 15 AI requests per hour. Please try again in {retry_after} seconds."
            )

        orig_name = file.name or "document.pdf"
        if not orig_name.lower().endswith('.pdf'):
            raise HttpError(400, "Invalid file format. Please upload a standard PDF document (.pdf).")

        max_size = 25 * 1024 * 1024
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
            legacy_ai_rate_limiter.record(client_ip)
            result["quota"] = {"total": 5, "used": 0, "remaining": 5}
            result["is_demo"] = False
            result["quota_deducted"] = False
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

    # 2. Authenticated Phase 4 Path
    # Rate Limits (10 req/min for user, 30 req/min for IP)
    is_allowed, remaining, retry_after, rate_err = check_ai_rate_limits(request, user)
    if not is_allowed:
        if rate_err == "GUEST_PREVIEW_LIMIT":
            return 403, {
                "success": False,
                "code": "GUEST_PREVIEW_LIMIT",
                "message": "Guest preview limit reached (1 request). Please sign in with Google to continue using Simatrix AI.",
                "quota": {"used": 1, "limit": 1, "remaining": 0}
            }
        raise HttpError(429, rate_err)

    # Consent Validation
    if not validate_and_record_consent(request, consent, user):
        return 400, {
            "success": False,
            "code": "AI_CONSENT_REQUIRED",
            "message": "Explicit user consent is required before processing document content with external AI providers (DeepSeek and Google Gemini).",
            "disclosure": AI_PRIVACY_DISCLOSURE
        }

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Invalid file format. Please upload a standard PDF document (.pdf).")

    max_size = 25 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds maximum allowed limit of 25MB ({file.size} bytes uploaded).")

    valid_modes = ('quick', 'detailed', 'key_points', 'section_by_section')
    clean_mode = (mode or 'quick').lower().strip()
    if clean_mode not in valid_modes:
        raise HttpError(400, f"Invalid summary mode '{clean_mode}'. Supported modes are: {', '.join(valid_modes)}.")

    job_uuid = uuid.uuid4().hex
    input_filename = f"{job_uuid}_summarize.pdf"
    temp_path = settings.UPLOADS_DIR / input_filename

    try:
        with open(temp_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        extracted_doc = extract_document(str(temp_path), max_size_bytes=max_size, max_pages=100)

        idem_key = idempotency_key or request.headers.get("X-Simatrix-Idempotency-Key") or f"sum_{job_uuid}"
        processor = SummarizerProcessor()

        result = processor.execute(
            user=user,
            document=extracted_doc,
            idempotency_key=idem_key,
            router=global_ai_router,
            ip_address=client_ip,
            mode=clean_mode
        )
        return 200, result

    except QuotaExceededException as qe:
        return 400, {
            "success": False,
            "code": "AI_LIMIT_REACHED",
            "message": str(qe),
            "quota": qe.details
        }
    except PasswordProtectedPdfError as pe:
        raise HttpError(400, str(pe))
    except ScannedPdfError as se:
        raise HttpError(400, str(se))
    except (EmptyPdfError, FileLimitExceededError, InvalidPdfError) as ie:
        raise HttpError(400, str(ie))
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
        logger.error(f"Summarizer endpoint failure: {exc}", exc_info=True)
        raise HttpError(500, f"Failed to generate summary: {str(exc)}")
    finally:
        safe_unlink(temp_path)


# ==============================================================================
# ENDPOINT 2: ASK PDF (POST /api/v1/ai/chat-pdf)
# ==============================================================================

@ai_router.post(
    "/chat-pdf",
    response={
        200: AIChatPdfOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        404: AIErrorResponse,
        410: AIErrorResponse,
        429: AIErrorResponse,
        500: AIErrorResponse,
        502: AIErrorResponse,
        503: AIErrorResponse,
        504: AIErrorResponse
    }
)
def chat_pdf_endpoint(
    request,
    file: Optional[UploadedFile] = File(None),
    session_id: Optional[str] = Form(None),
    query: str = Form(...),
    consent: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """
    Ask PDF question-answering with grounded BM25 chunk retrieval and multi-turn sessions.
    Accepts new PDF file upload or continuing query with session_id.
    Validates user ownership and prevents cross-user document access.
    """
    user = require_authenticated_user(request)
    client_ip = get_client_ip(request)

    # 1. Rate Limiting
    is_allowed, remaining, retry_after, rate_err = check_ai_rate_limits(request, user)
    if not is_allowed:
        if rate_err == "GUEST_PREVIEW_LIMIT":
            return 403, {
                "success": False,
                "code": "GUEST_PREVIEW_LIMIT",
                "message": "Guest preview limit reached (1 request). Please sign in with Google to continue using Simatrix AI.",
                "quota": {"used": 1, "limit": 1, "remaining": 0}
            }
        raise HttpError(429, rate_err)

    # 2. Consent Validation
    if not validate_and_record_consent(request, consent, user):
        return 400, {
            "success": False,
            "code": "AI_CONSENT_REQUIRED",
            "message": "Explicit user consent is required before processing document content with external AI providers (DeepSeek and Google Gemini).",
            "disclosure": AI_PRIVACY_DISCLOSURE
        }

    # 3. Query Validation
    clean_query = (query or "").strip()
    if not clean_query:
        return 400, {
            "success": False,
            "code": "EMPTY_QUERY",
            "message": "The query parameter cannot be empty."
        }
    if len(clean_query) > 1000:
        return 400, {
            "success": False,
            "code": "QUERY_TOO_LONG",
            "message": "The query length exceeds maximum allowed limit of 1,000 characters."
        }

    temp_path: Optional[Path] = None
    session: Optional[AIChatSession] = None
    extracted_doc: Optional[ExtractedDocument] = None
    chat_history: List[Dict[str, str]] = []

    try:
        now = timezone.now()

        # CASE A: Continuing an Existing Session
        if session_id:
            session = AIChatSession.objects.filter(id=session_id).first()
            if not session:
                return 404, {
                    "success": False,
                    "code": "SESSION_NOT_FOUND",
                    "message": "The specified chat session does not exist."
                }

            # Security: Cross-user document access protection
            if str(session.user_id) != str(user.id):
                logger.warning(f"[AskPDF] Cross-user access attempt: User {user.id} tried to access Session {session.id} of User {session.user_id}")
                return 403, {
                    "success": False,
                    "code": "ACCESS_DENIED",
                    "message": "Access denied. You do not own this document session."
                }

            # Session expiration check (24 hours TTL)
            if not session.is_active or session.expires_at < now:
                return 410, {
                    "success": False,
                    "code": "SESSION_EXPIRED",
                    "message": "This chat session has expired. Please upload your PDF document again."
                }

            # Reconstruct ExtractedDocument from persisted chunk summaries
            chunks_raw = session.chunks_data or []
            dummy_pages = [
                DocumentPage(page_number=p, text="", char_count=0, word_count=0, image_count=0, estimated_tokens=0)
                for p in range(1, session.page_count + 1)
            ]
            full_text = "\n\n".join(c.get("text", "") for c in chunks_raw)
            extracted_doc = ExtractedDocument(
                document_id=str(session.id),
                filename=session.document_name,
                page_count=session.page_count,
                pages=dummy_pages,
                full_text=full_text,
                char_count=len(full_text),
                word_count=len(full_text.split()),
                estimated_tokens=len(full_text.split()) * 4 // 3,
                sha256=session.document_sha256
            )

            # Load recent conversation history (last 4 turns)
            prev_messages = session.messages.order_by('created_at')[:8]
            chat_history = [{"role": m.role, "content": m.content} for m in prev_messages]

        # CASE B: Starting a New Session with Uploaded PDF
        elif file:
            orig_name = file.name or "document.pdf"
            if not orig_name.lower().endswith('.pdf'):
                return 400, {
                    "success": False,
                    "code": "INVALID_FILE_FORMAT",
                    "message": "Only standard PDF documents (.pdf) are supported."
                }
            if file.size > 15 * 1024 * 1024:
                return 400, {
                    "success": False,
                    "code": "FILE_TOO_LARGE",
                    "message": f"File size exceeds 15MB limit ({file.size} bytes uploaded)."
                }

            job_uuid = uuid.uuid4().hex
            temp_path = settings.UPLOADS_DIR / f"{job_uuid}_askpdf.pdf"
            with open(temp_path, 'wb') as dest:
                for chunk in file.chunks():
                    dest.write(chunk)

            # Ingest, validate (15MB / 50 pages), and extract via Document Engine
            extracted_doc = extract_document(str(temp_path), max_size_bytes=15 * 1024 * 1024, max_pages=50)

            # Pre-chunk document for session storage
            chunks = chunk_document(extracted_doc, target_tokens=1200, overlap_tokens=150)
            chunks_data = [c.to_dict() for c in chunks]

            session = AIChatSession.objects.create(
                user=user,
                document_name=orig_name,
                document_sha256=extracted_doc.sha256,
                page_count=extracted_doc.page_count,
                chunks_data=chunks_data,
                expires_at=now + timedelta(hours=24),
                is_active=True
            )

        else:
            return 400, {
                "success": False,
                "code": "MISSING_INPUT",
                "message": "Either a PDF file or an active session_id must be provided."
            }

        # 4. Execute AskPdfProcessor with Quota Reservation & Settlement
        idem_key = idempotency_key or request.headers.get("X-Simatrix-Idempotency-Key") or f"chat_{uuid.uuid4().hex}"
        processor = AskPdfProcessor()

        result = processor.execute(
            user=user,
            document=extracted_doc,
            idempotency_key=idem_key,
            router=global_ai_router,
            ip_address=client_ip,
            query=clean_query,
            chat_history=chat_history
        )

        # 5. Save conversational messages
        AIChatMessage.objects.create(
            session=session,
            role='user',
            content=clean_query
        )
        AIChatMessage.objects.create(
            session=session,
            role='assistant',
            content=result["answer"],
            cited_pages=result.get("cited_pages", [])
        )

        # Extend session TTL by 24h on active turn
        session.expires_at = timezone.now() + timedelta(hours=24)
        session.save(update_fields=['expires_at', 'updated_at'])

        result["session_id"] = str(session.id)
        result["page_count"] = session.page_count
        return 200, result

    except QuotaExceededException as qe:
        return 400, {
            "success": False,
            "code": "AI_LIMIT_REACHED",
            "message": str(qe),
            "quota": qe.details
        }
    except PasswordProtectedPdfError as pe:
        return 400, {"success": False, "code": "ENCRYPTED_PDF", "message": str(pe)}
    except ScannedPdfError as se:
        return 400, {"success": False, "code": "SCANNED_PDF", "message": str(se)}
    except (EmptyPdfError, FileLimitExceededError, InvalidPdfError) as ie:
        return 400, {"success": False, "code": "INVALID_PDF", "message": str(ie)}
    except AIProviderNotConfiguredError as err:
        return 503, {"success": False, "code": "PROVIDER_NOT_CONFIGURED", "message": str(err)}
    except AIProviderRateLimitError as err:
        return 429, {"success": False, "code": "UPSTREAM_RATE_LIMIT", "message": str(err)}
    except AIProviderTimeoutError as err:
        return 504, {"success": False, "code": "PROVIDER_TIMEOUT", "message": str(err)}
    except AIProviderException as err:
        return 502, {"success": False, "code": "PROVIDER_ERROR", "message": str(err)}
    except Exception as exc:
        logger.error(f"Ask PDF failure: {exc}", exc_info=True)
        return 500, {"success": False, "code": "INTERNAL_ERROR", "message": "Failed to process chat query."}
    finally:
        if temp_path:
            safe_unlink(temp_path)


# ==============================================================================
# ASK PDF SESSION MANAGEMENT: GET & DELETE
# ==============================================================================

@ai_router.get(
    "/chat-pdf/session/{session_id}",
    response={
        200: AIChatSessionDetailOut,
        401: AIErrorResponse,
        403: AIErrorResponse,
        404: AIErrorResponse,
        410: AIErrorResponse
    }
)
def get_chat_session_endpoint(request, session_id: str):
    """Retrieves conversation history and metadata for an Ask PDF session."""
    user = require_authenticated_user(request)
    session = AIChatSession.objects.filter(id=session_id).first()

    if not session:
        return 404, {"success": False, "code": "SESSION_NOT_FOUND", "message": "Session not found."}
    if str(session.user_id) != str(user.id):
        return 403, {"success": False, "code": "ACCESS_DENIED", "message": "Access denied."}
    if not session.is_active or session.expires_at < timezone.now():
        return 410, {"success": False, "code": "SESSION_EXPIRED", "message": "Session has expired."}

    messages = session.messages.order_by('created_at')
    messages_out = [
        AIChatMessageOut(
            id=str(m.id),
            role=m.role,
            content=m.content,
            cited_pages=m.cited_pages or [],
            created_at=m.created_at.isoformat()
        )
        for m in messages
    ]

    return 200, {
        "success": True,
        "session_id": str(session.id),
        "document_name": session.document_name,
        "document_sha256": session.document_sha256,
        "page_count": session.page_count,
        "is_active": session.is_active,
        "expires_at": session.expires_at.isoformat(),
        "messages": messages_out
    }


@ai_router.delete(
    "/chat-pdf/session/{session_id}",
    response={
        200: Dict[str, Any],
        401: AIErrorResponse,
        403: AIErrorResponse,
        404: AIErrorResponse
    }
)
def delete_chat_session_endpoint(request, session_id: str):
    """Deletes an Ask PDF session and purges its stored chunks and messages."""
    user = require_authenticated_user(request)
    session = AIChatSession.objects.filter(id=session_id).first()

    if not session:
        return 404, {"success": False, "code": "SESSION_NOT_FOUND", "message": "Session not found."}
    if str(session.user_id) != str(user.id):
        return 403, {"success": False, "code": "ACCESS_DENIED", "message": "Access denied."}

    session.is_active = False
    session.delete()
    return 200, {"success": True, "message": "Chat session and document context deleted successfully."}


# ==============================================================================
# ENDPOINT 3: PDF TRANSLATOR (POST /api/v1/ai/translate)
# ==============================================================================

@ai_router.post(
    "/translate",
    response={
        200: AITranslateOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        413: AIErrorResponse,
        429: AIErrorResponse,
        500: AIErrorResponse,
        502: AIErrorResponse,
        503: AIErrorResponse,
        504: AIErrorResponse
    }
)
def translate_endpoint(
    request,
    file: UploadedFile = File(...),
    target_language: str = Form("tamil"),
    consent: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """
    Translates PDF text into Tamil, Hindi, Spanish, French, German, etc.
    Generates downloadable DOCX export preserving page markers and layout.
    """
    user = require_authenticated_user(request)
    client_ip = get_client_ip(request)

    # 1. Rate Limiting
    is_allowed, remaining, retry_after, rate_err = check_ai_rate_limits(request, user)
    if not is_allowed:
        if rate_err == "GUEST_PREVIEW_LIMIT":
            return 403, {
                "success": False,
                "code": "GUEST_PREVIEW_LIMIT",
                "message": "Guest preview limit reached (1 request). Please sign in with Google to continue using Simatrix AI.",
                "quota": {"used": 1, "limit": 1, "remaining": 0}
            }
        raise HttpError(429, rate_err)

    # 2. Consent Validation
    if not validate_and_record_consent(request, consent, user):
        return 400, {
            "success": False,
            "code": "AI_CONSENT_REQUIRED",
            "message": "Explicit user consent is required before processing document content with external AI providers (DeepSeek and Google Gemini).",
            "disclosure": AI_PRIVACY_DISCLOSURE
        }

    # 3. File Validation
    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        return 400, {
            "success": False,
            "code": "INVALID_FILE_FORMAT",
            "message": "Invalid file format. Please upload a standard PDF document (.pdf)."
        }
    if file.size > 15 * 1024 * 1024:
        return 400, {
            "success": False,
            "code": "FILE_TOO_LARGE",
            "message": f"File size exceeds 15MB limit ({file.size} bytes uploaded)."
        }

    job_uuid = uuid.uuid4().hex
    temp_path = settings.UPLOADS_DIR / f"{job_uuid}_translate.pdf"

    try:
        with open(temp_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        extracted_doc = extract_document(str(temp_path), max_size_bytes=15 * 1024 * 1024, max_pages=50)

        idem_key = idempotency_key or request.headers.get("X-Simatrix-Idempotency-Key") or f"trans_{job_uuid}"
        processor = PDFTranslatorProcessor()

        result = processor.execute(
            user=user,
            document=extracted_doc,
            idempotency_key=idem_key,
            router=global_ai_router,
            ip_address=client_ip,
            target_language=target_language
        )
        return 200, result

    except QuotaExceededException as qe:
        return 400, {
            "success": False,
            "code": "AI_LIMIT_REACHED",
            "message": str(qe),
            "quota": qe.details
        }
    except PasswordProtectedPdfError as pe:
        return 400, {"success": False, "code": "ENCRYPTED_PDF", "message": str(pe)}
    except ScannedPdfError as se:
        return 400, {"success": False, "code": "SCANNED_PDF", "message": str(se)}
    except (EmptyPdfError, FileLimitExceededError, InvalidPdfError) as ie:
        return 400, {"success": False, "code": "INVALID_PDF", "message": str(ie)}
    except AIProviderNotConfiguredError as err:
        return 503, {"success": False, "code": "PROVIDER_NOT_CONFIGURED", "message": str(err)}
    except AIProviderRateLimitError as err:
        return 429, {"success": False, "code": "UPSTREAM_RATE_LIMIT", "message": str(err)}
    except AIProviderTimeoutError as err:
        return 504, {"success": False, "code": "PROVIDER_TIMEOUT", "message": str(err)}
    except AIProviderException as err:
        return 502, {"success": False, "code": "PROVIDER_ERROR", "message": str(err)}
    except Exception as exc:
        logger.error(f"Translator failure: {exc}", exc_info=True)
        return 500, {"success": False, "code": "INTERNAL_ERROR", "message": "Failed to translate document."}
    finally:
        safe_unlink(temp_path)


# ==============================================================================
# ENDPOINT 9: AI QUOTA (GET /api/v1/ai/quota)
# ==============================================================================

@ai_router.get(
    "/quota",
    response={
        200: AIQuotaOut,
        401: AIErrorResponse
    }
)
def get_user_quota_endpoint(request):
    """
    Returns current account AI quota, usage count, remaining requests, and consent status.
    """
    user = require_authenticated_user(request)
    summary = get_user_quota_summary(user)

    consent_given = bool(getattr(user.ai_quota, 'consent_given_at', None))
    consent_policy_ver = getattr(user.ai_quota, 'consent_policy_version', '')

    return 200, {
        "success": True,
        "total_allowed": summary["total"],
        "used_count": summary["used"],
        "remaining": summary["remaining"],
        "is_blocked": summary["is_blocked"],
        "active_reservations": summary.get("active_reservations", 0),
        "consent_given": consent_given,
        "consent_policy_version": consent_policy_ver
    }


# ==============================================================================
# ENDPOINTS 4-8: FULLY OPERATIONAL AI DOCUMENT PROCESSORS
# ==============================================================================

def _execute_generic_ai_processor(
    request,
    processor_class,
    file: Optional[UploadedFile],
    consent: Optional[bool],
    idempotency_key: Optional[str],
    tool_name: str,
    **extra_kwargs
):
    if not file:
        return 501, {
            "success": False,
            "code": "FEATURE_NOT_READY",
            "tool": tool_name,
            "message": f"{tool_name} requires a PDF file upload.",
            "expected_phase": "Phase 5"
        }

    user = get_authenticated_user(request)
    if not user:
        # Instant guest fallback for seamless access
        user = User.objects.filter(email__endswith="@simatrix.local").order_by('-created_at').first()
        if not user:
            guest_id = uuid.uuid4().hex[:6]
            user = User.objects.create(
                email=f"guest_{guest_id}@simatrix.local",
                username=f"guest_{guest_id}",
                full_name="Guest User",
                role="user"
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])

    client_ip = get_client_ip(request)

    # Rate limits
    is_allowed, remaining, retry_after, rate_err = check_ai_rate_limits(request, user)
    if not is_allowed:
        if rate_err == "GUEST_PREVIEW_LIMIT":
            return 403, {
                "success": False,
                "code": "GUEST_PREVIEW_LIMIT",
                "message": "Guest preview limit reached. Sign in to continue.",
                "quota": {"used": 1, "limit": 1, "remaining": 0}
            }
        raise HttpError(429, rate_err)

    # Consent validation
    if not validate_and_record_consent(request, consent, user):
        return 400, {
            "success": False,
            "code": "AI_CONSENT_REQUIRED",
            "message": "User consent required for external AI processing.",
            "disclosure": AI_PRIVACY_DISCLOSURE
        }

    orig_name = file.name or "document.pdf"
    if not orig_name.lower().endswith('.pdf'):
        raise HttpError(400, "Invalid file format. Upload a valid PDF.")

    max_size = 25 * 1024 * 1024
    if file.size > max_size:
        raise HttpError(400, f"File size exceeds 25MB limit.")

    job_uuid = uuid.uuid4().hex
    temp_path = settings.UPLOADS_DIR / f"{job_uuid}_{tool_name}.pdf"

    try:
        with open(temp_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        extracted_doc = extract_document(str(temp_path), max_size_bytes=max_size, max_pages=100)
        idem_key = idempotency_key or request.headers.get("X-Simatrix-Idempotency-Key") or f"{tool_name}_{job_uuid}"

        processor = processor_class()
        result = processor.execute(
            user=user,
            document=extracted_doc,
            idempotency_key=idem_key,
            router=global_ai_router,
            ip_address=client_ip,
            **extra_kwargs
        )
        return 200, result

    except QuotaExceededException as qe:
        return 400, {
            "success": False,
            "code": "AI_LIMIT_REACHED",
            "message": str(qe),
            "quota": qe.details
        }
    except PasswordProtectedPdfError as pe:
        raise HttpError(400, str(pe))
    except ScannedPdfError as se:
        raise HttpError(400, str(se))
    except EmptyPdfError as ee:
        raise HttpError(400, str(ee))
    except InvalidPdfError as ie:
        raise HttpError(400, str(ie))
    except AIProviderRateLimitError as err:
        raise HttpError(429, f"AI provider rate limit: {str(err)}")
    except AIProviderTimeoutError as err:
        raise HttpError(504, f"AI provider timed out: {str(err)}")
    except AIProviderAuthenticationError as err:
        raise HttpError(502, f"AI provider authentication failed: {str(err)}")
    except AIProviderServiceUnavailableError as err:
        raise HttpError(503, f"AI provider service unavailable: {str(err)}")
    except Exception as exc:
        logger.error(f"Error in {tool_name}: {exc}", exc_info=True)
        raise HttpError(500, f"Internal processing error: {str(exc)}")
    finally:
        safe_unlink(temp_path)


@ai_router.post(
    "/key-points",
    response={
        200: AIKeyPointsOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        429: AIErrorResponse,
        501: AIFeatureNotReadyOut,
        502: AIErrorResponse,
        503: AIErrorResponse
    }
)
def key_points_endpoint(
    request,
    file: Optional[UploadedFile] = File(None),
    consent: Optional[bool] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """Extracts structured key takeaways, metrics, and action items."""
    return _execute_generic_ai_processor(
        request=request,
        processor_class=KeyPointsProcessor,
        file=file,
        consent=consent,
        idempotency_key=idempotency_key,
        tool_name="key-points"
    )


@ai_router.post(
    "/extract-data",
    response={
        200: AIDataExtractorOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        429: AIErrorResponse,
        501: AIFeatureNotReadyOut,
        502: AIErrorResponse,
        503: AIErrorResponse
    }
)
def extract_data_endpoint(
    request,
    file: Optional[UploadedFile] = File(None),
    consent: Optional[bool] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """Extracts tabular metrics and key-value structured data."""
    return _execute_generic_ai_processor(
        request=request,
        processor_class=DataExtractorProcessor,
        file=file,
        consent=consent,
        idempotency_key=idempotency_key,
        tool_name="extract-data"
    )


@ai_router.post(
    "/generate-qns",
    response={
        200: AIQuestionGeneratorOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        429: AIErrorResponse,
        501: AIFeatureNotReadyOut,
        502: AIErrorResponse,
        503: AIErrorResponse
    }
)
def generate_questions_endpoint(
    request,
    file: Optional[UploadedFile] = File(None),
    consent: Optional[bool] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """Generates quizzes, multiple choice questions, and study cards."""
    return _execute_generic_ai_processor(
        request=request,
        processor_class=QuestionGeneratorProcessor,
        file=file,
        consent=consent,
        idempotency_key=idempotency_key,
        tool_name="generate-qns"
    )


@ai_router.post(
    "/rewrite",
    response={
        200: AIRewriterOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        429: AIErrorResponse,
        501: AIFeatureNotReadyOut,
        502: AIErrorResponse,
        503: AIErrorResponse
    }
)
def rewrite_endpoint(
    request,
    file: Optional[UploadedFile] = File(None),
    style: Optional[str] = Form("professional"),
    consent: Optional[bool] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """Rewrites document text in chosen tone/style (professional, casual, etc.)."""
    return _execute_generic_ai_processor(
        request=request,
        processor_class=RewriterProcessor,
        file=file,
        consent=consent,
        idempotency_key=idempotency_key,
        tool_name="rewrite",
        style=style or "professional"
    )


@ai_router.post(
    "/compare",
    response={
        200: AIComparisonOut,
        400: AIErrorResponse,
        401: AIErrorResponse,
        403: AIErrorResponse,
        429: AIErrorResponse,
        501: AIFeatureNotReadyOut,
        502: AIErrorResponse,
        503: AIErrorResponse
    }
)
def compare_endpoint(
    request,
    file: Optional[UploadedFile] = File(None),
    file2: Optional[UploadedFile] = File(None),
    consent: Optional[bool] = Form(None),
    idempotency_key: Optional[str] = Form(None)
):
    """Performs structural and semantic comparison between PDF documents."""
    doc2_text = ""
    temp2_path = None
    if file2:
        try:
            temp2_path = settings.UPLOADS_DIR / f"{uuid.uuid4().hex}_comp2.pdf"
            with open(temp2_path, 'wb') as dest:
                for chunk in file2.chunks():
                    dest.write(chunk)
            doc2 = extract_document(str(temp2_path), max_size_bytes=25 * 1024 * 1024, max_pages=100)
            doc2_text = doc2.full_text
        except Exception as e:
            logger.warning(f"Failed to extract document 2: {e}")
        finally:
            if temp2_path:
                safe_unlink(temp2_path)

    return _execute_generic_ai_processor(
        request=request,
        processor_class=ComparisonProcessor,
        file=file,
        consent=consent,
        idempotency_key=idempotency_key,
        tool_name="compare",
        doc2_text=doc2_text
    )

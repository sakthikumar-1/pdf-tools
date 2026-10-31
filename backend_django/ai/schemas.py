"""
Django Ninja Schemas for Simatrix AI Document Intelligence Suite.
Standardizes request parameters and response serialization across all AI tools.
"""

from typing import Optional, List, Dict, Any
from ninja import Schema


class AISummarizeOut(Schema):
    success: bool
    mode: Optional[str] = "quick"
    summary: Optional[str] = ""
    page_count: Optional[int] = 1
    char_count: Optional[int] = 0
    word_count: Optional[int] = 0
    estimated_reading_time_minutes: Optional[int] = 1
    processing_time_ms: Optional[int] = 0
    is_chunked: Optional[bool] = False
    warning: Optional[str] = None
    provider: Optional[str] = "ai"
    model: Optional[str] = "ai-model"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIChatMessageOut(Schema):
    id: str
    role: str
    content: str
    cited_pages: List[int] = []
    created_at: str


class AIChatPdfOut(Schema):
    success: bool
    session_id: Optional[str] = ""
    query: Optional[str] = ""
    answer: Optional[str] = ""
    cited_pages: List[int] = []
    is_grounded: Optional[bool] = True
    page_count: Optional[int] = 1
    processing_time_ms: Optional[int] = 0
    provider: Optional[str] = "ai"
    model: Optional[str] = "ai-model"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIChatSessionDetailOut(Schema):
    success: bool
    session_id: str
    document_name: str
    document_sha256: str
    page_count: int
    is_active: bool
    expires_at: str
    messages: List[AIChatMessageOut] = []


class AITranslateOut(Schema):
    success: bool
    target_language: Optional[str] = "tamil"
    translated_text: Optional[str] = ""
    page_count: Optional[int] = 1
    char_count: Optional[int] = 0
    word_count: Optional[int] = 0
    processing_time_ms: Optional[int] = 0
    download_url: Optional[str] = None
    download_token: Optional[str] = None
    notice: Optional[str] = None
    provider: Optional[str] = "ai"
    model: Optional[str] = "ai-model"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIQuotaOut(Schema):
    success: bool
    total_allowed: int
    used_count: int
    remaining: int
    is_blocked: bool
    active_reservations: int = 0
    consent_given: bool = False
    consent_policy_version: str = ""


class AIFeatureNotReadyOut(Schema):
    success: bool = False
    code: str = "FEATURE_NOT_READY"
    tool: str
    message: str
    expected_phase: str = "Phase 5"


class AIErrorResponse(Schema):
    success: bool = False
    code: str
    message: str
    detail: Optional[str] = None
    quota: Optional[Dict[str, Any]] = None
    disclosure: Optional[str] = None


class AIKeyPointsOut(Schema):
    success: bool = True
    content: Optional[str] = None
    key_takeaways: Optional[List[str]] = None
    critical_dates: Optional[List[str]] = None
    metrics: Optional[List[str]] = None
    action_items: Optional[List[str]] = None
    page_count: Optional[int] = 1
    provider: Optional[str] = "demo"
    model: Optional[str] = "v1"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIDataExtractorOut(Schema):
    success: bool = True
    content: Optional[str] = None
    tables: Optional[List[Dict[str, Any]]] = None
    key_values: Optional[Dict[str, Any]] = None
    page_count: Optional[int] = 1
    provider: Optional[str] = "demo"
    model: Optional[str] = "v1"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIQuestionGeneratorOut(Schema):
    success: bool = True
    content: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None
    page_count: Optional[int] = 1
    provider: Optional[str] = "demo"
    model: Optional[str] = "v1"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIRewriterOut(Schema):
    success: bool = True
    style: Optional[str] = "professional"
    rewritten_text: Optional[str] = None
    page_count: Optional[int] = 1
    provider: Optional[str] = "demo"
    model: Optional[str] = "v1"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None


class AIComparisonOut(Schema):
    success: bool = True
    comparison: Optional[str] = None
    differences_summary: Optional[str] = None
    additions: Optional[List[str]] = None
    deletions: Optional[List[str]] = None
    modifications: Optional[List[str]] = None
    provider: Optional[str] = "demo"
    model: Optional[str] = "v1"
    quota: Optional[Dict[str, Any]] = None
    is_demo: Optional[bool] = False
    quota_deducted: Optional[bool] = True
    status: Optional[str] = None
    message: Optional[str] = None

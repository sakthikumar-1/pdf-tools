"""
Base AI Processor Framework for Simatrix PDF.
Unifies document ingestion, prompt injection isolation, AI routing,
and two-phase transactional quota settlement across all AI tools.
"""

import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple

from django.conf import settings
from apps.authentication.models import User
from ..document_engine import ExtractedDocument
from ..chunker import DocumentChunk, chunk_document
from ..router import ai_router, AIProviderRouter
from ..provider_base import AIResponse, AIProviderException
from ..quota import (
    reserve_slot,
    renew_reservation,
    settle_reservation,
    get_user_quota_summary,
    QuotaExceededException
)
from ..demo_data import is_official_demo_hash

logger = logging.getLogger(__name__)


class BaseAIProcessor(ABC):
    """
    Abstract base processor for all Simatrix AI document tools.
    Standardizes quota reservation, LLM invocation via router,
    and official demo document bypass.
    """

    @property
    @abstractmethod
    def tool_type(self) -> str:
        """Identifier for the AI tool (e.g., 'summarizer', 'chat', 'translate')."""
        pass

    @abstractmethod
    def process_live(
        self,
        document: ExtractedDocument,
        router: AIProviderRouter,
        reservation_id: str,
        **kwargs
    ) -> Tuple[Dict[str, Any], AIResponse]:
        """
        Executes the tool-specific LLM analysis using the shared router.
        Must periodically invoke renew_reservation() during multi-chunk jobs.
        Returns: Tuple[result_dict, primary_or_final_ai_response]
        """
        pass

    @abstractmethod
    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        """Returns pre-computed verified demo response for official demo papers."""
        pass

    @staticmethod
    def wrap_document_context(text: str, pages: Optional[List[int]] = None) -> str:
        """
        Encapsulates document text inside structural XML boundaries
        as a defense-in-depth safeguard against prompt injection.
        """
        pages_attr = f' pages="{", ".join(str(p) for p in pages)}"' if pages else ""
        return (
            f"<document_context{pages_attr}>\n"
            f"{text}\n"
            f"</document_context>"
        )

    def execute(
        self,
        user: User,
        document: ExtractedDocument,
        idempotency_key: str,
        router: Optional[AIProviderRouter] = None,
        ip_address: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Universal execution workflow:
        1. Checks for official demo document -> returns precomputed result (0 quota).
        2. Phase 1: Reserves quota slot atomically (< 5ms).
        3. Phase 2: Performs AI inference outside DB transaction.
        4. Phase 3: Settles quota reservation atomically (< 5ms).
        """
        active_router = router or ai_router

        # 1. Official Demo Document Detection (Zero Quota Deduction)
        if is_official_demo_hash(document.sha256):
            logger.info(f"[AIProcessor] Verified official demo document hash: {document.sha256}. Serving cached demo response.")
            demo_out = self.get_demo_result(document, **kwargs)
            quota_info = get_user_quota_summary(user)
            demo_out["success"] = True
            demo_out.setdefault("is_chunked", False)
            demo_out.setdefault("is_grounded", True)
            demo_out.setdefault("processing_time_ms", 15)
            demo_out.setdefault("query", kwargs.get("query", ""))
            demo_out.setdefault("page_count", document.page_count or 1)
            demo_out["quota"] = quota_info
            demo_out["is_demo"] = True
            demo_out["quota_deducted"] = False
            return demo_out

        # 2. Phase 1: Atomic Quota Reservation
        reservation, created, state = reserve_slot(
            user=user,
            idempotency_key=idempotency_key,
            tool_type=self.tool_type
        )

        if not created and state == "CONSUMED":
            # Idempotent replay: already completed
            quota_info = get_user_quota_summary(user)
            return {
                "success": True,
                "status": "ALREADY_COMPLETED",
                "message": "This operation was already completed previously.",
                "quota": quota_info
            }

        # 3. Phase 2: AI Inference (Zero DB Locks Held)
        ai_resp: Optional[AIResponse] = None
        try:
            result_payload, ai_resp = self.process_live(
                document=document,
                router=active_router,
                reservation_id=str(reservation.id),
                **kwargs
            )

            # 4. Phase 3: Settle Success
            settle_info = settle_reservation(
                reservation_id=reservation.id,
                success=True,
                ai_response=ai_resp,
                tool_type=self.tool_type,
                ip_address=ip_address
            )

            result_payload["success"] = True
            result_payload["quota"] = settle_info.get("quota", get_user_quota_summary(user))
            result_payload["is_demo"] = False
            result_payload["quota_deducted"] = True
            result_payload["provider"] = ai_resp.provider
            result_payload["model"] = ai_resp.model

            return result_payload

        except Exception as exc:
            # Settle Failure / Rollback slot
            logger.error(f"[AIProcessor] Execution failed for tool {self.tool_type}: {exc}", exc_info=True)
            settle_reservation(
                reservation_id=reservation.id,
                success=False,
                ai_response=ai_resp,
                error_message=str(exc),
                tool_type=self.tool_type,
                ip_address=ip_address
            )
            raise exc


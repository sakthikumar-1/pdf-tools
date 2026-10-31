"""
Production AI Summarizer Processor for Simatrix PDF.
Supports Quick, Detailed, Key Points, and Section-by-Section summarization.
Handles single-pass and multi-chunk Map-Reduce with heartbeat quota lease renewal.
"""

import time
import logging
from typing import Dict, Any, Tuple, Optional, List

from ..document_engine import ExtractedDocument
from ..chunker import DocumentChunk, chunk_document
from ..router import AIProviderRouter
from ..provider_base import AIResponse
from ..prompts import (
    SYSTEM_PROMPT,
    get_summary_prompt,
    get_chunk_summary_prompt,
    get_synthesis_prompt
)
from ..demo_data import get_demo_summary
from ..quota import renew_reservation
from .base import BaseAIProcessor

logger = logging.getLogger(__name__)

SINGLE_PASS_TOKEN_THRESHOLD = 3500


class SummarizerProcessor(BaseAIProcessor):
    """Processor powering the AI Summarizer tool."""

    @property
    def tool_type(self) -> str:
        return "summarizer"

    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        mode = kwargs.get("mode", "quick")
        return get_demo_summary(doc_key=document.sha256, mode=mode)

    def process_live(
        self,
        document: ExtractedDocument,
        router: AIProviderRouter,
        reservation_id: str,
        **kwargs
    ) -> Tuple[Dict[str, Any], AIResponse]:
        start_time = time.time()
        mode = (kwargs.get("mode") or "quick").lower().strip()
        valid_modes = ("quick", "detailed", "key_points", "section_by_section")
        if mode not in valid_modes:
            mode = "quick"

        total_tokens = document.estimated_tokens
        final_summary = ""
        last_ai_response: Optional[AIResponse] = None
        is_chunked = False

        if total_tokens <= SINGLE_PASS_TOKEN_THRESHOLD:
            # Single-pass execution
            logger.info(f"[SummarizerProcessor] Single-pass execution for {document.page_count} pages (~{total_tokens} tokens)")
            prompt = get_summary_prompt(mode, document.full_text)
            wrapped_prompt = self.wrap_document_context(prompt)

            last_ai_response, _ = router.execute(
                prompt=wrapped_prompt,
                system_prompt=SYSTEM_PROMPT,
                max_tokens=1500,
                temperature=0.3
            )
            final_summary = last_ai_response.content

        else:
            # Multi-chunk Map-Reduce execution
            is_chunked = True
            chunks = chunk_document(document, target_tokens=2000, overlap_tokens=150)
            logger.info(f"[SummarizerProcessor] Map-reduce execution across {len(chunks)} chunks for {document.page_count} pages")

            intermediate_summaries: List[str] = []
            for idx, chunk in enumerate(chunks, 1):
                # Send heartbeat renewal before each chunk LLM invocation
                renew_reservation(reservation_id, extension_seconds=60)

                chunk_prompt = get_chunk_summary_prompt(idx, len(chunks), chunk.text)
                wrapped_chunk = self.wrap_document_context(chunk_prompt, pages=chunk.pages)

                chunk_resp, _ = router.execute(
                    prompt=wrapped_chunk,
                    system_prompt=SYSTEM_PROMPT,
                    max_tokens=800,
                    temperature=0.2
                )
                intermediate_summaries.append(chunk_resp.content)
                last_ai_response = chunk_resp

            # Final Synthesis Pass
            renew_reservation(reservation_id, extension_seconds=60)
            synthesis_prompt = get_synthesis_prompt(mode, intermediate_summaries, document.page_count)
            synthesis_resp, _ = router.execute(
                prompt=synthesis_prompt,
                system_prompt=SYSTEM_PROMPT,
                max_tokens=1500,
                temperature=0.3
            )
            final_summary = synthesis_resp.content
            last_ai_response = synthesis_resp

        exec_ms = max(1, int((time.time() - start_time) * 1000))
        word_count = len(final_summary.split())
        reading_time = max(1, word_count // 200)

        result_payload = {
            "mode": mode,
            "summary": final_summary,
            "page_count": document.page_count,
            "char_count": len(final_summary),
            "word_count": word_count,
            "estimated_reading_time_minutes": reading_time,
            "processing_time_ms": exec_ms,
            "is_chunked": is_chunked,
            "warning": document.warning
        }

        return result_payload, last_ai_response


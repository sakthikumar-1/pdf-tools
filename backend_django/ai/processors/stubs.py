"""
Architecture Scaffolding and Interfaces for Remaining Five AI Processors.
4. KeyPointsProcessor
5. DataExtractorProcessor
6. QuestionGeneratorProcessor
7. RewriterProcessor
8. ComparisonProcessor

Shares common document processing, chunking, AI routing, and quota settlement.
"""

import time
import json
import re
import logging
from typing import Dict, Any, Tuple, Optional

from ..document_engine import ExtractedDocument
from ..router import AIProviderRouter
from ..provider_base import AIResponse
from .base import BaseAIProcessor

logger = logging.getLogger(__name__)


class KeyPointsProcessor(BaseAIProcessor):
    """Processor 4: Key Points, Figures, and Action Items Extractor."""
    @property
    def tool_type(self) -> str:
        return "key_points"

    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        return {
            "is_demo": True,
            "quota_deducted": False,
            "key_takeaways": [
                "Simatrix PDF enforces strict 5-request account limits via MySQL InnoDB row locks.",
                "Multi-provider router seamlessly fails over from DeepSeek to Google Gemini on 429/5xx.",
                "100% digital text fidelity with zero regressions on existing 19 PDF utilities."
            ],
            "critical_dates": ["October 2026 - Production Release"],
            "metrics": ["5 requests/user", "81 automated tests passed", "100% test pass rate"],
            "action_items": ["Proceed with remaining AI processors after Phase 3C approval."]
        }

    def process_live(self, document: ExtractedDocument, router: AIProviderRouter, reservation_id: str, **kwargs) -> Tuple[Dict[str, Any], AIResponse]:
        wrapped = self.wrap_document_context(document.full_text)
        prompt = (
            f"Extract structured key points from this document:\n"
            f"1. Core Takeaways (3-5 bullets)\n"
            f"2. Critical Dates & Deadlines\n"
            f"3. Key Metrics, Figures & Statistics\n"
            f"4. Action Items & Next Steps\n\n"
            f"{wrapped}"
        )
        resp, _ = router.execute(prompt=prompt, max_tokens=1200, temperature=0.2)
        parsed = {"content": resp.content, "page_count": document.page_count}
        try:
            match = re.search(r'\{.*\}', resp.content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                if isinstance(data, dict):
                    parsed["key_takeaways"] = data.get("key_points") or data.get("key_takeaways") or []
                    parsed["critical_dates"] = data.get("dates") or data.get("critical_dates") or []
                    parsed["metrics"] = data.get("metrics") or []
                    parsed["action_items"] = data.get("action_items") or []
        except Exception:
            pass
        return parsed, resp


class DataExtractorProcessor(BaseAIProcessor):
    """Processor 5: Tabular and Key-Value Data Extractor."""
    @property
    def tool_type(self) -> str:
        return "extract_data"

    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        return {
            "is_demo": True,
            "quota_deducted": False,
            "tables": [
                {
                    "title": "Quarterly Financial Overview",
                    "headers": ["Department", "Q1", "Q2", "Total"],
                    "rows": [
                        ["Engineering", "$125,000", "$145,000", "$270,000"],
                        ["Marketing", "$85,000", "$92,000", "$177,000"],
                        ["Operations", "$210,000", "$235,000", "$445,000"]
                    ]
                }
            ],
            "key_values": {"Total Revenue": "$892,000", "Currency": "USD"}
        }

    def process_live(self, document: ExtractedDocument, router: AIProviderRouter, reservation_id: str, **kwargs) -> Tuple[Dict[str, Any], AIResponse]:
        wrapped = self.wrap_document_context(document.full_text)
        prompt = f"Extract all tables, financial values, and key-value metrics from this document as Markdown tables:\n\n{wrapped}"
        resp, _ = router.execute(prompt=prompt, max_tokens=1500, temperature=0.1)
        parsed = {"content": resp.content, "page_count": document.page_count}
        try:
            match = re.search(r'\{.*\}', resp.content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                if isinstance(data, dict):
                    parsed["tables"] = data.get("tables") or []
                    kv = data.get("key_values") or {}
                    if not kv and "entities" in data:
                        kv = {e.get("name"): e.get("value") for e in data.get("entities", []) if isinstance(e, dict) and e.get("name")}
                    parsed["key_values"] = kv
        except Exception:
            pass
        return parsed, resp


class QuestionGeneratorProcessor(BaseAIProcessor):
    """Processor 6: Study Questions, MCQs, and Flashcards Generator."""
    @property
    def tool_type(self) -> str:
        return "generate_questions"

    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        return {
            "is_demo": True,
            "quota_deducted": False,
            "questions": [
                {
                    "question": "What is the primary AI provider used in Simatrix PDF?",
                    "options": ["DeepSeek API", "Google Gemini", "OpenAI GPT-4", "Claude 3.5"],
                    "correct_answer": "DeepSeek API",
                    "explanation": "DeepSeek is the primary provider with Google Gemini acting as automatic fallback [Page 1]."
                }
            ]
        }

    def process_live(self, document: ExtractedDocument, router: AIProviderRouter, reservation_id: str, **kwargs) -> Tuple[Dict[str, Any], AIResponse]:
        wrapped = self.wrap_document_context(document.full_text)
        prompt = f"Generate 5 Multiple Choice Questions with explanations based on this document:\n\n{wrapped}"
        resp, _ = router.execute(prompt=prompt, max_tokens=1500, temperature=0.3)
        parsed = {"content": resp.content, "page_count": document.page_count}
        try:
            match = re.search(r'\{.*\}', resp.content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                if isinstance(data, dict):
                    parsed["questions"] = data.get("questions") or []
                    parsed["study_cards"] = data.get("study_cards") or []
        except Exception:
            pass
        return parsed, resp


class RewriterProcessor(BaseAIProcessor):
    """Processor 7: Document Rewriter in Multiple Tone Styles."""
    @property
    def tool_type(self) -> str:
        return "rewrite"

    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        style = kwargs.get("style", "professional")
        return {
            "is_demo": True,
            "quota_deducted": False,
            "style": style,
            "rewritten_text": "The Simatrix PDF platform provides an enterprise-ready document intelligence engine with guaranteed data safety."
        }

    def process_live(self, document: ExtractedDocument, router: AIProviderRouter, reservation_id: str, **kwargs) -> Tuple[Dict[str, Any], AIResponse]:
        style = kwargs.get("style", "professional")
        wrapped = self.wrap_document_context(document.full_text)
        prompt = f"Rewrite this document text in a {style} style while maintaining all facts, figures, and page markers:\n\n{wrapped}"
        resp, _ = router.execute(prompt=prompt, max_tokens=1800, temperature=0.3)
        parsed = {"style": style, "rewritten_text": resp.content, "page_count": document.page_count}
        try:
            match = re.search(r'\{.*\}', resp.content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                if isinstance(data, dict) and "rewritten_text" in data:
                    parsed["rewritten_text"] = data["rewritten_text"]
        except Exception:
            pass
        return parsed, resp


class ComparisonProcessor(BaseAIProcessor):
    """Processor 8: Dual-PDF Structural and Semantic Comparison."""
    @property
    def tool_type(self) -> str:
        return "compare"

    def get_demo_result(self, document: ExtractedDocument, **kwargs) -> Dict[str, Any]:
        return {
            "is_demo": True,
            "quota_deducted": False,
            "differences_summary": "Document comparison shows structural alignment with 100% parity across core sections.",
            "additions": ["Enhanced error handling"],
            "deletions": [],
            "modifications": ["Updated version number to 2.0"]
        }

    def process_live(self, document: ExtractedDocument, router: AIProviderRouter, reservation_id: str, **kwargs) -> Tuple[Dict[str, Any], AIResponse]:
        doc2_text = kwargs.get("doc2_text", "")
        prompt = f"Compare Document 1 against Document 2 and summarize the structural and semantic changes:\n\nDoc 1:\n{document.full_text[:3000]}\n\nDoc 2:\n{doc2_text[:3000]}"
        resp, _ = router.execute(prompt=prompt, max_tokens=1500, temperature=0.2)
        parsed = {
            "differences_summary": resp.content,
            "page_count": document.page_count,
            "additions": [],
            "deletions": [],
            "modifications": []
        }
        try:
            match = re.search(r'\{.*\}', resp.content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                if isinstance(data, dict):
                    diffs = data.get("differences", [])
                    for d in diffs:
                        if isinstance(d, dict):
                            t = d.get("type", "modification")
                            desc = d.get("description", str(d))
                            if t == "addition":
                                parsed["additions"].append(desc)
                            elif t == "deletion":
                                parsed["deletions"].append(desc)
                            else:
                                parsed["modifications"].append(desc)
                    if "summary" in data:
                        parsed["differences_summary"] = data["summary"]
        except Exception:
            pass
        return parsed, resp

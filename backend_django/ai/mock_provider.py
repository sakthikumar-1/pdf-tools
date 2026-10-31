"""
Mock AI Provider for deterministic testing, offline development, and zero-cost test execution.
"""

import re
import time
from typing import Optional
from .provider_base import (
    BaseAIProvider,
    AIResponse,
    AIProviderTimeoutError,
    AIProviderRateLimitError,
    AIProviderServiceUnavailableError,
    AIProviderInvalidRequestError
)


class MockAIProvider(BaseAIProvider):
    """
    Mock AI Provider producing realistic, deterministic summaries based on document text.
    Used for automated test suites, CI/CD pipelines, and local development.
    """

    def __init__(self, simulate_error: Optional[str] = None):
        self._simulate_error = simulate_error

    @property
    def name(self) -> str:
        return "mock"

    @property
    def model(self) -> str:
        return "mock-summarizer-v1"

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1500,
        temperature: float = 0.3
    ) -> AIResponse:
        start_time = time.time()

        if self._simulate_error == "timeout":
            raise AIProviderTimeoutError("Mock provider request timed out after 30 seconds.")
        elif self._simulate_error == "rate_limit":
            raise AIProviderRateLimitError("Mock provider quota exceeded (HTTP 429).")
        elif self._simulate_error == "server_error":
            raise AIProviderServiceUnavailableError("Mock provider service unavailable (HTTP 503).")
        elif self._simulate_error == "invalid_request":
            raise AIProviderInvalidRequestError("Mock provider invalid request parameters (HTTP 400).")

        # Extract text within <document_content>...</document_content> or <document_context>...</document_context>
        match = re.search(r"<(?:document_content|document_context)>(.*?)</(?:document_content|document_context)>", prompt, re.DOTALL)
        content = match.group(1).strip() if match else prompt

        # Determine requested mode from prompt instructions
        prompt_lower = prompt.lower()
        if "detailed summary" in prompt_lower or "### 1. executive overview" in prompt_lower:
            mode = "detailed"
        elif "key points" in prompt_lower or "structured bulleted list" in prompt_lower:
            mode = "key_points"
        elif "section-by-section" in prompt_lower:
            mode = "section_by_section"
        else:
            mode = "quick"

        # Extract basic sentences and keywords from content for realistic synthesis
        lines = [line.strip() for line in content.split("\n") if line.strip() and not line.startswith("---")]
        sample_title = lines[0] if lines else "Document"
        sample_body = " ".join(lines[:6]) if lines else "Document content is present and verified."

        if mode == "quick":
            text = (
                f"### Executive Overview\n"
                f"This document focuses on {sample_title}. It outlines critical background context, primary operational goals, "
                f"and strategic directions relevant to the organization.\n\n"
                f"### Key Findings\n"
                f"The analysis demonstrates substantial progress across core metrics. Specifically, {sample_body[:180]}... "
                f"The findings highlight high consistency and adherence to established operational standards.\n\n"
                f"### Conclusion\n"
                f"In conclusion, the document establishes clear next steps and actionable recommendations to maintain quality and performance."
            )

        elif mode == "detailed":
            text = (
                f"### 1. Executive Overview & Context\n"
                f"The document titled '{sample_title}' establishes comprehensive operational parameters. "
                f"It serves as a primary reference guide for evaluating key deliverables and procedural benchmarks.\n\n"
                f"### 2. Key Methodologies, Principles & Arguments\n"
                f"The approach is grounded in rigorous document processing standards and coordinate accuracy. "
                f"Key arguments emphasize systematic layout retention, security boundaries, and data fidelity.\n\n"
                f"### 3. Comprehensive Findings & Metrics\n"
                f"- **Primary Subject**: {sample_title}\n"
                f"- **Data Continuity**: High-fidelity extraction across all identified document pages.\n"
                f"- **Observed Elements**: {sample_body[:220]}...\n\n"
                f"### 4. Critical Caveats & Constraints\n"
                f"All observations are contingent upon document integrity, verified digital typography, and appropriate system configurations.\n\n"
                f"### 5. Conclusions & Strategic Implications\n"
                f"The document provides a robust framework supporting full audit compliance and ongoing technical milestones."
            )

        elif mode == "key_points":
            text = (
                f"### Major Highlights\n"
                f"- **Core Subject**: Focuses primarily on {sample_title}.\n"
                f"- **Document Integrity**: Validated digital text streams with structured page separation.\n\n"
                f"### Critical Findings & Metrics\n"
                f"- **Operational Flow**: {sample_body[:160]}...\n"
                f"- **Targeted Performance**: Verified complete data preservation without loss of layout or figures.\n\n"
                f"### Strategic Next Steps\n"
                f"- **Implementation**: Immediate execution according to documented guidelines.\n"
                f"- **Compliance**: Periodic review to ensure continuous alignment with standards."
            )

        elif mode == "section_by_section":
            text = (
                f"### Section 1: Overview & Initial Findings\n"
                f"- Introduces {sample_title} and outlines initial scope.\n"
                f"- Sets forth foundational metrics and procedural goals.\n\n"
                f"### Section 2: Detailed Analysis & Content\n"
                f"- Evaluates core subject matter: {sample_body[:180]}...\n"
                f"- Examines relevant constraints and comparative observations.\n\n"
                f"### Section 3: Summary of Outcomes\n"
                f"- Synthesizes final results and confirms all milestones are addressed.\n"
                f"- Provides sign-off for next phase actions."
            )
        else:
            text = f"Summary of {sample_title}: {sample_body[:250]}"

        exec_ms = max(1, int((time.time() - start_time) * 1000))
        prompt_tokens = max(1, len(prompt) // 4)
        completion_tokens = max(1, len(text) // 4)

        return AIResponse(
            content=text,
            provider="mock",
            model="mock-summarizer-v1",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            execution_time_ms=exec_ms,
            raw_metadata={"simulated": True}
        )

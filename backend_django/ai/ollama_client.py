"""
Local Ollama AI Client for Simatrix AI Workspace.
Communicates with the host Ollama runtime (default: http://127.0.0.1:11434)
using llama3.2:3b for natural language intent interpretation.
Strictly enforces server-side allowlists and never executes arbitrary commands.
"""

import json
import logging
import socket
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, Set
from django.conf import settings

logger = logging.getLogger(__name__)

# Strict Phase 1 Tool Allowlist
ALLOWED_TOOLS: Set[str] = {
    'pdf_to_jpg',
    'pdf_to_word',
    'summarize_pdf'
}

TOOL_METADATA: Dict[str, Dict[str, Any]] = {
    'pdf_to_jpg': {
        'name': 'PDF to JPG',
        'action_label': 'Convert to JPG Images',
        'default_params': {'dpi': 150},
        'allowed_params': {'dpi': [72, 150, 300]},
        'description': 'Convert PDF pages into high-resolution JPG images.'
    },
    'pdf_to_word': {
        'name': 'PDF to Word',
        'action_label': 'Convert to Word (.docx)',
        'default_params': {},
        'allowed_params': {},
        'description': 'Convert PDF document into editable Microsoft Word (.docx) format.'
    },
    'summarize_pdf': {
        'name': 'AI PDF Summarizer',
        'action_label': 'Summarize PDF Document',
        'default_params': {'mode': 'quick'},
        'allowed_params': {'mode': ['quick', 'detailed', 'key_points', 'section_by_section']},
        'description': 'Extract key insights, summaries, and executive overviews from PDF text.'
    }
}

SYSTEM_INTENT_PROMPT = """You are Simatrix AI PDF Assistant.
Your task is to analyze the user's natural language instruction and determine the single appropriate PDF tool.

Allowed tools strictly:
- "pdf_to_jpg": Convert PDF into JPG images / extract pages as JPG
- "pdf_to_word": Convert PDF into Word (.docx) document
- "summarize_pdf": Summarize, analyze, explain, or give key points of PDF content

Strict response requirements:
1. You MUST respond ONLY with a valid JSON object matching this exact schema:
{
  "tool": "pdf_to_jpg" | "pdf_to_word" | "summarize_pdf" | null,
  "requires_file": true,
  "confidence": 0.95,
  "explanation": "Clear one-sentence explanation of what will be performed",
  "parameters": {}
}
2. If the user request matches one of the 3 allowed tools, set "tool" to that exact name.
3. If the user requests anything else (e.g. delete pages, merge, split, rotate, general chat, external tasks), set "tool" to null.
4. "parameters" can include:
   - For pdf_to_jpg: {"dpi": 150} or {"dpi": 300} if high resolution requested
   - For summarize_pdf: {"mode": "quick" | "detailed" | "key_points" | "section_by_section"}
5. Never invent or suggest tool names outside the 3 allowed tools.
6. Do NOT output any markdown ticks, code blocks, or preamble. Return ONLY the raw JSON object."""


class OllamaClientException(Exception):
    """Base exception for all Ollama client errors."""
    pass


class OllamaUnavailableError(OllamaClientException):
    """Raised when Ollama server cannot be reached."""
    pass


class OllamaTimeoutError(OllamaClientException):
    """Raised when Ollama request times out."""
    pass


class OllamaModelNotFoundError(OllamaClientException):
    """Raised when the specified model is not pulled or available in Ollama."""
    pass


class OllamaResponseError(OllamaClientException):
    """Raised when Ollama returns an unexpected status code or malformed payload."""
    pass


class OllamaClient:
    """Client for local Ollama runtime with strict intent validation."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.base_url = (
            base_url
            or getattr(settings, 'OLLAMA_BASE_URL', None)
            or 'http://127.0.0.1:11434'
        ).rstrip('/')
        self.model = (
            model
            or getattr(settings, 'OLLAMA_MODEL', None)
            or 'llama3.2:3b'
        )
        self.timeout = int(
            timeout
            or getattr(settings, 'OLLAMA_TIMEOUT', None)
            or 35
        )

    def check_health(self) -> Dict[str, Any]:
        """
        Checks if the local Ollama runtime is reachable and whether the target model is installed.
        Returns status dictionary without throwing exceptions.
        """
        tags_url = f"{self.base_url}/api/tags"
        req = urllib.request.Request(
            tags_url,
            headers={"User-Agent": "Simatrix-PDF-Tools/1.0"}
        )
        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    models = [m.get('name') for m in data.get('models', [])]
                    # Check if target model or model with tag is present
                    has_model = any(
                        m == self.model or m.startswith(f"{self.model}:") or self.model.startswith(f"{m}:")
                        for m in models
                    )
                    return {
                        "available": True,
                        "model": self.model,
                        "model_installed": has_model,
                        "models_found": models,
                        "base_url": self.base_url
                    }
        except Exception as e:
            logger.debug(f"Ollama health check unreachable: {e}")
            return {
                "available": False,
                "model": self.model,
                "model_installed": False,
                "error": str(e),
                "base_url": self.base_url
            }

        return {
            "available": False,
            "model": self.model,
            "model_installed": False,
            "base_url": self.base_url
        }

    def interpret_intent(self, instruction: str) -> Dict[str, Any]:
        """
        Interprets natural language instruction via Ollama `llama3.2:3b`.
        Strictly parses and validates output against the Phase 1 allowlist.

        Returns:
            Dict containing:
                success: bool
                tool: Optional[str] (one of 'pdf_to_jpg', 'pdf_to_word', 'summarize_pdf', or None)
                requires_file: bool
                confidence: float
                explanation: str
                parameters: Dict[str, Any]
                is_supported: bool
                suggested_action: Optional[str]
                model: str
        """
        clean_prompt = (instruction or '').strip()
        if not clean_prompt:
            return {
                "success": False,
                "tool": None,
                "requires_file": False,
                "confidence": 0.0,
                "explanation": "Please provide an instruction describing what you would like to do with your PDF.",
                "parameters": {},
                "is_supported": False,
                "suggested_action": None,
                "model": self.model
            }

        endpoint = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "system": SYSTEM_INTENT_PROMPT,
            "prompt": clean_prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic classification
                "top_p": 0.9,
            }
        }

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Simatrix-PDF-Tools/1.0"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status != 200:
                    raise OllamaResponseError(f"Ollama returned HTTP status {resp.status}")
                raw_body = resp.read().decode('utf-8')
                data = json.loads(raw_body)
                raw_response = data.get("response", "{}").strip()

        except urllib.error.HTTPError as http_err:
            if http_err.code == 404:
                raise OllamaModelNotFoundError(
                    f"Configured model '{self.model}' was not found in Ollama. Please run `ollama pull {self.model}`."
                )
            raise OllamaResponseError(f"Ollama HTTP error {http_err.code}: {http_err.reason}")

        except (urllib.error.URLError, ConnectionRefusedError, socket.error) as conn_err:
            reason = getattr(conn_err, 'reason', str(conn_err))
            if isinstance(reason, socket.timeout) or "timed out" in str(conn_err).lower():
                raise OllamaTimeoutError(
                    f"Ollama request timed out after {self.timeout} seconds while processing instruction."
                )
            raise OllamaUnavailableError(
                f"Local Ollama service at {self.base_url} is unavailable. Please verify Ollama is running (`ollama serve`). Details: {reason}"
            )

        except (socket.timeout, TimeoutError) as to_err:
            raise OllamaTimeoutError(
                f"Ollama request timed out after {self.timeout} seconds while processing instruction."
            )

        except json.JSONDecodeError as json_err:
            raise OllamaResponseError(f"Failed to parse response from Ollama API: {str(json_err)}")

        # Parse LLM output
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            # Handle possible markdown wrapping ```json ... ```
            clean_str = raw_response.strip()
            if clean_str.startswith("```"):
                clean_str = clean_str.strip("`").strip()
                if clean_str.lower().startswith("json"):
                    clean_str = clean_str[4:].strip()
            try:
                parsed = json.loads(clean_str)
            except Exception:
                logger.warning(f"Ollama produced unparseable JSON: {raw_response}")
                parsed = {"tool": None, "explanation": "Unable to extract structured intent from instruction."}

        # Validate against strict server-side allowlist
        raw_tool = parsed.get("tool")
        if raw_tool and isinstance(raw_tool, str):
            raw_tool = raw_tool.strip().lower()

        # Strict allowlist check
        if raw_tool not in ALLOWED_TOOLS:
            is_supported = False
            tool = None
            explanation = (
                f"The requested operation '{raw_tool}' is not supported in Phase 1. "
                "Supported tools are: Convert PDF to JPG, Convert PDF to Word, and AI PDF Summarizer."
                if raw_tool else
                "The requested operation is not supported in Phase 1. Supported tools are: Convert PDF to JPG, Convert PDF to Word, and AI PDF Summarizer."
            )
            suggested_action = None
            parameters = {}
            confidence = float(parsed.get("confidence") or 0.5)
        else:
            is_supported = True
            tool = raw_tool
            meta = TOOL_METADATA[tool]
            suggested_action = meta['action_label']
            explanation = parsed.get("explanation") or meta['description']

            # Validate and clamp parameters
            raw_params = parsed.get("parameters") if isinstance(parsed.get("parameters"), dict) else {}
            parameters = dict(meta['default_params'])

            if tool == 'pdf_to_jpg':
                raw_dpi = raw_params.get("dpi")
                if raw_dpi in (72, 150, 300):
                    parameters['dpi'] = int(raw_dpi)
                elif isinstance(raw_dpi, (int, float)) and 72 <= raw_dpi <= 300:
                    parameters['dpi'] = int(raw_dpi)

            elif tool == 'summarize_pdf':
                raw_mode = raw_params.get("mode")
                if raw_mode in meta['allowed_params']['mode']:
                    parameters['mode'] = raw_mode

            confidence = max(0.0, min(1.0, float(parsed.get("confidence", 0.95))))

        requires_file = bool(parsed.get("requires_file", True)) if tool else bool(parsed.get("requires_file", False))

        return {
            "success": True,
            "tool": tool,
            "requires_file": requires_file,
            "confidence": round(confidence, 2),
            "explanation": explanation,
            "parameters": parameters,
            "is_supported": is_supported,
            "suggested_action": suggested_action,
            "model": self.model
        }


# Singleton client instance
ollama_client = OllamaClient()

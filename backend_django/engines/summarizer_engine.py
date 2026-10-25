"""
Production PDF Summarizer Engine for Simatrix PDF Tools.
Extracts text with page boundary preservation, detects scanned/encrypted/empty files,
and executes single-pass or map-reduce chunked summarization using configured AI providers.
"""

import os
import re
import time
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

import pymupdf as fitz
from django.conf import settings

from ai.provider_base import (
    BaseAIProvider,
    AIProviderException
)
from ai.factory import get_ai_provider
from ai.prompts import (
    SYSTEM_PROMPT,
    get_summary_prompt,
    get_chunk_summary_prompt,
    get_synthesis_prompt
)

logger = logging.getLogger(__name__)

# Constants
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB
MAX_PAGE_COUNT = 100
MAX_CHUNK_TOKENS = 3500  # Approx 14,000 characters
CHARS_PER_TOKEN = 4.0


class SummarizerEngineException(Exception):
    """Base exception for summarizer engine errors."""
    pass


class InvalidPdfError(SummarizerEngineException):
    """Raised when PDF file is invalid, corrupt, or unreadable."""
    pass


class PasswordProtectedPdfError(SummarizerEngineException):
    """Raised when PDF is encrypted or requires a password."""
    pass


class ScannedPdfError(SummarizerEngineException):
    """Raised when PDF is image-only or scanned and contains no digital text."""
    pass


class EmptyPdfError(SummarizerEngineException):
    """Raised when PDF document contains no pages or zero extractable text."""
    pass


class FileLimitExceededError(SummarizerEngineException):
    """Raised when PDF exceeds maximum size or page count limits."""
    pass


def extract_document_pages(file_path: str) -> Dict[str, Any]:
    """
    Extracts text from each page of a PDF document while tracking metadata,
    character counts, image counts, and identifying scanned or encrypted files.
    Always closes the PyMuPDF document handle in the finally block, which is
    critical on Windows to allow subsequent file deletion by safe_unlink.
    """
    path = Path(file_path)
    if not path.exists():
        raise InvalidPdfError("The specified PDF file does not exist.")

    file_size = path.stat().st_size
    if file_size > MAX_FILE_SIZE_BYTES:
        raise FileLimitExceededError(
            f"File size ({file_size} bytes) exceeds the maximum allowed limit of 25MB."
        )

    # Basic magic bytes validation (%PDF-) and read into memory to avoid OS file locking on Windows
    with open(path, 'rb') as f:
        file_bytes = f.read()

    if not file_bytes.startswith(b'%PDF-'):
        raise InvalidPdfError("Uploaded file is not a valid PDF document (missing %PDF- header).")

    doc = None
    try:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise InvalidPdfError(f"Failed to open PDF document: {str(exc)}")

        # Check password protection
        if doc.is_encrypted or doc.needs_pass:
            raise PasswordProtectedPdfError(
                "This PDF document is encrypted or password-protected. "
                "Please unlock or decrypt the document before generating an AI summary."
            )

        total_pages = len(doc)
        if total_pages == 0:
            raise EmptyPdfError("This PDF document contains 0 pages.")

        if total_pages > MAX_PAGE_COUNT:
            raise FileLimitExceededError(
                f"Document contains {total_pages} pages, exceeding the maximum limit of {MAX_PAGE_COUNT} pages."
            )

        pages = []
        total_text_length = 0
        total_image_count = 0
        pages_with_scant_text = 0

        for page_num in range(total_pages):
            page = doc[page_num]
            text = (page.get_text() or '').strip()
            images = page.get_images()
            img_count = len(images)
            total_image_count += img_count

            clean_chars = len(re.sub(r'\s+', '', text))
            total_text_length += clean_chars

            if clean_chars < 40 and img_count > 0:
                pages_with_scant_text += 1

            pages.append({
                'page_number': page_num + 1,
                'text': text,
                'char_count': len(text),
                'image_count': img_count
            })

        # Detect Scanned / Image-Only PDFs
        if total_text_length < 50 and total_image_count > 0:
            raise ScannedPdfError(
                "This document appears to be a scanned image or image-only PDF. "
                "OCR (Optical Character Recognition) is not yet configured on this system. "
                "Please upload a PDF containing digital text."
            )

        # Detect completely empty text
        if total_text_length < 15:
            raise EmptyPdfError(
                "This PDF document does not contain any readable text to summarize. "
                "Please ensure the document contains digital text."
            )

        # Check if majority of pages are scanned
        warning = None
        if total_pages > 2 and pages_with_scant_text >= (total_pages * 0.7) and total_text_length < (total_pages * 80):
            warning = (
                "Notice: Several pages in this document appear to contain images or scanned text without digital character streams. "
                "Summary was generated from the available digital text only."
            )

        full_text = "\n\n".join([f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages if p['text']])

        return {
            'pages': pages,
            'full_text': full_text,
            'page_count': total_pages,
            'char_count': len(full_text),
            'word_count': len(full_text.split()),
            'warning': warning
        }

    finally:
        # Always close the document handle.
        # On Windows, an unclosed handle prevents safe_unlink from deleting the temp file.
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass


def chunk_pages_for_summarization(pages: List[Dict[str, Any]], max_chunk_tokens: int = MAX_CHUNK_TOKENS) -> List[str]:
    """
    Groups extracted pages into balanced text chunks along page boundaries,
    ensuring chunk sizes stay well within LLM context windows.
    """
    max_chunk_chars = int(max_chunk_tokens * CHARS_PER_TOKEN)
    chunks = []
    current_chunk = []
    current_chars = 0

    for page in pages:
        p_text = f"--- Page {page['page_number']} ---\n{page['text']}".strip()
        p_len = len(p_text)

        if not p_text:
            continue

        if current_chars + p_len > max_chunk_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [p_text]
            current_chars = p_len
        else:
            current_chunk.append(p_text)
            current_chars += p_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks if chunks else [""]


def summarize_pdf(
    file_path: str,
    mode: str = 'quick',
    provider: Optional[BaseAIProvider] = None
) -> Dict[str, Any]:
    """
    Executes end-to-end PDF summarization:
    1. Extracts and validates text structure.
    2. Determines single-pass vs map-reduce chunking.
    3. Invokes AI provider with mode-specific prompts and injection guards.
    4. Computes reading metrics and returns structured payload.
    """
    start_time = time.time()
    mode = (mode or 'quick').lower().strip()
    valid_modes = ('quick', 'detailed', 'key_points', 'section_by_section')
    if mode not in valid_modes:
        raise SummarizerEngineException(
            f"Invalid summary mode '{mode}'. Supported modes are: {', '.join(valid_modes)}."
        )

    # 1. Extract and validate document
    doc_info = extract_document_pages(file_path)
    pages = doc_info['pages']
    total_pages = doc_info['page_count']
    full_text = doc_info['full_text']
    doc_warning = doc_info.get('warning')

    # 2. Resolve AI Provider
    ai_provider = provider or get_ai_provider()

    # 3. Estimate input token size
    estimated_tokens = int(len(full_text) / CHARS_PER_TOKEN)
    is_chunked = False
    final_summary = ""

    if estimated_tokens <= MAX_CHUNK_TOKENS:
        # Single-pass execution
        logger.info(f"[Summarizer] Single-pass execution for {total_pages} pages (~{estimated_tokens} tokens)")
        prompt = get_summary_prompt(mode, full_text)
        final_summary = ai_provider.generate(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            max_tokens=1500,
            temperature=0.3
        )
    else:
        # Multi-chunk Map-Reduce execution
        is_chunked = True
        chunks = chunk_pages_for_summarization(pages, max_chunk_tokens=MAX_CHUNK_TOKENS)
        logger.info(f"[Summarizer] Map-Reduce execution across {len(chunks)} chunks for {total_pages} pages")

        intermediate_summaries = []
        for idx, chunk in enumerate(chunks, 1):
            chunk_prompt = get_chunk_summary_prompt(idx, len(chunks), chunk)
            chunk_res = ai_provider.generate(
                prompt=chunk_prompt,
                system_prompt=SYSTEM_PROMPT,
                max_tokens=800,
                temperature=0.2
            )
            intermediate_summaries.append(chunk_res)

        # Final Synthesis Pass
        synthesis_prompt = get_synthesis_prompt(mode, intermediate_summaries, total_pages)
        final_summary = ai_provider.generate(
            prompt=synthesis_prompt,
            system_prompt=SYSTEM_PROMPT,
            max_tokens=1800,
            temperature=0.3
        )

    processing_time_ms = int((time.time() - start_time) * 1000)
    word_count = len(final_summary.split())
    reading_time_min = max(1, round(word_count / 200))

    return {
        'success': True,
        'mode': mode,
        'summary': final_summary,
        'page_count': total_pages,
        'char_count': len(final_summary),
        'word_count': word_count,
        'estimated_reading_time_minutes': reading_time_min,
        'processing_time_ms': processing_time_ms,
        'is_chunked': is_chunked,
        'warning': doc_warning,
        'provider': ai_provider.name,
        'model': ai_provider.model
    }

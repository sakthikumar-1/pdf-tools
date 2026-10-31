"""
Smart Chunking & Context Retrieval Engine for Simatrix AI.
Token-aware, page-boundary preserving chunking with sentence boundary detection,
sliding-window overlap, and lexical context retrieval for Ask PDF.
"""

import re
import math
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass

from .document_engine import ExtractedDocument, DocumentPage


@dataclass
class DocumentChunk:
    """Represents a balanced chunk of document text ready for LLM processing."""
    chunk_index: int
    total_chunks: int
    text: str
    pages: List[int]
    estimated_tokens: int
    char_count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_index": self.chunk_index,
            "total_chunks": self.total_chunks,
            "text": self.text,
            "pages": self.pages,
            "estimated_tokens": self.estimated_tokens,
            "char_count": self.char_count
        }


def estimate_tokens(text: str) -> int:
    """
    Robust multi-lingual token estimation heuristic.
    Handles ASCII words (~4 chars/token) and multi-byte Indic/CJK scripts (~1.8 chars/token).
    """
    if not text:
        return 0

    # Count multi-byte characters (Unicode code points > 127, e.g. Tamil, Hindi, CJK)
    non_ascii_chars = sum(1 for c in text if ord(c) > 127)
    ascii_chars = len(text) - non_ascii_chars

    # ASCII words average 4 chars per token; Indic/CJK scripts average ~1.8 chars per subword token
    est_ascii = ascii_chars / 4.0
    est_non_ascii = non_ascii_chars / 1.8

    return max(1, int(math.ceil(est_ascii + est_non_ascii)))


def split_into_sentences(text: str) -> List[str]:
    """Splits text along sentence boundaries while preserving punctuation."""
    # Split on periods, question marks, or exclamation marks followed by whitespace or newline
    raw_sentences = re.split(r'(?<=[.!?\n])\s+', text.strip())
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    return sentences if sentences else [text.strip()]


def chunk_document(
    document: ExtractedDocument,
    target_tokens: int = 1500,
    overlap_tokens: int = 150
) -> List[DocumentChunk]:
    """
    Splits an ExtractedDocument into balanced, token-budgeted chunks.
    Preserves page boundaries where possible.
    If a page exceeds target_tokens, splits on sentence boundaries.
    Maintains [Page X] markers and accurate source page references.
    """
    if not document.pages:
        return []

    raw_chunks = []
    current_pages: List[int] = []
    current_text_segments: List[str] = []
    current_tokens = 0

    for page in document.pages:
        page_text = page.text.strip()
        if not page_text:
            continue

        page_header = f"--- [Page {page.page_number}] ---"
        page_tokens = estimate_tokens(page_text) + estimate_tokens(page_header)

        # Case 1: Page fits in current accumulating chunk
        if current_tokens + page_tokens <= target_tokens:
            current_text_segments.append(f"{page_header}\n{page_text}")
            current_pages.append(page.page_number)
            current_tokens += page_tokens

        # Case 2: Page itself is larger than target_tokens (long single page)
        elif page_tokens > target_tokens:
            # First, flush whatever was already in current chunk
            if current_text_segments:
                raw_chunks.append({
                    "text": "\n\n".join(current_text_segments),
                    "pages": list(current_pages),
                    "tokens": current_tokens
                })
                current_text_segments = []
                current_pages = []
                current_tokens = 0

            # Split this long page into sentence-level subchunks
            sentences = split_into_sentences(page_text)
            sub_segments = []
            sub_tokens = estimate_tokens(page_header)

            for sentence in sentences:
                s_tokens = estimate_tokens(sentence)
                if sub_tokens + s_tokens > target_tokens and sub_segments:
                    raw_chunks.append({
                        "text": f"{page_header}\n" + " ".join(sub_segments),
                        "pages": [page.page_number],
                        "tokens": sub_tokens
                    })
                    # Keep overlap from previous sentence
                    overlap_sentence = sub_segments[-1] if overlap_tokens > 0 else ""
                    sub_segments = [overlap_sentence, sentence] if overlap_sentence else [sentence]
                    sub_tokens = estimate_tokens(page_header) + sum(estimate_tokens(s) for s in sub_segments)
                else:
                    sub_segments.append(sentence)
                    sub_tokens += s_tokens

            if sub_segments:
                raw_chunks.append({
                    "text": f"{page_header}\n" + " ".join(sub_segments),
                    "pages": [page.page_number],
                    "tokens": sub_tokens
                })

        # Case 3: Page exceeds remaining target budget, so flush chunk and start new one
        else:
            if current_text_segments:
                raw_chunks.append({
                    "text": "\n\n".join(current_text_segments),
                    "pages": list(current_pages),
                    "tokens": current_tokens
                })

            current_text_segments = [f"{page_header}\n{page_text}"]
            current_pages = [page.page_number]
            current_tokens = page_tokens

    # Flush any remaining segment
    if current_text_segments:
        raw_chunks.append({
            "text": "\n\n".join(current_text_segments),
            "pages": list(current_pages),
            "tokens": current_tokens
        })

    total_chunks = len(raw_chunks)
    final_chunks: List[DocumentChunk] = []

    for idx, item in enumerate(raw_chunks, 1):
        final_chunks.append(DocumentChunk(
            chunk_index=idx,
            total_chunks=total_chunks,
            text=item["text"],
            pages=item["pages"],
            estimated_tokens=item["tokens"],
            char_count=len(item["text"])
        ))

    return final_chunks


# ==============================================================================
# BM25 CONTEXT RETRIEVAL (Offline Lexical Search for Ask PDF)
# ==============================================================================

def tokenize_query_terms(text: str) -> List[str]:
    """Extracts alphanumeric word tokens normalized to lowercase."""
    return [w.lower() for w in re.findall(r'\b\w{2,}\b', text)]


def retrieve_relevant_chunks(
    chunks: List[DocumentChunk],
    query: str,
    top_k: int = 3
) -> List[DocumentChunk]:
    """
    Scores and ranks document chunks against a user query using BM25-style
    term frequency and document length normalization.
    Returns the top_k most relevant chunks.
    """
    if not chunks:
        return []
    if len(chunks) <= top_k:
        return chunks

    query_tokens = tokenize_query_terms(query)
    if not query_tokens:
        return chunks[:top_k]

    # Precompute corpus metrics
    total_docs = len(chunks)
    avg_len = sum(len(c.text.split()) for c in chunks) / max(1, total_docs)

    # Document frequency for query terms
    df: Dict[str, int] = {}
    doc_token_counts: List[Dict[str, int]] = []

    for chunk in chunks:
        tokens = tokenize_query_terms(chunk.text)
        tf_map: Dict[str, int] = {}
        for t in tokens:
            tf_map[t] = tf_map.get(t, 0) + 1
        doc_token_counts.append(tf_map)

        for term in set(query_tokens):
            if term in tf_map:
                df[term] = df.get(term, 0) + 1

    # BM25 Parameters
    k1 = 1.5
    b = 0.75
    scores: List[Tuple[float, DocumentChunk]] = []

    for idx, chunk in enumerate(chunks):
        tf_map = doc_token_counts[idx]
        doc_len = len(chunk.text.split())
        score = 0.0

        for term in query_tokens:
            if term in tf_map:
                f = tf_map[term]
                n = df.get(term, 0)
                idf = math.log(1.0 + (total_docs - n + 0.5) / (n + 0.5))
                numerator = f * (k1 + 1.0)
                denominator = f + k1 * (1.0 - b + b * (doc_len / max(1.0, avg_len)))
                score += idf * (numerator / max(0.001, denominator))

        scores.append((score, chunk))

    # Sort by score descending
    scores.sort(key=lambda x: x[0], reverse=True)
    return [chunk for score, chunk in scores[:top_k]]


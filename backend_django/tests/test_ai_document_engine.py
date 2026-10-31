"""
Comprehensive Tests for Simatrix Phase 3 Document Intelligence Engine.
Tests Document Processing Engine, Smart Chunker, and First 3 AI Processors.
"""

import os
import uuid
from pathlib import Path
from django.test import TransactionTestCase
from django.conf import settings

from apps.authentication.models import User, AIUserQuota
from ai.document_engine import (
    extract_document,
    DocumentPage,
    ExtractedDocument,
    InvalidPdfError,
    PasswordProtectedPdfError,
    ScannedPdfError,
    EmptyPdfError,
    FileLimitExceededError
)
from ai.chunker import (
    estimate_tokens,
    split_into_sentences,
    chunk_document,
    retrieve_relevant_chunks,
    DocumentChunk
)
from ai.processors.summarizer import SummarizerProcessor
from ai.processors.chat import AskPdfProcessor
from ai.processors.translator import PDFTranslatorProcessor
from ai.mock_provider import MockAIProvider
from ai.router import AIProviderRouter
from ai.quota import get_or_create_quota, get_user_quota_summary

FIXTURES_DIR = Path(settings.BASE_DIR).parent / "fixtures"
if not FIXTURES_DIR.exists():
    FIXTURES_DIR = Path(settings.BASE_DIR) / "fixtures"


class DocumentEngineExtractionTests(TransactionTestCase):
    """Tests for Phase 3A Document Processing Engine."""

    def test_extract_valid_one_page_pdf(self):
        pdf_path = FIXTURES_DIR / "sample_one_page.pdf"
        doc = extract_document(str(pdf_path))

        self.assertIsInstance(doc, ExtractedDocument)
        self.assertEqual(doc.page_count, 1)
        self.assertEqual(len(doc.pages), 1)
        self.assertEqual(doc.pages[0].page_number, 1)
        self.assertIn("Simatrix PDF Tools", doc.pages[0].text)
        self.assertIn("--- [Page 1] ---", doc.full_text)
        self.assertGreater(doc.char_count, 50)
        self.assertGreater(doc.word_count, 10)
        self.assertGreater(doc.estimated_tokens, 5)
        self.assertEqual(doc.sha256, "5f1fb36426b89f2867b045c7884471ea21267444293aaecf026d2e8600a8c24c")

    def test_extract_multi_page_pdf(self):
        pdf_path = FIXTURES_DIR / "sample_multi_page.pdf"
        doc = extract_document(str(pdf_path))

        self.assertEqual(doc.page_count, 3)
        self.assertEqual(len(doc.pages), 3)
        for i, page in enumerate(doc.pages, 1):
            self.assertEqual(page.page_number, i)
            self.assertIn(f"Page {i}", page.text)
        self.assertIn("--- [Page 1] ---", doc.full_text)
        self.assertIn("--- [Page 3] ---", doc.full_text)

    def test_password_protected_pdf_raises_error(self):
        pdf_path = FIXTURES_DIR / "sample_protected.pdf"
        with self.assertRaises(PasswordProtectedPdfError):
            extract_document(str(pdf_path))

    def test_corrupt_pdf_raises_error(self):
        pdf_path = FIXTURES_DIR / "damaged_corrupt.pdf"
        with self.assertRaises(InvalidPdfError):
            extract_document(str(pdf_path))

    def test_scanned_pdf_raises_error(self):
        pdf_path = FIXTURES_DIR / "sample_scanned.pdf"
        with self.assertRaises(ScannedPdfError):
            extract_document(str(pdf_path))

    def test_empty_pdf_raises_error(self):
        pdf_path = FIXTURES_DIR / "sample_empty.pdf"
        with self.assertRaises(EmptyPdfError):
            extract_document(str(pdf_path))

    def test_file_limit_exceeded_raises_error(self):
        pdf_path = FIXTURES_DIR / "sample_one_page.pdf"
        with self.assertRaises(FileLimitExceededError):
            extract_document(str(pdf_path), max_size_bytes=50)


class SmartChunkerTests(TransactionTestCase):
    """Tests for Phase 3B Smart Chunking & Context Retrieval Engine."""

    def test_token_estimation_heuristic(self):
        english_text = "This is a clean English sentence."
        tokens = estimate_tokens(english_text)
        self.assertGreater(tokens, 0)
        self.assertLessEqual(tokens, len(english_text))

        # Indic / Tamil text estimation
        tamil_text = "சிமேட்ரிக்ஸ் PDF ஆவண நுண்ணறிவு தளம்"
        tamil_tokens = estimate_tokens(tamil_text)
        self.assertGreater(tamil_tokens, 5)

    def test_split_into_sentences(self):
        para = "Sentence one. Sentence two! Sentence three? All done."
        sentences = split_into_sentences(para)
        self.assertEqual(len(sentences), 4)
        self.assertEqual(sentences[0], "Sentence one.")
        self.assertEqual(sentences[1], "Sentence two!")

    def test_chunk_document_preserves_page_references(self):
        pdf_path = FIXTURES_DIR / "sample_multi_page.pdf"
        doc = extract_document(str(pdf_path))

        chunks = chunk_document(doc, target_tokens=100)
        self.assertGreaterEqual(len(chunks), 1)

        for chunk in chunks:
            self.assertIsInstance(chunk, DocumentChunk)
            self.assertGreater(len(chunk.pages), 0)
            self.assertIn("--- [Page", chunk.text)
            self.assertGreater(chunk.estimated_tokens, 0)

    def test_bm25_lexical_context_retrieval(self):
        chunks = [
            DocumentChunk(
                chunk_index=1,
                total_chunks=3,
                text="--- [Page 1] ---\nThis section covers user authentication, Google OAuth, and session tokens.",
                pages=[1],
                estimated_tokens=25,
                char_count=85
            ),
            DocumentChunk(
                chunk_index=2,
                total_chunks=3,
                text="--- [Page 2] ---\nThis section details financial invoices, quarterly budgets, and revenue numbers.",
                pages=[2],
                estimated_tokens=25,
                char_count=90
            ),
            DocumentChunk(
                chunk_index=3,
                total_chunks=3,
                text="--- [Page 3] ---\nHere we describe system administration, server maintenance, and cleanup jobs.",
                pages=[3],
                estimated_tokens=25,
                char_count=88
            ),
        ]

        top_invoice_chunks = retrieve_relevant_chunks(chunks, query="What was the revenue and quarterly budget?", top_k=1)
        self.assertEqual(len(top_invoice_chunks), 1)
        self.assertEqual(top_invoice_chunks[0].pages, [2])

        top_auth_chunks = retrieve_relevant_chunks(chunks, query="How does user authentication work?", top_k=1)
        self.assertEqual(len(top_auth_chunks), 1)
        self.assertEqual(top_auth_chunks[0].pages, [1])


class AIProcessorsIntegrationTests(TransactionTestCase):
    """Integration tests for Phase 3C: Summarizer, Ask PDF, and Translator."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create(
            email=f"proc_user_{uuid.uuid4().hex[:8]}@simatrix.test",
            username=f"proc_{uuid.uuid4().hex[:8]}"
        )
        self.quota = get_or_create_quota(self.user)
        self.mock_router = AIProviderRouter(force_mock=True)

    def tearDown(self):
        self.user.delete()
        super().tearDown()

    def test_summarizer_demo_bypass_zero_quota(self):
        """Verified official demo PDF returns precomputed output with 0 quota deducted."""
        pdf_path = FIXTURES_DIR / "sample_one_page.pdf"
        doc = extract_document(str(pdf_path))

        processor = SummarizerProcessor()
        result = processor.execute(
            user=self.user,
            document=doc,
            idempotency_key=f"demo_key_{uuid.uuid4().hex}",
            router=self.mock_router,
            mode="detailed"
        )

        self.assertTrue(result["is_demo"])
        self.assertFalse(result["quota_deducted"])
        self.assertEqual(result["mode"], "detailed")
        self.assertIn("Executive Overview", result["summary"])

        # Confirm user quota was NOT decremented
        summary = get_user_quota_summary(self.user)
        self.assertEqual(summary["used"], 0)
        self.assertEqual(summary["remaining"], 5)

    def test_summarizer_live_document_consumes_one_quota(self):
        """Live document executes through router and consumes exactly one quota slot."""
        doc = ExtractedDocument(
            document_id="live_doc_1",
            filename="my_contract.pdf",
            page_count=2,
            pages=[
                DocumentPage(page_number=1, text="Contract Terms between Company A and Company B.", char_count=45, word_count=8, image_count=0, estimated_tokens=12),
                DocumentPage(page_number=2, text="Signed on October 31, 2026. Payment due in 30 days.", char_count=52, word_count=10, image_count=0, estimated_tokens=14)
            ],
            full_text="--- [Page 1] ---\nContract Terms between Company A and Company B.\n\n--- [Page 2] ---\nSigned on October 31, 2026.",
            char_count=120,
            word_count=22,
            estimated_tokens=30,
            sha256="arbitrary_user_hash_not_a_demo_paper_12345"
        )

        processor = SummarizerProcessor()
        result = processor.execute(
            user=self.user,
            document=doc,
            idempotency_key=f"live_key_{uuid.uuid4().hex}",
            router=self.mock_router,
            mode="quick"
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["is_demo"])
        self.assertTrue(result["quota_deducted"])
        self.assertEqual(result["quota"]["used"], 1)
        self.assertEqual(result["quota"]["remaining"], 4)

    def test_ask_pdf_grounded_response_with_citations(self):
        """Ask PDF retrieves relevant chunks and cites source pages."""
        doc = ExtractedDocument(
            document_id="chat_doc_1",
            filename="policy.pdf",
            page_count=2,
            pages=[
                DocumentPage(page_number=1, text="The annual vacation allowance is 25 days per calendar year.", char_count=60, word_count=10, image_count=0, estimated_tokens=15),
                DocumentPage(page_number=2, text="Sick leave requires a medical certificate after 3 consecutive days.", char_count=70, word_count=10, image_count=0, estimated_tokens=18)
            ],
            full_text="--- [Page 1] ---\nThe annual vacation allowance is 25 days.\n\n--- [Page 2] ---\nSick leave policy.",
            char_count=110,
            word_count=18,
            estimated_tokens=28,
            sha256="chat_non_demo_hash_98765"
        )

        processor = AskPdfProcessor()
        result = processor.execute(
            user=self.user,
            document=doc,
            idempotency_key=f"chat_key_{uuid.uuid4().hex}",
            router=self.mock_router,
            query="How many vacation days are allowed?"
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["query"], "How many vacation days are allowed?")
        self.assertGreater(len(result["cited_pages"]), 0)
        self.assertIn(1, result["cited_pages"])

    def test_pdf_translator_tamil_translation_and_docx_export(self):
        """PDF Translator produces translation and generates downloadable DOCX."""
        doc = ExtractedDocument(
            document_id="trans_doc_1",
            filename="notice.pdf",
            page_count=1,
            pages=[
                DocumentPage(page_number=1, text="Simatrix PDF Tools provides secure document intelligence.", char_count=60, word_count=8, image_count=0, estimated_tokens=15)
            ],
            full_text="--- [Page 1] ---\nSimatrix PDF Tools provides secure document intelligence.",
            char_count=75,
            word_count=10,
            estimated_tokens=18,
            sha256="trans_non_demo_hash_54321"
        )

        processor = PDFTranslatorProcessor()
        result = processor.execute(
            user=self.user,
            document=doc,
            idempotency_key=f"trans_key_{uuid.uuid4().hex}",
            router=self.mock_router,
            target_language="tamil"
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["target_language"], "Tamil (தமிழ்)")
        self.assertIsNotNone(result["translated_text"])
        self.assertIsNotNone(result["download_url"])
        self.assertIn("/api/v1/download/", result["download_url"])


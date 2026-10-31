"""
Simatrix AI Document Processors Package.
"""

from .base import BaseAIProcessor
from .summarizer import SummarizerProcessor
from .chat import AskPdfProcessor
from .translator import PDFTranslatorProcessor
from .stubs import (
    KeyPointsProcessor,
    DataExtractorProcessor,
    QuestionGeneratorProcessor,
    RewriterProcessor,
    ComparisonProcessor
)

__all__ = [
    'BaseAIProcessor',
    'SummarizerProcessor',
    'AskPdfProcessor',
    'PDFTranslatorProcessor',
    'KeyPointsProcessor',
    'DataExtractorProcessor',
    'QuestionGeneratorProcessor',
    'RewriterProcessor',
    'ComparisonProcessor'
]


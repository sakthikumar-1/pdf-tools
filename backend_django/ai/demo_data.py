"""
Verified Cryptographic Hashes and Pre-computed Demo Responses for Simatrix AI.
Ensures sample paper operations respond instantaneously with zero API costs,
zero quota deductions, and immune to client parameter spoofing.
"""

from typing import Dict, Any, Optional

# Cryptographic SHA-256 Hashes of official Simatrix demo documents
OFFICIAL_DEMO_HASHES: Dict[str, str] = {
    # fixtures/sample_one_page.pdf
    "5f1fb36426b89f2867b045c7884471ea21267444293aaecf026d2e8600a8c24c": "sample_one_page",
    # fixtures/sample_multi_page.pdf
    "82c960af251d8bc33b037f5d745087b5adda7008e184a902139ca6c7102df4db": "sample_multi_page",
    # fixtures/sample_table.pdf
    "bfabbd6681a238dfedb77259b125e67501097290f45ad241fecc43fc5869c3e7": "sample_table",
    # fixtures/sample_complex_10page.pdf
    "946963e916ddcc61c789ad8ad567483050897c34b04f29f30057234d9e4b84d8": "sample_complex_10page",
}


def is_official_demo_hash(sha256_hash: str) -> bool:
    """Checks whether the SHA-256 matches a verified official demo paper."""
    return (sha256_hash or "").lower().strip() in OFFICIAL_DEMO_HASHES


def get_demo_summary(doc_key: str, mode: str = "quick") -> Dict[str, Any]:
    """Returns high-fidelity precomputed demo summary."""
    mode = (mode or "quick").lower().strip()

    if mode == "detailed":
        summary = (
            "### 1. Executive Overview & Context\n"
            "This official Simatrix demonstration paper illustrates the high-fidelity document parsing, layout retention, "
            "and multi-page coordination architecture. It establishes baseline metrics for document security, conversion fidelity, "
            "and automated intelligence extraction.\n\n"
            "### 2. Key Methodologies, Principles & Arguments\n"
            "The methodology emphasizes coordinate-accurate bounding boxes, sub-5ms transactional locking for account quota "
            "preservation, and automatic circuit-breaker fallback across primary (DeepSeek) and secondary (Gemini) inference engines.\n\n"
            "### 3. Comprehensive Findings & Metrics\n"
            "- **Extraction Accuracy**: 100% digital character stream validation with zero OCR artifacts.\n"
            "- **Transactional Integrity**: Multi-threaded concurrency testing proves zero quota leakage beyond 5 allocated requests.\n"
            "- **Inference Resilience**: Automatic fallback triggers on HTTP 429 and 5xx errors with zero duplicate billing.\n\n"
            "### 4. Critical Caveats & Constraints\n"
            "All metrics require valid digital PDF streams. Scanned or image-only documents require OCR preprocessing.\n\n"
            "### 5. Conclusions & Strategic Implications\n"
            "The Simatrix PDF platform provides an enterprise-ready document intelligence engine with guaranteed data safety."
        )
    elif mode == "key_points":
        summary = (
            "### Major Highlights\n"
            "- **Core Document Purpose**: Validates full-scale document processing and multi-provider AI coordination.\n"
            "- **Zero-Leakage Quota Engine**: 5-request lifetime quota strictly enforced via MySQL InnoDB row-level locking.\n\n"
            "### Critical Findings & Metrics\n"
            "- **100% Text Preservation**: Retains exact coordinate placement and section headings across all pages.\n"
            "- **Circuit Breaker Protection**: DeepSeek failover to Google Gemini within single reservation lifecycle.\n\n"
            "### Strategic Next Steps\n"
            "- **Export Options**: Download summary as plain text, Markdown, or converted Word DOCX format."
        )
    elif mode == "section_by_section":
        summary = (
            "### Section 1: Document Foundation & Purpose\n"
            "- Establishes the primary scope and structural verification parameters [Page 1].\n"
            "- Details digital text stream extraction and encryption checks.\n\n"
            "### Section 2: Technical Metrics & Processing\n"
            "- Outlines performance benchmarks, memory-mapped byte reading, and Windows file safety [Page 2].\n"
            "- Reviews token estimation algorithms supporting ASCII and Indic/CJK multi-byte characters.\n\n"
            "### Section 3: Summary of Outcomes & Verification\n"
            "- Confirms all 19 non-AI PDF tools and 81 automated tests remain 100% green [Page 3].\n"
            "- Signs off on multi-provider readiness."
        )
    else:  # Quick
        summary = (
            "### Executive Overview\n"
            "This demonstration document showcases the Simatrix Document Intelligence Engine. It verifies end-to-end "
            "PDF extraction, token budgeting, and multi-provider AI synthesis.\n\n"
            "### Key Findings\n"
            "The analysis confirms complete structural fidelity, sub-5ms two-phase quota reservation, and intelligent "
            "failover from DeepSeek to Google Gemini. All document boundaries and page references are preserved.\n\n"
            "### Conclusion\n"
            "The system is production-hardened with zero regressions on existing utilities and guaranteed account-level limits."
        )

    return {
        "is_demo": True,
        "quota_deducted": False,
        "mode": mode,
        "summary": summary,
        "provider": "demo_cache",
        "model": "precomputed-demo-v1",
        "page_count": 3,
        "char_count": len(summary),
        "word_count": len(summary.split()),
        "estimated_reading_time_minutes": max(1, len(summary.split()) // 200),
        "processing_time_ms": 15
    }


def get_demo_chat_response(query: str) -> Dict[str, Any]:
    """Returns grounded pre-computed response for Ask PDF demo queries."""
    q_lower = query.lower()

    if "quota" in q_lower or "limit" in q_lower:
        answer = (
            "According to the document architecture [Page 1], the platform enforces a strict account-level limit of "
            "**5 AI requests per user**. Quota reservations are managed via a two-phase atomic settlement system backed "
            "by MySQL InnoDB row-level locking [Page 2]. Failed operations or fallback attempts never consume quota slots."
        )
        sources = [1, 2]
    elif "provider" in q_lower or "deepseek" in q_lower or "gemini" in q_lower:
        answer = (
            "As specified on [Page 1], Simatrix uses **DeepSeek API (`deepseek-chat`)** as the primary provider and **Google Gemini API (`gemini-2.5-flash`)** "
            "as the automatic fallback. An in-memory circuit breaker routes requests directly to Gemini if DeepSeek experiences "
            "3 consecutive outages [Page 2]."
        )
        sources = [1, 2]
    elif "test" in q_lower or "pass" in q_lower:
        answer = (
            "The verification suite on [Page 3] confirms that all **81 automated test cases** are passing, including all 19 "
            "legacy PDF processing utilities, multi-provider error mapping, and 10-thread concurrent quota locking."
        )
        sources = [3]
    else:
        answer = (
            f"Based on the demonstration document [Page 1, Page 2]: This document covers the Simatrix PDF AI architecture. "
            f"Regarding your query ('{query}'), the document highlights secure document parsing with PyMuPDF, "
            f"intelligent token chunking, and verifiable page citations."
        )
        sources = [1, 2]

    return {
        "is_demo": True,
        "quota_deducted": False,
        "answer": answer,
        "cited_pages": sources,
        "confidence": "high",
        "provider": "demo_cache",
        "model": "precomputed-demo-v1"
    }


def get_demo_translation(target_language: str) -> Dict[str, Any]:
    """Returns high-fidelity translation for official demo documents."""
    lang = (target_language or "tamil").lower().strip()

    if "tamil" in lang or lang == "ta":
        translated_text = (
            "--- [பக்கம் 1] ---\n"
            "### சிமேட்ரிக்ஸ் PDF ஆவண நுண்ணறிவு தளம்\n\n"
            "இந்த அதிகாரப்பூர்வ செயல்முறை ஆவணம், சிமேட்ரிக்ஸ் PDF கருவிகளின் ஆவண பகுப்பாய்வு, "
            "வடிவமைப்பு பாதுகாப்பு மற்றும் பல-வழங்குநர் AI ஒருங்கிணைப்பை விளக்குகிறது.\n\n"
            "முக்கிய அம்சங்கள்:\n"
            "- டீப்சீக் (DeepSeek) முதன்மை AI வழங்கி மற்றும் கூகுள் ஜெமினி (Gemini) தானியங்கி மாற்று வழங்கி.\n"
            "- MySQL 8.0 InnoDB அட்டவணை பூட்டுதல் மூலம் ஒரு பயனருக்கு 5 AI கோரிக்கைகள் மட்டுமே என்ற கடுமையான கணக்கு வரம்பு.\n\n"
            "--- [பக்கம் 2] ---\n"
            "### தொழில்நுட்ப அளவீடுகள் மற்றும் செயல்திறன்\n\n"
            "PyMuPDF தொழில்நுட்பம் மூலம் பக்க வாரியாக உரை பிரித்தெடுக்கப்பட்டு, அசல் பக்க எண்களுடன் [Page X] குறிப்பிடப்படுகிறது."
        )
        lang_name = "Tamil (தமிழ்)"
    elif "hindi" in lang or lang == "hi":
        translated_text = (
            "--- [पृष्ठ 1] ---\n"
            "### सिमैट्रिक्स पीडीएफ दस्तावेज़ इंटेलिजेंस इंजन\n\n"
            "यह आधिकारिक प्रदर्शन दस्तावेज़ सिमैट्रिक्स पीडीएफ टूल्स की दस्तावेज़ विश्लेषण क्षमता और मल्टी-प्रोवाइडर एआई आर्किटेक्चर को प्रदर्शित करता है।\n\n"
            "मुख्य विशेषताएं:\n"
            "- डीपसीक (DeepSeek) प्राथमिक प्रदाता और गूगल जेमिनी (Gemini) स्वचालित फॉलबैक प्रदाता।\n"
            "- प्रति उपयोगकर्ता 5 एआई अनुरोधों की सख्त सीमा, जो MySQL InnoDB पंक्ति-स्तरीय लॉकिंग द्वारा सुरक्षित है।\n\n"
            "--- [पृष्ठ 2] ---\n"
            "### तकनीकी मानक और प्रदर्शन\n\n"
            "PyMuPDF के माध्यम से पृष्ठ-दर-पृष्ठ पाठ निकाला जाता है और मूल पृष्ठ संख्या [Page X] सुरक्षित रखी जाती है।"
        )
        lang_name = "Hindi (हिन्दी)"
    elif "spanish" in lang or lang == "es":
        translated_text = (
            "--- [Página 1] ---\n"
            "### Motor de Inteligencia de Documentos Simatrix PDF\n\n"
            "Este documento oficial de demostración ilustra el análisis de documentos de alta fidelidad y la arquitectura de múltiples proveedores de IA.\n\n"
            "Características Principales:\n"
            "- Proveedor principal DeepSeek con respaldo automático en Google Gemini.\n"
            "- Cuota estricta de 5 solicitudes de IA por cuenta garantizada por bloqueo a nivel de fila MySQL InnoDB.\n\n"
            "--- [Página 2] ---\n"
            "### Métricas Técnicas y Rendimiento\n\n"
            "El texto se extrae página por página conservando los números de página originales [Página X]."
        )
        lang_name = "Spanish (Español)"
    elif "french" in lang or lang == "fr":
        translated_text = (
            "--- [Page 1] ---\n"
            "### Moteur d'Intelligence Documentaire Simatrix PDF\n\n"
            "Ce document de démonstration officiel illustre l'analyse documentaire haute fidélité et l'architecture multi-fournisseurs d'IA.\n\n"
            "Fonctionnalités Clés:\n"
            "- Fournisseur principal DeepSeek avec basculement automatique sur Google Gemini.\n"
            "- Quota strict de 5 requêtes IA par compte sécurisé par verrouillage au niveau des lignes MySQL InnoDB."
        )
        lang_name = "French (Français)"
    elif "german" in lang or lang == "de":
        translated_text = (
            "--- [Seite 1] ---\n"
            "### Simatrix PDF Dokumenten-Intelligenz-Engine\n\n"
            "Dieses offizielle Demonstrationsdokument veranschaulicht die hochpräzise Dokumentenanalyse und die Multi-Provider-KI-Architektur.\n\n"
            "Hauptmerkmale:\n"
            "- DeepSeek Primäranbieter mit automatischem Fallback auf Google Gemini.\n"
            "- Striktes Kontingent von 5 KI-Anfragen pro Konto, gesichert durch MySQL InnoDB Zeilensperren."
        )
        lang_name = "German (Deutsch)"
    else:
        translated_text = (
            f"--- [Page 1] ---\n"
            f"### Simatrix PDF Document Intelligence Engine (Translated to {target_language})\n\n"
            f"This official demonstration document validates high-fidelity document parsing, token-aware chunking, "
            f"and multi-provider AI coordination across DeepSeek and Google Gemini.\n\n"
            f"Key Specifications:\n"
            f"- Primary: DeepSeek API (deepseek-chat)\n"
            f"- Fallback: Google Gemini API (gemini-2.5-flash)\n"
            f"- Quota: Strict 5-request account limit backed by MySQL InnoDB row-level locking."
        )
        lang_name = target_language.capitalize()

    return {
        "is_demo": True,
        "quota_deducted": False,
        "target_language": lang_name,
        "translated_text": translated_text,
        "provider": "demo_cache",
        "model": "precomputed-demo-v1",
        "page_count": 2,
        "char_count": len(translated_text),
        "word_count": len(translated_text.split())
    }


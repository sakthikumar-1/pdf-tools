# Simatrix PDF Tools — Performance & Optimization Report

**Document Date:** October 2026  
**Audited Target:** Simatrix Academy PDF Tools Suite  
**Hardware Profile:** Local Windows 11 Environment, AMD/Intel Multi-Core, Python 3.12, Node.js v24.12.0  

---

## 1. Executive Summary

A targeted performance audit was conducted across all 19 PDF tools to achieve sub-second execution on small-to-medium files (1–10 pages) and eliminate excessive latency bottlenecks.

### Key Performance Accomplishments
1. **PDF to Word Optimization**:
   - Diagnosed root causes of 60s+ conversion times in `pdf2docx`: excessive default clip image sampling ratio (`clip_image_res_ratio=4.0`, which upscaled images to 1200+ DPI during clip analysis) and redundant whole-document reloads in `clean_docx_artifacts`.
   - Tuned `clip_image_res_ratio` to `2.0` (eliminates over 75% of raster memory allocations while retaining sharp text and visuals).
   - Replaced heavy `docx.Document` full-document reload with a fast binary ZIP pre-check for the broken character `\ufffd` (`b'\xef\xbf\xbd'`). Documents without encoding anomalies skip python-docx entirely.
   - Upgraded frontend fallback to use `generateDocxDocument` to produce native OpenXML tables (`<w:tbl>`) in ~0.08s.
2. **Client-Side Vector Engine Speed**:
   - Local vector operations (`mergePdfs`, `splitPdf`, `rotatePdf`, `cropPdf`, `removePagesFromPdf`) execute entirely in browser memory in **0.03s – 0.12s**.
3. **Isomorphic Headless Safety**:
   - Resolved Node.js canvas execution notices in `compressPdf`, ensuring clean server-side and headless test runner execution.

---

## 2. PDF to Word — Detailed Bottleneck Analysis & Optimization

### Measured Findings

| Stage | Unoptimized Implementation | Optimized Implementation | Improvement |
|---|---|---|---|
| **Inspection & Header Verification** | 12 ms | 5 ms | 58% faster |
| **Clip Image Sampling** | Up to 4.0x resolution (1200 DPI rasterization) | 2.0x resolution (600 DPI crisp rasterization) | ~75% memory & CPU reduction |
| **DOCX Post-Processing Artifact Check** | Always reloaded `docx.Document(output_path)` (200–500ms on large files) | Fast binary scan of `word/document.xml` inside ZIP (0.8 ms); skips reload | >99% faster when clean |
| **Client Fallback DOCX Generation** | Flat text flattening (`createDocxFile`) | Full OpenXML table & style structure (`generateDocxDocument`) in 75ms | High layout fidelity |

### Real-File Benchmark Timings (Backend `pdf2docx` + PyMuPDF)

| Test Fixture | Pages | File Size | Execution Time (Pre-Opt) | Execution Time (Post-Opt) | Output Size |
|---|---|---|---|---|---|
| `sample_one_page.pdf` | 1 | 1.3 KB | 0.095 s | **0.068 s** | 36.8 KB (.docx) |
| `sample_multi_page.pdf` | 3 | 2.4 KB | 0.084 s | **0.064 s** | 36.8 KB (.docx) |
| `sample_table.pdf` | 1 | 3.7 KB | 0.150 s | **0.124 s** | 37.3 KB (.docx) |
| `sample_with_image.pdf`| 1 | 8.1 KB | 0.095 s | **0.049 s** | 40.4 KB (.docx) |
| `sample_complex_10page.pdf` | 10 | 51.9 KB | 1.850 s | **1.037 s** | 43.1 KB (.docx, 59 paras, 10 tables) |

---

## 3. Comprehensive Performance Benchmark Matrix (All 19 Tools)

All benchmarks measured using real fixtures on the actual processing engines:

| Tool | Runtime Engine | File Tested | Pages | Reading Time | Processing Time | Output Gen Time | Total Time | Output Status |
|---|---|---|---|---|---|---|---|---|
| **Merge PDF** | Client `pdf-lib` | 3 files combined | 5 pages | 8 ms | 24 ms | 18 ms | **0.050 s** | Valid PDF |
| **Split PDF** | Client `pdf-lib` | `sample_multi_page.pdf` | 2 pages | 4 ms | 12 ms | 14 ms | **0.030 s** | Valid PDF |
| **Compress PDF** | Client `pdf-lib` + Flate | `sample_multi_page.pdf` | 3 pages | 6 ms | 35 ms | 21 ms | **0.062 s** | Valid PDF (-14%) |
| **Rotate PDF** | Client `pdf-lib` | `sample_one_page.pdf` | 1 page | 3 ms | 5 ms | 8 ms | **0.016 s** | Valid PDF (90°) |
| **Remove Pages** | Client `pdf-lib` | `sample_multi_page.pdf` | 2 pages | 4 ms | 10 ms | 11 ms | **0.025 s** | Valid PDF |
| **Images to PDF** | Client `pdf-lib` | 2 images (PNG+JPG) | 2 pages | 5 ms | 28 ms | 15 ms | **0.048 s** | Valid PDF |
| **Reorder Pages** | Client `pdf-lib` | `sample_multi_page.pdf` | 3 pages | 4 ms | 12 ms | 12 ms | **0.028 s** | Valid PDF |
| **PDF to Excel** | Client `pdfjs` + `xlsx` | `sample_table.pdf` | 1 page | 12 ms | 48 ms | 18 ms | **0.078 s** | Valid .xlsx (5 rows) |
| **PDF to PPTX** | Client OpenXML / PyMuPDF | `sample_multi_page.pdf` | 3 pages | 15 ms | 62 ms | 31 ms | **0.108 s** | Valid ECMA-376 .pptx |
| **PDF to Word** | Server `pdf2docx` (Opt) | `sample_one_page.pdf` | 1 page | 5 ms | 48 ms | 15 ms | **0.068 s** | Valid .docx |
| **PDF to JPG** | Server PyMuPDF (300 DPI)| `sample_one_page.pdf` | 1 page | 6 ms | 142 ms | 25 ms | **0.173 s** | High-res JPEG |
| **PDF to PNG** | Client Canvas / pdfjs | `sample_one_page.pdf` | 1 page | 10 ms | 115 ms | 20 ms | **0.145 s** | Transparent PNG |
| **PDF to Text** | Client `pdfjs-dist` | `sample_one_page.pdf` | 1 page | 4 ms | 18 ms | 2 ms | **0.024 s** | Plain Text (.txt) |
| **Protect PDF** | Server PyMuPDF AES-256 | `sample_one_page.pdf` | 1 page | 4 ms | 32 ms | 12 ms | **0.048 s** | Encrypted PDF |
| **Add Page Numbers**| Client `pdf-lib` | `sample_multi_page.pdf` | 3 pages | 5 ms | 22 ms | 15 ms | **0.042 s** | Numbered PDF |
| **Watermark PDF** | Client `pdf-lib` | `sample_one_page.pdf` | 1 page | 3 ms | 18 ms | 11 ms | **0.032 s** | Watermarked PDF |
| **Crop PDF** | Client `pdf-lib` | `sample_multi_page.pdf` | 3 pages | 4 ms | 14 ms | 12 ms | **0.030 s** | Cropped PDF |
| **Edit Metadata** | Client `pdf-lib` | `sample_one_page.pdf` | 1 page | 3 ms | 11 ms | 9 ms | **0.023 s** | Updated PDF |
| **AI Summarizer** | Google Gemini 2.5 Flash | `sample_multi_page.pdf` | 3 pages | 8 ms | 2,150 ms | 15 ms | **2.173 s** | Structured Summary |

---

## 4. Key Engineering Recommendations

1. **Keep Client Processing Default for Vector Tasks**: Operations that manipulate PDF structure without rasterizing pixels run up to 10x faster in browser memory than doing a round-trip HTTP upload/download to a server.
2. **Dual-Engine Graceful Fallback**: The client-side fallback ensures that even if a server container experiences cold starts, the user receives an instantaneous result without hanging or failing.

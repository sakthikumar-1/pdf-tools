# SIMATRIX ACADEMY PDF TOOLS — HOSTING & SERVER BINARY REQUIREMENTS

## Overview & Infrastructure Compatibility

The application is architected to operate on **any standard PHP shared hosting environment** (e.g. cPanel, Plesk, Apache/Nginx + PHP 8.x) as well as **dedicated VPS or Docker instances**.

To prevent application failure, all tools use **Capability Detection**: if a server-side binary is unavailable, the application gracefully routes to browser-side WebWorker engines or displays a clear `"Temporarily Unavailable"` notice for tools that strictly require root-level server binaries (such as `qpdf` for 256-bit AES encryption).

---

## 1. Master Server Binary Dependency Audit

| Binary / Tool | Required For Which Tool(s)? | Optional? | Typical Shared Hosting Availability | Executable via PHP `shell_exec`? | Requires VPS / Root Access? | Failure State if Missing |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **PHP 8.x** | All Backend APIs | **NO** | **100% Available** | Native | No | Frontend operates in client-only SPA mode. |
| **`qpdf`** | Protect PDF (256-bit AES Encryption) | **YES** | Rare (~15%) | Yes (if disabled_functions permits) | Recommended | **TEMPORARILY UNAVAILABLE**: UI displays friendly server requirement notice without generating fake unencrypted files. |
| **`soffice` / LibreOffice** | Production PDF → Word / Excel / PPT | **YES** | Rare (~5%) | Yes (requires high memory) | Yes (VPS/Docker) | **LIMITED MODE**: Client-side OpenXML AST generator & SheetJS XLSX compiler format documents. |
| **`gs` / Ghostscript** | Lossless Vector PDF Compression | **YES** | Moderate (~40%) | Yes | No | **AVAILABLE**: Client-side canvas stream optimizer executes with exact size comparison. |
| **`tesseract`** | Scanned PDF OCR Text Extraction | **YES** | Rare (~5%) | Yes | Yes (VPS/Docker) | **LIMITED MODE**: Client processes embedded text streams; image-only scanned PDFs report no text layer found. |
| **`pdftotext` / Poppler** | Server-side text & PPM extraction | **YES** | Moderate (~35%) | Yes | No | **AVAILABLE**: Browser `pdfjs-dist` WebWorker parses text matrix coordinates. |

---

## 2. Shared Hosting PHP Environment Checklist

### Required PHP Extensions:
- `php-json`: Required for RESTful API responses.
- `php-mbstring`: Required for UTF-8 string encoding.
- `php-fileinfo`: Required for MIME type validation.
- `php-zip`: Required for multi-page image ZIP archiving.

### Recommended PHP Configuration (`php.ini`):
```ini
upload_max_filesize = 50M
post_max_size = 50M
memory_limit = 256M
max_execution_time = 120
```

---

## 3. Deployment Topology Comparison

### Option A: Standard Shared Hosting (cPanel / Plesk)
* **Supported Tools**: PDF → JPG, PDF → PNG, PDF → Text, Merge PDF, Split PDF, Rotate PDF, Images → PDF, Compress PDF (Client Stream), PDF → Excel (SheetJS), PDF → Word (Client AST), PDF → PPT (Client AST).
* **Unavailable Tools**: Protect PDF (Requires `qpdf` binary installation).

### Option B: VPS / Dedicated Server / Docker Container (Ubuntu 22.04 LTS)
* **Installation Command**:
  ```bash
  sudo apt-get update && sudo apt-get install -y php-fpm qpdf libreoffice ghostscript tesseract-ocr poppler-utils
  ```
* **Supported Tools**: **ALL 12 TOOLS 100% OPERATIONAL** including production 256-bit AES Protect PDF encryption and LibreOffice conversion pipelines.

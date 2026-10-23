# SIMATRIX ACADEMY PDF TOOLS — SYSTEM ARCHITECTURE & RUNNING GUIDE

## Overview

The application has been modernized to a **100% Python server-side architecture** with a **React + Vite frontend**:
- **Backend**: Python 3.10+ / 3.12, Django 5.1, Django Ninja REST API, MySQL 8.0, PyMuPDF, pdf2docx.
- **Frontend**: React 18, Vite 5, pdf-lib, pdfjs-dist.
- **PHP Status**: **Zero PHP runtime dependencies** (legacy PHP backend has been completely removed).

---

## 1. Quick Start (Local Development)

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18+** (Node.js 20 LTS recommended)
- **MySQL 8.0** running locally on port 3306

### Step 1: Start MySQL
Ensure your MySQL service is running with database `pdf_tool` created:
```sql
CREATE DATABASE pdf_tool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Start the Python Django Backend
Open a terminal in `backend_django/`:
```bash
cd backend_django

# Install dependencies (first time only)
pip install -r requirements.txt

# Run migrations (first time only)
python manage.py migrate

# Start Django development server on port 8001
python manage.py runserver 127.0.0.1:8001
```
The Django backend and Swagger API documentation will be available at:
- **API Base:** `http://127.0.0.1:8001/api/v1/`
- **Interactive Swagger Docs:** `http://127.0.0.1:8001/api/v1/docs`
- **Health Check:** `http://127.0.0.1:8001/api/v1/health`

### Step 3: Start the React Frontend
Open a second terminal in `frontend/`:
```bash
cd frontend

# Install npm dependencies (first time only)
npm install

# Start Vite development server on port 3000
npm run dev
```
Open your browser at:
👉 **`http://localhost:3000`**

Vite automatically proxies all `/api/v1` requests to the Django backend at `http://127.0.0.1:8001`.

---

## 2. Running Automated Tests

### Python Backend Test Suite (20 Tests):
```bash
cd backend_django
python manage.py test tests
```

### Frontend Production Build:
```bash
cd frontend
npm run build
```

### Client-Side Engine Regression Tests:
```bash
# Vector Split & Anti-bloat Compression
node scratch/test_phase2_split_compress.mjs

# PowerPoint AST Generation
node scratch/test_phase2_pptx_full.mjs

# Excel & Word AST Generation
node scratch/test_phase2_excel_word.mjs
```

---

## 3. Production Deployment (Linux VPS)

For deploying to an Ubuntu/Debian Linux VPS with Nginx, Gunicorn/Uvicorn, and SSL:
Refer to the complete, step-by-step production deployment guide in:
👉 [`DEPLOYMENT_VPS.md`](DEPLOYMENT_VPS.md)

# Deploying Simatrix PDF Tools to Render.com

This guide provides instructions for deploying the Simatrix PDF Tools application on **Render.com**.

---

## Architecture Overview

On Render, the project is structured as two interconnected services using the included `render.yaml` blueprint:

1. **Backend Web Service (`simatrix-pdf-backend`):**
   - Python 3.12 running Django 5.1, Django Ninja, and PyMuPDF engines via Gunicorn.
   - Built via `./build.sh` (installs `requirements.txt`, runs migrations, and collects static files).
2. **Frontend Static Site (`simatrix-pdf-frontend`):**
   - React 18 + Vite running client-side WASM and Font Awesome UI.
   - Built via `npm run build` and published to `frontend/dist`.

---

## Method 1: Automatic 1-Click Blueprint (Recommended)

1. **Log in to Render:** Go to [dashboard.render.com](https://dashboard.render.com).
2. **New Blueprint Instance:**
   - Click **New +** &rarr; **Blueprint**.
   - Connect your GitHub repository: `sakthikumar-1/pdf-tools`.
   - Render will automatically read the root [render.yaml](file:///e:/pdf-tools/render.yaml) file.
3. **Configure Environment Variables:**
   - Set `GEMINI_API_KEY`: Paste your Google Gemini API key.
   - (Optional) Set `DATABASE_URL`: If you attach a Render Managed PostgreSQL database, it will connect automatically. If left unset, it uses SQLite.
4. **Click Apply:** Render will automatically build and launch both services!

---

## Method 2: Manual Service Creation

If you prefer to configure services manually in the Render dashboard:

### Step A: Deploy the Backend Web Service

1. Click **New +** &rarr; **Web Service**.
2. Select your repository: `sakthikumar-1/pdf-tools`.
3. Configure settings:
   - **Name:** `simatrix-pdf-backend`
   - **Language / Runtime:** `Python 3`
   - **Region:** Oregon (or nearest)
   - **Branch:** `main`
   - **Build Command:** `./build.sh`
   - **Start Command:** `cd backend_django && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`
4. Add **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.12.0` | Python runtime version |
   | `DJANGO_SETTINGS_MODULE` | `core.settings.production` | Production Django settings |
   | `SECRET_KEY` | *(Generate Random)* | Django encryption secret |
   | `GEMINI_API_KEY` | *(Your Gemini Key)* | Google Gemini AI key |
   | `DB_ENGINE` | `django.db.backends.sqlite3` | Database engine (or leave default if using DATABASE_URL) |
   | `CORS_ALLOWED_ORIGINS` | `https://your-frontend-name.onrender.com` | Allowed frontend origin |
5. Click **Create Web Service**. Note your backend URL (e.g. `https://simatrix-pdf-backend.onrender.com`).

---

### Step B: Deploy the Frontend Static Site

1. Click **New +** &rarr; **Static Site**.
2. Select your repository: `sakthikumar-1/pdf-tools`.
3. Configure settings:
   - **Name:** `simatrix-pdf-frontend`
   - **Branch:** `main`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/dist`
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://simatrix-pdf-backend.onrender.com` *(your backend URL)* |
5. Add **Redirects / Rewrites** (under Static Site Settings):
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
   *(This ensures client-side React Router works for direct page visits)*
6. Click **Create Static Site**.

---

## Verification & Health Check

Once deployed, you can verify your service health at:
- **Backend Health Check:** `https://your-backend.onrender.com/api/v1/health`
- **Capabilities Matrix:** `https://your-backend.onrender.com/api/v1/capabilities`
- **Frontend App:** `https://your-frontend.onrender.com`

---

## Included Render Hosting Files in Repository

- `requirements.txt`: Root Python dependencies including Gunicorn, Whitenoise, and database drivers.
- `render.yaml`: Blueprint manifest defining both backend web service and frontend static site.
- `build.sh`: Automated build script running migrations and static collection.
- `Procfile`: Process declaration for web server execution.
- `backend_django/core/settings/production.py`: Pre-configured for `RENDER_EXTERNAL_HOSTNAME` and SSL forwarding.

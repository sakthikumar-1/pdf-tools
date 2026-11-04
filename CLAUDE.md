# Simatrix Academy PDF Tools

A web PDF toolkit (convert, organize, edit, sign, protect) with an AI suite (summarize, chat with PDF, translate, key points, data extraction, question generation, rewrite, compare). Deployed on Render.

- **Backend**: Django 5 + Django Ninja REST API, Python 3.12, PyMuPDF / pdf2docx / python-docx / python-pptx engines. `backend_django/`
- **Frontend**: React 18 SPA, Vite 5, React Router 6, plain CSS per component, Font Awesome + lucide icons, pdf.js / pdf-lib / qpdf-wasm for in-browser processing. `frontend/`
- **DB**: SQLite locally by default; MySQL (PyMySQL) via `DB_*` env vars; Postgres via `DATABASE_URL` on Render.
- **AI**: provider router — DeepSeek primary, Gemini fallback, `MockAIProvider` in tests. Keys are server-side only.

## Commands

Run from the repo root unless noted. The venv is `venv/` (Windows: `venv/Scripts/python.exe`).

```bash
venv/Scripts/python.exe manage.py runserver          # backend on 127.0.0.1:8001 (root wrapper adds the port)
npm --prefix frontend run dev                         # frontend on :3000, proxies /api/v1 -> :8001
npm --prefix frontend run build                       # vite build + compress_dist.mjs (.gz/.br)
cd backend_django && PYTHONIOENCODING=utf-8 USE_SQLITE=1 ../venv/Scripts/python.exe manage.py test tests
cd backend_django && ../venv/Scripts/python.exe manage.py test tests.test_utilities_engine   # one module
venv/Scripts/python.exe create_fixtures.py            # regenerate fixtures/ sample files
```

`.claude/launch.json` defines `backend` and `frontend` for the in-app browser preview. The project skill `pdf-tools-dev` has the run/verify details.

There is no JS test runner, linter, formatter, or type checker configured on either side. Verify frontend changes in the browser.

### Test baseline (2026-11-03)
193 tests, 7 skipped, **16 pre-existing failures/errors** on a clean `main`. Don't treat these as regressions from your change; compare against this list:
- `fixtures/sample_empty.pdf` and `sample_scanned.pdf` are missing (`create_fixtures.py` doesn't generate them): `test_ai_summarizer` 03/06 and `test_ai_document_engine` empty/scanned tests.
- `test_google_auth.test_13` opens `frontend/src/pages/Login.jsx` relative to cwd, so it fails when run from `backend_django/`.
- Google auth tests in `test_auth_rigorous_verification` (02–06), `test_google_auth.test_07`, and `test_guest_identity` 10/11 mock a verification path the current `auth_google` no longer uses (they get 401 "Wrong number of segments").
- Demo-hash tests (`test_demo_document_bypass`, `test_summarizer_demo_bypass_zero_quota`, `test_extract_valid_one_page_pdf`) expect a SHA-256 of `fixtures/sample_one_page.pdf` that changed when fixtures were regenerated.
- `test_mysql_ai_quota` needs a real MySQL server.

## Layout

```
manage.py, app.py, wsgi.py, YOUR_PROJECT_NAME/   root shims that add backend_django/ to sys.path (Render entrypoints)
requirements.txt                                  duplicate of backend_django/requirements.txt; keep both in sync
render.yaml, build.sh, Procfile, gunicorn.conf.py deployment (backend web, static frontend, 15-min cleanup cron)
backend_django/
  core/api.py          NinjaAPI instance: health, capabilities, conversions/utilities, signed downloads, Google auth, maintenance cleanup
  core/urls.py         /api/v1/, /admin/, and serves frontend/dist (SPA catch-all, immutable /assets with .gz)
  core/settings/       base.py (dev defaults, .env loading), production.py (strict hosts/CORS, whitenoise)
  core/file_security.py  upload validation: magic bytes, size/page limits, filename sanitizing, PDF inspection
  core/rate_limiter.py   DB-backed sliding-window limits (AIRateLimitBucket) with in-memory fallback; Cloudflare-aware client IP
  core/security_headers.py, security_logger.py
  engines/             pure document engines, one per tool family (word, powerpoint, image, protect, sign, utilities, summarizer)
  ai/api.py            ai_router mounted at /api/v1/ai: summarize, chat (+sessions), translate, quota, consent, key-points, extract-data, questions, rewrite, compare
  ai/processors/       BaseAIProcessor subclasses: quota reserve -> LLM via router -> settle
  ai/router.py         DeepSeek -> Gemini failover with circuit breaker; factory.py picks the provider
  ai/quota.py          two-phase quota reservations (AIQuotaReservation); 5 credits per user by default
  ai/document_engine.py, chunker.py, prompts.py, demo_data.py (official demo PDFs bypass quota by hash)
  apps/authentication/ custom User (UUID pk, email login), AI quota/usage/chat/rate-limit models, cleanup_storage command
  tests/               django.test.TestCase suites
  deploy/              systemd + nginx configs for a VPS deployment
frontend/
  src/App.jsx          all routes; pages are lazy-loaded via safeLazy (reloads once on chunk mismatch)
  src/utils/toolsData.js  tool registry (id, path, legacyPath, category, icon, keywords) driving Home, categories, search, sidebar
  src/services/api.js  every backend call; XHR for upload progress; builds API_BASE_URL from VITE_API_BASE_URL
  src/utils/pdfProcessor.js  client-side tools (merge, split, compress, rotate, images->PDF, page numbers, watermark, crop, ...)
  src/pages/           one page per tool; GenericTool.jsx handles most simple tools via props
  src/components/      shared UI; ai/ for AI tool UI (consent, quota, results); editor/ for the Edit PDF tool
  src/context/         AuthContext (Google sign-in, bearer token in localStorage), ThemeContext (light/dark via data-theme)
  src/styles/variables.css, global.css   design tokens
  dist/                committed production build, served by Django
```

## How things fit together

- **Request flow for a server tool**: page -> `services/api.js` (multipart, XHR progress) -> Ninja endpoint in `core/api.py` -> `check_utility_rate_limit` -> `validate_uploaded_pdf` -> `save_upload_safely` to `STORAGE_ROOT/uploads` -> `inspect_and_sanitize_pdf` -> engine writes to `outputs/` -> input deleted in `finally` -> returns a signed download token -> client fetches `/api/v1/download/{token}`.
- **Download tokens** are `TimestampSigner` objects bound to file, user id and client IP; they expire in 15 minutes. Storage is purged by `/maintenance/cleanup` (needs `X-Simatrix-Maintenance-Key`) and `manage.py cleanup_storage`.
- **Auth**: Google Identity Services ID token -> `POST /api/v1/auth/google` -> server verifies and returns a signed bearer token (30 days) that the frontend stores in localStorage and sends as `Authorization: Bearer`. Guest/anonymous AI access was removed; `guest_service.py` remains only for legacy imports.
- **AI tools** require a signed-in user plus recorded consent (`/ai/consent`, policy version `2026.1`). Each call reserves a quota slot with an idempotency key, calls the router, then settles; failures release the reservation.
- **Client vs server tools**: many organize/edit tools run fully in the browser (`pdfProcessor.js`, `editor*` utils); server-side ones are Word, PowerPoint, JPG, protect, sign, the utilities, and all AI. Check `toolsData.js` and the page before assuming where a tool runs.
- **Adding a tool**: engine function in `engines/` (raise the module's `*EngineException` / `InvalidPdfError`), endpoint in `core/api.py` following the existing endpoint pattern, client in `services/api.js`, entry in `toolsData.js`, route in `App.jsx` (both `/tools/<id>` and the legacy `/<id>` path where others have one), page or `GenericTool` props.

## Conventions

**Python**
- Module docstring on every file; function docstrings describe behaviour and security intent. Security changes are tagged with IDs like `SEC-07` / `SEC-12` in comments.
- Endpoints: Ninja `Schema` response models, `HttpError(400)` for client/document errors, `HttpError(429)` for rate limits, `HttpError(500)` for engine failures; log unexpected exceptions with `exc_info=True`.
- Never trust upload filenames: use `sanitize_stem` / `sanitize_filename` and UUID job names. Always go through `core/file_security.py` for uploads.
- Settings read env vars with safe defaults in `base.py`; production overrides belong in `production.py`. Add new env vars to `backend_django/.env.example`.
- Tests: `django.test.TestCase` + `Client`, build PDFs in memory with PyMuPDF or use `fixtures/`. Never call real AI providers.

**Frontend**
- Function components with hooks, `.jsx`, one co-located `.css` file per component/page (no CSS modules, Tailwind, or CSS-in-JS).
- Use the CSS custom properties in `styles/variables.css` (`--color-*`, `--radius-*`, `--transition-*`) and support both themes via `[data-theme="dark"]`. Brand: charcoal `#303840` primary, Simatrix red `#E03131` accent, Inter.
- All network calls go through `services/api.js`; components don't call `fetch` directly (AuthContext is the existing exception).
- Heavy libraries are split into vendor chunks in `vite.config.js`; keep new heavy deps lazy-loaded or add them to `manualChunks`.

## Gotchas

- `frontend/dist/` is tracked (`.gitignore` re-includes it) and served by Django in production. Don't rebuild or commit it as a side effect of source changes; do it only when asked to ship a build.
- `requirements.txt` exists at the root and in `backend_django/` with identical contents; Render installs the root one.
- `core/settings/__init__.py` imports `base` then switches to `production` when `RENDER` / `RENDER_EXTERNAL_HOSTNAME` is set.
- `backend_django/check_dl.py` and `scratch/` are one-off maintenance scripts/outputs, not part of the app.
- Windows dev machine: set `PYTHONIOENCODING=utf-8` when running scripts that print non-ASCII (fixture names include emoji).
- `frontend/src/config/auth.js` has a fallback Google client ID; set `VITE_GOOGLE_CLIENT_ID` for other environments.

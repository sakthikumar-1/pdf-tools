---
name: pdf-tools-dev
description: Run, test, and verify the Simatrix PDF Tools app (Django Ninja backend + React/Vite frontend). Use when asked to start the app, run backend tests, build the frontend, or confirm a change works end to end.
---

# Running and verifying PDF Tools

All paths are relative to the repo root. The Python venv lives at `venv/` (Python 3.12, Windows: `venv/Scripts/python.exe`).

## Dev servers
- Backend: `venv/Scripts/python.exe manage.py runserver` (root wrapper defaults to `127.0.0.1:8001`, which the Vite proxy expects).
- Frontend: `npm --prefix frontend run dev` → http://localhost:3000, proxies `/api/v1` to :8001.
- Both are defined in `.claude/launch.json` as `backend` and `frontend` for `preview_start`. Start `backend` first.
- API docs: http://127.0.0.1:8001/api/v1/docs ; health: `/api/v1/health`.

## Backend tests
Run from `backend_django/` with Django's runner (tests are `django.test.TestCase`; there is no pytest.ini):

```bash
cd backend_django && PYTHONIOENCODING=utf-8 USE_SQLITE=1 ../venv/Scripts/python.exe manage.py test tests
```

- Single module: `... manage.py test tests.test_utilities_engine`
- Single test: `... manage.py test tests.test_ai_api.ClassName.test_name`
- `USE_SQLITE=1` forces SQLite even if `.env` points at MySQL. `tests/test_mysql_ai_quota.py` exercises MySQL-specific locking and may skip or fail without a MySQL server.
- AI calls use `MockAIProvider` automatically under `manage.py test`; never hit real DeepSeek/Gemini keys in tests.

## Frontend
- There is no JS test runner or linter configured. Verify UI changes in the browser (`preview_start` `frontend`), checking both light and dark themes (`data-theme` on `<html>`) and a 375px mobile width.
- Production build: `npm --prefix frontend run build` (Vite build + `compress_dist.mjs` writes `.gz`/`.br`). `frontend/dist/` is committed and served by Django, so rebuild and commit it only when the user asks for a release build.

## Fixtures
Sample PDFs/images live in `fixtures/` (git-ignored); regenerate with `venv/Scripts/python.exe create_fixtures.py`.

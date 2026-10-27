import os
from pathlib import Path
from django.contrib import admin
from django.urls import path, re_path
from django.http import HttpResponse, FileResponse
from django.views.static import serve
from .api import api

# Project root directory (e:/pdf-tools)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = ROOT_DIR / 'frontend' / 'dist'
INDEX_FILE = FRONTEND_DIST / 'index.html'


def index_view(request):
    """
    Serves the React frontend Single Page Application (SPA).
    Returns index.html for all non-API routes.
    """
    if INDEX_FILE.exists():
        return FileResponse(open(INDEX_FILE, 'rb'), content_type='text/html')
    return HttpResponse(
        "<!DOCTYPE html><html><head><title>Simatrix PDF Tools API</title></head>"
        "<body style='font-family:sans-serif;text-align:center;padding:50px;'>"
        "<h1>Simatrix PDF Tools Backend is Live</h1>"
        "<p>Django Ninja API is operational.</p>"
        "<p><a href='/api/v1/docs' style='color:#D8B15A;font-weight:bold;'>View API Interactive Docs &rarr;</a></p>"
        "</body></html>",
        content_type='text/html'
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', api.urls),
    # Serve Vite compiled assets (/assets/...)
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIST / 'assets'}),
    # Serve root PWA & static assets (manifest.json, sw.js, favicon.svg, wasm, etc.)
    re_path(r'^(?P<path>[^/]+\.(?:json|js|ico|png|svg|wasm|webmanifest|txt))$', serve, {'document_root': FRONTEND_DIST}),
    # Catch-all route to serve React index.html for client-side routing
    re_path(r'^(?!admin/|api/|static/).*$', index_view),
]

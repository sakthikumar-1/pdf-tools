import os
import mimetypes
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
    Returns index.html with appropriate caching headers.
    Supports pre-compressed index.html.gz.
    """
    if INDEX_FILE.exists():
        accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
        gz_index = FRONTEND_DIST / 'index.html.gz'
        if 'gzip' in accept_encoding and gz_index.exists():
            response = FileResponse(open(gz_index, 'rb'), content_type='text/html')
            response['Content-Encoding'] = 'gzip'
        else:
            response = FileResponse(open(INDEX_FILE, 'rb'), content_type='text/html')
        response['Cache-Control'] = 'no-cache, must-revalidate'
        response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        return response
    return HttpResponse(
        "<!DOCTYPE html><html><head><title>Simatrix PDF Tools API</title></head>"
        "<body style='font-family:sans-serif;text-align:center;padding:50px;'>"
        "<h1>Simatrix PDF Tools Backend is Live</h1>"
        "<p>Django Ninja API is operational.</p>"
        "<p><a href='/api/v1/docs' style='color:#E53935;font-weight:bold;'>View API Interactive Docs &rarr;</a></p>"
        "</body></html>",
        content_type='text/html'
    )


def serve_immutable_asset(request, path):
    """
    Serves compiled Vite assets with aggressive immutable caching headers.
    Vite assets have content hashes in their filenames, so they can be cached
    for 1 year without risk of stale code. Automatically serves pre-compressed
    gzip (.gz) files when supported by the client.
    """
    accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
    gz_file = FRONTEND_DIST / 'assets' / f"{path}.gz"
    if 'gzip' in accept_encoding and gz_file.exists():
        response = FileResponse(open(gz_file, 'rb'))
        content_type, _ = mimetypes.guess_type(path)
        if content_type:
            response['Content-Type'] = content_type
        response['Content-Encoding'] = 'gzip'
        response['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response

    response = serve(request, path, document_root=FRONTEND_DIST / 'assets')
    response['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', api.urls),
    # Serve Vite compiled assets with 1-year immutable caching
    re_path(r'^assets/(?P<path>.*)$', serve_immutable_asset),
    # Serve root PWA & static assets (manifest.json, sw.js, favicon.svg, wasm, etc.)
    re_path(r'^(?P<path>[^/]+\.(?:json|js|ico|png|svg|wasm|webmanifest|txt))$', serve, {'document_root': FRONTEND_DIST}),
    # Catch-all route to serve React index.html for client-side routing
    re_path(r'^(?!admin/|api/|static/).*$', index_view),
]

#!/usr/bin/env bash
# Render Build Script for Simatrix PDF Tools
set -o errexit

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Running Django database migrations..."
python manage.py migrate --noinput || python backend_django/manage.py migrate --noinput || true

echo "==> Collecting static files..."
python manage.py collectstatic --noinput --clear || python backend_django/manage.py collectstatic --noinput --clear || true

echo "==> Initializing storage directories..."
mkdir -p backend_django/storage/uploads
mkdir -p backend_django/storage/outputs
mkdir -p backend_django/storage/processing
mkdir -p backend_django/logs

echo "==> Render build finished successfully!"

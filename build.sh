#!/usr/bin/env bash
# Render Build Script for Simatrix PDF Tools
set -o errexit

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Running Django database migrations..."
python backend_django/manage.py migrate --noinput

echo "==> Collecting static files..."
python backend_django/manage.py collectstatic --noinput --clear

echo "==> Initializing storage directories..."
mkdir -p backend_django/storage/uploads
mkdir -p backend_django/storage/outputs
mkdir -p backend_django/storage/processing
mkdir -p backend_django/logs

echo "==> Render build finished successfully!"

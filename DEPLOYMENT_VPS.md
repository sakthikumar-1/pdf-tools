# Simatrix Academy PDF Tools — Production VPS Deployment Guide

**Architecture:** Python 3.12 + Django 5.1 + Django Ninja + MySQL 8.0 + Nginx + Gunicorn (Uvicorn Workers)  
**Frontend:** React 18 + Vite SPA (Pre-rendered static bundle served via Nginx)  
**PHP Status:** **ZERO PHP RUNTIME DEPENDENCIES** (Completely removed and deprecated)  

---

## 1. System Requirements & Prerequisites

- **Target Operating System:** Ubuntu 22.04 LTS or 24.04 LTS (x86_64)
- **Minimum Hardware:** 2 vCPU, 4 GB RAM, 20 GB SSD
- **Recommended Hardware:** 4 vCPU, 8 GB RAM, 50 GB NVMe SSD (for high concurrent conversions)
- **Networking:** Static public IPv4, domain DNS pointing to server (`A` record)
- **Inbound Ports:** `80` (HTTP), `443` (HTTPS), `22` (SSH)

---

## 2. Server Provisioning & Package Installation

```bash
# 1. Update system package repository
sudo apt update && sudo apt upgrade -y

# 2. Install essential system dependencies and Python 3.12
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    nginx \
    certbot \
    python3-certbot-nginx \
    mysql-server \
    curl \
    git

# 3. Verify Python version
python3 --version  # Should be Python 3.10+
```

---

## 3. MySQL 8 Database Configuration

```bash
# 1. Secure MySQL installation
sudo mysql_secure_installation

# 2. Create the application database and dedicated non-root user
sudo mysql -u root -p
```

```sql
-- Inside MySQL Prompt:
CREATE DATABASE pdf_tool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated application user (replace 'StrongPasswordHere' with secure random password)
CREATE USER 'simatrix_app'@'127.0.0.1' IDENTIFIED BY 'StrongPasswordHere';
GRANT ALL PRIVILEGES ON pdf_tool.* TO 'simatrix_app'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Application Deployment & Virtual Environment

```bash
# 1. Create web directory
sudo mkdir -p /var/www/simatrix-pdf-tools
sudo chown -R $USER:$USER /var/www/simatrix-pdf-tools

# 2. Clone repository to server
git clone <YOUR_GIT_REPO_URL> /var/www/simatrix-pdf-tools
cd /var/www/simatrix-pdf-tools

# 3. Set up Python virtual environment
cd /var/www/simatrix-pdf-tools/backend_django
python3 -m venv venv
source venv/bin/activate

# 4. Install production dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Configure production environment variables
cp .env.example .env
nano .env
```

Ensure `.env` contains:
```ini
DJANGO_SECRET_KEY=generate-a-strong-random-secret-key-with-openssl-rand-hex-32
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=pdftools.simatrix.com,127.0.0.1,localhost
DJANGO_SETTINGS_MODULE=core.settings.production

DB_ENGINE=django.db.backends.mysql
DB_NAME=pdf_tool
DB_USER=simatrix_app
DB_PASSWORD=StrongPasswordHere
DB_HOST=127.0.0.1
DB_PORT=3306

STORAGE_ROOT=/var/www/simatrix-pdf-tools/backend_django/storage
CORS_ALLOWED_ORIGINS=https://pdftools.simatrix.com
```

---

## 5. Migrations & Storage Isolation

```bash
# 1. Run database migrations
python manage.py migrate

# 2. Create Django admin superuser (optional)
python manage.py createsuperuser

# 3. Create isolated storage directories with strict permissions
mkdir -p storage/uploads storage/outputs storage/processing logs
sudo chown -R www-data:www-data storage logs
sudo chmod -R 750 storage logs

# 4. Verify system checks in production mode
python manage.py check --deploy --settings=core.settings.production
```

---

## 6. Frontend Build

```bash
# 1. Install Node.js 20+ LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install dependencies & build production bundle
cd /var/www/simatrix-pdf-tools/frontend
npm ci
npm run build

# 3. Verify dist folder exists
ls -lh dist/index.html
```

---

## 7. Systemd Service & Automated Cleanup

```bash
# 1. Copy application service file
sudo cp /var/www/simatrix-pdf-tools/backend_django/deploy/simatrix_pdf.service /etc/systemd/system/

# 2. Copy automated cleanup timer (purges expired files every 15 minutes)
sudo cp /var/www/simatrix-pdf-tools/backend_django/deploy/simatrix_cleanup.service /etc/systemd/system/
sudo cp /var/www/simatrix-pdf-tools/backend_django/deploy/simatrix_cleanup.timer /etc/systemd/system/

# 3. Create logging directory for Gunicorn
sudo mkdir -p /var/log/simatrix-pdf
sudo chown -R www-data:www-data /var/log/simatrix-pdf

# 4. Reload and start services
sudo systemctl daemon-reload
sudo systemctl enable --now simatrix_pdf.service
sudo systemctl enable --now simatrix_cleanup.timer

# 5. Verify service status
sudo systemctl status simatrix_pdf.service
sudo systemctl list-timers | grep simatrix
```

---

## 8. Nginx Web Server & HTTPS (Let's Encrypt)

```bash
# 1. Install Nginx site configuration
sudo cp /var/www/simatrix-pdf-tools/backend_django/deploy/simatrix_pdf.nginx.conf /etc/nginx/sites-available/simatrix_pdf
sudo ln -sf /etc/nginx/sites-available/simatrix_pdf /etc/nginx/sites-enabled/

# 2. Test Nginx syntax
sudo nginx -t

# 3. Issue SSL certificate via Certbot
sudo certbot --nginx -d pdftools.simatrix.com

# 4. Reload Nginx
sudo systemctl reload nginx
```

---

## 9. Automated Database Backups

Add a daily MySQL backup cron job:
```bash
sudo crontab -e
```
Add the following line:
```cron
0 2 * * * mysqldump -u simatrix_app -p'StrongPasswordHere' pdf_tool | gzip > /var/backups/pdf_tool_$(date +\%F).sql.gz
```

---

## 10. Operational Monitoring & Health Verification

1. **API Health Check**:
   ```bash
   curl -i https://pdftools.simatrix.com/api/v1/health
   # Expected response: {"status":"healthy","service":"Simatrix Academy Django Backend","database":"connected",...}
   ```
2. **Capabilities Verification**:
   ```bash
   curl -i https://pdftools.simatrix.com/api/v1/capabilities
   # Expected response: {"status":"ok","engines":{"pymupdf":true,"pdf2docx":true,"aes256_encryption":true,...}}
   ```
3. **Application Logs**:
   ```bash
   sudo journalctl -u simatrix_pdf.service -f
   tail -f /var/log/simatrix-pdf/gunicorn_error.log
   ```

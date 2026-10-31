import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from backend_django/.env
load_dotenv(BASE_DIR / '.env')

# Security Settings
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'simatrix-pdf-tools-fallback-dev-secret-key-change-me')
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

# Allowed Hosts (Permissive for Render and Local Development)
raw_hosts = os.getenv('DJANGO_ALLOWED_HOSTS', '*').strip()
if raw_hosts and raw_hosts != '*':
    ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(',') if h.strip()]
else:
    ALLOWED_HOSTS = ['*']

render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
for host in [
    render_host,
    '.onrender.com',
    'pdf-tools-2-g8im.onrender.com',
    'pdf-tools-4-idi2.onrender.com',
    '127.0.0.1',
    'localhost',
    '0.0.0.0',
    'testserver',
]:
    if host and host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'corsheaders',
    # Local apps
    'apps.authentication',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# Database Configuration (Supports Render DATABASE_URL, MySQL, or SQLite)
database_url = os.getenv('DATABASE_URL')
if database_url:
    try:
        import dj_database_url
        DATABASES = {
            'default': dj_database_url.config(
                default=database_url,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
    except ImportError:
        pass

if 'DATABASES' not in locals() or 'default' not in DATABASES:
    db_host = os.getenv('DB_HOST', '').strip()
    db_engine = os.getenv('DB_ENGINE', '').strip()
    # Use MySQL InnoDB database
    if db_host and 'mysql' in db_engine and os.getenv('USE_SQLITE', '').lower() not in ('1', 'true'):
        DATABASES = {
            'default': {
                'ENGINE': db_engine,
                'NAME': os.getenv('DB_NAME', 'pdf_tool'),
                'USER': os.getenv('DB_USER', 'root'),
                'PASSWORD': os.getenv('DB_PASSWORD', ''),
                'HOST': db_host,
                'PORT': os.getenv('DB_PORT', '3306'),
                'OPTIONS': {
                    'charset': 'utf8mb4',
                    'init_command': "SET default_storage_engine=INNODB, sql_mode='STRICT_TRANS_TABLES'",
                },
                'TEST': {
                    'CHARSET': 'utf8mb4',
                    'COLLATION': 'utf8mb4_unicode_ci',
                },
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

# Custom User Model (Condition 2: Configured before first database migration)
AUTH_USER_MODEL = 'authentication.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings for React Frontend
CORS_ALLOW_CREDENTIALS = True
raw_cors = os.getenv('CORS_ALLOWED_ORIGINS', '').strip()
if raw_cors:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in raw_cors.split(',') if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://pdf-tools-2-g8im.onrender.com',
        'https://pdf-tools-4-idi2.onrender.com',
    ]

# Permit all Render frontend deployment URLs dynamically
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https:\/\/.*\.onrender\.com$',
    r'^http:\/\/localhost:[0-9]+$',
    r'^http:\/\/127\.0\.0\.1:[0-9]+$',
]

# CSRF Trusted Origins (Render and local)
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]
for origin in [
    'https://*.onrender.com',
    'https://pdf-tools-2-g8im.onrender.com',
    'https://pdf-tools-4-idi2.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
]:
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)

# Allow Google Identity Services OAuth popup to communicate with opener
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

# Configurable Private Storage Directory (Isolated outside public web root)
storage_root_env = os.getenv('STORAGE_ROOT', 'storage')
STORAGE_ROOT = Path(storage_root_env) if os.path.isabs(storage_root_env) else (BASE_DIR / storage_root_env)
UPLOADS_DIR = STORAGE_ROOT / 'uploads'
OUTPUTS_DIR = STORAGE_ROOT / 'outputs'
PROCESSING_DIR = STORAGE_ROOT / 'processing'

for directory in [STORAGE_ROOT, UPLOADS_DIR, OUTPUTS_DIR, PROCESSING_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# AI Provider Configuration (Environment variables only — zero frontend exposure)
AI_PROVIDER = os.getenv('AI_PROVIDER', 'router')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')
DEEPSEEK_BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', os.getenv('GOOGLE_API_KEY', ''))
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

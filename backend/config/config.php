<?php
/**
 * Simatrix Academy PDF Tools - Configuration File
 */

// Environment settings
define('APP_ENV', 'production'); // 'development' or 'production'
define('APP_NAME', 'Simatrix Academy PDF Tools');

// Base Paths
define('BASE_PATH', dirname(__DIR__));

// Storage Path Configuration
// In production (VPS or cPanel), storage SHOULD reside outside the public web root.
// 1. Checks SIMATRIX_STORAGE_PATH environment variable if explicitly configured.
// 2. Checks if an isolated parent storage directory (e.g., dirname(BASE_PATH) . '/storage') exists.
// 3. Defaults safely to BASE_PATH . '/storage' with access-control guards.
$envStorage = getenv('SIMATRIX_STORAGE_PATH');
if (!empty($envStorage)) {
    define('STORAGE_PATH', rtrim($envStorage, '/\\'));
} else {
    $parentStorage = dirname(BASE_PATH) . DIRECTORY_SEPARATOR . 'storage';
    if (file_exists($parentStorage) && is_dir($parentStorage)) {
        define('STORAGE_PATH', $parentStorage);
    } else {
        define('STORAGE_PATH', BASE_PATH . DIRECTORY_SEPARATOR . 'storage');
    }
}

define('UPLOADS_DIR', STORAGE_PATH . DIRECTORY_SEPARATOR . 'uploads');
define('PROCESSING_DIR', STORAGE_PATH . DIRECTORY_SEPARATOR . 'processing');
define('OUTPUTS_DIR', STORAGE_PATH . DIRECTORY_SEPARATOR . 'outputs');
define('LOGS_DIR', STORAGE_PATH . DIRECTORY_SEPARATOR . 'logs');

// File Restrictions & Security Limits
define('MAX_UPLOAD_SIZE', 50 * 1024 * 1024); // 50MB in bytes
define('ALLOWED_EXTENSIONS', ['pdf']);
define('FILE_RETENTION_SECONDS', 3600); // Automatically delete temporary files after 1 hour

// CORS Headers setup
function apply_cors_headers() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Ensure necessary storage directories exist with secure permissions
$directories = [STORAGE_PATH, UPLOADS_DIR, PROCESSING_DIR, OUTPUTS_DIR, LOGS_DIR];
foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        @mkdir($dir, 0750, true);
    }
    // Place 403 index.php guard in each directory if absent
    $guardFile = $dir . DIRECTORY_SEPARATOR . 'index.php';
    if (!file_exists($guardFile) && is_dir($dir)) {
        @file_put_contents($guardFile, "<?php http_response_code(403); exit;");
    }
}

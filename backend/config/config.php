<?php
/**
 * Simatrix Academy PDF Tools - Configuration File
 */

// Environment settings
define('APP_ENV', 'production'); // 'development' or 'production'
define('APP_NAME', 'Simatrix Academy PDF Tools');

// Base Paths
define('BASE_PATH', dirname(__DIR__));
define('STORAGE_PATH', BASE_PATH . '/storage');
define('UPLOADS_DIR', STORAGE_PATH . '/uploads');
define('PROCESSING_DIR', STORAGE_PATH . '/processing');
define('OUTPUTS_DIR', STORAGE_PATH . '/outputs');
define('LOGS_DIR', BASE_PATH . '/logs');

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

// Ensure necessary storage directories exist
$directories = [UPLOADS_DIR, PROCESSING_DIR, OUTPUTS_DIR, LOGS_DIR];
foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
    }
}

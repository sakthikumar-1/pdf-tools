<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/response.php';

apply_cors_headers();

send_json_success([
    'status' => 'ok',
    'app' => APP_NAME,
    'time' => date('Y-m-d H:i:s'),
    'imagick_available' => extension_loaded('imagick')
], 'System operating normally');

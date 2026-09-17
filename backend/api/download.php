<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/security.php';
require_once __DIR__ . '/../helpers/response.php';

apply_cors_headers();

$fileName = isset($_GET['file']) ? sanitize_filename($_GET['file']) : '';

if (empty($fileName)) {
    send_json_error('Missing file parameter.', 400);
}

$filePath = OUTPUTS_DIR . '/' . $fileName;

if (!file_exists($filePath) || !prevent_path_traversal($filePath, OUTPUTS_DIR)) {
    send_json_error('File not found or link expired.', 404);
}

$mimeType = mime_content_type($filePath) ?: 'application/octet-stream';

header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($filePath));

readfile($filePath);
exit;

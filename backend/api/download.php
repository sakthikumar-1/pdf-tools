<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/security.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../services/FileService.php';

apply_cors_headers();

// Run opportunistic storage cleanup
$fileService = new FileService();
$fileService->opportunisticCleanup(0.1);

// 1. Enforce GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_json_error('Method not allowed. Use GET.', 405);
}

// 2. Validate file parameter presence
$rawFile = isset($_GET['file']) ? $_GET['file'] : '';
if (empty($rawFile) || !is_string($rawFile)) {
    send_json_error('Missing or invalid file parameter.', 400);
}

// 3. Strict filename structure validation (must be single filename, no slashes, null bytes, or multi-dots)
if (strpos($rawFile, '/') !== false || strpos($rawFile, '\\') !== false || strpos($rawFile, "\0") !== false) {
    send_json_error('Invalid filename format.', 400);
}

$fileName = sanitize_filename($rawFile);
if (empty($fileName) || $fileName !== $rawFile) {
    send_json_error('Invalid filename characters.', 400);
}

// 4. Allowed extension whitelist for generated downloads
$extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$allowedDownloadExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'zip'];
if (!in_array($extension, $allowedDownloadExtensions, true)) {
    send_json_error('File type not permitted for download.', 403);
}

// 5. Verify file path within OUTPUTS_DIR boundary
$filePath = OUTPUTS_DIR . DIRECTORY_SEPARATOR . $fileName;

if (!file_exists($filePath) || !prevent_path_traversal($filePath, OUTPUTS_DIR)) {
    send_json_error('File not found or link expired.', 404);
}

// 6. Check file expiration (retention period)
if ($fileService->isExpired($filePath, FILE_RETENTION_SECONDS)) {
    $fileService->deleteIfExpired($filePath, FILE_RETENTION_SECONDS);
    send_json_error('File not found or link expired.', 404);
}

// 7. Determine MIME type
$mimeType = @mime_content_type($filePath);
if (!$mimeType) {
    $mimeMap = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'pdf' => 'application/pdf',
        'zip' => 'application/zip'
    ];
    $mimeType = isset($mimeMap[$extension]) ? $mimeMap[$extension] : 'application/octet-stream';
}

// 8. Stream file with security and transfer headers
header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-transform, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Length: ' . filesize($filePath));

// Clear output buffers to ensure reliable binary streaming
while (ob_get_level() > 0) {
    ob_end_clean();
}

readfile($filePath);
exit;

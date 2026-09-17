<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validation.php';
require_once __DIR__ . '/../services/UploadService.php';
require_once __DIR__ . '/../services/FileService.php';

apply_cors_headers();

// Run background storage cleanup
$fileService = new FileService();
$fileService->cleanupOldFiles();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_error('Method not allowed. Use POST.', 405);
}

$validation = validate_uploaded_pdf('file');
if (!$validation['valid']) {
    send_json_error($validation['message'], 400);
}

$uploadService = new UploadService();
$result = $uploadService->saveUploadedFile($validation['file']);

if ($result['success']) {
    send_json_success([
        'originalName' => $result['originalName'],
        'fileId' => $result['uniqueName'],
        'size' => $result['size']
    ], 'File uploaded successfully');
} else {
    send_json_error($result['message'], 500);
}

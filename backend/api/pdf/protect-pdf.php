<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validation.php';
require_once __DIR__ . '/../../services/UploadService.php';

apply_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_error('Method not allowed. Use POST.', 405);
}

$validation = validate_uploaded_pdf('file');
if (!$validation['valid']) {
    send_json_error($validation['message'], 400);
}

$password = isset($_POST['password']) ? trim($_POST['password']) : '';
if (empty($password)) {
    send_json_error('Password is required.', 400);
}

$uploadService = new UploadService();
$uploadResult = $uploadService->saveUploadedFile($validation['file']);
if (!$uploadResult['success']) {
    send_json_error($uploadResult['message'], 500);
}

$inputPath = $uploadResult['path'];
$outputPath = OUTPUTS_DIR . '/protected_' . bin2hex(random_bytes(4)) . '.pdf';

$cmd = sprintf("qpdf --encrypt %s %s 256 -- %s %s 2>&1",
    escapeshellarg($password),
    escapeshellarg($password),
    escapeshellarg($inputPath),
    escapeshellarg($outputPath)
);

@exec($cmd, $output, $returnVar);
@unlink($inputPath);

if ($returnVar === 0 && file_exists($outputPath)) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="protected.pdf"');
    header('Content-Length: ' . filesize($outputPath));
    readfile($outputPath);
    @unlink($outputPath);
    exit;
} else {
    send_json_error('qpdf encryption failed or qpdf binary not found.', 500);
}

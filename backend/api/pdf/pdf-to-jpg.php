<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validation.php';
require_once __DIR__ . '/../../services/UploadService.php';
require_once __DIR__ . '/../../services/PDFService.php';

apply_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_error('Method not allowed. Use POST.', 405);
}

$validation = validate_uploaded_pdf('file');
if (!$validation['valid']) {
    send_json_error($validation['message'], 400);
}

// Save uploaded PDF file to temporary upload directory
$uploadService = new UploadService();
$uploadResult = $uploadService->saveUploadedFile($validation['file']);

if (!$uploadResult['success']) {
    send_json_error($uploadResult['message'], 500);
}

$dpi = isset($_POST['quality']) && $_POST['quality'] === 'high' ? 300 : 150;

// Execute PDF to JPG processing
$pdfService = new PDFService();
$conversionResult = $pdfService->convertPdfToJpg($uploadResult['path'], $dpi);

// Clean temporary uploaded PDF
@unlink($uploadResult['path']);

if ($conversionResult['success']) {
    send_json_success([
        'originalName' => $uploadResult['originalName'],
        'totalPages' => $conversionResult['totalPages'],
        'images' => $conversionResult['images']
    ], 'PDF converted to JPG successfully');
} else {
    send_json_error($conversionResult['message'], 500, [
        'useClientFallback' => isset($conversionResult['useClientFallback']) ? $conversionResult['useClientFallback'] : false
    ]);
}

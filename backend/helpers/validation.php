<?php
/**
 * File & Request Input Validation Helpers
 */

function validate_uploaded_pdf($fileKey = 'file') {
    if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
        $errorCode = isset($_FILES[$fileKey]) ? $_FILES[$fileKey]['error'] : UPLOAD_ERR_NO_FILE;
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return ['valid' => false, 'message' => 'The uploaded file exceeds the maximum allowed file size.'];
            case UPLOAD_ERR_NO_FILE:
                return ['valid' => false, 'message' => 'Please select a PDF file to upload.'];
            default:
                return ['valid' => false, 'message' => 'File upload failed. Please try again.'];
        }
    }

    $file = $_FILES[$fileKey];

    // Check size limit
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        return ['valid' => false, 'message' => 'File size exceeds the 50MB limit.'];
    }

    // Extension check
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($extension !== 'pdf') {
        return ['valid' => false, 'message' => 'Invalid file extension. Only PDF documents are allowed.'];
    }

    // MIME type check
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = ['application/pdf', 'application/x-pdf', 'application/acrobat', 'applications/vnd.pdf', 'text/pdf', 'text/x-pdf'];
    if (!in_array($mimeType, $allowedMimes)) {
        // Double check PDF file header bytes (%PDF)
        $handle = fopen($file['tmp_name'], 'r');
        $header = fread($handle, 4);
        fclose($handle);
        if ($header !== '%PDF') {
            return ['valid' => false, 'message' => 'The selected file is not a valid PDF document.'];
        }
    }

    return ['valid' => true, 'file' => $file];
}

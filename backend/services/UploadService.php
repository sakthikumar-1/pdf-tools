<?php
/**
 * Upload Service
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/security.php';

class UploadService {
    public function saveUploadedFile($file) {
        $cleanName = sanitize_filename($file['name']);
        $uniqueName = generate_unique_filename('upload', 'pdf');
        $targetPath = UPLOADS_DIR . '/' . $uniqueName;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            return [
                'success' => true,
                'originalName' => $cleanName,
                'uniqueName' => $uniqueName,
                'path' => $targetPath,
                'size' => $file['size']
            ];
        }

        return ['success' => false, 'message' => 'Failed to save uploaded file to storage.'];
    }
}

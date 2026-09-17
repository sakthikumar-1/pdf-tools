<?php
/**
 * File Management & Auto-cleanup Service
 */
require_once __DIR__ . '/../config/config.php';

class FileService {
    /**
     * Deletes temporary processing & output files older than retention period
     */
    public function cleanupOldFiles() {
        $directories = [UPLOADS_DIR, PROCESSING_DIR, OUTPUTS_DIR];
        $now = time();

        foreach ($directories as $dir) {
            if (!is_dir($dir)) continue;

            $files = glob($dir . '/*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    if ($now - filemtime($file) > FILE_RETENTION_SECONDS) {
                        @unlink($file);
                    }
                }
            }
        }
    }
}

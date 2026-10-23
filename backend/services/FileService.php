<?php
/**
 * File Management & Auto-cleanup Service
 */
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/security.php';

class FileService {
    /**
     * Protected guard filenames that should never be deleted by automated cleanups
     */
    private $protectedFiles = ['.htaccess', 'index.php', 'index.html', '.gitignore', 'web.config'];

    /**
     * Checks if a file has exceeded its retention period
     * @param string $filePath
     * @param int $maxAgeSeconds
     * @return bool
     */
    public function isExpired($filePath, $maxAgeSeconds = FILE_RETENTION_SECONDS) {
        if (!file_exists($filePath)) {
            return true;
        }
        $mtime = @filemtime($filePath);
        if ($mtime === false) {
            return true;
        }
        return (time() - $mtime) > $maxAgeSeconds;
    }

    /**
     * Deletes a file if it has exceeded its retention period
     * @param string $filePath
     * @param int $maxAgeSeconds
     * @return bool True if deleted, false otherwise
     */
    public function deleteIfExpired($filePath, $maxAgeSeconds = FILE_RETENTION_SECONDS) {
        $basename = basename($filePath);
        if (in_array($basename, $this->protectedFiles, true)) {
            return false;
        }

        if ($this->isExpired($filePath, $maxAgeSeconds)) {
            return @unlink($filePath);
        }
        return false;
    }

    /**
     * Deletes temporary processing & output files older than retention period
     * Preserves directory security guard files (.htaccess, index.php)
     * @param int $maxAgeSeconds
     * @return int Number of deleted files
     */
    public function cleanupOldFiles($maxAgeSeconds = FILE_RETENTION_SECONDS) {
        $directories = [UPLOADS_DIR, PROCESSING_DIR, OUTPUTS_DIR];
        $now = time();
        $deletedCount = 0;

        foreach ($directories as $dir) {
            if (!is_dir($dir)) continue;

            $items = @scandir($dir);
            if ($items === false) continue;

            foreach ($items as $item) {
                if ($item === '.' || $item === '..' || in_array($item, $this->protectedFiles, true)) {
                    continue;
                }

                $filePath = $dir . DIRECTORY_SEPARATOR . $item;
                if (is_file($filePath)) {
                    $mtime = @filemtime($filePath);
                    if ($mtime !== false && ($now - $mtime) > $maxAgeSeconds) {
                        if (@unlink($filePath)) {
                            $deletedCount++;
                        }
                    }
                }
            }
        }
        return $deletedCount;
    }

    /**
     * Opportunistically runs cleanup with a given probability (e.g. 1 in 10 requests)
     * @param float $probability Float between 0.01 and 1.0
     */
    public function opportunisticCleanup($probability = 0.1) {
        if (mt_rand(1, 100) <= (int)($probability * 100)) {
            $this->cleanupOldFiles();
        }
    }
}

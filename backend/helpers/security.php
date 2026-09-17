<?php
/**
 * Security & Sanitization Helpers
 */

function sanitize_filename($filename) {
    // Remove null bytes and path traversal sequences
    $filename = str_replace(["\0", "../", "..\\"], '', $filename);
    // Keep alphanumeric, dots, hyphens, and underscores
    $filename = preg_replace("/[^a-zA-Z0-9\._-]/", "_", $filename);
    return $filename;
}

function generate_unique_filename($prefix = 'file', $extension = 'pdf') {
    return sprintf('%s_%s_%s.%s', $prefix, date('Ymd_His'), bin2hex(random_bytes(4)), $extension);
}

function prevent_path_traversal($filepath, $baseDirectory) {
    $realBase = realpath($baseDirectory);
    $realPath = realpath($filepath);

    if ($realPath === false || strpos($realPath, $realBase) !== 0) {
        return false;
    }
    return true;
}

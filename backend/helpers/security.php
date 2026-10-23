<?php
/**
 * Security & Sanitization Helpers
 */

function sanitize_filename($filename) {
    // Strip null bytes
    $filename = str_replace("\0", '', (string)$filename);
    // Extract base filename to neutralize path segments
    $filename = basename($filename);
    // Keep strictly alphanumeric, dots, hyphens, and underscores
    $filename = preg_replace("/[^a-zA-Z0-9\._-]/", "_", $filename);
    // Neutralize multi-dot sequences (e.g. .. or ...)
    $filename = preg_replace("/\.{2,}/", '.', $filename);
    return trim($filename, "._ ");
}

function generate_unique_filename($prefix = 'file', $extension = 'pdf') {
    // 16 bytes (128-bit) cryptographically secure random entropy
    $randomHex = bin2hex(random_bytes(16));
    $cleanPrefix = preg_replace("/[^a-zA-Z0-9_-]/", "", $prefix);
    $cleanExt = preg_replace("/[^a-zA-Z0-9]/", "", $extension);
    return sprintf('%s_%s_%s.%s', $cleanPrefix, date('Ymd_His'), $randomHex, $cleanExt);
}

function prevent_path_traversal($filepath, $baseDirectory) {
    $realBase = realpath($baseDirectory);
    $realPath = realpath($filepath);

    if ($realBase === false || $realPath === false) {
        return false;
    }

    // Ensure trailing directory separator to avoid prefix collision (e.g. /outputs vs /outputs_evil)
    $realBaseNormalized = rtrim($realBase, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $realPathNormalized = is_dir($realPath) ? rtrim($realPath, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR : $realPath;

    return (strpos($realPathNormalized, $realBaseNormalized) === 0);
}

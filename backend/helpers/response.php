<?php
/**
 * Standardized JSON API Response Helpers
 */

function send_json_success($data = [], $message = 'Success', $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function send_json_error($message = 'An error occurred', $code = 400, $details = null) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    $response = [
        'success' => false,
        'message' => $message
    ];
    if ($details !== null) {
        $response['details'] = $details;
    }
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

<?php
/**
 * 响应工具函数
 */

function json_success($data = null, string $message = 'success', int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'code' => 0,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $httpCode = 400, int $bizCode = -1): void
{
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'code' => $bizCode,
        'message' => $message,
        'data' => null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_input(): array
{
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}

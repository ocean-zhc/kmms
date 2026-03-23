<?php
/**
 * CORS中间件
 */

function handle_cors(): void
{
    $config = require __DIR__ . '/../config.php';
    $cors = $config['cors'];

    header("Access-Control-Allow-Origin: {$cors['origin']}");
    header("Access-Control-Allow-Methods: {$cors['methods']}");
    header("Access-Control-Allow-Headers: {$cors['headers']}");
    header('Access-Control-Max-Age: 86400');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

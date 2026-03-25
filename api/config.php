<?php
/**
 * 系统配置文件
 * 支持通过环境变量覆盖默认值
 */

if (!function_exists('env')) {
    function env(string $key, $default = '') {
        return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default;
    }
}

return [
    // 数据库配置
    'db' => [
        'host' => env('DB_HOST', '127.0.0.1'),
        'port' => env('DB_PORT', 5432),
        'dbname' => env('DB_NAME', 'kmms'),
        'user' => env('DB_USER', 'postgres'),
        'password' => env('DB_PASSWORD', ''),
    ],

    // JWT配置
    'jwt' => [
        'secret' => env('JWT_SECRET', 'change-me'),
        'expire' => 86400 * 7,
        'issuer' => 'kmms',
    ],

    // 跨域配置
    'cors' => [
        'origin' => '*',
        'methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'headers' => 'Content-Type, Authorization',
    ],

    // 工作日API
    'workday_api' => 'https://timor.tech/api/holiday/info',

    // 今日所学推送密钥（Automate调用时需携带）
    'daily_learning_secret' => env('DAILY_LEARNING_SECRET', 'kmms-learning-2026'),
];

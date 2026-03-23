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
        'host' => env('DB_HOST', '192.168.1.3'),
        'port' => env('DB_PORT', 5432),
        'dbname' => env('DB_NAME', 'kmms'),
        'user' => env('DB_USER', 'postgres'),
        'password' => env('DB_PASSWORD', '123456'),
    ],

    // JWT配置
    'jwt' => [
        'secret' => env('JWT_SECRET', 'kmms_jwt_secret_key_2026'),
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
];

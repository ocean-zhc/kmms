<?php
/**
 * JWT认证中间件
 */

function verify_admin_auth(): array
{
    // 多种方式获取 Authorization header（兼容 Apache/Nginx/CGI）
    $header = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    } elseif (!empty($_SERVER['PHP_AUTH_DIGEST'])) {
        $header = $_SERVER['PHP_AUTH_DIGEST'];
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        json_error('未登录或登录已过期', 401);
    }

    $token = $matches[1];
    $config = require __DIR__ . '/../config.php';
    $secret = $config['jwt']['secret'];

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        json_error('无效的认证令牌', 401);
    }

    [$headerB64, $payloadB64, $signatureB64] = $parts;

    // 验证签名
    $expectedSig = base64url_encode(
        hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true)
    );

    if (!hash_equals($expectedSig, $signatureB64)) {
        json_error('认证令牌签名无效', 401);
    }

    $payload = json_decode(base64url_decode($payloadB64), true);
    if (!$payload) {
        json_error('认证令牌格式错误', 401);
    }

    // 检查过期
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        json_error('登录已过期，请重新登录', 401);
    }

    return $payload;
}

function verify_superadmin_auth(): array
{
    $payload = verify_admin_auth();
    if (($payload['role'] ?? '') !== 'superadmin') {
        json_error('需要配置管理员权限', 403);
    }
    return $payload;
}

function create_jwt(array $payload): string
{
    $config = require __DIR__ . '/../config.php';
    $secret = $config['jwt']['secret'];

    $header = base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload['iss'] = $config['jwt']['issuer'];
    $payload['iat'] = time();
    $payload['exp'] = time() + $config['jwt']['expire'];
    $payloadB64 = base64url_encode(json_encode($payload));

    $signature = base64url_encode(
        hash_hmac('sha256', "$header.$payloadB64", $secret, true)
    );

    return "$header.$payloadB64.$signature";
}

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

<?php
/**
 * 认证控制器
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class AuthController
{
    /**
     * 管理员登录
     */
    public static function login(): void
    {
        $input = get_json_input();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if ($username === '' || $password === '') {
            json_error('用户名和密码不能为空');
        }

        $db = DB::getInstance();
        $stmt = $db->prepare('SELECT id, username, password, real_name, role FROM admin_users WHERE username = :username');
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            json_error('用户名或密码错误');
        }

        $token = create_jwt([
            'uid' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'] ?? 'admin',
        ]);

        // 记录登录日志
        $logStmt = $db->prepare('INSERT INTO operation_logs (admin_id, action, ip_address) VALUES (:admin_id, :action, :ip)');
        $logStmt->execute([
            ':admin_id' => $user['id'],
            ':action' => 'login',
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);

        json_success([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'realName' => $user['real_name'],
                'role' => $user['role'] ?? 'admin',
            ],
        ], '登录成功');
    }

    /**
     * 获取当前用户信息
     */
    public static function currentUser(): void
    {
        $auth = verify_admin_auth();
        $db = DB::getInstance();
        $stmt = $db->prepare('SELECT id, username, real_name, role FROM admin_users WHERE id = :id');
        $stmt->execute([':id' => $auth['uid']]);
        $user = $stmt->fetch();

        if (!$user) {
            json_error('用户不存在', 404);
        }

        json_success([
            'id' => $user['id'],
            'username' => $user['username'],
            'realName' => $user['real_name'],
            'role' => $user['role'] ?? 'admin',
        ]);
    }

    /**
     * 修改密码
     */
    public static function changePassword(): void
    {
        $auth = verify_admin_auth();
        $input = get_json_input();
        $oldPassword = $input['oldPassword'] ?? '';
        $newPassword = $input['newPassword'] ?? '';

        if ($oldPassword === '' || $newPassword === '') {
            json_error('旧密码和新密码不能为空');
        }

        if (strlen($newPassword) < 6) {
            json_error('新密码长度不能少于6位');
        }

        $db = DB::getInstance();
        $stmt = $db->prepare('SELECT password FROM admin_users WHERE id = :id');
        $stmt->execute([':id' => $auth['uid']]);
        $user = $stmt->fetch();

        if (!password_verify($oldPassword, $user['password'])) {
            json_error('旧密码不正确');
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $db->prepare('UPDATE admin_users SET password = :password WHERE id = :id');
        $stmt->execute([':password' => $hash, ':id' => $auth['uid']]);

        json_success(null, '密码修改成功');
    }
}

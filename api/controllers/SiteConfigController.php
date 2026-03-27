<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class SiteConfigController
{
    /** 公共：获取所有配置 */
    public static function publicGet(): void
    {
        $db = DB::getInstance();
        $rows = $db->query('SELECT key, value FROM site_config')->fetchAll(PDO::FETCH_KEY_PAIR);
        json_success($rows);
    }

    /** 管理端：获取所有配置 */
    public static function list(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $rows = $db->query('SELECT * FROM site_config ORDER BY key')->fetchAll(PDO::FETCH_ASSOC);
        json_success($rows);
    }

    /** 管理端：批量更新 */
    public static function update(): void
    {
        verify_admin_auth();
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) { json_error('参数错误'); return; }

        $db = DB::getInstance();
        $stmt = $db->prepare('INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP');

        foreach ($data as $key => $value) {
            $stmt->execute([$key, is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE)]);
        }
        json_success(null);
    }
}

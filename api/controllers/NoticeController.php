<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class NoticeController
{
    /** 公共接口：获取激活的公告 */
    public static function publicList(): void
    {
        $db = DB::getInstance();
        $rows = $db->query(
            'SELECT id, title, content FROM notices WHERE is_active = true ORDER BY sort_order ASC, id DESC'
        )->fetchAll(PDO::FETCH_ASSOC);
        json_success($rows);
    }

    /** 管理端：获取全部公告 */
    public static function list(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $rows = $db->query(
            'SELECT * FROM notices ORDER BY sort_order ASC, id DESC'
        )->fetchAll(PDO::FETCH_ASSOC);
        json_success($rows);
    }

    /** 管理端：创建公告 */
    public static function create(): void
    {
        verify_admin_auth();
        $data = json_decode(file_get_contents('php://input'), true);
        $title = trim($data['title'] ?? '');
        $content = trim($data['content'] ?? '');
        if (!$content) {
            json_error('公告内容不能为空');
            return;
        }

        $db = DB::getInstance();
        $stmt = $db->prepare(
            'INSERT INTO notices (title, content, is_active, sort_order) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$title, $content, true, intval($data['sort_order'] ?? 0)]);
        json_success(['id' => $db->lastInsertId()]);
    }

    /** 管理端：更新公告 */
    public static function update(int $id): void
    {
        verify_admin_auth();
        $data = json_decode(file_get_contents('php://input'), true);
        $db = DB::getInstance();

        $fields = [];
        $params = [];
        foreach (['title', 'content'] as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = ?";
                $params[] = trim($data[$f]);
            }
        }
        if (isset($data['is_active'])) {
            $fields[] = 'is_active = ?';
            $params[] = (bool)$data['is_active'];
        }
        if (isset($data['sort_order'])) {
            $fields[] = 'sort_order = ?';
            $params[] = intval($data['sort_order']);
        }
        if (empty($fields)) {
            json_error('无更新字段');
            return;
        }
        $fields[] = 'updated_at = CURRENT_TIMESTAMP';
        $params[] = $id;

        $stmt = $db->prepare('UPDATE notices SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        json_success(null);
    }

    /** 管理端：删除公告 */
    public static function delete(int $id): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $db->prepare('DELETE FROM notices WHERE id = ?')->execute([$id]);
        json_success(null);
    }
}

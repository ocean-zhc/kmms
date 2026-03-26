<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class DailyLearningController
{
    /** Automate/Tasker 推送接口 */
    public static function receive(): void
    {
        $config = require __DIR__ . '/../config.php';
        $secret = $config['daily_learning_secret'] ?? '';

        // 兼容 JSON 和 form 表单两种提交方式
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
        } else {
            $data = $_POST;
        }

        if (!$secret || ($data['secret'] ?? '') !== $secret) {
            json_error('鉴权失败', 403);
            return;
        }

        $content = trim($data['content'] ?? '');
        if (!$content) {
            json_error('内容不能为空');
            return;
        }

        $parsed = self::parse($content);
        self::upsert($parsed, $content);
    }

    /** 家长端：获取今日所学列表 */
    public static function publicList(): void
    {
        $limit = min((int)($_GET['limit'] ?? 10), 50);
        $db = DB::getInstance();
        $stmt = $db->prepare(
            'SELECT id, activity_date, activity_name, activity_goals, created_at FROM daily_learnings ORDER BY activity_date DESC, id DESC LIMIT ?'
        );
        $stmt->execute([$limit]);
        json_success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** 家长端：获取今天的 */
    public static function today(): void
    {
        $db = DB::getInstance();
        $stmt = $db->prepare(
            'SELECT id, activity_date, activity_name, activity_goals, created_at FROM daily_learnings WHERE activity_date = CURRENT_DATE ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        json_success($row ?: null);
    }

    /** 管理端：录入 */
    public static function adminCreate(): void
    {
        verify_admin_auth();
        $data = json_decode(file_get_contents('php://input'), true);
        $content = trim($data['content'] ?? '');
        if (!$content) { json_error('内容不能为空'); return; }

        $parsed = self::parse($content);
        self::upsert($parsed, $content);
    }

    /** 管理端：删除 */
    public static function adminDelete(int $id): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $db->prepare('DELETE FROM daily_learnings WHERE id = ?')->execute([$id]);
        json_success(null);
    }

    /** 按日期覆盖写入 */
    private static function upsert(array $parsed, string $content): void
    {
        $db = DB::getInstance();
        $existing = $db->prepare('SELECT id FROM daily_learnings WHERE activity_date = ?');
        $existing->execute([$parsed['date']]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $stmt = $db->prepare('UPDATE daily_learnings SET activity_name = ?, activity_goals = ?, raw_content = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?');
            $stmt->execute([$parsed['name'], $parsed['goals'], $content, $row['id']]);
            json_success(['id' => $row['id']]);
        } else {
            $stmt = $db->prepare('INSERT INTO daily_learnings (activity_date, activity_name, activity_goals, raw_content) VALUES (?, ?, ?, ?)');
            $stmt->execute([$parsed['date'], $parsed['name'], $parsed['goals'], $content]);
            json_success(['id' => $db->lastInsertId()]);
        }
    }

    /** 家长端：按月查询 */
    public static function byMonth(): void
    {
        $year = (int)($_GET['year'] ?? date('Y'));
        $month = (int)($_GET['month'] ?? date('n'));
        $db = DB::getInstance();
        $stmt = $db->prepare(
            'SELECT id, activity_date, activity_name, activity_goals, created_at FROM daily_learnings WHERE EXTRACT(YEAR FROM activity_date) = ? AND EXTRACT(MONTH FROM activity_date) = ? ORDER BY activity_date DESC'
        );
        $stmt->execute([$year, $month]);
        json_success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** 解析消息文本 */
    private static function parse(string $text): array
    {
        $date = date('Y-m-d');
        $name = '';
        $goals = '';

        // 提取日期: "3.25" 或 "3月25日"
        if (preg_match('/(\d{1,2})[\.月](\d{1,2})/', $text, $m)) {
            $month = str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $day = str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $date = date('Y') . "-{$month}-{$day}";
        }

        // 提取活动名称：支持"活动名称：xxx"和直接"科目《标题》"两种格式
        if (preg_match('/活动名称[：:]\s*(.+)/u', $text, $m)) {
            $name = trim($m[1]);
        } elseif (preg_match('/([\x{4e00}-\x{9fa5}]+)[《](.+?)[》]/u', $text, $m)) {
            $name = $m[1] . '《' . $m[2] . '》';
        }

        // 提取活动目标（从"活动目标"到文末）
        if (preg_match('/活动目标[：:]\s*([\s\S]+)/u', $text, $m)) {
            $goals = trim($m[1]);
        }

        return compact('date', 'name', 'goals');
    }
}

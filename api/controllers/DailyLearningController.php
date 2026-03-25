<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers/response.php';

class DailyLearningController
{
    /** Automate/Tasker 推送接口 */
    public static function receive(): void
    {
        $config = require __DIR__ . '/../config.php';
        $secret = $config['daily_learning_secret'] ?? '';

        $data = json_decode(file_get_contents('php://input'), true);
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

        $db = DB::getInstance();
        $stmt = $db->prepare(
            'INSERT INTO daily_learnings (activity_date, activity_name, activity_goals, raw_content) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$parsed['date'], $parsed['name'], $parsed['goals'], $content]);

        json_success(['id' => $db->lastInsertId()]);
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

        // 提取活动名称
        if (preg_match('/活动名称[：:]\s*(.+)/u', $text, $m)) {
            $name = trim($m[1]);
        }

        // 提取活动目标（从"活动目标"到文末）
        if (preg_match('/活动目标[：:]\s*([\s\S]+)/u', $text, $m)) {
            $goals = trim($m[1]);
        }

        return compact('date', 'name', 'goals');
    }
}

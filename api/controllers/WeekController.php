<?php
/**
 * 周食谱控制器
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class WeekController
{
    /**
     * 获取周列表（管理端）
     */
    public static function list(): void
    {
        $auth = verify_admin_auth();
        $db = DB::getInstance();

        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(50, max(1, intval($_GET['pageSize'] ?? 20)));
        $status = $_GET['status'] ?? '';
        $year = $_GET['year'] ?? '';
        $offset = ($page - 1) * $pageSize;

        $where = [];
        $params = [];

        if ($status !== '' && in_array($status, ['draft', 'published', 'archived'])) {
            $where[] = 'status = :status';
            $params[':status'] = $status;
        }
        if ($year !== '' && is_numeric($year)) {
            $where[] = 'year = :year';
            $params[':year'] = (int)$year;
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $db->prepare("SELECT COUNT(*) FROM menu_weeks $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "SELECT * FROM menu_weeks $whereClause ORDER BY year DESC, week_number DESC LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $weeks = $stmt->fetchAll();

        json_success([
            'list' => $weeks,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * 获取单个周详情（含食谱条目）
     */
    public static function detail(int $id): void
    {
        $db = DB::getInstance();

        $stmt = $db->prepare('SELECT * FROM menu_weeks WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $week = $stmt->fetch();

        if (!$week) {
            json_error('周食谱不存在', 404);
        }

        $itemStmt = $db->prepare('SELECT * FROM menu_items WHERE week_id = :week_id ORDER BY weekday, meal_type');
        $itemStmt->execute([':week_id' => $id]);
        $items = $itemStmt->fetchAll();

        $week['items'] = $items;
        json_success($week);
    }

    /**
     * 创建新周
     */
    public static function create(): void
    {
        $auth = verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $year = intval($input['year'] ?? 0);
        $weekNumber = intval($input['week_number'] ?? 0);

        if ($year < 2020 || $year > 2100 || $weekNumber < 1 || $weekNumber > 53) {
            json_error('年份或周次无效');
        }

        // 检查是否已存在
        $checkStmt = $db->prepare('SELECT id FROM menu_weeks WHERE year = :year AND week_number = :week_number');
        $checkStmt->execute([':year' => $year, ':week_number' => $weekNumber]);
        if ($checkStmt->fetch()) {
            json_error('该周次已存在，请直接编辑');
        }

        // 计算周一和周五日期
        $weekStart = new DateTime();
        $weekStart->setISODate($year, $weekNumber, 1);
        $weekEnd = clone $weekStart;
        $weekEnd->modify('+6 days');

        $stmt = $db->prepare('INSERT INTO menu_weeks (year, week_number, week_start, week_end) VALUES (:year, :week_number, :week_start, :week_end) RETURNING id');
        $stmt->execute([
            ':year' => $year,
            ':week_number' => $weekNumber,
            ':week_start' => $weekStart->format('Y-m-d'),
            ':week_end' => $weekEnd->format('Y-m-d'),
        ]);
        $newId = $stmt->fetchColumn();

        // 初始化10个空条目
        $insertStmt = $db->prepare('INSERT INTO menu_items (week_id, weekday, meal_type, content) VALUES (:week_id, :weekday, :meal_type, :content)');
        for ($day = 1; $day <= 7; $day++) {
            foreach (['lunch', 'snack'] as $type) {
                $insertStmt->execute([
                    ':week_id' => $newId,
                    ':weekday' => $day,
                    ':meal_type' => $type,
                    ':content' => '',
                ]);
            }
        }

        // 日志
        self::log($auth['uid'], 'create_week', 'menu_weeks', $newId);

        json_success(['id' => $newId], '创建成功', 201);
    }

    /**
     * 批量更新食谱条目
     */
    public static function updateItems(int $id): void
    {
        $auth = verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        // 验证周存在
        $stmt = $db->prepare('SELECT id, status FROM menu_weeks WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $week = $stmt->fetch();

        if (!$week) {
            json_error('周食谱不存在', 404);
        }

        $items = $input['items'] ?? [];
        if (!is_array($items)) {
            json_error('食谱数据格式错误');
        }

        $db->beginTransaction();
        try {
            $upsertSql = 'INSERT INTO menu_items (week_id, weekday, meal_type, content, updated_at)
                VALUES (:week_id, :weekday, :meal_type, :content, NOW())
                ON CONFLICT (week_id, weekday, meal_type)
                DO UPDATE SET content = :content2, updated_at = NOW()';
            $upsertStmt = $db->prepare($upsertSql);

            foreach ($items as $item) {
                $weekday = intval($item['weekday'] ?? 0);
                $mealType = $item['meal_type'] ?? '';
                $content = trim($item['content'] ?? '');

                if ($weekday < 1 || $weekday > 7 || !in_array($mealType, ['lunch', 'snack'])) {
                    continue;
                }

                $upsertStmt->execute([
                    ':week_id' => $id,
                    ':weekday' => $weekday,
                    ':meal_type' => $mealType,
                    ':content' => $content,
                    ':content2' => $content,
                ]);
            }

            // 更新周的更新时间
            $db->prepare('UPDATE menu_weeks SET updated_at = NOW() WHERE id = :id')
                ->execute([':id' => $id]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            json_error('保存失败: ' . $e->getMessage(), 500);
        }

        self::log($auth['uid'], 'update_items', 'menu_weeks', $id);
        json_success(null, '保存成功');
    }

    /**
     * 发布周食谱
     */
    public static function publish(int $id): void
    {
        $auth = verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->prepare('UPDATE menu_weeks SET status = :status, published_at = NOW(), updated_at = NOW() WHERE id = :id AND status != :published');
        $stmt->execute([':status' => 'published', ':id' => $id, ':published' => 'published']);

        if ($stmt->rowCount() === 0) {
            json_error('操作失败，可能食谱已发布或不存在');
        }

        self::log($auth['uid'], 'publish_week', 'menu_weeks', $id);
        json_success(null, '发布成功');
    }

    /**
     * 归档周食谱
     */
    public static function archive(int $id): void
    {
        $auth = verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->prepare('UPDATE menu_weeks SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':status' => 'archived', ':id' => $id]);

        if ($stmt->rowCount() === 0) {
            json_error('操作失败');
        }

        self::log($auth['uid'], 'archive_week', 'menu_weeks', $id);
        json_success(null, '归档成功');
    }

    /**
     * 删除周食谱
     */
    public static function delete(int $id): void
    {
        $auth = verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->prepare('SELECT status FROM menu_weeks WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $week = $stmt->fetch();

        if (!$week) {
            json_error('周食谱不存在', 404);
        }

        $db->prepare('DELETE FROM menu_weeks WHERE id = :id')
            ->execute([':id' => $id]);

        self::log($auth['uid'], 'delete_week', 'menu_weeks', $id);
        json_success(null, '删除成功');
    }

    /**
     * 复制周食谱
     */
    public static function copy(int $id): void
    {
        $auth = verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $targetYear = intval($input['target_year'] ?? 0);
        $targetWeek = intval($input['target_week'] ?? 0);

        if ($targetYear < 2020 || $targetYear > 2100 || $targetWeek < 1 || $targetWeek > 53) {
            json_error('目标年份或周次无效');
        }

        // 检查源
        $srcStmt = $db->prepare('SELECT id FROM menu_weeks WHERE id = :id');
        $srcStmt->execute([':id' => $id]);
        if (!$srcStmt->fetch()) {
            json_error('源周食谱不存在', 404);
        }

        // 检查目标是否已存在
        $checkStmt = $db->prepare('SELECT id FROM menu_weeks WHERE year = :year AND week_number = :week_number');
        $checkStmt->execute([':year' => $targetYear, ':week_number' => $targetWeek]);
        if ($checkStmt->fetch()) {
            json_error('目标周次已存在');
        }

        $db->beginTransaction();
        try {
            // 创建目标周
            $weekStart = new DateTime();
            $weekStart->setISODate($targetYear, $targetWeek, 1);
            $weekEnd = clone $weekStart;
            $weekEnd->modify('+6 days');

            $insertWeek = $db->prepare('INSERT INTO menu_weeks (year, week_number, week_start, week_end) VALUES (:year, :wn, :ws, :we) RETURNING id');
            $insertWeek->execute([
                ':year' => $targetYear,
                ':wn' => $targetWeek,
                ':ws' => $weekStart->format('Y-m-d'),
                ':we' => $weekEnd->format('Y-m-d'),
            ]);
            $newId = $insertWeek->fetchColumn();

            // 复制条目
            $copySql = 'INSERT INTO menu_items (week_id, weekday, meal_type, content)
                SELECT :new_week_id, weekday, meal_type, content FROM menu_items WHERE week_id = :src_week_id';
            $db->prepare($copySql)->execute([':new_week_id' => $newId, ':src_week_id' => $id]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            json_error('复制失败: ' . $e->getMessage(), 500);
        }

        self::log($auth['uid'], 'copy_week', 'menu_weeks', $id, "复制到 $targetYear-W$targetWeek");
        json_success(['id' => $newId], '复制成功');
    }

    /**
     * 公共接口：获取当前周食谱
     */
    public static function currentWeek(): void
    {
        $db = DB::getInstance();

        $now = new DateTime();
        $year = (int)$now->format('o');
        $week = (int)$now->format('W');

        $stmt = $db->prepare("SELECT * FROM menu_weeks WHERE year = :year AND week_number = :week AND status IN ('published', 'archived')");
        $stmt->execute([':year' => $year, ':week' => $week]);
        $weekData = $stmt->fetch();

        if (!$weekData) {
            json_success(null, '本周食谱尚未发布');
            return;
        }

        $itemStmt = $db->prepare('SELECT weekday, meal_type, content FROM menu_items WHERE week_id = :week_id ORDER BY weekday, meal_type');
        $itemStmt->execute([':week_id' => $weekData['id']]);
        $weekData['items'] = $itemStmt->fetchAll();

        json_success($weekData);
    }

    /**
     * 公共接口：获取已发布的周列表
     */
    public static function publicList(): void
    {
        $db = DB::getInstance();

        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(50, max(1, intval($_GET['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        $countStmt = $db->query("SELECT COUNT(*) FROM menu_weeks WHERE status IN ('published', 'archived')");
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("SELECT * FROM menu_weeks WHERE status IN ('published', 'archived') ORDER BY year DESC, week_number DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        json_success([
            'list' => $stmt->fetchAll(),
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * 公共接口：获取单个已发布周详情
     */
    public static function publicDetail(int $id): void
    {
        $db = DB::getInstance();

        $stmt = $db->prepare("SELECT * FROM menu_weeks WHERE id = :id AND status IN ('published', 'archived')");
        $stmt->execute([':id' => $id]);
        $week = $stmt->fetch();

        if (!$week) {
            json_error('食谱不存在或未发布', 404);
        }

        $itemStmt = $db->prepare('SELECT weekday, meal_type, content FROM menu_items WHERE week_id = :week_id ORDER BY weekday, meal_type');
        $itemStmt->execute([':week_id' => $id]);
        $week['items'] = $itemStmt->fetchAll();

        json_success($week);
    }

    /**
     * 记录操作日志
     */
    private static function log(int $adminId, string $action, string $targetType = '', int $targetId = 0, string $detail = ''): void
    {
        try {
            $db = DB::getInstance();
            $stmt = $db->prepare('INSERT INTO operation_logs (admin_id, action, target_type, target_id, detail, ip_address) VALUES (:admin_id, :action, :target_type, :target_id, :detail, :ip)');
            $stmt->execute([
                ':admin_id' => $adminId,
                ':action' => $action,
                ':target_type' => $targetType,
                ':target_id' => $targetId,
                ':detail' => $detail,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]);
        } catch (Exception $e) {
            // 日志写入失败不影响业务
        }
    }
}

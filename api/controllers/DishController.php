<?php
/**
 * 菜谱管理控制器
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class DishController
{
    /**
     * 获取菜谱列表
     */
    public static function list(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        $mealType = $_GET['meal_type'] ?? '';
        $keyword = trim($_GET['keyword'] ?? '');
        $page = max(1, intval($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, intval($_GET['pageSize'] ?? 50)));
        $offset = ($page - 1) * $pageSize;

        $where = [];
        $params = [];

        if ($mealType !== '' && in_array($mealType, ['lunch', 'snack'])) {
            $where[] = 'meal_type = :meal_type';
            $params[':meal_type'] = $mealType;
        }
        if ($keyword !== '') {
            $where[] = 'name ILIKE :keyword';
            $params[':keyword'] = "%$keyword%";
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $db->prepare("SELECT COUNT(*) FROM dishes $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "SELECT * FROM dishes $whereClause ORDER BY meal_type, name LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
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
     * 公共接口：获取全部菜名列表（仅名称，用于前端显示拆分）
     */
    public static function publicNames(): void
    {
        $db = DB::getInstance();
        $stmt = $db->query("SELECT id, name, meal_type FROM dishes ORDER BY meal_type, name");
        json_success($stmt->fetchAll());
    }

    /**
     * 获取全部菜谱（用于选择器下拉，不分页）
     */
    public static function all(): void
    {
        $db = DB::getInstance();

        $mealType = $_GET['meal_type'] ?? '';
        $where = '';
        $params = [];

        if ($mealType !== '' && in_array($mealType, ['lunch', 'snack'])) {
            $where = 'WHERE meal_type = :meal_type';
            $params[':meal_type'] = $mealType;
        }

        $stmt = $db->prepare("SELECT id, name, meal_type FROM dishes $where ORDER BY meal_type, name");
        $stmt->execute($params);

        json_success($stmt->fetchAll());
    }

    /**
     * 新增菜品
     */
    public static function create(): void
    {
        verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $name = trim($input['name'] ?? '');
        $mealType = $input['meal_type'] ?? '';

        if ($name === '') {
            json_error('菜品名称不能为空');
        }
        if (!in_array($mealType, ['lunch', 'snack'])) {
            json_error('请选择菜品分类（营养午餐/快乐午点）');
        }

        // 检查重复
        $checkStmt = $db->prepare('SELECT id FROM dishes WHERE name = :name AND meal_type = :meal_type');
        $checkStmt->execute([':name' => $name, ':meal_type' => $mealType]);
        if ($checkStmt->fetch()) {
            json_error('该菜品已存在');
        }

        $stmt = $db->prepare('INSERT INTO dishes (name, meal_type) VALUES (:name, :meal_type) RETURNING id');
        $stmt->execute([':name' => $name, ':meal_type' => $mealType]);
        $id = $stmt->fetchColumn();

        json_success(['id' => $id, 'name' => $name, 'meal_type' => $mealType], '添加成功', 201);
    }

    /**
     * 批量新增菜品
     */
    public static function batchCreate(): void
    {
        verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $items = $input['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            json_error('请提供菜品列表');
        }

        $added = 0;
        $skipped = 0;

        $checkStmt = $db->prepare('SELECT id FROM dishes WHERE name = :name AND meal_type = :meal_type');
        $insertStmt = $db->prepare('INSERT INTO dishes (name, meal_type) VALUES (:name, :meal_type)');

        foreach ($items as $item) {
            $name = trim($item['name'] ?? '');
            $mealType = $item['meal_type'] ?? '';

            if ($name === '' || !in_array($mealType, ['lunch', 'snack'])) {
                $skipped++;
                continue;
            }

            $checkStmt->execute([':name' => $name, ':meal_type' => $mealType]);
            if ($checkStmt->fetch()) {
                $skipped++;
                continue;
            }

            $insertStmt->execute([':name' => $name, ':meal_type' => $mealType]);
            $added++;
        }

        json_success(['added' => $added, 'skipped' => $skipped], "成功添加 {$added} 个菜品，跳过 {$skipped} 个重复");
    }

    /**
     * 更新菜品
     */
    public static function update(int $id): void
    {
        verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $name = trim($input['name'] ?? '');
        $mealType = $input['meal_type'] ?? '';

        if ($name === '') {
            json_error('菜品名称不能为空');
        }
        if (!in_array($mealType, ['lunch', 'snack'])) {
            json_error('请选择菜品分类');
        }

        // 获取旧菜名
        $oldStmt = $db->prepare('SELECT name, meal_type FROM dishes WHERE id = :id');
        $oldStmt->execute([':id' => $id]);
        $oldDish = $oldStmt->fetch();

        if (!$oldDish) {
            json_error('菜品不存在', 404);
        }

        $oldName = $oldDish['name'];

        // 检查重复（排除自身）
        $checkStmt = $db->prepare('SELECT id FROM dishes WHERE name = :name AND meal_type = :meal_type AND id != :id');
        $checkStmt->execute([':name' => $name, ':meal_type' => $mealType, ':id' => $id]);
        if ($checkStmt->fetch()) {
            json_error('该菜品已存在');
        }

        $db->beginTransaction();
        try {
            // 更新菜品
            $stmt = $db->prepare('UPDATE dishes SET name = :name, meal_type = :meal_type WHERE id = :id');
            $stmt->execute([':name' => $name, ':meal_type' => $mealType, ':id' => $id]);

            // 如果菜名变了，同步更新所有食谱中的引用
            if ($oldName !== $name) {
                self::updateMenuItemsName($db, $oldName, $name);
            }

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            json_error('更新失败: ' . $e->getMessage(), 500);
        }

        $affected = ($oldName !== $name) ? '，已同步更新食谱' : '';
        json_success(null, '更新成功' . $affected);
    }

    /**
     * 同步更新食谱中的菜名引用
     */
    private static function updateMenuItemsName(PDO $db, string $oldName, string $newName): void
    {
        // 查找所有包含旧菜名的食谱条目
        $stmt = $db->prepare("SELECT id, content FROM menu_items WHERE content LIKE :pattern");
        $stmt->execute([':pattern' => '%' . $oldName . '%']);
        $items = $stmt->fetchAll();

        $updateStmt = $db->prepare('UPDATE menu_items SET content = :content, updated_at = NOW() WHERE id = :id');

        foreach ($items as $item) {
            $content = $item['content'];

            // 新格式（|||分隔）：精确替换每段
            if (strpos($content, '|||') !== false) {
                $parts = explode('|||', $content);
                $parts = array_map(function ($p) use ($oldName, $newName) {
                    return trim($p) === $oldName ? $newName : trim($p);
                }, $parts);
                $newContent = implode('|||', $parts);
            } else {
                // 旧格式：直接文本替换
                $newContent = str_replace($oldName, $newName, $content);
            }

            if ($newContent !== $content) {
                $updateStmt->execute([':content' => $newContent, ':id' => $item['id']]);
            }
        }
    }

    /**
     * 删除菜品
     */
    public static function delete(int $id): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->prepare('DELETE FROM dishes WHERE id = :id');
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            json_error('菜品不存在', 404);
        }

        json_success(null, '删除成功');
    }

    /**
     * 批量删除菜品
     */
    public static function batchDelete(): void
    {
        verify_admin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $ids = $input['ids'] ?? [];
        if (!is_array($ids) || empty($ids)) {
            json_error('请选择要删除的菜品');
        }

        // 过滤非数字
        $ids = array_filter(array_map('intval', $ids), fn($id) => $id > 0);
        if (empty($ids)) {
            json_error('请选择要删除的菜品');
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("DELETE FROM dishes WHERE id IN ($placeholders)");
        $stmt->execute(array_values($ids));
        $deleted = $stmt->rowCount();

        json_success(['deleted' => $deleted], "成功删除 {$deleted} 个菜品");
    }
}

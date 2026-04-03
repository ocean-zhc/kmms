<?php
/**
 * AI总结控制器
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class AiController
{
    /**
     * 获取AI配置（管理端）
     */
    public static function getConfig(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $stmt = $db->query('SELECT api_url, api_key, model, prompt, enabled, webhook_url FROM ai_config WHERE id = 1');
        $config = $stmt->fetch();
        if ($config) {
            // 脱敏API Key
            $config['api_key_masked'] = self::maskKey($config['api_key']);
        }
        json_success($config);
    }

    /**
     * 更新AI配置（管理端）
     */
    public static function updateConfig(): void
    {
        verify_superadmin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $apiUrl = trim($input['api_url'] ?? '');
        $apiKey = trim($input['api_key'] ?? '');
        $model = trim($input['model'] ?? 'gpt-3.5-turbo');
        $prompt = trim($input['prompt'] ?? '');
        $enabled = (bool)($input['enabled'] ?? true);
        $webhookUrl = trim($input['webhook_url'] ?? '');

        // 如果api_key是脱敏的(含***)，不更新key
        $setClauses = [
            'api_url = :api_url',
            'model = :model',
            'prompt = :prompt',
            'enabled = :enabled',
            'webhook_url = :webhook_url',
            'updated_at = NOW()',
        ];
        $params = [
            ':api_url' => $apiUrl,
            ':model' => $model,
            ':prompt' => $prompt,
            ':enabled' => $enabled ? 'true' : 'false',
            ':webhook_url' => $webhookUrl,
        ];

        if ($apiKey !== '' && strpos($apiKey, '***') === false) {
            $setClauses[] = 'api_key = :api_key';
            $params[':api_key'] = $apiKey;
        }

        $sql = 'UPDATE ai_config SET ' . implode(', ', $setClauses) . ' WHERE id = 1';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        json_success(null, '配置已保存');
    }

    /**
     * 获取周食谱AI总结（公共接口，带缓存）
     */
    public static function getSummary(int $weekId): void
    {
        $db = DB::getInstance();

        // 1. 检查AI是否启用
        $configStmt = $db->query('SELECT api_url, api_key, model, prompt, enabled FROM ai_config WHERE id = 1');
        $config = $configStmt->fetch();
        if (!$config || !$config['enabled'] || $config['api_url'] === '' || $config['api_key'] === '') {
            json_error('AI总结功能未配置或未启用', 400, -2);
        }

        // 2. 先查缓存
        $cacheStmt = $db->prepare('SELECT summary, created_at FROM ai_summaries WHERE week_id = :week_id');
        $cacheStmt->execute([':week_id' => $weekId]);
        $cached = $cacheStmt->fetch();

        if ($cached) {
            json_success([
                'summary' => $cached['summary'],
                'cached' => true,
                'generated_at' => $cached['created_at'],
            ]);
        }

        // 3. 无缓存，验证周存在且已发布
        $weekStmt = $db->prepare("SELECT * FROM menu_weeks WHERE id = :id AND status IN ('published', 'archived')");
        $weekStmt->execute([':id' => $weekId]);
        $week = $weekStmt->fetch();

        if (!$week) {
            json_error('食谱不存在或未发布', 404);
        }

        // 4. 获取食谱内容
        $itemStmt = $db->prepare('SELECT weekday, meal_type, content FROM menu_items WHERE week_id = :week_id ORDER BY weekday, meal_type');
        $itemStmt->execute([':week_id' => $weekId]);
        $items = $itemStmt->fetchAll();

        $menuText = self::buildMenuText($week, $items);

        // 5. 调用AI
        $summary = self::callAI($config, $menuText);

        if ($summary === null) {
            json_error('AI总结生成失败，请稍后重试', 500);
        }

        // 6. 存入缓存
        $insertStmt = $db->prepare('INSERT INTO ai_summaries (week_id, summary) VALUES (:week_id, :summary) ON CONFLICT (week_id) DO UPDATE SET summary = :summary2, created_at = NOW()');
        $insertStmt->execute([
            ':week_id' => $weekId,
            ':summary' => $summary,
            ':summary2' => $summary,
        ]);

        json_success([
            'summary' => $summary,
            'cached' => false,
            'generated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * 重新生成AI总结（管理端，强制刷新缓存）
     */
    public static function regenerateSummary(int $weekId): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        // 删除旧缓存
        $db->prepare('DELETE FROM ai_summaries WHERE week_id = :week_id')
            ->execute([':week_id' => $weekId]);

        // 调用getSummary重新生成
        self::getSummary($weekId);
    }

    /**
     * 获取AI总结缓存列表（管理端）
     */
    public static function listSummaries(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->query('SELECT s.id, s.week_id, s.summary, s.created_at, w.year, w.week_number, w.week_start, w.week_end FROM ai_summaries s JOIN menu_weeks w ON s.week_id = w.id ORDER BY w.year DESC, w.week_number DESC');
        $list = $stmt->fetchAll();

        json_success($list);
    }

    /**
     * 删除指定周的AI总结缓存（管理端）
     */
    public static function deleteSummary(int $weekId): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->prepare('DELETE FROM ai_summaries WHERE week_id = :week_id');
        $stmt->execute([':week_id' => $weekId]);

        json_success(null, '缓存已清除');
    }

    /**
     * 清空所有AI总结缓存（管理端）
     */
    public static function clearAllSummaries(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        $stmt = $db->query('DELETE FROM ai_summaries');
        $deleted = $stmt->rowCount();

        json_success(['deleted' => $deleted], "已清空 {$deleted} 条缓存");
    }

    /**
     * 构建食谱文本
     */
    private static function buildMenuText(array $week, array $items): string
    {
        $weekdays = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
        $mealNames = ['lunch' => '营养午餐', 'snack' => '快乐午点'];

        $text = "{$week['year']}年第{$week['week_number']}周 ({$week['week_start']} ~ {$week['week_end']}) 幼儿园食谱：\n\n";

        for ($day = 1; $day <= 7; $day++) {
            $text .= "{$weekdays[$day]}：\n";
            foreach (['lunch', 'snack'] as $type) {
                $content = '';
                foreach ($items as $item) {
                    if ((int)$item['weekday'] === $day && $item['meal_type'] === $type) {
                        $content = $item['content'];
                        break;
                    }
                }
                $text .= "  {$mealNames[$type]}：" . ($content ?: '未配置') . "\n";
            }
        }

        return $text;
    }

    /**
     * 调用OpenAI兼容API
     */
    private static function callAI(array $config, string $menuText): ?string
    {
        $url = rtrim($config['api_url'], '/') . '/chat/completions';

        $body = json_encode([
            'model' => $config['model'],
            'messages' => [
                ['role' => 'system', 'content' => $config['prompt']],
                ['role' => 'user', 'content' => $menuText],
            ],
            'temperature' => 0.7,
            'max_tokens' => 500,
        ], JSON_UNESCAPED_UNICODE);

        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $config['api_key'],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("AI API error: $error");
            return null;
        }

        if ($httpCode !== 200) {
            error_log("AI API HTTP $httpCode: $response");
            return null;
        }

        $data = json_decode($response, true);
        return $data['choices'][0]['message']['content'] ?? null;
    }

    /**
     * 获取可用模型列表（代理调用 /models 接口）
     */
    public static function getModels(): void
    {
        verify_admin_auth();
        $input = $_GET;
        $db = DB::getInstance();

        // 支持传入临时的 api_url 和 api_key，否则从配置读取
        $apiUrl = trim($input['api_url'] ?? '');
        $apiKey = trim($input['api_key'] ?? '');

        if ($apiUrl === '' || $apiKey === '') {
            $stmt = $db->query('SELECT api_url, api_key FROM ai_config WHERE id = 1');
            $config = $stmt->fetch();
            if ($apiUrl === '') $apiUrl = $config['api_url'] ?? '';
            if ($apiKey === '' || strpos($apiKey, '***') !== false) $apiKey = $config['api_key'] ?? '';
        }

        if ($apiUrl === '' || $apiKey === '') {
            json_error('请先配置API地址和API Key');
        }

        $url = rtrim($apiUrl, '/') . '/models';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            json_error('请求失败: ' . $error, 500);
        }

        if ($httpCode !== 200) {
            json_error('获取模型列表失败 (HTTP ' . $httpCode . ')', 500);
        }

        $data = json_decode($response, true);
        $models = [];

        if (isset($data['data']) && is_array($data['data'])) {
            foreach ($data['data'] as $m) {
                $models[] = [
                    'id' => $m['id'] ?? '',
                    'owned_by' => $m['owned_by'] ?? '',
                ];
            }
            // 按 id 排序
            usort($models, fn($a, $b) => strcmp($a['id'], $b['id']));
        }

        json_success($models);
    }

    // ============ 可用性检查 ============

    /**
     * AI 可用性检查（管理端）
     */
    public static function checkAvailability(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $stmt = $db->query('SELECT api_url, api_key, model, enabled, ocr_api_url, ocr_api_key, ocr_model, ocr_enabled FROM ai_config WHERE id = 1');
        $config = $stmt->fetch();

        $results = [];

        // AI 营养总结
        if ($config && $config['enabled'] && $config['api_url'] !== '' && $config['api_key'] !== '') {
            $results['ai_summary'] = self::pingAPI($config['api_url'], $config['api_key'], $config['model']);
        } else {
            $results['ai_summary'] = ['ok' => false, 'error' => '未启用或未配置'];
        }

        // OCR
        if ($config && $config['ocr_enabled'] && $config['ocr_api_url'] !== '' && $config['ocr_api_key'] !== '') {
            $results['ocr'] = self::pingAPI($config['ocr_api_url'], $config['ocr_api_key'], $config['ocr_model']);
        } else {
            $results['ocr'] = ['ok' => false, 'error' => '未启用或未配置'];
        }

        $allOk = ($results['ai_summary']['ok'] ?? false) && ($results['ocr']['ok'] ?? false);
        json_success(['results' => $results, 'all_ok' => $allOk]);
    }

    private static function pingAPI(string $apiUrl, string $apiKey, string $model): array
    {
        $url = rtrim($apiUrl, '/') . '/chat/completions';
        $body = json_encode([
            'model' => $model,
            'messages' => [['role' => 'user', 'content' => '你好，请回复OK']],
            'max_tokens' => 10,
        ], JSON_UNESCAPED_UNICODE);

        $start = microtime(true);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        $latency = round((microtime(true) - $start) * 1000);

        if ($error) return ['ok' => false, 'error' => "连接失败: $error", 'latency' => $latency];
        if ($httpCode !== 200) {
            $data = json_decode($response, true);
            $msg = $data['message'] ?? $data['error']['message'] ?? "HTTP $httpCode";
            return ['ok' => false, 'error' => $msg, 'latency' => $latency];
        }

        $data = json_decode($response, true);
        if (!isset($data['choices'][0])) {
            return ['ok' => false, 'error' => '响应格式异常', 'latency' => $latency];
        }

        return ['ok' => true, 'latency' => $latency, 'model' => $model];
    }

    // ============ 今日食谱 AI 分析 ============

    /**
     * 获取今日食谱AI总结（公共接口，带缓存）
     */
    public static function getDailySummary(int $weekId, int $weekday): void
    {
        $db = DB::getInstance();
        $refresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';

        $configStmt = $db->query('SELECT api_url, api_key, model, prompt, enabled FROM ai_config WHERE id = 1');
        $config = $configStmt->fetch();
        if (!$config || !$config['enabled'] || $config['api_url'] === '' || $config['api_key'] === '') {
            json_error('AI总结功能未配置或未启用', 400, -2);
        }

        if ($refresh) {
            $db->prepare('DELETE FROM ai_daily_summaries WHERE week_id = :week_id AND weekday = :weekday')
                ->execute([':week_id' => $weekId, ':weekday' => $weekday]);
        }

        // 查缓存
        $cacheStmt = $db->prepare('SELECT summary, created_at FROM ai_daily_summaries WHERE week_id = :week_id AND weekday = :weekday AND summary IS NOT NULL');
        $cacheStmt->execute([':week_id' => $weekId, ':weekday' => $weekday]);
        $cached = $cacheStmt->fetch();

        if ($cached && $cached['summary']) {
            json_success([
                'summary' => $cached['summary'],
                'cached' => true,
                'generated_at' => $cached['created_at'],
            ]);
        }

        // 获取当日食谱
        $menuText = self::buildDailyMenuText($db, $weekId, $weekday);
        if (!$menuText) {
            json_error('今日食谱不存在或为空', 404);
        }

        $dailyConfig = $config;
        $dailyConfig['prompt'] = '你是一位专业的幼儿园营养师。请对今日食谱进行简短的营养点评（150字以内），包括营养搭配亮点和1-2条温馨小建议。语气亲切温暖，适合家长阅读。注意：只评价当天的食谱，不要提及"这周"或"本周"。';
        $summary = self::callAI($dailyConfig, $menuText);
        if ($summary === null) {
            json_error('AI总结生成失败，请稍后重试', 500);
        }

        // 缓存
        $upsertStmt = $db->prepare('INSERT INTO ai_daily_summaries (week_id, weekday, summary) VALUES (:week_id, :weekday, :summary) ON CONFLICT (week_id, weekday) DO UPDATE SET summary = :summary2, created_at = NOW()');
        $upsertStmt->execute([
            ':week_id' => $weekId,
            ':weekday' => $weekday,
            ':summary' => $summary,
            ':summary2' => $summary,
        ]);

        json_success([
            'summary' => $summary,
            'cached' => false,
            'generated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * 获取今日食谱营养分析（公共接口，带缓存）
     */
    public static function getDailyNutrition(int $weekId, int $weekday): void
    {
        $db = DB::getInstance();
        $refresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';

        $configStmt = $db->query('SELECT api_url, api_key, model, enabled FROM ai_config WHERE id = 1');
        $config = $configStmt->fetch();
        if (!$config || !$config['enabled'] || $config['api_url'] === '' || $config['api_key'] === '') {
            json_error('AI功能未配置或未启用', 400, -2);
        }

        if ($refresh) {
            $db->prepare('UPDATE ai_daily_summaries SET nutrition_data = NULL WHERE week_id = :week_id AND weekday = :weekday')
                ->execute([':week_id' => $weekId, ':weekday' => $weekday]);
        }

        // 查缓存
        $cacheStmt = $db->prepare('SELECT nutrition_data, created_at FROM ai_daily_summaries WHERE week_id = :week_id AND weekday = :weekday AND nutrition_data IS NOT NULL');
        $cacheStmt->execute([':week_id' => $weekId, ':weekday' => $weekday]);
        $cached = $cacheStmt->fetch();

        if ($cached) {
            $data = json_decode($cached['nutrition_data'], true);
            if ($data) {
                $data['cached'] = true;
                $data['generated_at'] = $cached['created_at'];
                json_success($data);
            }
        }

        // 获取当日食谱
        $menuText = self::buildDailyMenuText($db, $weekId, $weekday);
        if (!$menuText) {
            json_error('今日食谱不存在或为空', 404);
        }

        $nutritionJson = self::callDailyNutritionAI($config, $menuText);
        if ($nutritionJson === null) {
            json_error('营养分析生成失败，请稍后重试', 500);
        }

        // 缓存
        $upsertStmt = $db->prepare('INSERT INTO ai_daily_summaries (week_id, weekday, nutrition_data) VALUES (:week_id, :weekday, :data) ON CONFLICT (week_id, weekday) DO UPDATE SET nutrition_data = :data2, created_at = NOW()');
        $upsertStmt->execute([
            ':week_id' => $weekId,
            ':weekday' => $weekday,
            ':data' => $nutritionJson,
            ':data2' => $nutritionJson,
        ]);

        $data = json_decode($nutritionJson, true);
        $data['cached'] = false;
        $data['generated_at'] = date('Y-m-d H:i:s');
        json_success($data);
    }

    /**
     * 构建单日食谱文本
     */
    private static function buildDailyMenuText(PDO $db, int $weekId, int $weekday): ?string
    {
        $weekdays = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
        $mealNames = ['lunch' => '营养午餐', 'snack' => '快乐午点'];

        $weekStmt = $db->prepare("SELECT * FROM menu_weeks WHERE id = :id AND status IN ('published', 'archived')");
        $weekStmt->execute([':id' => $weekId]);
        $week = $weekStmt->fetch();
        if (!$week) return null;

        $itemStmt = $db->prepare('SELECT meal_type, content FROM menu_items WHERE week_id = :week_id AND weekday = :weekday ORDER BY meal_type');
        $itemStmt->execute([':week_id' => $weekId, ':weekday' => $weekday]);
        $items = $itemStmt->fetchAll();

        $hasContent = false;
        $text = "幼儿园今日食谱（{$weekdays[$weekday]}）：\n\n";
        foreach (['lunch', 'snack'] as $type) {
            $content = '';
            foreach ($items as $item) {
                if ($item['meal_type'] === $type) {
                    $content = $item['content'];
                    break;
                }
            }
            if ($content) $hasContent = true;
            $text .= "{$mealNames[$type]}：" . ($content ?: '未配置') . "\n";
        }

        return $hasContent ? $text : null;
    }

    /**
     * 调用AI获取单日营养分析
     */
    private static function callDailyNutritionAI(array $config, string $menuText): ?string
    {
        $prompt = '你是一位专业的幼儿园营养师。请分析以下今日食谱的营养构成，返回严格的JSON格式数据，不要返回其他任何文字。

JSON格式要求：
{
  "macronutrients": {"protein": 22, "carbs": 53, "fat": 25},
  "micronutrients": {"fiber": 75, "vitamins": 80, "minerals": 70},
  "categories": {"staple": 1, "meat": 2, "veg": 2, "soup": 1, "dairy": 0, "fruit": 0},
  "score": 85,
  "summary": "一句话营养点评和建议"
}

字段说明：
- macronutrients: 三大营养素估算百分比（protein+carbs+fat=100）
- micronutrients: 膳食纤维/维生素/矿物质的充足度评分（0-100）
- categories: 食材品类出现次数统计（staple主食/meat肉蛋/veg蔬菜/soup汤羹/dairy奶制品/fruit水果）
- score: 综合营养均衡评分（0-100）
- summary: 不超过50字的简短点评，口吻亲切友好，针对今天一天的食谱

只返回JSON，不要返回markdown代码块或其他文字。';

        $url = rtrim($config['api_url'], '/') . '/chat/completions';
        $body = json_encode([
            'model' => $config['model'],
            'messages' => [
                ['role' => 'system', 'content' => $prompt],
                ['role' => 'user', 'content' => $menuText],
            ],
            'temperature' => 0.3,
            'max_tokens' => 800,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $config['api_key'],
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error || $httpCode !== 200) {
            error_log("Daily Nutrition AI error: $error, HTTP: $httpCode, Response: $response");
            return null;
        }

        $data = json_decode($response, true);
        $content = $data['choices'][0]['message']['content'] ?? '';

        if (preg_match('/\{[\s\S]*\}/u', $content, $matches)) {
            $parsed = json_decode($matches[0], true);
            if ($parsed && isset($parsed['macronutrients']) && isset($parsed['score'])) {
                return json_encode($parsed, JSON_UNESCAPED_UNICODE);
            }
        }

        error_log('Daily Nutrition AI parse failed: ' . $content);
        return null;
    }

    // ============ 营养分析 ============

    /**
     * 获取周食谱营养分析（公共接口，带缓存）
     */
    public static function getNutrition(int $weekId): void
    {
        $db = DB::getInstance();

        $configStmt = $db->query('SELECT api_url, api_key, model, enabled FROM ai_config WHERE id = 1');
        $config = $configStmt->fetch();
        if (!$config || !$config['enabled'] || $config['api_url'] === '' || $config['api_key'] === '') {
            json_error('AI功能未配置或未启用', 400, -2);
        }

        // 查缓存
        $cacheStmt = $db->prepare('SELECT nutrition_data, created_at FROM ai_summaries WHERE week_id = :week_id AND nutrition_data IS NOT NULL');
        $cacheStmt->execute([':week_id' => $weekId]);
        $cached = $cacheStmt->fetch();

        if ($cached) {
            $data = json_decode($cached['nutrition_data'], true);
            if ($data) {
                $data['cached'] = true;
                $data['generated_at'] = $cached['created_at'];
                json_success($data);
            }
        }

        // 验证周存在且已发布
        $weekStmt = $db->prepare("SELECT * FROM menu_weeks WHERE id = :id AND status IN ('published', 'archived')");
        $weekStmt->execute([':id' => $weekId]);
        $week = $weekStmt->fetch();
        if (!$week) {
            json_error('食谱不存在或未发布', 404);
        }

        // 获取食谱内容
        $itemStmt = $db->prepare('SELECT weekday, meal_type, content FROM menu_items WHERE week_id = :week_id ORDER BY weekday, meal_type');
        $itemStmt->execute([':week_id' => $weekId]);
        $items = $itemStmt->fetchAll();
        $menuText = self::buildMenuText($week, $items);

        // 调用AI获取营养分析
        $nutritionJson = self::callNutritionAI($config, $menuText);
        if ($nutritionJson === null) {
            json_error('营养分析生成失败，请稍后重试', 500);
        }

        // 缓存到 ai_summaries（更新 nutrition_data 字段）
        $upsertStmt = $db->prepare('INSERT INTO ai_summaries (week_id, summary, nutrition_data) VALUES (:week_id, \'\', :data) ON CONFLICT (week_id) DO UPDATE SET nutrition_data = :data2, created_at = NOW()');
        $upsertStmt->execute([
            ':week_id' => $weekId,
            ':data' => $nutritionJson,
            ':data2' => $nutritionJson,
        ]);

        $data = json_decode($nutritionJson, true);
        $data['cached'] = false;
        $data['generated_at'] = date('Y-m-d H:i:s');
        json_success($data);
    }

    /**
     * 调用AI获取结构化营养分析数据
     */
    private static function callNutritionAI(array $config, string $menuText): ?string
    {
        $prompt = '你是一位专业的幼儿园营养师。请分析以下一周食谱的营养构成，返回严格的JSON格式数据，不要返回其他任何文字。

JSON格式要求：
{
  "macronutrients": {"protein": 22, "carbs": 53, "fat": 25},
  "micronutrients": {"fiber": 75, "vitamins": 80, "minerals": 70},
  "categories": {"staple": 5, "meat": 5, "veg": 7, "soup": 5, "dairy": 3, "fruit": 2},
  "score": 88,
  "summary": "一句话营养点评和建议"
}

字段说明：
- macronutrients: 三大营养素估算百分比（protein+carbs+fat=100）
- micronutrients: 膳食纤维/维生素/矿物质的充足度评分（0-100）
- categories: 食材品类出现次数统计（staple主食/meat肉蛋/veg蔬菜/soup汤羹/dairy奶制品/fruit水果）
- score: 综合营养均衡评分（0-100）
- summary: 不超过50字的简短点评，口吻亲切友好

只返回JSON，不要返回markdown代码块或其他文字。';

        $url = rtrim($config['api_url'], '/') . '/chat/completions';
        $body = json_encode([
            'model' => $config['model'],
            'messages' => [
                ['role' => 'system', 'content' => $prompt],
                ['role' => 'user', 'content' => $menuText],
            ],
            'temperature' => 0.3,
            'max_tokens' => 800,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $config['api_key'],
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error || $httpCode !== 200) {
            error_log("Nutrition AI error: $error, HTTP: $httpCode, Response: $response");
            return null;
        }

        $data = json_decode($response, true);
        $content = $data['choices'][0]['message']['content'] ?? '';

        // 提取JSON
        if (preg_match('/\{[\s\S]*\}/u', $content, $matches)) {
            $parsed = json_decode($matches[0], true);
            if ($parsed && isset($parsed['macronutrients']) && isset($parsed['score'])) {
                return json_encode($parsed, JSON_UNESCAPED_UNICODE);
            }
        }

        error_log('Nutrition AI parse failed: ' . $content);
        return null;
    }

    // ============ OCR 识别 ============

    /**
     * 获取OCR配置（管理端）
     */
    public static function getOcrConfig(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();
        $stmt = $db->query('SELECT ocr_api_url, ocr_api_key, ocr_model, ocr_enabled FROM ai_config WHERE id = 1');
        $config = $stmt->fetch();
        if ($config) {
            $config['ocr_api_key_masked'] = self::maskKey($config['ocr_api_key']);
        }
        json_success($config);
    }

    /**
     * 更新OCR配置（管理端）
     */
    public static function updateOcrConfig(): void
    {
        verify_superadmin_auth();
        $input = get_json_input();
        $db = DB::getInstance();

        $setClauses = [
            'ocr_api_url = :ocr_api_url',
            'ocr_model = :ocr_model',
            'ocr_enabled = :ocr_enabled',
            'updated_at = NOW()',
        ];
        $params = [
            ':ocr_api_url' => trim($input['ocr_api_url'] ?? ''),
            ':ocr_model' => trim($input['ocr_model'] ?? 'Qwen/Qwen2.5-VL-72B-Instruct'),
            ':ocr_enabled' => (bool)($input['ocr_enabled'] ?? true) ? 'true' : 'false',
        ];

        $apiKey = trim($input['ocr_api_key'] ?? '');
        if ($apiKey !== '' && strpos($apiKey, '***') === false) {
            $setClauses[] = 'ocr_api_key = :ocr_api_key';
            $params[':ocr_api_key'] = $apiKey;
        }

        $sql = 'UPDATE ai_config SET ' . implode(', ', $setClauses) . ' WHERE id = 1';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        json_success(null, 'OCR配置已保存');
    }

    /**
     * OCR识别食谱图片
     */
    public static function ocr(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        // 读取OCR配置
        $stmt = $db->query('SELECT ocr_api_url, ocr_api_key, ocr_model, ocr_enabled FROM ai_config WHERE id = 1');
        $config = $stmt->fetch();

        if (!$config || !$config['ocr_enabled'] || $config['ocr_api_url'] === '' || $config['ocr_api_key'] === '') {
            json_error('OCR功能未配置或未启用，请先在AI配置页面设置OCR模型', 400);
        }

        $input = get_json_input();
        $imageUrl = trim($input['image_url'] ?? '');
        $imageBase64 = trim($input['image_base64'] ?? '');

        if ($imageUrl === '' && $imageBase64 === '') {
            json_error('请提供图片URL或上传图片');
        }

        // 构建 image_url content
        $imageContent = $imageUrl !== ''
            ? ['type' => 'image_url', 'image_url' => ['url' => $imageUrl]]
            : ['type' => 'image_url', 'image_url' => ['url' => $imageBase64]];

        $prompt = '请识别这张幼儿园/学校食谱图片中的菜谱信息。请严格按以下JSON格式返回，不要返回其他内容：
{
  "items": [
    {"weekday": 1, "meal_type": "lunch", "dishes": ["菜名1", "菜名2"]},
    {"weekday": 1, "meal_type": "snack", "dishes": ["点心1"]}
  ]
}

规则：
- weekday: 1=星期一, 2=星期二, 3=星期三, 4=星期四, 5=星期五, 6=星期六, 7=星期日
- meal_type: "lunch"=正餐/午餐, "snack"=点心/午点/加餐
- dishes: 菜品名称数组，每个菜名是一个独立字符串
- 只返回JSON，不要返回其他解释文字';

        $body = json_encode([
            'model' => $config['ocr_model'],
            'messages' => [
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $prompt],
                        $imageContent,
                    ],
                ],
            ],
            'temperature' => 0.1,
            'max_tokens' => 4096,
            'thinking' => ['type' => 'disabled'],
        ], JSON_UNESCAPED_UNICODE);

        $url = rtrim($config['ocr_api_url'], '/') . '/chat/completions';
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $config['ocr_api_key'],
        ];

        // 视觉模型推理较慢，延长超时
        set_time_limit(120);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 90,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            json_error('OCR请求失败: ' . $error, 500);
        }
        if ($httpCode !== 200) {
            error_log("OCR API HTTP $httpCode: $response");
            json_error('OCR服务返回错误 (HTTP ' . $httpCode . ')', 500);
        }

        $data = json_decode($response, true);
        $msg = $data['choices'][0]['message'] ?? [];
        // 兼容推理模型：优先取 content，为空则取 reasoning_content
        $content = ($msg['content'] ?? '') !== '' ? $msg['content'] : ($msg['reasoning_content'] ?? '');

        // 提取JSON（可能被```json包裹）
        if (preg_match('/\{[\s\S]*\}/u', $content, $matches)) {
            $parsed = json_decode($matches[0], true);
            if ($parsed && isset($parsed['items'])) {
                json_success($parsed);
            }
        }

        error_log('OCR parse failed. Raw content: ' . mb_substr($content, 0, 2000));
        json_error('识别结果解析失败，请重试或更换图片', 500);
    }

    /**
     * 脱敏API Key
     */
    private static function maskKey(string $key): string
    {
        if (strlen($key) <= 8) return $key ? '****' : '';
        return substr($key, 0, 4) . '***' . substr($key, -4);
    }
}

<?php
/**
 * 一次性脚本：清除所有每日AI点评缓存（因之前使用了错误的周提示词）
 * 用法：docker exec kmms-api php /var/www/html/scripts/clear_daily_ai_cache.php
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

$db = DB::getInstance();
$stmt = $db->query('UPDATE ai_daily_summaries SET summary = NULL WHERE summary IS NOT NULL');
$count = $stmt->rowCount();
echo "已清除 {$count} 条每日AI点评缓存。下次访问将使用新提示词重新生成。\n";

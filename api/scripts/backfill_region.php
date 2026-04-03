<?php
/**
 * 一次性脚本：回填历史访问记录的 IP 归属地
 * 用法：php backfill_region.php
 */
require_once __DIR__ . '/../db.php';

$db = DB::getInstance();

// 获取 region 为空的去重 IP 列表
$stmt = $db->query("SELECT DISTINCT ip FROM visit_logs WHERE region = ''");
$ips = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "需要回填的 IP 数量: " . count($ips) . "\n";

foreach ($ips as $i => $ip) {
    $region = queryRegion($ip);
    if ($region !== '') {
        $update = $db->prepare("UPDATE visit_logs SET region = :region WHERE ip = :ip AND region = ''");
        $update->execute([':region' => $region, ':ip' => $ip]);
        echo ($i + 1) . ". {$ip} => {$region}\n";
    } else {
        echo ($i + 1) . ". {$ip} => (查询失败)\n";
    }
    // ip-api.com 免费限制 45次/分钟，间隔 1.5 秒
    if ($i < count($ips) - 1) {
        usleep(1500000);
    }
}

echo "回填完成\n";

function queryRegion(string $ip): string
{
    if ($ip === '0.0.0.0' || $ip === '127.0.0.1' || str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.')) {
        return '内网';
    }
    $ctx = stream_context_create(['http' => ['timeout' => 5]]);
    $url = 'http://ip-api.com/json/' . urlencode($ip) . '?lang=zh-CN&fields=status,country,regionName,city';
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return '';
    $data = json_decode($body, true);
    if (($data['status'] ?? '') !== 'success') return '';
    $parts = array_filter([$data['country'] ?? '', $data['regionName'] ?? '', $data['city'] ?? '']);
    $region = implode(' ', $parts);
    if (str_starts_with($region, '中国 ')) {
        $region = mb_substr($region, 3);
    }
    return $region;
}

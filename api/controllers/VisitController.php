<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

class VisitController
{
    /**
     * 记录访问（公共接口）
     */
    public static function record(): void
    {
        $input = get_json_input();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $ip = self::getClientIP();
        $path = trim($input['path'] ?? '/');

        $parsed = self::parseUA($ua);

        $db = DB::getInstance();
        $stmt = $db->prepare('INSERT INTO visit_logs (ip, path, user_agent, device, os, browser) VALUES (:ip, :path, :ua, :device, :os, :browser)');
        $stmt->execute([
            ':ip' => $ip,
            ':path' => $path,
            ':ua' => mb_substr($ua, 0, 500),
            ':device' => $parsed['device'],
            ':os' => $parsed['os'],
            ':browser' => $parsed['browser'],
        ]);

        json_success(null, 'ok');
    }

    /**
     * 访问统计（公共接口）
     */
    public static function stats(): void
    {
        $db = DB::getInstance();

        $totalStmt = $db->query('SELECT COUNT(*) AS cnt FROM visit_logs');
        $total = (int)$totalStmt->fetch()['cnt'];

        $weekStmt = $db->query("SELECT COUNT(*) AS cnt FROM visit_logs WHERE created_at >= date_trunc('week', CURRENT_DATE)");
        $week = (int)$weekStmt->fetch()['cnt'];

        $todayStmt = $db->query("SELECT COUNT(*) AS cnt FROM visit_logs WHERE created_at >= CURRENT_DATE");
        $today = (int)$todayStmt->fetch()['cnt'];

        json_success([
            'total' => $total,
            'week' => $week,
            'today' => $today,
        ]);
    }

    /**
     * 访问日志列表（管理端）
     */
    public static function list(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $pageSize = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        // 筛选
        $where = [];
        $params = [];

        if (!empty($_GET['device'])) {
            $where[] = 'device = :device';
            $params[':device'] = $_GET['device'];
        }
        if (!empty($_GET['os'])) {
            $where[] = 'os = :os';
            $params[':os'] = $_GET['os'];
        }
        if (!empty($_GET['browser'])) {
            $where[] = 'browser ILIKE :browser';
            $params[':browser'] = '%' . $_GET['browser'] . '%';
        }
        if (!empty($_GET['ip'])) {
            $where[] = 'ip LIKE :ip';
            $params[':ip'] = '%' . $_GET['ip'] . '%';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $db->prepare("SELECT COUNT(*) AS cnt FROM visit_logs $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetch()['cnt'];

        $listStmt = $db->prepare("SELECT id, ip, path, device, os, browser, created_at FROM visit_logs $whereSql ORDER BY id DESC LIMIT :limit OFFSET :offset");
        foreach ($params as $k => $v) {
            $listStmt->bindValue($k, $v);
        }
        $listStmt->bindValue(':limit', $pageSize, \PDO::PARAM_INT);
        $listStmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $listStmt->execute();
        $list = $listStmt->fetchAll();

        json_success([
            'list' => $list,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * 访问统计概览（管理端）
     */
    public static function overview(): void
    {
        verify_admin_auth();
        $db = DB::getInstance();

        // 设备分布
        $deviceStmt = $db->query('SELECT device, COUNT(*) AS cnt FROM visit_logs GROUP BY device ORDER BY cnt DESC');
        $devices = $deviceStmt->fetchAll();

        // OS分布
        $osStmt = $db->query('SELECT os, COUNT(*) AS cnt FROM visit_logs GROUP BY os ORDER BY cnt DESC');
        $osList = $osStmt->fetchAll();

        // 浏览器分布
        $browserStmt = $db->query('SELECT browser, COUNT(*) AS cnt FROM visit_logs GROUP BY browser ORDER BY cnt DESC LIMIT 10');
        $browsers = $browserStmt->fetchAll();

        // 最近7天趋势
        $trendStmt = $db->query("SELECT DATE(created_at) AS day, COUNT(*) AS cnt FROM visit_logs WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' GROUP BY DATE(created_at) ORDER BY day");
        $trend = $trendStmt->fetchAll();

        json_success([
            'devices' => $devices,
            'os' => $osList,
            'browsers' => $browsers,
            'trend' => $trend,
        ]);
    }

    private static function getClientIP(): string
    {
        $headers = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        foreach ($headers as $h) {
            $val = $_SERVER[$h] ?? '';
            if ($val !== '') {
                $ip = explode(',', $val)[0];
                return trim($ip);
            }
        }
        return '0.0.0.0';
    }

    private static function parseUA(string $ua): array
    {
        $result = ['device' => 'desktop', 'os' => 'unknown', 'browser' => 'unknown'];

        // Device
        if (preg_match('/iPhone|iPad|iPod/i', $ua)) {
            $result['device'] = 'mobile';
            $result['os'] = preg_match('/iPad/i', $ua) ? 'iPadOS' : 'iOS';
        } elseif (preg_match('/Android/i', $ua)) {
            $result['device'] = preg_match('/Mobile/i', $ua) ? 'mobile' : 'tablet';
            $result['os'] = 'Android';
        } elseif (preg_match('/Macintosh|Mac OS X/i', $ua)) {
            $result['os'] = 'macOS';
        } elseif (preg_match('/Windows/i', $ua)) {
            $result['os'] = 'Windows';
        } elseif (preg_match('/Linux/i', $ua)) {
            $result['os'] = 'Linux';
        }

        // Browser
        if (preg_match('/MicroMessenger/i', $ua)) {
            $result['browser'] = '微信';
        } elseif (preg_match('/DingTalk/i', $ua)) {
            $result['browser'] = '钉钉';
        } elseif (preg_match('/Edg(e|A|iOS)?\/[\d.]+/i', $ua)) {
            $result['browser'] = 'Edge';
        } elseif (preg_match('/Chrome\/[\d.]+/i', $ua) && !preg_match('/Edg/i', $ua)) {
            $result['browser'] = 'Chrome';
        } elseif (preg_match('/Safari\/[\d.]+/i', $ua) && !preg_match('/Chrome/i', $ua)) {
            $result['browser'] = 'Safari';
        } elseif (preg_match('/Firefox\/[\d.]+/i', $ua)) {
            $result['browser'] = 'Firefox';
        }

        return $result;
    }
}

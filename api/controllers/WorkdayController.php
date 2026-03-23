<?php
/**
 * 工作日控制器
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers/response.php';

class WorkdayController
{
    /**
     * 获取指定月份的工作日信息
     */
    public static function getMonth(int $year, int $month): void
    {
        if ($year < 2020 || $year > 2100 || $month < 1 || $month > 12) {
            json_error('年份或月份无效');
        }

        $db = DB::getInstance();
        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));

        // 先查缓存
        $stmt = $db->prepare('SELECT date, is_workday FROM workday_cache WHERE date BETWEEN :start AND :end');
        $stmt->execute([':start' => $startDate, ':end' => $endDate]);
        $cached = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $daysInMonth = (int)date('t', strtotime($startDate));
        $result = [];
        $needFetch = [];

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $day);
            if (isset($cached[$dateStr])) {
                $result[$dateStr] = (bool)$cached[$dateStr];
            } else {
                $needFetch[] = $dateStr;
            }
        }

        // 对未缓存的日期调用API
        if (!empty($needFetch)) {
            $fetched = self::fetchFromApi($needFetch);
            // 写入缓存
            $insertStmt = $db->prepare('INSERT INTO workday_cache (date, is_workday) VALUES (:date, :is_workday) ON CONFLICT (date) DO UPDATE SET is_workday = :is_workday2, fetched_at = NOW()');
            foreach ($fetched as $date => $isWorkday) {
                $insertStmt->execute([
                    ':date' => $date,
                    ':is_workday' => $isWorkday ? 'true' : 'false',
                    ':is_workday2' => $isWorkday ? 'true' : 'false',
                ]);
                $result[$date] = $isWorkday;
            }
        }

        ksort($result);
        json_success($result);
    }

    /**
     * 从公开API获取工作日信息
     */
    private static function fetchFromApi(array $dates): array
    {
        $config = require __DIR__ . '/../config.php';
        $apiBase = $config['workday_api'];
        $result = [];

        foreach ($dates as $date) {
            $url = $apiBase . '/' . $date;
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'header' => 'User-Agent: KMMS/1.0',
                ],
            ]);

            $response = @file_get_contents($url, false, $ctx);
            if ($response !== false) {
                $data = json_decode($response, true);
                if (isset($data['type']['type'])) {
                    // timor API: type 0=工作日, 1=周末, 2=法定节假日, 3=调休上班
                    $type = (int)$data['type']['type'];
                    $result[$date] = ($type === 0 || $type === 3);
                }
            } else {
                // API调用失败，按周一到周五为工作日处理
                $dayOfWeek = (int)date('N', strtotime($date));
                $result[$date] = ($dayOfWeek >= 1 && $dayOfWeek <= 5);
            }

            // 避免频繁请求
            usleep(100000); // 100ms
        }

        return $result;
    }
}

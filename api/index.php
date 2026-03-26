<?php
/**
 * 幼儿园食谱管理系统 - API入口
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/helpers/response.php';

// 处理CORS
handle_cors();

// 解析路由
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 移除前缀 /api（如果通过nginx代理）
$path = preg_replace('#^/api#', '', $uri);
$path = rtrim($path, '/');

// 路由分发
try {
    // 认证相关
    if ($path === '/auth/login' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::login();
    }
    elseif ($path === '/auth/current' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::currentUser();
    }
    elseif ($path === '/auth/password' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/AuthController.php';
        AuthController::changePassword();
    }

    // 管理端 - 周食谱
    elseif ($path === '/admin/weeks' && $method === 'GET') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::list();
    }
    elseif ($path === '/admin/weeks' && $method === 'POST') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::create();
    }
    elseif (preg_match('#^/admin/weeks/(\d+)$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::detail((int)$m[1]);
    }
    elseif (preg_match('#^/admin/weeks/(\d+)/items$#', $path, $m) && $method === 'PUT') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::updateItems((int)$m[1]);
    }
    elseif (preg_match('#^/admin/weeks/(\d+)/publish$#', $path, $m) && $method === 'PUT') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::publish((int)$m[1]);
    }
    elseif (preg_match('#^/admin/weeks/(\d+)/archive$#', $path, $m) && $method === 'PUT') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::archive((int)$m[1]);
    }
    elseif (preg_match('#^/admin/weeks/(\d+)$#', $path, $m) && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::delete((int)$m[1]);
    }
    elseif (preg_match('#^/admin/weeks/(\d+)/copy$#', $path, $m) && $method === 'POST') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::copy((int)$m[1]);
    }

    // 管理端 - 菜谱管理
    elseif ($path === '/admin/dishes' && $method === 'GET') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::list();
    }
    elseif ($path === '/admin/dishes/all' && $method === 'GET') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::all();
    }
    elseif ($path === '/admin/dishes' && $method === 'POST') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::create();
    }
    elseif ($path === '/admin/dishes/batch' && $method === 'POST') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::batchCreate();
    }
    elseif ($path === '/admin/dishes/batch-delete' && $method === 'POST') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::batchDelete();
    }
    elseif (preg_match('#^/admin/dishes/(\d+)$#', $path, $m) && $method === 'PUT') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::update((int)$m[1]);
    }
    elseif (preg_match('#^/admin/dishes/(\d+)$#', $path, $m) && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::delete((int)$m[1]);
    }

    // 管理端 - AI配置
    elseif ($path === '/admin/ai/config' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getConfig();
    }
    elseif ($path === '/admin/ai/config' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::updateConfig();
    }
    elseif ($path === '/admin/ai/models' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getModels();
    }
    elseif ($path === '/admin/ai/summaries' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::listSummaries();
    }
    elseif (preg_match('#^/admin/ai/summary/(\d+)$#', $path, $m) && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::deleteSummary((int)$m[1]);
    }
    elseif ($path === '/admin/ai/summaries/clear' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::clearAllSummaries();
    }
    elseif (preg_match('#^/admin/ai/summary/(\d+)/regenerate$#', $path, $m) && $method === 'POST') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::regenerateSummary((int)$m[1]);
    }

    // 管理端 - AI可用性检查
    elseif ($path === '/admin/ai/check' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::checkAvailability();
    }

    // 管理端 - OCR识别
    elseif ($path === '/admin/ocr/config' && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getOcrConfig();
    }
    elseif ($path === '/admin/ocr/config' && $method === 'PUT') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::updateOcrConfig();
    }
    elseif ($path === '/admin/ocr/recognize' && $method === 'POST') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::ocr();
    }

    // 公共接口 - AI总结
    elseif (preg_match('#^/public/ai/summary/(\d+)$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getSummary((int)$m[1]);
    }
    elseif (preg_match('#^/public/ai/nutrition/(\d+)$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getNutrition((int)$m[1]);
    }

    // 公共接口 - 菜谱名称
    elseif ($path === '/public/dishes' && $method === 'GET') {
        require_once __DIR__ . '/controllers/DishController.php';
        DishController::publicNames();
    }

    // 公共接口 - 今日食谱
    elseif ($path === '/public/today/menu' && $method === 'GET') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::todayMenu();
    }
    elseif (preg_match('#^/public/ai/daily-summary/(\d+)/(\d+)$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getDailySummary((int)$m[1], (int)$m[2]);
    }
    elseif (preg_match('#^/public/ai/daily-nutrition/(\d+)/(\d+)$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/AiController.php';
        AiController::getDailyNutrition((int)$m[1], (int)$m[2]);
    }

    // 公共接口 - 家长端
    elseif ($path === '/public/weeks/current' && $method === 'GET') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::currentWeek();
    }
    elseif ($path === '/public/weeks' && $method === 'GET') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::publicList();
    }
    elseif (preg_match('#^/public/weeks/(\d+)$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/WeekController.php';
        WeekController::publicDetail((int)$m[1]);
    }

    // 访问统计
    elseif ($path === '/public/visit' && $method === 'POST') {
        require_once __DIR__ . '/controllers/VisitController.php';
        VisitController::record();
    }
    elseif ($path === '/public/visit/stats' && $method === 'GET') {
        require_once __DIR__ . '/controllers/VisitController.php';
        VisitController::stats();
    }
    elseif ($path === '/admin/visits' && $method === 'GET') {
        require_once __DIR__ . '/controllers/VisitController.php';
        VisitController::list();
    }
    elseif ($path === '/admin/visits/overview' && $method === 'GET') {
        require_once __DIR__ . '/controllers/VisitController.php';
        VisitController::overview();
    }

    // 公告 - 公共
    elseif ($path === '/public/notices' && $method === 'GET') {
        require_once __DIR__ . '/controllers/NoticeController.php';
        NoticeController::publicList();
    }
    // 公告 - 管理端
    elseif ($path === '/admin/notices' && $method === 'GET') {
        require_once __DIR__ . '/controllers/NoticeController.php';
        NoticeController::list();
    }
    elseif ($path === '/admin/notices' && $method === 'POST') {
        require_once __DIR__ . '/controllers/NoticeController.php';
        NoticeController::create();
    }
    elseif (preg_match('#^/admin/notices/(\d+)$#', $path, $m) && $method === 'PUT') {
        require_once __DIR__ . '/controllers/NoticeController.php';
        NoticeController::update((int)$m[1]);
    }
    elseif (preg_match('#^/admin/notices/(\d+)$#', $path, $m) && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/NoticeController.php';
        NoticeController::delete((int)$m[1]);
    }

    // 管理端 - 今日所学
    elseif ($path === '/admin/daily-learning' && $method === 'POST') {
        require_once __DIR__ . '/controllers/DailyLearningController.php';
        DailyLearningController::adminCreate();
    }
    elseif (preg_match('#^/admin/daily-learning/(\d+)$#', $path, $m) && $method === 'DELETE') {
        require_once __DIR__ . '/controllers/DailyLearningController.php';
        DailyLearningController::adminDelete((int)$m[1]);
    }

    // 今日所学 - 推送接口
    elseif ($path === '/public/daily-learning' && $method === 'POST') {
        require_once __DIR__ . '/controllers/DailyLearningController.php';
        DailyLearningController::receive();
    }
    // 今日所学 - 家长端
    elseif ($path === '/public/daily-learnings' && $method === 'GET') {
        require_once __DIR__ . '/controllers/DailyLearningController.php';
        DailyLearningController::publicList();
    }
    elseif ($path === '/public/daily-learnings/month' && $method === 'GET') {
        require_once __DIR__ . '/controllers/DailyLearningController.php';
        DailyLearningController::byMonth();
    }
    elseif ($path === '/public/daily-learning/today' && $method === 'GET') {
        require_once __DIR__ . '/controllers/DailyLearningController.php';
        DailyLearningController::today();
    }

    // 工作日接口
    elseif (preg_match('#^/workdays/(\d{4})/(\d{1,2})$#', $path, $m) && $method === 'GET') {
        require_once __DIR__ . '/controllers/WorkdayController.php';
        WorkdayController::getMonth((int)$m[1], (int)$m[2]);
    }

    // 404
    else {
        json_error('接口不存在', 404);
    }
} catch (PDOException $e) {
    error_log('Database error: ' . $e->getMessage());
    json_error('数据库错误', 500);
} catch (Exception $e) {
    error_log('Server error: ' . $e->getMessage());
    json_error('服务器错误', 500);
}

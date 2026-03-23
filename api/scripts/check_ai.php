<?php
/**
 * AI 可用性检查脚本
 * 用法：php check_ai.php [--notify] [--webhook URL]
 * cron: 0 8 * * * php /var/www/html/scripts/check_ai.php --notify
 */

require_once __DIR__ . '/../db.php';

// 解析参数
$notify = in_array('--notify', $argv ?? []);

$db = DB::getInstance();
$stmt = $db->query('SELECT api_url, api_key, model, enabled, ocr_api_url, ocr_api_key, ocr_model, ocr_enabled, webhook_url FROM ai_config WHERE id = 1');
$config = $stmt->fetch();

$results = [];

// 检查 AI 营养总结
if ($config && $config['enabled'] && $config['api_url'] && $config['api_key']) {
    $results['ai_summary'] = checkAPI(
        $config['api_url'], $config['api_key'], $config['model'], '你好，请回复"OK"'
    );
} else {
    $results['ai_summary'] = ['ok' => false, 'error' => '未启用或未配置'];
}

// 检查 OCR
if ($config && $config['ocr_enabled'] && $config['ocr_api_url'] && $config['ocr_api_key']) {
    $results['ocr'] = checkAPI(
        $config['ocr_api_url'], $config['ocr_api_key'], $config['ocr_model'], '你好，请回复"OK"'
    );
} else {
    $results['ocr'] = ['ok' => false, 'error' => '未启用或未配置'];
}

// 输出结果
$allOk = true;
$failMessages = [];
foreach ($results as $name => $r) {
    $label = $name === 'ai_summary' ? 'AI营养总结' : 'OCR识别';
    if ($r['ok']) {
        echo "✅ {$label}: 正常 (耗时 {$r['latency']}ms)\n";
    } else {
        echo "❌ {$label}: 异常 - {$r['error']}\n";
        $allOk = false;
        $failMessages[] = "❌ {$label}: {$r['error']}";
    }
}

// 发送企业微信通知
$WECOM_WEBHOOK = $config['webhook_url'] ?? '';
if ($notify && $WECOM_WEBHOOK !== '') {
    $time = date('Y-m-d H:i:s');
    if ($allOk) {
        $okDetails = [];
        foreach ($results as $name => $r) {
            $label = $name === 'ai_summary' ? 'AI营养总结' : 'OCR识别';
            $okDetails[] = "✅ {$label} ({$r['latency']}ms)";
        }
        $content = "✅ 【食谱系统】AI服务日检正常\n"
            . "时间：{$time}\n"
            . implode("\n", $okDetails);
    } else {
        $allDetails = [];
        foreach ($results as $name => $r) {
            $label = $name === 'ai_summary' ? 'AI营养总结' : 'OCR识别';
            $allDetails[] = $r['ok']
                ? "✅ {$label} ({$r['latency']}ms)"
                : "❌ {$label}: {$r['error']}";
        }
        $content = "⚠️ 【食谱系统】AI服务异常告警\n"
            . "时间：{$time}\n"
            . implode("\n", $allDetails)
            . "\n\n请及时检查 AI 配置。";
    }
    sendWecom($WECOM_WEBHOOK, $content);
    echo "\n📢 已发送企业微信通知\n";
} elseif ($notify && $WECOM_WEBHOOK === '') {
    echo "\n⚠️ 未配置 Webhook URL，跳过通知\n";
}

// 以 JSON 输出（供 API 调用）
if (php_sapi_name() !== 'cli') {
    echo json_encode(['results' => $results, 'all_ok' => $allOk], JSON_UNESCAPED_UNICODE);
}

exit($allOk ? 0 : 1);

// === 工具函数 ===

function checkAPI(string $apiUrl, string $apiKey, string $model, string $testPrompt): array
{
    $url = rtrim($apiUrl, '/') . '/chat/completions';
    $body = json_encode([
        'model' => $model,
        'messages' => [['role' => 'user', 'content' => $testPrompt]],
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

    if ($error) {
        return ['ok' => false, 'error' => "连接失败: {$error}", 'latency' => $latency];
    }
    if ($httpCode !== 200) {
        $data = json_decode($response, true);
        $msg = $data['message'] ?? $data['error']['message'] ?? "HTTP {$httpCode}";
        return ['ok' => false, 'error' => $msg, 'latency' => $latency];
    }

    $data = json_decode($response, true);
    if (!isset($data['choices'][0])) {
        return ['ok' => false, 'error' => '响应格式异常', 'latency' => $latency];
    }

    return ['ok' => true, 'latency' => $latency, 'model' => $model];
}

function sendWecom(string $webhook, string $content): void
{
    $body = json_encode([
        'msgtype' => 'text',
        'text' => ['content' => $content],
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($webhook);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

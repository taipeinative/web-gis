<?php
// 負責管理動態載入頁面的伺服器程式
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        // 感謝 ChatGPT 提醒：移除輸入 id 中的特殊字元，以避免目錄遍歷攻擊（Directory Tranversal Attack）
        // 舉例來說，可以在 id 中加入斜線（/）和點（.）字元，攻擊者可以存取目錄的其他結構
        $id_str   = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['id']);
        $path_str = dirname(__FILE__) . "\\component\\{$id_str}.html";
        if (file_exists($path_str)) {
            header('Content-Type: text/html; charset=utf-8');
            echo file_get_contents($path_str);
        } else {
            http_response_code(404);
            echo json_encode(['error' => "Requested file not found: {$path_str}"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing parameter \'id\'']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
<?php
$database = 'database.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action'])) {
        switch ($_GET['action']) {
            case 'download':
                header('Access-Control-Allow-Origin: *');
                header('Content-Type: application/json; charset=utf-8');
                readfile($database);
                break;

            case 'pull':
                header('Access-Control-Allow-Origin: *');
                header('Content-Type: application/json; charset=utf-8');
                if (file_exists($database)) {
                    echo file_get_contents($database);
                } else {
                    echo json_encode([]);
                }
                break;

            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
                break;
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing action']);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    if ($input === '[]') {
        $decoded = $input;
    } else {
        $decoded = json_decode($input, true);
    }

    if (isset($_GET['action']) && $_GET['action'] === 'push') {
        if ($decoded) {
            if ($decoded === '[]') {
                file_put_contents($database, $decoded);
                echo json_encode(['success' => true]);
            } else {
                file_put_contents($database, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
                echo json_encode(['success' => true]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
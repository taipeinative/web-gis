<?php
$database = 'database.json';

// Upload
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $file = file_get_contents('php://input');
    $decoded = json_decode($file, true);

    if ($decoded && $decoded['action'] === 'upload' && isset($decoded['data'])) {
        file_put_contents($database, $decoded['data']);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }

// Download
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'download') {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="records.json"');
    readfile($database);

// Error
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request.']);
}
?>
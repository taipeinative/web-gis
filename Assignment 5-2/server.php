<?php
$database = 'database.json';

// Filter data in the database.
function filterData($data, $after, $before, $stock) {
    $filtered = [];

    foreach ($data as $record) {
        $date = $record['月別'];

        if (($after && $date < $after) || ($before && $date > $before)) {
            continue;
        }

        if ($stock !== '(All)' && (!isset($record[$stock]) || $record[$stock] === null)) {
            continue;
        }

        $filtered[] = [
            '月別' => $date,
            'value' => $stock !== '(All)' ? $record[$stock] : null
        ];
    }

    return $filtered;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action'])) {
        switch ($_GET['action']) {
            case 'init':
                $data = json_decode(file_get_contents($database), true);
                $months = array_column($data, '月別');
                $oldestMonth = min($months);
                $latestMonth = max($months);

                header('Access-Control-Allow-Origin: *');
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(['oldestMonth' => $oldestMonth, 'latestMonth' => $latestMonth]);
                break;

            case 'query':
                $after = $_GET['after'] ?? null;
                $before = $_GET['before'] ?? null;
                $stock = $_GET['stock'] ?? '(All)';
                $data = json_decode(file_get_contents($database), true);
                $filteredData = filterData($data, $after, $before, $stock);

                header('Access-Control-Allow-Origin: *');
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode($filteredData);
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
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
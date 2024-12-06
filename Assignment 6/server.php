<?php
// =========
// CONSTANTS
// =========

/**
 * The database's name.
 * @var string
 */
const DB_DATABASE = 'exp_logger';

/**
 * The account's password.
 * @var string
 */
const DB_PASSWORD = '';

/**
 * The server's name.
 * @var string
 */
const DB_SERVER = 'localhost';

/**
 * The table's name.
 * @var string
 */
const DB_TABLE = 'expense';

/**
 * The account's name.
 * @var string
 */
const DB_USER = 'root';

// =========
// VARIABLES
// =========

/**
 * @var PDO The database connection.
 */
$conn_pdo;

/**
 * @var string The database source name.
 */
$dtsn_str = sprintf('mysql:host=%s;dbname=%s;charset=utf8', DB_SERVER, DB_DATABASE);

/**
 * @var PDOStatement The PDO query statement.
 */
$qury_pds;

/**
 * @var array The response array.
 */
$rsps_arr;

// ====================
// ESTABLISH CONNECTION
// ====================

try {
    $conn_pdo =  new PDO($dtsn_str, DB_USER, DB_PASSWORD);
    $conn_pdo -> setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $errr_exp) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $errr_exp -> getMessage()]);
    exit;
}

// =======
// QUERIES
// =======

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action'])) {
        switch ($_GET['action']) {
            case 'pull':
                header('Access-Control-Allow-Origin: *');
                header('Content-Type: application/json; charset=utf-8');
                $qury_pds = $conn_pdo -> query(sprintf('SELECT caption, amount, date, memo FROM %s', DB_TABLE));
                $rsps_arr = $qury_pds -> fetchAll(PDO::FETCH_ASSOC);
                if ($rsps_arr) {
                    echo json_encode($rsps_arr);
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

} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_GET['action'])) {
        $inpt_str = file_get_contents('php://input');
        $file_mxd = json_decode($inpt_str, true);

        switch ($_GET['action']) {
            case 'push':
                if (is_array($file_mxd) && !empty($file_mxd)) {
                    try {
                        $conn_pdo -> beginTransaction();
                        $conn_pdo -> exec(sprintf('TRUNCATE TABLE %s', DB_TABLE));
                        $qury_pds = $conn_pdo -> prepare(sprintf('INSERT INTO %s (caption, amount, date, memo) VALUES (:caption, :amount, :date, :memo)', DB_TABLE));

                        foreach ($file_mxd as $data_kvp) {
                            $qury_pds -> bindParam(':caption', $data_kvp['caption']);
                            $qury_pds -> bindParam(':amount',  $data_kvp['amount'] );
                            $qury_pds -> bindParam(':date',    $data_kvp['date']   );
                            $qury_pds -> bindParam(':memo',    $data_kvp['memo']   );
                            $qury_pds -> execute();
                        }

                        if ($conn_pdo -> inTransaction()) $conn_pdo -> commit();
                        http_response_code(200);
                        echo json_encode(['success' => true]);
                        
                    } catch (PDOException $errr_exp) {
                        if ($conn_pdo -> inTransaction()) {
                            $conn_pdo -> rollBack();
                        }
                        http_response_code(500);
                        echo json_encode(['error' => 'Database error: ' . $errr_exp -> getMessage()]);
                    }
                } else {
                    if ($inpt_str === '[]') {
                        $conn_pdo -> beginTransaction();

                        try {
                            $conn_pdo -> exec(sprintf('TRUNCATE TABLE %s', DB_TABLE));
                            if ($conn_pdo -> inTransaction()) $conn_pdo -> commit();
                            http_response_code(200);
                            echo json_encode(['success' => true]);
    
                        } catch (PDOException $errr_exp) {
                            if ($conn_pdo -> inTransaction()) {
                                $conn_pdo -> rollBack();
                            }
                            http_response_code(500);
                            echo json_encode(['error' => 'Database error: ' . $errr_exp -> getMessage()]);
                        }
                    } else {
                        http_response_code(400);
                        echo json_encode(['error' => 'Invalid data']);
                    }
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

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ====================
// TERMINATE CONNECTION
// ====================

$conn_pdo = null;
?>
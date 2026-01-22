<?php
/**
 * Speed Test PHP Backend - Alternative backend untuk tes kecepatan internet
 * Menggunakan PHP untuk kompatibilitas yang lebih luas
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuration
define('TEST_FILE_SIZE_MB', 5); // Smaller for PHP
define('MAX_UPLOAD_SIZE', 50 * 1024 * 1024); // 50MB

class SpeedTestServer {
    public function __construct() {
        $this->setupErrorHandling();
    }

    private function setupErrorHandling() {
        ini_set('display_errors', 0);
        ini_set('log_errors', 1);
        error_reporting(E_ALL);
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Support query parameter untuk XAMPP (speedtest.php?action=ping)
        $action = isset($_GET['action']) ? $_GET['action'] : null;

        try {
            // Cek query parameter dulu (untuk XAMPP)
            if ($action) {
                switch ($action) {
                    case 'ping':
                        $this->handlePing();
                        break;
                    case 'download':
                        $this->handleDownload();
                        break;
                    case 'upload':
                        $this->handleUpload();
                        break;
                    case 'info':
                        $this->handleSpeedtestInfo();
                        break;
                    default:
                        $this->sendError('Invalid action', 400);
                }
                return;
            }
            
            // Fallback ke path-based routing (untuk standalone PHP server)
            switch ($path) {
                case '/':
                case '/speedtest.php':
                    $this->handleHome();
                    break;
                case '/ping':
                    $this->handlePing();
                    break;
                case '/download':
                    $this->handleDownload();
                    break;
                case '/upload':
                    $this->handleUpload();
                    break;
                case '/speedtest':
                    $this->handleSpeedtestInfo();
                    break;
                default:
                    $this->sendError('Not Found', 404);
            }
        } catch (Exception $e) {
            $this->sendError($e->getMessage(), 500);
        }
    }

    private function handleHome() {
        $response = [
            'status' => 'PHP Speed Test Server Running',
            'version' => '1.0',
            'language' => 'PHP',
            'endpoints' => [
                'download' => '/download',
                'upload' => '/upload',
                'ping' => '/ping',
                'info' => '/speedtest'
            ]
        ];
        $this->sendJson($response);
    }

    private function handlePing() {
        $response = [
            'timestamp' => microtime(true),
            'status' => 'pong',
            'server_time' => date('Y-m-d H:i:s')
        ];
        $this->sendJson($response);
    }

    private function handleDownload() {
        $fileSize = TEST_FILE_SIZE_MB * 1024 * 1024; // Convert to bytes

        // Set headers for download
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="test_' . TEST_FILE_SIZE_MB . 'MB.bin"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('Content-Length: ' . $fileSize);

        // Generate and send test data
        $this->generateTestData($fileSize);
    }

    private function handleUpload() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->sendError('Method not allowed', 405);
            return;
        }

        // Check if file was uploaded
        if (!isset($_FILES['file'])) {
            $this->sendError('No file provided', 400);
            return;
        }

        $file = $_FILES['file'];

        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->sendError('Upload failed: ' . $this->getUploadErrorMessage($file['error']), 400);
            return;
        }

        // Check file size
        if ($file['size'] > MAX_UPLOAD_SIZE) {
            $this->sendError('File too large', 413);
            return;
        }

        $response = [
            'status' => 'success',
            'file_name' => $file['name'],
            'file_size' => $file['size'],
            'upload_time' => time(),
            'message' => 'Successfully received ' . $file['size'] . ' bytes'
        ];

        $this->sendJson($response);
    }

    private function handleSpeedtestInfo() {
        $response = [
            'test_file_size_mb' => TEST_FILE_SIZE_MB,
            'max_upload_size_mb' => MAX_UPLOAD_SIZE / (1024 * 1024),
            'supported_tests' => ['download', 'upload', 'ping'],
            'server_info' => [
                'language' => 'PHP',
                'version' => phpversion(),
                'max_upload_size' => ini_get('upload_max_filesize'),
                'max_post_size' => ini_get('post_max_size')
            ]
        ];
        $this->sendJson($response);
    }

    private function generateTestData($size) {
        $chunkSize = 1024 * 1024; // 1MB chunks

        for ($offset = 0; $offset < $size; $offset += $chunkSize) {
            $remaining = min($chunkSize, $size - $offset);

            // Generate pseudo-random data
            $chunk = '';
            for ($i = 0; $i < $remaining; $i++) {
                $chunk .= chr(($offset + $i) % 256);
            }

            echo $chunk;

            // Flush output buffer to ensure streaming
            if (ob_get_level()) {
                ob_flush();
            }
            flush();
        }
    }

    private function getUploadErrorMessage($errorCode) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload'
        ];

        return $messages[$errorCode] ?? 'Unknown upload error';
    }

    private function sendJson($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
    }

    private function sendError($message, $statusCode = 500) {
        $this->sendJson([
            'error' => $message,
            'status_code' => $statusCode
        ], $statusCode);
    }
}

// Initialize and run server
$server = new SpeedTestServer();
$server->handleRequest();
?>

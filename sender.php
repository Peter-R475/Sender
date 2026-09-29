<?php
// 1. Read session data and release file lock immediately
session_start();
$event = $_SESSION['event_name'] ?? 'Unknown Event';
session_write_close();

// 2. Validate required payload upfront
if (!isset($_POST['totalParticipants'])) {
    http_response_code(400);
    exit("Error: 'totalParticipants' parameter is required.");
}

require_once __DIR__ . '/vendor/autoload.php';

// 3. Verify Service Account key exists
$credentialsPath = __DIR__ . '/key_sender.json';
if (!file_exists($credentialsPath)) {
    http_response_code(500);
    exit("Error: JSON key file not found at: " . $credentialsPath);
}

$totalParticipants = $_POST['totalParticipants'];
$time = $_POST['Time'] ?? date('Y-m-d H:i:s');

try {
    // 4. Initialize Google Client & Service
    $client = new Google\Client();
    $client->setAuthConfig($credentialsPath);
    $client->addScope(Google\Service\Sheets::SPREADSHEETS);

    $service = new Google\Service\Sheets($client);

    $spreadsheetId = '1_LYqqnuCgZ1R-HtfwZWuRSNuAx1-9JfIulXHb8Q22mo';
    $range = 'A:C';

    $data = [
        [$event, $totalParticipants, $time]
    ];

    $body = new Google\Service\Sheets\ValueRange([
        'values' => $data
    ]);

    $params = [
        'valueInputOption' => 'USER_ENTERED'
    ];

    // 5. Execute append
    $result = $service->spreadsheets_values->append(
        $spreadsheetId,
        $range,
        $body,
        $params
    );

    http_response_code(200);
    echo "Rows successfully inserted: " . $result->getUpdates()->getUpdatedRows();

} catch (Google\Service\Exception $e) {
    http_response_code(500);
    echo "Google API Error: " . $e->getMessage();
} catch (Throwable $e) {
    http_response_code(500);
    echo "Server Error: " . $e->getMessage();
}
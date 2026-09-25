<?php
session_start();

require_once __DIR__ . '/vendor/autoload.php';

// 1. Verify JSON file exists and define absolute path
$credentialsPath = __DIR__ . '/key_sender.json';

if (!file_exists($credentialsPath)) {
    die("Error: JSON key file not found at: " . $credentialsPath);
}

// Ensure required keys exist before processing
if (isset($_POST['totalParticipants'])) {
    $totalParticipants = $_POST['totalParticipants'];
    $event = $_SESSION['event_name'] ?? 'Unknown Event';
    $time = $_POST['Time'] ?? date('Y-m-d H:i:s');

    // 2. Initialize Google Client
    $client = new Google\Client();
    $client->setAuthConfig($credentialsPath);
    $client->addScope(Google\Service\Sheets::SPREADSHEETS);

    $service = new Google\Service\Sheets($client);

    // 3. Target Spreadsheet & Range
    $spreadsheetId = '1_LYqqnuCgZ1R-HtfwZWuRSNuAx1-9JfIulXHb8Q22mo';
    $range = 'A:C';

    // 4. Prepare Data for Columns: [A: Event_name, B: Participants, C: Time]
    $data = [
        [$event, $totalParticipants, $time]
    ];

    $body = new Google\Service\Sheets\ValueRange([
        'values' => $data
    ]);

    $params = [
        'valueInputOption' => 'USER_ENTERED'
    ];

    // 5. Append Data
    $result = $service->spreadsheets_values->append(
        $spreadsheetId,
        $range,
        $body,
        $params
    );

    echo "Rows successfully inserted: " . $result->getUpdates()->getUpdatedRows();
}
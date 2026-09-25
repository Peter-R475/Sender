<?php
try {
    $pdo = new PDO("sqlite:detections.db");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Insert records using a prepared statement
    $sql = "ALTER TABLE `staff_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
COMMIT;";

    $pdo->exec($sql);
    echo "Data inserted into 'event_info' successfully.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
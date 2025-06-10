<?php
/**
 * Einfaches PHP-Script für die Hangar Planner Datensynchronisation.
 * Unterstützt das Speichern und Laden von JSON-Daten.
 */

// Fehlermeldungen anzeigen (für Debugging, später ausschalten)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS-Header für die Entwicklung (bei Bedarf anpassen)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Bei OPTIONS-Anfragen (CORS preflight) sofort beenden
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Dateipfad für die gespeicherten Daten
$dataFile = __DIR__ . '/data.json';

// GET-Anfrage: Daten zurückgeben
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
    } else {
        echo json_encode([
            'error' => 'Keine Daten gefunden',
            'success' => false
        ]);
    }
}

// POST-Anfrage: Daten speichern
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // JSON-Daten aus dem Request-Body lesen
        $jsonData = file_get_contents('php://input');
        
        // Prüfen, ob es gültiges JSON ist
        $data = json_decode($jsonData);
        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Ungültiges JSON-Format");
        }
        
        // Schreibzugriff prüfen
        if (!is_writable(__DIR__) && !file_exists($dataFile)) {
            throw new Exception("Keine Schreibberechtigung im Verzeichnis");
        }
        
        if (file_exists($dataFile) && !is_writable($dataFile)) {
            throw new Exception("Keine Schreibberechtigung für die Datei");
        }
        
        // Daten in Datei speichern
        file_put_contents($dataFile, $jsonData);
        
        // Erfolgsantwort
        echo json_encode([
            'message' => 'Daten erfolgreich gespeichert',
            'timestamp' => time(),
            'success' => true
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'error' => $e->getMessage(),
            'success' => false
        ]);
    }
}

// Andere Methoden nicht erlaubt
else {
    http_response_code(405);
    echo json_encode([
        'error' => 'Methode nicht erlaubt',
        'success' => false
    ]);
}
?>

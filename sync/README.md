# Hangar Planner Server-Synchronisation

Diese Anleitung beschreibt, wie Sie die automatische Server-Synchronisation für den Hangar Planner einrichten können.

## Installationsanleitung

### 1. Dateien hochladen

Laden Sie alle Dateien des Hangar Planners auf Ihren Webspace hoch.

### 2. Berechtigungen für das Sync-Verzeichnis setzen

Stellen Sie sicher, dass das PHP-Script Schreibrechte im `sync`-Verzeichnis hat:

```bash
chmod 755 sync
chmod 644 sync/data.php
chmod 666 sync/data.json  # Falls die Datei bereits existiert
```

Falls Sie keinen Shell-Zugriff haben, können Sie die Berechtigungen über das FTP-Programm oder das Hosting-Control-Panel setzen.

### 3. Testen der Synchronisation

1. Öffnen Sie den Hangar Planner in Ihrem Browser
2. Die automatische Synchronisation sollte sich selbst konfigurieren
3. Aktivieren Sie die "Auto-Sync" Checkbox in der Daten-Synchronisation
4. Alle Änderungen werden nun automatisch auf dem Server gespeichert

## Fehlerbehebung

### Synchronisation funktioniert nicht automatisch

Überprüfen Sie folgende Punkte:

1. Ist das `sync`-Verzeichnis korrekt hochgeladen?
2. Hat das PHP-Script Schreibrechte im Verzeichnis?
3. Ist in der Browser-Konsole (F12) ein Fehler zu sehen?

### Manuelle Konfiguration

Falls die automatische Erkennung nicht funktioniert:

1. Öffnen Sie den Hangar Planner
2. Klicken Sie auf "Server-Sync"
3. Geben Sie die URL zum PHP-Script manuell ein: `https://ihre-domain.de/sync/data.php`

## Technische Details

- Die Synchronisation verwendet einfache HTTP-Requests (GET/POST)
- Die Daten werden als JSON in der Datei `data.json` gespeichert
- Alle Änderungen werden beim Speichern zum Server hochgeladen
- Die Daten werden beim Start der Anwendung automatisch geladen

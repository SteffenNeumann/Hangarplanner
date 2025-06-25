# Rekursive Synchronisations-Fehleranalyse

## ✅ SOFORT VERFÜGBARE ANALYSE

Nach dem Laden der Seite stehen folgende Kommandos **sofort** zur Verfügung:

### 🚀 HAUPTKOMMANDO (Empfohlen):

```javascript
window.runSyncDiagnosis();
```

Diese Funktion führt eine vollständige, rekursive Analyse aller Input-Felder durch und identifiziert systematisch:

- **Datenextraktions-Probleme** (werden Werte korrekt gelesen?)
- **Server-Sync-Probleme** (kommen Daten auf dem Server an?)
- **Datenrückschreibungs-Probleme** (werden Server-Daten korrekt in Felder geschrieben?)
- **Überschreibungs-Probleme** (werden Daten nachträglich überschrieben?)

### 🔧 QUICK-TESTS:

```javascript
window.quickSyncTests.testDataExtraction(); // Teste nur Datenextraktion
window.quickSyncTests.testServerConnection(); // Teste nur Server-Verbindung
window.quickSyncTests.testHtmlStructure(); // Teste nur HTML-Struktur
```

### 🔍 EINZELFELD-TESTS:

```javascript
window.testSingleField("arrival-time-1"); // Teste spezifisches Feld
window.testSingleField("departure-time-5"); // Teste anderes Feld
window.testSingleField("position-3"); // Teste Position-Feld
```

## 🛠️ BEI PROBLEMEN

Falls die Tools nicht verfügbar sind:

```javascript
window.syncDebugFixer.fixAll(); // Repariert fehlende Module
window.syncDebugFixer.emergencyDiagnosis(); // Notfall-Diagnose
```

## 📊 ANALYSIERTE FELDER

Die Analyse testet systematisch alle Input-Felder mit folgenden ID-Patterns:

- **`arrival-time-{id}`** - Ankunftszeiten
- **`departure-time-{id}`** - Abfahrtszeiten
- **`position-{id}`** - Positionen (NUR diese, NICHT hangar-position-{id})
- **`position-{id}`** - Position Info Grid

Für jedes gefundene Feld werden **4 kritische Tests** durchgeführt:

1. **📖 Datenextraktion** - Kann das Feld beschrieben/gelesen werden?
2. **🌐 Server-Sync** - Werden Änderungen zum Server übertragen?
3. **📥 Datenrückschreibung** - Werden Server-Daten korrekt zurückgeschrieben?
4. **🛡️ Überschreibungsschutz** - Bleiben Daten persistent?

## Erweiterte Tools (Optional)

### 1. 🎯 Master Sync Diagnostics (`js/master-sync-diagnostics.js`)

**Hauptkommando für vollständige Analyse:**

```javascript
window.syncDiagnostics.runFull();
```

**Quick-Tests:**

```javascript
window.syncDiagnostics.quickDataExtraction(); // Schnelltest Datenextraktion
window.syncDiagnostics.quickServerSync(); // Schnelltest Server-Sync
```

- `position-{id}`

```javascript
window.recursiveSyncAnalysis.runCompleteAnalysis();
window.quickSyncTest.testAll();
window.quickSyncTest.testField("arrival-time-1"); // Spezifisches Feld testen
```

### 3. 🏗️ HTML-Struktur-Analyse (`js/html-structure-analysis.js`)

Prüft die DOM-Struktur und identifiziert fehlende Elemente:

```javascript
window.htmlStructureAnalysis.runCompleteHtmlAnalysis();
window.htmlCheck.checkStructure();
window.htmlCheck.checkTile(0); // Spezifische Tile prüfen
```

### 4. 🔧 Debug-Sync (`js/debug-sync.js`)

Bestehende Debug-Funktionen:

```javascript
window.syncDebug.debugAllFields();
```

### 5. 🧪 Test-Sync (`js/test-sync.js`)

Automatisierte Test-Suite:

```javascript
window.testSync.runAllTests();
```

### 6. 🕵️ Sync Investigation (`js/sync-investigation.js`)

Detaillierte Untersuchung:

```javascript
window.syncInvestigation.runDetailedInvestigation();
```

## Analysierte Aspekte

### 4-Punkte-Analyse für jedes Feld:

1. **📖 Datenextraktion** - Werden Daten korrekt aus den Input-Feldern gelesen?
2. **🌐 Server-Sync** - Werden Daten korrekt auf dem Live-Server gespeichert?
3. **📥 Datenrückschreibung** - Werden Server-Daten korrekt in die Input-Felder geschrieben?
4. **🛡️ Überschreibungsschutz** - Werden Daten nachträglich überschrieben?

### HTML-Struktur-Validierung:

- Container-Existenz (`#hangarGrid`, `#secondaryHangarGrid`)
- Tile-Struktur (`.hangar-tile` Klasse, eindeutige IDs)
- Field-Existenz (alle erwarteten Input/Select Elemente)
- ID-Pattern-Konsistenz
- Element-Typ-Validierung

## Verwendung

### Schnelle Problemdiagnose:

```javascript
// Starte die vollständige Analyse
window.syncDiagnostics.runFull();
```

### Gezielte Problemsuche:

```javascript
// Nur HTML-Struktur prüfen
window.syncDiagnostics.htmlOnly();

// Nur Synchronisation testen
window.syncDiagnostics.syncOnly();

// Nur ein spezifisches Feld testen
window.quickSyncTest.testField("arrival-time-1");
```

### Kontinuierliche Überwachung:

```javascript
// Automatische Tests in regelmäßigen Abständen
setInterval(() => {
	window.syncDiagnostics.quickDataExtraction();
}, 30000); // Alle 30 Sekunden
```

## Ausgabe-Beispiel

```
🚀 MASTER SYNC DIAGNOSTICS - VOLLSTÄNDIGE ANALYSE
=================================================

📋 PHASE 1: HTML-STRUKTUR ANALYSE
==================================
✅ Container funktional: 2/2
✅ Tiles gefunden: 8
❌ Strukturprobleme: 2

📋 PHASE 2: REKURSIVE SYNC-ANALYSE
==================================
✅ Gefundene Felder: 24
❌ Fehlende Felder: 4
🎯 Vollständig funktionierende Felder: 18/24

🎯 MASTER SUMMARY - KRITISCHE PROBLEME
======================================
📊 STATISTIKEN:
   Analysierte Felder: 24
   Funktionierende Felder: 18
   Defekte Felder: 6
   Erfolgsrate: 75%

🔥 KRITISCHE PROBLEME:
1. 🔴 4 Felder nicht im DOM gefunden
2. 🔴 Arrival Time (arrival-time-3): Server-Sync
3. 🔴 Departure Time (departure-time-5): Datenrückschreibung

💡 PRIORISIERTE EMPFEHLUNGEN:
1. 🔥 HÖCHSTE PRIORITÄT: 4 Felder nicht gefunden - Prüfe HTML-Struktur
2. 🟡 MITTEL: 2 Server-Sync-Fehler - Prüfe sync/data.php
3. 🟡 MITTEL: 1 Datenrückschreibungs-Fehler - Prüfe applyTileData()
```

## Fehlerbehebung

### Häufige Probleme:

1. **Felder nicht gefunden**

   - Prüfe HTML-Struktur mit `window.htmlCheck.checkStructure()`
   - Stelle sicher, dass alle IDs korrekt generiert werden

2. **Server-Sync Fehler**

   - Prüfe Netzwerk-Tab in den Entwicklertools
   - Teste `sync/data.php` direkt

3. **Datenrückschreibung Fehler**

   - Prüfe `applyTileData()` Funktion in `js/hangar-data.js`
   - Stelle sicher, dass `.value` statt `.textContent` verwendet wird

4. **Überschreibungs-Probleme**
   - Prüfe localStorage-Konflikte
   - Überprüfe Auto-Sync-Timing

## Integration in Entwicklungsworkflow

1. **Nach Code-Änderungen:**

   ```javascript
   window.syncDiagnostics.runFull();
   ```

2. **Vor Deployment:**

   ```javascript
   window.syncDiagnostics.runFull();
   // Erfolgsrate sollte 100% sein
   ```

3. **Für Debugging:**
   ```javascript
   window.syncDiagnostics.debugOnly();
   window.quickSyncTest.testField("problematisches-feld-id");
   ```

## Erweiterung

Die Analyse-Tools sind modular aufgebaut und können einfach erweitert werden:

- Neue Feldtypen in `recursive-sync-analysis.js` hinzufügen
- Zusätzliche HTML-Validierungen in `html-structure-analysis.js` implementieren
- Neue Test-Szenarien in den jeweiligen Modulen ergänzen

## Verfügbarkeit

Alle Tools werden automatisch mit der Anwendung geladen und sind über die Browser-Konsole verfügbar. Die Funktionen sind bewusst global verfügbar gemacht, um einfache Debugging-Sessions zu ermöglichen.

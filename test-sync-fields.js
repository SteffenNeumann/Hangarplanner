/**
 * DIREKTER TEST FÜR ZEIT- UND POSITIONSFELD-SYNCHRONISATION
 * Prüft warum diese Felder nicht synchronisiert werden
 */

console.log("🔍 DIREKTER SYNC-TEST FÜR ZEIT- UND POSITIONSFELDER");
console.log("=====================================================");

// Test 1: Prüfe ob Felder existieren
console.log("\n📋 SCHRITT 1: Feldexistenz prüfen");
console.log("=================================");

const testFields = [
	'arrival-time-1',
	'departure-time-1', 
	'position-1',
	'aircraft-1'  // Referenz
];

testFields.forEach(fieldId => {
	const element = document.getElementById(fieldId);
	console.log(`${fieldId}: ${element ? '✅ Existiert' : '❌ Nicht gefunden'}`);
	if (element) {
		console.log(`  - Typ: ${element.tagName.toLowerCase()}`);
		console.log(`  - Wert: "${element.value}"`);
		console.log(`  - Klassen: ${element.className}`);
	}
});

// Test 2: Prüfe Event-Listener Setup
console.log("\n📋 SCHRITT 2: Event-Listener prüfen");
console.log("====================================");

// Test ob setupFieldListener funktioniert
if (window.storageBrowser) {
	console.log("✅ storageBrowser verfügbar");
	
	// Prüfe ob die Selektoren existieren
	const selectors = [
		'input[id^="aircraft-"]',
		'input[id^="arrival-time-"]',
		'input[id^="departure-time-"]', 
		'input[id^="position-"]'
	];
	
	selectors.forEach(selector => {
		const elements = document.querySelectorAll(selector);
		console.log(`${selector}: ${elements.length} Elemente gefunden`);
		if (elements.length > 0) {
			console.log(`  Beispiel: ${elements[0].id}`);
		}
	});
} else {
	console.log("❌ storageBrowser nicht verfügbar");
}

// Test 3: Manueller Event-Test
console.log("\n📋 SCHRITT 3: Manueller Event-Test");
console.log("===================================");

const testFieldId = 'arrival-time-1';
const testElement = document.getElementById(testFieldId);

if (testElement) {
	console.log(`✅ Test-Element ${testFieldId} gefunden`);
	
	const originalValue = testElement.value;
	const testValue = "12:34";
	
	console.log(`Original: "${originalValue}"`);
	console.log(`Setze Testwert: "${testValue}"`);
	
	testElement.value = testValue;
	
	// Events manuell triggern
	testElement.dispatchEvent(new Event('input', { bubbles: true }));
	testElement.dispatchEvent(new Event('change', { bubbles: true }));
	
	console.log(`Nach Event: "${testElement.value}"`);
	
	// Warten und dann Datensammlung testen
	setTimeout(() => {
		console.log("\n📋 SCHRITT 4: Datensammlung testen");
		console.log("===================================");
		
		if (window.hangarData?.collectTileData) {
			const tileData = window.hangarData.collectTileData('#hangarGrid');
			if (tileData && tileData.length > 0) {
				console.log('✅ collectTileData funktioniert');
				console.log(`Tile 1 arrivalTime: "${tileData[0].arrivalTime}"`);
			} else {
				console.log('❌ collectTileData gibt keine Daten zurück');
			}
		}
		
		if (window.storageBrowser?.collectSingleTileData) {
			const singleTileData = window.storageBrowser.collectSingleTileData(1);
			console.log('✅ collectSingleTileData funktioniert');
			console.log(`Tile 1 arrivalTime: "${singleTileData.arrivalTime}"`);
		}
		
		// Originalwert zurücksetzen
		testElement.value = originalValue;
		
	}, 1000);
	
} else {
	console.log(`❌ Test-Element ${testFieldId} nicht gefunden`);
}

console.log("\n📋 SCHRITT 5: Server-Sync-Konfiguration prüfen");
console.log("==============================================");

if (window.storageBrowser) {
	console.log(`Auto-Sync aktiviert: ${localStorage.getItem('hangarplanner_auto_sync')}`);
	console.log(`Server-URL: ${window.storageBrowser.serverUrl || 'Nicht gesetzt'}`);
}

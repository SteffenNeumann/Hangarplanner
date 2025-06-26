/**
 * SOFORTIGER SYNC-FIELD TEST
 * Führe window.testSyncFields() aus um die Zeit- und Positionsfeld-Synchronisation zu testen
 */

window.testSyncFields = function() {
	console.log("🔍 DIREKTER SYNC-TEST FÜR ZEIT- UND POSITIONSFELDER");
	console.log("=====================================================");

	// Test 1: Prüfe HTML-Struktur
	console.log("\n📋 HTML-STRUKTUR TEST");
	console.log("====================");
	
	const testTileId = 1;
	const fieldsToTest = [
		{ id: `aircraft-${testTileId}`, name: 'Aircraft (Referenz)' },
		{ id: `arrival-time-${testTileId}`, name: 'Arrival Time' },
		{ id: `departure-time-${testTileId}`, name: 'Departure Time' },
		{ id: `position-${testTileId}`, name: 'Position Info Grid' }
	];
	
	fieldsToTest.forEach(field => {
		const element = document.getElementById(field.id);
		console.log(`${field.name} (${field.id}): ${element ? '✅' : '❌'}`);
		if (element) {
			console.log(`  Tag: ${element.tagName}, Type: ${element.type || 'N/A'}, Value: "${element.value}"`);
		}
	});

	// Test 2: Event-Listener Verfügbarkeit
	console.log("\n📋 EVENT-LISTENER TEST");
	console.log("======================");
	
	const selectors = [
		'input[id^="aircraft-"]',
		'input[id^="arrival-time-"]',
		'input[id^="departure-time-"]',
		'input[id^="position-"]'
	];
	
	selectors.forEach(selector => {
		const elements = document.querySelectorAll(selector);
		console.log(`${selector}: ${elements.length} Elemente`);
	});

	// Test 3: Funktionsweise Test
	console.log("\n📋 FUNKTIONSWEISE TEST");
	console.log("======================");
	
	const arrivalField = document.getElementById(`arrival-time-${testTileId}`);
	if (arrivalField) {
		const originalValue = arrivalField.value;
		const testValue = "14:30";
		
		console.log(`Original Arrival Time: "${originalValue}"`);
		arrivalField.value = testValue;
		console.log(`Gesetzt auf: "${testValue}"`);
		
		// Events triggern
		arrivalField.dispatchEvent(new Event('input', { bubbles: true }));
		arrivalField.dispatchEvent(new Event('change', { bubbles: true }));
		
		console.log(`Nach Events: "${arrivalField.value}"`);
		
		// Datensammlung testen
		setTimeout(() => {
			console.log("\n📋 DATENSAMMLUNG TEST");
			console.log("====================");
			
			// hangar-data.js collectTileData
			if (window.hangarData?.collectTileData) {
				try {
					const allTileData = window.hangarData.collectTileData('#hangarGrid');
					if (allTileData && allTileData.length > 0) {
						const tile1Data = allTileData[0];
						console.log(`hangar-data collectTileData - Tile 1 arrivalTime: "${tile1Data.arrivalTime}"`);
					}
				} catch (e) {
					console.log(`❌ hangar-data collectTileData Fehler: ${e.message}`);
				}
			}
			
			// storage-browser.js collectSingleTileData  
			if (window.storageBrowser?.collectSingleTileData) {
				try {
					const singleData = window.storageBrowser.collectSingleTileData(testTileId);
					console.log(`storage-browser collectSingleTileData - arrivalTime: "${singleData.arrivalTime}"`);
				} catch (e) {
					console.log(`❌ storage-browser collectSingleTileData Fehler: ${e.message}`);
				}
			}
			
			// Zurücksetzen
			arrivalField.value = originalValue;
			
		}, 500);
		
	} else {
		console.log("❌ Arrival Time Feld nicht gefunden");
	}

	// Test 4: Position Field Test
	console.log("\n📋 POSITION FIELD TEST");
	console.log("======================");
	
	const positionField = document.getElementById(`position-${testTileId}`);
	if (positionField) {
		console.log(`✅ Position Field gefunden: ${positionField.id}`);
		console.log(`Aktueller Wert: "${positionField.value}"`);
		
		const originalValue = positionField.value;
		const testValue = "TEST-POS";
		
		positionField.value = testValue;
		positionField.dispatchEvent(new Event('input', { bubbles: true }));
		positionField.dispatchEvent(new Event('change', { bubbles: true }));
		
		setTimeout(() => {
			if (window.storageBrowser?.collectSingleTileData) {
				const singleData = window.storageBrowser.collectSingleTileData(testTileId);
				console.log(`Position nach Event - collectSingleTileData: "${singleData.positionInfoGrid}"`);
			}
			
			positionField.value = originalValue;
		}, 500);
		
	} else {
		console.log("❌ Position Field nicht gefunden");
	}
	
	return "Test abgeschlossen - siehe Console für Details";
};

console.log("🔧 Sync Field Tester geladen!");
console.log("📞 Führe window.testSyncFields() aus um zu testen");

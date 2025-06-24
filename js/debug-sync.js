/**
 * Debug-Funktionen für die Feld-Synchronisation
 * Hilft bei der Diagnose von Synchronisationsproblemen
 */

/**
 * Zeigt alle relevanten DOM-Elemente für ein Tile an
 */
function debugTileElements(tileId) {
	console.log(`🔍 Debug Tile ${tileId} Elemente:`);
	console.log("=" * 40);

	const elements = [
		{ id: `aircraft-${tileId}`, name: "Aircraft ID", property: "value" },
		{
			id: `hangar-position-${tileId}`,
			name: "Position Header",
			property: "value",
		},
		{ id: `position-${tileId}`, name: "Position Info Grid", property: "value" },
		{ id: `arrival-time-${tileId}`, name: "Arrival Time", property: "value" },
		{
			id: `departure-time-${tileId}`,
			name: "Departure Time",
			property: "value",
		},
		{ id: `tow-status-${tileId}`, name: "Tow Status", property: "value" },
		{ id: `status-${tileId}`, name: "Status", property: "value" },
		{ id: `notes-${tileId}`, name: "Notes", property: "value" },
		{ id: `manual-input-${tileId}`, name: "Manual Input", property: "value" },
	];

	elements.forEach(({ id, name, property }) => {
		const element = document.getElementById(id);
		if (element) {
			const value = element[property];
			const type = element.tagName.toLowerCase();
			console.log(`✅ ${name}: ${type}#${id} = "${value}"`);
		} else {
			console.log(`❌ ${name}: Element #${id} nicht gefunden!`);
		}
	});

	console.log("");
}

/**
 * Zeigt alle Tiles und deren Elemente an
 */
function debugAllTiles() {
	console.log("🔍 Debug aller Tiles:");
	console.log("=" * 50);

	// Primary Tiles (1-12)
	console.log("📋 Primary Tiles (1-12):");
	for (let i = 1; i <= 12; i++) {
		const aircraftElement = document.getElementById(`aircraft-${i}`);
		if (aircraftElement) {
			debugTileElements(i);
		}
	}

	// Secondary Tiles (101+)
	console.log("📋 Secondary Tiles (101+):");
	for (let i = 101; i <= 120; i++) {
		const aircraftElement = document.getElementById(`aircraft-${i}`);
		if (aircraftElement) {
			debugTileElements(i);
		}
	}
}

/**
 * Setzt Test-Werte in die Felder ein
 */
function setTestValues(tileId) {
	console.log(`📝 Setze Test-Werte für Tile ${tileId}:`);

	const testValues = {
		[`aircraft-${tileId}`]: "D-TEST",
		[`hangar-position-${tileId}`]: "H1",
		[`position-${tileId}`]: "Gate A1",
		[`arrival-time-${tileId}`]: "14:30",
		[`departure-time-${tileId}`]: "16:45",
		[`tow-status-${tileId}`]: "ongoing",
		[`status-${tileId}`]: "ready",
		[`notes-${tileId}`]: "Test-Notiz",
	};

	Object.entries(testValues).forEach(([id, value]) => {
		const element = document.getElementById(id);
		if (element) {
			element.value = value;
			console.log(`✅ ${id} = "${value}"`);
		} else {
			console.log(`❌ Element ${id} nicht gefunden!`);
		}
	});
}

/**
 * Sammelt und zeigt die aktuellen Daten für ein Tile
 */
function debugTileData(tileId) {
	console.log(`📊 Aktuelle Daten für Tile ${tileId}:`);

	if (window.storageBrowser) {
		const tileData = window.storageBrowser.collectSingleTileData(tileId);
		console.log(tileData);
	} else {
		console.log("❌ StorageBrowser nicht verfügbar!");
	}
}

/**
 * Testet die ID-Muster
 */
function debugIdPatterns() {
	console.log("🔍 Überprüfe ID-Muster:");
	console.log("=" * 30);

	const patterns = [
		"aircraft-",
		"hangar-position-",
		"position-",
		"arrival-time-",
		"departure-time-",
		"tow-status-",
		"status-",
		"notes-",
	];

	patterns.forEach((pattern) => {
		const elements = document.querySelectorAll(`[id^="${pattern}"]`);
		console.log(`${pattern}*: ${elements.length} Elemente gefunden`);
		elements.forEach((el) => {
			console.log(`  - ${el.id} (${el.tagName.toLowerCase()})`);
		});
	});
}

/**
 * Vergleicht erwartete mit tatsächlichen Elementen
 */
function debugExpectedElements() {
	console.log("🔍 Vergleiche erwartete mit tatsächlichen Elementen:");
	console.log("=" * 50);

	// Erwartete Primary Tiles
	const expectedPrimary = 12;
	const actualPrimary = document.querySelectorAll(
		'[id^="aircraft-"]:not([id*="10"])'
	).length;

	console.log(
		`Primary Tiles: Erwartet ${expectedPrimary}, Gefunden ${actualPrimary}`
	);

	// Erwartete Secondary Tiles
	const actualSecondary = document.querySelectorAll(
		'[id^="aircraft-"][id*="10"]'
	).length;
	console.log(`Secondary Tiles: Gefunden ${actualSecondary}`);

	// Details für jedes erwartete Primary Tile
	for (let i = 1; i <= expectedPrimary; i++) {
		const exists = !!document.getElementById(`aircraft-${i}`);
		console.log(`Tile ${i}: ${exists ? "✅" : "❌"}`);
	}
}

// Debug-Funktionen global verfügbar machen
window.debugSync = {
	debugTileElements,
	debugAllTiles,
	setTestValues,
	debugTileData,
	debugIdPatterns,
	debugExpectedElements,
};

console.log("🔧 Debug-Funktionen geladen! Verwende window.debugSync.*");

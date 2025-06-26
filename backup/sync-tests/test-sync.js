/**
 * Test-Funktionen für die Synchronisation der Felder
 *
 * Dieses Skript testet die Synchronisation von:
 * - Arrival Time (arrival-time-X)
 * - Departure Time (departure-time-X)
 * - Position Info Grid (position-X)
 * - Position Header (hangar-position-X)
 * - Tow Status (tow-status-X)
 */

// Test-Daten für verschiedene Tiles
const testData = {
	primaryTiles: [
		{
			tileId: 1,
			aircraftId: "D-ABCD",
			position: "H1",
			positionInfoGrid: "Gate A1",
			arrivalTime: "14:30",
			departureTime: "16:45",
			towStatus: "ongoing",
			status: "ready",
			notes: "Test Flugzeug 1",
		},
		{
			tileId: 2,
			aircraftId: "D-EFGH",
			position: "H2",
			positionInfoGrid: "Gate B2",
			arrivalTime: "15:15",
			departureTime: "17:20",
			towStatus: "initiated",
			status: "maintenance",
			notes: "Test Flugzeug 2",
		},
	],
	secondaryTiles: [],
};

/**
 * Testet die Synchronisation aller relevanten Felder
 */
function testFieldSynchronization() {
	console.log("🧪 Starte Feld-Synchronisations-Test...");

	// Storage Browser Instanz abrufen
	const storageBrowser = window.storageBrowser;
	if (!storageBrowser) {
		console.error("❌ StorageBrowser nicht verfügbar!");
		return false;
	}

	// Test-Daten anwenden
	console.log("📝 Wende Test-Daten an...");
	storageBrowser.applyTilesData(testData);

	// Nach kurzer Verzögerung testen
	setTimeout(() => {
		testFieldValues();
	}, 1000);
}

/**
 * Überprüft die Werte aller Felder
 */
function testFieldValues() {
	console.log("🔍 Überprüfe Feld-Werte...");

	const testResults = [];

	// Teste Tile 1
	testResults.push(testTile(1, testData.primaryTiles[0]));

	// Teste Tile 2
	testResults.push(testTile(2, testData.primaryTiles[1]));

	// Ergebnisse ausgeben
	const passedTests = testResults.filter((r) => r.passed).length;
	const totalTests = testResults.length;

	console.log(
		`\n📊 Test-Ergebnisse: ${passedTests}/${totalTests} Tests bestanden`
	);

	if (passedTests === totalTests) {
		console.log("✅ Alle Tests erfolgreich!");
	} else {
		console.log("❌ Einige Tests fehlgeschlagen!");
		testResults
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`❌ ${r.name}: ${r.error}`);
			});
	}

	return passedTests === totalTests;
}

/**
 * Testet ein einzelnes Tile
 */
function testTile(tileId, expectedData) {
	const results = [];

	// Aircraft ID testen
	results.push(
		testField(
			`aircraft-${tileId}`,
			expectedData.aircraftId,
			"value",
			`Aircraft ID für Tile ${tileId}`
		)
	);

	// Position Header testen
	results.push(
		testField(
			`hangar-position-${tileId}`,
			expectedData.position,
			"value",
			`Position Header für Tile ${tileId}`
		)
	);

	// Position Info Grid testen
	results.push(
		testField(
			`position-${tileId}`,
			expectedData.positionInfoGrid,
			"value",
			`Position Info Grid für Tile ${tileId}`
		)
	);

	// Arrival Time testen
	results.push(
		testField(
			`arrival-time-${tileId}`,
			expectedData.arrivalTime,
			"value",
			`Arrival Time für Tile ${tileId}`
		)
	);

	// Departure Time testen
	results.push(
		testField(
			`departure-time-${tileId}`,
			expectedData.departureTime,
			"value",
			`Departure Time für Tile ${tileId}`
		)
	);

	// Tow Status testen
	results.push(
		testField(
			`tow-status-${tileId}`,
			expectedData.towStatus,
			"value",
			`Tow Status für Tile ${tileId}`
		)
	);

	// Status testen
	results.push(
		testField(
			`status-${tileId}`,
			expectedData.status,
			"value",
			`Status für Tile ${tileId}`
		)
	);

	// Notes testen
	results.push(
		testField(
			`notes-${tileId}`,
			expectedData.notes,
			"value",
			`Notes für Tile ${tileId}`
		)
	);

	const passed = results.every((r) => r.passed);
	const failedTests = results.filter((r) => !r.passed);

	return {
		name: `Tile ${tileId}`,
		passed: passed,
		error:
			failedTests.length > 0
				? `${failedTests.length} Felder fehlgeschlagen: ${failedTests
						.map((f) => f.name)
						.join(", ")}`
				: null,
		details: results,
	};
}

/**
 * Testet ein einzelnes Feld
 */
function testField(elementId, expectedValue, property, testName) {
	const element = document.getElementById(elementId);

	if (!element) {
		return {
			name: testName,
			passed: false,
			error: `Element mit ID '${elementId}' nicht gefunden`,
		};
	}

	const actualValue = element[property];
	const passed = actualValue === expectedValue;

	if (passed) {
		console.log(`✅ ${testName}: '${actualValue}' ✓`);
	} else {
		console.log(
			`❌ ${testName}: Erwartet '${expectedValue}', aber ist '${actualValue}'`
		);
	}

	return {
		name: testName,
		passed: passed,
		error: passed
			? null
			: `Erwartet '${expectedValue}', aber ist '${actualValue}'`,
	};
}

/**
 * Testet die Datensammlung
 */
function testDataCollection() {
	console.log("\n🔄 Teste Datensammlung...");

	const storageBrowser = window.storageBrowser;
	if (!storageBrowser) {
		console.error("❌ StorageBrowser nicht verfügbar!");
		return false;
	}

	// Aktuelle Daten sammeln
	const collectedData = storageBrowser.collectCurrentProjectData();

	if (!collectedData) {
		console.error("❌ Keine Daten gesammelt!");
		return false;
	}

	console.log("📋 Gesammelte Daten:", collectedData);

	// Teste spezifische Felder
	const tile1 = collectedData.primaryTiles?.find((t) => t.tileId === 1);
	if (tile1) {
		console.log("🔍 Tile 1 Daten:", tile1);

		const tests = [
			{ name: "arrivalTime", expected: "14:30", actual: tile1.arrivalTime },
			{ name: "departureTime", expected: "16:45", actual: tile1.departureTime },
			{
				name: "positionInfoGrid",
				expected: "Gate A1",
				actual: tile1.positionInfoGrid,
			},
			{ name: "position", expected: "H1", actual: tile1.position },
			{ name: "towStatus", expected: "ongoing", actual: tile1.towStatus },
		];

		tests.forEach((test) => {
			if (test.actual === test.expected) {
				console.log(`✅ ${test.name}: '${test.actual}' ✓`);
			} else {
				console.log(
					`❌ ${test.name}: Erwartet '${test.expected}', aber ist '${test.actual}'`
				);
			}
		});
	}

	return true;
}

/**
 * Führt alle Tests aus
 */
function runAllTests() {
	console.log("🚀 Starte vollständigen Synchronisations-Test...");
	console.log("=" * 50);

	// Test 1: Feld-Synchronisation
	testFieldSynchronization();

	// Test 2: Datensammlung (nach Verzögerung)
	setTimeout(() => {
		testDataCollection();
	}, 2000);
}

// Tests verfügbar machen
window.testSync = {
	runAllTests,
	testFieldSynchronization,
	testDataCollection,
	testFieldValues,
};

console.log(
	"🧪 Sync-Tests geladen! Verwende window.testSync.runAllTests() zum Starten."
);

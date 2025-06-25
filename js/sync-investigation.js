/**
 * DETAILLIERTE SYNCHRONISATIONS-INVESTIGATION
 * ==========================================
 *
 * Investigation der Synchronisationsprobleme bei Arrival Time, Departure Time und Position
 */

/**
 * Führt eine detaillierte Investigation durch
 */
function runDetailedInvestigation() {
	console.log("🔍 DETAILLIERTE SYNCHRONISATIONS-INVESTIGATION");
	console.log("=" * 60);

	// Test 1: DOM-Elemente überprüfen
	investigateDOM();

	// Test 2: localStorage-Konflikt überprüfen
	investigateLocalStorageConflict();

	// Test 3: Event-Timing überprüfen
	investigateEventTiming();

	// Test 4: Funktions-Verfügbarkeit überprüfen
	investigateFunctionAvailability();

	// Test 5: Server-Sync vs localStorage Conflict
	investigateConflictResolution();
}

/**
 * Überprüft DOM-Elemente
 */
function investigateDOM() {
	console.log("\n📋 DOM-ELEMENTE INVESTIGATION");
	console.log("-" * 40);

	const testTileId = 1;
	const elements = [
		{ id: `aircraft-${testTileId}`, name: "Aircraft ID" },
		{ id: `hangar-position-${testTileId}`, name: "Position Header" },
		{ id: `position-${testTileId}`, name: "Position Info Grid" },
		{ id: `arrival-time-${testTileId}`, name: "Arrival Time" },
		{ id: `departure-time-${testTileId}`, name: "Departure Time" },
		{ id: `tow-status-${testTileId}`, name: "Tow Status" },
		{ id: `status-${testTileId}`, name: "Status" },
		{ id: `notes-${testTileId}`, name: "Notes" },
	];

	elements.forEach(({ id, name }) => {
		const element = document.getElementById(id);
		if (element) {
			console.log(
				`✅ ${name}: ${element.tagName}#${id} - Typ: ${
					element.type || "n/a"
				} - Wert: "${element.value || element.textContent || ""}"`
			);
		} else {
			console.log(`❌ ${name}: Element #${id} NICHT GEFUNDEN!`);
		}
	});
}

/**
 * Überprüft localStorage-Konflikt
 */
function investigateLocalStorageConflict() {
	console.log("\n💾 LOCALSTORAGE-KONFLIKT INVESTIGATION");
	console.log("-" * 40);

	// Prüfe aktuelle localStorage-Daten
	try {
		const currentState = localStorage.getItem("hangarPlannerCurrentState");
		const hangarSettings = localStorage.getItem("hangarPlannerSettings");

		console.log("📦 Aktuelle localStorage-Daten:");

		if (currentState) {
			const parsed = JSON.parse(currentState);
			console.log("   - hangarPlannerCurrentState:", parsed);

			if (parsed.tilesData && parsed.tilesData.length > 0) {
				const tile1 = parsed.tilesData.find(
					(t) => t.id === 1 || t.tileId === 1
				);
				if (tile1) {
					console.log("   - Tile 1 in localStorage:", tile1);
				}
			}
		} else {
			console.log("   - hangarPlannerCurrentState: NICHT VORHANDEN");
		}

		if (hangarSettings) {
			const parsed = JSON.parse(hangarSettings);
			console.log("   - hangarPlannerSettings:", parsed);
		} else {
			console.log("   - hangarPlannerSettings: NICHT VORHANDEN");
		}

		// Prüfe Flag
		console.log(
			`🏁 isApplyingServerData Flag: ${
				window.isApplyingServerData || "undefined"
			}`
		);
	} catch (error) {
		console.error("❌ Fehler beim Lesen von localStorage:", error);
	}
}

/**
 * Überprüft Event-Timing
 */
function investigateEventTiming() {
	console.log("\n⏰ EVENT-TIMING INVESTIGATION");
	console.log("-" * 40);

	// Überwache DOMContentLoaded Events
	let domContentLoadedCount = 0;

	// Neuen Listener hinzufügen, um zu zählen
	document.addEventListener("DOMContentLoaded", function () {
		domContentLoadedCount++;
		console.log(`🔔 DOMContentLoaded Event #${domContentLoadedCount} gefeuert`);
	});

	console.log("📊 Event-Listener Status:");
	console.log(
		`   - DOMContentLoaded bereits gefeuert: ${
			document.readyState !== "loading"
		}`
	);
	console.log(`   - Document readyState: ${document.readyState}`);

	// Prüfe, welche Funktionen beim DOMContentLoaded registriert sind
	console.log("🎯 Registrierte DOMContentLoaded Funktionen (approximiert):");

	const scriptTags = document.querySelectorAll('script[src*=".js"]');
	scriptTags.forEach((script) => {
		console.log(`   - Geladen: ${script.src.split("/").pop()}`);
	});
}

/**
 * Überprüft Funktions-Verfügbarkeit
 */
function investigateFunctionAvailability() {
	console.log("\n🔧 FUNKTIONS-VERFÜGBARKEIT INVESTIGATION");
	console.log("-" * 40);

	const functions = [
		{ path: "window.storageBrowser", name: "StorageBrowser" },
		{
			path: "window.storageBrowser.applyProjectData",
			name: "applyProjectData",
		},
		{ path: "window.storageBrowser.applyTilesData", name: "applyTilesData" },
		{
			path: "window.storageBrowser.applySingleTileData",
			name: "applySingleTileData",
		},
		{ path: "window.hangarData", name: "HangarData" },
		{
			path: "window.hangarData.applyLoadedHangarPlan",
			name: "applyLoadedHangarPlan",
		},
		{
			path: "window.saveFlightTimesToLocalStorage",
			name: "saveFlightTimesToLocalStorage",
		},
		{ path: "updateTowStatusStyles", name: "updateTowStatusStyles" },
	];

	functions.forEach(({ path, name }) => {
		try {
			const func = eval(path);
			if (typeof func === "function") {
				console.log(`✅ ${name}: Verfügbar (${typeof func})`);
			} else if (func !== undefined) {
				console.log(
					`⚠️ ${name}: Verfügbar aber nicht Funktion (${typeof func})`
				);
			} else {
				console.log(`❌ ${name}: NICHT VERFÜGBAR`);
			}
		} catch (error) {
			console.log(`❌ ${name}: FEHLER - ${error.message}`);
		}
	});
}

/**
 * Überprüft Konflikt-Resolution
 */
function investigateConflictResolution() {
	console.log("\n⚔️ KONFLIKT-RESOLUTION INVESTIGATION");
	console.log("-" * 40);

	console.log("🎯 Test-Sequenz: Server-Sync vs localStorage");

	// Test-Daten setzen
	const testData = {
		tileId: 1,
		arrivalTime: "TEST-ARR",
		departureTime: "TEST-DEP",
		positionInfoGrid: "TEST-POS",
		towStatus: "ongoing",
	};

	console.log("1️⃣ Setze Test-Daten (simuliert Server-Sync):");

	// Simuliere Server-Sync
	if (window.storageBrowser) {
		window.storageBrowser.applySingleTileData(testData);

		// Sofort nach dem Setzen überprüfen
		setTimeout(() => {
			console.log("2️⃣ Überprüfe Werte direkt nach Server-Sync:");
			checkTestValues();

			// Nach 2 Sekunden nochmal überprüfen (nach localStorage-Load)
			setTimeout(() => {
				console.log(
					"3️⃣ Überprüfe Werte nach 2 Sekunden (localStorage-Konflikt?):"
				);
				checkTestValues();
			}, 2000);
		}, 100);
	} else {
		console.log("❌ StorageBrowser nicht verfügbar!");
	}
}

/**
 * Überprüft Test-Werte
 */
function checkTestValues() {
	const testTileId = 1;
	const fields = [
		{
			id: `arrival-time-${testTileId}`,
			expected: "TEST-ARR",
			name: "Arrival Time",
		},
		{
			id: `departure-time-${testTileId}`,
			expected: "TEST-DEP",
			name: "Departure Time",
		},
		{
			id: `position-${testTileId}`,
			expected: "TEST-POS",
			name: "Position Info Grid",
		},
		{ id: `tow-status-${testTileId}`, expected: "ongoing", name: "Tow Status" },
	];

	fields.forEach(({ id, expected, name }) => {
		const element = document.getElementById(id);
		if (element) {
			const actual = element.value;
			if (actual === expected) {
				console.log(`   ✅ ${name}: "${actual}" ✓`);
			} else {
				console.log(
					`   ❌ ${name}: Erwartet "${expected}", aber ist "${actual}"`
				);
			}
		} else {
			console.log(`   ❌ ${name}: Element #${id} nicht gefunden!`);
		}
	});
}

/**
 * Überwacht localStorage-Änderungen
 */
function monitorLocalStorage() {
	console.log("\n👁️ LOCALSTORAGE-MONITOR GESTARTET");
	console.log("-" * 40);

	// Original localStorage.setItem überschreiben
	const originalSetItem = localStorage.setItem;
	localStorage.setItem = function (key, value) {
		if (key.includes("hangar")) {
			console.log(`📝 localStorage.setItem('${key}', ...)`);
			if (key === "hangarPlannerCurrentState") {
				try {
					const parsed = JSON.parse(value);
					console.log("   💾 Neue State-Daten:", parsed);
				} catch (e) {
					console.log("   💾 Wert:", value.substring(0, 100) + "...");
				}
			}
		}
		return originalSetItem.call(this, key, value);
	};

	console.log("✅ localStorage-Monitor aktiviert");
}

// Investigation-Funktionen global verfügbar machen
window.syncInvestigation = {
	runDetailedInvestigation,
	investigateDOM,
	investigateLocalStorageConflict,
	investigateEventTiming,
	investigateFunctionAvailability,
	investigateConflictResolution,
	checkTestValues,
	monitorLocalStorage,
};

console.log(
	"🔍 Sync-Investigation geladen! Verwende window.syncInvestigation.runDetailedInvestigation()"
);

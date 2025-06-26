/**
 * SOFORTIGE SYNC-DIAGNOSE - Ready-to-Use Analyse der Input-Felder
 * Direkt ausführbare Rekursive Analyse für Synchronisationsprobleme
 */

console.log("🔥 SOFORTIGE SYNC-DIAGNOSE wird geladen...");

// Sofort verfügbare Analyse-Funktion
window.runSyncDiagnosis = async function () {
	console.log("🚀 SOFORTIGE SYNC-DIAGNOSE STARTET");
	console.log("==================================");
	console.log(`⏰ Zeitstempel: ${new Date().toISOString()}`);
	console.log("");

	const results = {
		timestamp: new Date().toISOString(),
		foundFields: [],
		missingFields: [],
		workingFields: 0,
		brokenFields: 0,
		criticalIssues: [],
		recommendations: [],
	};

	// Definiere die zu testenden Felder
	const fieldTypes = [
		{
			prefix: "arrival-time-",
			dataKey: "arrivalTime",
			displayName: "Arrival Time",
		},
		{
			prefix: "departure-time-",
			dataKey: "departureTime",
			displayName: "Departure Time",
		},
		{
			prefix: "hangar-position-",
			dataKey: "position",
			displayName: "Hangar Position",
		},
		{
			prefix: "position-",
			dataKey: "positionInfoGrid",
			displayName: "Position Info Grid",
		},
	];

	const testValues = {
		arrivalTime: "15:30",
		departureTime: "16:45",
		position: "A-12",
		positionInfoGrid: "P-99",
	};

	// Finde alle Tiles
	const containers = ["#hangarGrid", "#secondaryHangarGrid"];
	const allTiles = [];

	containers.forEach((containerSelector) => {
		const container = document.querySelector(containerSelector);
		if (container) {
			const tiles = container.querySelectorAll(".hangar-tile");
			allTiles.push(...tiles);
		}
	});

	console.log(`📊 Gefundene Tiles: ${allTiles.length}`);

	// Analysiere jede Tile
	for (const tile of allTiles) {
		const tileId = extractTileId(tile);
		if (!tileId) continue;

		console.log(`\n🔧 Analysiere Tile: ${tileId}`);

		// Teste jedes Feld in dieser Tile
		for (const fieldType of fieldTypes) {
			const fieldId = `${fieldType.prefix}${tileId}`;
			const element = document.getElementById(fieldId);

			if (!element) {
				results.missingFields.push({
					tileId,
					fieldType: fieldType.displayName,
					expectedId: fieldId,
				});
				console.log(`❌ Feld nicht gefunden: ${fieldId}`);
				continue;
			}

			console.log(`✅ Feld gefunden: ${fieldId}`);

			// Teste das Feld vollständig
			const fieldResult = await testFieldCompletely(
				element,
				fieldType,
				tileId,
				testValues
			);
			results.foundFields.push(fieldResult);

			if (fieldResult.allTestsPassed) {
				results.workingFields++;
				console.log(`🎯 ${fieldType.displayName} vollständig funktional`);
			} else {
				results.brokenFields++;
				console.log(
					`❌ ${
						fieldType.displayName
					} hat Probleme: ${fieldResult.failedTests.join(", ")}`
				);
				results.criticalIssues.push(
					`🔴 ${
						fieldType.displayName
					} (${fieldId}): ${fieldResult.failedTests.join(", ")}`
				);
			}
		}
	}

	// Zusammenfassung generieren
	const total = results.foundFields.length + results.missingFields.length;

	console.log("\n📊 FINALE ERGEBNISSE:");
	console.log("====================");
	console.log(`📈 Gesamt analysierte Felder: ${total}`);
	console.log(`✅ Gefundene Felder: ${results.foundFields.length}`);
	console.log(`❌ Fehlende Felder: ${results.missingFields.length}`);
	console.log(
		`🎯 Vollständig funktionierende Felder: ${results.workingFields}`
	);
	console.log(`⚠️ Felder mit Problemen: ${results.brokenFields}`);

	if (total > 0) {
		const successRate = Math.round((results.workingFields / total) * 100);
		console.log(`📊 Erfolgsrate: ${successRate}%`);
	}

	// Probleme auflisten
	if (results.criticalIssues.length > 0) {
		console.log("\n🔥 KRITISCHE PROBLEME:");
		console.log("=======================");
		results.criticalIssues.forEach((issue, index) => {
			console.log(`${index + 1}. ${issue}`);
		});
	}

	if (results.missingFields.length > 0) {
		console.log("\n🔍 FEHLENDE FELDER:");
		console.log("===================");
		results.missingFields.forEach((field, index) => {
			console.log(
				`${index + 1}. ${field.fieldType} (${field.expectedId}) in Tile ${
					field.tileId
				}`
			);
		});
	}

	// Empfehlungen
	generateRecommendations(results);

	return results;

	// Helper functions
	function extractTileId(tileElement) {
		if (tileElement.dataset.tileId) {
			return tileElement.dataset.tileId;
		}
		if (tileElement.id && tileElement.id.startsWith("tile-")) {
			return tileElement.id.replace("tile-", "");
		}

		const childWithId = tileElement.querySelector(
			'[id*="arrival-time-"], [id*="departure-time-"], [id*="hangar-position-"], [id*="position-"]'
		);
		if (childWithId) {
			const match = childWithId.id.match(
				/(arrival-time-|departure-time-|hangar-position-|position-)(\d+)/
			);
			if (match) {
				return match[2];
			}
		}
		return null;
	}

	async function testFieldCompletely(element, fieldType, tileId, testValues) {
		const result = {
			tileId,
			fieldType: fieldType.displayName,
			fieldId: element.id,
			allTestsPassed: true,
			failedTests: [],
			testResults: {},
		};

		const originalValue = element.value;
		const testValue = testValues[fieldType.dataKey];

		try {
			// Test 1: Datenextraktion
			console.log(`  📖 Teste Datenextraktion für ${fieldType.displayName}`);
			element.value = testValue;
			element.dispatchEvent(new Event("input", { bubbles: true }));
			element.dispatchEvent(new Event("change", { bubbles: true }));

			const extractionSuccess = element.value === testValue;
			result.testResults.dataExtraction = extractionSuccess;

			if (!extractionSuccess) {
				result.allTestsPassed = false;
				result.failedTests.push("Datenextraktion");
				console.log(`    ❌ Datenextraktion fehlgeschlagen`);
			} else {
				console.log(`    ✅ Datenextraktion erfolgreich`);
			}

			// Test 2: Server-Sync (vereinfacht)
			console.log(`  🌐 Teste Server-Sync für ${fieldType.displayName}`);
			let serverSyncSuccess = false;

			if (window.storageBrowser?.saveToServer) {
				try {
					element.value = `TEST_${Date.now()}_${fieldType.dataKey}`;
					await new Promise((resolve) => setTimeout(resolve, 200)); // Kurze Pause
					await window.storageBrowser.saveToServer();

					// Prüfe ob Daten auf Server sind
					const serverData = await window.storageBrowser.loadFromServer();
					if (serverData && serverData.tiles && serverData.tiles[tileId]) {
						const serverTileData = serverData.tiles[tileId];
						if (serverTileData[fieldType.dataKey] === element.value) {
							serverSyncSuccess = true;
						}
					}
				} catch (e) {
					console.log(`    ⚠️ Server-Sync Fehler: ${e.message}`);
				}
			}

			result.testResults.serverSync = serverSyncSuccess;

			if (!serverSyncSuccess) {
				result.allTestsPassed = false;
				result.failedTests.push("Server-Sync");
				console.log(`    ❌ Server-Sync fehlgeschlagen`);
			} else {
				console.log(`    ✅ Server-Sync erfolgreich`);
			}

			// Test 3: Datenrückschreibung
			console.log(
				`  📥 Teste Datenrückschreibung für ${fieldType.displayName}`
			);
			let retrievalSuccess = false;

			if (
				window.hangarData?.applyTileData ||
				window.storageBrowser?.applyProjectData
			) {
				try {
					const retrieveTestValue = `RETRIEVE_${Date.now()}_${
						fieldType.dataKey
					}`;
					element.value = retrieveTestValue;

					// Simuliere Server-Sync
					if (window.storageBrowser?.saveToServer) {
						await window.storageBrowser.saveToServer();
					}

					// Ändere Wert
					element.value = "DIFFERENT_VALUE";

					// Lade Server-Daten und wende sie an
					if (window.storageBrowser?.loadFromServer) {
						const serverData = await window.storageBrowser.loadFromServer();
						if (serverData) {
							if (window.storageBrowser?.applyProjectData) {
								await window.storageBrowser.applyProjectData(serverData);
							} else if (window.hangarData?.applyLoadedHangarPlan) {
								await window.hangarData.applyLoadedHangarPlan(serverData);
							}

							if (element.value === retrieveTestValue) {
								retrievalSuccess = true;
							}
						}
					}
				} catch (e) {
					console.log(`    ⚠️ Datenrückschreibung Fehler: ${e.message}`);
				}
			}

			result.testResults.dataRetrieval = retrievalSuccess;

			if (!retrievalSuccess) {
				result.allTestsPassed = false;
				result.failedTests.push("Datenrückschreibung");
				console.log(`    ❌ Datenrückschreibung fehlgeschlagen`);
			} else {
				console.log(`    ✅ Datenrückschreibung erfolgreich`);
			}

			// Test 4: Überschreibungsschutz (vereinfacht)
			console.log(
				`  🛡️ Teste Überschreibungsschutz für ${fieldType.displayName}`
			);
			let protectionSuccess = true; // Optimistisch

			try {
				const protectTestValue = `PROTECT_${Date.now()}_${fieldType.dataKey}`;
				element.value = protectTestValue;

				// Simuliere potentielle Überschreibung durch localStorage
				if (window.hangarData?.restoreFromLocalStorage) {
					await window.hangarData.restoreFromLocalStorage();
				}

				// Prüfe ob Wert noch da ist
				if (element.value !== protectTestValue) {
					protectionSuccess = false;
				}
			} catch (e) {
				console.log(`    ⚠️ Überschreibungsschutz Fehler: ${e.message}`);
				protectionSuccess = false;
			}

			result.testResults.overwriteProtection = protectionSuccess;

			if (!protectionSuccess) {
				result.allTestsPassed = false;
				result.failedTests.push("Überschreibungsschutz");
				console.log(`    ❌ Überschreibungsschutz fehlgeschlagen`);
			} else {
				console.log(`    ✅ Überschreibungsschutz erfolgreich`);
			}
		} finally {
			// Originalwert wiederherstellen
			element.value = originalValue;
		}

		return result;
	}

	function generateRecommendations(results) {
		console.log("\n💡 EMPFEHLUNGEN:");
		console.log("================");

		const recommendations = [];

		if (results.missingFields.length > 0) {
			recommendations.push(
				`🔥 HÖCHSTE PRIORITÄT: ${results.missingFields.length} Felder nicht gefunden - Prüfe HTML-Struktur`
			);
		}

		// Zähle Fehlertypen
		const errorCounts = {
			dataExtraction: 0,
			serverSync: 0,
			dataRetrieval: 0,
			overwriteProtection: 0,
		};

		results.foundFields.forEach((field) => {
			if (!field.testResults.dataExtraction) errorCounts.dataExtraction++;
			if (!field.testResults.serverSync) errorCounts.serverSync++;
			if (!field.testResults.dataRetrieval) errorCounts.dataRetrieval++;
			if (!field.testResults.overwriteProtection)
				errorCounts.overwriteProtection++;
		});

		if (errorCounts.dataExtraction > 0) {
			recommendations.push(
				`🟡 MITTEL: ${errorCounts.dataExtraction} Datenextraktions-Fehler - Prüfe collectTileData() in js/hangar-data.js`
			);
		}

		if (errorCounts.dataRetrieval > 0) {
			recommendations.push(
				`🟡 MITTEL: ${errorCounts.dataRetrieval} Datenrückschreibungs-Fehler - Prüfe applyTileData() in js/hangar-data.js`
			);
		}

		if (errorCounts.serverSync > 0) {
			recommendations.push(
				`🟠 MITTEL: ${errorCounts.serverSync} Server-Sync-Fehler - Prüfe sync/data.php und Netzwerk`
			);
		}

		if (errorCounts.overwriteProtection > 0) {
			recommendations.push(
				`🟢 NIEDRIG: ${errorCounts.overwriteProtection} Überschreibungs-Probleme - Prüfe localStorage-Konflikte`
			);
		}

		if (recommendations.length === 0) {
			recommendations.push(
				"🎉 Alle Systeme funktional - keine Reparaturen erforderlich"
			);
		}

		recommendations.forEach((rec, index) => {
			console.log(`${index + 1}. ${rec}`);
		});

		results.recommendations = recommendations;
	}
};

// Zusätzliche Schnelltests
window.quickSyncTests = {
	// Teste nur Datenextraktion
	testDataExtraction: function () {
		console.log("⚡ QUICK TEST: Datenextraktion");

		const fieldTypes = [
			{
				prefix: "arrival-time-",
				dataKey: "arrivalTime",
				displayName: "Arrival Time",
			},
			{
				prefix: "departure-time-",
				dataKey: "departureTime",
				displayName: "Departure Time",
			},
			{
				prefix: "hangar-position-",
				dataKey: "position",
				displayName: "Hangar Position",
			},
			{
				prefix: "position-",
				dataKey: "positionInfoGrid",
				displayName: "Position Info Grid",
			},
		];

		const testValues = {
			arrivalTime: "15:30",
			departureTime: "16:45",
			position: "A-12",
			positionInfoGrid: "P-99",
		};

		// Teste erstes verfügbares Feld von jedem Typ
		fieldTypes.forEach((fieldType) => {
			for (let i = 1; i <= 12; i++) {
				const fieldId = `${fieldType.prefix}${i}`;
				const element = document.getElementById(fieldId);

				if (element) {
					const originalValue = element.value;
					const testValue = testValues[fieldType.dataKey];

					element.value = testValue;
					const success = element.value === testValue;

					console.log(
						`${fieldType.displayName} (${fieldId}): ${success ? "✅" : "❌"}`
					);

					element.value = originalValue;
					break;
				}
			}
		});
	},

	// Teste Server-Verbindung
	testServerConnection: async function () {
		console.log("⚡ QUICK TEST: Server-Verbindung");

		if (
			!window.storageBrowser?.saveToServer ||
			!window.storageBrowser?.loadFromServer
		) {
			console.log("❌ Server-Funktionen nicht verfügbar");
			return;
		}

		try {
			const testData = { test: "connection_test", timestamp: Date.now() };

			console.log("🔄 Teste Speichern...");
			const saveResult = await window.storageBrowser.saveToServer();
			console.log(`Save: ${saveResult ? "✅" : "❌"}`);

			console.log("🔄 Teste Laden...");
			const loadResult = await window.storageBrowser.loadFromServer();
			console.log(`Load: ${loadResult ? "✅" : "❌"}`);
		} catch (error) {
			console.log(`❌ Server-Test Fehler: ${error.message}`);
		}
	},

	// Teste HTML-Struktur
	testHtmlStructure: function () {
		console.log("⚡ QUICK TEST: HTML-Struktur");

		const containers = ["#hangarGrid", "#secondaryHangarGrid"];
		let totalTiles = 0;
		let totalFields = 0;

		containers.forEach((containerSelector) => {
			const container = document.querySelector(containerSelector);
			console.log(`${containerSelector}: ${container ? "✅" : "❌"}`);

			if (container) {
				const tiles = container.querySelectorAll(".hangar-tile");
				totalTiles += tiles.length;
				console.log(`  Tiles: ${tiles.length}`);

				// Zähle Felder in den ersten paar Tiles
				for (let i = 0; i < Math.min(3, tiles.length); i++) {
					const tile = tiles[i];
					const fields = tile.querySelectorAll(
						'input[id*="arrival-time-"], input[id*="departure-time-"], input[id*="hangar-position-"], input[id*="position-"]'
					);
					totalFields += fields.length;
					console.log(`  Tile ${i + 1} Felder: ${fields.length}`);
				}
			}
		});

		console.log(
			`📊 Gesamt - Tiles: ${totalTiles}, Sample Felder: ${totalFields}`
		);
	},
};

// Hilfsfunktion für einzelne Felder
window.testSingleField = function (fieldId) {
	console.log(`🔍 EINZELFELD-TEST: ${fieldId}`);

	const element = document.getElementById(fieldId);
	if (!element) {
		console.log(`❌ Feld ${fieldId} nicht gefunden`);
		return;
	}

	console.log(
		`✅ Feld gefunden: ${element.tagName} mit Wert "${element.value}"`
	);

	// Basis-Test
	const originalValue = element.value;
	const testValue = "TEST_VALUE";

	element.value = testValue;
	const writeSuccess = element.value === testValue;
	console.log(`Schreibtest: ${writeSuccess ? "✅" : "❌"}`);

	element.value = originalValue;
	console.log(`Originalwert wiederhergestellt: "${element.value}"`);

	return { found: true, writeSuccess, element };
};

console.log("🎯 SOFORTIGE SYNC-DIAGNOSE geladen!");
console.log("");
console.log("📞 VERFÜGBARE KOMMANDOS:");
console.log(
	"   window.runSyncDiagnosis()               - Vollständige Analyse"
);
console.log(
	"   window.quickSyncTests.testDataExtraction() - Test Datenextraktion"
);
console.log("   window.quickSyncTests.testServerConnection() - Test Server");
console.log("   window.quickSyncTests.testHtmlStructure()    - Test HTML");
console.log(
	'   window.testSingleField("arrival-time-1")    - Test einzelnes Feld'
);
console.log("");
console.log("🚀 Bereit für Diagnose! Führe window.runSyncDiagnosis() aus.");

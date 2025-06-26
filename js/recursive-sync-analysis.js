/**
 * REKURSIVE SYNCHRONISATIONS-FEHLERANALYSE
 * Systematische Analyse aller Input-Felder nach bewährtem Aircraft-Verfahren:
 * - aircraft-{id} (bewährtes Referenzverfahren)
 * - arrival-time-{id}
 * - departure-time-{id}
 * - position-{id}
 */

window.recursiveSyncAnalysis = {
	// Konfiguration für die Analyse
	config: {
		targetFieldTypes: [
			{
				prefix: "aircraft-",
				dataKey: "aircraftId",
				displayName: "Aircraft ID",
			},
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
				prefix: "position-",
				dataKey: "positionInfoGrid",
				displayName: "Position Info Grid",
			},
		],
		testValues: {
			aircraftId: "D-TEST",
			arrivalTime: "15:30",
			departureTime: "16:45",
			positionInfoGrid: "P-99",
		},
		containers: ["#hangarGrid", "#secondaryHangarGrid"],
	},

	// SCHRITT 1: Rekursive Feldanalyse
	async analyzeFieldsRecursively() {
		console.log("🔍 SCHRITT 1: REKURSIVE FELDANALYSE STARTET");
		console.log("=====================================");

		const results = {
			foundFields: [],
			missingFields: [],
			dataExtractionResults: {},
			serverSyncResults: {},
			dataRetrievalResults: {},
			overwriteCheckResults: {},
		};

		// Alle relevanten Tiles finden
		const allTiles = this.findAllTiles();
		console.log(`📊 Gefundene Tiles: ${allTiles.length}`);

		for (const tile of allTiles) {
			const tileId = this.extractTileId(tile);
			if (!tileId) continue;

			console.log(`\n🔧 Analysiere Tile: ${tileId}`);

			// Für jeden Feldtyp analysieren
			for (const fieldType of this.config.targetFieldTypes) {
				const fieldResults = await this.analyzeFieldCompletely(
					tileId,
					fieldType
				);

				if (fieldResults.found) {
					results.foundFields.push(fieldResults);
				} else {
					results.missingFields.push({
						tileId,
						fieldType: fieldType.displayName,
						expectedId: `${fieldType.prefix}${tileId}`,
					});
				}

				// Sammle Ergebnisse
				if (!results.dataExtractionResults[tileId]) {
					results.dataExtractionResults[tileId] = {};
				}
				results.dataExtractionResults[tileId][fieldType.dataKey] =
					fieldResults.dataExtraction;
			}
		}

		console.log("\n📈 ZUSAMMENFASSUNG SCHRITT 1:");
		console.log(`✅ Gefundene Felder: ${results.foundFields.length}`);
		console.log(`❌ Fehlende Felder: ${results.missingFields.length}`);

		return results;
	},

	// Vollständige Feldanalyse für ein spezifisches Feld
	async analyzeFieldCompletely(tileId, fieldType) {
		const fieldId = `${fieldType.prefix}${tileId}`;
		const element = document.getElementById(fieldId);

		const results = {
			tileId,
			fieldType: fieldType.displayName,
			fieldId,
			found: !!element,
			dataExtraction: null,
			serverSync: null,
			dataRetrieval: null,
			overwriteCheck: null,
		};

		if (!element) {
			console.log(`❌ Feld nicht gefunden: ${fieldId}`);
			return results;
		}

		console.log(`✅ Feld gefunden: ${fieldId}`);

		// SCHRITT 2: Datenextraktions-Test
		results.dataExtraction = await this.testDataExtraction(
			element,
			fieldType,
			tileId
		);

		// SCHRITT 3: Server-Sync-Test
		results.serverSync = await this.testServerSync(element, fieldType, tileId);

		// SCHRITT 4: Datenrückschreibungs-Test
		results.dataRetrieval = await this.testDataRetrieval(
			element,
			fieldType,
			tileId
		);

		// SCHRITT 5: Überschreibungs-Test
		results.overwriteCheck = await this.testOverwriteProtection(
			element,
			fieldType,
			tileId
		);

		return results;
	},

	// SCHRITT 2: Testen ob Daten korrekt gelesen werden
	async testDataExtraction(element, fieldType, tileId) {
		console.log(
			`  📖 SCHRITT 2: Datenextraktion testen für ${fieldType.displayName}`
		);

		const testValue = this.config.testValues[fieldType.dataKey];
		const originalValue = element.value;

		try {
			// Testwert setzen
			element.value = testValue;
			element.dispatchEvent(new Event("input", { bubbles: true }));
			element.dispatchEvent(new Event("change", { bubbles: true }));

			// Verschiedene Extraktionsmethoden testen
			const extractionResults = {
				directValue: element.value,
				querySelector: document.querySelector(`#${element.id}`)?.value,
				collectTileData: null,
				collectSingleTileData: null,
			};

			// collectTileData testen (aus hangar-data.js)
			if (window.hangarData?.collectTileData) {
				try {
					const tileData = window.hangarData.collectTileData(tileId);
					extractionResults.collectTileData = tileData[fieldType.dataKey];
				} catch (e) {
					extractionResults.collectTileData = `ERROR: ${e.message}`;
				}
			}

			// collectSingleTileData testen (aus storage-browser.js)
			if (window.storageBrowser?.collectSingleTileData) {
				try {
					const tileElement = element.closest(".hangar-tile");
					if (tileElement) {
						const singleTileData =
							window.storageBrowser.collectSingleTileData(tileElement);
						extractionResults.collectSingleTileData =
							singleTileData[fieldType.dataKey];
					}
				} catch (e) {
					extractionResults.collectSingleTileData = `ERROR: ${e.message}`;
				}
			}

			// Originalwert wiederherstellen
			element.value = originalValue;

			const success = extractionResults.directValue === testValue;
			console.log(
				`    📖 Extraktion ${success ? "✅ ERFOLGREICH" : "❌ FEHLGESCHLAGEN"}`
			);

			return {
				success,
				testValue,
				extractionResults,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			element.value = originalValue; // Cleanup
			console.log(`    📖 Extraktion ❌ FEHLER: ${error.message}`);
			return {
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			};
		}
	},

	// SCHRITT 3: Testen ob Daten korrekt auf Server gespeichert werden
	async testServerSync(element, fieldType, tileId) {
		console.log(
			`  🌐 SCHRITT 3: Server-Sync testen für ${fieldType.displayName}`
		);

		const testValue = `TEST_${Date.now()}_${fieldType.dataKey}`;
		const originalValue = element.value;

		try {
			// Testwert setzen
			element.value = testValue;
			element.dispatchEvent(new Event("input", { bubbles: true }));
			element.dispatchEvent(new Event("change", { bubbles: true }));

			// Warten auf mögliche automatische Synchronisation
			await this.delay(500);

			// Manuell Synchronisation triggern
			let syncResult = null;
			if (window.storageBrowser?.saveToServer) {
				try {
					syncResult = await window.storageBrowser.saveToServer();
					console.log("    🌐 Manuelle Synchronisation ausgeführt");
				} catch (syncError) {
					console.log(`    🌐 Sync-Fehler: ${syncError.message}`);
					syncResult = { error: syncError.message };
				}
			}

			// Server-Daten überprüfen
			let serverData = null;
			if (window.storageBrowser?.loadFromServer) {
				try {
					serverData = await window.storageBrowser.loadFromServer();
					console.log("    🌐 Server-Daten abgerufen");
				} catch (loadError) {
					console.log(`    🌐 Load-Fehler: ${loadError.message}`);
					serverData = { error: loadError.message };
				}
			}

			// Überprüfen ob Testwert auf Server angekommen ist
			let foundOnServer = false;
			if (serverData && serverData.tiles) {
				const serverTileData = serverData.tiles[tileId];
				if (serverTileData && serverTileData[fieldType.dataKey] === testValue) {
					foundOnServer = true;
				}
			}

			// Originalwert wiederherstellen
			element.value = originalValue;

			console.log(
				`    🌐 Server-Sync ${
					foundOnServer ? "✅ ERFOLGREICH" : "❌ FEHLGESCHLAGEN"
				}`
			);

			return {
				success: foundOnServer,
				testValue,
				syncResult,
				serverData: serverData,
				foundOnServer,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			element.value = originalValue; // Cleanup
			console.log(`    🌐 Server-Sync ❌ FEHLER: ${error.message}`);
			return {
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			};
		}
	},

	// SCHRITT 4: Testen ob Daten korrekt zurückgeschrieben werden
	async testDataRetrieval(element, fieldType, tileId) {
		console.log(
			`  📥 SCHRITT 4: Datenrückschreibung testen für ${fieldType.displayName}`
		);

		const testValue = `RETRIEVE_${Date.now()}_${fieldType.dataKey}`;
		const originalValue = element.value;

		try {
			// Ersten Testwert auf Server speichern
			element.value = testValue;
			if (window.storageBrowser?.saveToServer) {
				await window.storageBrowser.saveToServer();
			}

			// Feld auf anderen Wert setzen
			element.value = "DIFFERENT_VALUE";

			// Server-Daten laden und anwenden
			let retrievalResult = null;
			if (window.storageBrowser?.loadFromServer) {
				const serverData = await window.storageBrowser.loadFromServer();
				if (serverData) {
					// applyProjectData verwenden
					if (window.storageBrowser?.applyProjectData) {
						await window.storageBrowser.applyProjectData(serverData);
						retrievalResult = "applyProjectData verwendet";
					}
					// Oder applyLoadedHangarPlan
					else if (window.hangarData?.applyLoadedHangarPlan) {
						await window.hangarData.applyLoadedHangarPlan(serverData);
						retrievalResult = "applyLoadedHangarPlan verwendet";
					}
				}
			}

			// Prüfen ob der Testwert zurückgeschrieben wurde
			const currentValue = element.value;
			const success = currentValue === testValue;

			console.log(
				`    📥 Datenrückschreibung ${
					success ? "✅ ERFOLGREICH" : "❌ FEHLGESCHLAGEN"
				}`
			);
			console.log(`    📥 Erwartet: ${testValue}, Erhalten: ${currentValue}`);

			// Originalwert wiederherstellen
			element.value = originalValue;

			return {
				success,
				testValue,
				retrievedValue: currentValue,
				retrievalMethod: retrievalResult,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			element.value = originalValue; // Cleanup
			console.log(`    📥 Datenrückschreibung ❌ FEHLER: ${error.message}`);
			return {
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			};
		}
	},

	// SCHRITT 5: Testen ob Daten nachträglich überschrieben werden
	async testOverwriteProtection(element, fieldType, tileId) {
		console.log(
			`  🛡️ SCHRITT 5: Überschreibungsschutz testen für ${fieldType.displayName}`
		);

		const testValue = `PROTECT_${Date.now()}_${fieldType.dataKey}`;
		const originalValue = element.value;

		try {
			// Testwert setzen und speichern
			element.value = testValue;
			if (window.storageBrowser?.saveToServer) {
				await window.storageBrowser.saveToServer();
			}

			const valueAfterSet = element.value;

			// Verschiedene Events simulieren, die Überschreibungen verursachen könnten
			const potentialOverwriteSources = [
				"DOMContentLoaded localStorage restore",
				"Auto-sync interval",
				"UI update events",
				"Manual localStorage restore",
			];

			const overwriteTests = [];

			// Test 1: localStorage restore simulation
			if (window.hangarData?.restoreFromLocalStorage) {
				try {
					await window.hangarData.restoreFromLocalStorage();
					overwriteTests.push({
						source: "localStorage restore",
						valueBefore: valueAfterSet,
						valueAfter: element.value,
						wasOverwritten: element.value !== testValue,
					});
				} catch (e) {
					overwriteTests.push({
						source: "localStorage restore",
						error: e.message,
					});
				}
			}

			// Test 2: UI refresh simulation
			if (window.hangarUI?.refreshUI) {
				try {
					const valueBefore = element.value;
					window.hangarUI.refreshUI();
					await this.delay(100);
					overwriteTests.push({
						source: "UI refresh",
						valueBefore,
						valueAfter: element.value,
						wasOverwritten: element.value !== testValue,
					});
				} catch (e) {
					overwriteTests.push({
						source: "UI refresh",
						error: e.message,
					});
				}
			}

			// Test 3: Auto-sync simulation
			if (window.storageBrowser?.autoSyncEnabled) {
				try {
					const valueBefore = element.value;
					// Auto-sync manuell triggern
					if (window.storageBrowser?.performAutoSync) {
						await window.storageBrowser.performAutoSync();
					}
					await this.delay(100);
					overwriteTests.push({
						source: "auto-sync",
						valueBefore,
						valueAfter: element.value,
						wasOverwritten: element.value !== testValue,
					});
				} catch (e) {
					overwriteTests.push({
						source: "auto-sync",
						error: e.message,
					});
				}
			}

			const finalValue = element.value;
			const wasProtected = finalValue === testValue;

			console.log(
				`    🛡️ Überschreibungsschutz ${
					wasProtected ? "✅ ERFOLGREICH" : "❌ FEHLGESCHLAGEN"
				}`
			);
			console.log(`    🛡️ Testwert: ${testValue}, Finaler Wert: ${finalValue}`);

			// Originalwert wiederherstellen
			element.value = originalValue;

			return {
				success: wasProtected,
				testValue,
				finalValue,
				overwriteTests,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			element.value = originalValue; // Cleanup
			console.log(`    🛡️ Überschreibungsschutz ❌ FEHLER: ${error.message}`);
			return {
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			};
		}
	},

	// VERGLEICHSANALYSE: Aircraft als bewährte Referenz
	async testAircraftReferenceMethod() {
		console.log("🔍 VERGLEICHSANALYSE: Aircraft-Verfahren als Referenz");
		console.log("====================================================");

		const allTiles = this.findAllTiles();
		const results = {
			aircraftResults: [],
			timePositionResults: [],
			comparisonSummary: {},
		};

		for (const tile of allTiles) {
			const tileId = this.extractTileId(tile);
			if (!tileId) continue;

			console.log(`\n🔧 Vergleichsanalyse für Tile: ${tileId}`);

			// Test Aircraft (bewährte Referenz)
			const aircraftField = this.config.targetFieldTypes.find(
				(f) => f.prefix === "aircraft-"
			);
			const aircraftResults = await this.analyzeFieldCompletely(
				tileId,
				aircraftField
			);
			results.aircraftResults.push(aircraftResults);

			// Test andere Felder (zu verbessernde)
			for (const fieldType of this.config.targetFieldTypes.filter(
				(f) => f.prefix !== "aircraft-"
			)) {
				const fieldResults = await this.analyzeFieldCompletely(
					tileId,
					fieldType
				);
				results.timePositionResults.push({
					...fieldResults,
					referenceTileId: tileId,
				});
			}
		}

		// Vergleichsauswertung
		results.comparisonSummary = this.generateComparisonSummary(
			results.aircraftResults,
			results.timePositionResults
		);

		console.log("\n📊 VERGLEICHSAUSWERTUNG:");
		console.log("========================");
		console.log(results.comparisonSummary.report);

		return results;
	},

	generateComparisonSummary(aircraftResults, timePositionResults) {
		const aircraftSuccess = aircraftResults.filter(
			(r) =>
				r.dataExtraction?.success &&
				r.serverSync?.success &&
				r.dataRetrieval?.success &&
				r.overwriteCheck?.success
		).length;

		const timePositionSuccess = timePositionResults.filter(
			(r) =>
				r.dataExtraction?.success &&
				r.serverSync?.success &&
				r.dataRetrieval?.success &&
				r.overwriteCheck?.success
		).length;

		const aircraftTotal = aircraftResults.length;
		const timePositionTotal = timePositionResults.length;

		const aircraftSuccessRate = aircraftTotal
			? (aircraftSuccess / aircraftTotal) * 100
			: 0;
		const timePositionSuccessRate = timePositionTotal
			? (timePositionSuccess / timePositionTotal) * 100
			: 0;

		let report = `🎯 Aircraft-Referenz (bewährt): ${aircraftSuccess}/${aircraftTotal} (${aircraftSuccessRate.toFixed(
			1
		)}%)\n`;
		report += `⚠️ Zeit/Position-Felder: ${timePositionSuccess}/${timePositionTotal} (${timePositionSuccessRate.toFixed(
			1
		)}%)\n\n`;

		if (aircraftSuccessRate > timePositionSuccessRate) {
			report += `💡 EMPFEHLUNG: Zeit/Position-Felder sollten Aircraft-Verfahren übernehmen!\n`;
			report += `📋 Unterschiede analysieren:\n`;

			// Detaillierte Fehleranalyse
			const aircraftErrors = this.analyzeErrorPatterns(aircraftResults);
			const timePositionErrors = this.analyzeErrorPatterns(timePositionResults);

			report += `   🟢 Aircraft-Verfahren Probleme: ${aircraftErrors.join(
				", "
			)}\n`;
			report += `   🔴 Zeit/Position-Probleme: ${timePositionErrors.join(
				", "
			)}`;
		} else {
			report += `✅ Zeit/Position-Felder funktionieren bereits gut!`;
		}

		return {
			aircraftSuccessRate,
			timePositionSuccessRate,
			report,
			aircraftErrors: this.analyzeErrorPatterns(aircraftResults),
			timePositionErrors: this.analyzeErrorPatterns(timePositionResults),
		};
	},

	analyzeErrorPatterns(results) {
		const errorTypes = [];
		let dataExtractionErrors = 0;
		let serverSyncErrors = 0;
		let dataRetrievalErrors = 0;
		let overwriteErrors = 0;

		results.forEach((result) => {
			if (!result.dataExtraction?.success) dataExtractionErrors++;
			if (!result.serverSync?.success) serverSyncErrors++;
			if (!result.dataRetrieval?.success) dataRetrievalErrors++;
			if (!result.overwriteCheck?.success) overwriteErrors++;
		});

		if (dataExtractionErrors > 0)
			errorTypes.push(`${dataExtractionErrors}x Datenextraktion`);
		if (serverSyncErrors > 0)
			errorTypes.push(`${serverSyncErrors}x Server-Sync`);
		if (dataRetrievalErrors > 0)
			errorTypes.push(`${dataRetrievalErrors}x Datenrückschreibung`);
		if (overwriteErrors > 0)
			errorTypes.push(`${overwriteErrors}x Überschreibung`);

		return errorTypes.length > 0 ? errorTypes : ["Keine Fehler"];
	},

	// Hilfsfunktionen
	findAllTiles() {
		const tiles = [];
		this.config.containers.forEach((containerSelector) => {
			const container = document.querySelector(containerSelector);
			if (container) {
				const tilesInContainer = container.querySelectorAll(".hangar-tile");
				tiles.push(...tilesInContainer);
			}
		});
		return tiles;
	},

	extractTileId(tileElement) {
		// Verschiedene Methoden versuchen um die Tile-ID zu extrahieren
		if (tileElement.dataset.tileId) {
			return tileElement.dataset.tileId;
		}
		if (tileElement.id && tileElement.id.startsWith("tile-")) {
			return tileElement.id.replace("tile-", "");
		}
		// Nach ID-Pattern in child elements suchen
		const childWithId = tileElement.querySelector(
			'[id*="aircraft-"], [id*="arrival-time-"], [id*="departure-time-"], [id*="position-"]'
		);
		if (childWithId) {
			const match = childWithId.id.match(
				/(aircraft-|arrival-time-|departure-time-|position-)(\d+)/
			);
			if (match) {
				return match[2];
			}
		}
		return null;
	},

	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	},

	// HAUPT-ANALYSE-FUNKTION
	async runCompleteAnalysis() {
		console.log("🚀 REKURSIVE SYNCHRONISATIONS-FEHLERANALYSE STARTET");
		console.log("====================================================");
		console.log(`⏰ Zeitstempel: ${new Date().toISOString()}`);
		console.log("");

		try {
			const fullResults = await this.analyzeFieldsRecursively();

			console.log("\n📊 FINALE ERGEBNISSE:");
			console.log("====================");

			// Zusammenfassung der Ergebnisse
			const summary = this.generateSummary(fullResults);
			console.log(summary);

			// Detaillierte Fehlerberichte
			const errorReport = this.generateErrorReport(fullResults);
			if (errorReport) {
				console.log("\n🔥 IDENTIFIZIERTE PROBLEME:");
				console.log("===========================");
				console.log(errorReport);
			}

			// Empfehlungen
			const recommendations = this.generateRecommendations(fullResults);
			console.log("\n💡 EMPFEHLUNGEN:");
			console.log("================");
			console.log(recommendations);

			return fullResults;
		} catch (error) {
			console.error("❌ KRITISCHER FEHLER bei der Analyse:", error);
			return { error: error.message };
		}
	},

	generateSummary(results) {
		const total = results.foundFields.length + results.missingFields.length;
		const found = results.foundFields.length;
		const missing = results.missingFields.length;

		let summary = `📈 Gesamt analysierte Felder: ${total}\n`;
		summary += `✅ Gefundene Felder: ${found}\n`;
		summary += `❌ Fehlende Felder: ${missing}\n\n`;

		if (found > 0) {
			const successful = results.foundFields.filter(
				(f) =>
					f.dataExtraction?.success &&
					f.serverSync?.success &&
					f.dataRetrieval?.success &&
					f.overwriteCheck?.success
			).length;

			summary += `🎯 Vollständig funktionierende Felder: ${successful}/${found}\n`;
			summary += `⚠️ Felder mit Problemen: ${found - successful}/${found}\n`;
		}

		return summary;
	},

	generateErrorReport(results) {
		const errors = [];

		results.foundFields.forEach((field) => {
			const fieldErrors = [];

			if (!field.dataExtraction?.success) {
				fieldErrors.push(
					`Datenextraktion fehlgeschlagen: ${
						field.dataExtraction?.error || "Unbekannter Fehler"
					}`
				);
			}

			if (!field.serverSync?.success) {
				fieldErrors.push(
					`Server-Sync fehlgeschlagen: ${
						field.serverSync?.error || "Daten nicht auf Server gefunden"
					}`
				);
			}

			if (!field.dataRetrieval?.success) {
				fieldErrors.push(
					`Datenrückschreibung fehlgeschlagen: ${
						field.dataRetrieval?.error || "Werte nicht korrekt übernommen"
					}`
				);
			}

			if (!field.overwriteCheck?.success) {
				fieldErrors.push(
					`Überschreibungsschutz fehlgeschlagen: ${
						field.overwriteCheck?.error || "Werte wurden überschrieben"
					}`
				);
			}

			if (fieldErrors.length > 0) {
				errors.push(
					`🔴 ${field.fieldType} (${field.fieldId}):\n   ${fieldErrors.join(
						"\n   "
					)}`
				);
			}
		});

		results.missingFields.forEach((field) => {
			errors.push(
				`🔴 Feld nicht gefunden: ${field.fieldType} (${field.expectedId}) in Tile ${field.tileId}`
			);
		});

		return errors.join("\n\n");
	},

	generateRecommendations(results) {
		const recommendations = [];

		// Analyse der häufigsten Fehler
		const errorTypes = {
			dataExtraction: 0,
			serverSync: 0,
			dataRetrieval: 0,
			overwriteCheck: 0,
			missingFields: results.missingFields.length,
		};

		results.foundFields.forEach((field) => {
			if (!field.dataExtraction?.success) errorTypes.dataExtraction++;
			if (!field.serverSync?.success) errorTypes.serverSync++;
			if (!field.dataRetrieval?.success) errorTypes.dataRetrieval++;
			if (!field.overwriteCheck?.success) errorTypes.overwriteCheck++;
		});

		if (errorTypes.missingFields > 0) {
			recommendations.push(
				`🔧 ${errorTypes.missingFields} Felder nicht gefunden - Prüfe HTML-Struktur und ID-Generierung`
			);
		}

		if (errorTypes.dataExtraction > 0) {
			recommendations.push(
				`🔧 ${errorTypes.dataExtraction} Datenextraktions-Fehler - Prüfe collectTileData() und collectSingleTileData() Funktionen`
			);
		}

		if (errorTypes.serverSync > 0) {
			recommendations.push(
				`🔧 ${errorTypes.serverSync} Server-Sync-Fehler - Prüfe saveToServer() Implementierung und PHP-Backend`
			);
		}

		if (errorTypes.dataRetrieval > 0) {
			recommendations.push(
				`🔧 ${errorTypes.dataRetrieval} Datenrückschreibungs-Fehler - Prüfe applyProjectData() und applyLoadedHangarPlan() Funktionen`
			);
		}

		if (errorTypes.overwriteCheck > 0) {
			recommendations.push(
				`🔧 ${errorTypes.overwriteCheck} Überschreibungs-Probleme - Prüfe localStorage-Interferenz und Auto-Sync-Konflikte`
			);
		}

		if (recommendations.length === 0) {
			recommendations.push(
				"🎉 Alle Tests erfolgreich! Synchronisation funktioniert korrekt."
			);
		}

		return recommendations.join("\n");
	},
};

// Einfache API für schnelle Tests
window.quickSyncTest = {
	testAll: () => window.recursiveSyncAnalysis.runCompleteAnalysis(),
	testAircraftReference: () =>
		window.recursiveSyncAnalysis.testAircraftReferenceMethod(),
	compareWithAircraft: () => {
		console.log("🔍 Starte Vergleichsanalyse mit bewährtem Aircraft-Verfahren...");
		return window.recursiveSyncAnalysis.testAircraftReferenceMethod();
	},
	testField: (fieldId) => {
		const element = document.getElementById(fieldId);
		if (!element) {
			console.log(`❌ Feld ${fieldId} nicht gefunden`);
			return;
		}

		const match = fieldId.match(
			/(aircraft-|arrival-time-|departure-time-|position-)(\d+)/
		);
		if (!match) {
			console.log(`❌ Unbekanntes Feld-Format: ${fieldId}`);
			return;
		}

		const prefix = match[1];
		const tileId = match[2];
		const fieldType = window.recursiveSyncAnalysis.config.targetFieldTypes.find(
			(t) => t.prefix === prefix
		);

		if (fieldType) {
			return window.recursiveSyncAnalysis.analyzeFieldCompletely(
				tileId,
				fieldType
			);
		} else {
			console.log(`❌ Unbekannter Feldtyp für: ${fieldId}`);
		}
	},
};

console.log(
	"🔧 Rekursive Synchronisations-Analyse geladen (mit Aircraft-Referenz)"
);
console.log(
	"📞 Verwende window.recursiveSyncAnalysis.runCompleteAnalysis() für vollständige Analyse"
);
console.log("📞 Verwende window.quickSyncTest.testAll() für Schnelltest");
console.log(
	"🎯 Verwende window.quickSyncTest.compareWithAircraft() für Vergleich mit bewährtem Aircraft-Verfahren"
);

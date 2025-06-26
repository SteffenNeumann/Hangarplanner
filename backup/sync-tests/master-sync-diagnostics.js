/**
 * MASTER SYNC DIAGNOSTICS - Koordiniert alle Sync-Analysen
 * Zentrale Stelle für die Diagnose von Synchronisationsproblemen
 */

window.masterSyncDiagnostics = {
	async runFullDiagnostics() {
		console.log("🚀 MASTER SYNC DIAGNOSTICS - VOLLSTÄNDIGE ANALYSE");
		console.log("=================================================");
		console.log(`⏰ Start: ${new Date().toISOString()}`);
		console.log("");

		const diagnosticResults = {
			timestamp: new Date().toISOString(),
			phases: {},
			summary: {},
			criticalIssues: [],
			recommendations: [],
		};

		try {
			// PHASE 1: HTML-Struktur Analyse
			console.log("📋 PHASE 1: HTML-STRUKTUR ANALYSE");
			console.log("==================================");
			if (window.htmlStructureAnalysis) {
				diagnosticResults.phases.htmlStructure = await this.runPhase(
					"HTML Structure",
					() => window.htmlStructureAnalysis.runCompleteHtmlAnalysis()
				);
			} else {
				console.log("❌ HTML-Struktur-Analyse nicht verfügbar");
				diagnosticResults.phases.htmlStructure = { error: "Module not loaded" };
			}

			// PHASE 2: Rekursive Sync-Analyse
			console.log("\n📋 PHASE 2: REKURSIVE SYNC-ANALYSE");
			console.log("==================================");
			if (window.recursiveSyncAnalysis) {
				diagnosticResults.phases.recursiveSync = await this.runPhase(
					"Recursive Sync",
					() => window.recursiveSyncAnalysis.runCompleteAnalysis()
				);
			} else {
				console.log("❌ Rekursive Sync-Analyse nicht verfügbar");
				diagnosticResults.phases.recursiveSync = { error: "Module not loaded" };
			}

			// PHASE 3: Debug-Sync Prüfungen
			console.log("\n📋 PHASE 3: DEBUG-SYNC PRÜFUNGEN");
			console.log("=================================");
			if (window.syncDebug) {
				diagnosticResults.phases.debugSync = await this.runPhase(
					"Debug Sync",
					() => window.syncDebug.debugAllFields()
				);
			} else {
				console.log("❌ Debug-Sync nicht verfügbar");
				diagnosticResults.phases.debugSync = { error: "Module not loaded" };
			}

			// PHASE 4: Test-Sync Validierung
			console.log("\n📋 PHASE 4: TEST-SYNC VALIDIERUNG");
			console.log("==================================");
			if (window.testSync) {
				diagnosticResults.phases.testSync = await this.runPhase(
					"Test Sync",
					() => window.testSync.runAllTests()
				);
			} else {
				console.log("❌ Test-Sync nicht verfügbar");
				diagnosticResults.phases.testSync = { error: "Module not loaded" };
			}

			// PHASE 5: Investigation
			console.log("\n📋 PHASE 5: SYNC INVESTIGATION");
			console.log("===============================");
			if (window.syncInvestigation) {
				diagnosticResults.phases.investigation = await this.runPhase(
					"Sync Investigation",
					() => window.syncInvestigation.runDetailedInvestigation()
				);
			} else {
				console.log("❌ Sync Investigation nicht verfügbar");
				diagnosticResults.phases.investigation = { error: "Module not loaded" };
			}

			// ZUSAMMENFASSUNG GENERIEREN
			this.generateMasterSummary(diagnosticResults);

			return diagnosticResults;
		} catch (error) {
			console.error("❌ KRITISCHER FEHLER bei Master Diagnostics:", error);
			diagnosticResults.error = error.message;
			return diagnosticResults;
		}
	},

	async runPhase(phaseName, phaseFunction) {
		const phaseStart = Date.now();
		console.log(`🔄 Starte ${phaseName}...`);

		try {
			const result = await phaseFunction();
			const duration = Date.now() - phaseStart;
			console.log(`✅ ${phaseName} abgeschlossen (${duration}ms)`);

			return {
				success: true,
				duration,
				result,
			};
		} catch (error) {
			const duration = Date.now() - phaseStart;
			console.log(
				`❌ ${phaseName} fehlgeschlagen (${duration}ms): ${error.message}`
			);

			return {
				success: false,
				duration,
				error: error.message,
			};
		}
	},

	generateMasterSummary(diagnosticResults) {
		console.log("\n🎯 MASTER SUMMARY - KRITISCHE PROBLEME");
		console.log("======================================");

		const criticalIssues = [];
		const recommendations = [];
		let totalFieldsAnalyzed = 0;
		let workingFields = 0;
		let brokenFields = 0;

		// HTML-Struktur-Probleme
		if (diagnosticResults.phases.htmlStructure?.result?.results) {
			const htmlResults = diagnosticResults.phases.htmlStructure.result.results;
			if (htmlResults.structureProblems?.length > 0) {
				criticalIssues.push(
					`🔴 ${htmlResults.structureProblems.length} HTML-Struktur-Probleme`
				);
				recommendations.push(
					"🔧 Führe window.htmlCheck.checkStructure() aus für Details"
				);
			}
		}

		// Sync-Analyse-Probleme
		if (diagnosticResults.phases.recursiveSync?.result?.foundFields) {
			const syncResults = diagnosticResults.phases.recursiveSync.result;
			totalFieldsAnalyzed = syncResults.foundFields.length;

			syncResults.foundFields.forEach((field) => {
				const isWorking =
					field.dataExtraction?.success &&
					field.serverSync?.success &&
					field.dataRetrieval?.success &&
					field.overwriteCheck?.success;

				if (isWorking) {
					workingFields++;
				} else {
					brokenFields++;

					const problems = [];
					if (!field.dataExtraction?.success) problems.push("Datenextraktion");
					if (!field.serverSync?.success) problems.push("Server-Sync");
					if (!field.dataRetrieval?.success)
						problems.push("Datenrückschreibung");
					if (!field.overwriteCheck?.success)
						problems.push("Überschreibungsschutz");

					criticalIssues.push(
						`🔴 ${field.fieldType} (${field.fieldId}): ${problems.join(", ")}`
					);
				}
			});

			if (syncResults.missingFields?.length > 0) {
				criticalIssues.push(
					`🔴 ${syncResults.missingFields.length} Felder nicht im DOM gefunden`
				);
			}
		}

		// Spezifische Problemprioritäten
		const problemPriorities = this.analyzeProblemPriorities(diagnosticResults);

		console.log(`📊 STATISTIKEN:`);
		console.log(`   Analysierte Felder: ${totalFieldsAnalyzed}`);
		console.log(`   Funktionierende Felder: ${workingFields}`);
		console.log(`   Defekte Felder: ${brokenFields}`);
		console.log(
			`   Erfolgsrate: ${
				totalFieldsAnalyzed > 0
					? Math.round((workingFields / totalFieldsAnalyzed) * 100)
					: 0
			}%`
		);

		if (criticalIssues.length === 0) {
			console.log("\n🎉 KEINE KRITISCHEN PROBLEME GEFUNDEN!");
			console.log("✅ Synchronisation funktioniert vollständig korrekt");
		} else {
			console.log("\n🔥 KRITISCHE PROBLEME:");
			criticalIssues.forEach((issue, index) => {
				console.log(`${index + 1}. ${issue}`);
			});
		}

		// Priorisierte Empfehlungen
		console.log("\n💡 PRIORISIERTE EMPFEHLUNGEN:");
		this.generatePrioritizedRecommendations(problemPriorities).forEach(
			(rec, index) => {
				console.log(`${index + 1}. ${rec}`);
			}
		);

		diagnosticResults.summary = {
			totalFieldsAnalyzed,
			workingFields,
			brokenFields,
			successRate:
				totalFieldsAnalyzed > 0
					? Math.round((workingFields / totalFieldsAnalyzed) * 100)
					: 0,
			criticalIssues: criticalIssues.length,
			hasStructureProblems:
				diagnosticResults.phases.htmlStructure?.result?.results
					?.structureProblems?.length > 0,
		};

		diagnosticResults.criticalIssues = criticalIssues;
		diagnosticResults.recommendations =
			this.generatePrioritizedRecommendations(problemPriorities);
	},

	analyzeProblemPriorities(diagnosticResults) {
		const problems = {
			htmlStructure: 0,
			dataExtraction: 0,
			serverSync: 0,
			dataRetrieval: 0,
			overwriteProtection: 0,
			missingFields: 0,
		};

		// HTML-Struktur
		if (
			diagnosticResults.phases.htmlStructure?.result?.results?.structureProblems
		) {
			problems.htmlStructure =
				diagnosticResults.phases.htmlStructure.result.results.structureProblems.length;
		}

		// Sync-Probleme
		if (diagnosticResults.phases.recursiveSync?.result) {
			const syncResult = diagnosticResults.phases.recursiveSync.result;

			if (syncResult.missingFields) {
				problems.missingFields = syncResult.missingFields.length;
			}

			if (syncResult.foundFields) {
				syncResult.foundFields.forEach((field) => {
					if (!field.dataExtraction?.success) problems.dataExtraction++;
					if (!field.serverSync?.success) problems.serverSync++;
					if (!field.dataRetrieval?.success) problems.dataRetrieval++;
					if (!field.overwriteCheck?.success) problems.overwriteProtection++;
				});
			}
		}

		return problems;
	},

	generatePrioritizedRecommendations(problems) {
		const recommendations = [];

		// Priorisierung: Kritischste Probleme zuerst
		if (problems.missingFields > 0) {
			recommendations.push(
				`🔥 HÖCHSTE PRIORITÄT: ${problems.missingFields} Felder nicht gefunden - Prüfe HTML-Struktur mit window.htmlCheck.checkStructure()`
			);
		}

		if (problems.htmlStructure > 0) {
			recommendations.push(
				`🔥 HOCH: ${problems.htmlStructure} HTML-Struktur-Probleme - Prüfe Element-IDs und -Klassen`
			);
		}

		if (problems.dataExtraction > 0) {
			recommendations.push(
				`🟡 MITTEL: ${problems.dataExtraction} Datenextraktions-Fehler - Prüfe collectTileData() in js/hangar-data.js`
			);
		}

		if (problems.dataRetrieval > 0) {
			recommendations.push(
				`🟡 MITTEL: ${problems.dataRetrieval} Datenrückschreibungs-Fehler - Prüfe applyTileData() in js/hangar-data.js`
			);
		}

		if (problems.serverSync > 0) {
			recommendations.push(
				`🟠 MITTEL: ${problems.serverSync} Server-Sync-Fehler - Prüfe sync/data.php und Netzwerk-Verbindung`
			);
		}

		if (problems.overwriteProtection > 0) {
			recommendations.push(
				`🟢 NIEDRIG: ${problems.overwriteProtection} Überschreibungs-Probleme - Prüfe localStorage-Konflikte`
			);
		}

		if (recommendations.length === 0) {
			recommendations.push(
				"🎉 Alle Systeme funktional - keine Reparaturen erforderlich"
			);
		}

		return recommendations;
	},

	// Quick-Tests für spezifische Problembereiche
	async quickTestDataExtraction() {
		console.log("⚡ QUICK TEST: Datenextraktion");
		if (window.recursiveSyncAnalysis) {
			const tiles = window.recursiveSyncAnalysis.findAllTiles();
			if (tiles.length > 0) {
				const firstTile = tiles[0];
				const tileId = window.recursiveSyncAnalysis.extractTileId(firstTile);
				if (tileId) {
					for (const fieldType of window.recursiveSyncAnalysis.config
						.targetFieldTypes) {
						const result =
							await window.recursiveSyncAnalysis.testDataExtraction(
								document.getElementById(`${fieldType.prefix}${tileId}`),
								fieldType,
								tileId
							);
						console.log(
							`${fieldType.displayName}: ${result.success ? "✅" : "❌"}`
						);
					}
				} else {
					console.log("❌ Keine Tile-ID gefunden");
				}
			} else {
				console.log("❌ Keine Tiles gefunden");
			}
		}
	},

	async quickTestServerSync() {
		console.log("⚡ QUICK TEST: Server-Sync");
		if (
			window.storageBrowser?.saveToServer &&
			window.storageBrowser?.loadFromServer
		) {
			try {
				const saveResult = await window.storageBrowser.saveToServer();
				console.log(`Save: ${saveResult ? "✅" : "❌"}`);

				const loadResult = await window.storageBrowser.loadFromServer();
				console.log(`Load: ${loadResult ? "✅" : "❌"}`);
			} catch (error) {
				console.log(`❌ Server-Sync Fehler: ${error.message}`);
			}
		} else {
			console.log("❌ Server-Sync Funktionen nicht verfügbar");
		}
	},
};

// Einfache API für Benutzer
window.syncDiagnostics = {
	// Vollständige Analyse
	runFull: () => window.masterSyncDiagnostics.runFullDiagnostics(),

	// Quick-Tests
	quickDataExtraction: () =>
		window.masterSyncDiagnostics.quickTestDataExtraction(),
	quickServerSync: () => window.masterSyncDiagnostics.quickTestServerSync(),

	// Spezifische Module
	htmlOnly: () => window.htmlCheck?.checkStructure(),
	syncOnly: () => window.recursiveSyncAnalysis?.runCompleteAnalysis(),
	debugOnly: () => window.syncDebug?.debugAllFields(),
	testOnly: () => window.testSync?.runAllTests(),
	investigateOnly: () => window.syncInvestigation?.runDetailedInvestigation(),
};

console.log("🎯 Master Sync Diagnostics geladen");
console.log("");
console.log("📞 HAUPTBEFEHLE:");
console.log(
	"   window.syncDiagnostics.runFull()           - Vollständige Analyse"
);
console.log(
	"   window.syncDiagnostics.quickDataExtraction() - Schnelltest Datenextraktion"
);
console.log(
	"   window.syncDiagnostics.quickServerSync()    - Schnelltest Server-Sync"
);
console.log("");
console.log("📞 EINZELMODULE:");
console.log(
	"   window.syncDiagnostics.htmlOnly()          - Nur HTML-Struktur"
);
console.log("   window.syncDiagnostics.syncOnly()          - Nur Sync-Analyse");
console.log(
	"   window.syncDiagnostics.debugOnly()         - Nur Debug-Prüfungen"
);
console.log("   window.syncDiagnostics.testOnly()          - Nur Test-Suite");
console.log(
	"   window.syncDiagnostics.investigateOnly()   - Nur Investigation"
);

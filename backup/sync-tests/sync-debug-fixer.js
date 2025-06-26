/**
 * SYNC DEBUG FIXER - Behebt Probleme mit der Sync-Analyse
 * Lädt fehlende Module nach und stellt sicher, dass alle Tools verfügbar sind
 */

console.log("🔧 SYNC DEBUG FIXER wird geladen...");

window.syncDebugFixer = {
	// Prüfe verfügbare Module
	checkAvailableModules() {
		console.log("🔍 PRÜFE VERFÜGBARE MODULE:");
		console.log("===========================");

		const modules = [
			{ name: "recursiveSyncAnalysis", obj: window.recursiveSyncAnalysis },
			{ name: "htmlStructureAnalysis", obj: window.htmlStructureAnalysis },
			{ name: "masterSyncDiagnostics", obj: window.masterSyncDiagnostics },
			{ name: "syncDiagnostics", obj: window.syncDiagnostics },
			{ name: "quickSyncTest", obj: window.quickSyncTest },
			{ name: "runSyncDiagnosis", obj: window.runSyncDiagnosis },
			{ name: "quickSyncTests", obj: window.quickSyncTests },
			{ name: "testSingleField", obj: window.testSingleField },
			{ name: "syncDebug", obj: window.syncDebug },
			{ name: "testSync", obj: window.testSync },
			{ name: "syncInvestigation", obj: window.syncInvestigation },
			{ name: "storageBrowser", obj: window.storageBrowser },
			{ name: "hangarData", obj: window.hangarData },
		];

		modules.forEach((module) => {
			const status = module.obj ? "✅" : "❌";
			console.log(
				`${status} ${module.name}: ${
					module.obj ? "verfügbar" : "nicht verfügbar"
				}`
			);
		});

		return modules;
	},

	// Repariere syncDiagnostics falls nicht verfügbar
	fixSyncDiagnostics() {
		if (!window.syncDiagnostics && window.masterSyncDiagnostics) {
			console.log("🔧 Repariere syncDiagnostics...");

			window.syncDiagnostics = {
				runFull: () => window.masterSyncDiagnostics.runFullDiagnostics(),
				quickDataExtraction: () =>
					window.masterSyncDiagnostics.quickTestDataExtraction(),
				quickServerSync: () =>
					window.masterSyncDiagnostics.quickTestServerSync(),
				htmlOnly: () => window.htmlStructureAnalysis?.runCompleteHtmlAnalysis(),
				syncOnly: () => window.recursiveSyncAnalysis?.runCompleteAnalysis(),
				debugOnly: () => window.syncDebug?.debugAllFields(),
				testOnly: () => window.testSync?.runAllTests(),
				investigateOnly: () =>
					window.syncInvestigation?.runDetailedInvestigation(),
			};

			console.log("✅ syncDiagnostics repariert");
		}
	},

	// Erstelle fehlende Funktionen
	createMissingFunctions() {
		console.log("🔧 ERSTELLE FEHLENDE FUNKTIONEN:");
		console.log("=================================");

		// Fallback für quickSyncTest falls nicht verfügbar
		if (!window.quickSyncTest) {
			window.quickSyncTest = {
				testAll: () => {
					if (window.runSyncDiagnosis) {
						return window.runSyncDiagnosis();
					} else if (window.recursiveSyncAnalysis) {
						return window.recursiveSyncAnalysis.runCompleteAnalysis();
					} else {
						console.log("❌ Keine Sync-Analyse verfügbar");
					}
				},
				testField: (fieldId) => {
					if (window.testSingleField) {
						return window.testSingleField(fieldId);
					} else {
						console.log(`❌ testSingleField nicht verfügbar für ${fieldId}`);
					}
				},
			};
			console.log("✅ quickSyncTest erstellt");
		}

		// Erstelle syncDiagnostics falls immer noch nicht verfügbar
		this.fixSyncDiagnostics();
	},

	// Vollständige Reparatur
	fixAll() {
		console.log("🛠️ VOLLSTÄNDIGE REPARATUR DER SYNC-TOOLS");
		console.log("=========================================");

		this.checkAvailableModules();
		this.createMissingFunctions();

		console.log("\n✅ Reparatur abgeschlossen!");
		console.log("\n📞 JETZT VERFÜGBARE KOMMANDOS:");

		if (window.runSyncDiagnosis) {
			console.log(
				"   window.runSyncDiagnosis()           - SOFORTIGE Vollanalyse"
			);
		}

		if (window.syncDiagnostics) {
			console.log("   window.syncDiagnostics.runFull()    - Master-Diagnose");
		}

		if (window.quickSyncTests) {
			console.log("   window.quickSyncTests.testDataExtraction() - Quick-Test");
		}

		if (window.testSingleField) {
			console.log('   window.testSingleField("field-id")  - Einzelfeld-Test');
		}

		console.log("\n🎯 EMPFEHLUNG: Führe window.runSyncDiagnosis() aus!");
	},

	// Notfall-Diagnose wenn alles andere fehlschlägt
	emergencyDiagnosis() {
		console.log("🚨 NOTFALL-DIAGNOSE");
		console.log("===================");

		// Grundlegende HTML-Struktur prüfen
		const containers = ["#hangarGrid", "#secondaryHangarGrid"];
		let totalTiles = 0;
		let totalFields = 0;

		containers.forEach((selector) => {
			const container = document.querySelector(selector);
			console.log(
				`${selector}: ${container ? "✅ gefunden" : "❌ nicht gefunden"}`
			);

			if (container) {
				const tiles = container.querySelectorAll(".hangar-tile");
				totalTiles += tiles.length;
				console.log(`  Tiles: ${tiles.length}`);

				// Teste erste Tile
				if (tiles.length > 0) {
					const firstTile = tiles[0];
					const arrivalField = firstTile.querySelector('[id*="arrival-time-"]');
					const departureField = firstTile.querySelector(
						'[id*="departure-time-"]'
					);
					const positionField = firstTile.querySelector('[id*="position-"]');

					console.log(
						`  Arrival Time Feld: ${
							arrivalField ? "✅ " + arrivalField.id : "❌ nicht gefunden"
						}`
					);
					console.log(
						`  Departure Time Feld: ${
							departureField ? "✅ " + departureField.id : "❌ nicht gefunden"
						}`
					);
					console.log(
						`  Position Feld: ${
							positionField ? "✅ " + positionField.id : "❌ nicht gefunden"
						}`
					);

					totalFields +=
						(arrivalField ? 1 : 0) +
						(departureField ? 1 : 0) +
						(positionField ? 1 : 0);
				}
			}
		});

		console.log(`\n📊 ZUSAMMENFASSUNG:`);
		console.log(`   Tiles: ${totalTiles}`);
		console.log(`   Sample Felder: ${totalFields}`);

		// Teste Storage Browser
		console.log(`\n🔄 STORAGE BROWSER:`);
		console.log(
			`   saveToServer: ${window.storageBrowser?.saveToServer ? "✅" : "❌"}`
		);
		console.log(
			`   loadFromServer: ${
				window.storageBrowser?.loadFromServer ? "✅" : "❌"
			}`
		);
		console.log(
			`   applyProjectData: ${
				window.storageBrowser?.applyProjectData ? "✅" : "❌"
			}`
		);

		// Teste Hangar Data
		console.log(`\n📋 HANGAR DATA:`);
		console.log(
			`   collectTileData: ${window.hangarData?.collectTileData ? "✅" : "❌"}`
		);
		console.log(
			`   applyTileData: ${window.hangarData?.applyTileData ? "✅" : "❌"}`
		);
		console.log(
			`   applyLoadedHangarPlan: ${
				window.hangarData?.applyLoadedHangarPlan ? "✅" : "❌"
			}`
		);

		return {
			totalTiles,
			totalFields,
			hasStorageBrowser: !!window.storageBrowser,
			hasHangarData: !!window.hangarData,
		};
	},
};

// Auto-Fix beim Laden
setTimeout(() => {
	console.log("🔧 Auto-Fix wird ausgeführt...");
	window.syncDebugFixer.fixAll();
}, 1000); // 1 Sekunde warten bis alle Module geladen sind

console.log("🔧 Sync Debug Fixer geladen");
console.log("📞 Verwende window.syncDebugFixer.fixAll() bei Problemen");
console.log(
	"📞 Verwende window.syncDebugFixer.emergencyDiagnosis() für Notfall-Diagnose"
);

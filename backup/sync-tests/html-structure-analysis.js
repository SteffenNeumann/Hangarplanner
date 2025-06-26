/**
 * ERWEITERTE HTML-STRUKTUR ANALYSE
 * Ergänzung zur rekursiven Sync-Analyse für HTML-Strukturprobleme
 */

window.htmlStructureAnalysis = {
	// Analysiere die HTML-Struktur der Tiles
	analyzeHtmlStructure() {
		console.log("🏗️ HTML-STRUKTUR ANALYSE STARTET");
		console.log("==================================");

		const results = {
			containers: [],
			tiles: [],
			fields: [],
			structureProblems: [],
			recommendations: [],
		};

		// Container analysieren
		const containers = ["#hangarGrid", "#secondaryHangarGrid"];
		containers.forEach((containerSelector) => {
			const container = document.querySelector(containerSelector);
			const containerInfo = {
				selector: containerSelector,
				exists: !!container,
				tileCount: 0,
				tiles: [],
			};

			if (container) {
				const tiles = container.querySelectorAll(".hangar-tile");
				containerInfo.tileCount = tiles.length;

				tiles.forEach((tile, index) => {
					const tileInfo = this.analyzeTileStructure(
						tile,
						index,
						containerSelector
					);
					containerInfo.tiles.push(tileInfo);
					results.tiles.push(tileInfo);
				});
			} else {
				results.structureProblems.push(
					`Container ${containerSelector} nicht gefunden`
				);
			}

			results.containers.push(containerInfo);
		});

		// Gesamtstatistiken
		console.log(
			`📊 Container gefunden: ${
				results.containers.filter((c) => c.exists).length
			}/${results.containers.length}`
		);
		console.log(`📊 Tiles gesamt: ${results.tiles.length}`);
		console.log(`📊 Strukturprobleme: ${results.structureProblems.length}`);

		// Detaillierte Probleme analysieren
		this.identifyStructureProblems(results);

		return results;
	},

	analyzeTileStructure(tile, index, containerSelector) {
		const tileInfo = {
			index,
			container: containerSelector,
			element: tile,
			hasCorrectClass: tile.classList.contains("hangar-tile"),
			id: tile.id || null,
			dataAttributes: {},
			fields: {
				aircraft: null,
				arrivalTime: null,
				departureTime: null,
				hangarPosition: null,
				positionInfoGrid: null,
				status: null,
				towStatus: null,
			},
			problems: [],
		};

		// Data attributes sammeln
		for (let attr of tile.attributes) {
			if (attr.name.startsWith("data-")) {
				tileInfo.dataAttributes[attr.name] = attr.value;
			}
		}

		// Tile-ID bestimmen (verschiedene Methoden)
		const tileId = this.extractTileIdFromElement(tile);
		if (!tileId) {
			tileInfo.problems.push("Keine eindeutige Tile-ID identifizierbar");
		} else {
			tileInfo.inferredTileId = tileId;
		}

		// Alle relevanten Felder suchen
		if (tileId) {
			tileInfo.fields = this.findFieldsInTile(tile, tileId);
		}

		return tileInfo;
	},

	extractTileIdFromElement(tile) {
		// Methode 1: data-tile-id
		if (tile.dataset.tileId) {
			return tile.dataset.tileId;
		}

		// Methode 2: ID pattern
		if (tile.id && tile.id.startsWith("tile-")) {
			return tile.id.replace("tile-", "");
		}

		// Methode 3: Aus Kind-Elementen ableiten
		const patterns = [
			/aircraft-(\d+)/,
			/arrival-time-(\d+)/,
			/departure-time-(\d+)/,
			/hangar-position-(\d+)/,
			/position-(\d+)/,
			/status-(\d+)/,
		];

		for (let pattern of patterns) {
			const element = tile.querySelector(`[id]`);
			if (element) {
				const allElements = tile.querySelectorAll("[id]");
				for (let el of allElements) {
					const match = el.id.match(pattern);
					if (match) {
						return match[1];
					}
				}
			}
		}

		return null;
	},

	findFieldsInTile(tile, tileId) {
		const fields = {};

		// Aircraft ID
		fields.aircraft = this.analyzeField(
			tile,
			`aircraft-${tileId}`,
			"Aircraft ID"
		);

		// Arrival Time
		fields.arrivalTime = this.analyzeField(
			tile,
			`arrival-time-${tileId}`,
			"Arrival Time"
		);

		// Departure Time
		fields.departureTime = this.analyzeField(
			tile,
			`departure-time-${tileId}`,
			"Departure Time"
		);

		// Hangar Position
		fields.hangarPosition = this.analyzeField(
			tile,
			`hangar-position-${tileId}`,
			"Hangar Position"
		);

		// Position Info Grid
		fields.positionInfoGrid = this.analyzeField(
			tile,
			`position-${tileId}`,
			"Position Info Grid"
		);

		// Status
		fields.status = this.analyzeField(tile, `status-${tileId}`, "Status");

		// Tow Status
		fields.towStatus = this.analyzeField(
			tile,
			`tow-status-${tileId}`,
			"Tow Status"
		);

		return fields;
	},

	analyzeField(tile, expectedId, fieldName) {
		const element = tile.querySelector(`#${expectedId}`);

		const fieldInfo = {
			name: fieldName,
			expectedId: expectedId,
			found: !!element,
			element: element,
			problems: [],
		};

		if (element) {
			fieldInfo.tagName = element.tagName.toLowerCase();
			fieldInfo.type = element.type || null;
			fieldInfo.value = element.value || "";
			fieldInfo.placeholder = element.placeholder || "";
			fieldInfo.classes = Array.from(element.classList);

			// Spezifische Validierungen
			if (fieldName.includes("Time") && fieldInfo.tagName !== "input") {
				fieldInfo.problems.push(
					`Zeitfeld sollte <input> sein, ist aber <${fieldInfo.tagName}>`
				);
			}

			if (fieldName.includes("Position") && fieldInfo.tagName !== "input") {
				fieldInfo.problems.push(
					`Positionsfeld sollte <input> sein, ist aber <${fieldInfo.tagName}>`
				);
			}

			if (fieldName === "Status" && fieldInfo.tagName !== "select") {
				fieldInfo.problems.push(
					`Statusfeld sollte <select> sein, ist aber <${fieldInfo.tagName}>`
				);
			}
		} else {
			fieldInfo.problems.push(`Element mit ID '${expectedId}' nicht gefunden`);

			// Suche nach ähnlichen IDs
			const similarElements = tile.querySelectorAll(
				`[id*="${fieldName.toLowerCase().replace(" ", "-")}"]`
			);
			if (similarElements.length > 0) {
				fieldInfo.similarFound = Array.from(similarElements).map((el) => ({
					id: el.id,
					tagName: el.tagName.toLowerCase(),
				}));
				fieldInfo.problems.push(
					`Ähnliche Elemente gefunden: ${fieldInfo.similarFound
						.map((s) => s.id)
						.join(", ")}`
				);
			}
		}

		return fieldInfo;
	},

	identifyStructureProblems(results) {
		console.log("\n🔍 STRUKTURPROBLEME IDENTIFIZIEREN");
		console.log("=================================");

		let problemCount = 0;

		// Problem 1: Fehlende Container
		results.containers.forEach((container) => {
			if (!container.exists) {
				results.structureProblems.push(
					`❌ Container ${container.selector} nicht im DOM gefunden`
				);
				results.recommendations.push(
					`🔧 Prüfe ob ${container.selector} korrekt im HTML definiert ist`
				);
				problemCount++;
			}
		});

		// Problem 2: Tiles ohne korrekte Struktur
		results.tiles.forEach((tile) => {
			if (!tile.hasCorrectClass) {
				results.structureProblems.push(
					`❌ Tile ${tile.index} hat keine 'hangar-tile' Klasse`
				);
				results.recommendations.push(
					`🔧 Füge 'hangar-tile' Klasse zu Tile ${tile.index} hinzu`
				);
				problemCount++;
			}

			if (!tile.inferredTileId) {
				results.structureProblems.push(
					`❌ Tile ${tile.index} hat keine identifizierbare ID`
				);
				results.recommendations.push(
					`🔧 Setze data-tile-id oder tile-{id} ID für Tile ${tile.index}`
				);
				problemCount++;
			}

			// Felder-Probleme
			Object.values(tile.fields).forEach((field) => {
				if (field && field.problems.length > 0) {
					field.problems.forEach((problem) => {
						results.structureProblems.push(
							`❌ ${field.name} in Tile ${
								tile.inferredTileId || tile.index
							}: ${problem}`
						);
						problemCount++;
					});
				}
			});
		});

		// Problem 3: Inkonsistente ID-Patterns
		const idPatterns = [];
		results.tiles.forEach((tile) => {
			Object.values(tile.fields).forEach((field) => {
				if (field && field.found) {
					idPatterns.push(field.expectedId);
				}
			});
		});

		// Prüfe auf Duplikate
		const duplicates = idPatterns.filter(
			(item, index) => idPatterns.indexOf(item) !== index
		);
		if (duplicates.length > 0) {
			results.structureProblems.push(
				`❌ Doppelte IDs gefunden: ${[...new Set(duplicates)].join(", ")}`
			);
			results.recommendations.push(
				`🔧 Stelle sicher, dass alle Element-IDs eindeutig sind`
			);
			problemCount++;
		}

		console.log(`🔍 Insgesamt ${problemCount} Strukturprobleme identifiziert`);

		return results;
	},

	// Generiere HTML-Reparatur-Vorschläge
	generateRepairSuggestions(results) {
		console.log("\n🛠️ REPARATUR-VORSCHLÄGE");
		console.log("======================");

		const suggestions = [];

		results.tiles.forEach((tile) => {
			if (!tile.inferredTileId) {
				suggestions.push({
					type: "missing-tile-id",
					tile: tile.index,
					suggestion: `Füge data-tile-id="${tile.index + 1}" zum Tile hinzu`,
					code: `<div class="hangar-tile" data-tile-id="${tile.index + 1}">`,
				});
			}

			Object.entries(tile.fields).forEach(([fieldKey, field]) => {
				if (field && !field.found && field.expectedId) {
					let htmlSuggestion = "";

					if (fieldKey === "arrivalTime" || fieldKey === "departureTime") {
						htmlSuggestion = `<input type="text" id="${field.expectedId}" class="info-input" placeholder="--:--" maxlength="5" pattern="[0-9]{2}:[0-9]{2}" />`;
					} else if (
						fieldKey === "hangarPosition" ||
						fieldKey === "positionInfoGrid"
					) {
						htmlSuggestion = `<input type="text" id="${field.expectedId}" placeholder="Position" />`;
					} else if (fieldKey === "status") {
						htmlSuggestion = `<select id="${field.expectedId}" class="status-selector"><option value="neutral"></option><option value="ready">Ready</option><option value="maintenance">MX</option><option value="aog">AOG</option></select>`;
					}

					suggestions.push({
						type: "missing-field",
						field: field.name,
						tile: tile.inferredTileId || tile.index,
						suggestion: `Füge ${field.name} Feld hinzu`,
						code: htmlSuggestion,
					});
				}
			});
		});

		suggestions.forEach((suggestion, index) => {
			console.log(`${index + 1}. ${suggestion.suggestion}`);
			if (suggestion.code) {
				console.log(`   HTML: ${suggestion.code}`);
			}
		});

		return suggestions;
	},

	// Vollständige HTML-Struktur-Analyse
	runCompleteHtmlAnalysis() {
		console.log("🏗️ VOLLSTÄNDIGE HTML-STRUKTUR-ANALYSE");
		console.log("====================================");

		const results = this.analyzeHtmlStructure();
		const suggestions = this.generateRepairSuggestions(results);

		// Zusammenfassung
		console.log("\n📋 ZUSAMMENFASSUNG:");
		console.log("==================");
		console.log(
			`✅ Container funktional: ${
				results.containers.filter((c) => c.exists).length
			}/${results.containers.length}`
		);
		console.log(`✅ Tiles gefunden: ${results.tiles.length}`);
		console.log(`❌ Strukturprobleme: ${results.structureProblems.length}`);
		console.log(`🛠️ Reparatur-Vorschläge: ${suggestions.length}`);

		if (results.structureProblems.length === 0) {
			console.log("🎉 HTML-Struktur ist vollständig korrekt!");
		} else {
			console.log("\n⚠️ PROBLEME:");
			results.structureProblems.forEach((problem, index) => {
				console.log(`${index + 1}. ${problem}`);
			});
		}

		return { results, suggestions };
	},
};

// Einfache API
window.htmlCheck = {
	checkStructure: () => window.htmlStructureAnalysis.runCompleteHtmlAnalysis(),
	checkTile: (tileIndex) => {
		const tiles = document.querySelectorAll(".hangar-tile");
		if (tiles[tileIndex]) {
			return window.htmlStructureAnalysis.analyzeTileStructure(
				tiles[tileIndex],
				tileIndex,
				"manual"
			);
		} else {
			console.log(`❌ Tile ${tileIndex} nicht gefunden`);
		}
	},
};

console.log("🏗️ HTML-Struktur-Analyse geladen");
console.log(
	"📞 Verwende window.htmlStructureAnalysis.runCompleteHtmlAnalysis() für vollständige Analyse"
);
console.log("📞 Verwende window.htmlCheck.checkStructure() für Schnelltest");

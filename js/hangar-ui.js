/**
 * hangar-ui.js
 * Enthält UI-bezogene Funktionen, Einstellungen und Rendering-Logik
 */

// UI-Einstellungen Modul
const uiSettings = {
	tilesCount: 8,
	secondaryTilesCount: 0,
	layout: 4,

	// Lädt Einstellungen aus dem LocalStorage (beibehalten)
	load: async function () {
		try {
			// Aus localStorage laden
			const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
			if (savedSettingsJSON) {
				const settings = JSON.parse(savedSettingsJSON);
				this.tilesCount = settings.tilesCount || 8;
				this.secondaryTilesCount = settings.secondaryTilesCount || 0;
				this.layout = settings.layout || 4;

				// UI-Elemente aktualisieren
				this.updateUIControls();

				// Kachelwerte anwenden, falls vorhanden
				if (settings.tileValues && Array.isArray(settings.tileValues)) {
					this.applyTileValues(settings.tileValues);
				}

				console.log("Einstellungen aus LocalStorage geladen");
				return true;
			}
		} catch (error) {
			console.error(
				"Fehler beim Laden der Einstellungen aus LocalStorage:",
				error
			);
		}
		return false;
	},

	// Speichert Einstellungen in localStorage (beibehalten) und optional als Datei
	save: async function (exportToFile = false) {
		try {
			// Aktuelle Werte aus den Eingabefeldern holen
			if (checkElement("tilesCount")) {
				this.tilesCount =
					parseInt(document.getElementById("tilesCount").value) || 8;
			}
			if (checkElement("secondaryTilesCount")) {
				this.secondaryTilesCount =
					parseInt(document.getElementById("secondaryTilesCount").value) || 0;
			}
			if (checkElement("layoutType")) {
				this.layout =
					parseInt(document.getElementById("layoutType").value) || 4;
			}

			// Alle Kacheln sammeln (primäre und sekundäre)
			const tileValues = [];

			// Sammle Daten von primären Kacheln
			this.collectTileValues("#hangarGrid", tileValues, 1);

			// Sammle Daten von sekundären Kacheln
			this.collectTileValues("#secondaryHangarGrid", tileValues, 101);

			// Einstellungsobjekt erstellen
			const settingsData = {
				tilesCount: this.tilesCount,
				secondaryTilesCount: this.secondaryTilesCount,
				layout: this.layout,
				tileValues: tileValues,
				lastSaved: new Date().toISOString(),
			};

			// Im LocalStorage speichern
			localStorage.setItem(
				"hangarPlannerSettings",
				JSON.stringify(settingsData)
			);
			console.log("Einstellungen im LocalStorage gespeichert");

			// Optional als Datei exportieren wenn gewünscht
			if (exportToFile && window.fileManager) {
				const fileName = "HangarPlan_Settings";

				try {
					await window.fileManager.saveProject({
						metadata: {
							projectName: "HangarPlan_Settings",
							exportDate: new Date().toISOString(),
						},
						settings: settingsData,
					});

					showNotification("Einstellungen erfolgreich gespeichert!", "success");
				} catch (error) {
					if (error.name !== "AbortError") {
						console.error("Fehler beim Speichern der Einstellungen:", error);
						showNotification(
							`Fehler beim Speichern: ${error.message}`,
							"error"
						);
					}
				}
			}
			return true;
		} catch (error) {
			console.error("Fehler beim Speichern der Einstellungen:", error);
			showNotification(`Fehler beim Speichern: ${error.message}`, "error");
			return false;
		}
	},

	// Wendet die Einstellungen auf die UI an
	apply: function () {
		try {
			// Grid-Layout für primäre Kacheln aktualisieren
			const hangarGrid = document.getElementById("hangarGrid");
			if (hangarGrid) {
				hangarGrid.className = `grid gap-[var(--grid-gap)]`;
				hangarGrid.style.gridTemplateColumns = `repeat(${this.layout}, minmax(var(--card-min-width), 1fr))`;
			} else {
				console.error("Element 'hangarGrid' nicht gefunden!");
			}

			// Kacheln ein-/ausblenden basierend auf der gewählten Anzahl
			const cells = document.querySelectorAll("#hangarGrid .hangar-cell");
			cells.forEach((cell, index) => {
				if (index < this.tilesCount) {
					cell.classList.remove("hidden");
				} else {
					cell.classList.add("hidden");
				}
			});

			// Sekundäre Kacheln aktualisieren
			updateSecondaryTiles(this.secondaryTilesCount, this.layout);

			// Skalierung nach Layoutänderung neu berechnen
			setTimeout(adjustScaling, 50);
			return true;
		} catch (error) {
			console.error("Fehler beim Anwenden der Einstellungen:", error);
			return false;
		}
	},

	// Hilfsmethode zum Sammeln von Kachelwerten
	collectTileValues: function (containerSelector, tileValues, baseIndex) {
		const container = document.querySelector(containerSelector);
		if (!container) return;

		const cells = container.querySelectorAll(".hangar-cell");

		cells.forEach((cell, index) => {
			const cellId = baseIndex + index;

			// Position-Input finden - immer über die spezifische ID
			const positionInput = document.getElementById(
				`hangar-position-${cellId}`
			);

			// Manuelles Eingabefeld finden - immer zuerst über die spezifische ID
			const manualInput = document.getElementById(`manual-input-${cellId}`);

			// Wenn manualInput nicht gefunden wurde, versuche es über Klassennamen/Attribut
			const fallbackManualInput = !manualInput
				? cell.querySelector('input[placeholder="Manual Input"]')
				: null;

			// Stelle sicher, dass wir tatsächlich einen Wert haben, bevor wir ihn speichern
			const manualInputValue = manualInput
				? manualInput.value
				: fallbackManualInput
				? fallbackManualInput.value
				: "";

			const positionValue = positionInput ? positionInput.value : "";

			// Debug-Ausgabe zur Fehlersuche
			debug(
				`Sammle Daten für Kachel ${cellId}: Position=${positionValue}, Manual=${manualInputValue}`
			);

			// Immer speichern, auch wenn keine Werte vorhanden sind
			tileValues.push({
				cellId: cellId,
				position: positionValue || "",
				manualInput: manualInputValue || "",
			});
		});

		debug(`${cells.length} Kacheln aus ${containerSelector} verarbeitet`);
	},

	// Aktualisiert die UI-Steuerelemente
	updateUIControls: function () {
		if (checkElement("tilesCount")) {
			document.getElementById("tilesCount").value = this.tilesCount;
		}
		if (checkElement("secondaryTilesCount")) {
			document.getElementById("secondaryTilesCount").value =
				this.secondaryTilesCount;
		}
		if (checkElement("layoutType")) {
			document.getElementById("layoutType").value = this.layout;
		}
	},

	// Wendet geladene Kachelwerte auf die UI an
	applyTileValues: function (tileValues) {
		// Für jede gespeicherte Kachel die Werte setzen
		tileValues.forEach((tileValue) => {
			// Position setzen
			const positionInput = document.getElementById(
				`hangar-position-${tileValue.cellId}`
			);
			if (positionInput) {
				positionInput.value = tileValue.position || "";
				// Debug-Ausgabe hinzufügen
				debug(
					`Position für Kachel ${tileValue.cellId} erfolgreich gesetzt: ${tileValue.position}`
				);
			} else {
				// Wenn Element nicht gefunden, verzögert erneut versuchen
				debug(
					`Position für Kachel ${tileValue.cellId} konnte initial nicht gesetzt werden, versuche verzögert`
				);
				setTimeout(() => {
					const delayedPositionInput = document.getElementById(
						`hangar-position-${tileValue.cellId}`
					);
					if (delayedPositionInput) {
						delayedPositionInput.value = tileValue.position || "";
						debug(
							`Position für Kachel ${tileValue.cellId} verzögert gesetzt: ${tileValue.position}`
						);
					} else {
						console.warn(
							`Positionsfeld für Kachel ${tileValue.cellId} nicht gefunden!`
						);
					}
				}, 500);
			}

			// Manuelle Eingabe setzen - explizit über ID
			const manualInput = document.getElementById(
				`manual-input-${tileValue.cellId}`
			);
			if (manualInput) {
				manualInput.value = tileValue.manualInput || "";
				console.log(
					`Manuelle Eingabe für Kachel ${tileValue.cellId} geladen: ${tileValue.manualInput}`
				);
			} else {
				// Fallback: Suche nach dem manuellen Eingabefeld im jeweiligen Container
				const container =
					tileValue.cellId < 100 ? "#hangarGrid" : "#secondaryHangarGrid";
				const index =
					tileValue.cellId < 100 ? tileValue.cellId : tileValue.cellId - 100;

				const cells = document.querySelectorAll(`${container} .hangar-cell`);
				if (cells.length >= index) {
					const fallbackManualInput = cells[index - 1].querySelector(
						'input[placeholder="Manual Input"]'
					);
					if (fallbackManualInput) {
						fallbackManualInput.value = tileValue.manualInput || "";
						console.log(
							`Fallback: Manuelle Eingabe für Kachel ${tileValue.cellId} geladen: ${tileValue.manualInput}`
						);

						// Gleich die ID setzen für zukünftige Verwendung
						if (!fallbackManualInput.id) {
							fallbackManualInput.id = `manual-input-${tileValue.cellId}`;
						}
					}
				}
			}
		});
	},
};

/**
 * Aktualisiert die sekundären Kacheln basierend auf der eingestellten Anzahl
 * @param {number} count - Anzahl der sekundären Kacheln
 * @param {number} layout - Anzahl der Spalten
 */
function updateSecondaryTiles(count, layout) {
	const secondaryGrid = document.getElementById("secondaryHangarGrid");
	if (!secondaryGrid) {
		console.error("Sekundärer Grid-Container nicht gefunden");
		return;
	}

	// Leere den Container
	secondaryGrid.innerHTML = "";

	// Sichtbarkeit der sekundären Sektion steuern
	toggleSecondarySection(count > 0);

	// Wenn keine sekundären Kacheln, früh beenden
	if (count <= 0) return;

	// Template für sekundäre Kacheln basierend auf der ersten primären Kachel erstellen
	const templateCell = document.querySelector("#hangarGrid .hangar-cell");
	if (!templateCell) {
		console.error("Keine Vorlage für sekundäre Kacheln gefunden");
		return;
	}

	// Erstelle die gewünschte Anzahl an sekundären Kacheln
	for (let i = 0; i < count; i++) {
		const cellId = 101 + i; // Start bei 101 für sekundäre Kacheln

		// Klone die Vorlage-Kachel
		const cellClone = templateCell.cloneNode(true);

		// Spezifische Anpassungen für sekundäre Kacheln
		// Position-Input finden oder ggf. erstellen
		const posInput = cellClone.querySelector('input[id^="hangar-position-"]');
		if (posInput) {
			posInput.id = `hangar-position-${cellId}`;
			posInput.value = ""; // Leeres Feld für neue sekundäre Kacheln
		} else {
			console.warn(
				`Position-Input in Template für Kachel ${cellId} nicht gefunden`
			);
			// Da dies später in updateCellAttributes behandelt wird, lassen wir es hier bei der Warnung
		}

		// IDs und andere Attribute aktualisieren
		updateCellAttributes(cellClone, cellId);

		// Füge die Kachel zum sekundären Grid hinzu
		secondaryGrid.appendChild(cellClone);
	}

	// Initialisiere Status-Handler für neue Kacheln
	setupSecondaryTileEventListeners();

	// Verzögertes Anwenden der gespeicherten Werte auf sekundäre Kacheln
	setTimeout(() => {
		loadSecondaryTileValues();

		// Trigger ein CustomEvent, um andere Komponenten zu informieren, dass sekundäre Kacheln erstellt wurden
		const event = new CustomEvent("secondaryTilesCreated", {
			detail: { count: count },
		});
		document.dispatchEvent(event);
	}, 200);
}

/**
 * Lädt speziell die Positionswerte für sekundäre Kacheln
 */
function loadSecondaryTileValues() {
	const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
	if (!savedSettingsJSON) return;

	try {
		const settings = JSON.parse(savedSettingsJSON);
		if (!settings.tileValues || !Array.isArray(settings.tileValues)) return;

		// Filtere nur die sekundären Kacheln (ID >= 101)
		const secondaryTileValues = settings.tileValues.filter(
			(tile) => tile.cellId >= 101
		);
		console.log(`Lade ${secondaryTileValues.length} sekundäre Kachelwerte`);

		// Wende Werte auf sekundäre Kacheln an
		secondaryTileValues.forEach((tileValue) => {
			const posInput = document.getElementById(
				`hangar-position-${tileValue.cellId}`
			);
			if (posInput && tileValue.position) {
				posInput.value = tileValue.position;
				console.log(
					`Sekundäre Position für Kachel ${tileValue.cellId} gesetzt: ${tileValue.position}`
				);
			} else if (!posInput && tileValue.position) {
				// Wenn das Element nicht gefunden wurde, speichern wir die Info für spätere Versuche
				console.warn(
					`Element für sekundäre Kachel ${tileValue.cellId} noch nicht gefunden, merke Position: ${tileValue.position}`
				);

				// Verzögerter erneuter Versuch
				setTimeout(() => {
					const delayedInput = document.getElementById(
						`hangar-position-${tileValue.cellId}`
					);
					if (delayedInput) {
						delayedInput.value = tileValue.position;
						console.log(
							`Verzögert: Sekundäre Position für Kachel ${tileValue.cellId} gesetzt: ${tileValue.position}`
						);
					}
				}, 300);
			} else {
				console.warn(
					`Konnte Position für sekundäre Kachel ${tileValue.cellId} nicht setzen, Element nicht gefunden oder kein Wert vorhanden`
				);
			}
		});
	} catch (error) {
		console.error("Fehler beim Laden der sekundären Kachelwerte:", error);
	}
}

/**
 * Aktualisiert die Attribute einer Kachel
 * @param {HTMLElement} cell - Die zu aktualisierende Kachel
 * @param {number} cellId - ID für die Kachel
 */
function updateCellAttributes(cell, cellId) {
	// Aktualisiere ID-basierte Attribute in allen Unterelementen
	const elements = cell.querySelectorAll("[id]");
	elements.forEach((element) => {
		const oldId = element.id;
		const base = oldId.split("-")[0]; // z.B. 'aircraft', 'status'
		element.id = `${base}-${cellId}`;

		// Wenn es ein Status-Select ist, setzen wir die Eventhandler neu
		if (base === "status") {
			element.onchange = function () {
				updateStatusLights(cellId);
			};
		}
	});

	// Aktualisiere data-cell Attribute für Status-Lichter
	const statusLights = cell.querySelectorAll(".status-light");
	statusLights.forEach((light) => {
		light.setAttribute("data-cell", cellId);
	});

	// Verbesserte Suche nach dem Positionseingabefeld - wichtig für sekundäre Kacheln
	let positionInput = cell.querySelector('input[id^="hangar-position-"]');

	// Wenn mit der alten ID nichts gefunden wurde, versuchen wir es mit anderen Selektoren
	if (!positionInput) {
		// Suche nach dem ersten Textfeld in der Kachel
		const inputs = cell.querySelectorAll('input[type="text"]');
		for (const input of inputs) {
			// Wenn es nicht das Manual Input ist, dann ist es wahrscheinlich das Positionsfeld
			if (!input.placeholder || input.placeholder !== "Manual Input") {
				positionInput = input;
				break;
			}
		}

		// Falls immer noch nichts gefunden wurde, suche nach dem ersten Input im Header
		if (!positionInput) {
			const headerContainer = cell.querySelector(".bg-industrial-medium");
			if (headerContainer) {
				const positionContainer =
					headerContainer.querySelector(".flex.items-center");
				if (positionContainer) {
					positionInput = positionContainer.querySelector("input");
				}
			}
		}
	}

	// Position eingabefeld gefunden - konfigurieren
	if (positionInput) {
		// Standardklassen entfernen und neue zuweisen
		positionInput.classList.remove(
			...Array.from(positionInput.classList).filter((cls) => /^w-\d+/.test(cls))
		);
		positionInput.classList.add("w-16");

		// Explizite ID-Zuweisung und Event-Handler für Position
		positionInput.id = `hangar-position-${cellId}`;
		console.log(`ID für Position-Eingabe gesetzt: ${positionInput.id}`);

		// Alte Event-Listener entfernen, um doppelte Aufrufe zu vermeiden
		positionInput.removeEventListener("blur", positionInput._saveHandler);
		positionInput.removeEventListener("change", positionInput._saveHandler);

		// Event-Handler für automatisches Speichern
		positionInput._saveHandler = function () {
			console.log(`Position in Kachel ${cellId} geändert: ${this.value}`);
			// Speichern mit höherer Priorität
			if (typeof window.hangarUI.uiSettings.save === "function") {
				// Positionswert im localStorage speichern
				const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
				if (savedSettingsJSON) {
					try {
						const settings = JSON.parse(savedSettingsJSON);
						if (settings.tileValues && Array.isArray(settings.tileValues)) {
							// Vorhandene Einträge aktualisieren oder neuen hinzufügen
							const existingTileIndex = settings.tileValues.findIndex(
								(t) => t.cellId === cellId
							);
							if (existingTileIndex >= 0) {
								settings.tileValues[existingTileIndex].position = this.value;
							} else {
								settings.tileValues.push({
									cellId: cellId,
									position: this.value,
									manualInput: "",
								});
							}

							// Aktualisierte Einstellungen im localStorage speichern
							localStorage.setItem(
								"hangarPlannerSettings",
								JSON.stringify(settings)
							);
							console.log(
								`Position für Kachel ${cellId} direkt im localStorage aktualisiert`
							);
						}
					} catch (e) {
						console.error(
							"Fehler beim direkten Aktualisieren der Position:",
							e
						);
					}
				}

				// Vollständiges Speichern mit allen Daten
				setTimeout(() => window.hangarUI.uiSettings.save(), 50);
			}
		};

		// Event-Listener für sofortiges Speichern
		positionInput.addEventListener("blur", positionInput._saveHandler);
		positionInput.addEventListener("change", positionInput._saveHandler);
	} else {
		console.warn(
			`Kein Position-Eingabefeld in Kachel ${cellId} gefunden - versuche ein neues zu erstellen`
		);

		// Versuchen wir ein neues Positionsfeld zu erstellen
		const headerContainer = cell.querySelector(".bg-industrial-medium");
		if (headerContainer) {
			const positionContainer =
				headerContainer.querySelector(".flex.items-center") ||
				headerContainer.querySelector(".position-container");

			if (positionContainer) {
				positionInput = document.createElement("input");
				positionInput.id = `hangar-position-${cellId}`;
				positionInput.type = "text";
				positionInput.className = "w-16 position-field";
				positionInput.placeholder = "Position";

				positionContainer.appendChild(positionInput);

				// Event-Handler für automatisches Speichern
				positionInput.addEventListener("blur", function () {
					console.log(
						`Position in neuer Kachel ${cellId} geändert: ${this.value}`
					);
					if (typeof window.hangarUI.uiSettings.save === "function") {
						setTimeout(() => window.hangarUI.uiSettings.save(), 100);
					}
				});

				console.log(`Neues Positionseingabefeld für Kachel ${cellId} erstellt`);
			}
		}
	}

	// Einheitliche Breite für Manual Input und eindeutige ID + Event-Handler
	const manualInput = cell.querySelector('input[placeholder="Manual Input"]');
	if (manualInput) {
		// Breite setzen
		manualInput.classList.remove(
			...Array.from(manualInput.classList).filter((cls) => /^w-\d+/.test(cls))
		);
		manualInput.classList.add("w-16");

		// Eindeutige ID setzen und sicherstellen, dass sie korrekt ist
		manualInput.id = `manual-input-${cellId}`;
		console.log(`ID für manuelle Eingabe gesetzt: ${manualInput.id}`);

		// Event-Handler für automatisches Speichern hinzufügen
		manualInput.addEventListener("blur", function () {
			console.log(
				`Manuelle Eingabe in Kachel ${cellId} geändert: ${this.value}`
			);
			// Automatisches Speichern auslösen
			if (typeof window.hangarUI.uiSettings.save === "function") {
				setTimeout(() => window.hangarUI.uiSettings.save(), 100);
			}
		});
	}
}

/**
 * Initialisiert Event-Listener für sekundäre Kacheln
 */
function setupSecondaryTileEventListeners() {
	// Status-Selects für sekundäre Kacheln finden und Eventhandler zuweisen
	document
		.querySelectorAll('#secondaryHangarGrid select[id^="status-"]')
		.forEach((select) => {
			const cellId = parseInt(select.id.split("-")[1]);
			select.onchange = function () {
				updateStatusLights(cellId);
			};

			// Initialen Status setzen
			updateStatusLights(cellId);
		});

	// Event-Listener für Position-Eingabefelder in sekundären Kacheln
	document
		.querySelectorAll('#secondaryHangarGrid input[id^="hangar-position-"]')
		.forEach((input) => {
			const cellId = parseInt(input.id.split("-")[2]);
			console.log(
				`Event-Handler für Position in sekundärer Kachel ${cellId} eingerichtet`
			);

			// Event-Handler für automatisches Speichern
			input.addEventListener("blur", function () {
				console.log(
					`Position in sekundärer Kachel ${cellId} geändert: ${this.value}`
				);
				if (typeof window.hangarUI.uiSettings.save === "function") {
					setTimeout(() => window.hangarUI.uiSettings.save(), 100);
				}
			});
		});

	// Event-Listener für manuelle Eingabefelder in sekundären Kacheln
	document
		.querySelectorAll('#secondaryHangarGrid input[placeholder="Manual Input"]')
		.forEach((input) => {
			// ID zuweisen, falls noch nicht vorhanden
			const cellId = parseInt(
				input
					.closest(".hangar-cell")
					.querySelector('[id^="status-"]')
					.id.split("-")[1]
			);
			if (!input.id) input.id = `manual-input-${cellId}`;

			// Event-Handler für automatisches Speichern
			input.addEventListener("blur", function () {
				console.log(
					`Manuelle Eingabe in sekundärer Kachel ${cellId} geändert: ${this.value}`
				);
				if (typeof window.hangarUI.uiSettings.save === "function") {
					setTimeout(() => window.hangarUI.uiSettings.save(), 100);
				}
			});
		});
}

/**
 * Verbesserte Funktion zur dynamischen Anpassung der Grid-Abstände ohne Skalierung der Kacheln
 */
function adjustScaling() {
	try {
		const isSidebarCollapsed =
			document.body.classList.contains("sidebar-collapsed");
		const windowWidth = window.innerWidth;
		const sidebarWidth = isSidebarCollapsed ? 0 : 300;
		const availableWidth = windowWidth - sidebarWidth;

		// Content-Container Breite anpassen
		const contentContainer = document.querySelector(".content-container");
		if (contentContainer) {
			contentContainer.style.width = `${availableWidth}px`;
			contentContainer.style.maxWidth = `${availableWidth}px`;
		}

		// Konstante Sektionsabstände definieren (kein Skalierungsfaktor mehr)
		const sectionSpacing = 16; // Fester Wert für alle Sektionsabstände
		document.documentElement.style.setProperty(
			"--section-spacing",
			`${sectionSpacing}px`
		);
		document.documentElement.style.setProperty(
			"--fixed-section-spacing",
			`${sectionSpacing}px`
		);

		// Grid-Abstände dynamisch anpassen ohne Skalierung der Kacheln
		let gridGap;
		if (availableWidth > 1800) gridGap = 20;
		else if (availableWidth > 1650) gridGap = 16;
		else if (availableWidth > 1500) gridGap = 14;
		else if (availableWidth > 1350) gridGap = 12;
		else if (availableWidth > 1200) gridGap = 10;
		else gridGap = 8;

		document.documentElement.style.setProperty("--grid-gap", `${gridGap}px`);

		// WICHTIG: Feste Kachelgrößen definieren - nicht mehr dynamisch
		const cardBaseWidth = 180; // Erhöhte feste Basisgröße
		const cardMinWidth = 180; // Garantierte Mindestbreite
		const cardMaxWidth = 280; // Maximale Breite begrenzen

		document.documentElement.style.setProperty(
			"--card-base-width",
			`${cardBaseWidth}px`
		);
		document.documentElement.style.setProperty(
			"--card-min-width",
			`${cardMinWidth}px`
		);

		// Grid-Layout dynamisch anpassen basierend auf verfügbarer Breite
		// Anzahl der Spalten reduzieren statt Kacheln zu verkleinern
		let layout = window.hangarUI.uiSettings.layout || 4;

		// Dynamische Spaltenanzahl basierend auf verfügbarer Breite
		// und Mindestgröße der Kacheln berechnen
		const maxColumns = Math.floor(
			(availableWidth - gridGap) / (cardMinWidth + gridGap)
		);
		layout = Math.min(layout, Math.max(1, maxColumns));

		const hangarGrid = document.getElementById("hangarGrid");
		const secondaryGrid = document.getElementById("secondaryHangarGrid");

		// Gemeinsame Eigenschaften für beide Grids - Keine Skalierung mehr
		const gridConfig = {
			transform: "none", // Kein Skalieren mehr
			width: "100%", // Volle Breite ohne Skalierungskompensation
			gridTemplateColumns: `repeat(${layout}, minmax(${cardMinWidth}px, ${cardMaxWidth}px))`, // Feste Größen
			gap: `${gridGap}px`,
			display: "grid",
			justifyContent: "center", // Horizontale Zentrierung des Grids
			margin: "0 auto", // Zusätzliche Zentrierung im Container
		};

		// Primären Grid konfigurieren
		if (hangarGrid) {
			Object.assign(hangarGrid.style, gridConfig);
		}

		// Sekundären Grid identisch konfigurieren
		if (secondaryGrid && secondaryGrid.style.display !== "none") {
			Object.assign(secondaryGrid.style, gridConfig);
		}

		// Direkte Kachelgrößen beibehalten mit festen Werten
		applyTileSizes(cardMinWidth, cardMaxWidth);

		// Verbesserte Behandlung des Section Dividers - konsistente Abstände
		const sectionDivider = document.querySelector(".section-divider");
		if (sectionDivider) {
			sectionDivider.style.margin = `${sectionSpacing}px 0`;
			sectionDivider.style.transform = "none";
		}

		// Konsistente Abstände für alle Sektionsbeschriftungen
		const sectionLabels = document.querySelectorAll(".section-label");
		sectionLabels.forEach((label) => {
			if (!label.classList.contains("section-label-first")) {
				label.style.marginTop = `${sectionSpacing}px`;
			}
			label.style.marginBottom = `${sectionSpacing}px`;
		});

		// Sekundäre Sektion mit gleichem Abstand
		const secondarySection = document.querySelector(
			".section-container:nth-of-type(2)"
		);
		if (secondarySection) {
			secondarySection.style.marginTop = `${sectionSpacing}px`;
		}

		// Nach dem Toggle-Zustand der Sidebar prüfen und visuell anpassen
		const menuToggleBtn = document.getElementById("menuToggle");
		if (menuToggleBtn) {
			if (isSidebarCollapsed) {
				menuToggleBtn.classList.add("rotated");
			} else {
				menuToggleBtn.classList.remove("rotated");
			}
		}

		// Manual Inputs anpassen (ohne Skalierung, nur responsives Layout)
		adjustManualInputWidths();
	} catch (error) {
		console.error("Fehler bei der Layout-Anpassung:", error);
	}
}

/**
 * Wendet die Größenanpassungen direkt auf Kacheln an
 * @param {number} minWidth - Minimale Breite für Kacheln
 * @param {number} maxWidth - Maximale Breite für Kacheln
 */
function applyTileSizes(minWidth, maxWidth) {
	try {
		// Alle Kacheln auswählen
		const cells = document.querySelectorAll(".hangar-cell");

		cells.forEach((cell) => {
			// Feste Größen zuweisen ohne Skalierung
			cell.style.minWidth = `${minWidth}px`;
			cell.style.width = "100%";
			cell.style.maxWidth = `${maxWidth}px`;

			// Flex-Basis auf auto für besseres Grid-Verhalten
			cell.style.flexBasis = "auto";

			// Zentrieren in der Zelle
			cell.style.margin = "0 auto";
			cell.style.justifySelf = "center";

			// Kompaktere innere Abstände für kleinere Kacheln
			const contentDiv = cell.querySelector("div.p-4");
			if (contentDiv) {
				contentDiv.style.padding = "0.75rem";
			}

			// Vergrößerte Schriftgrößen für Aircraft ID
			const aircraftId = cell.querySelector(".aircraft-id");
			if (aircraftId) {
				aircraftId.style.fontSize = "1.2rem"; // Größere Schriftgröße
				aircraftId.style.fontWeight = "600"; // Etwas fettere Schrift
				aircraftId.style.padding = "0.4rem"; // Mehr Polsterung
				aircraftId.style.marginBottom = "0.6rem"; // Mehr Abstand nach unten
				aircraftId.style.color = "#2d3142"; // Dunklere Farbe für besseren Kontrast
			}

			// Manual Input entfernen falls vorhanden (wie vom User gewünscht)
			const manualInput = cell.querySelector(
				'input[placeholder="Manual Input"]'
			);
			if (manualInput) {
				const headerContainer = manualInput.closest(".bg-industrial-medium");
				if (headerContainer) {
					manualInput.remove();
				}
			}

			// Notes-Labels entfernen und als Placeholder setzen
			const notesContainer = cell.querySelector(".notes-container");
			if (notesContainer) {
				const label = notesContainer.querySelector("label");
				if (label) {
					label.remove();
				}

				const textarea = notesContainer.querySelector("textarea");
				if (textarea) {
					textarea.setAttribute("placeholder", "Notizen eingeben...");
				}
			}
		});
	} catch (error) {
		console.error("Fehler bei der Größenanpassung der Kacheln:", error);
	}
}

/**
 * Steuert die Sichtbarkeit der sekundären Sektion
 * @param {boolean} show - Ob die sekundäre Sektion angezeigt werden soll
 */
function toggleSecondarySection(show) {
	const secondarySection = document.querySelector(
		".section-container:nth-of-type(2)"
	);
	const sectionDivider = document.querySelector(".section-divider");

	if (secondarySection) {
		secondarySection.style.display = show ? "block" : "none";
	}

	if (sectionDivider) {
		sectionDivider.style.display = show ? "block" : "none";
	}

	console.log(`Sekundäre Sektion ${show ? "eingeblendet" : "ausgeblendet"}`);
}

/**
 * Aktualisiert die Statuslichter basierend auf der ausgewählten Option
 * @param {number} cellId - ID der Kachel
 */
function updateStatusLights(cellId) {
	try {
		// Status-Auswahl finden
		const statusSelect = document.getElementById(`status-${cellId}`);
		if (!statusSelect) return;

		const selectedStatus = statusSelect.value;

		// Statuslicht für diese Kachel finden
		const statusLight = document.querySelector(
			`.status-light[data-cell="${cellId}"]`
		);

		if (statusLight) {
			// Alle Status-Klassen entfernen
			statusLight.classList.remove(
				"status-ready",
				"status-maintenance",
				"status-aog"
			);
			// Neue Status-Klasse hinzufügen
			statusLight.classList.add(`status-${selectedStatus}`);
			// Status-Attribut aktualisieren
			statusLight.setAttribute("data-status", selectedStatus);
		}
	} catch (error) {
		console.error(
			`Fehler beim Aktualisieren des Statuslichts für Kachel ${cellId}:`,
			error
		);
	}
}

/**
 * Hilfsfunktion zur Überprüfung der Existenz von DOM-Elementen
 * @param {string} elementId - ID des Elements
 * @returns {boolean} - Ob das Element existiert
 */
function checkElement(elementId) {
	return document.getElementById(elementId) !== null;
}

/**
 * Debug-Funktion für Konsolen-Ausgaben
 * @param {string} message - Die auszugebende Nachricht
 */
function debug(message) {
	if (localStorage.getItem("debugMode") === "true") {
		console.log(`[DEBUG] ${message}`);
	}
}

/**
 * Angepasste Funktion für die Breite der Manual Input Felder
 */
function adjustManualInputWidths() {
	try {
		const manualInputs = document.querySelectorAll(
			'input[placeholder="Manual Input"]'
		);
		const windowWidth = window.innerWidth;

		manualInputs.forEach((input) => {
			const headerContainer = input.closest(".bg-industrial-medium");
			const statusContainer =
				headerContainer.querySelector(".status-container");
			const positionContainer =
				headerContainer.querySelector(".flex.items-center");

			// Kleinere Breakpoint-Schwelle für frühere Umschaltung zum Stapellayout
			if (windowWidth < 1450) {
				// Bei kleinen Bildschirmen: Volle Breite unter den anderen Elementen
				headerContainer.style.flexDirection = "column";
				headerContainer.style.alignItems = "stretch";
				input.style.width = "100%";
				input.style.marginTop = "3px";
			} else {
				// Berechne verfügbaren Platz für manuelle Eingabe
				if (headerContainer && statusContainer && positionContainer) {
					const headerWidth = headerContainer.offsetWidth;
					const statusWidth = statusContainer.offsetWidth;
					const positionWidth = positionContainer.offsetWidth;

					// Weniger Platz für Padding reservieren
					const availableWidth = headerWidth - statusWidth - positionWidth - 20;
					input.style.width = `${Math.max(32, availableWidth)}px`;
					input.style.marginTop = "0";
				}
			}
		});
	} catch (error) {
		console.error("Fehler bei der Anpassung der Manual Inputs:", error);
	}
}

// Exportiere alle benötigten Funktionen und Module
window.hangarUI = {
	uiSettings,
	updateSecondaryTiles,
	updateCellAttributes,
	setupSecondaryTileEventListeners,
	adjustScaling,
	applyTileSizes,
	toggleSecondarySection,
	updateStatusLights,
	checkElement,
	debug,
	adjustManualInputWidths,
	initSectionLayout: function () {
		const firstSectionLabel = document.querySelector(
			".section-label:first-of-type"
		);
		if (firstSectionLabel) {
			firstSectionLabel.classList.add("section-label-first");
		}

		// Initiale Anpassung der Skalierung vornehmen
		window.hangarUI.adjustScaling();

		// Event Listener für Resize hinzufügen
		window.addEventListener(
			"resize",
			debounce(function () {
				window.hangarUI.adjustScaling();
			}, 250)
		);

		// Timeout für verzögerte Anwendung der Skalierung nach vollständigem Rendering
		setTimeout(() => {
			window.hangarUI.adjustScaling();
			// Zweiten Aufruf für bessere Browser-Kompatibilität nach kurzem Delay
			setTimeout(() => window.hangarUI.adjustScaling(), 200);
		}, 100);
	},
};

/**
 * Einfache Debounce-Funktion für Performance-Optimierung
 */
function debounce(func, wait) {
	let timeout;
	return function () {
		const context = this,
			args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), wait);
	};
}

/**
 * Sucht nach einem Flugzeug anhand der Aircraft ID und hebt die entsprechende Karte hervor
 */
function searchAircraft() {
	try {
		const searchTerm = document
			.getElementById("searchAircraft")
			.value.trim()
			.toLowerCase();
		if (!searchTerm) {
			// Bei leerem Suchbegriff alle Hervorhebungen zurücksetzen
			resetHighlighting();
			return;
		}

		const foundElement = findAircraftElement(searchTerm);
		if (foundElement) {
			highlightFoundElement(foundElement);
		} else {
			showNotFoundMessage(searchTerm);
		}
	} catch (error) {
		console.error("Fehler bei der Flugzeugsuche:", error);
	}
}

/**
 * Findet das HTML-Element, das die gesuchte Aircraft ID enthält
 * @param {string} searchTerm - Der Suchbegriff (lowercase)
 * @returns {HTMLElement|null} - Das gefundene Element oder null
 */
function findAircraftElement(searchTerm) {
	// Zuerst im Hauptgrid suchen
	let found = searchInGrid("hangarGrid", searchTerm);

	// Wenn nicht gefunden, im sekundären Grid suchen
	if (!found) {
		found = searchInGrid("secondaryHangarGrid", searchTerm);
	}

	return found;
}

/**
 * Durchsucht ein Grid nach einer Aircraft ID
 * @param {string} gridId - Die ID des Grids
 * @param {string} searchTerm - Der Suchbegriff (lowercase)
 * @returns {HTMLElement|null} - Das gefundene Element oder null
 */
function searchInGrid(gridId, searchTerm) {
	const grid = document.getElementById(gridId);
	if (!grid) return null;

	const aircraftInputs = grid.querySelectorAll('input[id^="aircraft-"]');
	for (const input of aircraftInputs) {
		const value = input.value.toLowerCase();
		if (value.includes(searchTerm)) {
			return input.closest(".hangar-cell");
		}
	}

	return null;
}

/**
 * Hebt das gefundene Element hervor
 * @param {HTMLElement} element - Das hervorzuhebende Element
 */
function highlightFoundElement(element) {
	// Zuerst alle Hervorhebungen zurücksetzen
	resetHighlighting();

	// Element hervorheben
	element.classList.add("search-highlight");

	// Temporärer Stil für die Hervorhebung hinzufügen, falls noch nicht vorhanden
	addHighlightStyle();

	// Element ins Sichtfeld scrollen
	element.scrollIntoView({
		behavior: "smooth",
		block: "center",
	});

	// Blinkeffekt für bessere Sichtbarkeit
	let blinkCount = 0;
	const blinkInterval = setInterval(() => {
		element.classList.toggle("search-blink");
		blinkCount++;

		if (blinkCount >= 6) {
			// 3 volle Blinkzyklen
			clearInterval(blinkInterval);
			element.classList.remove("search-blink");
		}
	}, 300);

	// NEU: Nach 2 Sekunden automatisch die Hervorhebung zurücksetzen
	setTimeout(() => {
		// Blinkeffekt beenden, wenn er noch läuft
		clearInterval(blinkInterval);
		// Alle Hervorhebungen zurücksetzen
		resetHighlighting();
	}, 2000);
}

/**
 * Fügt die CSS-Stile für die Suche hinzu, falls sie noch nicht existieren
 */
function addHighlightStyle() {
	if (!document.getElementById("search-highlight-style")) {
		const style = document.createElement("style");
		style.id = "search-highlight-style";
		style.textContent = `
            .search-highlight {
                box-shadow: 0 0 0 3px #FF7043, 8px 8px 12px rgba(166, 166, 185, 0.25),
                -8px -8px 12px rgba(255, 255, 255, 0.7) !important;
                z-index: 10;
                position: relative;
            }
            
            .search-blink {
                background-color: rgba(255, 112, 67, 0.1) !important;
            }
            
            .search-not-found {
                color: white;
                background-color: #EF4444;
                padding: 8px;
                border-radius: 4px;
                text-align: center;
                margin-top: 8px;
                animation: fadeOut 3s forwards;
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                z-index: 100;
            }
            
            @keyframes fadeOut {
                0% { opacity: 1; }
                70% { opacity: 1; }
                100% { opacity: 0; visibility: hidden; }
            }
        `;
		document.head.appendChild(style);
	}
}

/**
 * Setzt alle Such-Hervorhebungen zurück
 */
function resetHighlighting() {
	const highlightedElements = document.querySelectorAll(".search-highlight");
	highlightedElements.forEach((el) => {
		el.classList.remove("search-highlight", "search-blink");
	});

	// Auch alle "Nicht gefunden"-Meldungen entfernen
	const notFoundMessages = document.querySelectorAll(".search-not-found");
	notFoundMessages.forEach((el) => el.remove());
}

/**
 * Zeigt eine "Nicht gefunden"-Meldung an
 * @param {string} searchTerm - Der Suchbegriff
 */
function showNotFoundMessage(searchTerm) {
	const container = document.querySelector(".hangar-container");
	if (!container) return;

	const message = document.createElement("div");
	message.className = "search-not-found";
	message.textContent = `Aircraft "${searchTerm}" wurde nicht gefunden`;

	container.appendChild(message);

	// Nach Animation automatisch entfernen
	setTimeout(() => {
		if (message.parentNode) {
			message.parentNode.removeChild(message);
		}
	}, 3000);
}

// Hinzufügen dieser Funktion zur bestehenden Datei

function initializeFlightDataSection() {
	// Finde die Sidebar-Accordion-Content für Flight Data
	const flightDataContent = document.querySelector(
		'.sidebar-accordion-header:has(.sidebar-section-title:contains("Flight Data"))'
	).nextElementSibling;

	if (flightDataContent) {
		// Finde den Button-Container und füge Datumswähler davor ein
		const updateButton = flightDataContent.querySelector("#fetchFlightData");
		const dateInputContainer = document.createElement("div");
		dateInputContainer.className = "flex flex-col space-y-2 mb-3";
		dateInputContainer.innerHTML = `
            <div>
                <label class="text-xs block mb-1">Tag (letzter Flug):</label>
                <input type="date" id="currentDateInput" class="w-full bg-industrial-dark text-white px-2 py-1 rounded form-control">
            </div>
            <div>
                <label class="text-xs block mb-1">Tag (erster Flug):</label>
                <input type="date" id="nextDateInput" class="w-full bg-industrial-dark text-white px-2 py-1 rounded form-control">
            </div>
        `;

		// Füge Container vor dem Button ein
		if (updateButton && updateButton.parentNode) {
			updateButton.parentNode.insertBefore(dateInputContainer, updateButton);
		}
	}
}

// Falls es bereits eine initializeUI-Funktion gibt, diese erweitern:
// Ursprüngliche initializeUI-Funktion
function initializeUI() {
	// Bestehender Code...

	// Initalisiere den Flight Data-Bereich
	initializeFlightDataSection();
}

// Wenn initializeUI nicht definiert ist:
if (typeof window.initializeUI === "undefined") {
	window.initializeUI = initializeUI;
}

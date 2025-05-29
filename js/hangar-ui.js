/**
 * hangar-ui.js
 * Enthält UI-bezogene Funktionen, Einstellungen und Rendering-Logik
 */

// UI-Einstellungen Modul
const uiSettings = {
	tilesCount: 8,
	secondaryTilesCount: 0,
	layout: 4,

	// Lädt Einstellungen aus der Datenbank und fallback auf localStorage
	load: async function () {
		try {
			// Zuerst versuchen, aus der IndexedDB zu laden
			const dbManager = window.databaseManager;
			if (dbManager) {
				try {
					const dbSettings = await dbManager.loadSettings("ui");
					if (dbSettings && dbSettings.data) {
						// Einstellungen aus der Datenbank laden
						this.tilesCount = dbSettings.data.tilesCount || 8;
						this.secondaryTilesCount = dbSettings.data.secondaryTilesCount || 0;
						this.layout = dbSettings.data.layout || 4;

						// UI-Elemente aktualisieren
						this.updateUIControls();

						// Kachelwerte anwenden, falls vorhanden
						if (
							dbSettings.data.tileValues &&
							Array.isArray(dbSettings.data.tileValues)
						) {
							this.applyTileValues(dbSettings.data.tileValues);
						}

						console.log("Einstellungen aus IndexedDB geladen");
						return true;
					}
				} catch (dbError) {
					console.warn(
						"Konnte Einstellungen nicht aus IndexedDB laden, versuche localStorage",
						dbError
					);
				}
			}

			// Fallback: Aus localStorage laden
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

				// Optional: Migrieren zu IndexedDB für zukünftige Verwendung
				this.save(false);

				return true;
			}
		} catch (error) {
			console.error("Fehler beim Laden der Einstellungen:", error);
		}
		return false;
	},

	// Speichert Einstellungen in localStorage und IndexedDB
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

			// Im LocalStorage speichern als Fallback
			localStorage.setItem(
				"hangarPlannerSettings",
				JSON.stringify(settingsData)
			);

			// In IndexedDB speichern
			const dbManager = window.databaseManager;
			if (dbManager) {
				try {
					await dbManager.saveSettings({
						id: "ui", // Konstante ID für UI-Einstellungen
						data: settingsData,
					});
					console.log("Einstellungen in IndexedDB gespeichert");
				} catch (dbError) {
					console.warn(
						"Konnte Einstellungen nicht in IndexedDB speichern:",
						dbError
					);
				}
			}

			// Optional als Datei exportieren wenn gewünscht
			if (exportToFile) {
				const filePaths = {
					settingsDir: "settings",
				};

				const projectName = checkElement("projectName")
					? document.getElementById("projectName").value
					: "HangarPlan";
				const fileName = `${projectName}_Settings`;

				// Prüfe, ob die moderne File System Access API unterstützt wird
				if (window.showSaveFilePicker) {
					// Aktualisierter Pfad zum Speichern der Einstellungen
					const startInDirectory = filePaths.settingsDir;

					// Konfiguriere die Optionen für den File Picker
					const options = {
						suggestedName: `${fileName}.json`,
						types: [
							{
								description: "JSON Settings Files",
								accept: { "application/json": [".json"] },
							},
						],
						// Aktualisierter Startverzeichnis-Pfad für Einstellungen
						startIn: startInDirectory,
					};

					showSaveFilePicker(options)
						.then(async (fileHandle) => {
							const writable = await fileHandle.createWritable();
							await writable.write(JSON.stringify(settingsData, null, 2));
							await writable.close();
							showNotification(
								"Einstellungen erfolgreich gespeichert!",
								"success"
							);
						})
						.catch((error) => {
							if (error.name !== "AbortError") {
								console.error(
									"Fehler beim Speichern mit File System API:",
									error
								);
								// Fallback zum regulären Download
								downloadFile(settingsData, `${fileName}.json`);
								showNotification(
									`Einstellungen wurden heruntergeladen. Bitte in ${filePaths.settingsDir}/ speichern.`,
									"info",
									5000
								);
							}
						});
				} else {
					// Fallback für Browser ohne File System Access API
					downloadFile(settingsData, `${fileName}.json`);
					showNotification(
						`Einstellungen wurden heruntergeladen. Bitte in ${filePaths.settingsDir}/ speichern.`,
						"info",
						5000
					);
				}
			}
			return true;
		} catch (error) {
			console.error("Fehler beim Speichern der Einstellungen:", error);
			showNotification(
				`Fehler beim Speichern der Einstellungen: ${error.message}`,
				"error"
			);
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
			console.log(
				`Sammle Daten für Kachel ${cellId}: Position=${positionValue}, Manual=${manualInputValue}`
			);

			// Wenn mindestens ein Wert vorhanden ist, speichern
			if (positionValue || manualInputValue) {
				tileValues.push({
					cellId: cellId,
					position: positionValue,
					manualInput: manualInputValue,
				});
			}
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

		// IDs und andere Attribute aktualisieren
		updateCellAttributes(cellClone, cellId);

		// Füge die Kachel zum sekundären Grid hinzu
		secondaryGrid.appendChild(cellClone);
	}

	// Initialisiere Status-Handler für neue Kacheln
	setupSecondaryTileEventListeners();
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

	// Einheitliche Breite für Positionseingabefeld (w-16) und spezifische ID setzen
	const positionInput = cell.querySelector('input[id^="hangar-position-"]');
	if (positionInput) {
		positionInput.classList.remove(
			...Array.from(positionInput.classList).filter((cls) => /^w-\d+/.test(cls))
		);
		positionInput.classList.add("w-16");

		// Explizite ID-Zuweisung und Event-Handler für Position
		positionInput.id = `hangar-position-${cellId}`;
		console.log(`ID für Position-Eingabe gesetzt: ${positionInput.id}`);

		// Event-Handler für automatisches Speichern
		positionInput.addEventListener("blur", function () {
			console.log(`Position in Kachel ${cellId} geändert: ${this.value}`);
			// Automatisches Speichern auslösen
			if (typeof window.hangarUI.uiSettings.save === "function") {
				setTimeout(() => window.hangarUI.uiSettings.save(), 100);
			}
		});
	} else {
		console.warn(`Kein Position-Eingabefeld in Kachel ${cellId} gefunden`);
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
 * Verbesserte Funktion zur dynamischen Anpassung der Skalierung und Container-Breite
 */
function adjustScaling() {
	try {
		const isSidebarCollapsed =
			document.body.classList.contains("sidebar-collapsed");
		const windowWidth = window.innerWidth;
		const sidebarWidth = isSidebarCollapsed ? 0 : 290;
		const availableWidth = windowWidth - sidebarWidth;

		// Content-Container Breite anpassen
		const contentContainer = document.querySelector(".content-container");
		if (contentContainer) {
			contentContainer.style.width = `${availableWidth}px`;
			contentContainer.style.maxWidth = `${availableWidth}px`;
		}

		// Skalierungsfaktor bestimmen
		let scaleFactor;
		if (availableWidth > 1800) scaleFactor = 1.0;
		else if (availableWidth > 1650) scaleFactor = 0.95;
		else if (availableWidth > 1500) scaleFactor = 0.9;
		else if (availableWidth > 1350) scaleFactor = 0.85;
		else if (availableWidth > 1200) scaleFactor = 0.8;
		else scaleFactor = 0.75;

		// Skalierungsfaktor als CSS-Variable setzen (für CSS-basierte Skalierung)
		document.documentElement.style.setProperty("--scale-factor", scaleFactor);
		document.documentElement.style.setProperty("--inv-scale", 1 / scaleFactor);
		document.documentElement.style.setProperty(
			"--section-spacing",
			`${12 / scaleFactor}px`
		);

		// Grid-Layout anpassen
		const layout = window.hangarUI.uiSettings.layout || 4;
		const hangarGrid = document.getElementById("hangarGrid");
		const secondaryGrid = document.getElementById("secondaryHangarGrid");

		// Gemeinsame Eigenschaften für beide Grids
		const gridConfig = {
			transform: `scale(${scaleFactor})`,
			transformOrigin: "top left",
			width: `calc(100% / ${scaleFactor})`,
			gridTemplateColumns: `repeat(${layout}, minmax(var(--card-min-width), 1fr))`,
			gap: "var(--grid-gap)",
			display: "grid",
		};

		// Primären Grid konfigurieren
		if (hangarGrid) {
			Object.assign(hangarGrid.style, gridConfig);
		}

		// Sekundären Grid identisch konfigurieren
		if (secondaryGrid && secondaryGrid.style.display !== "none") {
			Object.assign(secondaryGrid.style, gridConfig);
		}

		// Neue Logik: Berechne und setze die nicht-skalierbaren Abstände für die Sektionen
		// Dies kompensiert den Skalierungseffekt, damit die Abstände immer gleich bleiben
		const sectionDivider = document.querySelector(".section-divider");
		if (sectionDivider) {
			// Berechne den angepassten Abstand basierend auf Skalierungsfaktor
			// Verwende Math.ceil, um sicherzustellen, dass der Abstand immer groß genug ist
			const adjustedSpacing = Math.ceil(12 / scaleFactor);
			sectionDivider.style.margin = `${adjustedSpacing}px 0`;
		}

		// Aktualisiere auch die Abschnittsbeschriftungen
		const sectionLabels = document.querySelectorAll(".section-label");
		sectionLabels.forEach((label) => {
			const adjustedSpacing = Math.ceil(12 / scaleFactor);
			if (!label.classList.contains("section-label-first")) {
				label.style.marginTop = `${adjustedSpacing}px`;
			}
			label.style.marginBottom = `${adjustedSpacing}px`;
		});
	} catch (error) {
		console.error("Fehler bei der Skalierungsanpassung:", error);
	}
}

/**
 * Verbesserte Funktion zur Steuerung der Sichtbarkeit der sekundären Sektion
 */
function toggleSecondarySection(visible = false) {
	const secondaryCount = window.hangarUI.uiSettings.secondaryTilesCount || 0;
	visible = visible || secondaryCount > 0;

	const divider = document.querySelector(".section-divider");
	const secondaryLabel = document.querySelector(
		".section-label:not(:first-of-type)"
	);
	const secondaryGrid = document.getElementById("secondaryHangarGrid");

	// Display-Eigenschaft setzen
	const display = visible ? null : "none"; // null = entfernt inline style

	if (divider) divider.style.display = display || "block";
	if (secondaryLabel) secondaryLabel.style.display = display || "block";
	if (secondaryGrid) secondaryGrid.style.display = display || "grid";
}

/**
 * Hilfsfunktion um DOM-Element-Existenz zu prüfen
 * @param {string} id - Element-ID
 * @returns {boolean} - Ob das Element existiert
 */
function checkElement(id) {
	const element = document.getElementById(id);
	if (!element) {
		console.warn(`Element mit ID "${id}" nicht gefunden!`);
		return false;
	}
	return true;
}

/**
 * Hilfsfunktion für Debug-Ausgaben
 * @param {string} message - Debug-Nachricht
 * @param {any} obj - Optionales Objekt für die Konsole
 */
function debug(message, obj = null) {
	const DEBUG = false;
	if (!DEBUG) return;
	if (obj) {
		console.log(`[DEBUG] ${message}`, obj);
	} else {
		console.log(`[DEBUG] ${message}`);
	}
}

/**
 * Aktualisiert die Status-Lichter basierend auf dem gewählten Status
 * @param {number} cellId - ID der Zelle
 * @returns {boolean} - Erfolg der Operation
 */
function updateStatusLights(cellId) {
	try {
		const statusSelect = document.getElementById(`status-${cellId}`);
		if (!statusSelect) {
			console.error(`Status-Select für Zelle ${cellId} nicht gefunden`);
			return false;
		}

		const status = statusSelect.value;

		// Alle Lichter für diese Zelle finden
		const lights = document.querySelectorAll(`[data-cell="${cellId}"]`);

		// Alle Lichter zurücksetzen (deaktivieren)
		lights.forEach((light) => {
			light.classList.remove("active");
		});

		// Das richtige Licht aktivieren
		const activeLight = document.querySelector(
			`[data-cell="${cellId}"][data-status="${status}"]`
		);
		if (activeLight) {
			activeLight.classList.add("active");
		}

		return true;
	} catch (error) {
		console.error(
			`Fehler beim Aktualisieren der Statuslichter für Zelle ${cellId}:`,
			error
		);
		return false;
	}
}

// Exportiere alle benötigten Funktionen und Module
window.hangarUI = {
	uiSettings,
	updateSecondaryTiles,
	updateCellAttributes,
	setupSecondaryTileEventListeners,
	adjustScaling,
	toggleSecondarySection,
	updateStatusLights,
	checkElement,
	debug,
	initSectionLayout: function () {
		const firstSectionLabel = document.querySelector(
			".section-label:first-of-type"
		);
		if (firstSectionLabel) {
			firstSectionLabel.classList.add("section-label-first");
		}

		// Initiale Anpassung der Skalierung vornehmen
		window.hangarUI.adjustScaling();
	},
};

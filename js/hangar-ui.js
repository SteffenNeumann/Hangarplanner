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
		const sidebarWidth = isSidebarCollapsed ? 0 : 300;
		const availableWidth = windowWidth - sidebarWidth;

		// Content-Container Breite anpassen
		const contentContainer = document.querySelector(".content-container");
		if (contentContainer) {
			contentContainer.style.width = `${availableWidth}px`;
			contentContainer.style.maxWidth = `${availableWidth}px`;
		}

		// Skalierungsfaktor bestimmen - noch stärker reduziert
		let scaleFactor;
		if (availableWidth > 1800) scaleFactor = 0.9; // Weiter reduziert
		else if (availableWidth > 1650) scaleFactor = 0.8; // Weiter reduziert
		else if (availableWidth > 1500) scaleFactor = 0.7; // Weiter reduziert
		else if (availableWidth > 1350) scaleFactor = 0.6; // Weiter reduziert
		else if (availableWidth > 1200) scaleFactor = 0.5; // Weiter reduziert
		else scaleFactor = 0.45; // Weiter reduziert

		// Skalierungsfaktor als CSS-Variable setzen
		document.documentElement.style.setProperty("--scale-factor", scaleFactor);
		document.documentElement.style.setProperty("--inv-scale", 1 / scaleFactor);
		document.documentElement.style.setProperty(
			"--section-spacing",
			`${12 * scaleFactor}px`
		);

		// Angepasste Grid-Abstände für kleinere Kacheln
		let gridGap;
		if (availableWidth > 1500) gridGap = 12; // Weiter reduziert
		else if (availableWidth > 1350) gridGap = 10; // Weiter reduziert
		else if (availableWidth > 1200) gridGap = 8; // Weiter reduziert
		else gridGap = 6; // Weiter reduziert

		document.documentElement.style.setProperty("--grid-gap", `${gridGap}px`);

		// WICHTIG: CSS-Variablen für Kachelgrößen direkt aktualisieren
		const cardBaseWidth = 128; // Basisgröße
		document.documentElement.style.setProperty(
			"--card-base-width",
			`${cardBaseWidth}px`
		);
		document.documentElement.style.setProperty(
			"--card-min-width",
			`${cardBaseWidth}px`
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
			gridTemplateColumns: `repeat(${layout}, minmax(${cardBaseWidth}px, 1fr))`, // Direkte Größe setzen
			gap: `${gridGap}px`,
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

		// HINZUGEFÜGT: Direktes Anpassen der Kachelgröße
		applyTileSizes(cardBaseWidth);

		// Verbesserte Behandlung des Section Dividers
		const sectionDivider = document.querySelector(".section-divider");
		if (sectionDivider) {
			const adjustedSpacing = Math.ceil(12 * scaleFactor);
			sectionDivider.style.margin = `${adjustedSpacing}px 0`;
			sectionDivider.style.transform = "none"; // Keine Skalierung mehr, nur Abstandsanpassung
		}

		// Abstände für alle Sektionsbeschriftungen
		const sectionLabels = document.querySelectorAll(".section-label");
		sectionLabels.forEach((label) => {
			if (!label.classList.contains("section-label-first")) {
				const adjustedSpacing = Math.ceil(12 * scaleFactor);
				label.style.marginTop = `${adjustedSpacing}px`;
			}
			label.style.marginBottom = `${Math.ceil(12 * scaleFactor)}px`;
		});

		// Abstand zwischen den Sektionscontainern anpassen
		const secondarySection = document.querySelector(
			".section-container:nth-of-type(2)"
		);
		if (secondarySection) {
			const adjustedSpacing = Math.ceil(20 * scaleFactor);
			secondarySection.style.marginTop = `${adjustedSpacing}px`;
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

		// HINZUGEFÜGT: Manual Inputs responsiv anpassen mit kleineren Werten
		adjustManualInputWidths();
	} catch (error) {
		console.error("Fehler bei der Skalierungsanpassung:", error);
	}
}

/**
 * Neue Funktion: Wendet die Größenanpassungen direkt auf Kacheln an
 * @param {number} baseSize - Die Basisgröße für Kacheln in Pixeln
 */
function applyTileSizes(baseSize) {
	try {
		// Alle Kacheln auswählen
		const cells = document.querySelectorAll(".hangar-cell");

		cells.forEach((cell) => {
			// Direkt die Größe der Kacheln anpassen
			cell.style.minWidth = `${baseSize}px`;
			cell.style.width = "100%";
			cell.style.maxWidth = `${baseSize * 2.2}px`; // Maximale Breite begrenzen
			cell.style.flexBasis = `${baseSize}px`;

			// Kompaktere innere Abstände
			const contentDiv = cell.querySelector("div.p-4");
			if (contentDiv) {
				contentDiv.style.padding = "0.75rem";
			}

			// Kleinere Schriftgrößen für Beschriftungen
			const aircraftId = cell.querySelector(".aircraft-id");
			if (aircraftId) {
				aircraftId.style.fontSize = "0.95rem";
				aircraftId.style.padding = "0.3rem";
				aircraftId.style.marginBottom = "0.5rem";
			}
		});
	} catch (error) {
		console.error(
			"Fehler bei der direkten Größenanpassung der Kacheln:",
			error
		);
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

		// Alle Statuslichter für diese Kachel finden
		const statusLights = document.querySelectorAll(
			`.status-light[data-cell="${cellId}"]`
		);

		// Alle Lichter zurücksetzen (dimmen)
		statusLights.forEach((light) => {
			light.classList.remove("active");
		});

		// Ausgewähltes Licht aktivieren
		const activeLight = document.querySelector(
			`.status-light[data-cell="${cellId}"][data-status="${selectedStatus}"]`
		);
		if (activeLight) {
			activeLight.classList.add("active");
		}
	} catch (error) {
		console.error(
			`Fehler beim Aktualisieren der Statuslichter für Kachel ${cellId}:`,
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

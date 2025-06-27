const uiSettings = {
	tilesCount: 8,
	secondaryTilesCount: 0,
	layout: 4,
	darkMode: false,
	zoomLevel: 100,
	tableView: false, // Neue Einstellung für die Tabellenansicht

	// Lädt Einstellungen aus dem LocalStorage (beibehalten)
	load: async function () {
		try {
			// Aus localStorage laden
			const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
			if (savedSettingsJSON) {
				const settings = JSON.parse(savedSettingsJSON);
				this.layout = settings.layout || 4;
				this.darkMode = settings.darkMode || false;
				this.zoomLevel = settings.zoomLevel || 100;
				this.tableView = settings.tableView || false; // Neue Eigenschaft laden

				// UI-Elemente aktualisieren
				this.updateUIControls();

				// Dark Mode, Zoom und Tabellenansicht anwenden
				this.applyDarkMode(this.darkMode);
				this.applyZoomLevel(this.zoomLevel);
				this.applyViewMode(this.tableView); // Neue Funktion anwenden

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
			if (checkElement("darkModeToggle")) {
				this.darkMode = document.getElementById("darkModeToggle").checked;
			}
			if (checkElement("viewModeToggle")) {
				// Neue Eigenschaft auslesen
				this.tableView = document.getElementById("viewModeToggle").checked;
			}
			if (checkElement("displayZoom")) {
				this.zoomLevel =
					parseInt(document.getElementById("displayZoom").value) || 100;
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
				darkMode: this.darkMode,
				zoomLevel: this.zoomLevel,
				tableView: this.tableView, // Neue Eigenschaft speichern
				tileValues: tileValues,
				lastSaved: new Date().toISOString(),
			};

			// Im LocalStorage speichern - mit Fallback-Methode
			try {
				// Zuerst versuchen, den vorgesehenen helpers.storageHelper zu verwenden
				if (
					window.helpers &&
					window.helpers.storageHelper &&
					typeof window.helpers.storageHelper.set === "function"
				) {
					window.helpers.storageHelper.set(
						"hangarPlannerSettings",
						settingsData
					);
				} else {
					// Fallback: Direkt localStorage verwenden
					localStorage.setItem(
						"hangarPlannerSettings",
						JSON.stringify(settingsData)
					);
				}
				console.log("Einstellungen im LocalStorage gespeichert");
			} catch (storageError) {
				console.error("Fehler beim Speichern im localStorage:", storageError);
			}

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

	/**
	 * Sammelt Werte von Kacheln in einem bestimmten Container
	 * @param {string} containerSelector - CSS-Selektor für den Container
	 * @param {Array} tileValues - Array zum Sammeln der Werte
	 * @param {number} startIndex - Startindex für die Kachel-IDs
	 */
	collectTileValues: function (containerSelector, tileValues, startIndex) {
		try {
			const container = document.querySelector(containerSelector);
			if (!container) {
				console.warn(`Container ${containerSelector} nicht gefunden`);
				return;
			}

			const cells = container.querySelectorAll(".hangar-cell");
			cells.forEach((cell, index) => {
				if (cell.classList.contains("hidden")) return;

				const cellId = startIndex + index;

				// Position sammeln
				const positionInput = document.getElementById(
					`hangar-position-${cellId}`
				);
				const position = positionInput ? positionInput.value : "";

				// Aircraft ID sammeln
				const aircraftInput = document.getElementById(`aircraft-${cellId}`);
				const aircraftId = aircraftInput ? aircraftInput.value : "";

				// Manuelle Eingabe sammeln
				const manualInput = document.getElementById(`manual-input-${cellId}`);
				const manualInputValue = manualInput ? manualInput.value : "";

				// Status sammeln
				const statusSelect = document.getElementById(`status-${cellId}`);
				const status = statusSelect ? statusSelect.value : "ready";

				// Zeit-Felder sammeln
				const arrivalTimeInput = document.getElementById(
					`arrival-time-${cellId}`
				);
				const arrivalTime = arrivalTimeInput ? arrivalTimeInput.value : "";

				const departureTimeInput = document.getElementById(
					`departure-time-${cellId}`
				);
				const departureTime = departureTimeInput
					? departureTimeInput.value
					: "";

				// Notizen sammeln
				const notesTextarea = document.getElementById(`notes-${cellId}`);
				const notes = notesTextarea ? notesTextarea.value : "";

				// Nur hinzufügen wenn mindestens ein Wert vorhanden ist
				if (
					position ||
					aircraftId ||
					manualInputValue ||
					arrivalTime ||
					departureTime ||
					notes ||
					status !== "ready"
				) {
					tileValues.push({
						cellId: cellId,
						position: position,
						aircraftId: aircraftId,
						manualInput: manualInputValue,
						arrivalTime: arrivalTime,
						departureTime: departureTime,
						status: status,
						notes: notes,
					});
				}
			});
		} catch (error) {
			console.error(
				`Fehler beim Sammeln der Kachelwerte für ${containerSelector}:`,
				error
			);
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

			// Dark Mode und Zoom anwenden
			this.applyDarkMode(this.darkMode);
			this.applyZoomLevel(this.zoomLevel);
			this.applyViewMode(this.tableView); // Neue Funktion anwenden

			// Skalierung nach Layoutänderung neu berechnen
			setTimeout(adjustScaling, 50);
			return true;
		} catch (error) {
			console.error("Fehler beim Anwenden der Einstellungen:", error);
			return false;
		}
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
		if (checkElement("darkModeToggle")) {
			document.getElementById("darkModeToggle").checked = this.darkMode;
		}
		if (checkElement("viewModeToggle")) {
			// Neues Element aktualisieren
			document.getElementById("viewModeToggle").checked = this.tableView;
		}
		if (checkElement("displayZoom")) {
			document.getElementById("displayZoom").value = this.zoomLevel;
			document.getElementById("zoomValue").textContent = `${this.zoomLevel}%`;
		}
	},

	// Dark Mode anwenden
	applyDarkMode: function (enabled) {
		const body = document.body;

		if (enabled) {
			body.classList.add("dark-mode");
		} else {
			body.classList.remove("dark-mode");
		}

		// Status speichern
		this.darkMode = enabled;

		// Benachrichtigung, wenn Debugmodus aktiv ist
		if (localStorage.getItem("debugMode") === "true") {
			console.log(`Dark Mode ${enabled ? "aktiviert" : "deaktiviert"}`);
		}
	},

	// Zoom-Level anwenden
	applyZoomLevel: function (level) {
		const contentContainer = document.querySelector(".content-container");
		if (!contentContainer) return;

		// Zoom-Wert zwischen 0.75 und 1.5 setzen
		const zoomFactor = level / 100;
		contentContainer.style.transformOrigin = "top left";
		contentContainer.style.transform = `scale(${zoomFactor})`;

		// Bei größeren Zoom-Werten muss der Container erweitert werden
		if (zoomFactor > 1) {
			contentContainer.style.width = `${100 / zoomFactor}%`;
		} else {
			contentContainer.style.width = "100%";
		}

		// Aktuellen Wert anzeigen
		if (checkElement("zoomValue")) {
			document.getElementById("zoomValue").textContent = `${level}%`;
		}

		// Status speichern
		this.zoomLevel = level;

		// Benachrichtigung, wenn Debugmodus aktiv ist
		if (localStorage.getItem("debugMode") === "true") {
			console.log(`Zoom-Level auf ${level}% gesetzt`);
		}

		// Skalierung nach Zoom-Änderung neu berechnen
		setTimeout(adjustScaling, 50);
	},

	// NEUE FUNKTION: Tabellenansicht umschalten
	applyViewMode: function (tableViewEnabled) {
		const body = document.body;

		if (tableViewEnabled) {
			body.classList.add("table-view");
		} else {
			body.classList.remove("table-view");
		}

		// Status speichern
		this.tableView = tableViewEnabled;

		// Layout nach Änderung des Anzeigemodus anpassen
		setTimeout(() => {
			adjustScaling();

			// Spezielle Anpassungen für Tabellenansicht
			if (tableViewEnabled) {
				// Für Tabellenansicht die Zeilen etwas enger setzen
				document.documentElement.style.setProperty("--grid-gap", "8px");
			} else {
				// Für Kachelansicht normale Abstände wiederherstellen
				document.documentElement.style.setProperty("--grid-gap", "16px");
			}
		}, 50);

		// Debug-Ausgabe
		if (localStorage.getItem("debugMode") === "true") {
			console.log(
				`Ansichtsmodus auf "${tableViewEnabled ? "Tabelle" : "Kachel"}" gesetzt`
			);
		}
	},

	// Wendet die gespeicherten Kachelwerte auf die UI an
	applyTileValues: function (tileValues) {
		console.log(`Wende ${tileValues.length} gespeicherte Kachelwerte an...`);

		tileValues.forEach((tileValue) => {
			const cellId = tileValue.cellId;
			console.log(`Anwenden von Werten für Kachel ${cellId}:`, tileValue);

			// Position setzen
			const positionInput = document.getElementById(
				`hangar-position-${cellId}`
			);
			if (positionInput && tileValue.position) {
				positionInput.value = tileValue.position;
			}

			// Aircraft ID setzen
			const aircraftInput = document.getElementById(`aircraft-${cellId}`);
			if (aircraftInput && tileValue.aircraftId) {
				aircraftInput.value = tileValue.aircraftId;
			}

			// Manuelle Eingabe setzen
			const manualInput = document.getElementById(`manual-input-${cellId}`);
			if (manualInput && tileValue.manualInput) {
				manualInput.value = tileValue.manualInput;
			}

			// Zeit-Felder setzen
			const arrivalTimeInput = document.getElementById(
				`arrival-time-${cellId}`
			);
			if (arrivalTimeInput && tileValue.arrivalTime) {
				arrivalTimeInput.value = tileValue.arrivalTime;
			}

			const departureTimeInput = document.getElementById(
				`departure-time-${cellId}`
			);
			if (departureTimeInput && tileValue.departureTime) {
				departureTimeInput.value = tileValue.departureTime;
			}

			// Status setzen
			const statusSelect = document.getElementById(`status-${cellId}`);
			if (statusSelect && tileValue.status) {
				statusSelect.value = tileValue.status;
				// Status-Licht aktualisieren
				if (typeof updateStatusLights === "function") {
					updateStatusLights(cellId);
				}
			}

			// Notizen setzen
			const notesTextarea = document.getElementById(`notes-${cellId}`);
			if (notesTextarea && tileValue.notes) {
				notesTextarea.value = tileValue.notes;
			}
		});
	},
};

/**
 * Formatiert die Aircraft ID:
 * - Konvertiert zu Großbuchstaben
 * - Fügt nach dem ersten Buchstaben einen Bindestrich ein, falls nicht vorhanden
 *
 * @param {string} input - Die eingegebene Aircraft ID
 * @returns {string} - Die formatierte Aircraft ID
 */
function formatAircraftId(input) {
	if (!input) return input;

	// Zu Großbuchstaben konvertieren
	input = input.toUpperCase();

	// Prüfen, ob bereits ein Bindestrich vorhanden ist
	if (input.length > 1 && !input.includes("-")) {
		// Bindestrich nach dem ersten Buchstaben einfügen
		input = input.charAt(0) + "-" + input.substring(1);
	}

	return input;
}

/**
 * Fügt Event-Listener für die Formatierung der Aircraft ID zu allen entsprechenden Eingabefeldern hinzu
 */
function setupAircraftIdFormatting() {
	const aircraftIdInputs = document.querySelectorAll(".aircraft-id");

	aircraftIdInputs.forEach((input) => {
		// Format bei Eingabe anwenden
		input.addEventListener("input", function () {
			const formattedValue = formatAircraftId(this.value);
			// Nur aktualisieren, wenn sich der Wert tatsächlich geändert hat
			if (formattedValue !== this.value) {
				this.value = formattedValue;
			}
		});

		// Format beim Verlassen des Feldes anwenden (für den Fall, dass die Eingabe anders erfolgt)
		input.addEventListener("blur", function () {
			this.value = formatAircraftId(this.value);
		});
	});

	console.log(
		`Aircraft ID-Formatierung für ${aircraftIdInputs.length} Eingabefelder eingerichtet`
	);
}

// Placeholder für restliche Funktionen - diese werden aus der originalen Datei übernommen
function updateSecondaryTiles(count, layout) {
	// Implementation wird aus der originalen Datei übernommen
	console.log("updateSecondaryTiles placeholder");
}

function updateCellAttributes(cell, cellId) {
	// Implementation wird aus der originalen Datei übernommen
	console.log("updateCellAttributes placeholder");
}

function loadSecondaryTileValues() {
	// Implementation wird aus der originalen Datei übernommen
	console.log("loadSecondaryTileValues placeholder");
}

function setupSecondaryTileEventListeners() {
	// Implementation wird aus der originalen Datei übernommen
	console.log("setupSecondaryTileEventListeners placeholder");
}

function adjustScaling() {
	// Implementation wird aus der originalen Datei übernommen
	console.log("adjustScaling placeholder");
}

function toggleSecondarySection(visible) {
	// Implementation wird aus der originalen Datei übernommen
	console.log("toggleSecondarySection placeholder");
}

function updateStatusLights(cellId) {
	// Implementation wird aus der originalen Datei übernommen
	console.log("updateStatusLights placeholder");
}

function checkElement(id) {
	return document.getElementById(id) !== null;
}

// Export des hangarUI Objekts
window.hangarUI = {
	uiSettings,
	updateSecondaryTiles,
	updateCellAttributes,
	setupSecondaryTileEventListeners,
	adjustScaling,
	toggleSecondarySection,
	updateStatusLights,
	checkElement,
	formatAircraftId,
	setupAircraftIdFormatting,
};

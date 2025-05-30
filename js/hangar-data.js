/**
 * hangar-data.js
 * Enthält Datenverwaltungsfunktionen für die HangarPlanner-Anwendung
 * Verantwortlich für Datensammlung, Speichern, Laden und Import/Export
 */

// Datenstruktur für die Flugzeuge
const hangarData = {
	cells: Array(8)
		.fill()
		.map((_, i) => ({
			id: i + 1,
			aircraftId: "",
			manualInput: "",
			arrivalTime: "",
			departureTime: "",
			position: "",
			status: "ready",
			lightsStatus: {
				arrival: false,
				present: false,
				departure: false,
			},
		})),
};

/**
 * Sammelt alle Daten aus dem Hangar für das Speichern
 * @returns {Object} Alle gesammelten Daten
 */
function collectAllHangarData() {
	try {
		// Projektname und Metadaten sammeln
		const projectName =
			document.getElementById("projectName").value || "HangarPlan";
		const projectId =
			document.getElementById("projectId").value || Date.now().toString();

		// Einstellungen sammeln
		const settings = {
			tilesCount: parseInt(document.getElementById("tilesCount").value) || 8,
			secondaryTilesCount:
				parseInt(document.getElementById("secondaryTilesCount").value) || 0,
			layout: parseInt(document.getElementById("layoutType").value) || 4,
		};

		// Kacheldaten sammeln
		const primaryTiles = collectTileData("#hangarGrid");
		const secondaryTiles = collectTileData("#secondaryHangarGrid");

		// Gesamtdaten zusammenstellen
		return {
			id: projectId,
			metadata: {
				projectName: projectName,
				exportDate: new Date().toISOString(),
				lastModified: new Date().toISOString(),
			},
			settings: settings,
			primaryTiles: primaryTiles,
			secondaryTiles: secondaryTiles,
		};
	} catch (error) {
		console.error("Fehler beim Sammeln der Hangardaten:", error);
		return null;
	}
}

/**
 * Importiert einen Hangarplan aus einer JSON-Datei
 */
function importHangarPlanFromJson(event) {
	try {
		const file = event.target.files[0];
		if (!file) {
			showNotification("Keine Datei ausgewählt", "error");
			return;
		}

		const reader = new FileReader();
		reader.onload = function (e) {
			try {
				const data = JSON.parse(e.target.result);

				// Projektname setzen
				if (data.metadata && data.metadata.projectName) {
					document.getElementById("projectName").value =
						data.metadata.projectName;
				}

				// Einstellungen übernehmen
				if (data.settings) {
					if (window.hangarUI.checkElement("tilesCount")) {
						document.getElementById("tilesCount").value =
							data.settings.tilesCount || 8;
					}
					if (window.hangarUI.checkElement("secondaryTilesCount")) {
						document.getElementById("secondaryTilesCount").value =
							data.settings.secondaryTilesCount || 0;
					}
					if (window.hangarUI.checkElement("layoutType")) {
						document.getElementById("layoutType").value =
							data.settings.layout || 4;
					}

					// Einstellungen anwenden
					window.hangarUI.uiSettings.tilesCount = data.settings.tilesCount || 8;
					window.hangarUI.uiSettings.secondaryTilesCount =
						data.settings.secondaryTilesCount || 0;
					window.hangarUI.uiSettings.layout = data.settings.layout || 4;
					window.hangarUI.uiSettings.apply();
				}

				// Kachelndaten anwenden
				applyLoadedTileData(data);

				showNotification("Hangarplan erfolgreich geladen", "success");
			} catch (error) {
				console.error("Fehler beim Verarbeiten der importierten Datei:", error);
				showNotification(`Import-Fehler: ${error.message}`, "error");
			}
		};

		reader.readAsText(file);

		// Input zurücksetzen
		event.target.value = "";
	} catch (error) {
		console.error("Fehler beim Importieren des Hangarplans:", error);
		showNotification(`Import-Fehler: ${error.message}`, "error");
	}
}

/**
 * Importiert einen Hangarplan aus einer JSON-Datei mit FileSystem API
 */
async function importHangarPlanWithFilePicker() {
	try {
		// Prüfen ob Browser File System API unterstützt und verwenden
		const isFileSystemAPISupported = "showOpenFilePicker" in window;
		const useFileSystem =
			localStorage.getItem("useFileSystemAccess") === "true";

		console.log(
			`Import mit FilePicker, API unterstützt: ${isFileSystemAPISupported}, verwenden: ${useFileSystem}`
		);

		let jsonData = null;

		if (useFileSystem && isFileSystemAPISupported) {
			try {
				// FilePicker Optionen konfigurieren
				const options = {
					types: [
						{
							description: "JSON Files",
							accept: { "application/json": [".json"] },
						},
					],
					multiple: false,
				};

				// Dialog öffnen
				const [fileHandle] = await window.showOpenFilePicker(options);
				const file = await fileHandle.getFile();

				// Datei lesen
				jsonData = await file.text();
			} catch (error) {
				if (error.name === "AbortError") {
					console.log("Benutzer hat den Dialog abgebrochen");
					return;
				}

				// Fallback bei Fehler
				console.error("Fehler beim Öffnen mit File System API:", error);
				window.showNotification(
					"Dateiauswahl konnte nicht geöffnet werden, nutze Standard-Dialog",
					"warning"
				);

				// Fallback zum regulären File Input
				return importHangarPlanFallback();
			}
		} else {
			// Fallback wenn API nicht unterstützt wird
			return importHangarPlanFallback();
		}

		// Verarbeite den geladenen Dateiinhalt
		if (jsonData) {
			const data = JSON.parse(jsonData);

			// Anwenden auf die Anwendung
			applyLoadedHangarPlan(data);
		}
	} catch (error) {
		console.error("Fehler beim Importieren des Hangarplans:", error);
		window.showNotification(`Import-Fehler: ${error.message}`, "error");
	}
}

/**
 * Fallback für den Import mit regulärem File Input
 * @private
 */
function importHangarPlanFallback() {
	return new Promise((resolve, reject) => {
		// Dateiauswahldialog erstellen
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = ".json";
		fileInput.style.display = "none";
		document.body.appendChild(fileInput);

		fileInput.onchange = (event) => {
			try {
				const file = event.target.files[0];
				if (!file) {
					resolve();
					return;
				}

				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const data = JSON.parse(e.target.result);
						applyLoadedHangarPlan(data);
						resolve(data);
					} catch (error) {
						console.error("Fehler beim Verarbeiten der Datei:", error);
						window.showNotification(`Import-Fehler: ${error.message}`, "error");
						reject(error);
					}
				};

				reader.readAsText(file);
			} catch (error) {
				reject(error);
			} finally {
				document.body.removeChild(fileInput);
			}
		};

		fileInput.click();
	});
}

/**
 * Wendet den importierten Hangarplan auf die Anwendung an
 * @private
 */
function applyLoadedHangarPlan(data) {
	// Projektname setzen
	if (data.metadata && data.metadata.projectName) {
		document.getElementById("projectName").value = data.metadata.projectName;

		// Auch die versteckte ID setzen, falls vorhanden
		if (data.id && document.getElementById("projectId")) {
			document.getElementById("projectId").value = data.id;
		}
	}

	// Einstellungen übernehmen und anwenden
	if (data.settings) {
		if (window.hangarUI.checkElement("tilesCount")) {
			document.getElementById("tilesCount").value =
				data.settings.tilesCount || 8;
		}
		if (window.hangarUI.checkElement("secondaryTilesCount")) {
			document.getElementById("secondaryTilesCount").value =
				data.settings.secondaryTilesCount || 0;
		}
		if (window.hangarUI.checkElement("layoutType")) {
			document.getElementById("layoutType").value = data.settings.layout || 4;
		}

		// Einstellungen anwenden
		window.hangarUI.uiSettings.tilesCount = data.settings.tilesCount || 8;
		window.hangarUI.uiSettings.secondaryTilesCount =
			data.settings.secondaryTilesCount || 0;
		window.hangarUI.uiSettings.layout = data.settings.layout || 4;
		window.hangarUI.uiSettings.apply();
	}

	// Kachelndaten anwenden
	applyLoadedTileData(data);

	window.showNotification("Hangarplan erfolgreich geladen", "success");
	return data;
}

/**
 * Sammelt Daten von allen Kacheln in einem Container
 * @param {string} containerSelector - CSS-Selektor für den Container
 * @returns {Array} - Array mit Kacheldaten
 */
function collectTileData(containerSelector) {
	try {
		const container = document.querySelector(containerSelector);
		if (!container) return [];

		const tiles = container.querySelectorAll(".hangar-cell");
		const tileData = [];

		tiles.forEach((tile, index) => {
			// Ignoriere versteckte Kacheln
			if (tile.classList.contains("hidden")) return;

			const isSecondary = containerSelector === "#secondaryHangarGrid";
			const tileId = isSecondary ? 100 + index + 1 : index + 1;

			// Sammle alle Daten aus der Kachel
			const aircraftId = tile.querySelector(`[id^="aircraft-"]`)?.value || "";

			// Position gezielt über ID oder Fallback über Attribut finden
			let position = "";
			const positionInput = document.getElementById(
				`hangar-position-${tileId}`
			);
			if (positionInput) {
				position = positionInput.value || "";
				console.log(`Position für Kachel ${tileId} gesammelt: ${position}`);
			} else {
				const fallbackPositionInput = tile.querySelector(
					'input[id^="hangar-position-"]'
				);
				if (fallbackPositionInput) {
					position = fallbackPositionInput.value || "";
					console.log(
						`Fallback: Position für Kachel ${tileId} gesammelt: ${position}`
					);
				}
			}

			const manualInput =
				tile.querySelector('input[placeholder="Manual Input"]')?.value || "";
			const notes = tile.querySelector(`[id^="notes-"]`)?.value || "";
			const status = tile.querySelector(`[id^="status-"]`)?.value || "ready";
			const arrivalTime =
				tile.querySelector(`[id^="arrival-time-"]`)?.textContent.trim() ||
				"--:--";
			const departureTime =
				tile.querySelector(`[id^="departure-time-"]`)?.textContent.trim() ||
				"--:--";

			tileData.push({
				tileId: tileId,
				aircraftId: aircraftId,
				position: position,
				manualInput: manualInput,
				notes: notes,
				status: status,
				arrivalTime: arrivalTime,
				departureTime: departureTime,
			});
		});

		return tileData;
	} catch (error) {
		console.error("Fehler beim Sammeln der Kacheldaten:", error);
		return [];
	}
}

/**
 * Wendet Daten aus einem geladenen Hangarplan auf die UI an
 */
function applyLoadedTileData(data) {
	// Primäre Kacheln füllen
	if (data.primaryTiles && Array.isArray(data.primaryTiles)) {
		data.primaryTiles.forEach((tile) => {
			applyTileData(tile, false);
		});
	}

	// Sekundäre Kacheln füllen
	if (data.secondaryTiles && Array.isArray(data.secondaryTiles)) {
		// Stelle sicher, dass genügend sekundäre Kacheln existieren
		if (data.secondaryTiles.length > 0 && data.settings) {
			window.hangarUI.uiSettings.secondaryTilesCount =
				data.settings.secondaryTilesCount;
			window.hangarUI.updateSecondaryTiles(
				window.hangarUI.uiSettings.secondaryTilesCount,
				window.hangarUI.uiSettings.layout
			);
		}

		// Dann Daten zuweisen
		data.secondaryTiles.forEach((tile) => {
			applyTileData(tile, true);
		});
	}
}

/**
 * Wendet die Daten einer Kachel auf die entsprechende UI-Kachel an
 */
function applyTileData(tileData, isSecondary = false) {
	try {
		const tileId = tileData.tileId;
		const container = isSecondary ? "#secondaryHangarGrid" : "#hangarGrid";

		// Aircraft ID setzen
		const aircraftInput = document.querySelector(
			`${container} #aircraft-${tileId}`
		);
		if (aircraftInput) {
			aircraftInput.value = tileData.aircraftId || "";
		}

		// Position setzen - explizit über ID finden oder über Container und Selektoren
		const positionInput = document.getElementById(`hangar-position-${tileId}`);
		if (positionInput) {
			positionInput.value = tileData.position || "";
			console.log(
				`Position für Kachel ${tileId} geladen: ${tileData.position}`
			);
		} else {
			// Fallback: Finde Position-Eingabe im Container für diese Kachel
			const cellIndex = isSecondary ? tileId - 100 : tileId;
			const cells = document.querySelectorAll(`${container} .hangar-cell`);

			if (cells.length >= cellIndex && cellIndex > 0) {
				const cellPositionInput = cells[cellIndex - 1].querySelector(
					'input[id^="hangar-position-"]'
				);
				if (cellPositionInput) {
					cellPositionInput.value = tileData.position || "";
					console.log(
						`Fallback: Position für Kachel ${tileId} geladen über Selektor: ${tileData.position}`
					);

					// Falls keine korrekte ID vorhanden, jetzt setzen
					if (cellPositionInput.id !== `hangar-position-${tileId}`) {
						cellPositionInput.id = `hangar-position-${tileId}`;
						console.log(
							`ID für Position-Eingabe nachträglich gesetzt: ${cellPositionInput.id}`
						);
					}
				} else {
					console.warn(
						`Kein Position-Eingabefeld für Kachel ${tileId} gefunden`
					);
				}
			}
		}

		// Manuelle Eingabe setzen - immer zuerst über die spezifische ID versuchen
		const manualInputById = document.getElementById(`manual-input-${tileId}`);
		if (manualInputById) {
			manualInputById.value = tileData.manualInput || "";
			console.log(
				`Manuelle Eingabe für Kachel ${tileId} geladen: ${tileData.manualInput}`
			);
		} else {
			// Fallback auf die alte Methode mit Vorsicht (korrekter Index)
			const cellIndex = isSecondary ? tileId - 100 : tileId;
			const cells = document.querySelectorAll(`${container} .hangar-cell`);
			if (cells.length >= cellIndex && cellIndex > 0) {
				const manualInput = cells[cellIndex - 1].querySelector(
					'input[placeholder="Manual Input"]'
				);
				if (manualInput) {
					manualInput.value = tileData.manualInput || "";
					console.log(
						`Fallback: Manuelle Eingabe für Kachel ${tileId} geladen über Selektor`
					);

					// Falls keine ID vorhanden, jetzt eine setzen
					if (!manualInput.id) {
						manualInput.id = `manual-input-${tileId}`;
					}
				}
			}
		}

		// Notizen setzen
		const notesTextarea = document.querySelector(
			`${container} #notes-${tileId}`
		);
		if (notesTextarea) {
			notesTextarea.value = tileData.notes || "";
		}

		// Status setzen
		const statusSelect = document.querySelector(
			`${container} #status-${tileId}`
		);
		if (statusSelect) {
			statusSelect.value = tileData.status || "ready";
			window.hangarUI.updateStatusLights(tileId);
		}

		// Weitere Felder aktualisieren
		const arrivalTime = document.querySelector(
			`${container} #arrival-time-${tileId}`
		);
		if (arrivalTime) {
			arrivalTime.textContent = tileData.arrivalTime || "--:--";
		}

		const departureTime = document.querySelector(
			`${container} #departure-time-${tileId}`
		);
		if (departureTime) {
			departureTime.textContent = tileData.departureTime || "--:--";
		}

		// Position-Wert setzen
		const positionDisplay = document.querySelector(
			`${container} #position-${tileId}`
		);
		if (positionDisplay) {
			positionDisplay.textContent = tileData.position || "--";
		}
	} catch (error) {
		console.error(
			`Fehler beim Anwenden der Daten für Kachel ${tileData.tileId}:`,
			error
		);
	}
}

/**
 * Zurücksetzen aller Felder auf Standardwerte
 */
function resetAllFields() {
	// Projektname zurücksetzen
	if (window.hangarUI.checkElement("projectName")) {
		document.getElementById("projectName").value = generateTimestamp();
	}

	// Alle Kacheln leeren (Primär und Sekundär)
	document
		.querySelectorAll(
			"#hangarGrid .hangar-cell, #secondaryHangarGrid .hangar-cell"
		)
		.forEach((cell) => {
			const inputs = cell.querySelectorAll("input, textarea");
			inputs.forEach((input) => {
				input.value = "";
			});

			// Status auf "ready" setzen
			const statusSelect = cell.querySelector("select");
			if (statusSelect) {
				statusSelect.value = "ready";
				// Statuslichter aktualisieren
				const cellId = parseInt(statusSelect.id.split("-")[1]);
				if (cellId) window.hangarUI.updateStatusLights(cellId);
			}

			// Zeit-Anzeigen zurücksetzen
			const timeElements = cell.querySelectorAll(
				"[id^='arrival-time-'], [id^='departure-time-']"
			);
			timeElements.forEach((el) => {
				el.textContent = "--:--";
			});

			// Position-Anzeige zurücksetzen
			const posDisplay = cell.querySelector("[id^='position-']");
			if (posDisplay) posDisplay.textContent = "--";
		});
}

/**
 * Speichert das aktuelle Projekt mit dem FileManager
 * @returns {Promise<boolean>} Erfolg des Speichervorgangs
 */
async function saveProjectToFile() {
	try {
		console.log("Beginne Speichervorgang...");

		// Sammle alle Daten
		const projectData = collectAllHangarData();
		if (!projectData) {
			throw new Error("Konnte keine Daten sammeln");
		}

		console.log("Daten gesammelt:", projectData.id);

		// FileManager verwenden
		const fileManager = window.fileManager;
		if (!fileManager) {
			throw new Error("FileManager nicht verfügbar");
		}

		// Projekt speichern
		const success = await fileManager.saveProject(projectData);
		if (success) {
			console.log("Projekt erfolgreich gespeichert");
		}

		return success;
	} catch (error) {
		console.error("Fehler beim Speichern:", error);
		showNotification(`Speichern fehlgeschlagen: ${error.message}`, "error");
		return false;
	}
}

/**
 * Lädt ein Projekt aus einer Datei
 * @returns {Promise<boolean>} Erfolg des Ladevorgangs
 */
async function loadProjectFromFile() {
	try {
		// FileManager verwenden
		const fileManager = window.fileManager;
		if (!fileManager) {
			throw new Error("FileManager nicht verfügbar");
		}

		// Projekt laden
		const projectData = await fileManager.loadProject();
		if (!projectData) {
			return false;
		}

		// Projekt anwenden
		return await applyProjectData(projectData);
	} catch (error) {
		console.error("Fehler beim Laden:", error);
		showNotification(`Laden fehlgeschlagen: ${error.message}`, "error");
		return false;
	}
}

/**
 * Wendet Projektdaten auf die Benutzeroberfläche an
 * @param {Object} projectData - Die anzuwendenden Projektdaten
 * @returns {Promise<boolean>} Erfolg des Anwendens
 */
async function applyProjectData(projectData) {
	try {
		// Projektname setzen
		if (projectData.metadata && projectData.metadata.projectName) {
			document.getElementById("projectName").value =
				projectData.metadata.projectName;
		}

		// Einstellungen übernehmen
		if (projectData.settings) {
			if (window.hangarUI.checkElement("tilesCount")) {
				document.getElementById("tilesCount").value =
					projectData.settings.tilesCount || 8;
			}
			if (window.hangarUI.checkElement("secondaryTilesCount")) {
				document.getElementById("secondaryTilesCount").value =
					projectData.settings.secondaryTilesCount || 0;
			}
			if (window.hangarUI.checkElement("layoutType")) {
				document.getElementById("layoutType").value =
					projectData.settings.layout || 4;
			}

			// Einstellungen anwenden
			window.hangarUI.uiSettings.tilesCount =
				projectData.settings.tilesCount || 8;
			window.hangarUI.uiSettings.secondaryTilesCount =
				projectData.settings.secondaryTilesCount || 0;
			window.hangarUI.uiSettings.layout = projectData.settings.layout || 4;
			window.hangarUI.uiSettings.apply();
		}

		// Kacheldaten anwenden
		applyLoadedTileData(projectData);

		showNotification("Projekt erfolgreich geladen", "success");
		return true;
	} catch (error) {
		console.error("Fehler beim Anwenden des Projekts:", error);
		showNotification(`Fehler beim Anwenden: ${error.message}`, "error");
		return false;
	}
}

// Exportiere aktualisierte Funktionen
window.hangarData = {
	hangarData,
	collectAllHangarData,
	importHangarPlanFromJson,
	collectTileData,
	applyLoadedTileData,
	applyTileData,
	resetAllFields,
	saveProjectToFile,
	loadProjectFromFile,
	applyProjectData,
};

/**
 * Globale Funktionen für Datenbankinteraktion
 */
window.loadProjectFromDatabase = function (projectData) {
	try {
		// Projektname setzen
		if (projectData.metadata && projectData.metadata.projectName) {
			document.getElementById("projectName").value =
				projectData.metadata.projectName;
		}

		// Einstellungen übernehmen
		if (projectData.settings) {
			if (window.hangarUI.checkElement("tilesCount")) {
				document.getElementById("tilesCount").value =
					projectData.settings.tilesCount || 8;
			}
			if (window.hangarUI.checkElement("secondaryTilesCount")) {
				document.getElementById("secondaryTilesCount").value =
					projectData.settings.secondaryTilesCount || 0;
			}
			if (window.hangarUI.checkElement("layoutType")) {
				document.getElementById("layoutType").value =
					projectData.settings.layout || 4;
			}

			// Einstellungen anwenden
			window.hangarUI.uiSettings.tilesCount =
				projectData.settings.tilesCount || 8;
			window.hangarUI.uiSettings.secondaryTilesCount =
				projectData.settings.secondaryTilesCount || 0;
			window.hangarUI.uiSettings.layout = projectData.settings.layout || 4;
			window.hangarUI.uiSettings.apply();
		}

		// Kachelndaten anwenden
		applyLoadedTileData(projectData);

		showNotification("Projekt erfolgreich geladen", "success");
		return true;
	} catch (error) {
		console.error("Fehler beim Laden des Projekts aus der Datenbank:", error);
		showNotification(`Fehler beim Laden: ${error.message}`, "error");
		return false;
	}
};

window.createNewProjectInDatabase = function (projectName) {
	try {
		// Aktuellen Zustand zurücksetzen
		resetAllFields();

		// Projektname setzen
		document.getElementById("projectName").value =
			projectName || generateTimestamp();

		// Standardeinstellungen anwenden
		window.hangarUI.uiSettings.tilesCount = 8;
		window.hangarUI.uiSettings.secondaryTilesCount = 0;
		window.hangarUI.uiSettings.layout = 4;
		window.hangarUI.uiSettings.apply();

		showNotification("Neues Projekt erstellt", "success");
		// Automatisches Speichern des neuen Projekts
		saveProjectToDatabase();

		return true;
	} catch (error) {
		console.error("Fehler beim Erstellen eines neuen Projekts:", error);
		showNotification(`Fehler beim Erstellen: ${error.message}`, "error");
		return false;
	}
};

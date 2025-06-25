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
		const finalData = {
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

		return finalData;
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
			const towStatus =
				tile.querySelector(`[id^="tow-status-"]`)?.value || "neutral";
			const arrivalTime =
				tile.querySelector(`[id^="arrival-time-"]`)?.value?.trim() || "--:--";
			const departureTime =
				tile.querySelector(`[id^="departure-time-"]`)?.value?.trim() || "--:--";
			const positionInfoGrid =
				tile.querySelector(`[id^="position-"][id$="-${tileId}"]`)?.value || "";

			console.log(`Tow-Status für Kachel ${tileId} gesammelt: ${towStatus}`);
			if (arrivalTime !== "--:--") {
				console.log(
					`Arrival Time für Kachel ${tileId} gesammelt: ${arrivalTime}`
				);
			}
			if (departureTime !== "--:--") {
				console.log(
					`Departure Time für Kachel ${tileId} gesammelt: ${departureTime}`
				);
			}
			if (positionInfoGrid) {
				console.log(
					`Position Info Grid für Kachel ${tileId} gesammelt: ${positionInfoGrid}`
				);
			}

			const tileDataObject = {
				tileId: tileId,
				aircraftId: aircraftId,
				position: position, // Hangar position (hangar-position-X)
				positionInfoGrid: positionInfoGrid, // Position in Info Grid (position-X)
				manualInput: manualInput,
				notes: notes,
				status: status,
				towStatus: towStatus,
				arrivalTime: arrivalTime,
				departureTime: departureTime,
			};

			tileData.push(tileDataObject);
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

		// Tow-Status setzen
		const towStatusSelect = document.querySelector(
			`${container} #tow-status-${tileId}`
		);
		if (towStatusSelect) {
			towStatusSelect.value = tileData.towStatus || "neutral";
			console.log(
				`Tow-Status für Kachel ${tileId} angewendet: ${tileData.towStatus}`
			);
			// Stil-Update für Tow-Status auslösen
			if (
				window.hangarUI &&
				typeof window.hangarUI.updateTowStatus === "function"
			) {
				window.hangarUI.updateTowStatus(tileId);
			}
		}

		// Arrival Time und Departure Time setzen (diese sind Eingabefelder!)
		const arrivalTime = document.querySelector(
			`${container} #arrival-time-${tileId}`
		);
		if (arrivalTime) {
			arrivalTime.value = tileData.arrivalTime || "--:--";
			console.log(
				`Arrival Time für Kachel ${tileId} angewendet: ${tileData.arrivalTime}`
			);
		}

		const departureTime = document.querySelector(
			`${container} #departure-time-${tileId}`
		);
		if (departureTime) {
			departureTime.value = tileData.departureTime || "--:--";
			console.log(
				`Departure Time für Kachel ${tileId} angewendet: ${tileData.departureTime}`
			);
		}

		// Position-Wert setzen (Info Grid)
		const positionInfoGrid = document.querySelector(
			`${container} #position-${tileId}`
		);
		if (positionInfoGrid) {
			positionInfoGrid.value = tileData.positionInfoGrid || "--";
			console.log(
				`Position Info Grid für Kachel ${tileId} angewendet: ${tileData.positionInfoGrid}`
			);
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
 * Speichert das aktuelle Projekt in eine Datei
 * @param {string} [suggestedName] - Vorgeschlagener Dateiname (optional)
 */
function saveProjectToFile(suggestedName = null) {
	try {
		// Verwende den übergebenen Namen oder hol ihn aus dem Eingabefeld oder generiere einen Standardnamen
		const projectName =
			suggestedName ||
			document.getElementById("projectName").value ||
			generateDefaultProjectName();

		console.log(`Speichere Projekt unter: ${projectName}`);

		// Projektstatus sammeln
		const projectData = {
			projectName: projectName,
			lastSaved: new Date().toISOString(),
			tilesData: collectTilesData(),
			settings: collectSettingsData(),
		};

		// Daten in JSON umwandeln
		const jsonData = JSON.stringify(projectData, null, 2);

		// Prüfen, ob die moderne File System Access API verfügbar ist
		if ("showSaveFilePicker" in window) {
			// Moderne File System Access API verwenden
			const options = {
				suggestedName: `${projectName}.json`,
				types: [
					{
						description: "JSON Files",
						accept: { "application/json": [".json"] },
					},
				],
				// Versuche, den letzten verwendeten Pfad wiederzuverwenden
				startIn: "downloads",
			};

			// Datei-Dialog öffnen
			window
				.showSaveFilePicker(options)
				.then((fileHandle) => {
					return fileHandle.createWritable();
				})
				.then((writable) => {
					return writable.write(jsonData).then(() => writable.close());
				})
				.then(() => {
					console.log("Projekt erfolgreich gespeichert");
					showNotification("Projekt erfolgreich gespeichert", "success");

					// Letzten Pfad für zukünftige Verwendung speichern
					try {
						localStorage.setItem("lastSavePath", fileHandle.name);
					} catch (e) {
						console.warn("Konnte letzten Speicherpfad nicht speichern:", e);
					}
				})
				.catch((error) => {
					if (error.name !== "AbortError") {
						console.error("Fehler beim Speichern:", error);
						showNotification(
							"Fehler beim Speichern: " + error.message,
							"error"
						);
					}
				});
		} else {
			// Fallback für ältere Browser: Datei zum Download anbieten
			const blob = new Blob([jsonData], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `${projectName}.json`;
			document.body.appendChild(a);
			a.click();

			// Cleanup
			setTimeout(() => {
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, 0);

			console.log("Projekt wurde zum Download angeboten (Fallback-Methode)");
			showNotification("Projekt wurde zum Download angeboten", "success");
		}
	} catch (error) {
		console.error("Fehler beim Speichern des Projekts:", error);
		showNotification("Fehler beim Speichern: " + error.message, "error");
	}
}

/**
 * Lädt ein Projekt aus einer Datei
 * @returns {Promise} Promise, das aufgelöst wird, wenn das Laden abgeschlossen ist
 */
function loadProjectFromFile() {
	return new Promise((resolve, reject) => {
		try {
			// Prüfen, ob die moderne File System Access API verfügbar ist
			if ("showOpenFilePicker" in window) {
				// Moderne File System Access API verwenden
				const options = {
					types: [
						{
							description: "JSON Files",
							accept: { "application/json": [".json"] },
						},
					],
					// Versuche, den letzten verwendeten Pfad wiederzuverwenden
					startIn: "downloads",
				};

				window
					.showOpenFilePicker(options)
					.then((fileHandles) => fileHandles[0].getFile())
					.then((file) => file.text())
					.then((content) => {
						const projectData = JSON.parse(content);
						applyProjectData(projectData);

						console.log("Projekt erfolgreich geladen");
						showNotification("Projekt erfolgreich geladen", "success");

						// Projektnamen im Eingabefeld setzen
						const projectNameInput = document.getElementById("projectName");
						if (projectNameInput && projectData.projectName) {
							projectNameInput.value = projectData.projectName;
						}

						resolve(projectData);
					})
					.catch((error) => {
						if (error.name !== "AbortError") {
							console.error("Fehler beim Laden:", error);
							showNotification("Fehler beim Laden: " + error.message, "error");
							reject(error);
						} else {
							// User hat abgebrochen
							resolve(null);
						}
					});
			} else {
				// Fallback für ältere Browser
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json";

				input.onchange = (event) => {
					const file = event.target.files[0];
					if (!file) {
						resolve(null);
						return;
					}

					const reader = new FileReader();
					reader.onload = (e) => {
						try {
							const projectData = JSON.parse(e.target.result);
							applyProjectData(projectData);

							console.log("Projekt erfolgreich geladen (Fallback-Methode)");
							showNotification("Projekt erfolgreich geladen", "success");

							// Projektnamen im Eingabefeld setzen
							const projectNameInput = document.getElementById("projectName");
							if (projectNameInput && projectData.projectName) {
								projectNameInput.value = projectData.projectName;
							}

							resolve(projectData);
						} catch (error) {
							console.error("Fehler beim Parsen der Datei:", error);
							showNotification(
								"Fehler beim Parsen der Datei: " + error.message,
								"error"
							);
							reject(error);
						}
					};

					reader.onerror = (error) => {
						console.error("Fehler beim Lesen der Datei:", error);
						showNotification("Fehler beim Lesen der Datei", "error");
						reject(error);
					};

					reader.readAsText(file);
				};

				input.click();
			}
		} catch (error) {
			console.error("Fehler beim Öffnen des Dateidialogs:", error);
			showNotification(
				"Fehler beim Öffnen des Dateidialogs: " + error.message,
				"error"
			);
			reject(error);
		}
	});
}

// Hilfsfunktionen

/**
 * Sammelt alle Daten aus den Kacheln
 * @returns {Array} Array mit Kacheldaten
 */
function collectTilesData() {
	const tiles = [];

	// Alle primären Kacheln sammeln
	document
		.querySelectorAll("#hangarGrid .hangar-cell")
		.forEach((cell, index) => {
			const cellId = index + 1;
			const tileData = {
				id: cellId,
				position:
					document.getElementById(`hangar-position-${cellId}`)?.value || "",
				aircraftId: document.getElementById(`aircraft-${cellId}`)?.value || "",
				status: document.getElementById(`status-${cellId}`)?.value || "ready",
				towStatus:
					document.getElementById(`tow-status-${cellId}`)?.value || "initiated",
				notes: document.getElementById(`notes-${cellId}`)?.value || "",
			};

			tiles.push(tileData);
		});

	// Alle sekundären Kacheln sammeln (ID >= 101)
	document
		.querySelectorAll("#secondaryHangarGrid .hangar-cell")
		.forEach((cell) => {
			const cellId = parseInt(
				cell.getAttribute("data-cell-id") || cell.id.split("-").pop()
			);
			if (cellId >= 101) {
				const tileData = {
					id: cellId,
					position:
						document.getElementById(`hangar-position-${cellId}`)?.value || "",
					aircraftId:
						document.getElementById(`aircraft-${cellId}`)?.value || "",
					status: document.getElementById(`status-${cellId}`)?.value || "ready",
					towStatus:
						document.getElementById(`tow-status-${cellId}`)?.value ||
						"initiated",
					notes: document.getElementById(`notes-${cellId}`)?.value || "",
				};

				tiles.push(tileData);
			}
		});

	return tiles;
}

/**
 * Sammelt alle Einstellungsdaten
 * @returns {Object} Einstellungsobjekt
 */
function collectSettingsData() {
	return {
		tilesCount: parseInt(document.getElementById("tilesCount")?.value) || 8,
		secondaryTilesCount:
			parseInt(document.getElementById("secondaryTilesCount")?.value) || 0,
		layout: parseInt(document.getElementById("layoutType")?.value) || 4,
		includeNotes: document.getElementById("includeNotes")?.checked || true,
		landscapeMode: document.getElementById("landscapeMode")?.checked || true,
	};
}

/**
 * Wendet geladene Projektdaten auf die UI an
 * @param {Object} projectData - Die geladenen Projektdaten
 */
function applyProjectData(projectData) {
	if (!projectData) return;

	// Einstellungen anwenden
	if (projectData.settings) {
		const { tilesCount, secondaryTilesCount, layout } = projectData.settings;

		// UI-Felder aktualisieren
		if (document.getElementById("tilesCount")) {
			document.getElementById("tilesCount").value = tilesCount || 8;
		}

		if (document.getElementById("secondaryTilesCount")) {
			document.getElementById("secondaryTilesCount").value =
				secondaryTilesCount || 0;
		}

		if (document.getElementById("layoutType")) {
			document.getElementById("layoutType").value = layout || 4;
		}

		// UI-Einstellungen anwenden
		if (window.hangarUI && window.hangarUI.uiSettings) {
			window.hangarUI.uiSettings.tilesCount = tilesCount || 8;
			window.hangarUI.uiSettings.secondaryTilesCount = secondaryTilesCount || 0;
			window.hangarUI.uiSettings.layout = layout || 4;
			window.hangarUI.uiSettings.apply();
		}
	}

	// Kacheldaten anwenden (mit Verzögerung, um sicherzustellen, dass die Kacheln erstellt wurden)
	setTimeout(() => {
		if (projectData.tilesData && Array.isArray(projectData.tilesData)) {
			projectData.tilesData.forEach((tileData) => {
				const {
					id,
					position,
					aircraftId,
					status,
					towStatus,
					notes,
					arrivalTime,
					departureTime,
					positionInfoGrid,
				} = tileData;

				// Positionswert setzen
				const posInput = document.getElementById(`hangar-position-${id}`);
				if (posInput) posInput.value = position || "";

				// Aircraft ID setzen
				const aircraftInput = document.getElementById(`aircraft-${id}`);
				if (aircraftInput) aircraftInput.value = aircraftId || "";

				// Status setzen
				const statusSelect = document.getElementById(`status-${id}`);
				if (statusSelect) {
					statusSelect.value = status || "ready";
					// Status-Event auslösen, um das Statuslicht zu aktualisieren
					const event = new Event("change");
					statusSelect.dispatchEvent(event);
				}

				// Tow-Status setzen
				const towStatusSelect = document.getElementById(`tow-status-${id}`);
				if (towStatusSelect) {
					towStatusSelect.value = towStatus || "initiated";
					// Event auslösen, um Styling zu aktualisieren
					const event = new Event("change");
					towStatusSelect.dispatchEvent(event);
				}

				// Notizen setzen
				const notesTextarea = document.getElementById(`notes-${id}`);
				if (notesTextarea) notesTextarea.value = notes || "";

				// Arrival Time setzen (NEU HINZUGEFÜGT)
				if (tileData.arrivalTime && tileData.arrivalTime !== "--:--") {
					const arrivalInput = document.getElementById(`arrival-time-${id}`);
					if (arrivalInput) {
						arrivalInput.value = tileData.arrivalTime;
						console.log(
							`Arrival Time für Tile ${id} aus LocalStorage: ${tileData.arrivalTime}`
						);
					}
				}

				// Departure Time setzen (NEU HINZUGEFÜGT)
				if (tileData.departureTime && tileData.departureTime !== "--:--") {
					const departureInput = document.getElementById(
						`departure-time-${id}`
					);
					if (departureInput) {
						departureInput.value = tileData.departureTime;
						console.log(
							`Departure Time für Tile ${id} aus LocalStorage: ${tileData.departureTime}`
						);
					}
				}

				// Position Info Grid setzen (NEU HINZUGEFÜGT)
				if (tileData.positionInfoGrid) {
					const positionInfoInput = document.getElementById(`position-${id}`);
					if (positionInfoInput) {
						positionInfoInput.value = tileData.positionInfoGrid;
						console.log(
							`Position Info Grid für Tile ${id} aus LocalStorage: ${tileData.positionInfoGrid}`
						);
					}
				}
			});
		}
	}, 300);
}

/**
 * Generiert einen Standarddateinamen im Format yyyy_mm_dd Hangarplanner
 * @returns {string} Formatierter Dateiname
 */
function generateDefaultProjectName() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}_${month}_${day} Hangarplanner`;
}

// Exportieren für die globale Verwendung
window.hangarData = window.hangarData || {};
window.hangarData.saveProjectToFile = saveProjectToFile;
window.hangarData.loadProjectFromFile = loadProjectFromFile;
window.hangarData.applyLoadedHangarPlan = applyLoadedHangarPlan;
window.collectAllHangarData = collectAllHangarData; // Neue Zeile
window.hangarData.saveCurrentStateToLocalStorage = function () {
	// Aktuelle Daten im localStorage speichern
	const projectData = {
		projectName:
			document.getElementById("projectName")?.value ||
			generateDefaultProjectName(),
		lastSaved: new Date().toISOString(),
		tilesData: collectTilesData(),
		settings: collectSettingsData(),
	};

	localStorage.setItem(
		"hangarPlannerCurrentState",
		JSON.stringify(projectData)
	);
	console.log("Aktueller Zustand im LocalStorage gespeichert");
};

// Automatisches Laden des letzten Zustands beim Start
document.addEventListener("DOMContentLoaded", function () {
	// Versuchen, den letzten Zustand aus dem LocalStorage zu laden
	try {
		// Prüfen, ob gerade Server-Daten angewendet werden
		if (window.isApplyingServerData) {
			console.log(
				"LocalStorage-Wiederherstellung übersprungen: Server-Daten werden angewendet"
			);
			return;
		}

		const savedState = localStorage.getItem("hangarPlannerCurrentState");
		if (savedState) {
			const projectData = JSON.parse(savedState);
			applyProjectData(projectData);
			console.log("Letzter Zustand aus LocalStorage geladen");
		}
	} catch (error) {
		console.warn("Konnte letzten Zustand nicht laden:", error);
	}
});

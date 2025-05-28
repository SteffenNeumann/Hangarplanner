// @ts-nocheck

document.addEventListener("DOMContentLoaded", () => {
	// Debug-Modus deaktivieren
	const DEBUG = false;

	// Hilfsfunktion für Debug-Ausgaben (bleibt für zukünftige Fehlerbehebung erhalten)
	function debug(message, obj = null) {
		if (!DEBUG) return;
		if (obj) {
			console.log(`[DEBUG] ${message}`, obj);
		} else {
			console.log(`[DEBUG] ${message}`);
		}
	}

	// Hilfsfunktion, um DOM-Element-Existenz zu prüfen
	function checkElement(id) {
		const element = document.getElementById(id);
		if (!element) {
			if (DEBUG) console.error(`Element mit ID "${id}" nicht gefunden!`);
			return false;
		}
		return true;
	}

	// Dateipfad-Konfiguration für die Anwendung
	const filePaths = {
		// Basis-Ordner für die App
		baseDir: "HangarPlanner",

		// Unterordner für Projektdaten - Angepasst an die neue Struktur
		dataDir: "Projects",

		// Unterordner für Einstellungen - Angepasst an die neue Struktur
		settingsDir: "settings",

		// Hilfsfunktion zum Erzeugen des vollen Dateipfads für Projekte
		getProjectPath: function (filename) {
			if (!filename.endsWith(".json")) {
				filename += ".json";
			}
			return `${this.dataDir}/${filename}`;
		},

		// Hilfsfunktion zum Erzeugen des vollen Dateipfads für Einstellungen
		getSettingsPath: function (filename) {
			if (!filename.endsWith(".json")) {
				filename += ".json";
			}
			return `${this.settingsDir}/${filename}`;
		},
	};

	// DOM-Element-Prüfung für kritische UI-Elemente
	const criticalElements = [
		"modeToggle",
		"menuToggle",
		"updateTilesBtn",
		"updateSecondaryTilesBtn",
		"layoutType",
		"saveSettingsBtn",
		"loadSettingsBtn",
		"exportPdfBtn",
		"saveBtn",
		"loadBtn",
		"btnSearch",
		"fetchFlightData",
		"projectName",
		"tilesCount",
		"secondaryTilesCount",
	];

	// Überprüfe, ob alle kritischen Elemente vorhanden sind (ohne Debug-Ausgaben)
	let allElementsPresent = true;
	criticalElements.forEach((id) => {
		if (!checkElement(id)) {
			allElementsPresent = false;
		}
	});

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

	// Referenz zum Datenbank-Manager
	const dbManager = window.databaseManager;

	// Globale Funktionen für Datenbankinteraktion
	window.loadProjectFromDatabase = function (projectData) {
		try {
			// Projektname setzen
			if (projectData.metadata && projectData.metadata.projectName) {
				document.getElementById("projectName").value =
					projectData.metadata.projectName;
			}

			// Einstellungen übernehmen
			if (projectData.settings) {
				if (checkElement("tilesCount")) {
					document.getElementById("tilesCount").value =
						projectData.settings.tilesCount || 8;
				}
				if (checkElement("secondaryTilesCount")) {
					document.getElementById("secondaryTilesCount").value =
						projectData.settings.secondaryTilesCount || 0;
				}
				if (checkElement("layoutType")) {
					document.getElementById("layoutType").value =
						projectData.settings.layout || 4;
				}

				// Einstellungen anwenden
				uiSettings.tilesCount = projectData.settings.tilesCount || 8;
				uiSettings.secondaryTilesCount =
					projectData.settings.secondaryTilesCount || 0;
				uiSettings.layout = projectData.settings.layout || 4;
				uiSettings.apply();
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
			uiSettings.tilesCount = 8;
			uiSettings.secondaryTilesCount = 0;
			uiSettings.layout = 4;
			uiSettings.apply();

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

	// Funktion zum Zurücksetzen aller Felder
	function resetAllFields() {
		// Projektname zurücksetzen
		if (checkElement("projectName")) {
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
					if (cellId) updateStatusLights(cellId);
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

	// Speichern in die Datenbank
	async function saveProjectToDatabase() {
		try {
			const projectData = collectAllHangarData();

			// In Datenbank speichern
			const projectId = await dbManager.saveProject(projectData);

			// Erfolgsmeldung anzeigen
			showNotification(
				"Projekt erfolgreich in der Datenbank gespeichert",
				"success"
			);

			return projectId;
		} catch (error) {
			console.error("Fehler beim Speichern in der Datenbank:", error);
			showNotification(`Speichern fehlgeschlagen: ${error.message}`, "error");
			return null;
		}
	}

	// UI-Einstellungen Objekt mit korrigierter Syntax
	const uiSettings = {
		tilesCount: 8,
		secondaryTilesCount: 0,
		layout: 4,

		// Lädt Einstellungen aus der Datenbank und fallback auf localStorage
		// Korrigierte async-Funktion ohne Leerzeichen zwischen load und ()
		load: async function () {
			try {
				// Zuerst versuchen, aus der IndexedDB zu laden
				if (dbManager) {
					try {
						const dbSettings = await dbManager.loadSettings("ui");
						if (dbSettings && dbSettings.data) {
							// Einstellungen aus der Datenbank laden
							this.tilesCount = dbSettings.data.tilesCount || 8;
							this.secondaryTilesCount =
								dbSettings.data.secondaryTilesCount || 0;
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

				// Manuelle Eingabe setzen
				if (tileValue.manualInput) {
					// Bestimme den Container (primär oder sekundär)
					const container =
						tileValue.cellId < 100 ? "#hangarGrid" : "#secondaryHangarGrid";
					const index =
						tileValue.cellId < 100 ? tileValue.cellId : tileValue.cellId - 100;

					// Suche nach dem manuellen Eingabefeld
					const manualInput = document.querySelector(
						`${container} .hangar-cell:nth-child(${index}) input[placeholder="Manual Input"]`
					);

					if (manualInput) {
						manualInput.value = tileValue.manualInput;
						debug(
							`Manuelle Eingabe für Kachel ${tileValue.cellId} gesetzt: ${tileValue.manualInput}`
						);
					}
				}
			});
		},

		// Aktualisiert die UI-Steuerelemente mit aktuellen Werten
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

		// Speichert Einstellungen in localStorage und IndexedDB
		// Korrigierte Methode ohne Leerraum zwischen save und ()
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

		// Hilfsmethode zum Sammeln von Kachelwerten
		collectTileValues: function (containerSelector, tileValues, baseIndex) {
			const container = document.querySelector(containerSelector);
			if (!container) return;

			const cells = container.querySelectorAll(".hangar-cell");

			cells.forEach((cell, index) => {
				const cellId = baseIndex + index;

				// Position-Input finden
				const positionInput = document.getElementById(
					`hangar-position-${cellId}`
				);

				// Manuelles Eingabefeld finden
				const manualInput = cell.querySelector(
					'input[placeholder="Manual Input"]'
				);

				// Wenn wir Werte haben, fügen wir sie hinzu
				if (
					(positionInput && positionInput.value) ||
					(manualInput && manualInput.value)
				) {
					tileValues.push({
						cellId: cellId,
						position: positionInput ? positionInput.value : "",
						manualInput: manualInput ? manualInput.value : "",
					});
				}
			});

			debug(`${cells.length} Kacheln aus ${containerSelector} verarbeitet`);
		},

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

				// KORREKTUR: Sekundäre Kacheln aktualisieren statt nur das Layout zu ändern
				// Vorhandene sekundäre Kacheln komplett neu aufbauen mit der aktuellen Anzahl
				updateSecondaryTiles(this.secondaryTilesCount, this.layout);

				// Skalierung nach Layoutänderung neu berechnen
				setTimeout(adjustScaling, 50);
				return true;
			} catch (error) {
				console.error("Fehler beim Anwenden der Einstellungen:", error);
				return false;
			}
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
				const position =
					tile.querySelector(`[id^="hangar-position-"]`)?.value || "";
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
	 * Initialisiere die UI mit Error-Handling
	 */
	function initializeUI() {
		// Automatischer Dateiname aus Datum/Zeit generieren
		if (checkElement("projectName")) {
			document.getElementById("projectName").value = generateTimestamp();
		}

		// Gespeicherte Einstellungen laden und anwenden
		// Korrigierte anonyme async-Funktion mit korrekter Syntax
		(async function () {
			try {
				await uiSettings.load();
				uiSettings.apply();
			} catch (error) {
				console.error("Fehler beim Laden der Einstellungen:", error);
			}
		})();

		// Dateidialog-Modus immer aktivieren ohne Wahlmöglichkeit
		localStorage.setItem("useFileSystemAccess", "true");

		// Anfangszustand des Menüs korrekt setzen
		document.body.classList.remove("sidebar-collapsed");
		const sidebarMenu = document.getElementById("sidebarMenu");
		if (sidebarMenu) {
			sidebarMenu.classList.remove("collapsed");
		}

		// Initial die Skalierung anpassen
		adjustScaling();

		// Event-Listener für Fenstergrößenänderungen
		window.addEventListener("resize", adjustScaling);

		// Settings-Elemente ausblenden
		const saveSettingsBtn = document.getElementById("saveSettingsBtn");
		const loadSettingsBtn = document.getElementById("loadSettingsBtn");
		if (
			saveSettingsBtn &&
			saveSettingsBtn.parentElement &&
			saveSettingsBtn.parentElement.parentElement
		) {
			// Blende den ganzen Settings-Bereich aus
			saveSettingsBtn.parentElement.parentElement.style.display = "none";
		}
	}

	// Initialisierungscode erweitern
	function extendedInit() {
		// Dateidialog-Modus immer aktivieren
		localStorage.setItem("useFileSystemAccess", "true");

		// Event-Handler überprüfen und korrigieren
		verifyEventHandlers();

		// API-Unterstützung prüfen und Benutzer informieren
		if (
			typeof window.showOpenFilePicker !== "function" ||
			typeof window.showSaveFilePicker !== "function"
		) {
			console.warn("Browser unterstützt File System Access API nicht");
			showNotification(
				"Ihr Browser unterstützt keine nativen Dateiauswahldialoge. Einige Funktionen sind eingeschränkt.",
				"warning",
				8000
			);
		}
	}

	// Alte Funktionen verbleiben, aber werden ergänzt
	// Ergänze die initializeUI-Funktion um den erweiterten Initialisierungscode
	const originalInitializeUI = initializeUI;
	initializeUI = function () {
		originalInitializeUI.apply(this, arguments);
		extendedInit();
	};

	/**
	 * Richtet alle Event-Listener für die UI ein
	 */
	function setupUIEventListeners() {
		// Bearbeitungs-/Anzeigemodus Toggle
		const modeToggle = document.getElementById("modeToggle");
		if (modeToggle) {
			modeToggle.addEventListener("change", function () {
				if (this.checked) {
					document.body.classList.remove("view-mode");
					document.body.classList.add("edit-mode");
				} else {
					document.body.classList.remove("edit-mode");
					document.body.classList.add("view-mode");
				}
			});
		}

		// Toggle für Sidebar mit verbesserter Breitenskalierung
		const menuToggle = document.getElementById("menuToggle");
		if (menuToggle) {
			menuToggle.addEventListener("click", function () {
				const sidebar = document.getElementById("sidebarMenu");
				if (sidebar) {
					sidebar.classList.toggle("collapsed");
					document.body.classList.toggle("sidebar-collapsed");

					// Nach dem Umschalten des Menüs die Skalierung und Container-Breite anpassen
					setTimeout(() => {
						adjustScaling();
					}, 300);
				}
			});
		}

		// Einstellungen-Buttons
		const updateTilesBtn = document.getElementById("updateTilesBtn");
		if (updateTilesBtn) {
			updateTilesBtn.addEventListener("click", function () {
				if (checkElement("tilesCount")) {
					uiSettings.tilesCount =
						parseInt(document.getElementById("tilesCount").value) || 8;
					uiSettings.save();
					uiSettings.apply();
				}
			});
		}

		const updateSecondaryTilesBtn = document.getElementById(
			"updateSecondaryTilesBtn"
		);
		if (updateSecondaryTilesBtn) {
			updateSecondaryTilesBtn.addEventListener("click", function () {
				if (checkElement("secondaryTilesCount")) {
					uiSettings.secondaryTilesCount =
						parseInt(document.getElementById("secondaryTilesCount").value) || 0;
					console.log(
						"Updating secondary tiles to: " + uiSettings.secondaryTilesCount
					);
					uiSettings.save();
					uiSettings.apply(); // Dies sollte nun updateSecondaryTiles aufrufen
				}
			});
		}

		const layoutType = document.getElementById("layoutType");
		if (layoutType) {
			layoutType.addEventListener("change", function () {
				uiSettings.layout = parseInt(this.value) || 4;
				uiSettings.save();
				uiSettings.apply();
			});
		}

		// Settings-Buttons mit automatischer Speicherung (behalten aber ausgeblendet)
		const saveSettingsBtn = document.getElementById("saveSettingsBtn");
		if (saveSettingsBtn) {
			saveSettingsBtn.addEventListener("click", function () {
				uiSettings.save(true); // true = mit Dateiexport
			});
		}

		// Automatische Speicherung der Einstellungen bei Änderungen
		if (updateTilesBtn) {
			updateTilesBtn.addEventListener("click", function () {
				// Nach der Anwendung der neuen Einstellungen automatisch speichern
				setTimeout(() => uiSettings.save(), 100);
			});
		}

		if (updateSecondaryTilesBtn) {
			updateSecondaryTilesBtn.addEventListener("click", function () {
				// Nach der Anwendung der neuen Einstellungen automatisch speichern
				setTimeout(() => uiSettings.save(), 100);
			});
		}

		if (layoutType) {
			layoutType.addEventListener("change", function () {
				// Nach der Layoutänderung automatisch speichern
				setTimeout(() => uiSettings.save(), 100);
			});
		}

		// PDF Export Funktion
		const exportPdfBtn = document.getElementById('exportPdfBtn');
		if (exportPdfBtn) {
			exportPdfBtn.addEventListener('click', function() {
				const filename = document.getElementById('pdfFilename').value || 'Hangar_Plan';
				const includeNotes = document.getElementById('includeNotes').checked;
				const landscapeMode = document.getElementById('landscapeMode').checked;

				// Erstelle eine Kopie des hangarGrid für den Export
				const originalGrid = document.getElementById('hangarGrid');
				const exportContainer = document.createElement('div');
				exportContainer.className = 'pdf-content';

				// Füge Titel hinzu
				const title = document.createElement('h1');
				title.textContent = document.getElementById('projectName').value || 'Hangar Plan';
				title.style.fontSize = '24px';
				title.style.fontWeight = 'bold';
				title.style.marginBottom = '15px';
				title.style.textAlign = 'center';
				title.style.color = '#2D3142';
				exportContainer.appendChild(title);

				// Datum hinzufügen
				const dateElement = document.createElement('p');
				dateElement.textContent = 'Date: ' + new Date().toLocaleDateString();
				dateElement.style.fontSize = '14px';
				dateElement.style.marginBottom = '20px';
				dateElement.style.textAlign = 'center';
				dateElement.style.color = '#4F5D75';
				exportContainer.appendChild(dateElement);

				// Grid-Container erstellen mit angepasstem Layout für PDF
				const gridContainer = document.createElement('div');
				gridContainer.style.display = 'grid';

				// Angepasste Spaltenanzahl je nach Modus und Anzahl der Kacheln
				const visibleCells = Array.from(originalGrid.children).filter(cell => !cell.classList.contains('hidden'));
				const cellCount = visibleCells.length;

				// Bestimme optimale Spaltenanzahl basierend auf Anzahl der sichtbaren Zellen
				let columns;
				if (landscapeMode) {
					columns = cellCount <= 2 ? cellCount : cellCount <= 4 ? 2 : cellCount <= 6 ? 3 : 4;
				} else {
					columns = cellCount <= 2 ? cellCount : 2; // Im Hochformat maximal 2 Spalten
				}

				gridContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
				gridContainer.style.gap = '10px';
				gridContainer.style.width = '100%';
				gridContainer.style.maxWidth = landscapeMode ? '1000px' : '800px';
				gridContainer.style.margin = '0 auto';

				// Nur sichtbare Kacheln kopieren
				visibleCells.forEach(cell => {
					const cellClone = cell.cloneNode(true);
					cellClone.style.breakInside = 'avoid';
					cellClone.style.pageBreakInside = 'avoid';
					cellClone.style.width = '100%';

					// Vereinfache und optimiere für PDF
					const headerElement = cellClone.querySelector('[class*="bg-industrial-medium"]');
					if (headerElement) {
						headerElement.style.backgroundColor = '#4F5D75';
						headerElement.style.color = 'white';
						headerElement.style.padding = '8px';
						headerElement.style.borderTopLeftRadius = '8px';
						headerElement.style.borderTopRightRadius = '8px';

						// Position-Anzeige optimieren
						const positionElement = headerElement.querySelector('[class*="text-xs text-white"]');
						if (positionElement) {
							positionElement.style.fontSize = '11px';
							positionElement.style.whiteSpace = 'nowrap';
						}

						// Input-Felder für bessere PDF-Darstellung optimieren
						const inputs = headerElement.querySelectorAll('input');
						inputs.forEach(input => {
							input.style.width = input.classList.contains('w-10') ? '30px' : '90px';
							input.style.backgroundColor = '#3A4154';
							input.style.padding = '2px 4px';
							input.style.fontSize = '11px';
						});
					}

					// Status Lichter
					const statusLights = cellClone.querySelectorAll('.status-light');
					statusLights.forEach(light => {
						if (!light.classList.contains('active')) {
							light.style.display = 'none'; // Nur aktiven Status anzeigen
						} else {
							light.style.boxShadow = 'none';
							light.style.transform = 'none'; // Entferne Skalierung
						}
					});

					// Aircraft ID optimieren
					const aircraftId = cellClone.querySelector('.aircraft-id');
					if (aircraftId) {
						aircraftId.style.fontSize = '16px';
						aircraftId.style.padding = '4px 0';
						aircraftId.style.borderBottomWidth = '1px';
					}

					// Info-Grid optimieren
					const infoGrid = cellClone.querySelector('.info-grid');
					if (infoGrid) {
						infoGrid.style.fontSize = '12px';
						infoGrid.style.gap = '3px';
						infoGrid.style.maxWidth = '100%';
					}

					// Entferne Notizbereich wenn nicht gewünscht
					if (!includeNotes) {
						const notesContainer = cellClone.querySelector('.notes-container');
						if (notesContainer) notesContainer.remove();
					} else {
						// Notizen optimieren
						const notesContainer = cellClone.querySelector('.notes-container');
						if (notesContainer) {
							notesContainer.style.minHeight = '40px';
							const notesLabel = notesContainer.querySelector('label');
							if (notesLabel) notesLabel.style.fontSize = '11px';
							const textarea = notesContainer.querySelector('textarea');
							if (textarea) {
								textarea.style.fontSize = '11px';
								textarea.style.minHeight = '30px';
							}
						}
					}

					// Entferne Status-Selector aus dem Export
					const statusSelector = cellClone.querySelector('select');
					if (statusSelector && statusSelector.parentElement) statusSelector.parentElement.remove();

					// Hauptbereich für PDF optimieren
					const mainArea = cellClone.querySelector('.p-4');
					if (mainArea) {
						mainArea.style.backgroundColor = 'white';
						mainArea.style.color = 'black';
						mainArea.style.borderBottomLeftRadius = '8px';
						mainArea.style.borderBottomRightRadius = '8px';
						mainArea.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
						mainArea.style.padding = '8px 10px';
					}

					gridContainer.appendChild(cellClone);
				});

				exportContainer.appendChild(gridContainer);

				// Styles für den Export
				exportContainer.style.padding = '20px';
				exportContainer.style.backgroundColor = 'white';
				exportContainer.style.width = '100%';
				exportContainer.style.margin = '0 auto';
				exportContainer.style.maxWidth = landscapeMode ? '1100px' : '900px';

				// Konfiguriere und generiere PDF
				const options = {
					margin: [10, 10],
					filename: `${filename}.pdf`,
					image: { type: 'jpeg', quality: 0.98 },
					html2canvas: { 
						scale: 2, 
						logging: false,
						letterRendering: true,
						useCORS: true,
						allowTaint: true,
						width: landscapeMode ? 1100 : 900
					},
					jsPDF: { 
						unit: 'mm', 
						format: 'a4', 
						orientation: landscapeMode ? 'landscape' : 'portrait',
						compress: true,
						precision: 2
					}
				};

				// Erzeuge und downloade PDF
				html2pdf().from(exportContainer).set(options).save();
			});
		}

		// Save und Load Buttons - direkte Verwendung von Dateidialogen
		const saveBtn = document.getElementById("saveBtn");
		if (saveBtn) {
			saveBtn.addEventListener("click", function () {
				// Direkter Dateidialog zum Speichern
				saveProject();
			});
		}

		const loadBtn = document.getElementById("loadBtn");
		if (loadBtn) {
			loadBtn.addEventListener("click", function () {
				// Direkter Dateidialog zum Laden
				showProjectBrowser();
			});
		}

		// Datei-Modus Toggle - entfernen oder ausblenden
		const fileSystemToggle = document.getElementById("fileSystemToggle");
		if (fileSystemToggle) {
			// Toggle verstecken, da wir immer den Dateidialog verwenden
			fileSystemToggle.parentElement.style.display = "none";
		}

		// Füge Event-Listener für neue UI-Elemente hinzu (falls in HTML vorhanden)
		const newProjectBtn = document.getElementById("newProjectBtn");
		if (newProjectBtn) {
			newProjectBtn.addEventListener("click", function () {
				const projectName = prompt(
					"Bitte geben Sie einen Namen für das neue Projekt ein:",
					generateTimestamp()
				);
				if (projectName) {
					window.createNewProjectInDatabase(projectName);
				}
			});
		}

		// Initialisiere Status-Handler für alle vorhandenen Kacheln
		initStatusHandlers();
	}

	/**
	 * Initialisiere Status-Handler für alle Kacheln
	 */
	function initStatusHandlers() {
		// Primäre Kacheln
		document
			.querySelectorAll('#hangarGrid select[id^="status-"]')
			.forEach((select) => {
				const cellId = parseInt(select.id.split("-")[1]);
				select.onchange = function () {
					updateStatusLights(cellId);
				};

				// Initialen Status setzen
				updateStatusLights(cellId);
			});

		// Sekundäre Kacheln
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
			document.documentElement.style.setProperty(
				"--inv-scale",
				1 / scaleFactor
			);
			document.documentElement.style.setProperty(
				"--section-spacing",
				`${12 / scaleFactor}px`
			);

			// Grid-Layout anpassen
			const layout = uiSettings.layout || 4;
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
		} catch (error) {
			console.error("Fehler bei der Skalierungsanpassung:", error);
		}
	}

	/**
	 * Verbesserte Funktion zur Steuerung der Sichtbarkeit der sekundären Sektion
	 */
	function toggleSecondarySection(visible = false) {
		const secondaryCount = uiSettings.secondaryTilesCount || 0;
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
	 * UI-Initialisierung
	 */
	function initializeUI() {
		// Automatischer Dateiname aus Datum/Zeit generieren
		if (checkElement("projectName")) {
			document.getElementById("projectName").value = generateTimestamp();
		}

		// Gespeicherte Einstellungen laden und anwenden
		// Korrigierte anonyme async-Funktion mit korrekter Syntax
		(async function () {
			try {
				await uiSettings.load();
				uiSettings.apply();
			} catch (error) {
				console.error("Fehler beim Laden der Einstellungen:", error);
			}
		})();

		// Dateidialog-Modus immer aktivieren ohne Wahlmöglichkeit
		localStorage.setItem("useFileSystemAccess", "true");

		// Anfangszustand des Menüs korrekt setzen
		document.body.classList.remove("sidebar-collapsed");
		const sidebarMenu = document.getElementById("sidebarMenu");
		if (sidebarMenu) {
			sidebarMenu.classList.remove("collapsed");
		}

		// Initial die Skalierung anpassen
		adjustScaling();

		// Event-Listener für Fenstergrößenänderungen
		window.addEventListener("resize", adjustScaling);

		// Settings-Elemente ausblenden
		const saveSettingsBtn = document.getElementById("saveSettingsBtn");
		const loadSettingsBtn = document.getElementById("loadSettingsBtn");
		if (
			saveSettingsBtn &&
			saveSettingsBtn.parentElement &&
			saveSettingsBtn.parentElement.parentElement
		) {
			// Blende den ganzen Settings-Bereich aus
			saveSettingsBtn.parentElement.parentElement.style.display = "none";
		}
	}

	/**
	 * Erstellt einen Zeitstempel für die Benennung von Dateien
	 */
	function generateTimestamp() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");

		return `HangarPlan_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
	}

	/**
	 * Aktualisiert die Status-Lichter basierend auf dem gewählten Status
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
						if (checkElement("tilesCount")) {
							document.getElementById("tilesCount").value =
								data.settings.tilesCount || 8;
						}
						if (checkElement("secondaryTilesCount")) {
							document.getElementById("secondaryTilesCount").value =
								data.settings.secondaryTilesCount || 0;
						}
						if (checkElement("layoutType")) {
							document.getElementById("layoutType").value =
								data.settings.layout || 4;
						}

						// Einstellungen anwenden
						uiSettings.tilesCount = data.settings.tilesCount || 8;
						uiSettings.secondaryTilesCount =
							data.settings.secondaryTilesCount || 0;
						uiSettings.layout = data.settings.layout || 4;
						uiSettings.apply();
					}

					// Kachelndaten anwenden
					applyLoadedTileData(data);

					showNotification("Hangarplan erfolgreich geladen", "success");
				} catch (error) {
					console.error(
						"Fehler beim Verarbeiten der importierten Datei:",
						error
					);
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
				uiSettings.secondaryTilesCount = data.settings.secondaryTilesCount;
				updateSecondaryTiles(uiSettings.secondaryTilesCount, uiSettings.layout);
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

			// Position setzen
			const positionInput = document.querySelector(
				`${container} #hangar-position-${tileId}`
			);
			if (positionInput) {
				positionInput.value = tileData.position || "";
			}

			// Manuelle Eingabe setzen
			const cellIndex = isSecondary ? tileId - 100 : tileId;
			const cells = document.querySelectorAll(`${container} .hangar-cell`);
			if (cells.length >= cellIndex) {
				const manualInput = cells[cellIndex - 1].querySelector(
					'input[placeholder="Manual Input"]'
				);
				if (manualInput) {
					manualInput.value = tileData.manualInput || "";
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
				updateStatusLights(tileId);
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
	 * Sammelt alle Daten für den Export
	 * @returns {Object} - Objekt mit allen Daten des Hangarplans
	 */
	function collectAllHangarData() {
		const projectName =
			document.getElementById("projectName").value || generateTimestamp();

		return {
			id: document.getElementById("projectId")?.value || Date.now().toString(), // ID für Datenbank
			metadata: {
				projectName: projectName,
				exportDate: new Date().toISOString(),
				version: "1.0",
			},
			settings: {
				tilesCount: uiSettings.tilesCount,
				secondaryTilesCount: uiSettings.secondaryTilesCount,
				layout: uiSettings.layout,
			},
			primaryTiles: collectTileData("#hangarGrid"),
			secondaryTiles: collectTileData("#secondaryHangarGrid"),
		};
	}

	/**
	 * Speichert das aktuelle Projekt mit Dateidialog
	 * Diese Funktion sorgt dafür, dass ein Dateiauswahldialog angezeigt wird
	 */
	function saveProject() {
		try {
			console.log("Speicherfunktion wird aufgerufen...");

			// Zeige Benachrichtigung, dass der Speichervorgang beginnt
			showNotification("Bereite Speichervorgang vor...", "info");

			// Rufe die Export-Funktion auf, die den Dateiauswahldialog anzeigt
			exportHangarPlanToJson();
		} catch (error) {
			console.error("Kritischer Fehler beim Speichern:", error);
			showNotification(`Fehler beim Speichern: ${error.message}`, "error");
		}
	}

	/**
	 * Exportiert den aktuellen Hangarplan als JSON-Datei mit Dateiauswahldialog
	 * Diese Funktion wurde überarbeitet, um robust zu funktionieren
	 */
	function exportHangarPlanToJson() {
		console.log("exportHangarPlanToJson wird ausgeführt");

		try {
			// Sammle alle relevanten Daten
			const allData = collectAllHangarData();

			// Erstelle den JSON-String
			const jsonData = JSON.stringify(allData, null, 2);

			// Verwende den Projektnamen vom Eingabefeld oder einen Fallback
			const projectName =
				document.getElementById("projectName").value || generateTimestamp();
			const fileName = `${projectName}`;

			// Prüfe, ob die moderne File System Access API unterstützt wird
			if (typeof window.showSaveFilePicker === "function") {
				console.log("File System Access API wird verwendet");

				// Zeige dem Benutzer einen Hinweis
				showNotification(
					`Bitte wählen Sie einen Speicherort für Ihr Projekt "${projectName}"`,
					"info",
					5000
				);

				// Konfiguriere die Optionen für den File Picker
				const options = {
					suggestedName: `${fileName}.json`,
					types: [
						{
							description: "JSON Files",
							accept: { "application/json": [".json"] },
						},
					],
					// Versuch, den Projects-Ordner als Start zu verwenden
					startIn: "documents",
				};

				// Zeige Dateiauswahldialog und verarbeite die Ergebnisse
				window
					.showSaveFilePicker(options)
					.then(async (fileHandle) => {
						try {
							console.log("Datei wird geschrieben...");
							const writable = await fileHandle.createWritable();
							await writable.write(jsonData);
							await writable.close();

							console.log("Datei erfolgreich gespeichert:", fileHandle.name);
							showNotification(
								`Projekt "${projectName}" erfolgreich gespeichert!`,
								"success"
							);

							// Optional: Datenbank-Backup
							try {
								await saveProjectToDatabase();
								console.log("Datenbank-Backup erstellt");
							} catch (dbError) {
								console.log("Datenbank-Backup fehlgeschlagen:", dbError);
							}
						} catch (writeError) {
							console.error("Fehler beim Schreiben der Datei:", writeError);
							showNotification(
								`Fehler beim Schreiben der Datei: ${writeError.message}`,
								"error"
							);
						}
					})
					.catch((error) => {
						// AbortError ignorieren (wird ausgelöst, wenn der Benutzer abbricht)
						if (error.name !== "AbortError") {
							console.error(
								"Fehler beim Speichern mit File System API:",
								error
							);

							// Fallback zum regulären Download
							downloadFile(jsonData, `${fileName}.json`);
							showNotification(
								`Fallback: Projekt wurde als Download gespeichert.`,
								"info",
								5000
							);
						} else {
							console.log("Benutzer hat den Speichervorgang abgebrochen");
						}
					});
			} else {
				// Fallback für Browser ohne File System Access API
				console.log(
					"Browser unterstützt File System Access API nicht, nutze Download-Fallback"
				);
				downloadFile(jsonData, `${fileName}.json`);
				showNotification(
					`Ihr Browser unterstützt keine Dateiauswahldialoge. Das Projekt wurde als Download gespeichert.`,
					"info",
					8000
				);
			}

			return true;
		} catch (error) {
			console.error("Fehler beim Exportieren des Hangarplans:", error);
			showNotification(`Fehler beim Exportieren: ${error.message}`, "error");
			return false;
		}
	}

	/**
	 * Öffnet den Projekt-Browser für das Laden von Projekten
	 * Diese Funktion zeigt immer den Dateiauswahldialog wenn möglich
	 */
	function showProjectBrowser() {
		console.log("showProjectBrowser wird aufgerufen");

		try {
			// Immer den Dateiauswahldialog verwenden
			openFileLoadDialog();
		} catch (error) {
			console.error("Fehler beim Aufrufen des Dateidialogs:", error);
			showNotification(
				`Fehler beim Öffnen des Dateidialogs: ${error.message}`,
				"error"
			);

			// Fallback auf Projekt-Manager-Dialog
			try {
				if (
					window.projectManager &&
					typeof window.projectManager.showProjectManager === "function"
				) {
					window.projectManager.showProjectManager();
				} else {
					showNotification(
						"Das Laden von Projekten ist nicht möglich",
						"error"
					);
				}
			} catch (fallbackError) {
				console.error("Fehler beim Ausführen des Fallbacks:", fallbackError);
			}
		}
	}

	/**
	 * Öffnet einen Datei-Auswahldialog zum Laden eines Projekts
	 * Diese Funktion wurde überarbeitet um Fehler zu verhindern
	 */
	async function openFileLoadDialog() {
		console.log("openFileLoadDialog wird ausgeführt");

		try {
			// Prüfen, ob File System Access API unterstützt wird
			if (typeof window.showOpenFilePicker !== "function") {
				throw new Error(
					"Ihr Browser unterstützt keine Dateiauswahldialoge - bitte Chrome, Edge oder einen anderen kompatiblen Browser verwenden"
				);
			}

			showNotification("Bitte wählen Sie eine Projekt-Datei aus", "info", 3000);

			const options = {
				types: [
					{
						description: "JSON Projekt-Dateien",
						accept: { "application/json": [".json"] },
					},
				],
				multiple: false,
			};

			try {
				// Dateiauswahldialog anzeigen
				console.log("Dateiauswahldialog wird angezeigt...");
				const [fileHandle] = await window.showOpenFilePicker(options);
				console.log("Datei ausgewählt:", fileHandle.name);

				const file = await fileHandle.getFile();
				const contents = await file.text();

				try {
					console.log("Datei wird geladen und geparst...");
					const projectData = JSON.parse(contents);

					// Projekt in Datenbank speichern für späteres einfaches Laden (optional)
					try {
						await dbManager.importProject(projectData);
						console.log("Projekt in Datenbank importiert");
					} catch (dbError) {
						console.log(
							"Hinweis: Projekt konnte nicht in Datenbank importiert werden",
							dbError
						);
						// Kein Fehler anzeigen, da das Projekt trotzdem geladen wird
					}

					// Projekt sofort laden
					window.loadProjectFromDatabase(projectData);

					showNotification(
						`Projekt "${
							projectData.metadata?.projectName || "Projekt"
						}" erfolgreich geladen`,
						"success"
					);
				} catch (parseError) {
					console.error("Fehler beim Parsen der JSON-Datei:", parseError);
					showNotification(
						"Die Datei hat ein ungültiges Format und konnte nicht geladen werden",
						"error"
					);
				}
			} catch (error) {
				if (error.name === "AbortError") {
					console.log("Benutzer hat den Ladevorgang abgebrochen");
				} else {
					throw error; // Weitergeben für die äußere try-catch
				}
			}
		} catch (error) {
			console.error("Fehler beim Laden der Datei:", error);

			const errorMessage =
				error.name === "AbortError"
					? "Vorgang abgebrochen"
					: `Fehler beim Laden: ${error.message}`;

			showNotification(errorMessage, "error");

			// Bei Browser-Kompatibilitätsproblemen: Fallback zum Projekt-Manager
			if (error.message.includes("unterstützt keine")) {
				try {
					if (
						window.projectManager &&
						typeof window.projectManager.showProjectManager === "function"
					) {
						window.projectManager.showProjectManager();
					}
				} catch (fallbackError) {
					console.error("Fallback fehlgeschlagen:", fallbackError);
				}
			}

			throw error; // Weitergeben für umfassendere Fehlerbehandlung
		}
	}

	// Event-Handler für UI-Elemente werden überprüft
	function verifyEventHandlers() {
		// Save-Button überprüfen
		const saveBtn = document.getElementById("saveBtn");
		if (saveBtn) {
			// Vorhandenen Event-Listener entfernen und neu hinzufügen
			saveBtn.replaceWith(saveBtn.cloneNode(true));
			const newSaveBtn = document.getElementById("saveBtn");
			newSaveBtn.addEventListener("click", function () {
				console.log("Save-Button wurde geklickt");
				saveProject();
			});
		}

		// Load-Button überprüfen
		const loadBtn = document.getElementById("loadBtn");
		if (loadBtn) {
			// Vorhandenen Event-Listener entfernen und neu hinzufügen
			loadBtn.replaceWith(loadBtn.cloneNode(true));
			const newLoadBtn = document.getElementById("loadBtn");
			newLoadBtn.addEventListener("click", function () {
				console.log("Load-Button wurde geklickt");
				showProjectBrowser();
			});
		}
	}

	// Initialisierungscode erweitern
	function extendedInit() {
		// Dateidialog-Modus immer aktivieren
		localStorage.setItem("useFileSystemAccess", "true");

		// Event-Handler überprüfen und korrigieren
		verifyEventHandlers();

		// API-Unterstützung prüfen und Benutzer informieren
		if (
			typeof window.showOpenFilePicker !== "function" ||
			typeof window.showSaveFilePicker !== "function"
		) {
			console.warn("Browser unterstützt File System Access API nicht");
			showNotification(
				"Ihr Browser unterstützt keine nativen Dateiauswahldialoge. Einige Funktionen sind eingeschränkt.",
				"warning",
				8000
			);
		}
	}

	// Globale Funktionen für die Initialisierung und das Setup von Event-Listenern
	window.initializeUI = initializeUI;
	window.setupUIEventListeners = setupUIEventListeners;
});

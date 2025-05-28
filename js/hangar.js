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

		// Unterordner für Projektdaten - Neuer Pfad
		dataDir: "Settings/Projekte",

		// Unterordner für Einstellungen - Neuer Pfad
		settingsDir: "Settings/Einstellungen",

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

	// UI-Einstellungen Objekt
	const uiSettings = {
		tilesCount: 8,
		secondaryTilesCount: 0,
		layout: 4,
		load: function () {
			try {
				const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
				if (savedSettingsJSON) {
					const settings = JSON.parse(savedSettingsJSON);
					this.tilesCount = settings.tilesCount || 8;
					this.secondaryTilesCount = settings.secondaryTilesCount || 0;
					this.layout = settings.layout || 4;

					// Formulareingaben aktualisieren
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

					// Kachel-Werte zurücksetzen, falls vorhanden
					if (settings.tileValues && Array.isArray(settings.tileValues)) {
						// Für jede gespeicherte Kachel die Werte setzen
						settings.tileValues.forEach((tileValue) => {
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
									tileValue.cellId < 100
										? "#hangarGrid"
										: "#secondaryHangarGrid";
								const index =
									tileValue.cellId < 100
										? tileValue.cellId
										: tileValue.cellId - 100;

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
					}
					return true;
				}
			} catch (error) {
				console.error(
					"Fehler beim Laden der gespeicherten Einstellungen:",
					error
				);
			}
			return false;
		},

		save: function (exportToFile = false) {
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

				// Im LocalStorage speichern
				localStorage.setItem(
					"hangarPlannerSettings",
					JSON.stringify({
						tilesCount: this.tilesCount,
						secondaryTilesCount: this.secondaryTilesCount,
						layout: this.layout,
						tileValues: tileValues,
					})
				);

				// Optional als Datei exportieren
				if (exportToFile) {
					const settingsData = {
						tilesCount: this.tilesCount,
						secondaryTilesCount: this.secondaryTilesCount,
						layout: this.layout,
						tileValues: tileValues,
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
							// Aktualisierter Startverzeichnis-Pfad
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
	try {
		initializeUI();
	} catch (error) {
		console.error("Fehler bei der Initialisierung:", error);
		alert(
			"Es ist ein Fehler bei der Initialisierung aufgetreten: " + error.message
		);
	}

	// Bereite Event-Listener vor - Entferne doppelte Deklarationen
	try {
		setupUIEventListeners();
	} catch (error) {
		console.error("Fehler beim Einrichten der UI-Event-Listener:", error);
		alert("Fehler beim Einrichten der Bedienelemente: " + error.message);
	}

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

		// Settings-Buttons
		const saveSettingsBtn = document.getElementById("saveSettingsBtn");
		if (saveSettingsBtn) {
			saveSettingsBtn.addEventListener("click", function () {
				uiSettings.save(true);
			});
		}

		const loadSettingsBtn = document.getElementById("loadSettingsBtn");
		if (loadSettingsBtn) {
			loadSettingsBtn.addEventListener("click", function () {
				openSettingsFilePicker();
			});
		}

		// Settings-Datei-Import
		const settingsFileInput = document.getElementById("settingsFileInput");
		if (settingsFileInput) {
			settingsFileInput.addEventListener("change", loadSettingsFromFile);
		}

		// PDF Export-Button mit verbessertem Event-Listener
		const exportPdfBtn = document.getElementById("exportPdfBtn");
		if (exportPdfBtn) {
			exportPdfBtn.addEventListener("click", function (event) {
				console.log("PDF-Export-Button wurde geklickt"); // Debug-Ausgabe
				try {
					exportToPDF();
				} catch (error) {
					console.error("Fehler beim Aufrufen der PDF-Export-Funktion:", error);
					showNotification(
						"PDF-Export fehlgeschlagen: " + error.message,
						"error"
					);
				}
			});
		} else {
			console.error("PDF-Export-Button konnte nicht gefunden werden");
		}

		// Save und Load Buttons - Keine doppelten Deklarationen mehr
		const saveBtn = document.getElementById("saveBtn");
		if (saveBtn) {
			saveBtn.addEventListener("click", saveProject);
		}

		const loadBtn = document.getElementById("loadBtn");
		if (loadBtn) {
			loadBtn.addEventListener("click", function () {
				openImportFilePicker();
			});
		}

		const jsonFileInput = document.getElementById("jsonFileInput");
		if (jsonFileInput) {
			jsonFileInput.addEventListener("change", importHangarPlanFromJson);
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
		if (uiSettings.load()) {
			uiSettings.apply();
		}

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
		} catch (error) {
			console.error(
				`Fehler beim Anwenden der Daten für Kachel ${tileData.tileId}:`,
				error
			);
		}
	}

	/**
	 * Speichert das aktuelle Projekt
	 */
	function saveProject() {
		try {
			exportHangarPlanToJson();
		} catch (error) {
			console.error("Fehler beim Speichern:", error);
			alert("Fehler beim Speichern: " + error.message);
		}
	}

	/**
	 * Exportiert den aktuellen Hangarplan als JSON-Datei direkt in den Projektordner
	 */
	function exportHangarPlanToJson() {
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
			if (window.showSaveFilePicker) {
				// Definiere den Speicherordner - Neuer Pfad
				const startInDirectory = filePaths.dataDir;

				// Konfiguriere die Optionen für den File Picker
				const options = {
					suggestedName: `${fileName}.json`,
					types: [
						{
							description: "JSON Files",
							accept: { "application/json": [".json"] },
						},
					],
					// Aktualisierter Pfad für den Startordner
					startIn: startInDirectory,
				};

				showSaveFilePicker(options)
					.then(async (fileHandle) => {
						const writable = await fileHandle.createWritable();
						await writable.write(jsonData);
						await writable.close();
						showNotification("Projekt erfolgreich gespeichert!", "success");
					})
					.catch((error) => {
						if (error.name !== "AbortError") {
							console.error(
								"Fehler beim Speichern mit File System API:",
								error
							);
							// Fallback zum regulären Download
							downloadFile(jsonData, `${fileName}.json`);
							showNotification(
								`Projekt wurde heruntergeladen. Bitte in ${filePaths.dataDir}/ speichern.`,
								"info",
								5000
							);
						}
					});
			} else {
				// Fallback für Browser ohne File System Access API
				downloadFile(jsonData, `${fileName}.json`);
				showNotification(
					`Projekt wurde heruntergeladen. Bitte in ${filePaths.dataDir}/ speichern.`,
					"info",
					5000
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
	 * Öffnet den File Picker zum Importieren einer Hangarplan-JSON-Datei
	 */
	function openImportFilePicker() {
		try {
			// Zeige eine Benachrichtigung, um den Benutzer zu informieren
			showNotification("Bitte wählen Sie eine Projektdatei", "info", 3000);

			// Moderne File System Access API verwenden, falls verfügbar
			if (window.showOpenFilePicker) {
				const options = {
					types: [
						{
							description: "JSON Files",
							accept: { "application/json": [".json"] },
						},
					],
					excludeAcceptAllOption: false,
					multiple: false,
					// Aktualisierter Pfad für den Startordner
					startIn: filePaths.dataDir,
				};

				showOpenFilePicker(options)
					.then(async ([fileHandle]) => {
						const file = await fileHandle.getFile();
						importHangarPlanFromJson({ target: { files: [file] } });
					})
					.catch((error) => {
						// Fallback für abgebrochene Operationen
						if (error.name !== "AbortError") {
							console.error("Fehler beim Öffnen des File Pickers:", error);
							document.getElementById("jsonFileInput").click();
						}
					});
			} else {
				// Fallback für ältere Browser
				document.getElementById("jsonFileInput").click();
			}
		} catch (error) {
			console.error("Fehler beim Öffnen des File Pickers:", error);
			showNotification(
				`Fehler beim Öffnen des File Pickers: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Öffnet den File Picker für die Einstellungen
	 */
	function openSettingsFilePicker() {
		try {
			showNotification("Bitte wählen Sie eine Einstellungsdatei", "info", 3000);

			// Moderne File System Access API verwenden, falls verfügbar
			if (window.showOpenFilePicker) {
				const options = {
					types: [
						{
							description: "Settings JSON Files",
							accept: { "application/json": [".json"] },
						},
					],
					excludeAcceptAllOption: false,
					multiple: false,
					// Aktualisierter Pfad für den Startordner
					startIn: filePaths.settingsDir,
				};

				showOpenFilePicker(options)
					.then(async ([fileHandle]) => {
						const file = await fileHandle.getFile();
						loadSettingsFromFile({ target: { files: [file] } });
					})
					.catch((error) => {
						// Fallback für abgebrochene Operationen
						if (error.name !== "AbortError") {
							console.error("Fehler beim Öffnen des File Pickers:", error);
							document.getElementById("settingsFileInput").click();
						}
					});
			} else {
				// Fallback für ältere Browser
				document.getElementById("settingsFileInput").click();
			}
		} catch (error) {
			console.error("Fehler beim Öffnen des File Pickers:", error);
			showNotification(
				`Fehler beim Öffnen des File Pickers: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Sammelt alle Daten des Hangarplans
	 */
	function collectAllHangarData() {
		try {
			const primaryTiles = collectTileData("#hangarGrid");
			const secondaryTiles = collectTileData("#secondaryHangarGrid");

			// Erfasse weitere Metadaten
			const metadata = {
				projectName: document.getElementById("projectName").value,
				savedDate: new Date().toISOString(),
				version: "1.0",
			};

			// Kombiniere alle Daten
			return {
				metadata: metadata,
				settings: {
					tilesCount: uiSettings.tilesCount,
					secondaryTilesCount: uiSettings.secondaryTilesCount,
					layout: uiSettings.layout,
				},
				primaryTiles: primaryTiles,
				secondaryTiles: secondaryTiles,
			};
		} catch (error) {
			console.error("Fehler beim Sammeln der Hangardaten:", error);
			throw error;
		}
	}

	/**
	 * Zeigt Benachrichtigungen für den Benutzer an
	 * @param {string} message - Die anzuzeigende Nachricht
	 * @param {string} type - Der Typ der Nachricht (info, success, error, warning)
	 * @param {number} duration - Wie lange die Nachricht angezeigt wird (in ms)
	 */
	function showNotification(message, type = "info", duration = 3000) {
		// ...existing code...
	}

	// Aktualisiere Event-Listener für alle Kacheln
	function setupAllTileEventListeners() {
		// Implementierung hier
	}

	// Initialisiere Status-Handler
	function initStatusHandlers() {
		// Implementierung hier
	}

	// Event-Listener für dynamische Anpassung
	window.addEventListener("resize", function () {
		adjustScaling();
	});

	// Bei Änderung der Layout-Einstellung
	document
		.getElementById("layoutType")
		?.addEventListener("change", function () {
			setTimeout(adjustScaling, 50);
		});

	// Initiale Anwendung nach DOM-Laden
	document.addEventListener("DOMContentLoaded", function () {
		setTimeout(adjustScaling, 100);
	});

	/**
	 * Lädt Einstellungen aus einer ausgewählten Datei
	 * @param {Event} event - Das auslösende Event
	 */
	function loadSettingsFromFile(event) {
		try {
			const file = event.target.files[0];
			if (!file) {
				showNotification("Keine Datei ausgewählt", "error");
				return;
			}

			const reader = new FileReader();
			reader.onload = function (e) {
				try {
					const settingsData = JSON.parse(e.target.result);

					// Einstellungen übernehmen
					if (settingsData) {
						if (checkElement("tilesCount")) {
							document.getElementById("tilesCount").value =
								settingsData.tilesCount || 8;
						}
						if (checkElement("secondaryTilesCount")) {
							document.getElementById("secondaryTilesCount").value =
								settingsData.secondaryTilesCount || 0;
						}
						if (checkElement("layoutType")) {
							document.getElementById("layoutType").value =
								settingsData.layout || 4;
						}

						// Einstellungen ins uiSettings-Objekt übertragen
						uiSettings.tilesCount = settingsData.tilesCount || 8;
						uiSettings.secondaryTilesCount =
							settingsData.secondaryTilesCount || 0;
						uiSettings.layout = settingsData.layout || 4;

						// Kachelwerte setzen, falls vorhanden
						if (
							settingsData.tileValues &&
							Array.isArray(settingsData.tileValues)
						) {
							settingsData.tileValues.forEach((tileValue) => {
								// Position setzen
								const positionInput = document.getElementById(
									`hangar-position-${tileValue.cellId}`
								);
								if (positionInput) {
									positionInput.value = tileValue.position || "";
								}

								// Manuelle Eingabe setzen
								const container =
									tileValue.cellId < 100
										? "#hangarGrid"
										: "#secondaryHangarGrid";
								const index =
									tileValue.cellId < 100
										? tileValue.cellId
										: tileValue.cellId - 100;

								const cells = document.querySelectorAll(
									`${container} .hangar-cell`
								);
								if (cells.length >= index) {
									const manualInput = cells[index - 1]?.querySelector(
										'input[placeholder="Manual Input"]'
									);
									if (manualInput) {
										manualInput.value = tileValue.manualInput || "";
									}
								}
							});
						}

						// Einstellungen anwenden
						uiSettings.apply();
						showNotification("Einstellungen erfolgreich geladen", "success");
					} else {
						showNotification("Fehler: Ungültiges Einstellungsformat", "error");
					}
				} catch (error) {
					console.error("Fehler beim Parsen der Einstellungsdatei:", error);
					showNotification(
						`Fehler beim Laden der Einstellungen: ${error.message}`,
						"error"
					);
				}
			};

			reader.readAsText(file);

			// Input zurücksetzen
			event.target.value = "";
		} catch (error) {
			console.error("Fehler beim Laden der Einstellungsdatei:", error);
			showNotification(
				`Fehler beim Laden der Einstellungsdatei: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Exportiert den aktuellen Hangarplan als PDF-Datei
	 * WICHTIG: Diese Funktion muss VOR setupUIEventListeners definiert sein!
	 */
	function exportToPDF() {
		try {
			console.log("PDF-Export-Funktion wurde aufgerufen"); // Debug-Ausgabe

			const filename =
				document.getElementById("pdfFilename").value || "Hangar_Plan";
			const includeNotes = document.getElementById("includeNotes").checked;
			const landscapeMode = document.getElementById("landscapeMode").checked;

			// Erstelle eine Kopie des hangarGrid für den Export
			const originalGrid = document.getElementById("hangarGrid");
			if (!originalGrid) {
				throw new Error("Hangar Grid nicht gefunden!");
			}

			const exportContainer = document.createElement("div");
			exportContainer.className = "pdf-content";

			// Füge Titel hinzu
			const title = document.createElement("h1");
			title.textContent =
				document.getElementById("projectName").value || "Hangar Plan";
			title.style.fontSize = "24px";
			title.style.fontWeight = "bold";
			title.style.marginBottom = "15px";
			title.style.textAlign = "center";
			title.style.color = "#2D3142";
			exportContainer.appendChild(title);

			// Datum hinzufügen
			const dateElement = document.createElement("p");
			dateElement.textContent = "Date: " + new Date().toLocaleDateString();
			dateElement.style.fontSize = "14px";
			dateElement.style.marginBottom = "20px";
			dateElement.style.textAlign = "center";
			dateElement.style.color = "#4F5D75";
			exportContainer.appendChild(dateElement);

			// Grid-Container erstellen mit angepasstem Layout für PDF
			const gridContainer = document.createElement("div");
			gridContainer.style.display = "grid";

			// Angepasste Spaltenanzahl je nach Modus und Anzahl der Kacheln
			const visibleCells = Array.from(originalGrid.children).filter(
				(cell) => !cell.classList.contains("hidden")
			);
			const cellCount = visibleCells.length;

			// Bestimme optimale Spaltenanzahl basierend auf Anzahl der sichtbaren Zellen
			let columns;
			if (landscapeMode) {
				columns =
					cellCount <= 2
						? cellCount
						: cellCount <= 4
						? 2
						: cellCount <= 6
						? 3
						: 4;
			} else {
				columns = cellCount <= 2 ? cellCount : 2; // Im Hochformat maximal 2 Spalten
			}

			gridContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
			gridContainer.style.gap = "10px";
			gridContainer.style.width = "100%";
			gridContainer.style.maxWidth = landscapeMode ? "1000px" : "800px";
			gridContainer.style.margin = "0 auto";

			// Nur sichtbare Kacheln kopieren
			visibleCells.forEach((cell) => {
				const cellClone = cell.cloneNode(true);
				cellClone.style.breakInside = "avoid";
				cellClone.style.pageBreakInside = "avoid";
				cellClone.style.width = "100%";

				// Vereinfache und optimiere für PDF
				const headerElement = cellClone.querySelector(
					'[class*="bg-industrial-medium"]'
				);
				if (headerElement) {
					headerElement.style.backgroundColor = "#4F5D75";
					headerElement.style.color = "white";
					headerElement.style.padding = "8px";
					headerElement.style.borderTopLeftRadius = "8px";
					headerElement.style.borderTopRightRadius = "8px";

					// Position-Anzeige optimieren
					const positionElement = headerElement.querySelector(
						'[class*="text-xs text-white"]'
					);
					if (positionElement) {
						positionElement.style.fontSize = "11px";
						positionElement.style.whiteSpace = "nowrap";
					}

					// Input-Felder für bessere PDF-Darstellung optimieren
					const inputs = headerElement.querySelectorAll("input");
					inputs.forEach((input) => {
						input.style.width = input.classList.contains("w-10")
							? "30px"
							: "90px";
						input.style.backgroundColor = "#3A4154";
						input.style.padding = "2px 4px";
						input.style.fontSize = "11px";
					});
				}

				// Status Lichter
				const statusLights = cellClone.querySelectorAll(".status-light");
				statusLights.forEach((light) => {
					if (!light.classList.contains("active")) {
						light.style.display = "none"; // Nur aktiven Status anzeigen
					} else {
						light.style.boxShadow = "none";
						light.style.transform = "none"; // Entferne Skalierung
					}
				});

				// Aircraft ID optimieren
				const aircraftId = cellClone.querySelector(".aircraft-id");
				if (aircraftId) {
					aircraftId.style.fontSize = "16px";
					aircraftId.style.padding = "4px 0";
					aircraftId.style.borderBottomWidth = "1px";
				}

				// Info-Grid optimieren
				const infoGrid = cellClone.querySelector(".info-grid");
				if (infoGrid) {
					infoGrid.style.fontSize = "12px";
					infoGrid.style.gap = "3px";
					infoGrid.style.maxWidth = "100%";
				}

				// Entferne Notizbereich wenn nicht gewünscht
				if (!includeNotes) {
					const notesContainer = cellClone.querySelector(".notes-container");
					if (notesContainer) notesContainer.remove();
				} else {
					// Notizen optimieren
					const notesContainer = cellClone.querySelector(".notes-container");
					if (notesContainer) {
						notesContainer.style.minHeight = "40px";
						const notesLabel = notesContainer.querySelector("label");
						if (notesLabel) notesLabel.style.fontSize = "11px";
						const textarea = notesContainer.querySelector("textarea");
						if (textarea) {
							textarea.style.fontSize = "11px";
							textarea.style.minHeight = "30px";
						}
					}
				}

				// Entferne Status-Selector aus dem Export
				const statusSelector = cellClone.querySelector("select");
				if (statusSelector) statusSelector.parentElement.remove();

				// Hauptbereich für PDF optimieren
				const mainArea = cellClone.querySelector(".p-4");
				if (mainArea) {
					mainArea.style.backgroundColor = "white";
					mainArea.style.color = "black";
					mainArea.style.borderBottomLeftRadius = "8px";
					mainArea.style.borderBottomRightRadius = "8px";
					mainArea.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
					mainArea.style.padding = "8px 10px";
				}

				gridContainer.appendChild(cellClone);
			});

			exportContainer.appendChild(gridContainer);

			// Styles für den Export
			exportContainer.style.padding = "20px";
			exportContainer.style.backgroundColor = "white";
			exportContainer.style.width = "100%";
			exportContainer.style.margin = "0 auto";
			exportContainer.style.maxWidth = landscapeMode ? "1100px" : "900px";

			// Überprüfe, ob html2pdf verfügbar ist
			if (typeof html2pdf !== "function") {
				showNotification(
					"PDF-Bibliothek (html2pdf) ist nicht geladen. Bitte Seite neu laden.",
					"error"
				);
				return;
			}

			// Konfiguriere und generiere PDF
			const options = {
				margin: [10, 10],
				filename: `${filename}.pdf`,
				image: { type: "jpeg", quality: 0.98 },
				html2canvas: {
					scale: 2,
					logging: false,
					letterRendering: true,
					useCORS: true,
					allowTaint: true,
					width: landscapeMode ? 1100 : 900,
				},
				jsPDF: {
					unit: "mm",
					format: "a4",
					orientation: landscapeMode ? "landscape" : "portrait",
					compress: true,
					precision: 2,
				},
			};

			// Zeige Benachrichtigung während der Generierung
			showNotification("PDF wird generiert, bitte warten...", "info");

			// Erzeuge und downloade PDF
			html2pdf()
				.from(exportContainer)
				.set(options)
				.save()
				.then(() => {
					// Bei erfolgreicher Erstellung Erfolgsmeldung anzeigen
					showNotification("PDF erfolgreich erstellt!", "success");
				})
				.catch((error) => {
					console.error("Fehler bei PDF-Erstellung:", error);
					showNotification(
						"Fehler bei der PDF-Erstellung: " + error.message,
						"error"
					);
				});
		} catch (error) {
			console.error("Fehler beim PDF-Export:", error);
			showNotification("PDF-Export fehlgeschlagen: " + error.message, "error");
		}
	}
});

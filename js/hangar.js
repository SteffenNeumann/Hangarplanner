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
						settings.tileValues.forEach((tileValue) => {
							const positionInput = document.getElementById(
								`hangar-position-${tileValue.cellId}`
							);
							if (positionInput) {
								positionInput.value = tileValue.position || "";
							}

							// Falls manuelle Eingabe gespeichert wurde
							if (tileValue.manualInput) {
								const manualInputs = document.querySelectorAll(
									`.hangar-cell:nth-child(${
										tileValue.cellId <= 12
											? tileValue.cellId
											: tileValue.cellId - 100
									}) input[placeholder="Manual Input"]`
								);
								if (manualInputs.length > 0) {
									manualInputs[0].value = tileValue.manualInput;
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

				// Kachel-Werte sammeln
				const tileValues = [];
				const maxCellId = this.tilesCount + this.secondaryTilesCount;

				// Alle sichtbaren Kacheln sammeln (primäre und sekundäre)
				// Primäre Kacheln
				for (let i = 1; i <= this.tilesCount; i++) {
					const positionInput = document.getElementById(`hangar-position-${i}`);
					const manualInputs = document.querySelectorAll(
						`.hangar-cell:nth-child(${i}) input[placeholder="Manual Input"]`
					);
					if (positionInput || (manualInputs && manualInputs.length > 0)) {
						tileValues.push({
							cellId: i,
							position: positionInput ? positionInput.value : "",
							manualInput:
								manualInputs && manualInputs.length > 0
									? manualInputs[0].value
									: "",
						});
					}
				}

				// Sekundäre Kacheln
				for (let i = 1; i <= this.secondaryTilesCount; i++) {
					const cellId = 100 + i;
					const positionInput = document.getElementById(
						`hangar-position-${cellId}`
					);
					const manualInputs = document.querySelectorAll(
						`.hangar-cell:nth-child(${i}) input[placeholder="Manual Input"]`
					);
					if (positionInput || (manualInputs && manualInputs.length > 0)) {
						tileValues.push({
							cellId: cellId,
							position: positionInput ? positionInput.value : "",
							manualInput:
								manualInputs && manualInputs.length > 0
									? manualInputs[0].value
									: "",
						});
					}
				}

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
					const dataStr = JSON.stringify(
						{
							tilesCount: this.tilesCount,
							secondaryTilesCount: this.secondaryTilesCount,
							layout: this.layout,
							tileValues: tileValues,
						},
						null,
						2
					);
					const dataBlob = new Blob([dataStr], { type: "application/json" });
					const projectName = checkElement("projectName")
						? document.getElementById("projectName").value
						: "HangarPlan";
					const fileName = `${projectName}_Settings.json`;
					const downloadLink = document.createElement("a");
					downloadLink.href = URL.createObjectURL(dataBlob);
					downloadLink.download = fileName;
					document.body.appendChild(downloadLink);
					downloadLink.click();
					document.body.removeChild(downloadLink);
					showNotification(
						`Einstellungen gespeichert als ${fileName}`,
						"success"
					);
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
		apply: function () {
			try {
				// Grid-Layout für primäre Kacheln aktualisieren
				const hangarGrid = document.getElementById("hangarGrid");
				if (hangarGrid) {
					hangarGrid.className = `grid grid-cols-${this.layout} gap-4`;
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

				// Grid-Layout für sekundäre Kacheln aktualisieren
				const secondaryGrid = document.getElementById("secondaryHangarGrid");
				if (secondaryGrid) {
					secondaryGrid.className = `grid grid-cols-${this.layout} gap-4`;
				} else {
					console.error("Element 'secondaryHangarGrid' nicht gefunden!");
				}

				// Sekundäre Kacheln erstellen/aktualisieren
				updateSecondaryTiles(this.secondaryTilesCount, this.layout);
				return true;
			} catch (error) {
				console.error("Fehler beim Anwenden der Einstellungen:", error);
				return false;
			}
		},
	};

	// Initialisiere die UI mit Error-Handling
	try {
		initializeUI();
	} catch (error) {
		console.error("Fehler bei der UI-Initialisierung:", error);
		alert(
			"Es ist ein Fehler bei der Initialisierung aufgetreten: " + error.message
		);
	}

	// Event-Listener für Speichern und Laden mit Error-Handling
	try {
		if (checkElement("saveBtn")) {
			document.getElementById("saveBtn").addEventListener("click", function () {
				try {
					saveProject();
				} catch (error) {
					console.error("Fehler beim Speichern:", error);
					alert("Fehler beim Speichern: " + error.message);
				}
			});
		}

		if (checkElement("loadBtn")) {
			document.getElementById("loadBtn").addEventListener("click", function () {
				try {
					if (checkElement("jsonFileInput")) {
						document.getElementById("jsonFileInput").click();
					} else {
						throw new Error("File-Input-Element nicht gefunden");
					}
				} catch (error) {
					console.error("Fehler beim Laden-Dialog:", error);
					alert("Fehler beim Öffnen des Lade-Dialogs: " + error.message);
				}
			});
		}

		// File-Input für JSON-Import
		if (checkElement("jsonFileInput")) {
			document
				.getElementById("jsonFileInput")
				.addEventListener("change", function (event) {
					try {
						importHangarPlanFromJson(event);
					} catch (error) {
						console.error("Fehler beim Import:", error);
						alert("Fehler beim Importieren der Datei: " + error.message);
					}
				});
		}

		// Event-Listener für die Suche und Datenabruf
		if (checkElement("btnSearch")) {
			document
				.getElementById("btnSearch")
				.addEventListener("click", function () {
					try {
						searchAircraft();
					} catch (error) {
						console.error("Fehler bei der Suche:", error);
						alert("Fehler bei der Suche: " + error.message);
					}
				});
		}

		if (checkElement("fetchFlightData")) {
			document
				.getElementById("fetchFlightData")
				.addEventListener("click", function () {
					try {
						fetchFlightData();
					} catch (error) {
						console.error("Fehler beim Abrufen der Flugdaten:", error);
						alert("Fehler beim Abrufen der Flugdaten: " + error.message);
					}
				});
		}
	} catch (error) {
		console.error("Fehler beim Einrichten der Basis-Event-Listener:", error);
	}

	// Erweiterte UI-Event-Listener mit detailliertem Error-Handling
	try {
		setupUIEventListeners();
	} catch (error) {
		console.error("Fehler beim Einrichten der UI-Event-Listener:", error);
		alert("Fehler beim Einrichten der Bedienelemente: " + error.message);
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

		// Initialen Status der Lichter für alle Zellen setzen
		for (let i = 1; i <= 12; i++) {
			try {
				updateStatusLights(i);
			} catch (error) {
				console.error(
					`Fehler beim Initialisieren der Statuslichter für Zelle ${i}:`,
					error
				);
			}
		}

		// Status-Handler für alle Kacheln initialisieren
		initStatusHandlers();

		// Modales Fenster für Laden ausblenden
		const loadModal = document.getElementById("loadModal");
		if (loadModal) {
			loadModal.classList.add("hidden");
		} else {
			console.error("Element 'loadModal' nicht gefunden!");
		}

		// Trennlinie und sekundäre Sektion basierend auf Einstellungen ein-/ausblenden
		toggleSecondarySection();

		// Stellen wir sicher, dass der Anfangszustand des Menüs korrekt ist
		document.body.classList.remove("sidebar-collapsed");
		const sidebarMenu = document.getElementById("sidebarMenu");
		if (sidebarMenu) {
			sidebarMenu.classList.remove("collapsed");
		} else {
			console.error("Element 'sidebarMenu' nicht gefunden!");
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
		} else {
			console.error("Element 'modeToggle' nicht gefunden!");
		}

		// Toggle für Sidebar
		const menuToggle = document.getElementById("menuToggle");
		if (menuToggle) {
			menuToggle.addEventListener("click", function () {
				const sidebar = document.getElementById("sidebarMenu");
				if (sidebar) {
					sidebar.classList.toggle("collapsed");
					document.body.classList.toggle("sidebar-collapsed");
				} else {
					console.error("Element 'sidebarMenu' nicht gefunden beim Toggle!");
				}
			});
		} else {
			console.error("Element 'menuToggle' nicht gefunden!");
		}

		// Einstellungen-Buttons
		const updateTilesBtn = document.getElementById("updateTilesBtn");
		if (updateTilesBtn) {
			updateTilesBtn.addEventListener("click", function () {
				try {
					// Wert aus dem Eingabefeld in uiSettings speichern
					if (checkElement("tilesCount")) {
						uiSettings.tilesCount =
							parseInt(document.getElementById("tilesCount").value) || 8;
						// Einstellungen im LocalStorage speichern und anwenden
						uiSettings.save();
						uiSettings.apply();
					} else {
						throw new Error("Element 'tilesCount' nicht gefunden");
					}
				} catch (error) {
					console.error("Fehler beim Aktualisieren der Kachelanzahl:", error);
					alert("Fehler beim Aktualisieren der Kachelanzahl: " + error.message);
				}
			});
		} else {
			console.error("Element 'updateTilesBtn' nicht gefunden!");
		}

		document
			.getElementById("updateSecondaryTilesBtn")
			.addEventListener("click", function () {
				// Wert aus dem Eingabefeld in uiSettings speichern
				uiSettings.secondaryTilesCount =
					parseInt(document.getElementById("secondaryTilesCount").value) || 0;
				// Einstellungen im LocalStorage speichern und anwenden
				uiSettings.save();
				uiSettings.apply();
			});

		document
			.getElementById("layoutType")
			.addEventListener("change", function () {
				// Wert aus dem Auswahlfeld in uiSettings speichern
				uiSettings.layout = parseInt(this.value) || 4;
				// Einstellungen im LocalStorage speichern und anwenden
				uiSettings.save();
				uiSettings.apply();
			});

		// Settings-Buttons
		const saveSettingsBtn = document.getElementById("saveSettingsBtn");
		if (saveSettingsBtn) {
			saveSettingsBtn.addEventListener("click", function () {
				try {
					uiSettings.save(true); // true = auch als Datei exportieren
				} catch (error) {
					console.error("Fehler beim Speichern der Einstellungen:", error);
					alert("Fehler beim Speichern der Einstellungen: " + error.message);
				}
			});
		} else {
			console.error("Element 'saveSettingsBtn' nicht gefunden!");
		}

		document
			.getElementById("loadSettingsBtn")
			.addEventListener("click", function () {
				document.getElementById("settingsFileInput").click();
			});

		// Settings-Datei-Import
		document
			.getElementById("settingsFileInput")
			.addEventListener("change", loadSettingsFromFile);

		// PDF Export-Button
		document
			.getElementById("exportPdfBtn")
			.addEventListener("click", exportToPDF);

		// Modales Fenster für Laden
		document
			.getElementById("cancelLoad")
			.addEventListener("click", function () {
				document.getElementById("loadModal").classList.add("hidden");
			});

		// Bestätigen-Button für das Modal
		document
			.getElementById("confirmLoad")
			.addEventListener("click", function () {
				const projectName = document.getElementById("loadProjectName").value;
				if (projectName) {
					// Hier würde die Logik zum Laden aus dem LocalStorage erfolgen
					alert(`Projekt "${projectName}" wird geladen...`);
					document.getElementById("loadModal").classList.add("hidden");
				} else {
					alert("Bitte geben Sie einen Projektnamen ein.");
				}
			});

		// Email-Modal schließen
		document
			.getElementById("emailOkBtn")
			.addEventListener("click", function () {
				document.getElementById("emailSentModal").classList.add("hidden");
			});

		// Event-Listener für Status-Änderungen in allen Kacheln
		for (let i = 1; i <= 12; i++) {
			// Flugzeugkennzeichen Eingabe
			const aircraftInput = document.getElementById(`aircraft-${i}`);
			if (aircraftInput) {
				aircraftInput.addEventListener("change", (e) => {
					if (i <= 8) {
						hangarData.cells[i - 1].aircraftId = e.target.value;
						updateCellData(i);
					}
				});
			}

			// Status-Änderung
			const statusSelect = document.getElementById(`status-${i}`);
			if (statusSelect) {
				statusSelect.addEventListener("change", (e) => {
					if (i <= 8) {
						hangarData.cells[i - 1].status = e.target.value;
					}
					updateStatusLights(i);
				});
			}

			// Manuelle Eingabe
			const manualInputs = document.querySelectorAll(
				`.hangar-cell:nth-child(${i}) input[placeholder="Manual Input"]`
			);
			if (manualInputs.length > 0) {
				manualInputs.forEach((input) => {
					input.addEventListener("change", (e) => {
						if (i <= 8) {
							hangarData.cells[i - 1].manualInput = e.target.value;
						}
					});
				});
			}

			// Position-Eingabe
			const positionInput = document.getElementById(`hangar-position-${i}`);
			if (positionInput) {
				positionInput.addEventListener("change", (e) => {
					if (i <= 8) {
						hangarData.cells[i - 1].position = e.target.value;
					}
				});
			}
		}

		// Projektname Änderungen verfolgen
		document
			.getElementById("projectName")
			.addEventListener("change", function () {
				console.log("Projektname geändert zu: " + this.value);
			});
	}

	/**
	 * Initialisiert die Status-Handler für alle Kacheln
	 */
	function initStatusHandlers() {
		document.querySelectorAll(".status-selector").forEach((select) => {
			// Initialen Status setzen
			if (!select.dataset.initialized) {
				select.dataset.initialized = "true";
				select.value = "ready";
				updateStatusLights(parseInt(select.id.split("-")[1]));
			}
		});

		// Schleppstatus-Handling einrichten
		const towStates = ["initiated", "ongoing", "on-position"];
		const towClasses = ["tow-initiated", "tow-ongoing", "tow-on-position"];
		const towTexts = ["Initiated", "In Progress", "On Position"];

		document
			.querySelectorAll('[id^="tow-status-"]')
			.forEach((statusElement) => {
				statusElement.addEventListener("click", function () {
					// Aktuelle Klasse bestimmen
					const currentClass = towClasses.find((cls) =>
						this.classList.contains(cls)
					);
					const currentIndex = towClasses.indexOf(currentClass);
					const nextIndex = (currentIndex + 1) % towClasses.length;

					// Klasse und Text ändern
					towClasses.forEach((cls) => this.classList.remove(cls));
					this.classList.add(towClasses[nextIndex]);
					this.textContent = towTexts[nextIndex];
				});
			});
	}

	/**
	 * Zeigt oder versteckt die sekundäre Sektion basierend auf den Einstellungen
	 */
	function toggleSecondarySection() {
		const divider = document.querySelector(".section-divider");
		const secondaryLabel = document.querySelector(
			".section-label:nth-of-type(2)"
		);

		// Prüfe, ob die Elemente existieren, bevor auf deren style-Eigenschaft zugegriffen wird
		if (uiSettings.secondaryTilesCount > 0) {
			if (divider) divider.style.display = "block";
			if (secondaryLabel) secondaryLabel.style.display = "block";
		} else {
			if (divider) divider.style.display = "none";
			if (secondaryLabel) secondaryLabel.style.display = "none";
		}
	}

	/**
	 * Aktualisiert die sekundären Kacheln basierend auf den Einstellungen
	 */
	function updateSecondaryTiles(count, columns) {
		const secondaryGrid = document.getElementById("secondaryHangarGrid");
		secondaryGrid.innerHTML = "";

		// Neue sekundäre Kacheln erstellen
		for (let i = 1; i <= count; i++) {
			const cellId = 100 + i; // IDs beginnen bei 101
			createTile(secondaryGrid, cellId, `S${i}`);
		}

		// Trennlinie und Abschnitt ein-/ausblenden
		toggleSecondarySection();

		// Status-Handler für neue Kacheln initialisieren
		initStatusHandlers();
	}

	/**
	 * Erstellt eine einzelne Kachel und fügt sie dem Container hinzu
	 */
	function createTile(container, cellId, positionPlaceholder) {
		const newCell = document.createElement("div");
		newCell.className =
			"hangar-cell bg-white rounded-lg shadow-md flex flex-col";
		newCell.innerHTML = `
		<div class="bg-industrial-medium px-3 py-2 rounded-t-lg flex justify-between items-center">
			<div class="status-container">
				<span class="status-light bg-status-green" data-cell="${cellId}" data-status="ready"></span>
				<span class="status-light bg-status-yellow" data-cell="${cellId}" data-status="maintenance"></span>
				<span class="status-light bg-status-red" data-cell="${cellId}" data-status="aog"></span>
			</div>
			<div class="flex items-center">
				<span class="text-xs text-white font-medium mr-2">Position:</span>
				<input type="text" placeholder="${positionPlaceholder}" id="hangar-position-${cellId}" class="text-xs bg-industrial-dark rounded px-2 py-1 w-10 text-white text-center" />
			</div>
			<input type="text" placeholder="Manual Input" class="text-xs bg-industrial-dark rounded px-2 py-1 w-32 text-white" />
		</div>
		<div class="p-4 flex-grow flex flex-col">
			<input type="text" id="aircraft-${cellId}" placeholder="Aircraft ID" class="aircraft-id" />
			<div class="info-grid mb-3">
				<div class="info-label">Arrival:</div>
				<div id="arrival-time-${cellId}" class="info-value">--:--</div>
				<div class="info-label">Departure:</div>
				<div id="departure-time-${cellId}" class="info-value">--:--</div>
				<div class="info-label">Position:</div>
				<div id="position-${cellId}" class="info-value">--</div>
				<div class="info-label">Towing Status:</div>
				<div id="tow-status-${cellId}" class="tow-status tow-initiated">Initiated</div>
			</div>
			<div class="notes-container">
				<label class="block text-sm text-industrial-dark font-medium mb-1">Notes:</label>
				<textarea id="notes-${cellId}" class="notes-textarea w-full px-2 py-1 bg-gray-50 border border-industrial-light rounded text-industrial-dark text-sm"></textarea>
			</div>
			<div class="mt-auto">
				<select id="status-${cellId}" class="w-full p-2 bg-industrial-light text-industrial-dark rounded status-selector">
					<option value="ready">Ready</option>
					<option value="maintenance">Maintenance</option>
					<option value="aog">AOG</option>
				</select>
			</div>
		</div>`;
		container.appendChild(newCell);
	}

	/**
	 * Lädt Einstellungen aus einer Datei
	 */
	function loadSettingsFromFile(event) {
		const fileInput = event.target;
		const file = fileInput.files[0];

		if (file) {
			const reader = new FileReader();

			reader.onload = function (e) {
				try {
					const settings = JSON.parse(e.target.result);

					// Einstellungen in die UI-Elemente setzen
					document.getElementById("tilesCount").value =
						settings.tilesCount || 8;
					document.getElementById("secondaryTilesCount").value =
						settings.secondaryTilesCount || 0;
					document.getElementById("layoutType").value = settings.layout || 4;

					// In uiSettings übernehmen
					uiSettings.tilesCount = settings.tilesCount || 8;
					uiSettings.secondaryTilesCount = settings.secondaryTilesCount || 0;
					uiSettings.layout = settings.layout || 4;

					// Speichern und anwenden
					uiSettings.save();
					uiSettings.apply();

					// HTML-Benachrichtigung statt Alert
					showNotification("Einstellungen erfolgreich geladen!", "success");
				} catch (error) {
					console.error("Fehler beim Laden der Einstellungen:", error);
					showNotification(
						"Die Datei enthält keine gültigen Einstellungen.",
						"error"
					);
				}
			};

			reader.readAsText(file);
			fileInput.value = ""; // Zurücksetzen für erneutes Laden
		}
	}

	/**
	 * Aktualisiert die Statuslichter basierend auf dem Status des Flugzeugs
	 * @param {number} cellId - Die ID der Hangar-Zelle
	 */
	function updateStatusLights(cellId) {
		// Für primäre Zellen direkt aus hangarData
		if (cellId <= 8 && hangarData.cells[cellId - 1]) {
			const cell = hangarData.cells[cellId - 1];
			const status = cell.status;

			// Standardmäßig alle Lichter ausschalten
			cell.lightsStatus = {
				arrival: false,
				present: false,
				departure: false,
			};

			// Je nach Status die entsprechenden Lichter einschalten
			switch (status) {
				case "maintenance":
					cell.lightsStatus.present = true;
					cell.lightsStatus.arrival = true;
					break;
				case "ready":
					cell.lightsStatus.arrival = true;
					cell.lightsStatus.present = true;
					break;
				case "boarding":
					cell.lightsStatus.present = true;
					cell.lightsStatus.departure = true;
					break;
				case "delay":
					cell.lightsStatus.arrival = true;
					cell.lightsStatus.departure = true;
					break;
			}
		}

		// UI-Update - für alle Zellen (primär und sekundär)
		const statusSelect = document.getElementById(`status-${cellId}`);
		if (!statusSelect) return;

		const status = statusSelect.value;

		// Alle Status-Lichter für diese Zelle finden und deaktivieren
		const statusLights = document.querySelectorAll(
			`.status-light[data-cell="${cellId}"]`
		);
		statusLights.forEach((light) => light.classList.remove("active"));

		// Das richtige Licht aktivieren basierend auf dem Status
		const activeLight = document.querySelector(
			`.status-light[data-cell="${cellId}"][data-status="${status}"]`
		);
		if (activeLight) {
			activeLight.classList.add("active");
		}
	}

	/**
	 * Aktualisiert die Daten für eine Zelle basierend auf dem Flugzeugkennzeichen
	 * @param {number} cellId - Die ID der Hangar-Zelle
	 */
	async function updateCellData(cellId) {
		const cell = hangarData.cells[cellId - 1];
		const aircraftId = cell.aircraftId;

		// Wenn kein Kennzeichen eingegeben wurde, zeige Standardwerte an
		if (!aircraftId) {
			document.getElementById(`arrival-time-${cellId}`).textContent = "--:--";
			document.getElementById(`departure-time-${cellId}`).textContent = "--:--";
			document.getElementById(`position-${cellId}`).textContent = "--";
			return;
		}

		// UI-Status auf "Laden" setzen
		document.getElementById(`arrival-time-${cellId}`).textContent = "Laden...";
		document.getElementById(`departure-time-${cellId}`).textContent =
			"Laden...";
		document.getElementById(`position-${cellId}`).textContent = "Laden...";

		try {
			// Simulierte API-Anfrage (in einer realen Anwendung würde hier eine echte API angefragt werden)
			await simulateFetchFlightData(aircraftId, cellId);
		} catch (error) {
			document.getElementById(`arrival-time-${cellId}`).textContent = "Fehler";
			document.getElementById(`departure-time-${cellId}`).textContent =
				"Fehler";
			document.getElementById(`position-${cellId}`).textContent = "Fehler";
			console.error("Fehler beim Abrufen der Flugdaten:", error);
		}
	}

	/**
	 * Simuliert das Abrufen von Flugdaten
	 * In einer realen Anwendung würde dies durch einen tatsächlichen API-Aufruf ersetzt werden
	 * @param {string} aircraftId - Flugzeugkennzeichen
	 * @param {number} cellId - Die ID der Hangar-Zelle
	 * @returns {Promise<void>}
	 */
	function simulateFetchFlightData(aircraftId, cellId) {
		return new Promise((resolve) => {
			setTimeout(() => {
				// Generiere zufällige Daten für das Demo
				const now = new Date();
				const arrivalHours = (now.getHours() - Math.floor(Math.random() * 5))
					.toString()
					.padStart(2, "0");
				const arrivalMinutes = Math.floor(Math.random() * 60)
					.toString()
					.padStart(2, "0");
				const departureHours = (now.getHours() + Math.floor(Math.random() * 5))
					.toString()
					.padStart(2, "0");
				const departureMinutes = Math.floor(Math.random() * 60)
					.toString()
					.padStart(2, "0");
				const positions = ["A1", "B3", "C2", "D4", "E5", "F2", "G7", "H8"];
				const position =
					positions[Math.floor(Math.random() * positions.length)];

				// Daten speichern
				hangarData.cells[
					cellId - 1
				].arrivalTime = `${arrivalHours}:${arrivalMinutes}`;
				hangarData.cells[
					cellId - 1
				].departureTime = `${departureHours}:${departureMinutes}`;
				hangarData.cells[cellId - 1].position = position;

				// UI aktualisieren
				document.getElementById(`arrival-time-${cellId}`).textContent =
					hangarData.cells[cellId - 1].arrivalTime;
				document.getElementById(`departure-time-${cellId}`).textContent =
					hangarData.cells[cellId - 1].departureTime;
				document.getElementById(`position-${cellId}`).textContent =
					hangarData.cells[cellId - 1].position;

				resolve();
			}, 700); // Simuliere eine Verzögerung von 700ms
		});
	}

	/**
	 * Sucht nach einem Flugzeug basierend auf dem Kennzeichen
	 */
	function searchAircraft() {
		const searchText = document
			.getElementById("searchAircraft")
			.value.trim()
			.toUpperCase();

		if (!searchText) return;

		const foundCell = hangarData.cells.find(
			(cell) => cell.aircraftId.toUpperCase() === searchText
		);

		if (foundCell) {
			// Flugzeug gefunden, entsprechende Zelle hervorheben
			const cellElement = document.querySelector(
				`.hangar-cell:nth-child(${foundCell.id})`
			);
			cellElement.scrollIntoView({ behavior: "smooth" });

			// Visuelles Feedback durch kurzes Pulsieren
			cellElement.classList.add("ring-4", "ring-industrial-accent");
			setTimeout(() => {
				cellElement.classList.remove("ring-4", "ring-industrial-accent");
			}, 2000);
		} else {
			alert(`Flugzeug mit Kennzeichen ${searchText} wurde nicht gefunden.`);
		}
	}

	/**
	 * Aktualisiert die Flugdaten für alle Flugzeuge
	 */
	async function fetchFlightData() {
		const fetchStatusElement = document.getElementById("fetchStatus");
		fetchStatusElement.textContent = "Aktualisiere Daten...";
		fetchStatusElement.classList.add("text-status-yellow");

		try {
			// Für jedes vorhandene Flugzeug die Daten aktualisieren
			const updatePromises = hangarData.cells
				.filter((cell) => cell.aircraftId)
				.map((cell) => updateCellData(cell.id));

			await Promise.all(updatePromises);

			fetchStatusElement.textContent = "Alle Daten erfolgreich aktualisiert!";
			fetchStatusElement.classList.remove("text-status-yellow");
			fetchStatusElement.classList.add("text-status-green");

			// Nach 3 Sekunden zurücksetzen
			setTimeout(() => {
				fetchStatusElement.textContent = "Ready to retrieve flight data";
				fetchStatusElement.classList.remove("text-status-green");
			}, 3000);
		} catch (error) {
			fetchStatusElement.textContent = "Fehler bei der Aktualisierung!";
			fetchStatusElement.classList.remove("text-status-yellow");
			fetchStatusElement.classList.add("text-status-red");
			console.error("Fehler beim Aktualisieren der Flugdaten:", error);
		}
	}

	/**
	 * Exportiert den aktuellen Hangarplan als JSON-Datei
	 */
	function exportHangarPlanToJson() {
		const hangarData = collectHangarData();
		const dataStr = JSON.stringify(hangarData, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });

		// Dateiname mit Projektnamen
		const fileName = `${hangarData.projectName || "HangarPlan"}.json`;

		// Download-Link erstellen
		const downloadLink = document.createElement("a");
		downloadLink.href = URL.createObjectURL(dataBlob);
		downloadLink.download = fileName;

		// Link anklicken und entfernen
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);

		// Einstellungen ebenfalls speichern
		uiSettings.save();
	}

	/**
	 * Sammelt alle Daten des aktuellen Hangarplans
	 */
	function collectHangarData() {
		const completeHangarData = {
			projectName: document.getElementById("projectName").value,
			lastModified: new Date().toISOString(),
			aircrafts: [],
			settings: {
				tilesCount: uiSettings.tilesCount,
				secondaryTilesCount: uiSettings.secondaryTilesCount,
				layout: uiSettings.layout,
			},
		};

		// Daten aus allen Kacheln sammeln (primär und sekundär)
		const allCells = [
			...document.querySelectorAll("#hangarGrid .hangar-cell"),
			...document.querySelectorAll("#secondaryHangarGrid .hangar-cell"),
		];

		allCells.forEach((cell, index) => {
			// Beispiel für Zellenindex (für primäre 1-12, sekundäre 101+)
			const cellId = index < 12 ? index + 1 : 100 + (index - 11);

			// Position-Eingabe finden
			const positionInput = cell.querySelector(`#hangar-position-${cellId}`);

			// Aircraft ID finden
			const aircraftId = cell.querySelector(`#aircraft-${cellId}`);

			// Notizen finden
			const notes = cell.querySelector(`#notes-${cellId}`);

			// Status finden
			const statusSelect = cell.querySelector(`#status-${cellId}`);

			// Tow-Status finden
			const towStatus = cell.querySelector(`#tow-status-${cellId}`);

			// Tow Status Klasse ermitteln
			let towStatusClass = 0; // Default = initiated
			if (towStatus) {
				if (towStatus.classList.contains("tow-ongoing")) towStatusClass = 1;
				else if (towStatus.classList.contains("tow-on-position"))
					towStatusClass = 2;
			}

			// Arrival/Departure-Zeiten finden
			const arrivalTime = cell.querySelector(`#arrival-time-${cellId}`);
			const departureTime = cell.querySelector(`#departure-time-${cellId}`);

			// Manuelle Position
			const positionDisplay = cell.querySelector(`#position-${cellId}`);

			// Manuelles Input-Feld oben rechts
			const manualInput = cell.querySelector(
				'input[placeholder="Manual Input"]'
			);

			// Daten sammeln und in ein Objekt packen
			const aircraftData = {
				id: cellId,
				position: positionInput ? positionInput.value : "",
				aircraftId: aircraftId ? aircraftId.value : "",
				notes: notes ? notes.value : "",
				status: statusSelect ? statusSelect.value : "ready",
				towStatus: towStatusClass,
				arrivalTime: arrivalTime ? arrivalTime.textContent : "--:--",
				departureTime: departureTime ? departureTime.textContent : "--:--",
				positionDisplay: positionDisplay ? positionDisplay.textContent : "--",
				manualInput: manualInput ? manualInput.value : "",
				visible: !cell.classList.contains("hidden"),
			};

			completeHangarData.aircrafts.push(aircraftData);
		});

		return completeHangarData;
	}

	/**
	 * Speichert den aktuellen Hangarplan
	 */
	function saveProject() {
		const projectName =
			document.getElementById("projectName").value.trim() ||
			generateTimestamp();
		document.getElementById("projectName").value = projectName;
		exportHangarPlanToJson();
	}

	/**
	 * Importiert Hangardaten aus einer JSON-Datei
	 */
	function importHangarPlanFromJson(event) {
		const fileInput = event.target;
		const file = fileInput.files[0];

		if (file) {
			const reader = new FileReader();

			reader.onload = function (e) {
				try {
					const hangarData = JSON.parse(e.target.result);
					applyHangarData(hangarData);

					// Auch die Einstellungen übernehmen, falls vorhanden
					if (hangarData.settings) {
						uiSettings.tilesCount = hangarData.settings.tilesCount || 8;
						uiSettings.secondaryTilesCount =
							hangarData.settings.secondaryTilesCount || 0;
						uiSettings.layout = hangarData.settings.layout || 4;

						// UI-Elemente aktualisieren
						document.getElementById("tilesCount").value = uiSettings.tilesCount;
						document.getElementById("secondaryTilesCount").value =
							uiSettings.secondaryTilesCount;
						document.getElementById("layoutType").value = uiSettings.layout;

						// Speichern und anwenden
						uiSettings.save();
						uiSettings.apply();
					}

					alert("Hangar Plan erfolgreich importiert!");
				} catch (error) {
					console.error("Fehler beim Parsen der JSON-Datei:", error);
					alert(
						"Die Datei konnte nicht gelesen werden. Bitte überprüfe, ob es sich um eine gültige Hangar-Plan-Datei handelt."
					);
				}

				// Input zurücksetzen für wiederholte Imports
				fileInput.value = "";
			};

			reader.readAsText(file);
		}
	}

	/**
	 * Wendet importierte Hangardaten auf die UI an
	 */
	function applyHangarData(data) {
		// Projektname setzen
		if (data.projectName) {
			document.getElementById("projectName").value = data.projectName;
		}

		// Aircraft-Daten anwenden
		if (data.aircrafts && Array.isArray(data.aircrafts)) {
			data.aircrafts.forEach((aircraft) => {
				// ID verarbeiten
				const cellId = aircraft.id;

				// Position setzen
				const positionInput = document.querySelector(
					`#hangar-position-${cellId}`
				);
				if (positionInput && aircraft.position) {
					positionInput.value = aircraft.position;
				}

				// Aircraft ID setzen
				const aircraftIdInput = document.querySelector(`#aircraft-${cellId}`);
				if (aircraftIdInput && aircraft.aircraftId) {
					aircraftIdInput.value = aircraft.aircraftId;
				}

				// Notizen setzen
				const notesTextarea = document.querySelector(`#notes-${cellId}`);
				if (notesTextarea && aircraft.notes) {
					notesTextarea.value = aircraft.notes;
				}

				// Status setzen
				const statusSelect = document.querySelector(`#status-${cellId}`);
				if (statusSelect && aircraft.status) {
					statusSelect.value = aircraft.status;
					// Status-Lichter aktualisieren
					updateStatusLights(cellId);
				}

				// Tow-Status setzen
				const towStatusElem = document.querySelector(`#tow-status-${cellId}`);
				if (towStatusElem && typeof aircraft.towStatus === "number") {
					const towClasses = [
						"tow-initiated",
						"tow-ongoing",
						"tow-on-position",
					];
					const towTexts = ["Initiated", "In Progress", "On Position"];

					towClasses.forEach((cls) => towStatusElem.classList.remove(cls));

					const towStatusIndex = Math.min(Math.max(aircraft.towStatus, 0), 2);
					towStatusElem.classList.add(towClasses[towStatusIndex]);
					towStatusElem.textContent = towTexts[towStatusIndex];
				}

				// Arrival/Departure-Zeiten setzen
				const arrivalTimeElem = document.querySelector(
					`#arrival-time-${cellId}`
				);
				if (
					arrivalTimeElem &&
					aircraft.arrivalTime &&
					aircraft.arrivalTime !== "--:--"
				) {
					arrivalTimeElem.textContent = aircraft.arrivalTime;
				}

				const departureTimeElem = document.querySelector(
					`#departure-time-${cellId}`
				);
				if (
					departureTimeElem &&
					aircraft.departureTime &&
					aircraft.departureTime !== "--:--"
				) {
					departureTimeElem.textContent = aircraft.departureTime;
				}

				// Position anzeigen
				const positionDisplayElem = document.querySelector(
					`#position-${cellId}`
				);
				if (
					positionDisplayElem &&
					aircraft.positionDisplay &&
					aircraft.positionDisplay !== "--"
				) {
					positionDisplayElem.textContent = aircraft.positionDisplay;
				}

				// Manuelles Input-Feld
				const manualInputs = document.querySelectorAll(
					`.hangar-cell:nth-child(${
						cellId <= 12 ? cellId : cellId - 100
					}) input[placeholder="Manual Input"]`
				);
				if (manualInputs.length > 0 && aircraft.manualInput) {
					manualInputs[0].value = aircraft.manualInput;
				}

				// Sichtbarkeit
				const cellSelector =
					cellId <= 12
						? `#hangarGrid .hangar-cell:nth-child(${cellId})`
						: `#secondaryHangarGrid .hangar-cell:nth-child(${cellId - 100})`;

				const cell = document.querySelector(cellSelector);
				if (cell) {
					if (aircraft.visible === false) {
						cell.classList.add("hidden");
					} else {
						cell.classList.remove("hidden");
					}
				}
			});
		}
	}

	/**
	 * Exportiert den Hangarplan als PDF
	 */
	function exportToPDF() {
		const filename =
			document.getElementById("pdfFilename").value || "Hangar_Plan";
		const includeNotes = document.getElementById("includeNotes").checked;
		const landscapeMode = document.getElementById("landscapeMode").checked;

		// Erstelle eine Kopie des hangarGrid für den Export
		const originalGrid = document.getElementById("hangarGrid");
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

		// Nur sichtbare Kacheln ermitteln
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

		// Jede sichtbare Kachel kopieren und optimieren
		visibleCells.forEach((cell) => {
			const cellClone = cell.cloneNode(true);
			cellClone.style.breakInside = "avoid";
			cellClone.style.pageBreakInside = "avoid";
			cellClone.style.width = "100%";

			// Weitere Styling-Optimierungen für PDF...
			// (Code für PDF-Styling hier gekürzt)

			gridContainer.appendChild(cellClone);
		});

		exportContainer.appendChild(gridContainer);

		// PDF-Styling für den Container
		exportContainer.style.padding = "20px";
		exportContainer.style.backgroundColor = "white";
		exportContainer.style.width = "100%";
		exportContainer.style.margin = "0 auto";
		exportContainer.style.maxWidth = landscapeMode ? "1100px" : "900px";

		// PDF-Optionen konfigurieren
		const options = {
			margin: [10, 10],
			filename: `${filename}.pdf`,
			image: { type: "jpeg", quality: 0.98 },
			html2canvas: {
				scale: 2,
				logging: false,
				letterRendering: true,
				useCORS: true,
			},
			jsPDF: {
				unit: "mm",
				format: "a4",
				orientation: landscapeMode ? "landscape" : "portrait",
			},
		};

		// PDF erzeugen und herunterladen
		html2pdf().from(exportContainer).set(options).save();
	}

	/**
	 * Zeigt eine Benachrichtigung an
	 * @param {string} message - Die anzuzeigende Nachricht
	 * @param {"success"|"error"} type - Typ der Benachrichtigung
	 */
	function showNotification(message, type) {
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		notification.textContent = message;

		document.body.appendChild(notification);

		// Automatisches Entfernen der Benachrichtigung nach 3 Sekunden
		setTimeout(() => {
			notification.remove();
		}, 3000);
	}
});

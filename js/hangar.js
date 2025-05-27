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

		const updateSecondaryTilesBtn = document.getElementById(
			"updateSecondaryTilesBtn"
		);
		if (updateSecondaryTilesBtn) {
			updateSecondaryTilesBtn.addEventListener("click", function () {
				// Wert aus dem Eingabefeld in uiSettings speichern
				uiSettings.secondaryTilesCount =
					parseInt(document.getElementById("secondaryTilesCount").value) || 0;
				// Einstellungen im LocalStorage speichern und anwenden
				uiSettings.save();
				uiSettings.apply();
			});
		}

		const layoutType = document.getElementById("layoutType");
		if (layoutType) {
			layoutType.addEventListener("change", function () {
				// Wert aus dem Auswahlfeld in uiSettings speichern
				uiSettings.layout = parseInt(this.value) || 4;
				// Einstellungen im LocalStorage speichern und anwenden
				uiSettings.save();
				uiSettings.apply();
			});
		}

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

		const loadSettingsBtn = document.getElementById("loadSettingsBtn");
		if (loadSettingsBtn) {
			loadSettingsBtn.addEventListener("click", function () {
				document.getElementById("settingsFileInput").click();
			});
		}

		// Settings-Datei-Import
		const settingsFileInput = document.getElementById("settingsFileInput");
		if (settingsFileInput) {
			settingsFileInput.addEventListener("change", loadSettingsFromFile);
		}

		// PDF Export-Button
		const exportPdfBtn = document.getElementById("exportPdfBtn");
		if (exportPdfBtn) {
			exportPdfBtn.addEventListener("click", exportToPDF);
		}

		// Modales Fenster für Laden
		const cancelLoad = document.getElementById("cancelLoad");
		if (cancelLoad) {
			cancelLoad.addEventListener("click", function () {
				document.getElementById("loadModal").classList.add("hidden");
			});
		}

		// Bestätigen-Button für das Modal
		const confirmLoad = document.getElementById("confirmLoad");
		if (confirmLoad) {
			confirmLoad.addEventListener("click", function () {
				const projectName = document.getElementById("loadProjectName").value;
				if (projectName) {
					// Hier würde die Logik zum Laden aus dem LocalStorage erfolgen
					alert(`Projekt "${projectName}" wird geladen...`);
					document.getElementById("loadModal").classList.add("hidden");
				} else {
					alert("Bitte geben Sie einen Projektnamen ein.");
				}
			});
		}

		// Email-Modal schließen
		const emailOkBtn = document.getElementById("emailOkBtn");
		if (emailOkBtn) {
			emailOkBtn.addEventListener("click", function () {
				document.getElementById("emailSentModal").classList.add("hidden");
			});
		}

		// Event-Listener für die Suchfunktion
		const btnSearch = document.getElementById("btnSearch");
		if (btnSearch) {
			btnSearch.addEventListener("click", searchAircraft);
		}

		// Event-Listener für Flugdaten abrufen
		const fetchFlightData = document.getElementById("fetchFlightData");
		if (fetchFlightData) {
			fetchFlightData.addEventListener("click", fetchFlightDataFunction);
		}

		// Projektname Änderungen verfolgen
		const projectName = document.getElementById("projectName");
		if (projectName) {
			projectName.addEventListener("change", function () {
				console.log("Projektname geändert zu: " + this.value);
			});
		}

		// Save und Load Buttons
		const saveBtn = document.getElementById("saveBtn");
		if (saveBtn) {
			saveBtn.addEventListener("click", saveProject);
		}

		const loadBtn = document.getElementById("loadBtn");
		if (loadBtn) {
			loadBtn.addEventListener("click", function () {
				if (checkElement("jsonFileInput")) {
					document.getElementById("jsonFileInput").click();
				}
			});
		}

		const jsonFileInput = document.getElementById("jsonFileInput");
		if (jsonFileInput) {
			jsonFileInput.addEventListener("change", importHangarPlanFromJson);
		}

		// Aktualisiere Event-Listener für alle Kacheln
		setupAllTileEventListeners();
	}

	/**
	 * Aktualisiert die Status-Lichter basierend auf dem gewählten Status
	 */
	function updateStatusLights(cellId) {
		try {
			const status = document.getElementById(`status-${cellId}`).value;

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
	 * Aktualisiert die Daten einer Zelle
	 */
	function updateCellData(cellId) {
		if (cellId > 8) return; // Nur für die primären Zellen relevant

		const cell = hangarData.cells[cellId - 1];
		if (!cell) return;

		// Aktualisiere UI-Elemente basierend auf den Daten
		const aircraftInput = document.getElementById(`aircraft-${cellId}`);
		if (aircraftInput) {
			aircraftInput.value = cell.aircraftId;
		}

		const statusSelect = document.getElementById(`status-${cellId}`);
		if (statusSelect) {
			statusSelect.value = cell.status;
			updateStatusLights(cellId);
		}

		const arrivalTimeElement = document.getElementById(
			`arrival-time-${cellId}`
		);
		if (arrivalTimeElement) {
			arrivalTimeElement.textContent = cell.arrivalTime || "--:--";
		}

		const departureTimeElement = document.getElementById(
			`departure-time-${cellId}`
		);
		if (departureTimeElement) {
			departureTimeElement.textContent = cell.departureTime || "--:--";
		}

		const positionElement = document.getElementById(`position-${cellId}`);
		if (positionElement) {
			positionElement.textContent = cell.position || "--";
		}
	}

	/**
	 * Sucht nach einem Flugzeug
	 */
	function searchAircraft() {
		const searchTerm = document
			.getElementById("searchAircraft")
			.value.trim()
			.toUpperCase();
		if (!searchTerm) {
			alert("Bitte geben Sie eine Flugzeug-ID ein.");
			return;
		}

		let found = false;

		// Durchsuche alle Flugzeug-IDs
		document.querySelectorAll('[id^="aircraft-"]').forEach((input) => {
			const currentValue = input.value.trim().toUpperCase();
			if (currentValue === searchTerm) {
				found = true;

				// Markiere das gefundene Element
				const cell = input.closest(".hangar-cell");
				if (cell) {
					// Kurzzeitig hervorheben
					cell.style.boxShadow = "0 0 0 4px #EF8354";
					cell.scrollIntoView({ behavior: "smooth", block: "center" });

					setTimeout(() => {
						cell.style.boxShadow = "";
					}, 3000);
				}
			}
		});

		if (!found) {
			alert(`Flugzeug mit ID "${searchTerm}" wurde nicht gefunden.`);
		}
	}

	/**
	 * Speichert das aktuelle Projekt
	 */
	function saveProject() {
		try {
			exportHangarPlanToJson();
			showNotification("Projekt erfolgreich gespeichert!", "success");
		} catch (error) {
			console.error("Fehler beim Speichern:", error);
			alert("Fehler beim Speichern: " + error.message);
		}
	}

	/**
	 * Funktion zum Abrufen von Flugdaten (Mock)
	 */
	function fetchFlightDataFunction() {
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.textContent = "Daten werden abgerufen...";
			fetchStatus.style.color = "#FFC107";
		}

		// Simuliere API-Aufruf
		setTimeout(() => {
			// Mock-Daten für Demo-Zwecke
			const mockData = {
				flights: [
					{
						id: "LH123",
						arrival: "12:30",
						departure: "14:45",
						position: "Gate A1",
					},
					{
						id: "BA456",
						arrival: "13:15",
						departure: "15:30",
						position: "Gate B2",
					},
					{
						id: "AF789",
						arrival: "14:00",
						departure: "16:20",
						position: "Gate C3",
					},
				],
			};

			// Daten anwenden (für Demo nur das erste Flugzeug)
			if (mockData.flights && mockData.flights.length > 0) {
				const flight = mockData.flights[0];
				if (checkElement("aircraft-1")) {
					document.getElementById("aircraft-1").value = flight.id;
					document.getElementById("arrival-time-1").textContent =
						flight.arrival;
					document.getElementById("departure-time-1").textContent =
						flight.departure;
					document.getElementById("position-1").textContent = flight.position;

					// Auch in den Daten speichern
					if (hangarData.cells && hangarData.cells.length > 0) {
						hangarData.cells[0].aircraftId = flight.id;
						hangarData.cells[0].arrivalTime = flight.arrival;
						hangarData.cells[0].departureTime = flight.departure;
						hangarData.cells[0].position = flight.position;
					}
				}
			}

			if (fetchStatus) {
				fetchStatus.textContent = "Daten erfolgreich aktualisiert";
				fetchStatus.style.color = "#4CAF50";

				setTimeout(() => {
					fetchStatus.textContent = "Ready to retrieve flight data";
					fetchStatus.style.color = "";
				}, 3000);
			}

			showNotification("Flugdaten wurden aktualisiert", "success");
		}, 1500);
	}

	/**
	 * Exportiert den Hangarplan als PDF (optimierte Version)
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
		// Erzeuge und downloade PDF
		html2pdf().from(exportContainer).set(options).save();
	}

	/**
	 * Lädt Einstellungen aus einer Datei
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
					const settings = JSON.parse(e.target.result);

					// Einstellungen in localStorage speichern
					localStorage.setItem(
						"hangarPlannerSettings",
						JSON.stringify(settings)
					);

					// Einstellungen in UI aktualisieren
					if (checkElement("tilesCount")) {
						document.getElementById("tilesCount").value =
							settings.tilesCount || 8;
					}
					if (checkElement("secondaryTilesCount")) {
						document.getElementById("secondaryTilesCount").value =
							settings.secondaryTilesCount || 0;
					}
					if (checkElement("layoutType")) {
						document.getElementById("layoutType").value = settings.layout || 4;
					}

					// Einstellungen anwenden
					uiSettings.load();
					uiSettings.apply();

					showNotification("Einstellungen erfolgreich geladen", "success");
				} catch (error) {
					console.error(
						"Einstellungen-Datei konnte nicht verarbeitet werden:",
						error
					);
					showNotification(
						"Fehler beim Verarbeiten der Einstellungen-Datei",
						"error"
					);
				}
			};
			reader.readAsText(file);

			// Input zurücksetzen, damit das gleiche File erneut ausgewählt werden kann
			event.target.value = "";
		} catch (error) {
			console.error("Fehler beim Laden der Einstellungen:", error);
			showNotification(
				"Fehler beim Laden der Einstellungen: " + error.message,
				"error"
			);
		}
	}

	/**
	 * Zeigt Benachrichtigungen für den Benutzer an
	 */
	function showNotification(message, type = "info") {
		// Prüfe, ob bereits eine Benachrichtigung angezeigt wird
		let notification = document.getElementById("notification");
		if (!notification) {
			notification = document.createElement("div");
			notification.id = "notification";
			notification.style.position = "fixed";
			notification.style.bottom = "20px";
			notification.style.right = "20px";
			notification.style.padding = "10px 20px";
			notification.style.borderRadius = "4px";
			notification.style.minWidth = "200px";
			notification.style.boxShadow = "0 3px 6px rgba(0,0,0,0.16)";
			notification.style.zIndex = "9999";
			notification.style.transition = "opacity 0.3s";
			document.body.appendChild(notification);
		}

		// Stil basierend auf Typ setzen
		switch (type) {
			case "success":
				notification.style.backgroundColor = "#4CAF50";
				notification.style.color = "#fff";
				break;
			case "error":
				notification.style.backgroundColor = "#F44336";
				notification.style.color = "#fff";
				break;
			case "warning":
				notification.style.backgroundColor = "#FFC107";
				notification.style.color = "#000";
				break;
			default:
				notification.style.backgroundColor = "#2196F3";
				notification.style.color = "#fff";
		}

		notification.textContent = message;
		notification.style.opacity = "1";

		// Nach 3 Sekunden ausblenden
		setTimeout(() => {
			notification.style.opacity = "0";
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 300);
		}, 3000);
	}

	/**
	 * Aktualisiert die sekundären Kacheln
	 */
	function updateSecondaryTiles(count, layout) {
		const secondaryGrid = document.getElementById("secondaryHangarGrid");
		if (!secondaryGrid) return;

		// Bestehende Kacheln entfernen
		secondaryGrid.innerHTML = "";

		// Trennlinie ein-/ausblenden basierend auf Anzahl der sekundären Kacheln
		toggleSecondarySection();

		// Wenn keine Kacheln gewünscht werden, hier abbrechen
		if (count <= 0) return;

		// Neue sekundäre Kacheln erstellen
		for (let i = 1; i <= count; i++) {
			const cellId = 100 + i; // IDs für sekundäre Kacheln beginnen bei 101

			const cell = document.createElement("div");
			cell.className =
				"hangar-cell bg-white rounded-lg shadow-md flex flex-col";

			// HTML für eine sekundäre Kachel (ähnlich wie primäre, aber mit anderen IDs)
			cell.innerHTML = `
				<div class="bg-industrial-medium px-3 py-2 rounded-t-lg flex justify-between items-center">
					<div class="status-container">
						<span class="status-light bg-status-green" data-cell="${cellId}" data-status="ready"></span>
						<span class="status-light bg-status-yellow" data-cell="${cellId}" data-status="maintenance"></span>
						<span class="status-light bg-status-red" data-cell="${cellId}" data-status="aog"></span>
					</div>
					<div class="flex items-center">
						<span class="text-xs text-white font-medium mr-2">Position:</span>
						<input type="text" placeholder="${i}" id="hangar-position-${cellId}" 
							class="text-xs bg-industrial-dark rounded px-2 py-1 w-10 text-white text-center">
					</div>
					<input type="text" placeholder="Manual Input" 
						class="text-xs bg-industrial-dark rounded px-2 py-1 w-32 text-white">
				</div>
				<div class="p-4 flex-grow flex flex-col">
					<input type="text" id="aircraft-${cellId}" placeholder="Aircraft ID" class="aircraft-id">
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
				</div>
			`;

			secondaryGrid.appendChild(cell);
		}

		// Event-Handler für Status-Updates in den neuen Kacheln einrichten
		setupAllTileEventListeners();
	}

	/**
	 * Aktualisiert die Sichtbarkeit des sekundären Bereichs
	 */
	function toggleSecondarySection() {
		const secondaryCount = uiSettings.secondaryTilesCount || 0;
		const divider = document.querySelector(".section-divider");
		const secondaryLabel = document.querySelector(
			".section-label + .section-label"
		);
		const secondaryGrid = document.getElementById("secondaryHangarGrid");

		if (secondaryCount > 0) {
			// Sichtbar machen
			if (divider) divider.style.display = "block";
			if (secondaryLabel) secondaryLabel.style.display = "block";
			if (secondaryGrid) secondaryGrid.style.display = "grid";
		} else {
			// Verstecken
			if (divider) divider.style.display = "none";
			if (secondaryLabel) secondaryLabel.style.display = "none";
			if (secondaryGrid) secondaryGrid.style.display = "none";
		}
	}

	/**
	 * Richtet Event-Listener für alle Kacheln ein
	 */
	function setupAllTileEventListeners() {
		// Status-Selektoren für Status-Updates
		document.querySelectorAll(".status-selector").forEach((selector) => {
			selector.removeEventListener("change", statusChangeHandler);
			selector.addEventListener("change", statusChangeHandler);
		});
	}

	/**
	 * Event-Handler für Status-Änderungen
	 */
	function statusChangeHandler(event) {
		const selector = event.target;
		const cellId = selector.id.split("-")[1]; // Extrahiert die Zell-ID aus der Selector-ID
		updateStatusLights(cellId);
	}

	/**
	 * Initialisiert alle Status-Handler
	 */
	function initStatusHandlers() {
		document.querySelectorAll(".status-selector").forEach((selector) => {
			selector.addEventListener("change", statusChangeHandler);
		});
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

					// Projekt-Name aktualisieren, falls vorhanden
					if (data.projectName && checkElement("projectName")) {
						document.getElementById("projectName").value = data.projectName;
					}

					// Einstellungen aktualisieren, falls vorhanden
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

					// Kacheldaten aktualisieren
					if (data.cells && Array.isArray(data.cells)) {
						data.cells.forEach((cellData) => {
							const cellId = cellData.id;

							// Primäre oder sekundäre Zelle
							const isPrimary = cellId < 100;

							// Flugzeug-ID
							const aircraftInput = document.getElementById(
								`aircraft-${cellId}`
							);
							if (aircraftInput && cellData.aircraftId) {
								aircraftInput.value = cellData.aircraftId;
							}

							// Status
							const statusSelect = document.getElementById(`status-${cellId}`);
							if (statusSelect && cellData.status) {
								statusSelect.value = cellData.status;
								updateStatusLights(cellId);
							}

							// Ankunfts-/Abflugzeiten und Position
							if (cellData.arrivalTime) {
								const arrivalElement = document.getElementById(
									`arrival-time-${cellId}`
								);
								if (arrivalElement)
									arrivalElement.textContent = cellData.arrivalTime;
							}

							if (cellData.departureTime) {
								const departureElement = document.getElementById(
									`departure-time-${cellId}`
								);
								if (departureElement)
									departureElement.textContent = cellData.departureTime;
							}

							if (cellData.position) {
								const positionElement = document.getElementById(
									`position-${cellId}`
								);
								if (positionElement)
									positionElement.textContent = cellData.position;

								const positionInput = document.getElementById(
									`hangar-position-${cellId}`
								);
								if (positionInput) positionInput.value = cellData.position;
							}

							// Notizen
							if (cellData.notes) {
								const notesElement = document.getElementById(`notes-${cellId}`);
								if (notesElement) notesElement.value = cellData.notes;
							}

							// Manuelle Eingabe
							if (cellData.manualInput) {
								// Bestimme den Container (primär oder sekundär)
								const container = isPrimary
									? "#hangarGrid"
									: "#secondaryHangarGrid";
								const index = isPrimary ? cellId : cellId - 100;

								const manualInput = document.querySelector(
									`${container} .hangar-cell:nth-child(${index}) input[placeholder="Manual Input"]`
								);
								if (manualInput) manualInput.value = cellData.manualInput;
							}

							// Wenn es eine primäre Zelle ist, aktualisieren wir auch die hangarData-Struktur
							if (isPrimary && cellId <= 8) {
								hangarData.cells[cellId - 1] = {
									...hangarData.cells[cellId - 1],
									...cellData,
								};
							}
						});
					}

					showNotification("Hangar-Plan erfolgreich geladen", "success");
				} catch (error) {
					console.error("JSON-Datei konnte nicht verarbeitet werden:", error);
					showNotification("Fehler beim Verarbeiten der JSON-Datei", "error");
				}
			};
			reader.readAsText(file);

			// Input zurücksetzen, damit das gleiche File erneut ausgewählt werden kann
			event.target.value = "";
		} catch (error) {
			console.error("Fehler beim Import des Hangar-Plans:", error);
			showNotification("Fehler beim Import: " + error.message, "error");
		}
	}

	/**
	 * Exportiert den aktuellen Hangarplan als JSON-Datei
	 */
	function exportHangarPlanToJson() {
		try {
			// Projektname aus Eingabefeld holen
			const projectName = checkElement("projectName")
				? document.getElementById("projectName").value
				: "HangarPlan";

			// Einstellungen sammeln
			const settings = {
				tilesCount: uiSettings.tilesCount,
				secondaryTilesCount: uiSettings.secondaryTilesCount,
				layout: uiSettings.layout,
			};

			// Daten aller Kacheln sammeln
			const cells = [];

			// Primäre Kacheln
			for (let i = 1; i <= uiSettings.tilesCount; i++) {
				const cell = collectCellData(i);
				if (cell) cells.push(cell);
			}

			// Sekundäre Kacheln
			for (let i = 1; i <= uiSettings.secondaryTilesCount; i++) {
				const cellId = 100 + i;
				const cell = collectCellData(cellId);
				if (cell) cells.push(cell);
			}

			// Gesamtdaten zusammenstellen
			const exportData = {
				projectName: projectName,
				settings: settings,
				cells: cells,
				exportDate: new Date().toISOString(),
			};

			// In Datei exportieren
			const dataStr = JSON.stringify(exportData, null, 2);
			const dataBlob = new Blob([dataStr], { type: "application/json" });
			const fileName = `${projectName}.json`;
			const downloadLink = document.createElement("a");
			downloadLink.href = URL.createObjectURL(dataBlob);
			downloadLink.download = fileName;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);

			showNotification(
				`Hangarplan erfolgreich als ${fileName} gespeichert`,
				"success"
			);
			return true;
		} catch (error) {
			console.error("Fehler beim Exportieren des Hangar-Plans:", error);
			showNotification("Fehler beim Export: " + error.message, "error");
			return false;
		}
	}

	/**
	 * Sammelt Daten einer einzelnen Kachel
	 */
	function collectCellData(cellId) {
		try {
			const cell = {
				id: cellId,
			};

			// Aircraft ID
			const aircraftInput = document.getElementById(`aircraft-${cellId}`);
			if (aircraftInput) {
				cell.aircraftId = aircraftInput.value;
			}

			// Status
			const statusSelect = document.getElementById(`status-${cellId}`);
			if (statusSelect) {
				cell.status = statusSelect.value;
			}

			// Position (aus der Position im Header und dem angezeigten Wert)
			const positionInput = document.getElementById(
				`hangar-position-${cellId}`
			);
			if (positionInput) {
				cell.position = positionInput.value;
			}

			// Arrival/Departure Zeiten
			const arrivalElement = document.getElementById(`arrival-time-${cellId}`);
			if (arrivalElement) {
				cell.arrivalTime =
					arrivalElement.textContent !== "--:--"
						? arrivalElement.textContent
						: "";
			}

			const departureElement = document.getElementById(
				`departure-time-${cellId}`
			);
			if (departureElement) {
				cell.departureTime =
					departureElement.textContent !== "--:--"
						? departureElement.textContent
						: "";
			}

			// Notizen
			const notesElement = document.getElementById(`notes-${cellId}`);
			if (notesElement) {
				cell.notes = notesElement.value;
			}

			// Manual Input (über Container und Selector)
			const isPrimary = cellId < 100;
			const container = isPrimary ? "#hangarGrid" : "#secondaryHangarGrid";
			const index = isPrimary ? cellId : cellId - 100;

			const manualInput = document.querySelector(
				`${container} .hangar-cell:nth-child(${index}) input[placeholder="Manual Input"]`
			);
			if (manualInput) {
				cell.manualInput = manualInput.value;
			}

			return cell;
		} catch (error) {
			console.error(
				`Fehler beim Sammeln der Daten für Kachel ${cellId}:`,
				error
			);
			return null;
		}
	}
});

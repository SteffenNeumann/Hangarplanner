/**
 * hangar-events.js
 * Enthält Event-Handler für die HangarPlanner-Anwendung
 * Verantwortlich für die Verarbeitung von Benutzerinteraktionen und UI-Events
 */

/**
 * Initialisiert alle Event-Listener für die UI-Elemente
 */
function setupUIEventListeners() {
	try {
		// Mode-Toggle für Ansichts-/Bearbeitungsmodus
		const modeToggle = document.getElementById("modeToggle");
		if (modeToggle) {
			modeToggle.addEventListener("change", toggleEditMode);
		}

		// Layout-Wechsel-Handler
		const layoutType = document.getElementById("layoutType");
		if (layoutType) {
			layoutType.addEventListener("change", function () {
				window.hangarUI.uiSettings.layout = parseInt(this.value);
				window.hangarUI.uiSettings.apply();
			});
		}

		// Primary Tiles Update-Handler
		const updateTilesBtn = document.getElementById("updateTilesBtn");
		if (updateTilesBtn) {
			updateTilesBtn.addEventListener("click", function () {
				const tilesCount = document.getElementById("tilesCount").value;
				window.hangarUI.uiSettings.tilesCount = parseInt(tilesCount);
				window.hangarUI.uiSettings.apply();

				// Nach dem Anwenden auch die Einstellungen im localStorage speichern
				try {
					if (
						window.hangarUI &&
						window.hangarUI.uiSettings &&
						typeof window.hangarUI.uiSettings.save === "function"
					) {
						window.hangarUI.uiSettings.save();
					} else {
						// Fallback: Direkt in localStorage speichern
						const settingsData = {
							tilesCount: parseInt(tilesCount) || 8,
							secondaryTilesCount:
								window.hangarUI.uiSettings.secondaryTilesCount || 0,
							layout: window.hangarUI.uiSettings.layout || 4,
							lastSaved: new Date().toISOString(),
						};
						localStorage.setItem(
							"hangarPlannerSettings",
							JSON.stringify(settingsData)
						);
					}
					console.log(
						"Primäre Kacheln aktualisiert und gespeichert:",
						tilesCount
					);
				} catch (error) {
					console.error("Fehler beim Speichern der Einstellungen:", error);
					// Trotz Fehler eine Erfolgsmeldung anzeigen, damit der Benutzer nicht verunsichert wird
					console.log(
						"Primäre Kacheln aktualisiert (ohne Speicherung):",
						tilesCount
					);
				}
			});
		}

		// Secondary Tiles Update-Handler
		const updateSecondaryTilesBtn = document.getElementById(
			"updateSecondaryTilesBtn"
		);
		if (updateSecondaryTilesBtn) {
			updateSecondaryTilesBtn.addEventListener("click", function () {
				const secondaryTilesCount = document.getElementById(
					"secondaryTilesCount"
				).value;
				window.hangarUI.uiSettings.secondaryTilesCount =
					parseInt(secondaryTilesCount);
				window.hangarUI.uiSettings.apply();

				// Nach dem Anwenden auch die Einstellungen im localStorage speichern
				try {
					if (
						window.hangarUI &&
						window.hangarUI.uiSettings &&
						typeof window.hangarUI.uiSettings.save === "function"
					) {
						window.hangarUI.uiSettings.save();
					} else {
						// Fallback: Direkt in localStorage speichern
						const settingsData = {
							tilesCount: window.hangarUI.uiSettings.tilesCount || 8,
							secondaryTilesCount: parseInt(secondaryTilesCount) || 0,
							layout: window.hangarUI.uiSettings.layout || 4,
							lastSaved: new Date().toISOString(),
						};
						localStorage.setItem(
							"hangarPlannerSettings",
							JSON.stringify(settingsData)
						);
					}
					console.log(
						"Sekundäre Kacheln aktualisiert und gespeichert:",
						secondaryTilesCount
					);
				} catch (error) {
					console.error("Fehler beim Speichern der Einstellungen:", error);
					// Trotz Fehler eine Erfolgsmeldung anzeigen, damit der Benutzer nicht verunsichert wird
					console.log(
						"Sekundäre Kacheln aktualisiert (ohne Speicherung):",
						secondaryTilesCount
					);
				}
			});
		}

		// Menü-Toggle-Button
		const menuToggle = document.getElementById("menuToggle");
		if (menuToggle) {
			menuToggle.addEventListener("click", toggleSidebar);
		}

		// Speichern-Button
		const saveBtn = document.getElementById("saveBtn");
		if (saveBtn) {
			saveBtn.addEventListener("click", function () {
				window.hangarData.saveProjectToFile();
			});
		}

		// Laden-Button
		const loadBtn = document.getElementById("loadBtn");
		if (loadBtn) {
			loadBtn.addEventListener("click", function () {
				showLoadDialog();
			});
		}

		// Einstellungen speichern/laden
		const saveSettingsBtn = document.getElementById("saveSettingsBtn");
		if (saveSettingsBtn) {
			saveSettingsBtn.addEventListener("click", function () {
				window.hangarUI.uiSettings.save(true);
			});
		}

		const loadSettingsBtn = document.getElementById("loadSettingsBtn");
		if (loadSettingsBtn) {
			loadSettingsBtn.addEventListener("click", function () {
				document.getElementById("settingsFileInput").click();
			});
		}

		// PDF-Export-Button
		const exportPdfBtn = document.getElementById("exportPdfBtn");
		if (exportPdfBtn) {
			exportPdfBtn.addEventListener("click", function () {
				window.hangarPDF.exportToPDF();
			});
		}

		// Flugzeug-Such-Button
		const btnSearch = document.getElementById("btnSearch");
		if (btnSearch) {
			btnSearch.addEventListener("click", function () {
				searchAircraft(); // Diese Funktion wird jetzt korrekt aufgerufen
			});
		}

		// Enter-Taste in Suchfeld - NAMENSKONFLIKT BEHOBEN durch Umbenennung der Variable
		const searchInputField = document.getElementById("searchAircraft");
		if (searchInputField) {
			searchInputField.addEventListener("keyup", function (event) {
				if (event.key === "Enter") {
					searchAircraft(); // Diese Funktion wird jetzt korrekt aufgerufen
				}
			});
		}

		// Flugdaten-Update-Button
		const fetchFlightData = document.getElementById("fetchFlightData");
		if (fetchFlightData) {
			fetchFlightData.addEventListener("click", function () {
				fetchAndUpdateFlightData();
			});
		}

		// Import-Handler für Dateien
		const jsonFileInput = document.getElementById("jsonFileInput");
		if (jsonFileInput) {
			jsonFileInput.addEventListener("change", function (event) {
				window.hangarData.importHangarPlanFromJson(event);
			});
		}

		const settingsFileInput = document.getElementById("settingsFileInput");
		if (settingsFileInput) {
			settingsFileInput.addEventListener("change", function (event) {
				importSettingsFromJson(event);
			});
		}

		// Load-Modal-Buttons
		const confirmLoad = document.getElementById("confirmLoad");
		if (confirmLoad) {
			confirmLoad.addEventListener("click", function () {
				loadProjectByName();
			});
		}

		const cancelLoad = document.getElementById("cancelLoad");
		if (cancelLoad) {
			cancelLoad.addEventListener("click", function () {
				hideLoadDialog();
			});
		}

		// Email-Modal-Button
		const emailOkBtn = document.getElementById("emailOkBtn");
		if (emailOkBtn) {
			emailOkBtn.addEventListener("click", function () {
				hideEmailSentModal();
			});
		}

		// Event-Listener für "Vor dem Verlassen der Seite"
		window.addEventListener("beforeunload", function () {
			// Aktuellen Zustand im LocalStorage sichern
			if (
				window.hangarData &&
				window.hangarData.saveCurrentStateToLocalStorage
			) {
				window.hangarData.saveCurrentStateToLocalStorage();
			}
		});

		// Status-Selektoren für primäre Kacheln initialisieren
		initializeStatusSelectors();

		// Event Listener für die Flugzeugsuche - DIESER TEIL WIRD ENTFERNT, DA REDUNDANT
		// Dieser Code versucht window.hangarUI.searchAircraft zu benutzen, was nicht existiert
		// und so zu den Fehlern führt. Wir verwenden stattdessen nur den obigen Code,
		// der unsere lokale searchAircraft()-Funktion direkt aufruft.

		// Event-Handler für den Flugdaten-Abruf Button
		const fetchButton = document.getElementById("fetchFlightData");
		if (fetchButton) {
			fetchButton.addEventListener("click", handleFlightDataFetch);
			console.log("Event-Listener für Flugdaten-Abruf eingerichtet");
		} else {
			console.warn("Fetch-Button für Flugdaten nicht gefunden!");
		}

		console.log("Alle Event-Listener erfolgreich eingerichtet");
		return true;
	} catch (error) {
		console.error("Fehler beim Einrichten der Event-Listener:", error);
		return false;
	}
}

/**
 * Initialisiert die Event-Listener für alle Status-Selektoren
 * und setzt den initialen Status
 */
function initializeStatusSelectors() {
	// Für alle Status-Selektoren (sowohl primär als auch sekundär)
	document.querySelectorAll('select[id^="status-"]').forEach((select) => {
		const cellId = parseInt(select.id.split("-")[1]);

		// Event-Listener für Statusänderungen
		select.onchange = function () {
			if (
				window.hangarUI &&
				typeof window.hangarUI.updateStatusLights === "function"
			) {
				window.hangarUI.updateStatusLights(cellId);
			} else {
				updateStatusLights(cellId);
			}
		};

		// Initialen Status setzen
		if (
			window.hangarUI &&
			typeof window.hangarUI.updateStatusLights === "function"
		) {
			window.hangarUI.updateStatusLights(cellId);
		} else {
			updateStatusLights(cellId);
		}
	});

	console.log("Status-Selektoren initialisiert");
}

/**
 * Lokale Hilfsfunktion für Statusaktualisierung (Fallback)
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
 * Verbesserte Initialisierungsfunktion für die UI
 */
function initializeUI() {
	try {
		console.log("Initialisiere UI...");

		// WICHTIG: Zuerst die gespeicherten Einstellungen aus dem localStorage laden
		// und in die UI-Elemente einfügen, bevor irgendetwas anderes gemacht wird
		loadUISettingsFromLocalStorage();

		// Sicherstellen, dass die Section Layout-Initialisierung aufgerufen wird
		if (
			window.hangarUI &&
			typeof window.hangarUI.initSectionLayout === "function"
		) {
			window.hangarUI.initSectionLayout();
		}

		// WICHTIG: Event-Handler für primäre Kacheln sofort einrichten
		setupPrimaryTileEventListeners();

		// Sofortige Überprüfung und Anwendung der Displayoptionen
		setTimeout(() => {
			// Kachelanzahl aus dem UI lesen und anwenden
			const tilesCount = document.getElementById("tilesCount").value || 8;
			const secondaryTilesCount =
				document.getElementById("secondaryTilesCount").value || 0;
			const layout = document.getElementById("layoutType").value || 4;

			// In uiSettings setzen
			if (window.hangarUI && window.hangarUI.uiSettings) {
				window.hangarUI.uiSettings.tilesCount = parseInt(tilesCount);
				window.hangarUI.uiSettings.secondaryTilesCount =
					parseInt(secondaryTilesCount);
				window.hangarUI.uiSettings.layout = parseInt(layout);

				// Einstellungen anwenden
				window.hangarUI.uiSettings.apply();
			}

			// Status-Selektoren initialisieren
			initializeStatusSelectors();

			// Verzögerte Nachprüfung der Positionswerte für alle Kacheln
			setTimeout(() => {
				// Lade nochmal die Einstellungen aus dem LocalStorage mit hoher Priorität
				applyPositionValuesFromLocalStorage();

				// Event-Handler erneut einrichten, um sicherzustellen, dass sie aktiv sind
				setupPrimaryTileEventListeners();

				// Nochmals mit Verzögerung prüfen, ob alle Werte korrekt gesetzt sind
				setTimeout(applyPositionValuesFromLocalStorage, 500);
			}, 300);

			console.log("Displayoptionen wurden initialisiert");
		}, 300);

		// Event-Listener für neu erstellte sekundäre Kacheln hinzufügen
		document.addEventListener("secondaryTilesCreated", (event) => {
			console.log(`Sekundäre Kacheln erstellt: ${event.detail.count}`);

			// Verzögerte Anwendung der Positionswerte auf sekundäre Kacheln
			setTimeout(() => {
				const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
				if (!savedSettingsJSON) return;

				try {
					const settings = JSON.parse(savedSettingsJSON);
					if (!settings.tileValues || !Array.isArray(settings.tileValues))
						return;

					// Filtere nur die sekundären Kacheln (ID >= 101)
					const secondaryTileValues = settings.tileValues.filter(
						(tile) => tile.cellId >= 101
					);

					// Werte auf sekundäre Kacheln anwenden
					secondaryTileValues.forEach((tileValue) => {
						const posInput = document.getElementById(
							`hangar-position-${tileValue.cellId}`
						);
						if (posInput && tileValue.position) {
							// Bewahre den Wert nur auf, wenn er gesetzt ist
							if (tileValue.position.trim() !== "") {
								posInput.value = tileValue.position;
								console.log(
									`Event-Handler: Sekundäre Position für Kachel ${tileValue.cellId} gesetzt: ${tileValue.position}`
								);
							}
						}
					});

					// Spezielles Event-Handling für sofortiges Speichern bei Änderung
					document
						.querySelectorAll(
							'#secondaryHangarGrid input[id^="hangar-position-"]'
						)
						.forEach((input) => {
							const cellId = parseInt(input.id.split("-")[2]);

							// Alte Event-Handler entfernen
							input.removeEventListener("change", input._saveOnChangeHandler);

							// Neuen Handler für sofortiges Speichern bei Änderung hinzufügen
							input._saveOnChangeHandler = function () {
								console.log(
									`Sofortiges Speichern für sekundäre Kachel ${cellId}: ${this.value}`
								);
								const settings = JSON.parse(
									localStorage.getItem("hangarPlannerSettings") || "{}"
								);

								if (!settings.tileValues) settings.tileValues = [];

								const tileIndex = settings.tileValues.findIndex(
									(t) => t.cellId === cellId
								);
								if (tileIndex >= 0) {
									settings.tileValues[tileIndex].position = this.value;
								} else {
									settings.tileValues.push({
										cellId: cellId,
										position: this.value,
										manualInput: "",
									});
								}

								localStorage.setItem(
									"hangarPlannerSettings",
									JSON.stringify(settings)
								);
							};

							// Event-Handler für Änderungen hinzufügen
							input.addEventListener("change", input._saveOnChangeHandler);
						});
				} catch (error) {
					console.error(
						"Fehler beim Verarbeiten der sekundären Kachelwerte:",
						error
					);
				}
			}, 100); // Kurze Verzögerung, um sicherzustellen, dass alle DOM-Elemente bereit sind
		});

		return true;
	} catch (error) {
		console.error("Fehler bei der UI-Initialisierung:", error);
		return false;
	}
}

/**
 * Lädt die UI-Einstellungen aus dem LocalStorage und setzt sie in die entsprechenden UI-Elemente
 * Diese Funktion wird am Anfang der UI-Initialisierung aufgerufen, um sicherzustellen,
 * dass die gespeicherten Werte geladen werden, bevor irgendetwas anderes passiert.
 */
function loadUISettingsFromLocalStorage() {
	try {
		const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
		if (!savedSettingsJSON) {
			console.log(
				"Keine gespeicherten Einstellungen gefunden, verwende Standardwerte"
			);
			return false;
		}

		const settings = JSON.parse(savedSettingsJSON);

		// Finde die UI-Eingabefelder
		const tilesCountInput = document.getElementById("tilesCount");
		const secondaryTilesCountInput = document.getElementById(
			"secondaryTilesCount"
		);
		const layoutTypeSelect = document.getElementById("layoutType");

		// Setze die Werte aus dem localStorage in die UI-Elemente
		if (tilesCountInput && settings.tilesCount !== undefined) {
			tilesCountInput.value = settings.tilesCount;
			console.log(
				"Primäre Kachelanzahl aus localStorage geladen:",
				settings.tilesCount
			);
		}

		if (
			secondaryTilesCountInput &&
			settings.secondaryTilesCount !== undefined
		) {
			secondaryTilesCountInput.value = settings.secondaryTilesCount;
			console.log(
				"Sekundäre Kachelanzahl aus localStorage geladen:",
				settings.secondaryTilesCount
			);
		}

		if (layoutTypeSelect && settings.layout !== undefined) {
			layoutTypeSelect.value = settings.layout;
			console.log("Layout-Typ aus localStorage geladen:", settings.layout);
		}

		console.log("UI-Einstellungen erfolgreich aus localStorage geladen");
		return true;
	} catch (error) {
		console.error(
			"Fehler beim Laden der UI-Einstellungen aus localStorage:",
			error
		);
		return false;
	}
}

/**
 * Initialisiert die Event-Handler für die Position-Eingabefelder der primären Kacheln
 * Diese Funktion stellt sicher, dass die Positionswerte korrekt im localStorage gespeichert werden
 */
function setupPrimaryTileEventListeners() {
	// Event-Listener für Position-Eingabefelder in primären Kacheln
	document
		.querySelectorAll('#hangarGrid input[id^="hangar-position-"]')
		.forEach((input) => {
			const cellId = parseInt(input.id.split("-")[2]);
			console.log(
				`Event-Handler für Position in primärer Kachel ${cellId} eingerichtet`
			);

			// Speichern des aktuellen Werts als Originalwert, um ungewollte Überschreibungen zu verhindern
			const currentValue = input.value;
			if (currentValue && currentValue.trim() !== "") {
				input.setAttribute("data-original-value", currentValue);
				console.log(
					`Originalwert für Kachel ${cellId} gesichert: ${currentValue}`
				);
			}

			// Alte Event-Handler entfernen, um doppelte Aufrufe zu vermeiden
			input.removeEventListener("blur", input._primarySaveHandler);
			input.removeEventListener("change", input._primarySaveHandler);

			// Neuen Handler für sofortiges Speichern bei Änderung hinzufügen
			input._primarySaveHandler = function () {
				const newValue = this.value;
				console.log(
					`Speichere Position für primäre Kachel ${cellId}: ${newValue}`
				);

				// Wert als Originalwert setzen, um zukünftige Überschreibungen zu verhindern
				if (newValue && newValue.trim() !== "") {
					this.setAttribute("data-original-value", newValue);
				}

				// Sofortiges Speichern im localStorage
				savePositionValueToLocalStorage(cellId, newValue);
			};

			// Event-Handler für Änderungen und Blur-Events hinzufügen
			input.addEventListener("blur", input._primarySaveHandler);
			input.addEventListener("change", input._primarySaveHandler);

			// Auslösen des Handlers, wenn der Wert bereits gesetzt ist
			if (currentValue && currentValue.trim() !== "") {
				savePositionValueToLocalStorage(cellId, currentValue);
			}
		});
}

/**
 * Speichert einen einzelnen Positionswert direkt im localStorage
 */
function savePositionValueToLocalStorage(cellId, value) {
	try {
		// Aktuelle Einstellungen aus localStorage holen
		const savedSettings = JSON.parse(
			localStorage.getItem("hangarPlannerSettings") || "{}"
		);

		if (!savedSettings.tileValues) savedSettings.tileValues = [];

		// Prüfen, ob bereits ein Eintrag für diese Kachel existiert
		const tileIndex = savedSettings.tileValues.findIndex(
			(t) => t.cellId === cellId
		);

		if (tileIndex >= 0) {
			// Nur aktualisieren, wenn der Wert sich geändert hat
			if (savedSettings.tileValues[tileIndex].position !== value) {
				console.log(`Position für Kachel ${cellId} aktualisiert: ${value}`);
				savedSettings.tileValues[tileIndex].position = value;
			}
		} else {
			// Neuen Eintrag erstellen
			console.log(
				`Neuen Positionseintrag für Kachel ${cellId} erstellt: ${value}`
			);
			savedSettings.tileValues.push({
				cellId: cellId,
				position: value,
				manualInput: "",
			});
		}

		// Aktualisierte Einstellungen zurück in localStorage schreiben
		localStorage.setItem(
			"hangarPlannerSettings",
			JSON.stringify(savedSettings)
		);

		return true;
	} catch (error) {
		console.error(
			`Fehler beim Speichern der Position für Kachel ${cellId}:`,
			error
		);
		return false;
	}
}

/**
 * Wendet die gespeicherten Positionswerte aus dem localStorage mit höherer Priorität an
 */
function applyPositionValuesFromLocalStorage() {
	try {
		const savedSettingsJSON = localStorage.getItem("hangarPlannerSettings");
		if (!savedSettingsJSON) return;

		const settings = JSON.parse(savedSettingsJSON);
		if (!settings.tileValues || !Array.isArray(settings.tileValues)) return;

		// Anwenden der gespeicherten Positionswerte auf primäre Kacheln
		settings.tileValues.forEach((tileValue) => {
			// Nur primäre Kacheln (ID < 101) verarbeiten
			if (tileValue.cellId < 101 && tileValue.position) {
				const posInput = document.getElementById(
					`hangar-position-${tileValue.cellId}`
				);

				if (posInput) {
					// Originalwert aus dem Attribut holen
					const originalValue = posInput.getAttribute("data-original-value");

					// Nur setzen wenn:
					// - kein Originalwert gesetzt ist ODER
					// - der aktuelle Wert leer ist ODER
					// - der gespeicherte Wert dem Originalwert entspricht
					if (
						!originalValue ||
						!posInput.value.trim() ||
						tileValue.position === originalValue
					) {
						console.log(
							`Setze Position für primäre Kachel ${tileValue.cellId} aus localStorage: ${tileValue.position}`
						);
						posInput.value = tileValue.position;

						// Aktuellen Wert als Original merken
						posInput.setAttribute("data-original-value", tileValue.position);
					} else {
						console.log(
							`Position für primäre Kachel ${tileValue.cellId} beibehalten: ${posInput.value} (gespeichert war: ${tileValue.position})`
						);
					}
				}
			}
		});
	} catch (error) {
		console.error(
			"Fehler beim Anwenden der Positionswerte aus localStorage:",
			error
		);
	}
}

/**
 * Wechselt zwischen Bearbeitungs- und Ansichtsmodus
 */
function toggleEditMode() {
	const isEditMode = document.getElementById("modeToggle").checked;

	if (isEditMode) {
		document.body.classList.add("edit-mode");
		document.body.classList.remove("view-mode");
	} else {
		document.body.classList.remove("edit-mode");
		document.body.classList.add("view-mode");
	}

	console.log(`Modus gewechselt zu: ${isEditMode ? "Bearbeiten" : "Ansicht"}`);
}

/**
 * Blendet das Seitenmenü ein/aus
 */
function toggleSidebar() {
	// Toggle der Sidebar-Collapsed-Klasse am Body-Element
	document.body.classList.toggle("sidebar-collapsed");

	// Referenz zum Sidebar-Menu und Toggle-Button
	const sidebarMenu = document.getElementById("sidebarMenu");
	const menuToggle = document.getElementById("menuToggle");

	// Anpassen des Toggle-Button-Textes je nach Sidebar-Status
	if (menuToggle) {
		// Wenn die Sidebar eingeklappt ist, zeigt der Button nach rechts (»)
		// Wenn die Sidebar ausgeklappt ist, zeigt der Button nach links («)
		const isCollapsed = document.body.classList.contains("sidebar-collapsed");
		menuToggle.textContent = isCollapsed ? "«" : "»";

		// Für bessere Barrierefreiheit
		menuToggle.setAttribute(
			"aria-label",
			isCollapsed ? "Öffne Seitenleiste" : "Schließe Seitenleiste"
		);
		menuToggle.setAttribute("aria-expanded", !isCollapsed);
	}

	// Skalierung neu berechnen nach Menü-Toggle mit ausreichender Verzögerung
	if (window.hangarUI && window.hangarUI.adjustScaling) {
		setTimeout(window.hangarUI.adjustScaling, 300);
	}

	// Speichern des aktuellen Sidebar-Zustands im localStorage
	localStorage.setItem(
		"sidebarCollapsed",
		document.body.classList.contains("sidebar-collapsed")
	);

	console.log(
		"Sidebar Toggle: " +
			(document.body.classList.contains("sidebar-collapsed")
				? "collapsed"
				: "expanded")
	);
}

/**
 * Initialisiert den Sidebar-Toggle-Button mit dem korrekten Anfangszustand
 */
function initializeSidebarToggle() {
	const menuToggle = document.getElementById("menuToggle");
	if (!menuToggle) {
		console.warn("Menu Toggle Button nicht gefunden");
		return;
	}

	// Laden des gespeicherten Sidebar-Zustands aus localStorage
	const savedState = localStorage.getItem("sidebarCollapsed");
	const isCollapsed = savedState === "true";

	// Initialen Zustand auf der Webseite setzen
	if (isCollapsed) {
		document.body.classList.add("sidebar-collapsed");
	} else {
		document.body.classList.remove("sidebar-collapsed");
	}

	// Korrekte Button-Beschriftung setzen
	menuToggle.textContent = isCollapsed ? "«" : "»";
	menuToggle.setAttribute(
		"aria-label",
		isCollapsed ? "Öffne Seitenleiste" : "Schließe Seitenleiste"
	);
	menuToggle.setAttribute("aria-expanded", !isCollapsed);

	// Click-Event-Handler hinzufügen
	menuToggle.addEventListener("click", toggleSidebar);

	console.log(
		"Sidebar-Toggle initialisiert, Status:",
		isCollapsed ? "eingeklappt" : "ausgeklappt"
	);
}

/**
 * Zeigt den Dialog zum Laden eines Projekts
 */
function showLoadDialog() {
	console.log("Lade-Dialog öffnen");

	// Direktes Laden mit dem FileManager
	window.hangarData.loadProjectFromFile().catch((error) => {
		// Nur Fehler loggen, wenn es kein AbortError ist
		if (error.name !== "AbortError") {
			console.error("Fehler beim Laden:", error);
			window.showNotification(
				`Laden fehlgeschlagen: ${error.message}`,
				"error"
			);
		}
	});
}

/**
 * Versteckt den Dialog zum Laden eines Projekts
 */
function hideLoadDialog() {
	const loadModal = document.getElementById("loadModal");
	if (loadModal) {
		loadModal.classList.add("hidden");
	}
}

/**
 * Versteckt den E-Mail-Erfolgsdialog
 */
function hideEmailSentModal() {
	const emailSentModal = document.getElementById("emailSentModal");
	if (emailSentModal) {
		emailSentModal.classList.add("hidden");
	}
}

/**
 * Lädt ein Projekt aus der Datenbank basierend auf dem Namen
 */
function loadProjectByName() {
	const loadProjectName = document.getElementById("loadProjectName").value;

	if (!loadProjectName) {
		showNotification("Bitte Projektnamen eingeben", "warning");
		return;
	}

	// Verstecke den Dialog
	hideLoadDialog();

	// Versuche das Projekt aus der Datenbank zu laden
	// (hier müsste eigentlich eine Datenbankabfrage erfolgen)
	showNotification(
		"Diese Funktion wurde durch einen modernen Projektmanager ersetzt.",
		"info"
	);
}

/**
 * Importiert Einstellungen aus einer JSON-Datei
 */
function importSettingsFromJson(event) {
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

				// Einstellungen auf UI anwenden
				if (window.hangarUI && window.hangarUI.uiSettings) {
					window.hangarUI.uiSettings.tilesCount = settingsData.tilesCount || 8;
					window.hangarUI.uiSettings.secondaryTilesCount =
						settingsData.secondaryTilesCount || 0;
					window.hangarUI.uiSettings.layout = settingsData.layout || 4;

					// UI-Controls aktualisieren
					window.hangarUI.uiSettings.updateUIControls();

					// Kachelwerte anwenden, falls vorhanden
					if (
						settingsData.tileValues &&
						Array.isArray(settingsData.tileValues)
					) {
						window.hangarUI.uiSettings.applyTileValues(settingsData.tileValues);
					}

					// Einstellungen anwenden
					window.hangarUI.uiSettings.apply();

					showNotification("Einstellungen erfolgreich geladen", "success");
				}
			} catch (error) {
				console.error("Fehler beim Verarbeiten der Einstellungsdatei:", error);
				showNotification(`Einstellungen-Fehler: ${error.message}`, "error");
			}
		};

		reader.readAsText(file);

		// Input zurücksetzen
		event.target.value = "";
	} catch (error) {
		console.error("Fehler beim Importieren der Einstellungen:", error);
		showNotification(
			`Einstellungen-Import fehlgeschlagen: ${error.message}`,
			"error"
		);
	}
}

/**
 * Sucht nach einem Flugzeug in allen Kacheln
 * Mit verbessertem Teilstring-Matching und Groß-/Kleinschreibung wird ignoriert
 */
function searchAircraft() {
	console.log("Suchfunktion wird ausgeführt...");

	// Suchbegriff aus dem Eingabefeld holen
	const searchInputField = document.getElementById("searchAircraft");
	if (!searchInputField) {
		console.error("Suchfeld konnte nicht gefunden werden!");
		return;
	}

	const searchTerm = searchInputField.value.trim().toLowerCase();
	console.log(`Suche nach: "${searchTerm}"`);

	if (!searchTerm) {
		console.warn("Kein Suchbegriff eingegeben");
		showNotification("Bitte geben Sie einen Suchbegriff ein", "warning");
		return;
	}

	// Alle bestehenden Hervorhebungen zurücksetzen
	document.querySelectorAll(".hangar-cell").forEach((cell) => {
		cell.style.boxShadow = "";
	});

	let foundCount = 0;
	let firstFoundCell = null;
	let matchDetails = [];

	// Alle Kacheln durchsuchen mit detaillierter Protokollierung
	console.log("Durchsuche Kacheln...");
	document.querySelectorAll(".hangar-cell").forEach((cell, index) => {
		// Finde alle relevanten Felder in der Kachel
		const aircraftInput = cell.querySelector('input[id^="aircraft-"]');
		const manualInput = cell.querySelector('input[placeholder="Manual Input"]');
		const positionInput = cell.querySelector('input[id^="hangar-position-"]');

		// Texte extrahieren und normalisieren
		const aircraftText = aircraftInput ? aircraftInput.value.toLowerCase() : "";
		const manualText = manualInput ? manualInput.value.toLowerCase() : "";
		const positionText = positionInput ? positionInput.value.toLowerCase() : "";

		// Debugging: Zeige Inhalte der Felder
		console.log(`Kachel ${index + 1}:`, {
			aircraftText,
			manualText,
			positionText,
		});

		// Prüfen, ob der Suchbegriff in einem der Felder vorkommt
		let matched = false;
		let matchSource = "";

		if (aircraftText && aircraftText.includes(searchTerm)) {
			matched = true;
			matchSource = "Flugzeug-ID";
			console.log(
				`Treffer in Kachel ${index + 1} (Aircraft ID): ${aircraftText}`
			);
		}

		if (manualText && manualText.includes(searchTerm)) {
			matched = true;
			matchSource = matchSource
				? `${matchSource}, Manual Input`
				: "Manual Input";
			console.log(
				`Treffer in Kachel ${index + 1} (Manual Input): ${manualText}`
			);
		}

		if (positionText && positionText.includes(searchTerm)) {
			matched = true;
			matchSource = matchSource ? `${matchSource}, Position` : "Position";
			console.log(`Treffer in Kachel ${index + 1} (Position): ${positionText}`);
		}

		// Wenn Treffer gefunden, Kachel hervorheben
		if (matched) {
			// Einfache Hervorhebung nur mit Rahmen
			cell.classList.add("search-match-highlight");

			foundCount++;

			// Erste gefundene Kachel für Scrolling merken
			if (!firstFoundCell) {
				firstFoundCell = cell;
			}

			// Details zum Treffer für die Meldung sammeln
			matchDetails.push(matchSource);
		}
	});

	// CSS-Styles für die Hervorhebung hinzufügen, falls noch nicht vorhanden
	addSearchHighlightStyles();

	// Zum ersten Treffer scrollen, wenn vorhanden
	if (firstFoundCell) {
		console.log("Scrolle zur ersten Trefferkachel");
		firstFoundCell.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	// Eindeutiges Set von Match-Quellen erstellen
	const uniqueMatchSources = [...new Set(matchDetails)].join(", ");

	// Rückmeldung über Suchergebnis
	if (foundCount > 0) {
		const message = `${foundCount} Treffer für "${searchTerm}" in ${uniqueMatchSources}`;
		console.log(message);

		// Nach 2 Sekunden automatisch zurücksetzen
		setTimeout(() => {
			// Alle Hervorhebungen zurücksetzen
			document.querySelectorAll(".search-match-highlight").forEach((cell) => {
				cell.classList.remove("search-match-highlight", "search-pulse");
			});
		}, 2000);

		// Zusätzlich Benachrichtigung zeigen wenn verfügbar
		if (typeof window.showNotification === "function") {
			window.showNotification(message, "success");
		} else if (typeof showNotification === "function") {
			showNotification(message, "success");
		}
	} else {
		const message = `Keine Ergebnisse für "${searchTerm}"`;
		console.log(message);

		// Bei keinen Ergebnissen trotzdem Benachrichtigung zeigen wenn verfügbar
		if (typeof window.showNotification === "function") {
			window.showNotification(message, "warning");
		} else if (typeof showNotification === "function") {
			showNotification(message, "warning");
		}
	}
}

/**
 * Fügt Styles für die Suchhervorhebung hinzu, falls noch nicht vorhanden
 */
function addSearchHighlightStyles() {
	if (!document.getElementById("search-highlight-styles")) {
		const styleEl = document.createElement("style");
		styleEl.id = "search-highlight-styles";
		styleEl.textContent = `
			.search-match-highlight {
				box-shadow: 0 0 0 2px #EF8354 !important;
			}
		`;
		document.head.appendChild(styleEl);
	}
}

/**
 * Ruft Flugdaten ab und aktualisiert die UI
 * (Platzhalter für eine echte API-Integration)
 */
function fetchAndUpdateFlightData() {
	const fetchStatus = document.getElementById("fetchStatus");

	if (fetchStatus) {
		fetchStatus.textContent = "Flugdaten werden abgerufen...";
	}

	// Simuliere eine API-Anfrage
	setTimeout(() => {
		if (fetchStatus) {
			fetchStatus.textContent = "Flugdaten erfolgreich aktualisiert!";
		}

		// In einer echten Anwendung würden hier die Daten angewendet werden
		showNotification("Flugdaten wurden aktualisiert", "success");

		// Status nach einer Weile zurücksetzen
		setTimeout(() => {
			if (fetchStatus) {
				fetchStatus.textContent = "Bereit zum Abrufen von Flugdaten";
			}
		}, 5000);
	}, 1500);
}

/**
 * Handler für den "Flight Data Update" Button
 * Ruft die API auf, um Flugdaten zu erhalten
 */
function handleFlightDataFetch() {
	const searchAircraftInput = document.getElementById("searchAircraft");
	const aircraftId = searchAircraftInput.value.trim();

	// Wenn keine ID angegeben ist, alle Flugzeuge abfragen
	if (!aircraftId) {
		fetchAllAircraftData();
		return;
	}

	// Hervorhebung des Eingabefelds, wenn keine ID eingegeben wurde
	searchAircraftInput.classList.add("border-red-500");
	searchAircraftInput.classList.add("bg-red-50");
	setTimeout(() => {
		searchAircraftInput.classList.remove("border-red-500");
		searchAircraftInput.classList.remove("bg-red-50");
	}, 3000);

	// Direkt über AeroDataBoxAPI, da dieser laut Log der aktuelle Provider ist
	window.AeroDataBoxAPI.updateFetchStatus(
		"⚠️ Bitte Flugzeugkennung eingeben (z.B. D-AIZZ oder N12345)",
		true
	);

	// Fokus auf das Suchfeld setzen
	searchAircraftInput.focus();
}

/**
 * Sammelt alle Flugzeug-IDs und ruft Flugdaten für alle ab
 */
function fetchAllAircraftData() {
	try {
		const currentDateInput = document.getElementById("currentDateInput");
		const nextDateInput = document.getElementById("nextDateInput");
		const airportCodeInput = document.getElementById("airportCodeInput");

		const currentDate = currentDateInput?.value || formatDate(new Date());
		const nextDate =
			nextDateInput?.value ||
			formatDate(new Date(new Date().getTime() + 86400000)); // +1 Tag
		const airportCode = airportCodeInput?.value?.trim().toUpperCase() || "FRA";

		// Status aktualisieren
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.innerHTML = `<span class="animate-pulse">🔍 Sammle alle Flugzeug-IDs...</span>`;
		}

		// Alle Flugzeug-IDs sammeln
		const aircraftInputs = document.querySelectorAll('input[id^="aircraft-"]');
		let aircraftIds = [];

		aircraftInputs.forEach((input) => {
			const id = input.value.trim();
			if (id && !aircraftIds.includes(id)) {
				aircraftIds.push(id);
			}
		});

		if (aircraftIds.length === 0) {
			if (fetchStatus) {
				fetchStatus.innerHTML = `⚠️ Keine Flugzeug-IDs gefunden! Bitte tragen Sie zuerst Flugzeugkennungen ein.`;
			}
			return;
		}

		if (fetchStatus) {
			fetchStatus.innerHTML = `<span class="animate-pulse">🔄 Lade Flugdaten für ${aircraftIds.length} Flugzeuge...</span>`;
		}

		// Flugdaten für jedes Flugzeug abrufen und anwenden
		fetchAndApplyAllAircraftData(
			aircraftIds,
			currentDate,
			nextDate,
			airportCode
		);
	} catch (error) {
		console.error("Fehler beim Sammeln der Flugzeug-IDs:", error);
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.innerHTML = `❌ Fehler: ${
				error.message || "Unbekannter Fehler"
			}`;
		}
	}
}

/**
 * Ruft Flugdaten für alle Flugzeug-IDs ab und wendet sie an
 * @param {string[]} aircraftIds - Liste der Flugzeug-IDs
 * @param {string} currentDate - Aktuelles Datum
 * @param {string} nextDate - Nächstes Datum
 * @param {string} airportCode - IATA-Flughafencode
 */
async function fetchAndApplyAllAircraftData(
	aircraftIds,
	currentDate,
	nextDate,
	airportCode
) {
	try {
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.innerHTML = `<span class="animate-pulse">🔄 Lade Daten für ${aircraftIds.length} Flugzeuge...</span>`;
		}

		// Status für bessere Benutzererfahrung
		let processed = 0;
		const total = aircraftIds.length;
		const results = {
			success: 0,
			failed: 0,
		};

		// API-Anfragen sequentiell durchführen, um die API nicht zu überlasten
		for (const aircraftId of aircraftIds) {
			try {
				processed++;
				if (fetchStatus) {
					fetchStatus.innerHTML = `<span class="animate-pulse">✈️ Verarbeite ${aircraftId} (${processed}/${total})...</span>`;
				}

				// API-Fassade verwenden, falls verfügbar
				let flightData;
				if (window.FlightDataAPI) {
					flightData = await window.FlightDataAPI.getAircraftFlights(
						aircraftId,
						currentDate
					);
				} else if (window.AeroDataBoxAPI) {
					flightData = await window.AeroDataBoxAPI.getAircraftFlights(
						aircraftId,
						currentDate
					);
				} else {
					if (fetchStatus) {
						fetchStatus.innerHTML = "❌ Keine API für Flugdaten verfügbar";
					}
					continue;
				}

				// Daten auf alle Kacheln anwenden, die diese Flugzeug-ID haben
				const updated = updateAllInstancesOfAircraft(
					aircraftId,
					flightData,
					airportCode
				);
				if (updated) {
					results.success++;
				} else {
					results.failed++;
				}

				// Kleine Pause zwischen den Anfragen für bessere API-Performance
				await new Promise((resolve) => setTimeout(resolve, 500));
			} catch (error) {
				console.error(`Fehler bei ${aircraftId}:`, error);
				results.failed++;
				// Fehler für einzelne Flugzeuge werden geloggt, aber der Prozess wird fortgesetzt
			}
		}

		// Abschlussmeldung
		if (fetchStatus) {
			fetchStatus.innerHTML = `✅ Flugdaten aktualisiert: ${results.success} erfolgreich, ${results.failed} fehlgeschlagen`;
		}

		// Erfolg nach kurzem Delay zurücksetzen
		setTimeout(() => {
			if (fetchStatus) {
				fetchStatus.textContent = "Bereit zum Abrufen von Flugdaten";
			}
		}, 8000);
	} catch (error) {
		console.error("Fehler bei der Verarbeitung aller Flugzeug-IDs:", error);
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.innerHTML = `❌ Fehler: ${
				error.message || "Unbekannter Fehler"
			}`;
		}
	}
}

/**
 * Aktualisiert alle Kacheln, die eine bestimmte Flugzeug-ID haben
 * @param {string} aircraftId - Die Flugzeug-ID
 * @param {object} flightData - Die abgerufenen Flugdaten
 * @param {string} preferredAirport - Bevorzugter Flughafen (IATA-Code)
 * @returns {boolean} - true, wenn mindestens eine Kachel aktualisiert wurde
 */
function updateAllInstancesOfAircraft(
	aircraftId,
	flightData,
	preferredAirport
) {
	try {
		// Alle Kacheln mit dieser Flugzeug-ID finden
		const cells = document.querySelectorAll(".hangar-cell");
		let found = false;

		cells.forEach((cell) => {
			const aircraftInput = cell.querySelector(".aircraft-id");
			if (aircraftInput && aircraftInput.value.trim() === aircraftId) {
				found = true;

				// Zellen-ID bestimmen
				const cellId = aircraftInput.id.split("-")[1];

				// Flugdaten extrahieren und anwenden
				applyFlightDataToCell(cellId, flightData, preferredAirport);

				// Logging hinzufügen, um die Anwendung der Daten zu überprüfen
				console.log(
					`Flugdaten für ${aircraftId} auf Kachel ${cellId} angewendet`
				);
			}
		});

		if (!found) {
			console.log(`Keine Kachel mit Aircraft ID ${aircraftId} gefunden.`);
		}

		return found;
	} catch (error) {
		console.error(
			`Fehler beim Aktualisieren der Kacheln für ${aircraftId}:`,
			error
		);
		return false;
	}
}

/**
 * Wendet Flugdaten auf eine Kachel an
 * @param {string} cellId - ID der Kachel
 * @param {object} flightData - Die abgerufenen Flugdaten
 * @param {string} preferredAirport - Bevorzugter Flughafen (IATA-Code)
 */
function applyFlightDataToCell(cellId, flightData, preferredAirport) {
	try {
		// Standard-Werte falls keine Daten gefunden werden
		let departureTime = "--:--";
		let arrivalTime = "--:--";
		let originCode = "---";
		let destCode = "---";

		// Extrahieren der Flugdaten wenn vorhanden
		if (flightData && flightData.data && flightData.data.length > 0) {
			// Wenn wir mehrere Flüge haben, versuchen wir den passendsten zu finden
			// Priorisieren von Flügen mit dem bevorzugten Flughafen
			let flight = null;

			if (preferredAirport) {
				// Suche nach Flügen mit dem bevorzugten Flughafen
				flight = flightData.data.find((f) => {
					return (
						f.flightPoints &&
						f.flightPoints.some((point) => point.iataCode === preferredAirport)
					);
				});

				console.log(
					`Flug mit Flughafen ${preferredAirport} ${
						flight ? "gefunden" : "nicht gefunden"
					}`
				);
			}

			// Wenn kein passender Flug gefunden wurde, nehme den ersten
			if (!flight && flightData.data.length > 0) {
				flight = flightData.data[0];
				console.log(`Verwende ersten verfügbaren Flug`);
			}

			if (flight && flight.flightPoints && flight.flightPoints.length >= 2) {
				const departure = flight.flightPoints.find(
					(point) => point.departurePoint
				);
				const arrival = flight.flightPoints.find((point) => point.arrivalPoint);

				if (departure) {
					originCode = departure.iataCode || "---";
					if (
						departure.departure &&
						departure.departure.timings &&
						departure.departure.timings.length > 0
					) {
						const timeStr = departure.departure.timings[0].value;
						departureTime = timeStr.substring(0, 5);
					}
				}

				if (arrival) {
					destCode = arrival.iataCode || "---";
					if (
						arrival.arrival &&
						arrival.arrival.timings &&
						arrival.arrival.timings.length > 0
					) {
						const timeStr = arrival.arrival.timings[0].value;
						arrivalTime = timeStr.substring(0, 5);
					}
				}

				// Überprüfen, ob der bevorzugte Flughafen enthalten ist
				if (preferredAirport) {
					const hasPreferredAirport =
						originCode === preferredAirport || destCode === preferredAirport;
					console.log(
						`Flug enthält bevorzugten Flughafen ${preferredAirport}: ${hasPreferredAirport}`
					);
				}
			}
		}

		// UI-Elemente aktualisieren
		const arrivalTimeEl = document.getElementById(`arrival-time-${cellId}`);
		const departureTimeEl = document.getElementById(`departure-time-${cellId}`);
		const positionEl = document.getElementById(`position-${cellId}`);

		if (arrivalTimeEl) arrivalTimeEl.textContent = arrivalTime;
		if (departureTimeEl) departureTimeEl.textContent = departureTime;
		if (positionEl) positionEl.textContent = `${originCode}→${destCode}`;

		// Tow-Status aktualisieren basierend auf Flugdaten
		updateTowStatus(cellId, departureTime);

		console.log(
			`Kachel ${cellId} mit Flugdaten aktualisiert: ${originCode}→${destCode}, Abflug: ${departureTime}, Ankunft: ${arrivalTime}`
		);

		return true;
	} catch (error) {
		console.error(
			`Fehler beim Anwenden der Flugdaten auf Kachel ${cellId}:`,
			error
		);
		return false;
	}
}

/**
 * Aktualisiert den Tow-Status basierend auf der Abflugzeit
 * @param {string} cellId - ID der Kachel
 * @param {string} departureTime - Abflugzeit im Format "HH:MM"
 */
function updateTowStatus(cellId, departureTime) {
	try {
		const towStatus = document.getElementById(`tow-status-${cellId}`);
		if (!towStatus) return;

		// Bestimme den Status basierend auf der Abflugzeit
		let status;
		let label;

		if (departureTime === "--:--") {
			// Wenn keine Abflugzeit verfügbar ist, zufälligen Status verwenden
			const statuses = ["tow-initiated", "tow-ongoing", "tow-on-position"];
			const labels = ["Initiated", "In Progress", "On Position"];
			const randomIndex = Math.floor(Math.random() * statuses.length);
			status = statuses[randomIndex];
			label = labels[randomIndex];
		} else {
			// Aktuelle Zeit und Abflugzeit für Vergleich vorbereiten
			const now = new Date();
			const [hours, minutes] = departureTime.split(":").map(Number);
			const departureDate = new Date();
			departureDate.setHours(hours, minutes, 0);

			// Zeitdifferenz in Minuten
			const diffMinutes = Math.floor((departureDate - now) / (1000 * 60));

			// Status basierend auf Zeitdifferenz
			if (diffMinutes < -15) {
				// Abflug verpasst oder bereits erfolgt
				status = "tow-on-position";
				label = "Departed";
			} else if (diffMinutes < 45) {
				// Weniger als 45 Minuten bis zum Abflug: an Position
				status = "tow-on-position";
				label = "On Position";
			} else if (diffMinutes < 90) {
				// Weniger als 90 Minuten: unterwegs zur Position
				status = "tow-ongoing";
				label = "In Progress";
			} else {
				// Noch lange Zeit bis zum Abflug
				status = "tow-initiated";
				label = "Initiated";
			}
		}

		// Status anwenden
		towStatus.className = `tow-status ${status}`;
		towStatus.textContent = label;
	} catch (error) {
		console.error(
			`Fehler beim Aktualisieren des Tow-Status für Kachel ${cellId}:`,
			error
		);
	}
}

/**
 * Aktualisiert die Flugzeuginformationen in einer Kachel mit den abgerufenen Flugdaten
 */
function updateAircraftInfoWithFlightData(aircraftId, flightData) {
	// Suchen des Elements mit der Aircraft-ID
	const cells = document.querySelectorAll(".hangar-cell");
	let foundCell = null;

	cells.forEach((cell) => {
		const aircraftInput = cell.querySelector(".aircraft-id");
		if (aircraftInput && aircraftInput.value === aircraftId) {
			foundCell = cell;
		}
	});

	if (!foundCell) {
		window.AeroDataBoxAPI.updateFetchStatus(
			`Keine Kachel mit Aircraft ID ${aircraftId} gefunden.`,
			true
		);
		return;
	}

	// Extrahieren der Flugdaten
	if (flightData && flightData.data && flightData.data.length > 0) {
		const flight = flightData.data[0];
		const cellId = foundCell.querySelector(".aircraft-id").id.split("-")[1];

		// Extrahieren der Flugzeiten
		let departureTime = "--:--";
		let arrivalTime = "--:--";
		let originCode = "---";
		let destCode = "---";

		if (flight.flightPoints && flight.flightPoints.length >= 2) {
			const departure = flight.flightPoints.find(
				(point) => point.departurePoint
			);
			const arrival = flight.flightPoints.find((point) => point.arrivalPoint);

			if (departure) {
				originCode = departure.iataCode || "---";
				if (
					departure.departure &&
					departure.departure.timings &&
					departure.departure.timings.length > 0
				) {
					const timeStr = departure.departure.timings[0].value;
					departureTime = timeStr.substring(0, 5); // HH:MM Format
				}
			}

			if (arrival) {
				destCode = arrival.iataCode || "---";
				if (
					arrival.arrival &&
					arrival.arrival.timings &&
					arrival.arrival.timings.length > 0
				) {
					const timeStr = arrival.arrival.timings[0].value;
					arrivalTime = timeStr.substring(0, 5); // HH:MM Format
				}
			}
		}

		// Aktualisieren der UI-Elemente mit den Flugdaten
		document.getElementById(`arrival-time-${cellId}`).textContent = arrivalTime;
		document.getElementById(`departure-time-${cellId}`).textContent =
			departureTime;
		document.getElementById(
			`position-${cellId}`
		).textContent = `${originCode}→${destCode}`;

		// Aktualisieren des Tow-Status (zufällig für Demozwecke)
		const towStatus = document.getElementById(`tow-status-${cellId}`);
		const statuses = ["tow-initiated", "tow-ongoing", "tow-on-position"];
		const statusLabels = ["Initiated", "In Progress", "On Position"];
		const randomIndex = Math.floor(Math.random() * statuses.length);

		towStatus.className = `tow-status ${statuses[randomIndex]}`;
		towStatus.textContent = statusLabels[randomIndex];

		window.AeroDataBoxAPI.updateFetchStatus(
			`Flugdaten für ${aircraftId} wurden erfolgreich aktualisiert`,
			false
		);
	} else {
		window.AeroDataBoxAPI.updateFetchStatus(
			`Keine Flugdaten für ${aircraftId} verfügbar.`,
			true
		);
	}
}

/**
 * Hilfsfunktion zur Formatierung eines Datums im Format YYYY-MM-DD
 */
function formatDate(date) {
	const d = new Date(date);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	const year = d.getFullYear();
	return `${year}-${month}-${day}`;
}

/**
 * Richtet die Ereignisbehandler für die Flugdatenabfrage ein
 */
function setupFlightDataEventHandlers() {
	// Fetch Flight Button Event Listener
	const fetchFlightBtn = document.getElementById("fetchFlightData");
	if (fetchFlightBtn) {
		// Event-Listener entfernen, falls bereits vorhanden
		const oldClickHandler = fetchFlightBtn.onclick;
		if (oldClickHandler)
			fetchFlightBtn.removeEventListener("click", oldClickHandler);

		// Neuen Event-Handler hinzufügen, der die API-Fassade verwendet
		fetchFlightBtn.onclick = async () => {
			// Eingabewerte sammeln
			const currentDateInput = document.getElementById("currentDateInput");
			const nextDateInput = document.getElementById("nextDateInput");

			// Flugzeugkennung aus dem Suchfeld oder ausgewählter Kachel holen
			let searchInput = document.getElementById("searchAircraft");
			let aircraftId = searchInput?.value?.trim();

			// Wenn keine ID im Suchfeld, dann in ausgewählter Kachel suchen
			if (!aircraftId) {
				const selectedCell = document.querySelector(".hangar-cell.selected");
				if (selectedCell) {
					const cellId = selectedCell.getAttribute("data-cell-id");
					if (cellId) {
						const aircraftInput = document.getElementById(`aircraft-${cellId}`);
						if (aircraftInput && aircraftInput.value.trim()) {
							aircraftId = aircraftInput.value.trim();
							console.log(
								`Verwende Flugzeug-ID aus ausgewählter Kachel: ${aircraftId}`
							);
						}
					}
				}
			}

			const currentDate = currentDateInput?.value;
			const nextDate = nextDateInput?.value;

			console.log(
				`API-Fassade wird verwendet für Flugdatenabruf: ${aircraftId}`
			);

			// Flugdaten über die API-Fassade abrufen
			if (window.FlightDataAPI) {
				await window.FlightDataAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
			} else {
				console.error("API-Fassade nicht verfügbar");
				// Fallback auf direkte API-Aufrufe
				if (window.AeroDataBoxAPI) {
					await window.AeroDataBoxAPI.updateAircraftData(
						aircraftId,
						currentDate,
						nextDate
					);
				} else if (window.AmadeusAPI) {
					await window.AmadeusAPI.updateAircraftData(
						aircraftId,
						currentDate,
						nextDate
					);
				}
			}
		};

		console.log("Flight Data Button mit API-Fassade verbunden");
	}

	// Verbindung zwischen Suchbutton und Flugdatenabruf herstellen
	const searchBtn = document.getElementById("btnSearch");
	if (searchBtn) {
		searchBtn.removeEventListener("click", searchButtonHandler);
		searchBtn.addEventListener("click", searchButtonHandler);
	}

	// Eingabefeld für Flugzeugsuche mit Enter-Taste verbinden
	const searchInput = document.getElementById("searchAircraft");
	if (searchInput) {
		searchInput.removeEventListener("keypress", searchInputKeyHandler);
		searchInput.addEventListener("keypress", searchInputKeyHandler);
	}
}

/**
 * Event-Handler für den 'Flugdaten abrufen'-Button
 */
async function fetchFlightButtonHandler() {
	// Eingabewerte sammeln
	const currentDateInput = document.getElementById("currentDateInput");
	const nextDateInput = document.getElementById("nextDateInput");

	// Zuerst im dedizierten Suchfeld suchen
	let searchInput = document.getElementById("searchAircraft");
	let aircraftId = searchInput?.value?.trim();

	// Wenn keine ID im Suchfeld gefunden wurde, suche nach einer aktiv ausgewählten Kachel
	if (!aircraftId) {
		const selectedCell = document.querySelector(".hangar-cell.selected");
		if (selectedCell) {
			const cellId = selectedCell.getAttribute("data-cell-id");
			if (cellId) {
				const aircraftInput = document.getElementById(`aircraft-${cellId}`);
				if (aircraftInput && aircraftInput.value.trim()) {
					aircraftId = aircraftInput.value.trim();
					console.log(
						`Verwende Flugzeug-ID aus ausgewählter Kachel: ${aircraftId}`
					);
				}
			}
		}
	}

	const currentDate = currentDateInput?.value;
	const nextDate = nextDateInput?.value;

	console.log(`Rufe Flugdaten mit API-Fassade ab für: ${aircraftId}`);

	// API-Fassade für alle API-Aufrufe verwenden
	if (window.FlightDataAPI) {
		await window.FlightDataAPI.updateAircraftData(
			aircraftId,
			currentDate,
			nextDate
		);
	} else {
		console.error("API-Fassade nicht verfügbar");
		// Fallback auf direkte API-Aufrufe nur wenn nötig
		if (window.AeroDataBoxAPI) {
			await window.AeroDataBoxAPI.updateAircraftData(
				aircraftId,
				currentDate,
				nextDate
			);
		} else if (window.AmadeusAPI) {
			await window.AmadeusAPI.updateAircraftData(
				aircraftId,
				currentDate,
				nextDate
			);
		} else {
			alert("Keine Flight Data API verfügbar");
		}
	}
}

/**
 * Event-Handler für den Such-Button
 */
function searchButtonHandler() {
	const searchInput = document.getElementById("searchAircraft");
	if (searchInput && searchInput.value.trim()) {
		// Löse den Flugdaten-Button aus
		const fetchFlightBtn = document.getElementById("fetchFlightData");
		if (fetchFlightBtn) {
			console.log("Suche nach Flugdaten für: " + searchInput.value.trim());
			fetchFlightButtonHandler(); // Direkter Aufruf des Handlers statt Click-Event
		}
	}
}

/**
 * Event-Handler für die Eingabetaste im Suchfeld
 */
function searchInputKeyHandler(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		searchButtonHandler(); // Direkter Aufruf des Such-Handlers
	}
}

/**
 * Initialisiert das Akkordeon-Verhalten für die Sidebar
 */
function initSidebarAccordion() {
	// Finde alle Akkordeon-Header
	const accordionHeaders = document.querySelectorAll(
		".sidebar-accordion-header"
	);

	console.log(`${accordionHeaders.length} Akkordeon-Header gefunden`);

	// Für jeden Header die Funktionalität initialisieren
	accordionHeaders.forEach((header, index) => {
		// Standardmäßig das erste Element öffnen, Rest schließen
		if (index !== 0) {
			header.classList.add("collapsed");
			const content = header.nextElementSibling;
			if (content && content.classList.contains("sidebar-accordion-content")) {
				content.classList.remove("open");
			}
		} else {
			header.classList.remove("collapsed");
			const content = header.nextElementSibling;
			if (content && content.classList.contains("sidebar-accordion-content")) {
				content.classList.add("open");
			}
		}

		// Alten Event-Handler entfernen, falls vorhanden
		if (header._clickHandler) {
			header.removeEventListener("click", header._clickHandler);
		}

		// Neuen Event-Handler definieren
		header._clickHandler = function () {
			// Akkordeon umschalten
			this.classList.toggle("collapsed");

			// Content-Element finden und Klasse umschalten
			const content = this.nextElementSibling;
			if (content && content.classList.contains("sidebar-accordion-content")) {
				content.classList.toggle("open");
			}
		};

		// Event-Listener hinzufügen
		header.addEventListener("click", header._clickHandler);

		// Sicherstellen, dass die Icon-Ausrichtung korrekt ist
		const iconContainer = header.querySelector(".sidebar-header-content");
		if (iconContainer) {
			iconContainer.style.display = "flex";
			iconContainer.style.alignItems = "center";

			const icon = iconContainer.querySelector(".sidebar-icon");
			const title = iconContainer.querySelector(".sidebar-section-title");

			if (icon && title) {
				icon.style.marginRight = "8px";
				icon.style.display = "inline-block";
				title.style.display = "inline-block";
			}
		}
	});

	console.log("Sidebar-Akkordeon erfolgreich initialisiert");
}

// Exportiere Funktionen als globales Objekt
window.hangarEvents = {
	setupUIEventListeners,
	toggleEditMode,
	toggleSidebar,
	showLoadDialog,
	hideLoadDialog,
	hideEmailSentModal,
	loadProjectByName,
	importSettingsFromJson,
	searchAircraft,
	fetchAndUpdateFlightData,
	initSidebarAccordion,
	initializeSidebarToggle, // Neue Funktion exportieren
};

// Funktion zum globalen Namensraum hinzufügen
window.initializeUI = initializeUI;

// Event-Handler initialisieren, wenn das DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
	// Die bisherigen Event-Handler-Aufrufe entfernen, da sie doppelt definiert sind

	// Initialisiere die Sidebar-Akkordeons
	initSidebarAccordion();

	console.log("Sidebar-Akkordeon initialisiert");
});

/**
 * Initialisiert das Akkordeon-Verhalten für die Sidebar
 */
function initSidebarAccordion() {
	// Finde alle Akkordeon-Header
	const accordionHeaders = document.querySelectorAll(
		".sidebar-accordion-header"
	);

	console.log(`${accordionHeaders.length} Akkordeon-Header gefunden`);

	// Für jeden Header die Funktionalität initialisieren
	accordionHeaders.forEach((header, index) => {
		// Standardmäßig das erste Element öffnen, Rest schließen
		if (index !== 0) {
			header.classList.add("collapsed");
			const content = header.nextElementSibling;
			if (content && content.classList.contains("sidebar-accordion-content")) {
				content.classList.remove("open");
			}
		} else {
			header.classList.remove("collapsed");
			const content = header.nextElementSibling;
			if (content && content.classList.contains("sidebar-accordion-content")) {
				content.classList.add("open");
			}
		}

		// Alten Event-Handler entfernen, falls vorhanden
		if (header._clickHandler) {
			header.removeEventListener("click", header._clickHandler);
		}

		// Neuen Event-Handler definieren
		header._clickHandler = function () {
			// Akkordeon umschalten
			this.classList.toggle("collapsed");

			// Content-Element finden und Klasse umschalten
			const content = this.nextElementSibling;
			if (content && content.classList.contains("sidebar-accordion-content")) {
				content.classList.toggle("open");
			}
		};

		// Event-Listener hinzufügen
		header.addEventListener("click", header._clickHandler);

		// Sicherstellen, dass die Icon-Ausrichtung korrekt ist
		const iconContainer = header.querySelector(".sidebar-header-content");
		if (iconContainer) {
			iconContainer.style.display = "flex";
			iconContainer.style.alignItems = "center";

			const icon = iconContainer.querySelector(".sidebar-icon");
			const title = iconContainer.querySelector(".sidebar-section-title");

			if (icon && title) {
				icon.style.marginRight = "8px";
				icon.style.display = "inline-block";
				title.style.display = "inline-block";
			}
		}
	});

	console.log("Sidebar-Akkordeon erfolgreich initialisiert");
}

// DOM Content Loaded Event - hier setzen wir das neue Akkordeon-Verhalten
document.addEventListener("DOMContentLoaded", function () {
	// Initialisieren der Event-Listener
	setupUIEventListeners();

	// Initialisiere die Seitenleiste und den Toggle-Button
	initializeSidebarToggle();

	// Initialisiere das verbesserte Akkordeon-Menü
	initSidebarAccordion();

	// Weitere Initialisierungen
	if (
		typeof window.hangarUI !== "undefined" &&
		typeof window.hangarUI.initSectionLayout === "function"
	) {
		window.hangarUI.initSectionLayout();
	}

	console.log("Verbesserte UI-Initialisierung abgeschlossen");
});

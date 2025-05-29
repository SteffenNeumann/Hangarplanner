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
				window.hangarData.saveProjectToDatabase();
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
				searchAircraft();
			});
		}

		// Enter-Taste in Suchfeld
		const searchAircraft = document.getElementById("searchAircraft");
		if (searchAircraft) {
			searchAircraft.addEventListener("keyup", function (event) {
				if (event.key === "Enter") {
					searchAircraft();
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

		console.log("Alle Event-Listener erfolgreich eingerichtet");
		return true;
	} catch (error) {
		console.error("Fehler beim Einrichten der Event-Listener:", error);
		return false;
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
	document.body.classList.toggle("sidebar-collapsed");
	const sidebarMenu = document.getElementById("sidebarMenu");

	if (sidebarMenu) {
		sidebarMenu.classList.toggle("collapsed");
	}

	// Skalierung neu berechnen nach Menü-Toggle
	setTimeout(window.hangarUI.adjustScaling, 300);
}

/**
 * Zeigt den Dialog zum Laden eines Projekts
 */
function showLoadDialog() {
	// Wenn ein Projektmanager existiert, diesen verwenden
	if (window.projectManager) {
		window.projectManager.showProjectManager();
	} else {
		// Fallback zum klassischen Load-Dialog
		const loadModal = document.getElementById("loadModal");
		if (loadModal) {
			loadModal.classList.remove("hidden");
		}
	}
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
 */
function searchAircraft() {
	const searchTerm = document
		.getElementById("searchAircraft")
		.value.trim()
		.toLowerCase();

	if (!searchTerm) {
		showNotification("Bitte geben Sie eine Suchbegriff ein", "warning");
		return;
	}

	let found = false;

	// Alle Kacheln durchsuchen
	document.querySelectorAll(".hangar-cell").forEach((cell) => {
		// Standardmäßig keine Hervorhebung
		cell.style.boxShadow = "";

		// Finde alle relevanten Felder in der Kachel
		const aircraftInput = cell.querySelector('input[id^="aircraft-"]');
		const manualInput = cell.querySelector('input[placeholder="Manual Input"]');
		const positionInput = cell.querySelector('input[id^="hangar-position-"]');

		// Texte extrahieren und normalisieren
		const aircraftText = aircraftInput ? aircraftInput.value.toLowerCase() : "";
		const manualText = manualInput ? manualInput.value.toLowerCase() : "";
		const positionText = positionInput ? positionInput.value.toLowerCase() : "";

		// Prüfen, ob der Suchbegriff in einem der Felder vorkommt
		if (
			aircraftText.includes(searchTerm) ||
			manualText.includes(searchTerm) ||
			positionText.includes(searchTerm)
		) {
			// Treffer hervorheben
			cell.style.boxShadow =
				"0 0 0 4px #EF8354, 0 0 16px rgba(239, 131, 84, 0.6)";
			found = true;

			// Scroll zur gefundenen Kachel
			cell.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	});

	// Rückmeldung über Suchergebnis
	if (found) {
		showNotification(`Flugzeug "${searchTerm}" gefunden!`, "success");
	} else {
		showNotification(`Keine Ergebnisse für "${searchTerm}"`, "warning");
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
};

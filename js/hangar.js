/**
 * hangar.js
 * Hauptdatei für die HangarPlanner-Anwendung
 * Initialisiert die Anwendung und importiert die anderen Module
 */

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

	// Dateipfad-Konfiguration für die Anwendung
	const filePaths = {
		// Basis-Ordner für die App
		baseDir: "HangarPlanner",

		// Unterordner für Projektdaten
		dataDir: "Projects",

		// Unterordner für Einstellungen
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

	// Stellt sicher, dass alle benötigten Module geladen sind
	function waitForModules(callback) {
		const requiredModules = [
			"hangarUI",
			"hangarData",
			"hangarEvents",
			"hangarPDF",
		];

		const checkModules = () => {
			const allLoaded = requiredModules.every(
				(module) => window[module] !== undefined
			);
			if (allLoaded) {
				debug("Alle Module geladen");
				callback();
			} else {
				debug(
					"Warte auf Module: " +
						requiredModules.filter((m) => !window[m]).join(", ")
				);
				setTimeout(checkModules, 50);
			}
		};

		checkModules();
	}

	// Initialisiert die Anwendung, nachdem alle Module geladen wurden
	function initializeApplication() {
		try {
			debug("Initialisiere Anwendung");

			// UI initialisieren
			if (
				typeof window.hangarUI !== "undefined" &&
				typeof window.hangarUI.uiSettings !== "undefined" &&
				typeof initializeUI === "function"
			) {
				initializeUI();
			}

			// Event-Listener einrichten
			if (
				typeof window.hangarEvents !== "undefined" &&
				typeof window.hangarEvents.setupUIEventListeners === "function"
			) {
				window.hangarEvents.setupUIEventListeners();
			}

			// Status-Handler initialisieren
			if (
				typeof window.hangarUI !== "undefined" &&
				typeof initStatusHandlers === "function"
			) {
				initStatusHandlers();
			}

			debug("Anwendung erfolgreich initialisiert");
		} catch (error) {
			console.error("Fehler bei der Initialisierung der Anwendung:", error);
		}
	}

	/**
	 * Initialisiert die UI
	 */
	function initializeUI() {
		try {
			// Automatischer Dateiname aus Datum/Zeit generieren
			if (window.hangarUI.checkElement("projectName")) {
				document.getElementById("projectName").value =
					window.hangarData.generateTimestamp();
			}

			// Gespeicherte Einstellungen laden und anwenden
			(async function () {
				try {
					await window.hangarUI.uiSettings.load();
					window.hangarUI.uiSettings.apply();
				} catch (error) {
					console.error("Fehler beim Laden der Einstellungen:", error);
				}
			})();

			// Dateidialog-Modus immer aktivieren und prüfen ob unterstützt wird
			const isFileSystemAPISupported = "showSaveFilePicker" in window;
			console.log(
				`File System Access API wird ${
					isFileSystemAPISupported ? "" : "NICHT "
				}unterstützt`
			);

			// Den lokalen Speicher aktualisieren mit dem Support-Status
			localStorage.setItem(
				"useFileSystemAccess",
				isFileSystemAPISupported.toString()
			);

			// Zeige eine Benachrichtigung über den API-Support-Status
			if (!isFileSystemAPISupported) {
				window.showNotification(
					"Ihr Browser unterstützt nicht die File System Access API. Es wird ein Standard-Download verwendet.",
					"warning",
					5000
				);
			}

			// Letzter Zustand des Menüs wiederherstellen oder standardmäßig einblenden
			const sidebarCollapsed =
				localStorage.getItem("sidebarCollapsed") === "true";
			if (sidebarCollapsed) {
				document.body.classList.add("sidebar-collapsed");
				const menuToggle = document.getElementById("menuToggle");
				if (menuToggle && menuToggle.querySelector("span")) {
					menuToggle.querySelector("span").textContent = "«";
				}
			} else {
				document.body.classList.remove("sidebar-collapsed");
				const menuToggle = document.getElementById("menuToggle");
				if (menuToggle && menuToggle.querySelector("span")) {
					menuToggle.querySelector("span").textContent = "»";
				}
			}

			// Initial die Skalierung anpassen
			window.hangarUI.adjustScaling();

			// Event-Listener für Fenstergrößenänderungen
			window.addEventListener("resize", window.hangarUI.adjustScaling);

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

			return true;
		} catch (error) {
			console.error("Fehler bei UI-Initialisierung:", error);
			return false;
		}
	}

	/**
	 * Initialisiert Status-Handler für alle Kacheln
	 */
	function initStatusHandlers() {
		// Primäre Kacheln
		document
			.querySelectorAll('#hangarGrid select[id^="status-"]')
			.forEach((select) => {
				const cellId = parseInt(select.id.split("-")[1]);
				select.onchange = function () {
					window.hangarUI.updateStatusLights(cellId);
				};

				// Initialen Status setzen
				window.hangarUI.updateStatusLights(cellId);
			});

		// Sekundäre Kacheln
		document
			.querySelectorAll('#secondaryHangarGrid select[id^="status-"]')
			.forEach((select) => {
				const cellId = parseInt(select.id.split("-")[1]);
				select.onchange = function () {
					window.hangarUI.updateStatusLights(cellId);
				};

				// Initialen Status setzen
				window.hangarUI.updateStatusLights(cellId);
			});
	}

	// Warten auf Module und dann App initialisieren
	waitForModules(initializeApplication);
});

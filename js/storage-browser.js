/**
 * Datei-Browser für gespeicherte Dateien im OPFS-Speicher
 */

class StorageBrowser {
	constructor() {
		this.containerElement = null;
		this.fileListElement = null;
	}

	/**
	 * Aktualisiert die UI-Elemente basierend auf den aktuellen Hangar-Daten
	 * @private
	 */
	updateUIElements() {
		console.log("Aktualisiere UI-Elemente...");

		try {
			// 1. Aktualisiere primäre Kacheln
			if (window.hangarData && window.hangarData.positions) {
				// Primäre Positionen aktualisieren
				Object.keys(window.hangarData.positions).forEach((positionKey) => {
					const positionValue = window.hangarData.positions[positionKey];
					const positionInput = document.getElementById(
						`hangar-position-${positionKey}`
					);

					if (positionInput && positionInput.value !== positionValue) {
						console.log(
							`Aktualisiere Position ${positionKey} auf ${positionValue}`
						);
						positionInput.value = positionValue;

						// Löse ein Change-Event aus, damit event-Handler reagieren können
						const event = new Event("change", { bubbles: true });
						positionInput.dispatchEvent(event);
					}
				});

				// 2. Aktualisiere Aircraft-IDs wenn vorhanden
				if (window.hangarData.aircraft) {
					Object.keys(window.hangarData.aircraft).forEach((aircraftKey) => {
						const aircraftValue = window.hangarData.aircraft[aircraftKey];
						const aircraftInput = document.getElementById(
							`aircraft-id-${aircraftKey}`
						);

						if (aircraftInput && aircraftInput.value !== aircraftValue) {
							console.log(
								`Aktualisiere Aircraft ${aircraftKey} auf ${aircraftValue}`
							);
							aircraftInput.value = aircraftValue;

							// Löse ein Change-Event aus
							const event = new Event("change", { bubbles: true });
							aircraftInput.dispatchEvent(event);
						}
					});
				}

				// 3. Aktualisiere sekundäre Kacheln
				for (let i = 101; i <= 104; i++) {
					const posInput = document.getElementById(`hangar-position-${i}`);
					const acInput = document.getElementById(`aircraft-id-${i}`);

					if (window.hangarData.positions[i] && posInput) {
						console.log(
							`Setze sekundäre Position ${i} auf ${window.hangarData.positions[i]}`
						);
						posInput.value = window.hangarData.positions[i];

						const event = new Event("change", { bubbles: true });
						posInput.dispatchEvent(event);
					}

					if (window.hangarData.aircraft[i] && acInput) {
						console.log(
							`Setze sekundäre Aircraft ${i} auf ${window.hangarData.aircraft[i]}`
						);
						acInput.value = window.hangarData.aircraft[i];

						const event = new Event("change", { bubbles: true });
						acInput.dispatchEvent(event);
					}
				}
			}

			// 4. Auslösen eines Event für die Gesamtaktualisierung
			document.dispatchEvent(new CustomEvent("uiDataRefreshed"));
			console.log("UI-Elemente wurden aktualisiert");
			return true;
		} catch (error) {
			console.error("Fehler bei der UI-Aktualisierung:", error);
			return false;
		}
	}

	/**
	 * Stellt eine Synchronisationsfunktion bereit und registriert sie bei window.hangarData,
	 * falls diese nicht vorhanden ist
	 * @private
	 */
	ensureApplyFunction() {
		if (window.hangarData) {
			// Prüfe ob die Funktion fehlt und stelle sie bereit falls nötig
			if (typeof window.hangarData.applyLoadedHangarPlan !== "function") {
				console.log("applyLoadedHangarPlan-Funktion wird erstellt");
				window.hangarData.applyLoadedHangarPlan = (projectData) => {
					console.log("Wende geladene Daten auf Anwendung an...");

					try {
						// Positions- und Aircraft-Daten übernehmen
						if (projectData.positions) {
							window.hangarData.positions = projectData.positions;
							console.log("Positionsdaten übernommen");
						}

						if (projectData.aircraft) {
							window.hangarData.aircraft = projectData.aircraft;
							console.log("Aircraft-Daten übernommen");
						}

						if (projectData.settings) {
							window.hangarData.settings = projectData.settings;
							console.log("Einstellungen übernommen");
						}

						// UI aktualisieren falls möglich
						if (typeof window.updateUIFromData === "function") {
							window.updateUIFromData(projectData);
							console.log("UI mit neuen Daten aktualisiert");
						} else {
							// Versuche die Aktualisierungsfunktion zu finden
							if (
								typeof window.hangarUI !== "undefined" &&
								typeof window.hangarUI.apply === "function"
							) {
								window.hangarUI.apply(projectData);
								console.log("UI über hangarUI.apply aktualisiert");
							} else {
								// Neue UI-Aktualisierung verwenden
								this.updateUIElements();
								console.log(
									"UI über StorageBrowser.updateUIElements aktualisiert"
								);
							}
						}

						// Ereignis auslösen, um andere Komponenten zu informieren
						const event = new CustomEvent("projectDataChanged", {
							detail: projectData,
						});
						document.dispatchEvent(event);

						return true;
					} catch (error) {
						console.error("Fehler beim Anwenden der Projektdaten:", error);
						return false;
					}
				};
				console.log("applyLoadedHangarPlan-Funktion erstellt und registriert");
			} else {
				console.log("applyLoadedHangarPlan-Funktion bereits vorhanden");
			}
		} else {
			console.warn(
				"hangarData-Objekt nicht verfügbar, kann Funktion nicht registrieren"
			);
		}
	}

	/**
	 * Aktiviert die erweiterte Browser-übergreifende Synchronisierung
	 * @param {boolean} activate - Aktiviert die erweiterte Sync-Funktion
	 */
	enableCrossBrowserSync(activate = true) {
		// Stoppe bestehende Synchronisation falls vorhanden
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
			console.log("Bestehende Cross-Browser-Synchronisation gestoppt");
		}

		if (!activate) return;

		// Synchronisationsschlüssel für localStorage
		const syncKey = "hangarplanner_sync_flag";

		// Setze initiale Sync-Flagge
		localStorage.setItem(syncKey, Date.now().toString());

		// Prüfe regelmäßig auf Änderungen
		this.syncInterval = setInterval(() => {
			try {
				const lastSyncTime = localStorage.getItem(syncKey);
				const availableProjects =
					window.fileManager.listProjectsInFixedLocation();

				availableProjects
					.then((projects) => {
						if (projects && projects.length > 0) {
							// Neues Projekt seit letzter Synchronisierung
							const projectName = projects[0];

							// Versuche das Projekt zu laden
							window.fileManager
								.loadProjectFromFixedLocation(projectName)
								.then((projectData) => {
									if (
										projectData &&
										projectData.metadata &&
										projectData.metadata.lastSaved
									) {
										// Aktualisiere Sync-Flagge nur wenn neue Daten geladen wurden
										localStorage.setItem(syncKey, Date.now().toString());

										// Wende die Daten auf die aktuelle Anwendung an
										this.ensureApplyFunction();

										if (
											window.hangarData &&
											typeof window.hangarData.applyLoadedHangarPlan ===
												"function"
										) {
											window.hangarData.applyLoadedHangarPlan(projectData);

											// Sicherstellen, dass die UI aktualisiert wird
											setTimeout(() => this.updateUIElements(), 500);

											console.log(
												`Projekt "${projectName}" erfolgreich synchronisiert`
											);

											if (window.showNotification) {
												window.showNotification(
													`Projekt "${projectName}" synchronisiert`,
													"success"
												);
											}
										}
									}
								})
								.catch((error) => {
									console.error("Fehler beim Laden des Projekts:", error);
								});
						}
					})
					.catch((error) => {
						console.error("Fehler beim Auflisten der Projekte:", error);
					});
			} catch (error) {
				console.error("Fehler bei der Cross-Browser-Synchronisation:", error);
			}
		}, 5000); // Alle 5 Sekunden prüfen

		console.log("Cross-Browser-Synchronisation aktiviert");
	}

	/**
	 * Ermöglicht die Synchronisation über einen Webserver
	 * Verbessert mit einfacherem JSON-basierten Ansatz
	 * @param {boolean} activate - Aktiviert die Server-Synchronisation
	 * @param {string} serverUrl - URL zum Server-Endpunkt (z.B. "https://example.com/sync/data.json")
	 */
	enableServerSync(activate = true, serverUrl = "") {
		if (this.serverSyncInterval) {
			clearInterval(this.serverSyncInterval);
			this.serverSyncInterval = null;
			console.log("Server-Synchronisation gestoppt");
		}

		if (!activate || !serverUrl) return;

		// Konfiguration speichern
		this.serverSyncUrl = serverUrl;

		// Synchronisations-Schlüssel
		const syncKey = "hangarplanner_server_sync";

		// Funktion zum Herunterladen der Daten
		const downloadData = async () => {
			try {
				const lastSync = localStorage.getItem(syncKey) || "0";

				// Daten vom Server abrufen mit Cache-Buster
				const response = await fetch(`${serverUrl}?t=${Date.now()}`);

				if (response.ok) {
					const data = await response.json();

					// Prüfen, ob Daten neuer sind
					if (data.metadata && data.metadata.timestamp > parseInt(lastSync)) {
						console.log("Neue Daten vom Server erhalten");

						// Daten anwenden
						this.ensureApplyFunction();
						if (
							window.hangarData &&
							typeof window.hangarData.applyLoadedHangarPlan === "function"
						) {
							window.hangarData.applyLoadedHangarPlan(data);

							// UI aktualisieren
							setTimeout(() => this.updateUIElements(), 500);

							// Timestamp aktualisieren
							localStorage.setItem(syncKey, data.metadata.timestamp.toString());

							if (window.showNotification) {
								window.showNotification(
									"Neue Daten vom Server synchronisiert",
									"info"
								);
							}
						}
					}
				} else {
					console.warn("Server-Abfrage fehlgeschlagen:", response.status);
				}
			} catch (error) {
				console.error("Fehler beim Abrufen der Daten vom Server:", error);
			}
		};

		// Initiale Synchronisation
		downloadData();

		// Regelmäßige Synchronisation
		this.serverSyncInterval = setInterval(() => {
			downloadData();
		}, 5000); // Alle 5 Sekunden prüfen

		console.log("Server-Synchronisation aktiviert mit URL:", serverUrl);
	}

	/**
	 * Erstellt die UI des Storage-Browsers
	 */
	createUI() {
		// Titel
		const title = document.createElement("h3");
		title.textContent = "Daten-Synchronisation";
		title.className = "text-sm font-medium mb-2";

		// Primäre Buttons (obere Reihe)
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "flex justify-between items-center mb-2";

		// Speichern-Button
		const saveButton = document.createElement("button");
		saveButton.textContent = "💾 Speichern";
		saveButton.className = "sidebar-btn sidebar-btn-primary text-xs";
		saveButton.onclick = () => this.saveCurrentProject();

		// Aktualisieren-Button
		const refreshButton = document.createElement("button");
		refreshButton.textContent = "↻ Aktualisieren";
		refreshButton.className = "sidebar-btn sidebar-btn-secondary text-xs";
		refreshButton.onclick = () => this.refreshFileList();

		buttonContainer.appendChild(saveButton);
		buttonContainer.appendChild(refreshButton);

		// Server-Synchronisations-Buttons (untere Reihe)
		const syncButtonsContainer = document.createElement("div");
		syncButtonsContainer.className = "flex justify-between items-center mt-2";

		// Auto-Sync Checkbox in der UI hinzufügen
		const autoSyncContainer = document.createElement("div");
		autoSyncContainer.className = "flex items-center mt-2 mb-2";

		const autoSyncCheckbox = document.createElement("input");
		autoSyncCheckbox.type = "checkbox";
		autoSyncCheckbox.id = "server-auto-sync";
		autoSyncCheckbox.className = "mr-2";
		autoSyncCheckbox.checked =
			localStorage.getItem("hangarplanner_auto_sync") === "true";
		autoSyncCheckbox.onchange = () => {
			localStorage.setItem("hangarplanner_auto_sync", autoSyncCheckbox.checked);
			if (autoSyncCheckbox.checked) {
				this.detectAndEnableServerSync();
			} else {
				this.enableServerSync(false);
			}
		};

		const autoSyncLabel = document.createElement("label");
		autoSyncLabel.htmlFor = "server-auto-sync";
		autoSyncLabel.textContent = "Auto-Sync";
		autoSyncLabel.className = "text-xs";

		autoSyncContainer.appendChild(autoSyncCheckbox);
		autoSyncContainer.appendChild(autoSyncLabel);

		// JSON Export Button - volle Breite
		const exportButton = document.createElement("button");
		exportButton.textContent = "📤 JSON exportieren";
		exportButton.className =
			"sidebar-btn sidebar-btn-primary text-xs flex-grow";
		exportButton.onclick = () => this.exportDataAsJson();

		// Server-Sync-Konfiguration Button - volle Breite
		const syncConfigButton = document.createElement("button");
		syncConfigButton.textContent = "🔄 Server-Sync";
		syncConfigButton.className =
			"sidebar-btn sidebar-btn-secondary text-xs flex-grow ml-2";
		syncConfigButton.onclick = () => this.configureServerSync();

		syncButtonsContainer.appendChild(exportButton);
		syncButtonsContainer.appendChild(syncConfigButton);

		// Info-Text
		const infoText = document.createElement("p");
		infoText.textContent =
			"Exportiere JSON und lade sie auf einen Webserver hoch";
		infoText.className = "text-xs text-gray-500 mt-2";

		// Status-Anzeige für Server-Synchronisation
		const serverSyncStatus = document.createElement("div");
		serverSyncStatus.id = "server-sync-status";
		serverSyncStatus.className = "text-xs text-gray-500 mt-2";

		// Aktuellen Status anzeigen
		const syncUrl = localStorage.getItem("hangarplanner_server_url");
		if (syncUrl) {
			serverSyncStatus.textContent = `Synchronisierung mit ${syncUrl
				.split("/")
				.slice(0, 3)
				.join("/")}`;
			serverSyncStatus.className = "text-xs text-green-500 mt-2";
		} else {
			serverSyncStatus.textContent =
				"Keine Server-Synchronisation konfiguriert";
		}

		// Alles zum Container hinzufügen
		this.containerElement.innerHTML = ""; // Container leeren
		this.containerElement.appendChild(title);
		this.containerElement.appendChild(buttonContainer);
		this.containerElement.appendChild(autoSyncContainer);
		this.containerElement.appendChild(syncButtonsContainer);
		this.containerElement.appendChild(serverSyncStatus);
		this.containerElement.appendChild(infoText);

		// Die Dateiliste wird nicht mehr angezeigt, da sie nicht benötigt wird
	}

	/**
	 * Lädt die Dateiliste und zeigt sie an
	 * (Funktion bleibt erhalten, aber die Liste wird nicht mehr angezeigt)
	 */
	async refreshFileList() {
		if (!window.fileManager) {
			console.error("fileManager ist nicht verfügbar");
			return;
		}

		try {
			// Dateien im Hintergrund aktualisieren ohne UI-Anzeige
			await window.fileManager.listProjectsInFixedLocation();
			console.log("Dateien im Hintergrund aktualisiert");
		} catch (error) {
			console.error("Fehler beim Laden der Dateien:", error);
		}
	}

	/**
	 * Speichert das aktuelle Projekt in den festen Speicherort
	 */
	async saveCurrentProject() {
		try {
			if (!window.fileManager) {
				throw new Error("Datei-Manager nicht verfügbar");
			}

			// Projektname aus Eingabefeld abrufen oder Standardwert verwenden
			const projectNameInput = document.getElementById("projectName");
			const projectName =
				projectNameInput && projectNameInput.value
					? projectNameInput.value.trim()
					: "HangarPlan";

			// Projektdaten sammeln
			let projectData = {};

			console.log("Versuche Projektdaten zu sammeln...");

			// Prüfe alle möglichen Methoden, um Projektdaten zu erhalten
			if (window.hangarData) {
				console.log("hangarData verfügbar, prüfe Methoden...");

				if (typeof window.hangarData.getCurrentData === "function") {
					console.log("Verwende getCurrentData()...");
					projectData = window.hangarData.getCurrentData();
				} else if (typeof window.hangarData.getProjectData === "function") {
					console.log("Verwende getProjectData()...");
					projectData = window.hangarData.getProjectData();
				} else if (typeof window.hangarData.collectProjectData === "function") {
					console.log("Verwende collectProjectData()...");
					projectData = window.hangarData.collectProjectData();
				} else {
					console.log("Verwende hangarData direkt...");
					// Direkter Zugriff auf Daten als Fallback
					projectData = {
						positions: window.hangarData.positions || {},
						aircraft: window.hangarData.aircraft || {},
						settings: window.hangarData.settings || {},
					};
				}
			} else {
				throw new Error("Hangar-Daten nicht verfügbar");
			}

			// Prüfe, ob wir Daten haben
			if (!projectData || Object.keys(projectData).length === 0) {
				throw new Error("Keine Projektdaten gefunden");
			}

			// Metadaten hinzufügen
			if (!projectData.metadata) {
				projectData.metadata = {};
			}
			projectData.metadata.projectName = projectName;
			projectData.metadata.lastSaved = new Date().toISOString();

			// Korrektes Dateinamensformat sicherstellen
			const fileName = projectName.endsWith(".json")
				? projectName
				: `${projectName}.json`;

			// Tiefe Kopie der Daten erstellen
			const projectDataCopy = JSON.parse(JSON.stringify(projectData));

			console.log(`Speichere Projekt "${fileName}"...`);

			// Verwende die korrekte Parameterreihenfolge (Daten zuerst, dann Dateiname)
			await window.fileManager.saveProjectToFixedLocation(
				projectDataCopy,
				fileName
			);
			console.log(`Projekt "${fileName}" erfolgreich gespeichert.`);

			// Wenn Auto-Sync aktiviert ist, auch zum Server hochladen
			if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
				this.saveToServer(projectDataCopy);
			}

			// Aktualisieren
			await this.refreshFileList();

			if (window.showNotification) {
				window.showNotification(
					`Projekt "${projectName}" gespeichert`,
					"success"
				);
			}
		} catch (error) {
			console.error("Fehler beim Speichern:", error);
			if (window.showNotification) {
				window.showNotification("Speicherfehler: " + error.message, "error");
			}
		}
	}

	/**
	 * Automatische Erkennung und Aktivierung der Server-Synchronisierung
	 * Nutzt den aktuellen Host als Basis
	 */
	detectAndEnableServerSync() {
		try {
			// Prüfen, ob wir auf einem Webserver laufen oder lokal
			const isWebServer =
				window.location.protocol.includes("http") &&
				!window.location.host.includes("localhost") &&
				!window.location.host.includes("127.0.0.1");

			if (!isWebServer) {
				console.log(
					"Lokale Umgebung erkannt, keine automatische Server-Synchronisation"
				);
				return;
			}

			// Stammverzeichnis der Webanwendung bestimmen
			const basePath = window.location.pathname
				.split("/")
				.slice(0, -1)
				.join("/");
			const serverUrl = `${window.location.origin}${basePath}/sync/data.php`;

			console.log(`Server-URL automatisch erkannt: ${serverUrl}`);

			// URL im localStorage speichern
			localStorage.setItem("hangarplanner_server_url", serverUrl);

			// Server-Synchronisierung aktivieren
			this.enableServerSync(true, serverUrl);

			// Status-Anzeige aktualisieren
			const statusElement = document.getElementById("server-sync-status");
			if (statusElement) {
				statusElement.textContent = `Automatische Synchronisierung mit ${window.location.host}`;
				statusElement.className = "text-xs text-green-500 mt-2";
			}

			// Benachrichtigung anzeigen
			if (window.showNotification) {
				window.showNotification(
					"Server-Synchronisierung automatisch konfiguriert",
					"success"
				);
			}
		} catch (error) {
			console.error("Fehler bei der automatischen Server-Erkennung:", error);
		}
	}

	/**
	 * Speichert Daten direkt auf dem Server über das PHP-Script
	 * @param {Object} data - Die zu speichernden Daten
	 */
	async saveToServer(data) {
		try {
			const serverUrl = localStorage.getItem("hangarplanner_server_url");
			if (!serverUrl) {
				console.log("Keine Server-URL konfiguriert, überspringen...");
				return;
			}

			console.log("Speichere Daten auf dem Server:", serverUrl);

			// Timestamp hinzufügen
			if (!data.metadata) data.metadata = {};
			data.metadata.timestamp = Date.now();

			// Daten an Server senden
			const response = await fetch(serverUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (response.ok) {
				const result = await response.json();
				console.log("Server-Antwort:", result);

				if (window.showNotification && result.success) {
					window.showNotification(
						"Daten auf dem Server gespeichert",
						"success"
					);
				}
			} else {
				console.error("Server-Fehler:", response.status);
				if (window.showNotification) {
					window.showNotification("Server-Synchronisationsfehler", "error");
				}
			}
		} catch (error) {
			console.error("Fehler beim Speichern auf dem Server:", error);
		}
	}

	/**
	 * Initialisiert den Storage-Browser in einem Container
	 * @param {string} containerId - ID des Container-Elements für den Datei-Browser
	 */
	initialize(containerId = "storageBrowserContainer") {
		// Container-Element finden oder erstellen
		this.containerElement = document.getElementById(containerId);
		if (!this.containerElement) {
			this.containerElement = document.createElement("div");
			this.containerElement.id = containerId;
			this.containerElement.className =
				"storage-browser bg-white rounded-lg shadow-md p-4 mt-4";

			// An einer passenden Stelle einfügen (z.B. nach dem Auto-Sync Toggle)
			const projectSettingsSection = document.querySelector(
				".sidebar-accordion-content"
			);
			if (projectSettingsSection) {
				projectSettingsSection.appendChild(this.containerElement);
			} else {
				document.body.appendChild(this.containerElement);
			}
		}

		// UI erstellen
		this.createUI();

		// Initial Dateien laden
		this.refreshFileList();

		// Stelle die Apply-Funktion bereit
		this.ensureApplyFunction();

		// Auto-Sync aktivieren, wenn eingestellt
		if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
			this.detectAndEnableServerSync();
		} else {
			// Aktiviere Cross-Browser-Synchronisierung als Fallback
			this.enableCrossBrowserSync();
		}

		// Optional: Server-Synchronisation aktivieren, wenn URL vorhanden
		const serverSyncUrl = localStorage.getItem("hangarplanner_server_url");
		if (
			serverSyncUrl &&
			localStorage.getItem("hangarplanner_auto_sync") !== "true"
		) {
			this.enableServerSync(true, serverSyncUrl);
		}

		console.log("Storage Browser initialisiert");
	}
}

/**
 * Datei-Browser für gespeicherte Dateien im OPFS-Speicher
 */

class StorageBrowser {
	constructor() {
		this.containerElement = null;
		this.fileListElement = null;
	}

	/**
	 * Aktualisiert die UI-Elemente basierend auf den aktuellen Hangar-Daten
	 * @private
	 */
	updateUIElements() {
		console.log("Aktualisiere UI-Elemente...");

		try {
			// 1. Aktualisiere primäre Kacheln
			if (window.hangarData && window.hangarData.positions) {
				// Primäre Positionen aktualisieren
				Object.keys(window.hangarData.positions).forEach((positionKey) => {
					const positionValue = window.hangarData.positions[positionKey];
					const positionInput = document.getElementById(
						`hangar-position-${positionKey}`
					);

					if (positionInput && positionInput.value !== positionValue) {
						console.log(
							`Aktualisiere Position ${positionKey} auf ${positionValue}`
						);
						positionInput.value = positionValue;

						// Löse ein Change-Event aus, damit event-Handler reagieren können
						const event = new Event("change", { bubbles: true });
						positionInput.dispatchEvent(event);
					}
				});

				// 2. Aktualisiere Aircraft-IDs wenn vorhanden
				if (window.hangarData.aircraft) {
					Object.keys(window.hangarData.aircraft).forEach((aircraftKey) => {
						const aircraftValue = window.hangarData.aircraft[aircraftKey];
						const aircraftInput = document.getElementById(
							`aircraft-id-${aircraftKey}`
						);

						if (aircraftInput && aircraftInput.value !== aircraftValue) {
							console.log(
								`Aktualisiere Aircraft ${aircraftKey} auf ${aircraftValue}`
							);
							aircraftInput.value = aircraftValue;

							// Löse ein Change-Event aus
							const event = new Event("change", { bubbles: true });
							aircraftInput.dispatchEvent(event);
						}
					});
				}

				// 3. Aktualisiere sekundäre Kacheln
				for (let i = 101; i <= 104; i++) {
					const posInput = document.getElementById(`hangar-position-${i}`);
					const acInput = document.getElementById(`aircraft-id-${i}`);

					if (window.hangarData.positions[i] && posInput) {
						console.log(
							`Setze sekundäre Position ${i} auf ${window.hangarData.positions[i]}`
						);
						posInput.value = window.hangarData.positions[i];

						const event = new Event("change", { bubbles: true });
						posInput.dispatchEvent(event);
					}

					if (window.hangarData.aircraft[i] && acInput) {
						console.log(
							`Setze sekundäre Aircraft ${i} auf ${window.hangarData.aircraft[i]}`
						);
						acInput.value = window.hangarData.aircraft[i];

						const event = new Event("change", { bubbles: true });
						acInput.dispatchEvent(event);
					}
				}
			}

			// 4. Auslösen eines Event für die Gesamtaktualisierung
			document.dispatchEvent(new CustomEvent("uiDataRefreshed"));
			console.log("UI-Elemente wurden aktualisiert");
			return true;
		} catch (error) {
			console.error("Fehler bei der UI-Aktualisierung:", error);
			return false;
		}
	}

	/**
	 * Stellt eine Synchronisationsfunktion bereit und registriert sie bei window.hangarData,
	 * falls diese nicht vorhanden ist
	 * @private
	 */
	ensureApplyFunction() {
		if (window.hangarData) {
			// Prüfe ob die Funktion fehlt und stelle sie bereit falls nötig
			if (typeof window.hangarData.applyLoadedHangarPlan !== "function") {
				console.log("applyLoadedHangarPlan-Funktion wird erstellt");
				window.hangarData.applyLoadedHangarPlan = (projectData) => {
					console.log("Wende geladene Daten auf Anwendung an...");

					try {
						// Positions- und Aircraft-Daten übernehmen
						if (projectData.positions) {
							window.hangarData.positions = projectData.positions;
							console.log("Positionsdaten übernommen");
						}

						if (projectData.aircraft) {
							window.hangarData.aircraft = projectData.aircraft;
							console.log("Aircraft-Daten übernommen");
						}

						if (projectData.settings) {
							window.hangarData.settings = projectData.settings;
							console.log("Einstellungen übernommen");
						}

						// UI aktualisieren falls möglich
						if (typeof window.updateUIFromData === "function") {
							window.updateUIFromData(projectData);
							console.log("UI mit neuen Daten aktualisiert");
						} else {
							// Versuche die Aktualisierungsfunktion zu finden
							if (
								typeof window.hangarUI !== "undefined" &&
								typeof window.hangarUI.apply === "function"
							) {
								window.hangarUI.apply(projectData);
								console.log("UI über hangarUI.apply aktualisiert");
							} else {
								// Neue UI-Aktualisierung verwenden
								this.updateUIElements();
								console.log(
									"UI über StorageBrowser.updateUIElements aktualisiert"
								);
							}
						}

						// Ereignis auslösen, um andere Komponenten zu informieren
						const event = new CustomEvent("projectDataChanged", {
							detail: projectData,
						});
						document.dispatchEvent(event);

						return true;
					} catch (error) {
						console.error("Fehler beim Anwenden der Projektdaten:", error);
						return false;
					}
				};
				console.log("applyLoadedHangarPlan-Funktion erstellt und registriert");
			} else {
				console.log("applyLoadedHangarPlan-Funktion bereits vorhanden");
			}
		} else {
			console.warn(
				"hangarData-Objekt nicht verfügbar, kann Funktion nicht registrieren"
			);
		}
	}

	/**
	 * Aktiviert die erweiterte Browser-übergreifende Synchronisierung
	 * @param {boolean} activate - Aktiviert die erweiterte Sync-Funktion
	 */
	enableCrossBrowserSync(activate = true) {
		// Stoppe bestehende Synchronisation falls vorhanden
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
			console.log("Bestehende Cross-Browser-Synchronisation gestoppt");
		}

		if (!activate) return;

		// Synchronisationsschlüssel für localStorage
		const syncKey = "hangarplanner_sync_flag";

		// Setze initiale Sync-Flagge
		localStorage.setItem(syncKey, Date.now().toString());

		// Prüfe regelmäßig auf Änderungen
		this.syncInterval = setInterval(() => {
			try {
				const lastSyncTime = localStorage.getItem(syncKey);
				const availableProjects =
					window.fileManager.listProjectsInFixedLocation();

				availableProjects
					.then((projects) => {
						if (projects && projects.length > 0) {
							// Neues Projekt seit letzter Synchronisierung
							const projectName = projects[0];

							// Versuche das Projekt zu laden
							window.fileManager
								.loadProjectFromFixedLocation(projectName)
								.then((projectData) => {
									if (
										projectData &&
										projectData.metadata &&
										projectData.metadata.lastSaved
									) {
										// Aktualisiere Sync-Flagge nur wenn neue Daten geladen wurden
										localStorage.setItem(syncKey, Date.now().toString());

										// Wende die Daten auf die aktuelle Anwendung an
										this.ensureApplyFunction();

										if (
											window.hangarData &&
											typeof window.hangarData.applyLoadedHangarPlan ===
												"function"
										) {
											window.hangarData.applyLoadedHangarPlan(projectData);

											// Sicherstellen, dass die UI aktualisiert wird
											setTimeout(() => this.updateUIElements(), 500);

											console.log(
												`Projekt "${projectName}" erfolgreich synchronisiert`
											);

											if (window.showNotification) {
												window.showNotification(
													`Projekt "${projectName}" synchronisiert`,
													"success"
												);
											}
										}
									}
								})
								.catch((error) => {
									console.error("Fehler beim Laden des Projekts:", error);
								});
						}
					})
					.catch((error) => {
						console.error("Fehler beim Auflisten der Projekte:", error);
					});
			} catch (error) {
				console.error("Fehler bei der Cross-Browser-Synchronisation:", error);
			}
		}, 5000); // Alle 5 Sekunden prüfen

		console.log("Cross-Browser-Synchronisation aktiviert");
	}

	/**
	 * Ermöglicht die Synchronisation über einen Webserver
	 * Verbessert mit einfacherem JSON-basierten Ansatz
	 * @param {boolean} activate - Aktiviert die Server-Synchronisation
	 * @param {string} serverUrl - URL zum Server-Endpunkt (z.B. "https://example.com/sync/data.json")
	 */
	enableServerSync(activate = true, serverUrl = "") {
		if (this.serverSyncInterval) {
			clearInterval(this.serverSyncInterval);
			this.serverSyncInterval = null;
			console.log("Server-Synchronisation gestoppt");
		}

		if (!activate || !serverUrl) return;

		// Konfiguration speichern
		this.serverSyncUrl = serverUrl;

		// Synchronisations-Schlüssel
		const syncKey = "hangarplanner_server_sync";

		// Funktion zum Herunterladen der Daten
		const downloadData = async () => {
			try {
				const lastSync = localStorage.getItem(syncKey) || "0";

				// Daten vom Server abrufen mit Cache-Buster
				const response = await fetch(`${serverUrl}?t=${Date.now()}`);

				if (response.ok) {
					const data = await response.json();

					// Prüfen, ob Daten neuer sind
					if (data.metadata && data.metadata.timestamp > parseInt(lastSync)) {
						console.log("Neue Daten vom Server erhalten");

						// Daten anwenden
						this.ensureApplyFunction();
						if (
							window.hangarData &&
							typeof window.hangarData.applyLoadedHangarPlan === "function"
						) {
							window.hangarData.applyLoadedHangarPlan(data);

							// UI aktualisieren
							setTimeout(() => this.updateUIElements(), 500);

							// Timestamp aktualisieren
							localStorage.setItem(syncKey, data.metadata.timestamp.toString());

							if (window.showNotification) {
								window.showNotification(
									"Neue Daten vom Server synchronisiert",
									"info"
								);
							}
						}
					}
				} else {
					console.warn("Server-Abfrage fehlgeschlagen:", response.status);
				}
			} catch (error) {
				console.error("Fehler beim Abrufen der Daten vom Server:", error);
			}
		};

		// Initiale Synchronisation
		downloadData();

		// Regelmäßige Synchronisation
		this.serverSyncInterval = setInterval(() => {
			downloadData();
		}, 5000); // Alle 5 Sekunden prüfen

		console.log("Server-Synchronisation aktiviert mit URL:", serverUrl);
	}

	/**
	 * Erstellt die UI des Storage-Browsers
	 */
	createUI() {
		// Titel
		const title = document.createElement("h3");
		title.textContent = "Daten-Synchronisation";
		title.className = "text-sm font-medium mb-2";

		// Primäre Buttons (obere Reihe)
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "flex justify-between items-center mb-2";

		// Speichern-Button
		const saveButton = document.createElement("button");
		saveButton.textContent = "💾 Speichern";
		saveButton.className = "sidebar-btn sidebar-btn-primary text-xs";
		saveButton.onclick = () => this.saveCurrentProject();

		// Aktualisieren-Button
		const refreshButton = document.createElement("button");
		refreshButton.textContent = "↻ Aktualisieren";
		refreshButton.className = "sidebar-btn sidebar-btn-secondary text-xs";
		refreshButton.onclick = () => this.refreshFileList();

		buttonContainer.appendChild(saveButton);
		buttonContainer.appendChild(refreshButton);

		// Server-Synchronisations-Buttons (untere Reihe)
		const syncButtonsContainer = document.createElement("div");
		syncButtonsContainer.className = "flex justify-between items-center mt-2";

		// Auto-Sync Checkbox in der UI hinzufügen
		const autoSyncContainer = document.createElement("div");
		autoSyncContainer.className = "flex items-center mt-2 mb-2";

		const autoSyncCheckbox = document.createElement("input");
		autoSyncCheckbox.type = "checkbox";
		autoSyncCheckbox.id = "server-auto-sync";
		autoSyncCheckbox.className = "mr-2";
		autoSyncCheckbox.checked =
			localStorage.getItem("hangarplanner_auto_sync") === "true";
		autoSyncCheckbox.onchange = () => {
			localStorage.setItem("hangarplanner_auto_sync", autoSyncCheckbox.checked);
			if (autoSyncCheckbox.checked) {
				this.detectAndEnableServerSync();
			} else {
				this.enableServerSync(false);
			}
		};

		const autoSyncLabel = document.createElement("label");
		autoSyncLabel.htmlFor = "server-auto-sync";
		autoSyncLabel.textContent = "Auto-Sync";
		autoSyncLabel.className = "text-xs";

		autoSyncContainer.appendChild(autoSyncCheckbox);
		autoSyncContainer.appendChild(autoSyncLabel);

		// JSON Export Button - volle Breite
		const exportButton = document.createElement("button");
		exportButton.textContent = "📤 JSON exportieren";
		exportButton.className =
			"sidebar-btn sidebar-btn-primary text-xs flex-grow";
		exportButton.onclick = () => this.exportDataAsJson();

		// Server-Sync-Konfiguration Button - volle Breite
		const syncConfigButton = document.createElement("button");
		syncConfigButton.textContent = "🔄 Server-Sync";
		syncConfigButton.className =
			"sidebar-btn sidebar-btn-secondary text-xs flex-grow ml-2";
		syncConfigButton.onclick = () => this.configureServerSync();

		syncButtonsContainer.appendChild(exportButton);
		syncButtonsContainer.appendChild(syncConfigButton);

		// Info-Text
		const infoText = document.createElement("p");
		infoText.textContent =
			"Exportiere JSON und lade sie auf einen Webserver hoch";
		infoText.className = "text-xs text-gray-500 mt-2";

		// Status-Anzeige für Server-Synchronisation
		const serverSyncStatus = document.createElement("div");
		serverSyncStatus.id = "server-sync-status";
		serverSyncStatus.className = "text-xs text-gray-500 mt-2";

		// Aktuellen Status anzeigen
		const syncUrl = localStorage.getItem("hangarplanner_server_url");
		if (syncUrl) {
			serverSyncStatus.textContent = `Synchronisierung mit ${syncUrl
				.split("/")
				.slice(0, 3)
				.join("/")}`;
			serverSyncStatus.className = "text-xs text-green-500 mt-2";
		} else {
			serverSyncStatus.textContent =
				"Keine Server-Synchronisation konfiguriert";
		}

		// Alles zum Container hinzufügen
		this.containerElement.innerHTML = ""; // Container leeren
		this.containerElement.appendChild(title);
		this.containerElement.appendChild(buttonContainer);
		this.containerElement.appendChild(autoSyncContainer);
		this.containerElement.appendChild(syncButtonsContainer);
		this.containerElement.appendChild(serverSyncStatus);
		this.containerElement.appendChild(infoText);

		// Die Dateiliste wird nicht mehr angezeigt, da sie nicht benötigt wird
	}

	/**
	 * Lädt die Dateiliste und zeigt sie an
	 * (Funktion bleibt erhalten, aber die Liste wird nicht mehr angezeigt)
	 */
	async refreshFileList() {
		if (!window.fileManager) {
			console.error("fileManager ist nicht verfügbar");
			return;
		}

		try {
			// Dateien im Hintergrund aktualisieren ohne UI-Anzeige
			await window.fileManager.listProjectsInFixedLocation();
			console.log("Dateien im Hintergrund aktualisiert");
		} catch (error) {
			console.error("Fehler beim Laden der Dateien:", error);
		}
	}

	/**
	 * Speichert das aktuelle Projekt in den festen Speicherort
	 */
	async saveCurrentProject() {
		try {
			if (!window.fileManager) {
				throw new Error("Datei-Manager nicht verfügbar");
			}

			// Projektname aus Eingabefeld abrufen oder Standardwert verwenden
			const projectNameInput = document.getElementById("projectName");
			const projectName =
				projectNameInput && projectNameInput.value
					? projectNameInput.value.trim()
					: "HangarPlan";

			// Projektdaten sammeln
			let projectData = {};

			console.log("Versuche Projektdaten zu sammeln...");

			// Prüfe alle möglichen Methoden, um Projektdaten zu erhalten
			if (window.hangarData) {
				console.log("hangarData verfügbar, prüfe Methoden...");

				if (typeof window.hangarData.getCurrentData === "function") {
					console.log("Verwende getCurrentData()...");
					projectData = window.hangarData.getCurrentData();
				} else if (typeof window.hangarData.getProjectData === "function") {
					console.log("Verwende getProjectData()...");
					projectData = window.hangarData.getProjectData();
				} else if (typeof window.hangarData.collectProjectData === "function") {
					console.log("Verwende collectProjectData()...");
					projectData = window.hangarData.collectProjectData();
				} else {
					console.log("Verwende hangarData direkt...");
					// Direkter Zugriff auf Daten als Fallback
					projectData = {
						positions: window.hangarData.positions || {},
						aircraft: window.hangarData.aircraft || {},
						settings: window.hangarData.settings || {},
					};
				}
			} else {
				throw new Error("Hangar-Daten nicht verfügbar");
			}

			// Prüfe, ob wir Daten haben
			if (!projectData || Object.keys(projectData).length === 0) {
				throw new Error("Keine Projektdaten gefunden");
			}

			// Metadaten hinzufügen
			if (!projectData.metadata) {
				projectData.metadata = {};
			}
			projectData.metadata.projectName = projectName;
			projectData.metadata.lastSaved = new Date().toISOString();

			// Korrektes Dateinamensformat sicherstellen
			const fileName = projectName.endsWith(".json")
				? projectName
				: `${projectName}.json`;

			// Tiefe Kopie der Daten erstellen
			const projectDataCopy = JSON.parse(JSON.stringify(projectData));

			console.log(`Speichere Projekt "${fileName}"...`);

			// Verwende die korrekte Parameterreihenfolge (Daten zuerst, dann Dateiname)
			await window.fileManager.saveProjectToFixedLocation(
				projectDataCopy,
				fileName
			);
			console.log(`Projekt "${fileName}" erfolgreich gespeichert.`);

			// Wenn Auto-Sync aktiviert ist, auch zum Server hochladen
			if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
				this.saveToServer(projectDataCopy);
			}

			// Aktualisieren
			await this.refreshFileList();

			if (window.showNotification) {
				window.showNotification(
					`Projekt "${projectName}" gespeichert`,
					"success"
				);
			}
		} catch (error) {
			console.error("Fehler beim Speichern:", error);
			if (window.showNotification) {
				window.showNotification("Speicherfehler: " + error.message, "error");
			}
		}
	}

	/**
	 * Automatische Erkennung und Aktivierung der Server-Synchronisierung
	 * Nutzt den aktuellen Host als Basis
	 */
	detectAndEnableServerSync() {
		try {
			// Prüfen, ob wir auf einem Webserver laufen oder lokal
			const isWebServer =
				window.location.protocol.includes("http") &&
				!window.location.host.includes("localhost") &&
				!window.location.host.includes("127.0.0.1");

			if (!isWebServer) {
				console.log(
					"Lokale Umgebung erkannt, keine automatische Server-Synchronisation"
				);
				return;
			}

			// Stammverzeichnis der Webanwendung bestimmen
			const basePath = window.location.pathname
				.split("/")
				.slice(0, -1)
				.join("/");
			const serverUrl = `${window.location.origin}${basePath}/sync/data.php`;

			console.log(`Server-URL automatisch erkannt: ${serverUrl}`);

			// URL im localStorage speichern
			localStorage.setItem("hangarplanner_server_url", serverUrl);

			// Server-Synchronisierung aktivieren
			this.enableServerSync(true, serverUrl);

			// Status-Anzeige aktualisieren
			const statusElement = document.getElementById("server-sync-status");
			if (statusElement) {
				statusElement.textContent = `Automatische Synchronisierung mit ${window.location.host}`;
				statusElement.className = "text-xs text-green-500 mt-2";
			}

			// Benachrichtigung anzeigen
			if (window.showNotification) {
				window.showNotification(
					"Server-Synchronisierung automatisch konfiguriert",
					"success"
				);
			}
		} catch (error) {
			console.error("Fehler bei der automatischen Server-Erkennung:", error);
		}
	}

	/**
	 * Speichert Daten direkt auf dem Server über das PHP-Script
	 * @param {Object} data - Die zu speichernden Daten
	 */
	async saveToServer(data) {
		try {
			const serverUrl = localStorage.getItem("hangarplanner_server_url");
			if (!serverUrl) {
				console.log("Keine Server-URL konfiguriert, überspringen...");
				return;
			}

			console.log("Speichere Daten auf dem Server:", serverUrl);

			// Timestamp hinzufügen
			if (!data.metadata) data.metadata = {};
			data.metadata.timestamp = Date.now();

			// Daten an Server senden
			const response = await fetch(serverUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (response.ok) {
				const result = await response.json();
				console.log("Server-Antwort:", result);

				if (window.showNotification && result.success) {
					window.showNotification(
						"Daten auf dem Server gespeichert",
						"success"
					);
				}
			} else {
				console.error("Server-Fehler:", response.status);
				if (window.showNotification) {
					window.showNotification("Server-Synchronisationsfehler", "error");
				}
			}
		} catch (error) {
			console.error("Fehler beim Speichern auf dem Server:", error);
		}
	}

	/**
	 * Initialisiert den Storage-Browser in einem Container
	 * @param {string} containerId - ID des Container-Elements für den Datei-Browser
	 */
	initialize(containerId = "storageBrowserContainer") {
		// Container-Element finden oder erstellen
		this.containerElement = document.getElementById(containerId);
		if (!this.containerElement) {
			this.containerElement = document.createElement("div");
			this.containerElement.id = containerId;
			this.containerElement.className =
				"storage-browser bg-white rounded-lg shadow-md p-4 mt-4";

			// An einer passenden Stelle einfügen (z.B. nach dem Auto-Sync Toggle)
			const projectSettingsSection = document.querySelector(
				".sidebar-accordion-content"
			);
			if (projectSettingsSection) {
				projectSettingsSection.appendChild(this.containerElement);
			} else {
				document.body.appendChild(this.containerElement);
			}
		}

		// UI erstellen
		this.createUI();

		// Initial Dateien laden
		this.refreshFileList();

		// Stelle die Apply-Funktion bereit
		this.ensureApplyFunction();

		// Auto-Sync aktivieren, wenn eingestellt
		if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
			this.detectAndEnableServerSync();
		} else {
			// Aktiviere Cross-Browser-Synchronisierung als Fallback
			this.enableCrossBrowserSync();
		}

		// Optional: Server-Synchronisation aktivieren, wenn URL vorhanden
		const serverSyncUrl = localStorage.getItem("hangarplanner_server_url");
		if (
			serverSyncUrl &&
			localStorage.getItem("hangarplanner_auto_sync") !== "true"
		) {
			this.enableServerSync(true, serverSyncUrl);
		}

		console.log("Storage Browser initialisiert");
	}
}

// Globale Instanz erstellen
window.storageBrowser = new StorageBrowser();

// Nach DOM-Ladung initialisieren
document.addEventListener("DOMContentLoaded", () => {
	// Verzögert initialisieren, um sicherzustellen dass andere Komponenten geladen sind
	setTimeout(() => {
		if (window.storageBrowser) {
			window.storageBrowser.initialize();
		}
	}, 1000);
});

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
	 * @param {boolean} activate - Aktiviert die Server-Synchronisation
	 * @param {string} serverUrl - URL zum Server-Endpunkt (z.B. "https://example.com/sync/")
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

		// Funktion zum Hochladen der Daten
		const uploadData = async () => {
			try {
				if (!window.hangarData) return;

				// Aktuelle Projektdaten sammeln
				let projectData = {};
				if (typeof window.hangarData.getCurrentData === "function") {
					projectData = window.hangarData.getCurrentData();
				} else if (typeof window.hangarData.getProjectData === "function") {
					projectData = window.hangarData.getProjectData();
				} else {
					projectData = {
						positions: window.hangarData.positions || {},
						aircraft: window.hangarData.aircraft || {},
						settings: window.hangarData.settings || {},
					};
				}

				// Metadaten hinzufügen
				if (!projectData.metadata) projectData.metadata = {};
				projectData.metadata.timestamp = Date.now();
				projectData.metadata.lastModified = new Date().toISOString();

				// Daten an Server senden
				const response = await fetch(serverUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(projectData),
				});

				if (response.ok) {
					console.log("Daten erfolgreich zum Server synchronisiert");
					localStorage.setItem(syncKey, Date.now().toString());
				} else {
					console.error(
						"Fehler beim Hochladen der Daten:",
						await response.text()
					);
				}
			} catch (error) {
				console.error("Fehler bei der Server-Synchronisation:", error);
			}
		};

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
							localStorage.setItem(syncKey, data.metadata.timestamp);

							if (window.showNotification) {
								window.showNotification(
									"Neue Daten vom Server synchronisiert",
									"info"
								);
							}
						}
					}
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

		// Event-Listener für lokale Änderungen
		document.addEventListener("projectDataChanged", () => {
			uploadData();
		});

		console.log("Server-Synchronisation aktiviert mit URL:", serverUrl);
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

		// Aktiviere Cross-Browser-Synchronisierung
		this.enableCrossBrowserSync();

		// Optional: Server-Synchronisation aktivieren, wenn URL vorhanden
		const serverSyncUrl = localStorage.getItem("hangarplanner_server_url");
		if (serverSyncUrl) {
			this.enableServerSync(true, serverSyncUrl);
		}

		console.log("Storage Browser initialisiert");
	}

	/**
	 * Erstellt die UI des Storage-Browsers
	 */
	createUI() {
		// Titel
		const title = document.createElement("h3");
		title.textContent = "Gespeicherte Dateien";
		title.className = "text-sm font-medium mb-2";

		// Button-Container für bessere Anordnung
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

		// Container für die Dateiliste
		this.fileListElement = document.createElement("div");
		this.fileListElement.className =
			"storage-file-list text-sm max-h-40 overflow-y-auto";

		// Info-Text
		const infoText = document.createElement("p");
		infoText.textContent = "Dateien werden im Browser-Speicher gespeichert";
		infoText.className = "text-xs text-gray-500 mt-2";

		// Server-Sync-Konfiguration Button
		const syncConfigButton = document.createElement("button");
		syncConfigButton.textContent = "🔄 Server-Sync";
		syncConfigButton.className =
			"sidebar-btn sidebar-btn-secondary text-xs mt-2";
		syncConfigButton.onclick = () => this.configureServerSync();

		// Alles zum Container hinzufügen
		this.containerElement.innerHTML = ""; // Container leeren
		this.containerElement.appendChild(title);
		this.containerElement.appendChild(buttonContainer);
		this.containerElement.appendChild(this.fileListElement);
		this.containerElement.appendChild(infoText);
		this.containerElement.appendChild(syncConfigButton);
	}

	/**
	 * Lädt die Dateiliste und zeigt sie an
	 */
	async refreshFileList() {
		if (!window.fileManager) {
			console.error("fileManager ist nicht verfügbar");
			this.showError("Datei-Manager nicht verfügbar");
			return;
		}

		try {
			// Lade-Animation anzeigen
			this.fileListElement.innerHTML =
				'<div class="text-center py-2"><span class="animate-pulse">Lade Dateien...</span></div>';

			// Dateien abrufen
			const files = await window.fileManager.listProjectsInFixedLocation();

			if (files && files.length > 0) {
				// Dateien anzeigen
				this.fileListElement.innerHTML = "";
				files.forEach((fileName) => {
					const fileItem = document.createElement("div");
					fileItem.className =
						"storage-file-item py-1 px-2 hover:bg-gray-100 flex justify-between items-center";

					// Linke Seite: Dateiname
					const nameSpan = document.createElement("span");
					nameSpan.textContent = fileName;
					nameSpan.className = "file-name";
					nameSpan.style.cursor = "pointer";
					nameSpan.onclick = () => this.loadFile(fileName);

					// Rechte Seite: Aktionen
					const actionsDiv = document.createElement("div");
					actionsDiv.className = "file-actions";

					// Laden-Button
					const loadBtn = document.createElement("button");
					loadBtn.innerHTML = "📂";
					loadBtn.title = "Datei laden";
					loadBtn.className = "text-sm p-1 mr-1 hover:text-industrial-accent";
					loadBtn.onclick = () => this.loadFile(fileName);

					// Löschen-Button
					const deleteBtn = document.createElement("button");
					deleteBtn.innerHTML = "🗑️";
					deleteBtn.title = "Datei löschen";
					deleteBtn.className = "text-sm p-1 hover:text-status-red";
					deleteBtn.onclick = (e) => {
						e.stopPropagation();
						this.deleteFile(fileName);
					};

					actionsDiv.appendChild(loadBtn);
					actionsDiv.appendChild(deleteBtn);
					fileItem.appendChild(nameSpan);
					fileItem.appendChild(actionsDiv);

					this.fileListElement.appendChild(fileItem);
				});
			} else {
				this.fileListElement.innerHTML =
					'<div class="text-center py-2 text-gray-500">Keine Dateien gefunden</div>';
			}
		} catch (error) {
			console.error("Fehler beim Laden der Dateien:", error);
			this.showError("Fehler beim Laden: " + error.message);
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
	 * Löscht eine Datei aus dem Speicher
	 * @param {string} fileName - Name der zu löschenden Datei
	 */
	async deleteFile(fileName) {
		if (confirm(`Soll die Datei "${fileName}" wirklich gelöscht werden?`)) {
			try {
				if (!window.fileManager) {
					throw new Error("Datei-Manager nicht verfügbar");
				}

				await window.fileManager.deleteProjectFromFixedLocation(fileName);
				await this.refreshFileList();

				if (window.showNotification) {
					window.showNotification(`Datei "${fileName}" gelöscht`, "info");
				}
			} catch (error) {
				console.error("Fehler beim Löschen der Datei:", error);
				if (window.showNotification) {
					window.showNotification("Löschfehler: " + error.message, "error");
				}
			}
		}
	}

	/**
	 * Lädt eine Datei aus dem Speicher
	 * @param {string} fileName - Name der zu ladenden Datei
	 */
	async loadFile(fileName) {
		try {
			if (!window.fileManager) {
				throw new Error("Datei-Manager nicht verfügbar");
			}

			const projectData = await window.fileManager.loadProjectFromFixedLocation(
				fileName
			);

			// Stelle sicher, dass die Apply-Funktion verfügbar ist
			this.ensureApplyFunction();

			if (
				projectData &&
				window.hangarData &&
				typeof window.hangarData.applyLoadedHangarPlan === "function"
			) {
				window.hangarData.applyLoadedHangarPlan(projectData);

				// Projektnamen im UI aktualisieren
				const projectNameInput = document.getElementById("projectName");
				if (
					projectNameInput &&
					projectData.metadata &&
					projectData.metadata.projectName
				) {
					projectNameInput.value = projectData.metadata.projectName;
				}

				// Aktualisiere den localStorage-Synchronisationsschlüssel
				localStorage.setItem("hangarplanner_sync_flag", Date.now().toString());

				// Sicherstellen, dass die UI vollständig aktualisiert wird
				setTimeout(() => this.updateUIElements(), 500);

				// Erfolgsbenachrichtigung
				if (window.showNotification) {
					window.showNotification(`Projekt "${fileName}" geladen`, "success");
				}
			} else {
				console.error(
					"Projekt konnte nicht geladen werden oder Anwendung ist nicht bereit"
				);
				if (window.showNotification) {
					window.showNotification("Fehler beim Laden des Projekts", "error");
				}
			}
		} catch (error) {
			console.error("Fehler beim Laden der Datei:", error);
			if (window.showNotification) {
				window.showNotification("Fehler beim Laden: " + error.message, "error");
			}
		}
	}

	/**
	 * Zeigt eine Fehlermeldung in der Dateiliste an
	 * @param {string} message - Die anzuzeigende Fehlermeldung
	 */
	showError(message) {
		if (this.fileListElement) {
			this.fileListElement.innerHTML = `<div class="text-center py-2 text-status-red">${message}</div>`;
		}
	}

	/**
	 * Füge eine Methode zum Konfigurieren der Server-URL hinzu
	 */
	configureServerSync() {
		const currentUrl = localStorage.getItem("hangarplanner_server_url") || "";
		const newUrl = prompt(
			"URL für Server-Synchronisation eingeben:",
			currentUrl
		);

		if (newUrl !== null) {
			localStorage.setItem("hangarplanner_server_url", newUrl);

			if (newUrl) {
				this.enableServerSync(true, newUrl);
				if (window.showNotification) {
					window.showNotification(
						"Server-Synchronisation konfiguriert",
						"success"
					);
				}
			} else {
				if (this.serverSyncInterval) {
					clearInterval(this.serverSyncInterval);
					this.serverSyncInterval = null;
				}
				if (window.showNotification) {
					window.showNotification("Server-Synchronisation deaktiviert", "info");
				}
			}
		}
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

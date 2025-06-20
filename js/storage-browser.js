/**
 * Datei-Browser für gespeicherte Dateien mit Server-Synchronisation
 * Vereinfachte Version, die nur auf PHP-Server-Synchronisation setzt
 */

class StorageBrowser {
	constructor() {
		this.containerElement = null;
		this.serverSyncInterval = null;
		this.serverSyncUrl = null;
		this.isApplyingServerData = false; // Flag um UI-Überschreibung zu verhindern
		this.lastDataChecksum = null; // Für Change-Detection
		this.autoSaveTimeout = null; // Für verzögertes Auto-Save

		// Global verfügbar machen
		window.isApplyingServerData = false;
	}

	/**
	 * Aktualisiert die UI-Elemente basierend auf den aktuellen Hangar-Daten
	 * @private
	 */
	updateUIElements() {
		console.log("Aktualisiere UI-Elemente...");

		try {
			// Aktualisierung über hangarUI falls verfügbar
			if (window.hangarUI && typeof window.hangarUI.refreshUI === "function") {
				window.hangarUI.refreshUI();
				console.log("UI über hangarUI.refreshUI aktualisiert");
				return true;
			}

			// Fallback: Manuelle UI-Aktualisierung
			console.log("Verwende Fallback UI-Aktualisierung");

			// Ereignis auslösen für die Gesamtaktualisierung
			document.dispatchEvent(new CustomEvent("uiDataRefreshed"));
			console.log("UI-Elemente wurden aktualisiert");
			return true;
		} catch (error) {
			console.error("Fehler bei der UI-Aktualisierung:", error);
			return false;
		}
	}

	/**
	 * Stellt eine Synchronisationsfunktion bereit und registriert sie bei window.hangarData
	 * @private
	 */
	ensureApplyFunction() {
		if (!window.hangarData) {
			window.hangarData = {};
		}

		// Prüfe ob die Funktion fehlt und stelle sie bereit falls nötig
		// Überschreibe nicht die existierende Funktion aus hangar-data.js
		if (typeof window.hangarData.applyLoadedHangarPlan !== "function") {
			console.log("applyLoadedHangarPlan-Funktion wird erstellt");
			window.hangarData.applyLoadedHangarPlan = (projectData) => {
				return this.applyProjectData(projectData);
			};
			console.log("applyLoadedHangarPlan-Funktion erstellt und registriert");
		} else {
			console.log(
				"applyLoadedHangarPlan-Funktion bereits vorhanden, verwende bestehende"
			);
		}
	}

	/**
	 * Wendet Projektdaten auf die Anwendung an
	 * @param {Object} projectData - Die zu anwendenden Projektdaten
	 * @returns {boolean} Erfolg der Anwendung
	 */
	applyProjectData(projectData) {
		try {
			console.log("Wende geladene Daten auf Anwendung an...", projectData);

			if (!projectData) {
				throw new Error("Keine Projektdaten übergeben");
			}

			// Prüfe, ob die hangarData.applyLoadedHangarPlan Funktion existiert
			if (
				window.hangarData &&
				typeof window.hangarData.applyLoadedHangarPlan === "function" &&
				window.hangarData.applyLoadedHangarPlan !== this.applyProjectData
			) {
				console.log("Verwende hangarData.applyLoadedHangarPlan");
				return window.hangarData.applyLoadedHangarPlan(projectData);
			}

			// Fallback: Manuelle Anwendung der Daten
			console.log("Verwende Fallback-Implementierung");

			// Projektname setzen
			if (projectData.metadata && projectData.metadata.projectName) {
				const projectNameInput = document.getElementById("projectName");
				if (projectNameInput) {
					projectNameInput.value = projectData.metadata.projectName;
					console.log("Projektname gesetzt:", projectData.metadata.projectName);
				}
			}

			// Einstellungen anwenden
			if (projectData.settings) {
				this.applySettings(projectData.settings);
			}

			// Kacheldaten anwenden (unterstützt beide Formate)
			if (projectData.primaryTiles || projectData.secondaryTiles) {
				// Neues Format mit separaten Arrays
				this.applyTilesData(projectData);
			} else if (
				projectData.tilesData &&
				Array.isArray(projectData.tilesData)
			) {
				// Altes Format mit einem Array
				this.applyTilesData(projectData.tilesData);
			}

			// UI aktualisieren
			setTimeout(() => this.updateUIElements(), 500);

			// Ereignis auslösen, um andere Komponenten zu informieren
			const event = new CustomEvent("projectDataChanged", {
				detail: projectData,
			});
			document.dispatchEvent(event);

			console.log("Projektdaten erfolgreich angewendet");

			if (window.showNotification) {
				window.showNotification("Daten vom Server synchronisiert", "success");
			}

			return true;
		} catch (error) {
			console.error("Fehler beim Anwenden der Projektdaten:", error);
			return false;
		}
	}

	/**
	 * Wendet Einstellungen an
	 * @param {Object} settings - Einstellungsobjekt
	 */
	applySettings(settings) {
		try {
			console.log("Wende Einstellungen an:", settings);

			// Kachelanzahl setzen
			if (settings.tilesCount) {
				const tilesCountInput = document.getElementById("tilesCount");
				if (tilesCountInput) {
					tilesCountInput.value = settings.tilesCount;
				}
			}

			// Sekundäre Kachelanzahl setzen
			if (settings.secondaryTilesCount !== undefined) {
				const secondaryTilesCountInput = document.getElementById(
					"secondaryTilesCount"
				);
				if (secondaryTilesCountInput) {
					secondaryTilesCountInput.value = settings.secondaryTilesCount;
				}
			}

			// Layout-Typ setzen
			if (settings.layout) {
				const layoutTypeInput = document.getElementById("layoutType");
				if (layoutTypeInput) {
					layoutTypeInput.value = settings.layout;
				}
			}

			// UI-Einstellungen anwenden, falls hangarUI verfügbar ist
			if (window.hangarUI && window.hangarUI.uiSettings) {
				if (settings.tilesCount)
					window.hangarUI.uiSettings.tilesCount = settings.tilesCount;
				if (settings.secondaryTilesCount !== undefined)
					window.hangarUI.uiSettings.secondaryTilesCount =
						settings.secondaryTilesCount;
				if (settings.layout)
					window.hangarUI.uiSettings.layout = settings.layout;

				if (typeof window.hangarUI.uiSettings.apply === "function") {
					window.hangarUI.uiSettings.apply();
				}
			}

			console.log("Einstellungen erfolgreich angewendet");
		} catch (error) {
			console.error("Fehler beim Anwenden der Einstellungen:", error);
		}
	}

	/**
	 * Wendet Kacheldaten an
	 * @param {Array|Object} tilesData - Array mit Kacheldaten oder Objekt mit primaryTiles/secondaryTiles
	 */
	applyTilesData(tilesData) {
		try {
			console.log("Wende Kacheldaten an:", tilesData);

			// Format prüfen und normalisieren
			let primaryTiles = [];
			let secondaryTiles = [];

			// Neues Format: Objekt mit primaryTiles/secondaryTiles
			if (
				tilesData &&
				typeof tilesData === "object" &&
				!Array.isArray(tilesData)
			) {
				if (tilesData.primaryTiles && Array.isArray(tilesData.primaryTiles)) {
					primaryTiles = tilesData.primaryTiles;
				}
				if (
					tilesData.secondaryTiles &&
					Array.isArray(tilesData.secondaryTiles)
				) {
					secondaryTiles = tilesData.secondaryTiles;
				}
			}
			// Altes Format: Direkt ein Array - aufteilen nach Tile IDs
			else if (Array.isArray(tilesData)) {
				tilesData.forEach((tile) => {
					if (tile.tileId >= 101) {
						secondaryTiles.push(tile);
					} else {
						primaryTiles.push(tile);
					}
				});
			}

			console.log("Primary tiles zu anwenden:", primaryTiles.length);
			console.log("Secondary tiles zu anwenden:", secondaryTiles.length);

			// Primary Tiles anwenden
			primaryTiles.forEach((tileData) => {
				this.applySingleTileData(tileData);
			});

			// Secondary Tiles - sicherstellen, dass sie existieren, bevor wir sie anwenden
			if (secondaryTiles.length > 0) {
				// Prüfen ob Secondary Grid existiert
				const secondaryGrid = document.getElementById("secondaryHangarGrid");
				if (!secondaryGrid || secondaryGrid.children.length === 0) {
					console.log("Secondary tiles existieren noch nicht, erstelle sie...");

					// Anzahl der secondary tiles in den Einstellungen setzen
					const secondaryTilesCount = Math.max(
						secondaryTiles.length,
						parseInt(document.getElementById("secondaryTilesCount")?.value) || 0
					);
					const secondaryTilesCountInput = document.getElementById(
						"secondaryTilesCount"
					);
					if (secondaryTilesCountInput) {
						secondaryTilesCountInput.value = secondaryTilesCount;
					}

					// Temporär die localStorage-Wiederherstellung deaktivieren während UI-Update
					const originalFlag = window.isApplyingServerData;
					window.isApplyingServerData = true;

					// UI neu aufbauen falls hangarUI verfügbar
					if (
						window.hangarUI &&
						typeof window.hangarUI.updateSecondaryTiles === "function"
					) {
						window.hangarUI.updateSecondaryTiles();
					}

					// Flag nach UI-Update zurücksetzen
					window.isApplyingServerData = originalFlag;

					// Kurz warten bis UI erstellt ist, dann erneut versuchen
					setTimeout(() => {
						console.log("Versuche Secondary Tiles erneut anzuwenden...");
						secondaryTiles.forEach((tileData) => {
							this.applySingleTileData(tileData);
						});
					}, 500);
				} else {
					// Secondary tiles direkt anwenden
					secondaryTiles.forEach((tileData) => {
						this.applySingleTileData(tileData);
					});
				}
			}

			console.log("Kacheldaten erfolgreich angewendet");
		} catch (error) {
			console.error("Fehler beim Anwenden der Kacheldaten:", error);
		}
	}

	/**
	 * Anwenden einer einzelnen Kachel-Daten
	 * @param {Object} tileData - Die Daten einer einzelnen Kachel
	 */
	applySingleTileData(tileData) {
		if (!tileData.tileId) return;

		console.log(`Wende Daten für Tile ${tileData.tileId} an:`, tileData);

		// Debug: Spezifisches Logging für Tow Status
		if (tileData.towStatus) {
			console.log(
				`Debug: Tile ${tileData.tileId} hat towStatus: ${tileData.towStatus}`
			);
		}

		// Position setzen
		if (tileData.position) {
			const positionInput = document.getElementById(
				`hangar-position-${tileData.tileId}`
			);
			if (positionInput) {
				positionInput.value = tileData.position;
			} else {
				console.warn(
					`Position Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Aircraft ID setzen
		if (tileData.aircraftId) {
			const aircraftInput = document.getElementById(
				`aircraft-${tileData.tileId}`
			);
			if (aircraftInput) {
				aircraftInput.value = tileData.aircraftId;
			} else {
				console.warn(
					`Aircraft Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Manuelle Eingabe setzen
		if (tileData.manualInput) {
			const manualInput = document.getElementById(
				`manual-input-${tileData.tileId}`
			);
			if (manualInput) {
				manualInput.value = tileData.manualInput;
			}
		}

		// Notizen setzen
		if (tileData.notes) {
			const notesInput = document.getElementById(`notes-${tileData.tileId}`);
			if (notesInput) {
				notesInput.value = tileData.notes;
			} else {
				console.warn(`Notes Input für Tile ${tileData.tileId} nicht gefunden`);
			}
		}

		// Status setzen
		if (tileData.status) {
			const statusInput = document.getElementById(`status-${tileData.tileId}`);
			if (statusInput) {
				statusInput.value = tileData.status;
			} else {
				console.warn(`Status Input für Tile ${tileData.tileId} nicht gefunden`);
			}
		}

		// Schlepp-Status setzen (auch für neutrale oder leere Werte)
		if (tileData.towStatus !== undefined) {
			const towInput = document.getElementById(`tow-status-${tileData.tileId}`);
			if (towInput) {
				towInput.value = tileData.towStatus || "neutral";
				// Auch die visuellen Styles aktualisieren
				if (typeof updateTowStatusStyles === "function") {
					updateTowStatusStyles(towInput);
				}
				console.log(
					`Tow Status für Tile ${tileData.tileId} gesetzt: ${
						tileData.towStatus || "neutral"
					}`
				);
			} else {
				console.warn(
					`Tow Status Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Arrival Time setzen
		if (tileData.arrivalTime && tileData.arrivalTime !== "--:--") {
			const arrivalElement = document.getElementById(
				`arrival-time-${tileData.tileId}`
			);
			if (arrivalElement) {
				arrivalElement.textContent = tileData.arrivalTime;
			}
		}

		// Departure Time setzen
		if (tileData.departureTime && tileData.departureTime !== "--:--") {
			const departureElement = document.getElementById(
				`departure-time-${tileData.tileId}`
			);
			if (departureElement) {
				departureElement.textContent = tileData.departureTime;
			}
		}

		// Flugzeiten automatisch im localStorage speichern
		if (typeof window.saveFlightTimesToLocalStorage === "function") {
			window.saveFlightTimesToLocalStorage(
				tileData.tileId,
				tileData.arrivalTime || "--:--",
				tileData.departureTime || "--:--"
			);
		}
	}

	/**
	 * Ermöglicht die Synchronisation über einen Webserver
	 * @param {boolean} activate - Aktiviert die Server-Synchronisation
	 * @param {string} serverUrl - URL zum Server-Endpunkt (z.B. "https://example.com/sync/data.php")
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
				console.log(
					`Prüfe Server-Daten, letzter Sync: ${new Date(
						parseInt(lastSync)
					).toLocaleString()}`
				);

				// Daten vom Server abrufen mit Cache-Buster
				const response = await fetch(`${serverUrl}?t=${Date.now()}`, {
					method: "GET",
					headers: {
						"Cache-Control": "no-cache",
					},
				});

				if (response.ok) {
					const data = await response.json();
					console.log("Server-Daten erhalten:", data);

					// Prüfen, ob es sich um Fehlerdaten handelt
					if (data.error || !data.metadata) {
						console.log("Keine gültigen Daten vom Server erhalten");
						return;
					}

					// Prüfen, ob Daten neuer sind
					const serverTimestamp = data.metadata.timestamp || 0;
					const lastSyncTimestamp = parseInt(lastSync);

					console.log(
						`Zeitstempel-Vergleich: Server=${new Date(
							serverTimestamp
						).toLocaleString()}, Lokal=${new Date(
							lastSyncTimestamp
						).toLocaleString()}`
					);

					if (serverTimestamp > lastSyncTimestamp) {
						console.log("Neue Daten vom Server erkannt, wende sie an...");

						// Flag setzen um zu verhindern, dass Auto-Sync diese Änderung wieder überschreibt
						this.isApplyingServerData = true;

						// Global verfügbar machen für andere Module
						window.isApplyingServerData = true;

						// Daten anwenden
						this.ensureApplyFunction();
						if (
							window.hangarData &&
							typeof window.hangarData.applyLoadedHangarPlan === "function"
						) {
							const success = window.hangarData.applyLoadedHangarPlan(data);

							if (success) {
								// Timestamp aktualisieren
								localStorage.setItem(syncKey, serverTimestamp.toString());
								console.log("Synchronisation erfolgreich abgeschlossen");

								// Checksum der aktuellen Daten aktualisieren
								this.updateDataChecksum();

								if (window.showNotification) {
									window.showNotification(
										"Neue Daten vom Server synchronisiert",
										"info"
									);
								}

								// Flag nach kurzer Verzögerung zurücksetzen
								setTimeout(() => {
									this.isApplyingServerData = false;
									window.isApplyingServerData = false;
								}, 2000);
							} else {
								console.error("Fehler beim Anwenden der Server-Daten");
								this.isApplyingServerData = false;
								window.isApplyingServerData = false;
							}
						} else {
							console.error("applyLoadedHangarPlan-Funktion nicht verfügbar");
							this.isApplyingServerData = false;
							window.isApplyingServerData = false;
						}
					} else {
						console.log("Server-Daten sind nicht neuer als lokale Daten");
					}
				} else if (response.status === 404) {
					console.log("Noch keine Daten auf dem Server gespeichert");
				} else {
					console.warn(
						"Server-Abfrage fehlgeschlagen:",
						response.status,
						response.statusText
					);
				}
			} catch (error) {
				// Netzwerkfehler sind normal und sollten nicht störend sein
				console.log(
					"Server nicht erreichbar oder Netzwerkfehler:",
					error.message
				);
			}
		};

		// Initiale Synchronisation nur wenn Auto-Sync aktiv
		if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
			downloadData();

			// Regelmäßige Synchronisation (reduziert auf 10 Sekunden für bessere Responsivität)
			this.serverSyncInterval = setInterval(downloadData, 10000);
			console.log("Automatische Server-Synchronisation aktiviert");
		} else {
			console.log("Server-URL konfiguriert, aber Auto-Sync ist deaktiviert");
		}

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

		buttonContainer.appendChild(saveButton);

		// Auto-Sync Checkbox in der UI hinzufügen (Zwei-Spalten-Design)
		const autoSyncContainer = document.createElement("div");
		autoSyncContainer.className = "flex justify-between items-center mt-2 mb-2";

		// Linke Spalte: Label
		const autoSyncLabelContainer = document.createElement("div");
		autoSyncLabelContainer.className = "flex-1";

		const autoSyncLabel = document.createElement("label");
		autoSyncLabel.htmlFor = "server-auto-sync";
		autoSyncLabel.textContent = "Auto-Sync:";
		autoSyncLabel.className = "text-xs font-medium";

		autoSyncLabelContainer.appendChild(autoSyncLabel);

		// Rechte Spalte: Checkbox
		const autoSyncInputContainer = document.createElement("div");
		autoSyncInputContainer.className = "flex-1 flex justify-end";

		const autoSyncCheckbox = document.createElement("input");
		autoSyncCheckbox.type = "checkbox";
		autoSyncCheckbox.id = "server-auto-sync";
		autoSyncCheckbox.className = "mr-0";
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

		autoSyncInputContainer.appendChild(autoSyncCheckbox);

		autoSyncContainer.appendChild(autoSyncLabelContainer);
		autoSyncContainer.appendChild(autoSyncInputContainer);

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

		// Info-Text
		const infoText = document.createElement("p");
		infoText.textContent = "Synchronisierung mit dem Webserver ist aktiv";
		infoText.className = "text-xs text-gray-500 mt-2";

		// Alles zum Container hinzufügen
		this.containerElement.innerHTML = ""; // Container leeren
		this.containerElement.appendChild(title);
		this.containerElement.appendChild(buttonContainer);
		this.containerElement.appendChild(autoSyncContainer);
		this.containerElement.appendChild(serverSyncStatus);
		this.containerElement.appendChild(infoText);
	}

	/**
	 * Speichert das aktuelle Projekt in den festen Speicherort
	 */
	async saveCurrentProject() {
		try {
			// Prüfen, ob gerade Server-Daten angewendet werden
			if (this.isApplyingServerData) {
				console.log(
					"Speichern übersprungen: Server-Daten werden gerade angewendet"
				);
				return;
			}

			// Prüfen, ob sich die Daten tatsächlich geändert haben
			if (!this.hasDataChanged()) {
				console.log("Speichern übersprungen: Keine Datenänderung erkannt");
				return;
			}

			// Projektdaten mit der zentralen Sammelfunktion abrufen
			const projectData = this.collectCurrentProjectData();

			if (!projectData) {
				throw new Error("Keine Projektdaten gefunden");
			}

			// Wenn Auto-Sync aktiviert ist, zum Server hochladen
			if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
				await this.saveToServer(projectData);
				// Prüfsumme nach erfolgreichem Speichern aktualisieren
				this.updateDataChecksum();
			}

			if (window.showNotification) {
				window.showNotification(
					`Projekt "${projectData.metadata.projectName}" gespeichert`,
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
	 * Zentrale Funktion zum Sammeln aller aktuellen Projektdaten
	 * @returns {Object|null} Projektdaten oder null bei Fehler
	 */
	collectCurrentProjectData() {
		try {
			// Projektname aus Eingabefeld abrufen oder Standardwert verwenden
			const projectNameInput = document.getElementById("projectName");
			const projectName = projectNameInput?.value?.trim() || "HangarPlan";

			// Verwende die existierende collectAllHangarData Funktion falls verfügbar
			if (
				window.collectAllHangarData &&
				typeof window.collectAllHangarData === "function"
			) {
				const data = window.collectAllHangarData();
				if (data && data.metadata) {
					data.metadata.projectName = projectName;
					data.metadata.lastSaved = new Date().toISOString();
					data.metadata.timestamp = Date.now();
				}
				console.log("Projektdaten gesammelt über collectAllHangarData:", data);
				return data;
			}

			// Fallback: Manuell sammeln wenn collectAllHangarData nicht verfügbar
			const projectData = {
				metadata: {
					projectName: projectName,
					lastSaved: new Date().toISOString(),
					timestamp: Date.now(),
				},
				settings: this.collectSettingsData(),
				primaryTiles: this.collectPrimaryTilesData(),
				secondaryTiles: this.collectSecondaryTilesData(),
			};

			console.log("Projektdaten gesammelt über Fallback-Methode:", projectData);
			return projectData;
		} catch (error) {
			console.error("Fehler beim Sammeln der Projektdaten:", error);
			return null;
		}
	}

	/**
	 * Sammelt Einstellungsdaten
	 * @returns {Object} Einstellungsobjekt
	 */
	collectSettingsData() {
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
	 * Sammelt alle Kacheldaten
	 * @returns {Array} Array mit allen Kacheldaten (für Backward Compatibility)
	 */
	collectAllTilesData() {
		const tiles = [];
		tiles.push(...this.collectPrimaryTilesData());
		tiles.push(...this.collectSecondaryTilesData());
		return tiles;
	}

	/**
	 * Sammelt Daten der primären Kacheln
	 * @returns {Array} Array mit primären Kacheldaten
	 */
	collectPrimaryTilesData() {
		const tiles = [];
		document
			.querySelectorAll("#hangarGrid .hangar-cell")
			.forEach((cell, index) => {
				const cellId = index + 1;
				const tileData = this.collectSingleTileData(cellId, false);
				if (tileData) tiles.push(tileData);
			});
		return tiles;
	}

	/**
	 * Sammelt Daten der sekundären Kacheln
	 * @returns {Array} Array mit sekundären Kacheldaten
	 */
	collectSecondaryTilesData() {
		const tiles = [];
		document
			.querySelectorAll("#secondaryHangarGrid .hangar-cell")
			.forEach((cell, index) => {
				const cellId = 101 + index;
				const tileData = this.collectSingleTileData(cellId, true);
				if (tileData) tiles.push(tileData);
			});
		return tiles;
	}

	/**
	 * Sammelt Daten einer einzelnen Kachel
	 * @param {number} cellId - ID der Kachel
	 * @param {boolean} isSecondary - Ob es eine sekundäre Kachel ist
	 * @returns {Object|null} Kacheldaten oder null
	 */
	collectSingleTileData(cellId, isSecondary = false) {
		try {
			return {
				tileId: cellId,
				aircraftId: document.getElementById(`aircraft-${cellId}`)?.value || "",
				position:
					document.getElementById(`hangar-position-${cellId}`)?.value || "",
				manualInput:
					document.querySelector(`#manual-input-${cellId}`)?.value || "",
				notes: document.getElementById(`notes-${cellId}`)?.value || "",
				status: document.getElementById(`status-${cellId}`)?.value || "ready",
				towStatus:
					document.getElementById(`tow-status-${cellId}`)?.value || "neutral",
				arrivalTime:
					document
						.getElementById(`arrival-time-${cellId}`)
						?.textContent?.trim() || "--:--",
				departureTime:
					document
						.getElementById(`departure-time-${cellId}`)
						?.textContent?.trim() || "--:--",
				isSecondary: isSecondary,
			};
		} catch (error) {
			console.warn(`Fehler beim Sammeln von Kachel ${cellId}:`, error);
			return null;
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

			// Server-Synchronisation aktivieren
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
			const serverUrl =
				this.serverSyncUrl || localStorage.getItem("hangarplanner_server_url");
			if (!serverUrl) {
				console.log("Keine Server-URL konfiguriert, überspringen...");
				return;
			}

			console.log("Speichere Daten auf dem Server:", serverUrl);

			// Timestamp hinzufügen falls noch nicht vorhanden
			if (!data.metadata) data.metadata = {};
			if (!data.metadata.timestamp) {
				data.metadata.timestamp = Date.now();
			}

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
				return true;
			} else {
				console.error("Server-Fehler:", response.status);
				if (window.showNotification) {
					window.showNotification("Server-Synchronisationsfehler", "error");
				}
				return false;
			}
		} catch (error) {
			console.error("Fehler beim Speichern auf dem Server:", error);
			if (window.showNotification) {
				window.showNotification("Netzwerkfehler beim Speichern", "warning");
			}
			return false;
		}
	}

	/**
	 * Erstellt eine Prüfsumme der aktuellen Daten für Change-Detection
	 * @returns {string} MD5-ähnliche Prüfsumme
	 */
	createDataChecksum() {
		try {
			const projectData = this.collectCurrentProjectData();
			if (!projectData) return null;

			// Timestamp entfernen für Vergleich (weil sich dieser immer ändert)
			const dataForChecksum = { ...projectData };
			if (dataForChecksum.metadata) {
				delete dataForChecksum.metadata.timestamp;
				delete dataForChecksum.metadata.lastSaved;
			}

			const dataString = JSON.stringify(dataForChecksum);
			// Einfache Hash-Funktion
			let hash = 0;
			for (let i = 0; i < dataString.length; i++) {
				const char = dataString.charCodeAt(i);
				hash = (hash << 5) - hash + char;
				hash = hash & hash; // 32-bit integer
			}
			return hash.toString();
		} catch (error) {
			console.error("Fehler beim Erstellen der Prüfsumme:", error);
			return null;
		}
	}

	/**
	 * Aktualisiert die gespeicherte Prüfsumme der aktuellen Daten
	 */
	updateDataChecksum() {
		this.lastDataChecksum = this.createDataChecksum();
		console.log("Daten-Prüfsumme aktualisiert:", this.lastDataChecksum);
	}

	/**
	 * Prüft, ob sich die Daten seit dem letzten Check geändert haben
	 * @returns {boolean} true wenn sich Daten geändert haben
	 */
	hasDataChanged() {
		const currentChecksum = this.createDataChecksum();
		const hasChanged = currentChecksum !== this.lastDataChecksum;
		if (hasChanged) {
			console.log(
				"Datenänderung erkannt - Alte Prüfsumme:",
				this.lastDataChecksum,
				"Neue Prüfsumme:",
				currentChecksum
			);
		}
		return hasChanged;
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

		// Stelle die Apply-Funktion bereit
		this.ensureApplyFunction();

		// Initiale Prüfsumme setzen
		setTimeout(() => {
			this.updateDataChecksum();
			console.log("Initiale Daten-Prüfsumme gesetzt");
		}, 1000);

		// Auto-Save Event-Listener einrichten
		this.setupAutoSaveListeners();

		// Auto-Sync aktivieren, wenn eingestellt
		if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
			this.detectAndEnableServerSync();
		}

		// Optional: Server-Synchronisation aktivieren, wenn URL vorhanden
		const serverSyncUrl = localStorage.getItem("hangarplanner_server_url");
		if (
			serverSyncUrl &&
			localStorage.getItem("hangarplanner_auto_sync") !== "true"
		) {
			this.enableServerSync(true, serverSyncUrl);
		}

		// Automatische Event-Listener für Daten-Speicherung einrichten
		this.setupAutoSaveListeners();

		console.log("Storage Browser initialisiert");
	}

	/**
	 * Richtet Event-Listener ein für automatische Datenspeiicherung
	 */
	setupAutoSaveListeners() {
		// Event-Listener für Eingabefelder
		const setupFieldListener = (selector) => {
			document.addEventListener("input", (event) => {
				if (event.target.matches(selector)) {
					// Verzögert speichern um häufige Aufrufe zu vermeiden
					clearTimeout(this.autoSaveTimeout);
					this.autoSaveTimeout = setTimeout(() => {
						if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
							console.log(
								"Auto-Save ausgelöst durch:",
								event.target.id || event.target.className
							);
							this.saveCurrentProject();
						}
					}, 2000); // 2 Sekunden Verzögerung
				}
			});
		};

		// Verschiedene Eingabefeld-Typen überwachen
		setupFieldListener('input[id^="aircraft-"]');
		setupFieldListener('input[id^="hangar-position-"]');
		setupFieldListener('input[id^="manual-input-"]');
		setupFieldListener('textarea[id^="notes-"]');
		setupFieldListener('select[id^="status-"]');
		setupFieldListener('select[id^="tow-status-"]');
		setupFieldListener("#projectName");

		console.log("Auto-Save Event-Listener eingerichtet");
	}

	/**
	 * Debug-Funktion: Testet die Synchronisierungsfunktionalität manuell
	 */
	testSync() {
		console.log("=== SYNC DEBUG TEST ===");

		// 1. Prüfe verfügbare Funktionen
		console.log("Verfügbare Funktionen:");
		console.log(
			"- window.collectAllHangarData:",
			typeof window.collectAllHangarData
		);
		console.log(
			"- window.hangarData.applyLoadedHangarPlan:",
			typeof window.hangarData?.applyLoadedHangarPlan
		);

		// 2. Prüfe aktuellen Zustand
		console.log("Aktueller Zustand:");
		console.log("- isApplyingServerData:", this.isApplyingServerData);
		console.log("- lastDataChecksum:", this.lastDataChecksum);
		console.log("- hasDataChanged:", this.hasDataChanged());

		// 3. Sammle aktuelle Daten
		console.log("Sammle aktuelle Projektdaten...");
		const projectData = this.collectCurrentProjectData();
		console.log("Gesammelte Daten:", projectData);

		// 4. Teste Anwendung der Daten
		console.log("Teste Anwendung der Daten...");
		if (projectData) {
			const success = this.applyProjectData(projectData);
			console.log("Anwendung erfolgreich:", success);
		}

		console.log("=== SYNC DEBUG TEST ENDE ===");
	}
}

// Debug-Funktionen global verfügbar machen
window.debugSync = () => {
	if (window.storageBrowser) {
		window.storageBrowser.testSync();
	} else {
		console.error("Storage Browser nicht verfügbar");
	}
};

// Zusätzliche Debug-Funktion für Checksum-Tests
window.debugChecksum = () => {
	if (window.storageBrowser) {
		console.log("=== CHECKSUM DEBUG ===");
		console.log("Aktuelle Prüfsumme:", window.storageBrowser.lastDataChecksum);
		console.log("Neue Prüfsumme:", window.storageBrowser.createDataChecksum());
		console.log(
			"Haben sich Daten geändert:",
			window.storageBrowser.hasDataChanged()
		);
		console.log("=== CHECKSUM DEBUG ENDE ===");
	} else {
		console.error("Storage Browser nicht verfügbar");
	}
};

// Funktion zum manuellen Reset der Synchronisation
window.resetSync = () => {
	if (window.storageBrowser) {
		console.log("=== SYNC RESET ===");
		localStorage.removeItem("hangarplanner_server_sync");
		window.storageBrowser.lastDataChecksum = null;
		window.storageBrowser.isApplyingServerData = false;
		console.log("Synchronisations-Status zurückgesetzt");
		console.log("=== SYNC RESET ENDE ===");
	} else {
		console.error("Storage Browser nicht verfügbar");
	}
};

// Globale Instanz erstellen
window.storageBrowser = new StorageBrowser();

// Nach DOM-Ladung initialisieren
document.addEventListener("DOMContentLoaded", () => {
	// Verzögert initialisieren, um sicherzustellen dass andere Komponenten geladen sind
	setTimeout(() => {
		console.log("Initialisiere Storage Browser...");
		if (window.storageBrowser) {
			window.storageBrowser.initialize();
		}
	}, 2000); // Erhöht auf 2 Sekunden für bessere Kompatibilität
});

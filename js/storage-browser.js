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

			// Flag setzen, um localStorage-Wiederherstellung zu blockieren
			window.isApplyingServerData = true;

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
			setTimeout(() => {
				this.updateUIElements();
				// Flag nach Abschluss zurücksetzen
				window.isApplyingServerData = false;
			}, 500);

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
			console.log("=== WENDE KACHELDATEN AN ===");
			console.log("Eingangsdaten:", tilesData);

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
			// Altes Format: Direkt ein Array - aufteilen nach Tile IDs (VERBESSERTE LOGIK)
			else if (Array.isArray(tilesData)) {
				tilesData.forEach((tile) => {
					// Striktere Zuordnung: IDs >= 101 sind definitiv sekundär
					if (tile.tileId >= 101) {
						secondaryTiles.push(tile);
						console.log(
							`Tile ${tile.tileId} als sekundär klassifiziert (ID >= 101)`
						);
					}
					// IDs 1-12 sind primär (typischer Bereich für primäre Kacheln)
					else if (tile.tileId >= 1 && tile.tileId <= 12) {
						primaryTiles.push(tile);
						console.log(
							`Tile ${tile.tileId} als primär klassifiziert (ID 1-12)`
						);
					}
					// Unerwartete IDs - Warnung ausgeben
					else {
						console.warn(
							`❌ Unerwartete Tile ID ${tile.tileId} - wird ignoriert`
						);
					}
				});
			}

			console.log(`=== KACHELN KLASSIFIZIERT ===`);
			console.log(
				`Primary tiles zu anwenden: ${primaryTiles.length}`,
				primaryTiles
			);
			console.log(
				`Secondary tiles zu anwenden: ${secondaryTiles.length}`,
				secondaryTiles
			);

			// Primary Tiles anwenden - mit Container-Existenz-Prüfung
			const primaryContainer = document.querySelector("#hangarGrid");
			if (primaryContainer && primaryTiles.length > 0) {
				console.log("=== ANWENDEN DER PRIMÄREN KACHELN ===");
				primaryTiles.forEach((tileData, index) => {
					console.log(
						`Wende primäre Kachel ${index + 1}/${primaryTiles.length} an:`,
						tileData
					);

					// Zusätzliche Validierung - sicherstellen, dass die Tile ID im primären Bereich liegt
					if (tileData.tileId >= 1 && tileData.tileId <= 12) {
						this.applySingleTileData(tileData);
					} else {
						console.error(
							`❌ FEHLER: Primäre Kachel mit ungültiger ID ${tileData.tileId} wird übersprungen`
						);
					}
				});
			} else if (primaryTiles.length > 0) {
				console.warn(
					"❌ Primary Container nicht gefunden, aber primary tiles vorhanden"
				);
			}

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
						console.log("=== ANWENDEN DER SEKUNDÄREN KACHELN (VERZÖGERT) ===");
						secondaryTiles.forEach((tileData, index) => {
							console.log(
								`Wende sekundäre Kachel ${index + 1}/${
									secondaryTiles.length
								} an:`,
								tileData
							);

							// Zusätzliche Validierung - sicherstellen, dass die Tile ID im sekundären Bereich liegt
							if (tileData.tileId >= 101) {
								this.applySingleTileData(tileData);
							} else {
								console.error(
									`❌ FEHLER: Sekundäre Kachel mit ungültiger ID ${tileData.tileId} wird übersprungen`
								);
							}
						});
					}, 500);
				} else {
					// Secondary tiles direkt anwenden
					console.log("=== ANWENDEN DER SEKUNDÄREN KACHELN ===");
					secondaryTiles.forEach((tileData, index) => {
						console.log(
							`Wende sekundäre Kachel ${index + 1}/${
								secondaryTiles.length
							} an:`,
							tileData
						);

						// Zusätzliche Validierung - sicherstellen, dass die Tile ID im sekundären Bereich liegt
						if (tileData.tileId >= 101) {
							this.applySingleTileData(tileData);
						} else {
							console.error(
								`❌ FEHLER: Sekundäre Kachel mit ungültiger ID ${tileData.tileId} wird übersprungen`
							);
						}
					});
				}
			}

			console.log("=== KACHELDATEN ERFOLGREICH ANGEWENDET ===");
		} catch (error) {
			console.error("❌ Fehler beim Anwenden der Kacheldaten:", error);
		}
	}

	/**
	 * Anwenden einer einzelnen Kachel-Daten
	 * @param {Object} tileData - Die Daten einer einzelnen Kachel
	 */
	applySingleTileData(tileData) {
		if (!tileData.tileId) return;

		console.log(`=== ANWENDEN DER DATEN FÜR TILE ${tileData.tileId} ===`);
		console.log("TileData:", tileData);

		// WICHTIG: Validation - sekundäre Kacheln haben IDs >= 101, primäre IDs 1-12
		const isSecondaryByTileId = tileData.tileId >= 101;
		const expectedContainer = isSecondaryByTileId
			? "#secondaryHangarGrid"
			: "#hangarGrid";
		const containerElement = document.querySelector(expectedContainer);

		if (!containerElement) {
			console.warn(
				`❌ Container ${expectedContainer} nicht gefunden für Tile ${tileData.tileId}`
			);
			return;
		}

		// Container-basierte Validation - stelle sicher, dass das Element in der richtigen Sektion existiert
		const aircraftInput = document.getElementById(
			`aircraft-${tileData.tileId}`
		);
		if (aircraftInput) {
			const isInExpectedContainer = containerElement.contains(aircraftInput);
			if (!isInExpectedContainer) {
				console.error(
					`❌ KRITISCHER MAPPING FEHLER: Element aircraft-${tileData.tileId} wurde gefunden, aber ist NICHT im erwarteten Container ${expectedContainer}!`
				);
				return;
			}
		}

		// Debug: Spezifisches Logging für Tow Status
		if (tileData.towStatus) {
			console.log(
				`Debug: Tile ${tileData.tileId} hat towStatus: ${tileData.towStatus}`
			);
		}

		// Position setzen - mit Container-Validation
		if (tileData.position) {
			const positionInput = document.getElementById(
				`hangar-position-${tileData.tileId}`
			);
			if (positionInput && containerElement.contains(positionInput)) {
				positionInput.value = tileData.position;
				console.log(
					`✅ Position für Tile ${tileData.tileId} gesetzt: ${tileData.position}`
				);
			} else if (positionInput) {
				console.warn(
					`❌ Position Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(
					`Position Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Aircraft ID setzen - mit Container-Validation
		if (tileData.aircraftId) {
			if (aircraftInput && containerElement.contains(aircraftInput)) {
				aircraftInput.value = tileData.aircraftId;
				console.log(
					`✅ Aircraft ID für Tile ${tileData.tileId} gesetzt: ${tileData.aircraftId}`
				);
			} else if (aircraftInput) {
				console.warn(
					`❌ Aircraft Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(
					`Aircraft Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Manuelle Eingabe setzen - mit Container-Validation
		if (tileData.manualInput) {
			const manualInput = document.getElementById(
				`manual-input-${tileData.tileId}`
			);
			if (manualInput && containerElement.contains(manualInput)) {
				manualInput.value = tileData.manualInput;
				console.log(
					`✅ Manual Input für Tile ${tileData.tileId} gesetzt: ${tileData.manualInput}`
				);
			}
		}

		// Notizen setzen - mit Container-Validation
		if (tileData.notes) {
			const notesInput = document.getElementById(`notes-${tileData.tileId}`);
			if (notesInput && containerElement.contains(notesInput)) {
				notesInput.value = tileData.notes;
				console.log(
					`✅ Notes für Tile ${tileData.tileId} gesetzt: ${tileData.notes}`
				);
			} else if (notesInput) {
				console.warn(
					`❌ Notes Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(`Notes Input für Tile ${tileData.tileId} nicht gefunden`);
			}
		}

		// Status setzen - mit Container-Validation
		if (tileData.status) {
			const statusInput = document.getElementById(`status-${tileData.tileId}`);
			if (statusInput && containerElement.contains(statusInput)) {
				statusInput.value = tileData.status;
				console.log(
					`✅ Status für Tile ${tileData.tileId} gesetzt: ${tileData.status}`
				);
			} else if (statusInput) {
				console.warn(
					`❌ Status Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(`Status Input für Tile ${tileData.tileId} nicht gefunden`);
			}
		}

		// Schlepp-Status setzen (auch für neutrale oder leere Werte) - mit Container-Validation
		if (tileData.towStatus !== undefined) {
			const towInput = document.getElementById(`tow-status-${tileData.tileId}`);
			if (towInput && containerElement.contains(towInput)) {
				towInput.value = tileData.towStatus || "neutral";
				// Auch die visuellen Styles aktualisieren
				if (typeof updateTowStatusStyles === "function") {
					updateTowStatusStyles(towInput);
				}
				console.log(
					`✅ Tow Status für Tile ${tileData.tileId} gesetzt: ${
						tileData.towStatus || "neutral"
					}`
				);
			} else if (towInput) {
				console.warn(
					`❌ Tow Status Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(
					`Tow Status Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Arrival Time setzen - mit Container-Validation
		if (tileData.arrivalTime && tileData.arrivalTime !== "--:--") {
			const arrivalElement = document.getElementById(
				`arrival-time-${tileData.tileId}`
			);
			if (arrivalElement && containerElement.contains(arrivalElement)) {
				arrivalElement.value = tileData.arrivalTime;
				console.log(
					`✅ Arrival Time für Tile ${tileData.tileId} gesetzt: ${tileData.arrivalTime}`
				);
			} else if (arrivalElement) {
				console.warn(
					`❌ Arrival Time Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(
					`Arrival Time Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Departure Time setzen - mit Container-Validation
		if (tileData.departureTime && tileData.departureTime !== "--:--") {
			const departureElement = document.getElementById(
				`departure-time-${tileData.tileId}`
			);
			if (departureElement && containerElement.contains(departureElement)) {
				departureElement.value = tileData.departureTime;
				console.log(
					`✅ Departure Time für Tile ${tileData.tileId} gesetzt: ${tileData.departureTime}`
				);
			} else if (departureElement) {
				console.warn(
					`❌ Departure Time Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(
					`Departure Time Input für Tile ${tileData.tileId} nicht gefunden`
				);
			}
		}

		// Position (Info-Grid) setzen - mit Container-Validation
		if (tileData.positionInfoGrid) {
			const positionInfoElement = document.getElementById(
				`position-${tileData.tileId}`
			);
			if (
				positionInfoElement &&
				containerElement.contains(positionInfoElement)
			) {
				positionInfoElement.value = tileData.positionInfoGrid;
				console.log(
					`✅ Position Info-Grid für Tile ${tileData.tileId} gesetzt: ${tileData.positionInfoGrid}`
				);
			} else if (positionInfoElement) {
				console.warn(
					`❌ Position Info-Grid Input für Tile ${tileData.tileId} ist nicht im erwarteten Container`
				);
			} else {
				console.warn(
					`Position Info-Grid Input für Tile ${tileData.tileId} nicht gefunden`
				);
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

		console.log(
			`=== ANWENDEN ABGESCHLOSSEN FÜR TILE ${tileData.tileId} (Container: ${expectedContainer}) ===`
		);
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

			console.log("Datenänderung erkannt, starte Speichervorgang...");

			// Projektdaten mit der zentralen Sammelfunktion abrufen
			const projectData = this.collectCurrentProjectData();

			if (!projectData) {
				throw new Error("Keine Projektdaten gefunden");
			}

			console.log("Projektdaten gesammelt für Speicherung:", projectData);

			// Wenn Auto-Sync aktiviert ist, zum Server hochladen
			if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
				console.log("Auto-Sync ist aktiviert, lade zum Server hoch...");
				const serverSaveSuccess = await this.saveToServer(projectData);

				if (serverSaveSuccess) {
					// Prüfsumme nach erfolgreichem Speichern aktualisieren
					this.updateDataChecksum();
					console.log("Server-Speicherung erfolgreich, Prüfsumme aktualisiert");
				} else {
					console.warn("Server-Speicherung fehlgeschlagen");
				}
			} else {
				// Auch ohne Server-Sync die Prüfsumme aktualisieren
				this.updateDataChecksum();
				console.log("Lokale Prüfsumme aktualisiert (kein Server-Sync)");
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
		const container = document.querySelector("#hangarGrid");
		if (!container) {
			console.warn("Primary hangar grid container nicht gefunden");
			return tiles;
		}

		document
			.querySelectorAll("#hangarGrid .hangar-cell")
			.forEach((cell, index) => {
				// Ignoriere versteckte Kacheln
				if (cell.classList.contains("hidden")) {
					console.log(`Primäre Kachel ${index} übersprungen (versteckt)`);
					return;
				}

				const cellId = index + 1;

				// Container-Validation: Prüfe, ob das aircraft-Element wirklich im primary container ist
				const aircraftElement = document.getElementById(`aircraft-${cellId}`);
				if (aircraftElement && !container.contains(aircraftElement)) {
					console.error(
						`❌ KRITISCHER FEHLER: Element aircraft-${cellId} ist NICHT im Primary Container!`
					);
					return; // Skip diese Kachel
				}

				const tileData = this.collectSingleTileData(cellId, false);
				if (tileData) {
					console.log(`✅ Gesammelte primäre Kachel ${cellId}:`, tileData);
					tiles.push(tileData);
				}
			});

		console.log(
			`=== PRIMARY TILES SAMMLUNG ABGESCHLOSSEN: ${tiles.length} Kacheln ===`
		);
		return tiles;
	}

	/**
	 * Sammelt Daten der sekundären Kacheln
	 * @returns {Array} Array mit sekundären Kacheldaten
	 */
	collectSecondaryTilesData() {
		const tiles = [];
		const container = document.querySelector("#secondaryHangarGrid");
		if (!container) {
			console.warn("Secondary hangar grid container nicht gefunden");
			return tiles;
		}

		document
			.querySelectorAll("#secondaryHangarGrid .hangar-cell")
			.forEach((cell, index) => {
				// Ignoriere versteckte Kacheln
				if (cell.classList.contains("hidden")) {
					console.log(`Sekundäre Kachel ${index} übersprungen (versteckt)`);
					return;
				}

				const cellId = 101 + index;

				// Container-Validation: Prüfe, ob das aircraft-Element wirklich im secondary container ist
				const aircraftElement = document.getElementById(`aircraft-${cellId}`);
				if (aircraftElement && !container.contains(aircraftElement)) {
					console.error(
						`❌ KRITISCHER FEHLER: Element aircraft-${cellId} ist NICHT im Secondary Container!`
					);
					return; // Skip diese Kachel
				}

				const tileData = this.collectSingleTileData(cellId, true);
				if (tileData) {
					console.log(`✅ Gesammelte sekundäre Kachel ${cellId}:`, tileData);
					tiles.push(tileData);
				}
			});

		console.log(
			`=== SECONDARY TILES SAMMLUNG ABGESCHLOSSEN: ${tiles.length} Kacheln ===`
		);
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
			// Container-Validation: Bestimme den erwarteten Container
			const expectedContainer = isSecondary
				? "#secondaryHangarGrid"
				: "#hangarGrid";
			const containerElement = document.querySelector(expectedContainer);

			if (!containerElement) {
				console.warn(
					`Container ${expectedContainer} nicht gefunden für Kachel ${cellId}`
				);
				return null;
			}

			// Sammle Daten nur von Elementen, die wirklich im richtigen Container sind
			const aircraftElement = document.getElementById(`aircraft-${cellId}`);
			const aircraftId =
				aircraftElement && containerElement.contains(aircraftElement)
					? aircraftElement.value || ""
					: "";

			const positionElement = document.getElementById(
				`hangar-position-${cellId}`
			);
			const position =
				positionElement && containerElement.contains(positionElement)
					? positionElement.value || ""
					: "";

			const manualInputElement = document.getElementById(
				`manual-input-${cellId}`
			);
			const manualInput =
				manualInputElement && containerElement.contains(manualInputElement)
					? manualInputElement.value || ""
					: "";

			const notesElement = document.getElementById(`notes-${cellId}`);
			const notes =
				notesElement && containerElement.contains(notesElement)
					? notesElement.value || ""
					: "";

			const statusElement = document.getElementById(`status-${cellId}`);
			const status =
				statusElement && containerElement.contains(statusElement)
					? statusElement.value || "ready"
					: "ready";

			const towStatusElement = document.getElementById(`tow-status-${cellId}`);
			const towStatus =
				towStatusElement && containerElement.contains(towStatusElement)
					? towStatusElement.value || "neutral"
					: "neutral";

			const arrivalTimeElement = document.getElementById(
				`arrival-time-${cellId}`
			);
			const arrivalTime =
				arrivalTimeElement && containerElement.contains(arrivalTimeElement)
					? arrivalTimeElement.value?.trim() || "--:--"
					: "--:--";

			const departureTimeElement = document.getElementById(
				`departure-time-${cellId}`
			);
			const departureTime =
				departureTimeElement && containerElement.contains(departureTimeElement)
					? departureTimeElement.value?.trim() || "--:--"
					: "--:--";

			const positionInfoElement = document.getElementById(`position-${cellId}`);
			const positionInfoGrid =
				positionInfoElement && containerElement.contains(positionInfoElement)
					? positionInfoElement.value || ""
					: "";

			// Debug-Logging für kritische Validierungen
			if (aircraftElement && !containerElement.contains(aircraftElement)) {
				console.error(
					`❌ VALIDATION FAILED: aircraft-${cellId} ist nicht im erwarteten Container ${expectedContainer}`
				);
			}

			const tileData = {
				tileId: cellId,
				aircraftId: aircraftId,
				position: position,
				manualInput: manualInput,
				notes: notes,
				status: status,
				towStatus: towStatus,
				arrivalTime: arrivalTime,
				departureTime: departureTime,
				positionInfoGrid: positionInfoGrid,
				isSecondary: isSecondary,
			};

			console.log(
				`Sammle Daten für Kachel ${cellId} (${
					isSecondary ? "sekundär" : "primär"
				}) aus Container ${expectedContainer}:`,
				tileData
			);
			return tileData;
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

			// Timestamp und andere zeitabhängige Felder entfernen für Vergleich
			const dataForChecksum = JSON.parse(JSON.stringify(projectData)); // Deep copy
			if (dataForChecksum.metadata) {
				delete dataForChecksum.metadata.timestamp;
				delete dataForChecksum.metadata.lastSaved;
				delete dataForChecksum.id; // ID kann sich bei jedem Sammeln ändern
			}

			// Sortiere Arrays für konsistente Prüfsummen
			if (dataForChecksum.primaryTiles) {
				dataForChecksum.primaryTiles.sort((a, b) => a.tileId - b.tileId);
			}
			if (dataForChecksum.secondaryTiles) {
				dataForChecksum.secondaryTiles.sort((a, b) => a.tileId - b.tileId);
			}

			const dataString = JSON.stringify(dataForChecksum);

			// Verbesserte Hash-Funktion
			let hash = 0;
			if (dataString.length === 0) return hash.toString();

			for (let i = 0; i < dataString.length; i++) {
				const char = dataString.charCodeAt(i);
				hash = (hash << 5) - hash + char;
				hash = hash & hash; // 32-bit integer
			}

			return Math.abs(hash).toString();
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
		} else {
			console.log("Keine Datenänderung erkannt, Prüfsumme:", currentChecksum);
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
					}, 500); // Reduziert auf 500ms für bessere Reaktivität
				}
			});
		};

		// Event-Listener für Change-Events (für Dropdowns)
		const setupChangeListener = (selector) => {
			document.addEventListener("change", (event) => {
				if (event.target.matches(selector)) {
					// Sofortiges Speichern für Dropdown-Änderungen
					if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
						console.log(
							"Auto-Save ausgelöst durch Dropdown-Änderung:",
							event.target.id || event.target.className
						);
						setTimeout(() => this.saveCurrentProject(), 100); // Sehr kurze Verzögerung
					}
				}
			});
		};

		// Verschiedene Eingabefeld-Typen überwachen (nach bewährtem Aircraft-Verfahren)
		setupFieldListener('input[id^="aircraft-"]');
		setupFieldListener('input[id^="arrival-time-"]'); // NEU: Time-Felder
		setupFieldListener('input[id^="departure-time-"]'); // NEU: Time-Felder
		setupFieldListener('input[id^="position-"]'); // NEU: Position-Felder
		setupFieldListener('input[id^="hangar-position-"]');
		setupFieldListener('input[id^="manual-input-"]');
		setupFieldListener('textarea[id^="notes-"]');
		setupFieldListener("#projectName");

		// Dropdown-Felder mit Change-Events überwachen
		setupChangeListener('select[id^="status-"]');
		setupChangeListener('select[id^="tow-status-"]');

		// Zusätzliche Event-Listener für Flugzeit-Änderungen
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "childList" ||
					mutation.type === "characterData"
				) {
					const target = mutation.target;
					if (
						target.id &&
						(target.id.includes("arrival-time-") ||
							target.id.includes("departure-time-"))
					) {
						if (localStorage.getItem("hangarplanner_auto_sync") === "true") {
							clearTimeout(this.autoSaveTimeout);
							this.autoSaveTimeout = setTimeout(() => {
								console.log(
									"Auto-Save ausgelöst durch Flugzeit-Textänderung:",
									target.id
								);
								this.saveCurrentProject();
							}, 1000);
						}
					}
				}
			});
		});

		// Observer für Flugzeit-Elemente starten
		document
			.querySelectorAll('[id^="arrival-time-"], [id^="departure-time-"]')
			.forEach((element) => {
				observer.observe(element, {
					childList: true,
					characterData: true,
					subtree: true,
				});
			});

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

	/**
	 * Debug-Funktion: Validiert Container-Zuordnungen
	 */
	validateContainerMappings() {
		console.log("=== CONTAINER MAPPING VALIDATION ===");

		// Prüfe Primary Container
		const primaryContainer = document.querySelector("#hangarGrid");
		const secondaryContainer = document.querySelector("#secondaryHangarGrid");

		console.log("Primary Container vorhanden:", !!primaryContainer);
		console.log("Secondary Container vorhanden:", !!secondaryContainer);

		if (primaryContainer) {
			const primaryCells = primaryContainer.querySelectorAll(".hangar-cell");
			console.log(`Primary Container hat ${primaryCells.length} Kacheln`);

			primaryCells.forEach((cell, index) => {
				const cellId = index + 1;
				const aircraftElement = document.getElementById(`aircraft-${cellId}`);
				const isInPrimaryContainer =
					aircraftElement && primaryContainer.contains(aircraftElement);

				console.log(
					`Primary Kachel ${cellId}: Element gefunden: ${!!aircraftElement}, Im richtigen Container: ${isInPrimaryContainer}`
				);

				if (aircraftElement && !isInPrimaryContainer) {
					console.error(
						`❌ MAPPING FEHLER: aircraft-${cellId} ist nicht im Primary Container!`
					);
				}
			});
		}

		if (secondaryContainer) {
			const secondaryCells =
				secondaryContainer.querySelectorAll(".hangar-cell");
			console.log(`Secondary Container hat ${secondaryCells.length} Kacheln`);

			secondaryCells.forEach((cell, index) => {
				const cellId = 101 + index;
				const aircraftElement = document.getElementById(`aircraft-${cellId}`);
				const isInSecondaryContainer =
					aircraftElement && secondaryContainer.contains(aircraftElement);

				console.log(
					`Secondary Kachel ${cellId}: Element gefunden: ${!!aircraftElement}, Im richtigen Container: ${isInSecondaryContainer}`
				);

				if (aircraftElement && !isInSecondaryContainer) {
					console.error(
						`❌ MAPPING FEHLER: aircraft-${cellId} ist nicht im Secondary Container!`
					);
				}
			});
		}

		console.log("=== CONTAINER MAPPING VALIDATION ENDE ===");
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

// NEUE Debug-Funktion für Container-Mapping-Validation
window.validateContainerMapping = () => {
	console.log("=== Container Mapping Validation ===");

	const primaryContainer = document.querySelector(".primary-tiles-container");
	const secondaryContainer = document.querySelector(
		".secondary-tiles-container"
	);

	if (!primaryContainer) {
		console.error("❌ Primary tiles container not found!");
		return false;
	}

	if (!secondaryContainer) {
		console.error("❌ Secondary tiles container not found!");
		return false;
	}

	console.log("✅ Both containers found");
	console.log("Primary container:", primaryContainer);
	console.log("Secondary container:", secondaryContainer);

	// Check tiles in each container
	const primaryTiles = primaryContainer.querySelectorAll(".hangar-tile");
	const secondaryTiles = secondaryContainer.querySelectorAll(".hangar-tile");

	console.log(`Primary tiles count: ${primaryTiles.length}`);
	console.log(`Secondary tiles count: ${secondaryTiles.length}`);

	// Validate no tile is in both containers
	let crossContainerIssues = 0;
	primaryTiles.forEach((tile, index) => {
		if (secondaryContainer.contains(tile)) {
			console.error(`❌ Primary tile ${index} found in secondary container!`);
			crossContainerIssues++;
		}
	});

	secondaryTiles.forEach((tile, index) => {
		if (primaryContainer.contains(tile)) {
			console.error(`❌ Secondary tile ${index} found in primary container!`);
			crossContainerIssues++;
		}
	});

	if (crossContainerIssues === 0) {
		console.log("✅ No cross-container issues found");
		return true;
	} else {
		console.error(`❌ Found ${crossContainerIssues} cross-container issues`);
		return false;
	}

	// Also call storageBrowser validation if available
	if (
		window.storageBrowser &&
		window.storageBrowser.validateContainerMappings
	) {
		window.storageBrowser.validateContainerMappings();
	}
};

// Add to helpers namespace if available
if (window.helpers) {
	window.helpers.validateContainerMapping = window.validateContainerMapping;
} else {
	window.helpers = {
		validateContainerMapping: window.validateContainerMapping,
	};
}

// NEUE Debug-Funktion für detaillierte Sync-Analyse
window.debugSyncDetailed = () => {
	console.log("=== DETAILLIERTE SYNC ANALYSE ===");

	// 1. Container-Mappings validieren
	const containerValid = window.validateContainerMapping();

	if (!containerValid) {
		console.error(
			"❌ Container-Validierung fehlgeschlagen, Analyse abgebrochen"
		);
		return;
	}

	// 2. Aktuelle Daten sammeln und anzeigen
	console.log("--- DATENSAMMLUNG ---");

	try {
		// Erstelle globale Referenzen auf die Sammelfunktionen falls nicht vorhanden
		if (typeof collectPrimaryTilesData === "undefined") {
			window.collectPrimaryTilesData = () => {
				if (
					window.storageBrowser &&
					window.storageBrowser.collectPrimaryTilesData
				) {
					return window.storageBrowser.collectPrimaryTilesData();
				}
				return [];
			};
		}

		if (typeof collectSecondaryTilesData === "undefined") {
			window.collectSecondaryTilesData = () => {
				if (
					window.storageBrowser &&
					window.storageBrowser.collectSecondaryTilesData
				) {
					return window.storageBrowser.collectSecondaryTilesData();
				}
				return [];
			};
		}

		const primaryData = collectPrimaryTilesData();
		const secondaryData = collectSecondaryTilesData();

		console.log("Primary Tiles Data:", primaryData);
		console.log("Secondary Tiles Data:", secondaryData);

		// Check for data crossover
		let dataCrossover = false;
		if (primaryData.length > 0 && secondaryData.length > 0) {
			const firstPrimaryData = JSON.stringify(primaryData[0]);
			secondaryData.forEach((secData, index) => {
				if (JSON.stringify(secData) === firstPrimaryData) {
					console.error(
						`❌ Secondary tile ${index} has identical data to first primary tile!`
					);
					dataCrossover = true;
				}
			});
		}

		if (!dataCrossover) {
			console.log("✅ No data crossover detected");
		}

		// 3. Vollständige Projektdaten wenn verfügbar
		if (
			window.storageBrowser &&
			window.storageBrowser.collectCurrentProjectData
		) {
			const fullData = window.storageBrowser.collectCurrentProjectData();
			console.log("Vollständige Projektdaten:", fullData);
		}

		console.log("=== DETAILLIERTE SYNC ANALYSE ENDE ===");

		return {
			containerValid,
			primaryData,
			secondaryData,
			dataCrossover,
		};
	} catch (error) {
		console.error("❌ Fehler bei der Sync-Analyse:", error);
		return null;
	}
};

// Add to helpers namespace if available
if (window.helpers) {
	window.helpers.debugSyncDetailed = window.debugSyncDetailed;
} else {
	if (!window.helpers) window.helpers = {};
	window.helpers.debugSyncDetailed = window.debugSyncDetailed;
}

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

// === COMPREHENSIVE DEBUG UTILITIES ===
window.hangarDebug = {
	// Validate container mapping
	validateContainerMapping: window.validateContainerMapping,

	// Detailed sync analysis
	debugSyncDetailed: window.debugSyncDetailed,

	// Quick sync check
	debugSync: () => {
		if (window.storageBrowser && window.storageBrowser.debugSync) {
			return window.storageBrowser.debugSync();
		} else {
			console.warn("debugSync nicht verfügbar, verwende vereinfachte Version");
			return window.debugSyncDetailed();
		}
	},

	// Check helper availability
	checkHelpers: () => {
		console.log("=== HELPER AVAILABILITY CHECK ===");
		console.log("window.helpers:", !!window.helpers);
		console.log(
			"window.helpers.storage:",
			!!(window.helpers && window.helpers.storage)
		);
		console.log(
			"window.helpers.storage.whenFieldsReady:",
			!!(
				window.helpers &&
				window.helpers.storage &&
				window.helpers.storage.whenFieldsReady
			)
		);
		console.log("window.storageBrowser:", !!window.storageBrowser);
		console.log("window.collectAllHangarData:", !!window.collectAllHangarData);
		console.log("=== END HELPER CHECK ===");
	},

	// Collect all current data
	collectAllData: () => {
		const result = {
			primary: [],
			secondary: [],
			full: null,
			error: null,
		};

		try {
			if (window.collectAllHangarData) {
				result.full = window.collectAllHangarData();
			}

			if (window.storageBrowser) {
				result.primary = window.storageBrowser.collectPrimaryTilesData();
				result.secondary = window.storageBrowser.collectSecondaryTilesData();
			}
		} catch (error) {
			result.error = error.message;
		}

		return result;
	},
};

// === ROBUSTE DEBUG-FUNKTIONS-VERFÜGBARKEIT ===
// Diese Funktionen stellen sicher, dass Debug-Funktionen immer verfügbar sind,
// auch wenn andere Skripte das window-Objekt überschreiben

function ensureGlobalDebugAccess() {
	// Erstelle dediziertes Debug-Objekt falls nicht vorhanden
	if (!window.hangarDebug) {
		window.hangarDebug = {};
	}

	// Stelle sicher, dass helpers.debug existiert
	if (!window.helpers) {
		window.helpers = {};
	}
	if (!window.helpers.debug) {
		window.helpers.debug = {};
	}

	// Sammle alle Debug-Funktionen
	const debugFunctions = {
		validateContainerMapping: window.validateContainerMapping,
		debugSyncDetailed: window.debugSyncDetailed,
		debugSync:
			window.debugSync ||
			(() => {
				if (window.storageBrowser && window.storageBrowser.testSync) {
					return window.storageBrowser.testSync();
				} else {
					return window.debugSyncDetailed();
				}
			}),
		debugChecksum: window.debugChecksum,
		resetSync: window.resetSync,
		checkHelpers:
			window.hangarDebug?.checkHelpers ||
			(() => {
				console.log("=== HELPER AVAILABILITY CHECK ===");
				console.log("window.helpers:", !!window.helpers);
				console.log("window.storageBrowser:", !!window.storageBrowser);
				console.log("=== END HELPER CHECK ===");
			}),
	};

	// Filtere undefined Funktionen heraus
	Object.keys(debugFunctions).forEach((key) => {
		if (typeof debugFunctions[key] !== "function") {
			delete debugFunctions[key];
		}
	});

	// Registriere unter window.hangarDebug (bevorzugter Namespace)
	Object.assign(window.hangarDebug, debugFunctions);

	// Registriere unter window.helpers.debug
	Object.assign(window.helpers.debug, debugFunctions);

	// Registriere als globale Funktionen mit robuster Eigenschaftsdefinition
	Object.keys(debugFunctions).forEach((key) => {
		try {
			// Verwende defineProperty für robuste Definition
			Object.defineProperty(window, key, {
				value: debugFunctions[key],
				writable: true,
				enumerable: false,
				configurable: true,
			});
		} catch (e) {
			// Fallback bei defineProperty-Fehlern
			window[key] = debugFunctions[key];
		}
	});

	console.log("🔧 Debug-Funktionen registriert unter:", {
		"window.hangarDebug": Object.keys(window.hangarDebug),
		"window.helpers.debug": Object.keys(window.helpers.debug),
		globals: Object.keys(debugFunctions),
	});

	return Object.keys(debugFunctions);
}

// Überwachungsfunktion für Debug-Funktionen
function monitorDebugFunctions() {
	const requiredGlobals = [
		"validateContainerMapping",
		"debugSyncDetailed",
		"debugSync",
	];

	const checkAndRestore = () => {
		let missing = [];
		let restored = false;

		requiredGlobals.forEach((fn) => {
			if (typeof window[fn] !== "function") {
				missing.push(fn);
			}
		});

		if (missing.length > 0) {
			console.warn(
				"⚠️ Debug-Funktionen wurden überschrieben, stelle wieder her:",
				missing
			);
			const registeredFunctions = ensureGlobalDebugAccess();
			restored = true;
			console.log(
				"✅ Debug-Funktionen wiederhergestellt:",
				registeredFunctions
			);
		}

		return { missing, restored };
	};

	// Erste Prüfung nach 5 Sekunden
	setTimeout(() => {
		console.log("🔍 Starte Debug-Funktions-Überwachung...");
		checkAndRestore();
	}, 5000);

	// Dann alle 10 Sekunden prüfen
	setInterval(checkAndRestore, 10000);
}

// Sofort ausführen
const initialFunctions = ensureGlobalDebugAccess();
console.log("📋 Initial registrierte Debug-Funktionen:", initialFunctions);

// Nach DOM-Ready erneut ausführen
document.addEventListener("DOMContentLoaded", () => {
	console.log("📄 DOM geladen, aktualisiere Debug-Funktionen...");
	ensureGlobalDebugAccess();
});

// Nach Window-Load erneut ausführen und Überwachung starten
window.addEventListener("load", () => {
	console.log("🌍 Window geladen, finale Debug-Setup...");
	ensureGlobalDebugAccess();

	// Starte Überwachung nach einer kurzen Verzögerung
	setTimeout(monitorDebugFunctions, 2000);
});

// Zusätzliche Datenkollektions-Funktionen für Debug-Zwecke
function getAllPrimaryTileData() {
	if (window.storageBrowser && window.storageBrowser.collectPrimaryTilesData) {
		return window.storageBrowser.collectPrimaryTilesData();
	}
	console.warn("storageBrowser nicht verfügbar für Primary Tile Data");
	return [];
}

function getAllSecondaryTileData() {
	if (
		window.storageBrowser &&
		window.storageBrowser.collectSecondaryTilesData
	) {
		return window.storageBrowser.collectSecondaryTilesData();
	}
	console.warn("storageBrowser nicht verfügbar für Secondary Tile Data");
	return [];
}

function debugContainerMapping() {
	console.log("=== DEBUG: Container Mapping Analysis ===");

	const primaryContainer = document.querySelector(".primary-tiles-container");
	const secondaryContainer = document.querySelector(
		".secondary-tiles-container"
	);

	if (!primaryContainer || !secondaryContainer) {
		console.error("❌ Container nicht gefunden!");
		return false;
	}

	const primaryTiles = primaryContainer.querySelectorAll(".hangar-tile");
	const secondaryTiles = secondaryContainer.querySelectorAll(".hangar-tile");

	console.log(`Primary Tiles: ${primaryTiles.length}`);
	console.log(`Secondary Tiles: ${secondaryTiles.length}`);

	const primaryData = getAllPrimaryTileData();
	const secondaryData = getAllSecondaryTileData();

	console.log("Primary Data:", primaryData);
	console.log("Secondary Data:", secondaryData);

	// Prüfe auf Datenüberschneidungen
	if (primaryData.length > 0 && secondaryData.length > 0) {
		const firstPrimaryJSON = JSON.stringify(primaryData[0]);
		let crossoverFound = false;

		secondaryData.forEach((secData, index) => {
			if (JSON.stringify(secData) === firstPrimaryJSON) {
				console.error(
					`❌ CROSSOVER DETECTED: Secondary tile ${index} has identical data to first primary!`
				);
				crossoverFound = true;
			}
		});

		if (!crossoverFound) {
			console.log("✅ Keine Datenüberschneidungen gefunden");
		}

		return !crossoverFound;
	}

	return true;
}

// Diese Funktionen auch dem hangarDebug-Objekt hinzufügen
if (window.hangarDebug) {
	window.hangarDebug.getAllPrimaryTileData = getAllPrimaryTileData;
	window.hangarDebug.getAllSecondaryTileData = getAllSecondaryTileData;
	window.hangarDebug.debugContainerMapping = debugContainerMapping;
	window.hangarDebug.ensureGlobalDebugAccess = ensureGlobalDebugAccess;
}

// Auch als Globals verfügbar machen
window.getAllPrimaryTileData = getAllPrimaryTileData;
window.getAllSecondaryTileData = getAllSecondaryTileData;
window.debugContainerMapping = debugContainerMapping;

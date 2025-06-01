/**
 * API-Fassade für Flugdaten
 * Ermöglicht die Verwendung verschiedener APIs für Flugdatenabfragen
 */

const FlightDataAPI = (() => {
	// Verfügbare API-Provider
	const PROVIDERS = {
		AMADEUS: "amadeus",
		AERODATABOX: "aerodatabox",
	};

	// Standard-Provider
	let activeProvider = PROVIDERS.AERODATABOX;

	/**
	 * Initialisiert die API-Fassade
	 */
	const init = () => {
		try {
			// Vorhandene Einstellung aus localStorage laden, falls vorhanden
			const savedProvider = localStorage.getItem("flightDataApiProvider");
			if (savedProvider && Object.values(PROVIDERS).includes(savedProvider)) {
				activeProvider = savedProvider;
				console.log(
					`API-Provider aus lokaler Speicherung geladen: ${activeProvider}`
				);
			}

			// Provider-Selektor zur UI hinzufügen - mit verzögertem Versuch,
			// falls DOM-Elemente noch nicht bereit sind
			addProviderSelector();

			// Falls beim ersten Mal nicht erfolgreich, nach kurzer Verzögerung erneut versuchen
			setTimeout(() => {
				const flightDataSection = document.querySelector("#flightDataContent");
				if (
					flightDataSection &&
					!document.getElementById("apiProviderSelect")
				) {
					console.log("Zweiter Versuch, API-Provider-Selektor hinzuzufügen...");
					addProviderSelector();
				}
			}, 500);

			console.log(
				`Flight Data API-Fassade initialisiert mit Provider: ${activeProvider}`
			);
		} catch (error) {
			console.error("Fehler bei der Initialisierung der API-Fassade:", error);
		}
	};

	/**
	 * Fügt einen Provider-Selektor zur UI hinzu
	 */
	const addProviderSelector = () => {
		try {
			// Abschnitt für API-Auswahl in der Flight Data Sektion im Sidebar-Menü
			const flightDataSection = document.querySelector("#flightDataContent");

			if (!flightDataSection) {
				console.warn(
					"Flight Data Abschnitt nicht gefunden. Element-ID #flightDataContent fehlt möglicherweise."
				);
				return;
			}

			// Provider-Auswahl vor dem Fetch-Button einfügen
			const fetchButton = document.getElementById("fetchFlightData");
			if (!fetchButton) {
				console.warn(
					"Fetch-Button nicht gefunden. Element-ID #fetchFlightData fehlt möglicherweise."
				);
				// Alternative: Am Anfang der Sektion einfügen, wenn der Button nicht gefunden wird
				if (flightDataSection.firstChild) {
					const providerSelectorContainer = createProviderSelector();
					flightDataSection.insertBefore(
						providerSelectorContainer,
						flightDataSection.firstChild
					);
					console.log(
						"API-Provider Selector am Anfang der Flight Data Sektion eingefügt"
					);
					return;
				}
				return;
			}

			// Überprüfen ob der Selektor bereits existiert
			if (document.getElementById("apiProviderSelect")) {
				console.log("API Provider Selector bereits vorhanden");
				return;
			}

			const providerSelectorContainer = createProviderSelector();

			// Element vor dem Fetch-Button einfügen
			fetchButton.parentNode.insertBefore(
				providerSelectorContainer,
				fetchButton
			);

			console.log("API-Provider Selector erfolgreich eingerichtet");
		} catch (error) {
			console.error("Fehler beim Hinzufügen des Provider-Selektors:", error);
		}
	};

	/**
	 * Erstellt das Provider-Selektor-Element
	 * @returns {HTMLElement} Provider-Selektor-Container
	 */
	const createProviderSelector = () => {
		const providerSelectorContainer = document.createElement("div");
		providerSelectorContainer.className = "mb-3";
		providerSelectorContainer.innerHTML = `
            <label class="text-xs block mb-1">API-Provider:</label>
            <select id="apiProviderSelect" class="w-full bg-industrial-dark text-white px-2 py-1 rounded form-control">
                <option value="${PROVIDERS.AERODATABOX}" ${
			activeProvider === PROVIDERS.AERODATABOX ? "selected" : ""
		}>AeroDataBox API (empfohlen)</option>
                <option value="${PROVIDERS.AMADEUS}" ${
			activeProvider === PROVIDERS.AMADEUS ? "selected" : ""
		}>Amadeus API (Backup)</option>
            </select>
            <p class="mt-1 text-xs text-gray-400">
                API-Provider für Flugdaten
            </p>
        `;

		// Event-Listener für Provider-Änderung
		setTimeout(() => {
			const selector = document.getElementById("apiProviderSelect");
			if (selector) {
				selector.addEventListener("change", (e) => {
					setProvider(e.target.value);

					// Visuelles Feedback
					const feedbackMsg = document.createElement("div");
					feedbackMsg.className = "text-xs text-green-500 my-1";
					feedbackMsg.textContent = `Provider geändert zu: ${getProviderDisplayName(
						e.target.value
					)}`;
					selector.parentNode.appendChild(feedbackMsg);

					setTimeout(() => {
						if (
							selector.parentNode &&
							feedbackMsg.parentNode === selector.parentNode
						) {
							selector.parentNode.removeChild(feedbackMsg);
						}
					}, 2000);
				});
			}
		}, 100);

		return providerSelectorContainer;
	};

	/**
	 * Setzt den aktiven API-Provider
	 * @param {string} provider - Der zu verwendende Provider
	 */
	const setProvider = (provider) => {
		if (!Object.values(PROVIDERS).includes(provider)) {
			console.error(`Ungültiger API-Provider: ${provider}`);
			return;
		}

		activeProvider = provider;
		localStorage.setItem("flightDataApiProvider", provider);
		console.log(`API-Provider geändert auf: ${provider}`);

		// Status-Anzeige aktualisieren
		updateStatus(
			`API-Provider geändert auf ${getProviderDisplayName(provider)}`
		);
	};

	/**
	 * Gibt den Anzeigenamen eines Providers zurück
	 */
	const getProviderDisplayName = (provider) => {
		switch (provider) {
			case PROVIDERS.AMADEUS:
				return "Amadeus API";
			case PROVIDERS.AERODATABOX:
				return "AeroDataBox API";
			default:
				return provider;
		}
	};

	/**
	 * Aktualisiert den Status in der UI
	 */
	const updateStatus = (message, isError = false) => {
		// Delegate zum aktiven Provider wenn verfügbar, sonst eigene Implementierung
		if (activeProvider === PROVIDERS.AMADEUS && window.AmadeusAPI) {
			window.AmadeusAPI.updateFetchStatus(message, isError);
		} else if (
			activeProvider === PROVIDERS.AERODATABOX &&
			window.AeroDataBoxAPI
		) {
			window.AeroDataBoxAPI.updateFetchStatus(message, isError);
		} else {
			const fetchStatus = document.getElementById("fetchStatus");
			if (fetchStatus) {
				fetchStatus.textContent = message;
				fetchStatus.className = isError
					? "text-sm text-center text-status-red"
					: "text-sm text-center";
			}
			console[isError ? "error" : "log"](message);
		}
	};

	/**
	 * Sucht Flugdaten für ein Flugzeug
	 * @param {string} aircraftId - Flugzeugkennung
	 * @param {string} currentDate - Aktuelles Datum (ISO-Format)
	 * @param {string} nextDate - Nächstes Datum (ISO-Format)
	 * @returns {Promise} Flugdaten
	 */
	const updateAircraftData = async (aircraftId, currentDate, nextDate) => {
		if (!aircraftId) {
			updateStatus("Bitte Flugzeugkennung eingeben", true);
			console.error("API-FASSADE: Fehler - Keine Flugzeugkennung angegeben");
			return null;
		}

		console.log(
			`API-FASSADE: Verwende ${activeProvider.toUpperCase()} für ${aircraftId}`
		);
		updateStatus(
			`Flugdaten werden abgerufen für ${aircraftId} mit ${getProviderDisplayName(
				activeProvider
			)}...`
		);

		try {
			// API-Aufrufe an den aktiven Provider delegieren
			let result;
			if (activeProvider === PROVIDERS.AMADEUS && window.AmadeusAPI) {
				console.log("API-FASSADE: Rufe AmadeusAPI auf mit Parametern:", {
					aircraftId,
					currentDate,
					nextDate,
				});
				result = await window.AmadeusAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
				console.log("API-FASSADE: Ergebnis von AmadeusAPI erhalten:", result);
			} else if (
				activeProvider === PROVIDERS.AERODATABOX &&
				window.AeroDataBoxAPI
			) {
				console.log("API-FASSADE: Rufe AeroDataBoxAPI auf mit Parametern:", {
					aircraftId,
					currentDate,
					nextDate,
				});
				result = await window.AeroDataBoxAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
				console.log(
					"API-FASSADE: Ergebnis von AeroDataBoxAPI erhalten:",
					result
				);
			} else {
				const errorMsg = `API-Provider ${activeProvider} nicht verfügbar`;
				console.error(`API-FASSADE: ${errorMsg}`);
				updateStatus(errorMsg, true);
				throw new Error(errorMsg);
			}

			if (result) {
				updateStatus(`Flugdaten für ${aircraftId} erfolgreich abgerufen.`);
				console.log("API-FASSADE: Ergebnis erfolgreich verarbeitet:", result);
				return result;
			} else {
				updateStatus(`Keine Flugdaten für ${aircraftId} gefunden.`, true);
				console.warn("API-FASSADE: Keine Flugdaten zurückgegeben");
				return null;
			}
		} catch (error) {
			console.error(
				`API-FASSADE: Fehler beim Abrufen der Flugdaten mit ${activeProvider}:`,
				error
			);
			updateStatus(
				`Fehler beim Datenabruf: ${error.message || "Unbekannter Fehler"}`,
				true
			);

			// Bei Fehler mit AeroDataBox auf Amadeus zurückfallen
			if (activeProvider === PROVIDERS.AERODATABOX && window.AmadeusAPI) {
				console.log("API-FASSADE: Fallback auf Amadeus API...");
				updateStatus("Versuche Fallback auf Amadeus API...");

				try {
					const fallbackResult = await window.AmadeusAPI.updateAircraftData(
						aircraftId,
						currentDate,
						nextDate
					);

					if (fallbackResult) {
						updateStatus(
							`Flugdaten mit Fallback-API für ${aircraftId} erfolgreich abgerufen.`
						);
						console.log("API-FASSADE: Fallback erfolgreich:", fallbackResult);
						return fallbackResult;
					} else {
						updateStatus(
							`Keine Flugdaten mit Fallback-API für ${aircraftId} gefunden.`,
							true
						);
						console.warn("API-FASSADE: Auch Fallback-API lieferte keine Daten");
						return null;
					}
				} catch (fallbackError) {
					console.error(
						"API-FASSADE: Auch Fallback-API fehlgeschlagen:",
						fallbackError
					);
					updateStatus(
						`Auch Fallback-API fehlgeschlagen: ${
							fallbackError.message || "Unbekannter Fehler"
						}`,
						true
					);
					throw fallbackError;
				}
			}

			throw error; // Original-Fehler weitergeben
		}
	};

	/**
	 * Ruft Flugdaten für mehrere Flugzeuge ab
	 * @param {string[]} aircraftIds - Liste der Flugzeugregistrierungen
	 * @param {string} currentDate - Aktuelles Datum (ISO-Format)
	 * @returns {Promise<Object[]>} Liste der Flugdaten
	 */
	const getMultipleAircraftFlights = async (aircraftIds, currentDate) => {
		if (!aircraftIds || aircraftIds.length === 0) {
			updateStatus("Keine Flugzeugkennungen angegeben", true);
			return [];
		}

		try {
			// Delegieren an den aktiven Provider
			if (
				activeProvider === PROVIDERS.AMADEUS &&
				window.AmadeusAPI &&
				typeof window.AmadeusAPI.getMultipleAircraftFlights === "function"
			) {
				return await window.AmadeusAPI.getMultipleAircraftFlights(
					aircraftIds,
					currentDate
				);
			} else if (
				activeProvider === PROVIDERS.AERODATABOX &&
				window.AeroDataBoxAPI &&
				typeof window.AeroDataBoxAPI.getMultipleAircraftFlights === "function"
			) {
				return await window.AeroDataBoxAPI.getMultipleAircraftFlights(
					aircraftIds,
					currentDate
				);
			} else {
				// Manuell sequentiell abfragen, wenn keine Batch-Funktion verfügbar ist
				const results = [];
				for (const id of aircraftIds) {
					try {
						const data = await updateAircraftData(id, currentDate);
						results.push({ registration: id, data });
					} catch (err) {
						console.error(`Fehler bei ${id}:`, err);
						results.push({ registration: id, error: err.message });
					}
				}
				return results;
			}
		} catch (error) {
			console.error("Fehler beim Abrufen mehrerer Flugzeugdaten:", error);
			updateStatus(
				`Fehler beim Abrufen mehrerer Flugzeugdaten: ${error.message}`,
				true
			);
			throw error;
		}
	};

	// Beim Laden der Seite initialisieren und auch auf DOMContentLoaded warten
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		// Falls DOM bereits geladen ist
		init();
	}

	// Öffentliche API
	return {
		PROVIDERS,
		updateAircraftData,
		getAircraftFlights,
		getMultipleAircraftFlights, // Neue Funktion
		setProvider,
		getActiveProvider: () => activeProvider,
		updateStatus,
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.FlightDataAPI = FlightDataAPI;

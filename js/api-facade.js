/**
 * API-Fassade für Flugdaten
 * Ermöglicht die Verwendung verschiedener APIs für Flugdatenabfragen
 */

const FlightDataAPI = (() => {
	// Verfügbare API-Provider
	const PROVIDERS = {
		AMADEUS: "amadeus",
		AERODATABOX: "aerodatabox",
		OPENSKY: "opensky",
		API_MARKET: "apimarket", // Neuer API Market Provider
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

			// Prüfen ob der aktuelle Provider verfügbar ist, sonst zurück zum Default
			if (
				(activeProvider === PROVIDERS.OPENSKY &&
					typeof window.OpenskyAPI === "undefined") ||
				(activeProvider === PROVIDERS.AMADEUS &&
					typeof window.AmadeusAPI === "undefined") ||
				(activeProvider === PROVIDERS.AERODATABOX &&
					typeof window.AeroDataBoxAPI === "undefined") ||
				// Korrigierte Prüfung für API Market - nur prüfen ob AeroDataBoxAPI existiert
				(activeProvider === PROVIDERS.API_MARKET &&
					typeof window.AeroDataBoxAPI === "undefined")
			) {
				console.warn(
					`Gewählter Provider ${activeProvider} nicht verfügbar, verwende Standard-Provider`
				);
				activeProvider = PROVIDERS.AERODATABOX;
			}

			console.log(
				`Flight Data API-Fassade initialisiert mit Provider: ${activeProvider}`
			);
		} catch (error) {
			console.error("Fehler bei der Initialisierung der API-Fassade:", error);
		}
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

		// Bei API Market über AeroDataBox den internen Provider umstellen
		if (provider === PROVIDERS.API_MARKET && window.AeroDataBoxAPI) {
			window.AeroDataBoxAPI.setApiProvider("apimarket");
			console.log("AeroDataBoxAPI auf API Market umgestellt");
		} else if (provider === PROVIDERS.AERODATABOX && window.AeroDataBoxAPI) {
			window.AeroDataBoxAPI.setApiProvider("aerodatabox");
			console.log("AeroDataBoxAPI auf Standard-Provider umgestellt");
		}

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
			case PROVIDERS.OPENSKY:
				return "OpenSky Network API";
			case PROVIDERS.API_MARKET:
				return "API Market";
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
		} else if (activeProvider === PROVIDERS.OPENSKY && window.OpenskyAPI) {
			window.OpenskyAPI.updateFetchStatus(message, isError);
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

			// Prüfen ob der Provider überhaupt existiert
			if (
				activeProvider === PROVIDERS.AMADEUS &&
				typeof window.AmadeusAPI !== "undefined"
			) {
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
				typeof window.AeroDataBoxAPI !== "undefined"
			) {
				console.log("API-FASSADE: Rufe AeroDataBoxAPI auf mit Parametern:", {
					aircraftId,
					currentDate,
					nextDate,
				});
				// Stelle sicher, dass AeroDataBox im Standard-Modus arbeitet
				window.AeroDataBoxAPI.setApiProvider("aerodatabox");
				result = await window.AeroDataBoxAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
				console.log(
					"API-FASSADE: Ergebnis von AeroDataBoxAPI erhalten:",
					result
				);
			} else if (
				activeProvider === PROVIDERS.API_MARKET &&
				typeof window.AeroDataBoxAPI !== "undefined"
			) {
				console.log(
					"API-FASSADE: Rufe API Market über AeroDataBoxAPI auf mit Parametern:",
					{
						aircraftId,
						currentDate,
						nextDate,
					}
				);
				// Stelle AeroDataBox auf API Market um
				window.AeroDataBoxAPI.setApiProvider("apimarket");
				result = await window.AeroDataBoxAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
				console.log("API-FASSADE: Ergebnis von API Market erhalten:", result);
			} else if (
				activeProvider === PROVIDERS.OPENSKY &&
				typeof window.OpenskyAPI !== "undefined"
			) {
				console.log("API-FASSADE: Rufe OpenskyAPI auf mit Parametern:", {
					aircraftId,
					currentDate,
					nextDate,
				});
				result = await window.OpenskyAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
				console.log("API-FASSADE: Ergebnis von OpenskyAPI erhalten:", result);
			} else {
				const errorMsg = `API-Provider ${activeProvider} nicht verfügbar`;
				console.error(`API-FASSADE: ${errorMsg}`);
				updateStatus(errorMsg, true);
				throw new Error(errorMsg);
			}

			if (result) {
				updateStatus(`Flugdaten für ${aircraftId} erfolgreich abgerufen.`);
				return result;
			} else {
				updateStatus(`Keine Flugdaten für ${aircraftId} verfügbar.`, true);
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

			// WICHTIG: Automatischen Fallback entfernen, damit nur die ausgewählte API verwendet wird
			// Stattdessen direkt den Fehler werfen
			throw error;
		}
	};

	/**
	 * Ruft Flugdaten für ein Flugzeug ab (Alias für updateAircraftData)
	 * @param {string} aircraftId - Flugzeugkennung
	 * @param {string} currentDate - Aktuelles Datum (ISO-Format)
	 * @param {string} nextDate - Nächstes Datum (ISO-Format)
	 * @returns {Promise} Flugdaten
	 */
	const getAircraftFlights = async (aircraftId, currentDate, nextDate) => {
		return updateAircraftData(aircraftId, currentDate, nextDate);
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
			} else if (
				activeProvider === PROVIDERS.OPENSKY &&
				window.OpenskyAPI &&
				typeof window.OpenskyAPI.getMultipleAircraftFlights === "function"
			) {
				return await window.OpenskyAPI.getMultipleAircraftFlights(
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
		getMultipleAircraftFlights,
		setProvider,
		getActiveProvider: () => activeProvider,
		updateStatus,
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.FlightDataAPI = FlightDataAPI;

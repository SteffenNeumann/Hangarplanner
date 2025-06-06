/**
 * API-Fassade für die Integration verschiedener Flugdaten-APIs
 * Bietet eine einheitliche Schnittstelle für den Zugriff auf verschiedene Datenquellen
 */

const FlightDataAPI = (() => {
	// Konfiguration und Status
	const config = {
		activeProvider: "aerodatabox", // Standard-Provider
		availableProviders: ["aerodatabox", "apimarket", "amadeus", "opensky"],
		debugMode: true,
	};

	// Initialisierungslogik
	const init = () => {
		try {
			// Gespeicherten Provider aus localStorage laden, falls verfügbar
			const savedProvider = localStorage.getItem("selectedApiProvider");
			if (savedProvider) {
				config.activeProvider = savedProvider;
				console.log(
					`API-Provider aus lokaler Speicherung geladen: ${config.activeProvider}`
				);

				// Den Provider sofort in den zugrundeliegenden APIs setzen
				applyProviderToAPIs(config.activeProvider);
			}

			// Dropdown-Selektor mit aktuellem Provider synchronisieren
			const apiSelector = document.getElementById("apiProviderSelect");
			if (apiSelector) {
				apiSelector.value = config.activeProvider;
			}

			console.log(
				`Flight Data API-Fassade initialisiert mit Provider: ${config.activeProvider}`
			);
			return true;
		} catch (error) {
			console.error("Fehler bei der Initialisierung der API-Fassade:", error);
			return false;
		}
	};

	/**
	 * Stellt sicher, dass alle APIs den gleichen Provider verwenden
	 * @param {string} provider - Der zu verwendende API-Provider
	 */
	const applyProviderToAPIs = (provider) => {
		// AeroDataBoxAPI konfigurieren, falls verfügbar
		if (window.AeroDataBoxAPI) {
			window.AeroDataBoxAPI.setApiProvider(provider);
		}

		// Andere APIs hier hinzufügen, falls notwendig
		if (
			window.AmadeusAPI &&
			typeof window.AmadeusAPI.setProvider === "function"
		) {
			window.AmadeusAPI.setProvider(provider);
		}

		if (
			window.OpenSkyAPI &&
			typeof window.OpenSkyAPI.setProvider === "function"
		) {
			window.OpenSkyAPI.setProvider(provider);
		}

		// Provider-Selektor aktualisieren
		const apiSelector = document.getElementById("apiProviderSelect");
		if (apiSelector) {
			apiSelector.value = provider;
		}
	};

	/**
	 * Wechselt den aktiven API-Provider
	 * @param {string} provider - Der neue Provider
	 */
	const setProvider = (provider) => {
		if (!config.availableProviders.includes(provider)) {
			console.error(`Ungültiger API-Provider: ${provider}`);
			return false;
		}

		config.activeProvider = provider;
		applyProviderToAPIs(provider);

		// Provider im localStorage speichern
		localStorage.setItem("selectedApiProvider", provider);
		console.log(`API-Provider gewechselt zu: ${provider}`);

		return true;
	};

	/**
	 * Gibt den aktuell aktiven Provider zurück
	 * @returns {string} Name des aktiven Providers
	 */
	const getActiveProvider = () => {
		return config.activeProvider;
	};

	/**
	 * Aktualisiert die API-Status-Anzeige im UI
	 * @param {string} message - Die anzuzeigende Nachricht
	 * @param {boolean} isError - Ob es sich um eine Fehlermeldung handelt
	 */
	const updateFetchStatus = (message, isError = false) => {
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.textContent = message;
			fetchStatus.className = isError
				? "text-sm text-center text-status-red"
				: "text-sm text-center text-white";

			// Pulsierende Animation bei Aktivität hinzufügen
			if (
				!isError &&
				!message.includes("bereit") &&
				!message.includes("erfolgreich")
			) {
				fetchStatus.classList.add("animate-pulse");
			} else {
				fetchStatus.classList.remove("animate-pulse");
			}
		}

		console.log(`API-FASSADE: ${message}`);
	};

	/**
	 * Aktualisiert Flugdaten für ein bestimmtes Flugzeug
	 * @param {string} aircraftId - Die Flugzeugkennung
	 * @param {string} currentDate - Das aktuelle Datum
	 * @param {string} nextDate - Das nächste Datum
	 * @returns {Promise<Object>} Flugdaten
	 */
	const updateAircraftData = async (aircraftId, currentDate, nextDate) => {
		try {
			if (!aircraftId) {
				updateFetchStatus("Bitte Flugzeugkennung eingeben", true);
				return null;
			}

			// Log Provider-Info
			console.log(
				`API-FASSADE: Verwende ${config.activeProvider.toUpperCase()} für ${aircraftId}`
			);
			updateFetchStatus(
				`Flugdaten werden abgerufen für ${aircraftId} mit ${getProviderDisplayName(
					config.activeProvider
				)}...`
			);

			// Je nach ausgewähltem Provider die entsprechende API verwenden
			let result;

			// WICHTIG: Hier wird der ausgewählte Provider beachtet und nicht zu einem Fallback gewechselt
			switch (config.activeProvider) {
				case "aerodatabox":
					console.log(`API-FASSADE: Rufe AeroDataBoxAPI auf mit Parametern:`, {
						aircraftId,
						currentDate,
						nextDate,
					});
					if (window.AeroDataBoxAPI) {
						// Wenn API Market ausgewählt ist, aber AeroDataBox verwendet wird,
						// stelle sicher, dass AeroDataBox mit der richtigen Konfiguration aufgerufen wird
						window.AeroDataBoxAPI.setApiProvider("aerodatabox");
						result = await window.AeroDataBoxAPI.updateAircraftData(
							aircraftId,
							currentDate,
							nextDate
						);
					} else {
						throw new Error("AeroDataBoxAPI nicht verfügbar");
					}
					break;

				case "apimarket":
					console.log(
						`API-FASSADE: Rufe API Market über AeroDataBoxAPI auf mit Parametern:`,
						{ aircraftId, currentDate, nextDate }
					);
					if (window.AeroDataBoxAPI) {
						// Wenn AeroDataBox ausgewählt ist, aber API Market verwendet wird,
						// stelle sicher, dass AeroDataBox mit der richtigen Konfiguration aufgerufen wird
						window.AeroDataBoxAPI.setApiProvider("apimarket");
						result = await window.AeroDataBoxAPI.updateAircraftData(
							aircraftId,
							currentDate,
							nextDate
						);
					} else {
						throw new Error("AeroDataBoxAPI nicht verfügbar");
					}
					break;

				// Andere Provider hier ergänzen
				case "amadeus":
					if (window.AmadeusAPI) {
						result = await window.AmadeusAPI.updateAircraftData(
							aircraftId,
							currentDate,
							nextDate
						);
					} else {
						throw new Error("AmadeusAPI nicht verfügbar");
					}
					break;

				case "opensky":
					if (window.OpenSkyAPI) {
						result = await window.OpenSkyAPI.updateAircraftData(
							aircraftId,
							currentDate,
							nextDate
						);
					} else {
						throw new Error("OpenSkyAPI nicht verfügbar");
					}
					break;

				default:
					throw new Error(`Unbekannter API-Provider: ${config.activeProvider}`);
			}

			console.log(
				`API-FASSADE: Ergebnis von ${config.activeProvider.toUpperCase()} erhalten:`,
				result
			);
			updateFetchStatus(`Flugdaten für ${aircraftId} erfolgreich abgerufen.`);
			return result;
		} catch (error) {
			console.error("API-FASSADE: Fehler beim Abrufen der Flugdaten:", error);
			updateFetchStatus(
				`Fehler beim Abrufen der Flugdaten: ${error.message}`,
				true
			);
			return null;
		}
	};

	/**
	 * Gibt einen schöneren Anzeigetext für den Provider zurück
	 * @param {string} provider - Der Provider-Code
	 * @returns {string} Anzeigetext
	 */
	const getProviderDisplayName = (provider) => {
		switch (provider) {
			case "aerodatabox":
				return "AeroDataBox API";
			case "apimarket":
				return "API Market";
			case "amadeus":
				return "Amadeus API";
			case "opensky":
				return "OpenSky API";
			default:
				return provider;
		}
	};

	// Öffentliche API
	return {
		init,
		setProvider,
		getActiveProvider,
		updateAircraftData,
		getAircraftFlights: async (aircraftId, date) => {
			// Lade Flugdaten für ein Flugzeug an einem bestimmten Datum
			try {
				switch (config.activeProvider) {
					case "aerodatabox":
					case "apimarket":
						if (window.AeroDataBoxAPI) {
							window.AeroDataBoxAPI.setApiProvider(config.activeProvider);
							return await window.AeroDataBoxAPI.getAircraftFlights(
								aircraftId,
								date
							);
						}
						break;
					// Weitere Provider hier
				}
				throw new Error("Kein passender Provider verfügbar");
			} catch (error) {
				console.error("API-FASSADE: Fehler in getAircraftFlights", error);
				updateFetchStatus(
					`Fehler beim Abrufen von Flugdaten: ${error.message}`,
					true
				);
				return { data: [] };
			}
		},
		// Weitere Methoden hier
	};
})();

// API-Fassade initialisieren und global verfügbar machen
window.FlightDataAPI = FlightDataAPI;
document.addEventListener("DOMContentLoaded", FlightDataAPI.init);

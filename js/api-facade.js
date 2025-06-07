/**
 * API-Fassade für die einheitliche Handhabung verschiedener Flugdaten-APIs
 * Dient als zentraler Zugangspunkt für alle Flugdatenabfragen
 * VEREINFACHT: Nur AeroDataBox wird jetzt verwendet
 */

// Selbst ausführende Funktion für Kapselung
const FlightDataAPI = (function () {
	// Vereinfachte Konfiguration - nur AeroDataBox als Provider
	const config = {
		providers: ["aerodatabox"],
		activeProvider: "aerodatabox", // Immer AeroDataBox
	};

	/**
	 * Initialisierung der Fassade - vereinfacht
	 */
	const initialize = function () {
		console.log(
			"Flight Data API-Fassade initialisiert mit Provider: aerodatabox (vereinfacht)"
		);
	};

	// Sofortige Initialisierung beim Laden
	initialize();

	/**
	 * Flugdaten für ein Flugzeug abrufen und aktualisieren
	 * @param {string} aircraftId - Flugzeugkennung (Registrierung)
	 * @param {string} currentDate - Das aktuelle Datum für die Ankunft (letzter Flug)
	 * @param {string} nextDate - Das Folgedatum für den Abflug (erster Flug)
	 * @returns {Promise<Object>} Vereinheitlichte Flugdaten
	 */
	const updateAircraftData = async function (
		aircraftId,
		currentDate,
		nextDate
	) {
		console.log(
			`[API-FASSADE] Rufe updateAircraftData auf für Flugzeug: ${aircraftId}, Datum 1: ${currentDate}, Datum 2: ${nextDate}`
		);

		try {
			// Direkt AeroDataBoxAPI aufrufen mit beiden Datumsparametern
			if (window.AeroDataBoxAPI) {
				console.log(
					`[API-FASSADE] Rufe AeroDataBoxAPI.updateAircraftData mit beiden Daten auf: ${currentDate}, ${nextDate}`
				);
				return await window.AeroDataBoxAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
			} else {
				throw new Error("AeroDataBoxAPI ist nicht verfügbar");
			}
		} catch (error) {
			console.error("[API-FASSADE] Fehler beim Abrufen der Flugdaten:", error);
			// Fehler weiterreichen für bessere Fehlerbehandlung
			throw error;
		}
	};

	/**
	 * Flugdaten für ein bestimmtes Flugzeug an einem bestimmten Datum abrufen
	 * @param {string} aircraftId - Flugzeugkennung (Registrierung)
	 * @param {string} date - Datum im Format YYYY-MM-DD
	 * @returns {Promise<Object>} Flugdaten
	 */
	const getAircraftFlights = async function (aircraftId, date) {
		console.log(
			`[API-FASSADE] Rufe Einzelflüge ab für Flugzeug: ${aircraftId}, Datum: ${date}`
		);

		try {
			// Direkt AeroDataBoxAPI aufrufen
			if (window.AeroDataBoxAPI) {
				return await window.AeroDataBoxAPI.getAircraftFlights(aircraftId, date);
			} else {
				throw new Error("AeroDataBoxAPI ist nicht verfügbar");
			}
		} catch (error) {
			console.error(
				"[API-FASSADE] Fehler beim Abrufen der Einzelflüge:",
				error
			);
			throw error;
		}
	};

	/**
	 * API-Provider ändern - vereinfacht, immer aerodatabox
	 * @param {string} provider - Name des zu aktivierenden Providers (wird ignoriert)
	 */
	const setProvider = function (provider) {
		console.log("[API-FASSADE] Nur AeroDataBox wird unterstützt.");
		return true;
	};

	/**
	 * Aktiven Provider abfragen - immer aerodatabox
	 * @returns {string} Name des aktiven Providers
	 */
	const getActiveProvider = function () {
		return "aerodatabox";
	};

	// Public API - unveränderte Signaturen für Kompatibilität
	return {
		updateAircraftData,
		getAircraftFlights,
		setProvider,
		getActiveProvider,
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.FlightDataAPI = FlightDataAPI;

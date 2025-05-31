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

			// Provider-Selektor zur UI hinzufügen
			addProviderSelector();

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
		// Abschnitt für API-Auswahl in der Flight Data Sektion im Sidebar-Menü
		const flightDataSection = document.querySelector(
			".sidebar-accordion-content:has(#fetchFlightData)"
		);

		if (!flightDataSection) {
			console.warn("Flight Data Abschnitt nicht gefunden");
			return;
		}

		// Provider-Auswahl vor dem Fetch-Button einfügen
		const fetchButton = document.getElementById("fetchFlightData");
		if (!fetchButton) return;

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
                Wählen Sie den gewünschten API-Provider für Flugdaten.
            </p>
        `;

		// Element vor dem Fetch-Button einfügen
		fetchButton.parentNode.insertBefore(providerSelectorContainer, fetchButton);

		// Event-Listener für Provider-Änderung
		const selector = document.getElementById("apiProviderSelect");
		if (selector) {
			selector.addEventListener("change", (e) => {
				setProvider(e.target.value);
			});
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
			return;
		}

		updateStatus(
			`Flugdaten werden abgerufen für ${aircraftId} mit ${getProviderDisplayName(
				activeProvider
			)}...`
		);

		try {
			// API-Aufrufe an den aktiven Provider delegieren
			let result;
			if (activeProvider === PROVIDERS.AMADEUS && window.AmadeusAPI) {
				result = await window.AmadeusAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
			} else if (
				activeProvider === PROVIDERS.AERODATABOX &&
				window.AeroDataBoxAPI
			) {
				result = await window.AeroDataBoxAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
			} else {
				throw new Error(`API-Provider ${activeProvider} nicht verfügbar`);
			}

			console.log("API-Ergebnis erfolgreich verarbeitet:", result);
			return result;
		} catch (error) {
			console.error(
				`Fehler beim Abrufen der Flugdaten mit ${activeProvider}:`,
				error
			);
			updateStatus(`Fehler beim Datenabruf: ${error.message}`, true);

			// Bei Fehler mit AeroDataBox auf Amadeus zurückfallen
			if (activeProvider === PROVIDERS.AERODATABOX && window.AmadeusAPI) {
				updateStatus("Versuche Fallback auf Amadeus API...");
				return await window.AmadeusAPI.updateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);
			}
		}
	};

	// Beim Laden der Seite initialisieren
	document.addEventListener("DOMContentLoaded", init);

	// Öffentliche API
	return {
		PROVIDERS,
		updateAircraftData,
		setProvider,
		getActiveProvider: () => activeProvider,
		updateStatus,
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.FlightDataAPI = FlightDataAPI;

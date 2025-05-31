/**
 * Amadeus API Integration
 * Handles authentication and API calls to fetch flight data
 */

const AmadeusAPI = (() => {
	// API Configuration
	const config = {
		apiKey: "", // Your Amadeus API Key
		apiSecret: "", // Your Amadeus API Secret
		baseUrl: "https://test.api.amadeus.com/v2", // Test environment, change to production when ready
		tokenUrl: "https://test.api.amadeus.com/v1/security/oauth2/token",
	};

	// Access token storage
	let accessToken = null;
	let tokenExpiry = null;

	/**
	 * Get authentication token
	 * @returns {Promise<string>} Access token
	 */
	const getToken = async () => {
		// Check if we have a valid token
		if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
			return accessToken;
		}

		try {
			const response = await fetch(config.tokenUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: `grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.apiSecret}`,
			});

			if (!response.ok) {
				throw new Error(`Authentication failed: ${response.statusText}`);
			}

			const data = await response.json();
			accessToken = data.access_token;

			// Calculate token expiry (usually 30 minutes)
			const expiresIn = data.expires_in || 1800; // Default to 30 min if not provided
			tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);

			return accessToken;
		} catch (error) {
			console.error("Error obtaining access token:", error);
			updateFetchStatus(
				"Authentifizierung fehlgeschlagen. Bitte API-Schlüssel überprüfen.",
				true
			);
			throw error;
		}
	};

	/**
	 * Update the fetch status display in UI
	 * @param {string} message - Status message to display
	 * @param {boolean} isError - Whether this is an error message
	 */
	const updateFetchStatus = (message, isError = false) => {
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.textContent = message;
			fetchStatus.className = isError
				? "text-sm text-center text-status-red"
				: "text-sm text-center";
		}
	};

	/**
	 * Format date to YYYY-MM-DD
	 * @param {Date|string} dateInput - Date object or date string
	 * @returns {string} Formatted date string
	 */
	const formatDate = (dateInput) => {
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		return date.toISOString().split("T")[0];
	};

	/**
	 * Fetch flights for a specific aircraft on a specific date
	 * @param {string} aircraftId - Aircraft registration number/identifier
	 * @param {string} date - Date in YYYY-MM-DD format
	 * @returns {Promise<Object>} Flight information
	 */
	const getAircraftFlights = async (aircraftId, date) => {
		try {
			updateFetchStatus(`Suche Flüge für Aircraft ${aircraftId} am ${date}...`);

			const token = await getToken();

			// Korrigierter Endpunkt für die Amadeus Flight Schedules API
			// Bei echten Aircraft-IDs müssen wir das Format analysieren und korrekt parsen
			let apiUrl;

			// Prüfen, ob es sich um eine Flugnummer im Format "LH123" handelt
			const flightCodeRegex = /^([A-Z]{2})(\d+)$/;
			const match = aircraftId.match(flightCodeRegex);

			if (match) {
				// Format: Airline Code (2 Buchstaben) + Flugnummer
				const carrierCode = match[1];
				const flightNumber = match[2];
				apiUrl = `${config.baseUrl}/schedule/flights?carrierCode=${carrierCode}&flightNumber=${flightNumber}&scheduledDepartureDate=${date}`;
			} else {
				// Alternativer Versuch mit der Aircraft Registration als Parameter
				// Hinweis: Dies ist möglicherweise nicht von der Amadeus API unterstützt
				apiUrl = `${
					config.baseUrl
				}/schedule/flights?aircraftRegistration=${encodeURIComponent(
					aircraftId
				)}&date=${date}`;

				// Logging für Debugging-Zwecke
				console.log(`Verwende alternative URL für Aircraft: ${apiUrl}`);
			}

			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			// Handling von 404 und anderen Fehlern
			if (response.status === 404) {
				console.warn(`Keine Daten gefunden für ${aircraftId} am ${date}`);
				return { data: [] }; // Leeres Daten-Array zurückgeben
			}

			if (!response.ok) {
				throw new Error(
					`API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}`
				);
			}

			const data = await response.json();

			// Überprüfen und loggen der zurückgegebenen Datenstruktur für Debugging
			if (data && data.data && data.data.length > 0) {
				console.log(`Gefundene Flüge für ${aircraftId}: ${data.data.length}`);
			} else {
				console.log(`Keine Flüge gefunden für ${aircraftId} am ${date}`);
			}

			return data;
		} catch (error) {
			console.error("Error fetching aircraft flights:", error);
			updateFetchStatus(`Fehler bei der Flugabfrage: ${error.message}`, true);

			// Leeres Objekt zurückgeben, damit der Rest des Codes weiter funktioniert
			return { data: [] };
		}
	};

	/**
	 * Find last flight of day and first flight of next day
	 * @param {Object} flightData - Flight data from API
	 * @param {string} currentDate - Current date in YYYY-MM-DD format
	 * @param {string} nextDate - Next date in YYYY-MM-DD format
	 * @returns {Object} Last and first flight times
	 */
	const findBoundaryFlights = (flightData, currentDate, nextDate) => {
		let lastFlight = null;
		let firstFlight = null;
		let latestDepartureTime = "";
		let earliestNextDepartureTime = "23:59";

		if (!flightData || !flightData.data) {
			return { lastFlight, firstFlight };
		}

		flightData.data.forEach((flight) => {
			const flightDate = flight.departure.scheduledTime.substring(0, 10);
			const departureTime = flight.departure.scheduledTime.substring(11, 16);

			// Check for last flight of current day
			if (flightDate === currentDate && departureTime > latestDepartureTime) {
				latestDepartureTime = departureTime;
				lastFlight = flight;
			}

			// Check for first flight of next day
			if (
				flightDate === nextDate &&
				departureTime < earliestNextDepartureTime
			) {
				earliestNextDepartureTime = departureTime;
				firstFlight = flight;
			}
		});

		return { lastFlight, firstFlight };
	};

	/**
	 * Update aircraft data in the hangar planner
	 * This function will be called when clicking "Update Data" button
	 */
	const updateAircraftData = async () => {
		updateFetchStatus("Starte Aktualisierungsprozess...");

		try {
			// Get date inputs
			const currentDate = document.getElementById("currentDateInput").value;
			const nextDate = document.getElementById("nextDateInput").value;

			if (!currentDate || !nextDate) {
				updateFetchStatus("Bitte Datum für die Suche angeben", true);
				return;
			}

			// Format dates for API
			const formattedCurrentDate = formatDate(currentDate);
			const formattedNextDate = formatDate(nextDate);

			// Get all aircraft cells
			const aircraftCells = document.querySelectorAll(".aircraft-id");
			let updatedCount = 0;

			for (const cell of aircraftCells) {
				const aircraftId = cell.value;

				// Skip empty cells
				if (!aircraftId || aircraftId.trim() === "") {
					continue;
				}

				// Extract cell number from ID
				const cellNumber = cell.id.split("-")[1];

				try {
					updateFetchStatus(`Suche Flugdaten für ${aircraftId}...`);

					// Get flights for current and next day
					const currentDayFlights = await getAircraftFlights(
						aircraftId,
						formattedCurrentDate
					);
					const nextDayFlights = await getAircraftFlights(
						aircraftId,
						formattedNextDate
					);

					// Combine flight data
					const allFlights = {
						data: [
							...(currentDayFlights?.data || []),
							...(nextDayFlights?.data || []),
						],
					};

					// Find boundary flights
					const { lastFlight, firstFlight } = findBoundaryFlights(
						allFlights,
						formattedCurrentDate,
						formattedNextDate
					);

					// Update UI with flight times
					if (lastFlight) {
						document.getElementById(`arrival-time-${cellNumber}`).textContent =
							lastFlight.arrival.scheduledTime.substring(11, 16); // Extract HH:MM
					}

					if (firstFlight) {
						document.getElementById(
							`departure-time-${cellNumber}`
						).textContent = firstFlight.departure.scheduledTime.substring(
							11,
							16
						); // Extract HH:MM
					}

					// Update position if available (e.g., from last flight's arrival)
					if (lastFlight && lastFlight.arrival.iataCode) {
						document.getElementById(`position-${cellNumber}`).textContent =
							lastFlight.arrival.iataCode;
					}

					updatedCount++;
				} catch (error) {
					console.error(`Fehler bei Aktualisierung von ${aircraftId}:`, error);
					// Continue with next aircraft
				}
			}

			updateFetchStatus(
				`Aktualisierung abgeschlossen. ${updatedCount} Flugzeuge aktualisiert.`
			);
		} catch (error) {
			console.error("Fehler im Aktualisierungsprozess:", error);
			updateFetchStatus(
				"Aktualisierung fehlgeschlagen. Details in der Konsole.",
				true
			);
		}
	};

	/**
	 * Initialize module
	 * Called when DOM is loaded
	 */
	const init = () => {
		// Set up next day calculation for date input
		const currentDateInput = document.getElementById("currentDateInput");
		const nextDateInput = document.getElementById("nextDateInput");

		if (currentDateInput) {
			currentDateInput.addEventListener("change", function () {
				if (this.value) {
					const currentDate = new Date(this.value);
					const nextDay = new Date(currentDate);
					nextDay.setDate(currentDate.getDate() + 1);

					// Format as YYYY-MM-DD for input value
					nextDateInput.value = formatDate(nextDay);
				}
			});

			// Set default to today and tomorrow
			const today = new Date();
			currentDateInput.value = formatDate(today);

			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);
			nextDateInput.value = formatDate(tomorrow);
		}

		// Set up event listener for the update button
		const updateButton = document.getElementById("fetchFlightData");
		if (updateButton) {
			updateButton.addEventListener("click", updateAircraftData);
		}
	};

	// Initialize when DOM is loaded
	document.addEventListener("DOMContentLoaded", init);

	// Public API
	return {
		updateAircraftData,
		getAircraftFlights,
		updateFetchStatus,
		init,
	};
})();

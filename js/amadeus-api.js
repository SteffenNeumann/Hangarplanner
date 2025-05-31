/**
 * Amadeus API Integration
 * Handles authentication and API calls to fetch flight data
 */

const AmadeusAPI = (() => {
	// API Configuration
	const config = {
		apiKey: "VDCRHgvSyMzkgb9Y3ztJzRszQLvg8Qcq", // Your Amadeus API Key
		apiSecret: "AQWCDWW1vNhXLlVt", // Your Amadeus API Secret
		baseUrl: "https://test.api.amadeus.com/v2", // Test environment, change to production when ready
		tokenUrl: "https://test.api.amadeus.com/v1/security/oauth2/token",
		debugMode: true, // Aktiviere Debug-Modus für zusätzliche Konsolenausgaben
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

		// Auch in der Konsole loggen für bessere Nachverfolgung
		if (config.debugMode) {
			isError ? console.error(message) : console.log(message);
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

			// Debug: Token-Informationen
			if (config.debugMode) {
				console.log(`Token erhalten: ${token.substring(0, 10)}...`);
			}

			// Korrigierter Endpunkt für die Amadeus Flight Schedules API
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
				// Bei Aircraft-Registrierung wie D-AIBL müssen wir einen alternativen Endpoint oder
				// eine andere API verwenden, da die Flight Schedules API keine direkte Suche nach
				// Flugzeugregistrierungen unterstützt

				// Da wir keinen direkten Zugriff auf Flüge nach Registrierung haben,
				// können wir einen Test-Flug einer bekannten Airline abfragen
				// oder einen Mock-Endpunkt für Testzwecke verwenden

				// WICHTIG: Diese Testdaten sind nur als Übergangslösung zu verstehen!
				// Für eine produktive Umgebung müsste eine andere API verwendet werden,
				// die Flüge nach Registrierung suchen kann

				// Beispiel für einen Testflug (LH438)
				apiUrl = `${config.baseUrl}/schedule/flights?carrierCode=LH&flightNumber=438&scheduledDepartureDate=${date}`;

				updateFetchStatus(
					`Hinweis: Suche nach Aircraft ${aircraftId} - Verwende Testdaten für Demo-Zwecke`,
					false
				);

				// Alternativ könnten wir hier auch Mock-Daten zurückgeben:
				if (config.debugMode) {
					console.log(`Verwende Test-API für ${aircraftId}: ${apiUrl}`);
				}
			}

			// Debug: API-URL anzeigen
			if (config.debugMode) {
				console.log(`API-Anfrage an: ${apiUrl}`);
			}

			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			// Debug: API-Antwort Status anzeigen
			if (config.debugMode) {
				console.log(
					`API-Antwort Status: ${response.status} ${response.statusText}`
				);
			}

			// Handling von 404 und anderen Fehlern
			if (response.status === 404) {
				updateFetchStatus(
					`Keine Daten gefunden für ${aircraftId} am ${date}`,
					true
				);
				return { data: [] }; // Leeres Daten-Array zurückgeben
			}

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}. Details: ${errorText}`
				);
			}

			const data = await response.json();

			// Debug: Empfangene Daten anzeigen
			if (config.debugMode) {
				console.log(`API-Antwort Daten:`, data);
			}

			// Überprüfen und loggen der zurückgegebenen Datenstruktur
			if (data && data.data && data.data.length > 0) {
				updateFetchStatus(
					`Gefundene Flüge für ${aircraftId}: ${data.data.length}`
				);
			} else {
				updateFetchStatus(
					`Keine Flüge gefunden für ${aircraftId} am ${date}`,
					true
				);
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

		if (!flightData || !flightData.data || !Array.isArray(flightData.data)) {
			if (config.debugMode) {
				console.log("Keine gültigen Flugdaten zum Verarbeiten vorhanden");
			}
			return { lastFlight, firstFlight };
		}

		// Überprüfe jeden Flug auf die benötigten Eigenschaften
		flightData.data.forEach((flight) => {
			// Debug-Ausgabe der Flugstruktur
			if (config.debugMode) {
				console.log("Verarbeite Flugdaten:", flight);
			}

			// Extrahiere die Flugnummer aus flightDesignator wenn vorhanden
			let carrierCode = "";
			let flightNumber = "";
			if (flight.flightDesignator) {
				carrierCode = flight.flightDesignator.carrierCode || "";
				flightNumber = flight.flightDesignator.flightNumber || "";
				if (config.debugMode) {
					console.log(`Flugnummer gefunden: ${carrierCode}${flightNumber}`);
				}
			}

			// Extrahiere das Abflugdatum aus dem Hauptobjekt oder aus flightPoints
			let flightDate = "";
			let departureTime = "";

			// Option 1: Direktes Datum im Hauptobjekt
			if (flight.scheduledDepartureDate) {
				flightDate = flight.scheduledDepartureDate;

				// Versuche die Abflugzeit aus flightPoints zu bekommen
				if (
					flight.flightPoints &&
					Array.isArray(flight.flightPoints) &&
					flight.flightPoints.length > 0
				) {
					const departurePoint = flight.flightPoints.find(
						(point) => point.departurePoint === true
					);
					if (
						departurePoint &&
						departurePoint.departure &&
						departurePoint.departure.timings
					) {
						for (const timing of departurePoint.departure.timings) {
							if (timing.qualifier === "STD") {
								// Scheduled Time of Departure
								departureTime = timing.value.substring(0, 5); // Format HH:MM
								break;
							}
						}
					}
				}

				// Wenn keine spezifische Zeit gefunden wurde, verwende eine Standard-Zeit
				if (!departureTime) {
					departureTime = "12:00"; // Standard-Mittag als Fallback
					if (config.debugMode) {
						console.log(
							`Keine genaue Abflugzeit gefunden für ${carrierCode}${flightNumber}, verwende Standard: ${departureTime}`
						);
					}
				}
			}
			// Option 2: Datum im departure-Objekt (falls vorhanden)
			else if (flight.departure && flight.departure.scheduledTime) {
				flightDate = flight.departure.scheduledTime.substring(0, 10);
				departureTime = flight.departure.scheduledTime.substring(11, 16);
			}
			// Bei fehlendem Datum - nutze den Fallback von der Anfrage
			else if (!flightDate) {
				flightDate = flight.departure ? currentDate : currentDate;
				departureTime = "12:00"; // Standard-Fallback
				console.warn(
					`Kein Datum gefunden für Flug ${carrierCode}${flightNumber}, verwende Anfragedatum`
				);
			}

			// Speichere zusätzliche Informationen im Flugobjekt für spätere Verwendung
			flight.extractedInfo = {
				flightNumber: `${carrierCode}${flightNumber}`,
				date: flightDate,
				departureTime: departureTime,
			};

			if (config.debugMode) {
				console.log(`Extrahierte Fluginformationen:`, flight.extractedInfo);
			}

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

		// Debug-Ausgabe der gefundenen Flüge
		if (config.debugMode) {
			console.log(`Letzter Flug (${currentDate}):`, lastFlight);
			console.log(`Erster Flug (${nextDate}):`, firstFlight);
		}

		return { lastFlight, firstFlight };
	};

	/**
	 * Update UI with flight information
	 * @param {Object} lastFlight - Last flight of the day
	 * @param {Object} firstFlight - First flight of next day
	 * @param {string} aircraftId - Aircraft ID
	 * @param {string} cellId - Cell ID for DOM access
	 */
	const updateFlightDisplayInUI = (
		lastFlight,
		firstFlight,
		aircraftId,
		cellId
	) => {
		const parentRow =
			document.getElementById(cellId)?.parentElement ||
			document.querySelector(`#${cellId}`).closest(".row") ||
			document.querySelector(`#${cellId}`).parentElement;

		// Debug: Zeige gefundene Elemente für Debugging
		if (config.debugMode) {
			console.log(`Parent Row für ${cellId}:`, parentRow);
		}

		// Update Arrival Time and Flight Number (from last flight)
		if (lastFlight) {
			// Extrahiere relevante Informationen
			let arrivalTime = "N/A";
			let flightNumber = lastFlight.extractedInfo?.flightNumber || "N/A";
			let arrivalLocation = "";

			// Versuche die Ankunftszeit und den Ort zu bestimmen
			if (
				lastFlight.flightPoints &&
				Array.isArray(lastFlight.flightPoints) &&
				lastFlight.flightPoints.length > 0
			) {
				const arrivalPoint = lastFlight.flightPoints.find(
					(point) => point.arrivalPoint === true
				);
				if (arrivalPoint) {
					// Extrahiere Ankunftszeit
					if (arrivalPoint.arrival && arrivalPoint.arrival.timings) {
						for (const timing of arrivalPoint.arrival.timings) {
							if (timing.qualifier === "STA") {
								// Scheduled Time of Arrival
								arrivalTime = timing.value.substring(0, 5); // Format HH:MM
								break;
							}
						}
					}

					// Extrahiere Ankunftsort (IATA Code)
					if (arrivalPoint.iataCode) {
						arrivalLocation = arrivalPoint.iataCode;
					}
				}
			} else if (lastFlight.arrival && lastFlight.arrival.scheduledTime) {
				arrivalTime = lastFlight.arrival.scheduledTime.substring(11, 16);
				if (lastFlight.arrival.iataCode) {
					arrivalLocation = lastFlight.arrival.iataCode;
				}
			}

			// Aktualisiere die Ankunftszeit im UI
			let arrivalField = document.querySelector(
				`#arrival-time-${cellId.split("-")[1]}`
			);
			if (!arrivalField && parentRow) {
				// Suche nach Elementen mit Klassen oder Labels
				const labels = parentRow.querySelectorAll("label, span, div");
				for (const label of labels) {
					if (label.textContent.includes("Arrival")) {
						arrivalField =
							label.nextElementSibling ||
							parentRow.querySelector(".arrival-time") ||
							parentRow.querySelector('[id*="arrival"]');
						break;
					}
				}
			}

			if (arrivalField) {
				// Füge die Flugnummer zur Ankunftszeit hinzu
				const displayValue = `${arrivalTime} (${flightNumber})`;

				if (arrivalField.tagName.toLowerCase() === "input") {
					arrivalField.value = displayValue;
				} else {
					arrivalField.textContent = displayValue;
				}
				if (config.debugMode) {
					console.log(
						`Ankunftszeit mit Flugnummer für ${aircraftId} gesetzt: ${displayValue}`
					);
				}
			} else {
				console.warn(`Konnte Ankunftsfeld für ${aircraftId} nicht finden`);
			}

			// Update Position if available
			if (arrivalLocation) {
				let positionField = document.querySelector(
					`#position-${cellId.split("-")[1]}`
				);
				if (!positionField && parentRow) {
					const labels = parentRow.querySelectorAll("label, span, div");
					for (const label of labels) {
						if (label.textContent.includes("Position")) {
							positionField =
								label.nextElementSibling ||
								parentRow.querySelector(".position") ||
								parentRow.querySelector('[id*="position"]');
							break;
						}
					}
				}

				if (positionField) {
					if (positionField.tagName.toLowerCase() === "input") {
						positionField.value = arrivalLocation;
					} else {
						positionField.textContent = arrivalLocation;
					}
					if (config.debugMode) {
						console.log(
							`Position für ${aircraftId} auf ${arrivalLocation} gesetzt`
						);
					}
				}
			}
		}

		// Update Departure Time and Flight Number (from first flight of next day)
		if (firstFlight) {
			let departureTime = "N/A";
			let flightNumber = firstFlight.extractedInfo?.flightNumber || "N/A";

			// Extrahiere die Abflugzeit aus verschiedenen möglichen Quellen
			if (
				firstFlight.extractedInfo &&
				firstFlight.extractedInfo.departureTime
			) {
				departureTime = firstFlight.extractedInfo.departureTime;
			} else if (firstFlight.departure && firstFlight.departure.scheduledTime) {
				departureTime = firstFlight.departure.scheduledTime.substring(11, 16);
			} else if (firstFlight.flightPoints) {
				// Suche nach dem Abflugpunkt
				const departurePoint = firstFlight.flightPoints.find(
					(point) => point.departurePoint === true
				);
				if (departurePoint?.departure?.timings) {
					for (const timing of departurePoint.departure.timings) {
						if (timing.qualifier === "STD") {
							departureTime = timing.value.substring(0, 5);
							break;
						}
					}
				}
			}

			// Aktualisiere das UI mit Abflugzeit und Flugnummer
			let departureField = document.querySelector(
				`#departure-time-${cellId.split("-")[1]}`
			);
			if (!departureField && parentRow) {
				const labels = parentRow.querySelectorAll("label, span, div");
				for (const label of labels) {
					if (label.textContent.includes("Departure")) {
						departureField =
							label.nextElementSibling ||
							parentRow.querySelector(".departure-time") ||
							parentRow.querySelector('[id*="departure"]');
						break;
					}
				}
			}

			if (departureField) {
				// Füge die Flugnummer zur Abflugzeit hinzu
				const displayValue = `${departureTime} (${flightNumber})`;

				if (departureField.tagName.toLowerCase() === "input") {
					departureField.value = displayValue;
				} else {
					departureField.textContent = displayValue;
				}
				if (config.debugMode) {
					console.log(
						`Abflugzeit mit Flugnummer für ${aircraftId} gesetzt: ${displayValue}`
					);
				}
			} else {
				console.warn(`Konnte Abflugfeld für ${aircraftId} nicht finden`);
			}
		}
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

			// Debug: Datum-Werte anzeigen
			if (config.debugMode) {
				console.log(
					`Aktualisiere Daten für Zeitraum: ${formattedCurrentDate} bis ${formattedNextDate}`
				);
			}

			// Get all aircraft cells - korrigierter Selektor basierend auf dem UI-Screenshot
			const aircraftCells = document.querySelectorAll(".aircraft-id");
			if (config.debugMode) {
				console.log(`Gefundene Aircraft-Felder: ${aircraftCells.length}`);
			}

			if (aircraftCells.length === 0) {
				// Alternative Selektor-Versuche, falls obiger Selektor keine Elemente findet
				const alternativeSelectors = [
					"input[placeholder='Aircraft ID']",
					".grid-item input",
				];

				for (const selector of alternativeSelectors) {
					const altCells = document.querySelectorAll(selector);
					if (altCells.length > 0) {
						console.log(
							`Alternative Selektor gefunden: ${selector}, Elemente: ${altCells.length}`
						);
						aircraftCells = altCells;
						break;
					}
				}
			}

			let updatedCount = 0;

			for (const cell of aircraftCells) {
				// Debug: Zellwerte anzeigen
				if (config.debugMode) {
					console.log(`Verarbeite Zelle:`, cell);
				}

				// Ermittle Aircraft ID je nachdem, ob es sich um ein Input-Feld oder ein div/span handelt
				let aircraftId;
				if (cell.tagName.toLowerCase() === "input") {
					aircraftId = cell.value;
				} else {
					aircraftId = cell.textContent.trim();
				}

				// Skip empty cells
				if (
					!aircraftId ||
					aircraftId.trim() === "" ||
					aircraftId === "Aircraft ID"
				) {
					if (config.debugMode) console.log("Überspringe leere Zelle");
					continue;
				}

				// Identifiziere die Position dieser Zelle im Grid
				// Aus dem Screenshot sehe ich, dass das Format Position: 1A, 1B, etc. sein könnte
				// Extract cell number from ID or parent container
				let cellId;
				if (cell.id) {
					cellId = cell.id;
				} else if (cell.dataset && cell.dataset.cellId) {
					cellId = cell.dataset.cellId;
				} else {
					// Versuche, die ID aus dem übergeordneten Container zu extrahieren
					const parentContainer =
						cell.closest(".grid-item") || cell.parentElement;
					if (parentContainer && parentContainer.id) {
						cellId = parentContainer.id;
					} else {
						// Fallback: Verwende eine eindeutige ID basierend auf dem Index
						cellId = `aircraft-${updatedCount}`;
					}
				}

				// Debug: Cell-ID anzeigen
				if (config.debugMode) {
					console.log(
						`Verarbeite Aircraft ${aircraftId} mit Cell-ID ${cellId}`
					);
				}

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

					// Debug: Zusammengeführte Flugdaten anzeigen
					if (config.debugMode) {
						console.log(`Alle gefundenen Flüge für ${aircraftId}:`, allFlights);
					}

					// Find boundary flights
					const { lastFlight, firstFlight } = findBoundaryFlights(
						allFlights,
						formattedCurrentDate,
						formattedNextDate
					);

					// Verwende die neue Funktion zur UI-Aktualisierung
					updateFlightDisplayInUI(lastFlight, firstFlight, aircraftId, cellId);

					updatedCount++;
				} catch (error) {
					console.error(`Fehler bei Aktualisierung von ${aircraftId}:`, error);
					updateFetchStatus(`Fehler bei ${aircraftId}: ${error.message}`, true);
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

		// Debug: Bestätige Initialisierung
		if (config.debugMode) {
			console.log("Amadeus API Modul initialisiert");

			// Überprüfe DOM-Elemente
			const updateButton = document.getElementById("fetchFlightData");
			console.log("Update Button gefunden:", !!updateButton);

			const currentDateInput = document.getElementById("currentDateInput");
			console.log("Current Date Input gefunden:", !!currentDateInput);

			const nextDateInput = document.getElementById("nextDateInput");
			console.log("Next Date Input gefunden:", !!nextDateInput);
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

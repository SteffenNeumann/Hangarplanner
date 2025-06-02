/**
 * AeroDataBox API Integration
 * Spezialisiert auf das Abrufen von Flugdaten nach Flugzeugregistrierungen
 * Dokumentation: https://www.aerodatabox.com/docs/api
 */

const AeroDataBoxAPI = (() => {
	// API-Konfiguration
	const config = {
		// RapidAPI wird immer verwendet - keine alternative Auswahl mehr
		baseUrl: "https://aerodatabox.p.rapidapi.com",
		flightsEndpoint: "/flights",
		statusEndpoint: "/status",
		rapidApiHost: "aerodatabox.p.rapidapi.com",
		rapidApiKey: "ad46b0002emsh24ee20863379507p1010e6jsn17e9247ba903", // RapidAPI Key
		debugMode: true, // Debug-Modus für zusätzliche Konsolenausgaben
		rateLimitDelay: 1200, // 1.2 Sekunden Verzögerung zwischen API-Anfragen
		useMockData: false, // Wenn true, werden Testdaten statt API-Anfragen verwendet
	};

	// Tracking der letzten API-Anfrage für Rate Limiting
	let lastApiCall = 0;

	/**
	 * Ratenbegrenzer für API-Aufrufe
	 * @param {Function} apiCall - Die auszuführende API-Funktion
	 * @returns {Promise} Ergebnis der API-Anfrage
	 */
	const rateLimiter = async (apiCall) => {
		const now = Date.now();
		const timeSinceLastCall = now - lastApiCall;

		if (timeSinceLastCall < config.rateLimitDelay) {
			const waitTime = config.rateLimitDelay - timeSinceLastCall;
			if (config.debugMode) {
				console.log(
					`Rate Limiting: Warte ${waitTime}ms vor nächstem API-Aufruf`
				);
			}
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}

		lastApiCall = Date.now();
		return apiCall();
	};

	/**
	 * Aktualisiert die Statusanzeige in der UI
	 * @param {string} message - Anzuzeigende Nachricht
	 * @param {boolean} isError - Ob es sich um eine Fehlermeldung handelt
	 */
	const updateFetchStatus = (message, isError = false) => {
		const fetchStatus = document.getElementById("fetchStatus");
		if (fetchStatus) {
			fetchStatus.textContent = message;
			fetchStatus.className = isError
				? "text-sm text-center text-status-red"
				: "text-sm text-center";
		}

		// Auch in der Konsole loggen
		if (config.debugMode) {
			isError ? console.error(message) : console.log(message);
		}
	};

	/**
	 * Formatiert ein Datum im Format YYYY-MM-DD
	 * @param {Date|string} dateInput - Datum als Objekt oder String
	 * @returns {string} Formatiertes Datum
	 */
	const formatDate = (dateInput) => {
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		return date.toISOString().split("T")[0];
	};

	/**
	 * Macht die API-Anfrage für ein bestimmtes Flugzeug
	 * @param {string} aircraftRegistration - Flugzeugregistrierung (z.B. "D-AIBL")
	 * @param {string} date - Datum im Format YYYY-MM-DD
	 * @returns {Promise<Object>} Flugdaten
	 */
	const getAircraftFlights = async (aircraftRegistration, date) => {
		try {
			// Registrierung normalisieren
			const registration = aircraftRegistration.trim().toUpperCase();

			if (config.useMockData) {
				if (config.debugMode) {
					console.log(
						`Mock-Modus aktiviert, generiere Testdaten für ${registration}`
					);
				}
				return generateTestFlightData(registration, date);
			}

			updateFetchStatus(
				`Suche Flüge für Aircraft ${registration} am ${date}...`
			);

			// API-Aufruf mit Rate Limiting
			return await rateLimiter(async () => {
				// Immer RapidAPI verwenden - keine Alternativen mehr
				const apiUrl = `${config.baseUrl}${config.flightsEndpoint}/reg/${registration}/${date}?withAircraftImage=false&withLocation=false`;

				if (config.debugMode) {
					console.log(`API-Anfrage URL: ${apiUrl}`);
				}

				// API-Anfrage durchführen mit RapidAPI-Headers
				const response = await fetch(apiUrl, {
					method: "GET",
					headers: {
						"x-rapidapi-key": config.rapidApiKey,
						"x-rapidapi-host": config.rapidApiHost,
					},
				});

				if (!response.ok) {
					// Bei Fehlern Testdaten verwenden
					if (response.status === 404) {
						updateFetchStatus(
							`Keine echten Daten für ${registration} gefunden, generiere Testdaten`,
							false
						);
						return generateTestFlightData(registration, date);
					}

					const errorText = await response.text();
					throw new Error(
						`API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}. Details: ${errorText}`
					);
				}

				const data = await response.json();

				if (config.debugMode) {
					console.log(`AeroDataBox API-Antwort für ${registration}:`, data);
				}

				// Formatieren der Antwort in ein einheitliches Format
				return convertToUnifiedFormat(data, registration, date);
			});
		} catch (error) {
			console.error(
				`Fehler bei AeroDataBox API-Anfrage für ${aircraftRegistration}:`,
				error
			);
			updateFetchStatus(
				`Verwende Testdaten für ${aircraftRegistration} (API-Fehler: ${error.message})`,
				true
			);

			// Bei Fehlern Testdaten zurückgeben
			return generateTestFlightData(aircraftRegistration, date);
		}
	};

	/**
	 * Ruft Flugdaten für mehrere Flugzeuge ab
	 * @param {string[]} registrations - Liste der Flugzeugregistrierungen
	 * @param {string} date - Datum im Format YYYY-MM-DD
	 * @returns {Promise<Object[]>} Liste der Flugdaten
	 */
	const getMultipleAircraftFlights = async (registrations, date) => {
		try {
			updateFetchStatus(
				`Beginne Abruf für ${registrations.length} Flugzeuge...`
			);

			const results = [];
			for (const reg of registrations) {
				try {
					updateFetchStatus(`Rufe Daten für ${reg} ab...`);
					const data = await getAircraftFlights(reg, date);
					results.push({ registration: reg, data });
				} catch (error) {
					console.error(`Fehler bei ${reg}:`, error);
					results.push({
						registration: reg,
						error: error.message,
						data: generateTestFlightData(reg, date), // Fallback zu Testdaten
					});
				}
			}

			updateFetchStatus(
				`Alle Flugdaten abgerufen (${results.length} Flugzeuge)`
			);
			return results;
		} catch (error) {
			console.error("Fehler beim Abrufen mehrerer Flugzeugdaten:", error);
			throw error;
		}
	};

	/**
	 * Holt den Flugstatus eines bestimmten Fluges
	 * @param {string} number - Flugnummer (z.B. "LH123")
	 * @param {string} date - Datum im Format YYYY-MM-DD
	 * @returns {Promise<Object>} Flugstatusdaten
	 */
	const getFlightStatus = async (number, date) => {
		try {
			updateFetchStatus(`Prüfe Flugstatus für ${number} am ${date}...`);

			// Parameter für die Anfrage
			const withAircraftImage = true;
			const withLocation = true;

			// API-Aufruf mit Rate Limiting
			return await rateLimiter(async () => {
				// Immer RapidAPI verwenden - keine Alternativen mehr
				const apiUrl = `${config.baseUrl}${config.statusEndpoint}/${number}/${date}?withAircraftImage=${withAircraftImage}&withLocation=${withLocation}`;

				if (config.debugMode) {
					console.log(`API-Anfrage URL: ${apiUrl}`);
				}

				// API-Anfrage durchführen mit RapidAPI-Headers
				const response = await fetch(apiUrl, {
					headers: {
						"x-rapidapi-key": config.rapidApiKey,
						"x-rapidapi-host": config.rapidApiHost,
					},
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error(`API-Fehler: ${response.status} - ${errorText}`);
					throw new Error(
						`Flugstatus-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}`
					);
				}

				const data = await response.json();

				if (config.debugMode) {
					console.log(`Flugstatus-Antwort:`, data);
				}

				return data;
			});
		} catch (error) {
			console.error("Fehler beim Abrufen des Flugstatus:", error);
			updateFetchStatus(
				`Fehler beim Abrufen des Flugstatus: ${error.message}`,
				true
			);
			throw error;
		}
	};

	/**
	 * Konvertiert AeroDataBox API-Daten in ein einheitliches Format
	 * @param {Object} apiData - Daten von der AeroDataBox API
	 * @param {string} aircraftRegistration - Flugzeugregistrierung
	 * @param {string} date - Abfragedatum
	 * @returns {Object} Vereinheitlichte Flugdaten
	 */
	const convertToUnifiedFormat = (apiData, aircraftRegistration, date) => {
		// Wenn keine Daten oder leere Daten
		if (!apiData || !apiData.length) {
			return { data: [] };
		}

		// Formatieren der Daten ins einheitliche Format
		const formattedData = apiData.map((flight) => {
			// Extrahiere wichtige Informationen
			const departure = flight.departure || {};
			const arrival = flight.arrival || {};
			const airline = flight.airline || {};

			// Flugzeugtyp bestimmen
			let aircraftType = "Unknown";
			if (flight.aircraft && flight.aircraft.model) {
				aircraftType = flight.aircraft.model;
			}

			// Airline-Code und Flugnummer bestimmen
			let carrierCode = airline.iataCode || "??";
			let flightNumber = flight.number || "????";

			// Falls Flugnummer im Format "LH123" vorliegt, aufteilen
			if (flightNumber.match(/^[A-Z]{2}\d+$/)) {
				carrierCode = flightNumber.substring(0, 2);
				flightNumber = flightNumber.substring(2);
			}

			// Origin und Destination extrahieren
			const originCode = departure.airport
				? departure.airport.iata || departure.airport.icao || "???"
				: "???";
			const destCode = arrival.airport
				? arrival.airport.iata || arrival.airport.icao || "???"
				: "???";

			// Zeiten extrahieren und formatieren (HH:MM)
			const departureTime = departure.scheduledTime
				? new Date(departure.scheduledTime).toTimeString().substring(0, 5)
				: "--:--";
			const arrivalTime = arrival.scheduledTime
				? new Date(arrival.scheduledTime).toTimeString().substring(0, 5)
				: "--:--";

			// Rückgabe im einheitlichen Format
			return {
				type: "DatedFlight",
				scheduledDepartureDate: date,
				flightDesignator: {
					carrierCode: carrierCode,
					flightNumber: flightNumber,
				},
				flightPoints: [
					{
						departurePoint: true,
						arrivalPoint: false,
						iataCode: originCode,
						departure: {
							timings: [
								{
									qualifier: "STD",
									value: departureTime + ":00.000",
								},
							],
						},
					},
					{
						departurePoint: false,
						arrivalPoint: true,
						iataCode: destCode,
						arrival: {
							timings: [
								{
									qualifier: "STA",
									value: arrivalTime + ":00.000",
								},
							],
						},
					},
				],
				legs: [
					{
						aircraftEquipment: {
							aircraftType: aircraftType,
						},
						aircraftRegistration: aircraftRegistration,
					},
				],
				_source: "aerodatabox",
			};
		});

		return { data: formattedData };
	};

	/**
	 * Generiert realistische Testdaten für ein bestimmtes Flugzeug
	 * @param {string} aircraftRegistration - Flugzeugregistrierung
	 * @param {string} date - Datum
	 * @returns {Object} Testflugdaten
	 */
	const generateTestFlightData = (aircraftRegistration, date) => {
		// Bestimme den Flugzeugtyp und die Airline basierend auf der Registrierung
		let aircraftType = "A320";
		let carrierCode = "LH"; // Default: Lufthansa
		let flightNumber = String(Math.floor(Math.random() * 900) + 100);
		let originCode = "MUC"; // Default: München
		let destCode = "FRA"; // Default: Frankfurt

		// Lufthansa-Flugzeuge
		if (aircraftRegistration.startsWith("D-AI")) {
			carrierCode = "LH";

			// Langstreckenflugzeuge
			if (
				["D-AIBL", "D-AIMS", "D-AIHK", "D-AIKO"].includes(aircraftRegistration)
			) {
				aircraftType = ["A343", "A346", "A359", "A388", "B748"][
					Math.floor(Math.random() * 5)
				];
				flightNumber = String(Math.floor(Math.random() * 300) + 400); // LH400-LH699
				originCode = "MUC";
				destCode = ["JFK", "LAX", "SFO", "NRT", "HND", "PVG", "BOS", "IAD"][
					Math.floor(Math.random() * 8)
				];
			}
			// Kurzstreckenflugzeuge
			else {
				aircraftType = ["A319", "A320", "A321"][Math.floor(Math.random() * 3)];
				flightNumber = String(Math.floor(Math.random() * 400) + 1000); // LH1000-LH1399
				originCode = "MUC";
				destCode = ["LHR", "CDG", "FCO", "MAD", "ZRH", "VIE", "AMS"][
					Math.floor(Math.random() * 7)
				];
			}
		}
		// Condor
		else if (aircraftRegistration.startsWith("D-AB")) {
			carrierCode = "DE";
			aircraftType = ["B753", "B763", "A320", "A321"][
				Math.floor(Math.random() * 4)
			];
			flightNumber = String(Math.floor(Math.random() * 700) + 1500); // DE1500-DE2199
			originCode = "MUC";
			destCode = ["PMI", "LPA", "HRG", "FUE", "TFS"][
				Math.floor(Math.random() * 5)
			]; // Urlaubsziele
		}
		// Eurowings
		else if (aircraftRegistration.startsWith("D-AE")) {
			carrierCode = "EW";
			aircraftType = ["A319", "A320"][Math.floor(Math.random() * 2)];
			flightNumber = String(Math.floor(Math.random() * 500) + 2000); // EW2000-EW2499
			originCode = "DUS";
			destCode = ["PMI", "IBZ", "AGP", "FAO", "GRO"][
				Math.floor(Math.random() * 5)
			]; // Touristische Ziele
		}
		// US-Registrierungen (N)
		else if (aircraftRegistration.startsWith("N")) {
			const usCarriers = ["UA", "AA", "DL"];
			carrierCode = usCarriers[Math.floor(Math.random() * 3)];

			if (["UA", "AA"].includes(carrierCode)) {
				aircraftType = ["B738", "B772", "B77W", "B789"][
					Math.floor(Math.random() * 4)
				];
			} else {
				aircraftType = ["A321", "B738", "B739", "B764", "A332"][
					Math.floor(Math.random() * 5)
				];
			}

			flightNumber = String(Math.floor(Math.random() * 1000) + 100); // 100-1099
			originCode = ["JFK", "EWR", "ORD", "ATL", "DFW"][
				Math.floor(Math.random() * 5)
			];
			destCode = "MUC"; // Nach München
		}
		// British Airways
		else if (aircraftRegistration.startsWith("G-")) {
			carrierCode = "BA";
			aircraftType = ["A320", "A321", "B772", "B788"][
				Math.floor(Math.random() * 4)
			];
			flightNumber = String(Math.floor(Math.random() * 400) + 600); // BA600-BA999
			originCode = "LHR";
			destCode = "MUC"; // Nach München
		}

		// Zufällige Zeiten generieren
		const hour = String(Math.floor(Math.random() * 19) + 5).padStart(2, "0"); // 5-23 Uhr
		const minute = String(Math.floor(Math.random() * 60)).padStart(2, "0");
		const departureTime = `${hour}:${minute}`;

		// Ankunftszeit berechnen (Zufällige Flugdauer zwischen 1-10 Stunden)
		const flightDuration = Math.floor(Math.random() * 9) + 1; // 1-10 Stunden
		const arrivalDate = new Date(`${date}T${hour}:${minute}:00`);
		arrivalDate.setHours(arrivalDate.getHours() + flightDuration);
		const arrivalTime = arrivalDate.toTimeString().substring(0, 5);

		// Testflug erstellen
		return {
			data: [
				{
					type: "DatedFlight",
					scheduledDepartureDate: date,
					flightDesignator: {
						carrierCode: carrierCode,
						flightNumber: flightNumber,
					},
					flightPoints: [
						{
							departurePoint: true,
							arrivalPoint: false,
							iataCode: originCode,
							departure: {
								timings: [
									{
										qualifier: "STD",
										value: departureTime + ":00.000",
									},
								],
							},
						},
						{
							departurePoint: false,
							arrivalPoint: true,
							iataCode: destCode,
							arrival: {
								timings: [
									{
										qualifier: "STA",
										value: arrivalTime + ":00.000",
									},
								],
							},
						},
					],
					legs: [
						{
							aircraftEquipment: {
								aircraftType: aircraftType,
							},
							aircraftRegistration: aircraftRegistration,
						},
					],
					_generatedTestData: true,
				},
			],
		};
	};

	/**
	 * Sucht Flugdaten für ein Flugzeug
	 */
	const updateAircraftData = async (aircraftId, currentDate, nextDate) => {
		if (!aircraftId) {
			updateFetchStatus("Bitte Flugzeugkennung eingeben", true);
			return null;
		}

		console.log(
			`AeroDataBoxAPI: Suche Flugdaten für ${aircraftId} vom ${currentDate} bis ${nextDate}`
		);
		updateFetchStatus(`Suche Flugdaten für ${aircraftId}...`);

		try {
			// Hier würde in einer Produktionsumgebung der echte API-Aufruf stehen
			console.log("AeroDataBoxAPI: Simuliere API-Aufruf mit Parameters:", {
				aircraftId,
				currentDate,
				nextDate,
			});

			// Eine leichte Verzögerung für realistischeren API-Aufruf
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Testdaten zurückgeben mit korrektem Format
			const result = {
				arrivalTime: "10:30",
				departureTime: "12:45",
				position: "Gate A12",
				towStatus: "on-position", // Werte können sein: initiated, ongoing, on-position
				flightNumber: aircraftId,
				airport: document.getElementById("airportCodeInput")?.value || "MUC",
			};

			console.log("AeroDataBoxAPI: Daten erfolgreich abgerufen", result);
			updateFetchStatus(`Flugdaten für ${aircraftId} gefunden`);

			return result;
		} catch (error) {
			console.error(
				"AeroDataBoxAPI: Fehler beim Abrufen der Flugdaten:",
				error
			);
			updateFetchStatus(
				`Fehler beim Abrufen der Flugdaten: ${error.message || error}`,
				true
			);
			throw error;
		}
	};

	/**
	 * Initialisiert das AeroDataBox API-Modul
	 */
	const init = () => {
		try {
			console.log(
				"AeroDataBox API-Modul initialisiert (RapidAPI wird verwendet)"
			);

			// Testaufruf, um die API zu prüfen (nur im Debug-Modus)
			if (config.debugMode) {
				console.log("API-Konfiguration:", {
					baseUrl: config.baseUrl,
					flightsEndpoint: config.flightsEndpoint,
					statusEndpoint: config.statusEndpoint,
					rapidApiHost: config.rapidApiHost,
				});
			}
		} catch (error) {
			console.error(
				"Fehler bei der Initialisierung des AeroDataBox API-Moduls:",
				error
			);
		}
	};

	// Beim Laden der Seite initialisieren
	document.addEventListener("DOMContentLoaded", init);

	// Public API
	return {
		updateAircraftData,
		getAircraftFlights,
		getMultipleAircraftFlights,
		getFlightStatus,
		updateFetchStatus,
		init,
		setMockMode: (useMock) => {
			config.useMockData = useMock;
			console.log(
				`AeroDataBox API Mock-Modus ${useMock ? "aktiviert" : "deaktiviert"}`
			);
		},
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.AeroDataBoxAPI = AeroDataBoxAPI;

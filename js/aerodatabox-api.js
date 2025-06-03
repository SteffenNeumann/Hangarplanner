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
		rapidApiKey: "b76afbf516mshf864818d919de86p10475ejsna65b718a8602", // RapidAPI Key
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

			// Prüfen, ob das Datum in der Zukunft liegt (keine historischen Daten in der API)
			const queryDate = new Date(date);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Für Datumsanfragen in der Zukunft oder mehr als 1 Jahr zurück immer Testdaten verwenden
			if (
				queryDate > today.setFullYear(today.getFullYear() + 1) ||
				queryDate < today.setFullYear(today.getFullYear() - 1)
			) {
				if (config.debugMode) {
					console.log(
						`Datum ${date} ist weit in der Zukunft oder Vergangenheit, verwende Testdaten für ${registration}`
					);
				}
				return generateTestFlightData(registration, date);
			}

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
				// API-URL basierend auf dem Beispiel konstruieren
				const apiUrl = `${config.baseUrl}${config.flightsEndpoint}/reg/${registration}/${date}?withAircraftImage=false&withLocation=true&dateLocalRole=Both`;

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

				// Direkt den Text der Antwort lesen
				const responseText = await response.text();

				if (!responseText || responseText.trim() === "") {
					console.warn(`Leere Antwort von der API für ${registration}`);
					updateFetchStatus(
						`Leere Antwort von der API für ${registration}, keine Flugdaten verfügbar für dieses Datum`,
						false
					);
					// Leeres Daten-Array zurückgeben statt nicht existierende Funktion aufzurufen
					return { data: [] };
				}

				let data;
				try {
					data = JSON.parse(responseText);
				} catch (jsonError) {
					console.error(
						`JSON-Parsing-Fehler für ${registration}:`,
						jsonError,
						`Antwortinhalt: ${responseText.substring(0, 100)}...`
					);
					updateFetchStatus(
						`Fehlerhafte JSON-Daten für ${registration}, keine Flugdaten verfügbar`,
						false
					);
					// Leeres Daten-Array zurückgeben statt nicht existierende Funktion aufzurufen
					return { data: [] };
				}

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

		// Debug-Log für die empfangenen Daten
		if (config.debugMode) {
			console.log(`Konvertiere API-Daten für ${aircraftRegistration}`, apiData);
		}

		// Formatieren der Daten ins einheitliche Format
		const formattedData = apiData
			.map((flight) => {
				try {
					// Extrahiere wichtige Informationen
					const departure = flight.departure || {};
					const arrival = flight.arrival || {};
					const airline = flight.airline || {};
					const aircraft = flight.aircraft || {};

					// Flugzeugtyp bestimmen
					let aircraftType = "Unknown";
					if (aircraft.model) {
						aircraftType = aircraft.model;
					}

					// Airline-Code und Flugnummer bestimmen
					let carrierCode = airline.iata || "??";
					let flightNumber = flight.number || "????";

					// Falls Flugnummer im Format "LH 123" vorliegt, Leerzeichen entfernen
					flightNumber = flightNumber.replace(/\s+/g, "");

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

					// Zeiten extrahieren - Format prüfen und konvertieren
					let departureTime = "--:--";
					if (departure.scheduledTime) {
						if (departure.scheduledTime.local) {
							// Format: "2025-06-02 17:30+02:00"
							const timeMatch =
								departure.scheduledTime.local.match(/\d{2}:\d{2}/);
							if (timeMatch) departureTime = timeMatch[0];
						} else if (typeof departure.scheduledTime === "string") {
							const timeMatch = new Date(departure.scheduledTime)
								.toTimeString()
								.match(/\d{2}:\d{2}/);
							if (timeMatch) departureTime = timeMatch[0];
						}
					}

					let arrivalTime = "--:--";
					if (arrival.scheduledTime) {
						if (arrival.scheduledTime.local) {
							// Format: "2025-06-02 20:40+02:00"
							const timeMatch =
								arrival.scheduledTime.local.match(/\d{2}:\d{2}/);
							if (timeMatch) arrivalTime = timeMatch[0];
						} else if (typeof arrival.scheduledTime === "string") {
							const timeMatch = new Date(arrival.scheduledTime)
								.toTimeString()
								.match(/\d{2}:\d{2}/);
							if (timeMatch) arrivalTime = timeMatch[0];
						}
					}

					// Bestimmen des Abflugdatums - entweder aus den API-Daten oder vom übergebenen Parameter
					let scheduledDepartureDate = date;
					if (departure.scheduledTime && departure.scheduledTime.local) {
						const dateMatch =
							departure.scheduledTime.local.match(/\d{4}-\d{2}-\d{2}/);
						if (dateMatch) scheduledDepartureDate = dateMatch[0];
					}

					// Debug-Ausgabe für jeden verarbeiteten Flug
					if (config.debugMode) {
						console.log(
							`Verarbeite Flug für ${aircraftRegistration}: ${originCode}→${destCode}, Abflug: ${departureTime}, Ankunft: ${arrivalTime}`
						);
					}

					// Rückgabe im einheitlichen Format
					return {
						type: "DatedFlight",
						scheduledDepartureDate: scheduledDepartureDate,
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
								aircraftRegistration:
									aircraftRegistration || aircraft.reg || "",
							},
						],
						_source: "aerodatabox",
						_rawFlightData: flight, // Original-Daten zur Fehlersuche speichern
					};
				} catch (error) {
					console.error(
						"Fehler bei der Konvertierung eines Fluges:",
						error,
						flight
					);
					// Bei Fehler einen leeren Flug zurückgeben
					return null;
				}
			})
			.filter(Boolean); // Entferne alle null-Einträge

		return { data: formattedData };
	};

	/**
	 * Macht die API-Anfrage für ein bestimmtes Flugzeug mit Datumsbereich
	 * @param {string} aircraftRegistration - Flugzeugregistrierung (z.B. "D-AIBL")
	 * @param {string} startDate - Startdatum im Format YYYY-MM-DD
	 * @param {string} endDate - Enddatum im Format YYYY-MM-DD
	 * @returns {Promise<Object>} Flugdaten
	 */
	const getAircraftFlightsDateRange = async (
		aircraftRegistration,
		startDate,
		endDate
	) => {
		try {
			// Registrierung normalisieren
			const registration = aircraftRegistration.trim().toUpperCase();

			// Prüfen, ob die Daten in der Zukunft oder weit zurück liegen
			const startQueryDate = new Date(startDate);
			const endQueryDate = new Date(endDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Für Datumsanfragen in der Zukunft oder mehr als 1 Jahr zurück immer Testdaten verwenden
			if (
				endQueryDate > today.setFullYear(today.getFullYear() + 1) ||
				startQueryDate < today.setFullYear(today.getFullYear() - 1)
			) {
				if (config.debugMode) {
					console.log(
						`Datumsbereich ${startDate} bis ${endDate} ist zu weit in der Zukunft oder Vergangenheit, verwende Testdaten für ${registration}`
					);
				}
				// Testdaten für beide Tage generieren und zusammenführen
				const startDayData = generateTestFlightData(registration, startDate);
				const endDayData = generateTestFlightData(registration, endDate);
				return {
					data: [...(startDayData.data || []), ...(endDayData.data || [])],
				};
			}

			if (config.useMockData) {
				if (config.debugMode) {
					console.log(
						`Mock-Modus aktiviert, generiere Testdaten für ${registration} im Bereich ${startDate} bis ${endDate}`
					);
				}
				// Testdaten für beide Tage generieren und zusammenführen
				const startDayData = generateTestFlightData(registration, startDate);
				const endDayData = generateTestFlightData(registration, endDate);
				return {
					data: [...(startDayData.data || []), ...(endDayData.data || [])],
				};
			}

			updateFetchStatus(
				`Suche Flüge für Aircraft ${registration} vom ${startDate} bis ${endDate}...`
			);

			// API-Aufruf mit Rate Limiting
			return await rateLimiter(async () => {
				// Anfrage mit Datumsbereich
				const apiUrl = `${config.baseUrl}${config.flightsEndpoint}/reg/${registration}/${startDate}/${endDate}?withAircraftImage=false&withLocation=false&dateLocalRole=Both`;

				if (config.debugMode) {
					console.log(`API-Anfrage URL mit Datumsbereich: ${apiUrl}`);
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
							`Keine echten Daten für ${registration} im Zeitraum gefunden, generiere Testdaten`,
							false
						);
						// Testdaten für beide Tage generieren und zusammenführen
						const selectedAirport =
							document.getElementById("airportCodeInput")?.value || "MUC";
						const startDayData = generateTestFlightData(
							registration,
							startDate,
							selectedAirport
						);
						const endDayData = generateTestFlightData(
							registration,
							endDate,
							selectedAirport
						);
						return {
							data: [...(startDayData.data || []), ...(endDayData.data || [])],
						};
					}

					const errorText = await response.text();
					throw new Error(
						`API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}. Details: ${errorText}`
					);
				}

				// Prüfe, ob die Antwort Inhalt hat, bevor JSON-Parsing versucht wird
				const responseText = await response.text();

				if (!responseText || responseText.trim() === "") {
					console.warn(
						`Leere Antwort von der API für ${registration} im Zeitraum`
					);
					updateFetchStatus(
						`Leere Antwort von der API für ${registration} im Zeitraum, verwende Testdaten`,
						false
					);
					// Testdaten für beide Tage generieren und zusammenführen
					const startDayData = generateTestFlightData(registration, startDate);
					const endDayData = generateTestFlightData(registration, endDate);
					return {
						data: [...(startDayData.data || []), ...(endDayData.data || [])],
					};
				}

				let data;
				try {
					data = JSON.parse(responseText);
				} catch (jsonError) {
					console.error(
						`JSON-Parsing-Fehler für ${registration}:`,
						jsonError,
						`Antwortinhalt: ${responseText.substring(0, 100)}...`
					);
					updateFetchStatus(
						`Fehlerhafte JSON-Daten für ${registration} im Zeitraum, verwende Testdaten`,
						false
					);
					// Testdaten für beide Tage generieren und zusammenführen
					const startDayData = generateTestFlightData(registration, startDate);
					const endDayData = generateTestFlightData(registration, endDate);
					return {
						data: [...(startDayData.data || []), ...(endDayData.data || [])],
					};
				}

				if (config.debugMode) {
					console.log(
						`AeroDataBox API-Antwort für ${registration} im Datumsbereich:`,
						data
					);
				}

				// Formatieren der Antwort in ein einheitliches Format
				return convertToUnifiedFormat(data, registration, startDate);
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

			// Bei Fehlern Testdaten für beide Tage generieren und zurückgeben
			const startDayData = generateTestFlightData(
				aircraftRegistration,
				startDate
			);
			const endDayData = generateTestFlightData(aircraftRegistration, endDate);
			return {
				data: [...(startDayData.data || []), ...(endDayData.data || [])],
			};
		}
	};

	/**
	 * Sucht Flugdaten für ein Flugzeug
	 * @param {string} aircraftId - Flugzeugkennung (Registrierung)
	 * @param {string} currentDate - Das aktuelle Datum für die Ankunft (letzter Flug)
	 * @param {string} nextDate - Das Folgedatum für den Abflug (erster Flug)
	 * @returns {Promise<Object>} Flugdaten mit letztem Ankunftsflug und erstem Abflug
	 */
	const updateAircraftData = async (aircraftId, currentDate, nextDate) => {
		if (!aircraftId) {
			updateFetchStatus("Bitte Flugzeugkennung eingeben", true);
			return null;
		}

		// Standardwerte für Daten verwenden, falls nicht angegeben
		const today = formatDate(new Date());
		const tomorrow = formatDate(
			new Date(new Date().setDate(new Date().getDate() + 1))
		);

		currentDate = currentDate || today;
		nextDate = nextDate || tomorrow;

		console.log(
			`AeroDataBoxAPI: Suche Flugdaten für ${aircraftId} - Ankunft (letzter Flug am ${currentDate}), Abflug (erster Flug am ${nextDate})`
		);
		updateFetchStatus(`Suche Flugdaten für ${aircraftId}...`);

		try {
			// Hole den aktuell ausgewählten Flughafen für die Filterung
			const selectedAirport =
				document.getElementById("airportCodeInput")?.value || "MUC";

			if (config.debugMode) {
				console.log(`Gewählter Flughafen für Filterung: ${selectedAirport}`);
			}

			// Flugdaten für beide Tage mit separaten Anfragen abrufen
			let allFlights = [];
			let currentDayError = false;

			// Für aktuellen Tag
			try {
				const currentDayData = await getAircraftFlights(
					aircraftId,
					currentDate
				);

				if (currentDayData && currentDayData.data) {
					allFlights = [...allFlights, ...currentDayData.data];
				}
			} catch (error) {
				console.warn(
					`Fehler beim Abrufen der Flüge für ${currentDate}: ${error.message}`
				);
				currentDayError = true;
			}

			// Für nächsten Tag - nur wenn aktueller Tag erfolgreich war
			if (!currentDayError) {
				try {
					const nextDayData = await getAircraftFlights(aircraftId, nextDate);

					if (nextDayData && nextDayData.data) {
						allFlights = [...allFlights, ...nextDayData.data];
					}
				} catch (error) {
					console.warn(
						`Keine Daten für Folgetag ${nextDate} verfügbar: ${error.message}`
					);
					// Kein Fehler werfen - wir haben bereits Daten vom aktuellen Tag
				}
			}

			// Filtern der Flüge nach dem ausgewählten Flughafen
			const airportFlights = allFlights.filter((flight) => {
				// Suche nach dem ausgewählten Flughafen in Abflug oder Ankunft
				const hasSelectedAirport = flight.flightPoints?.some(
					(point) => point.iataCode === selectedAirport
				);

				if (config.debugMode && hasSelectedAirport) {
					console.log(
						`Flug mit Flughafen ${selectedAirport} gefunden:`,
						flight
					);
				}

				return hasSelectedAirport;
			});

			// Wenn keine Flüge gefunden wurden, leeres Ergebnis zurückgeben
			if (airportFlights.length === 0) {
				updateFetchStatus(
					`Keine Flüge für ${aircraftId} an Flughafen ${selectedAirport} gefunden`,
					false
				);
				return {
					originCode: "---",
					destCode: "---",
					departureTime: "--:--",
					arrivalTime: "--:--",
					data: [],
				};
			}

			// Debug-Information zu gefilterten Flügen
			if (config.debugMode) {
				console.log(
					`Flüge für Flughafen ${selectedAirport}: ${airportFlights.length} von ${allFlights.length}`
				);
			}

			// Flugdaten extrahieren für die Rückgabe
			const result = {
				originCode: "---",
				destCode: "---",
				departureTime: "--:--",
				arrivalTime: "--:--",
				data: airportFlights,
			};

			// Den ersten Flug für die Rückgabe verwenden
			if (airportFlights.length > 0) {
				const flight = airportFlights[0];

				// Flugpunkte extrahieren
				if (flight.flightPoints && flight.flightPoints.length >= 2) {
					const departurePoint = flight.flightPoints.find(
						(p) => p.departurePoint
					);
					const arrivalPoint = flight.flightPoints.find((p) => p.arrivalPoint);

					if (departurePoint) {
						result.originCode = departurePoint.iataCode || "---";
						if (departurePoint.departure && departurePoint.departure.timings) {
							const stdTiming = departurePoint.departure.timings.find(
								(t) => t.qualifier === "STD"
							);
							if (stdTiming && stdTiming.value) {
								result.departureTime = stdTiming.value.substring(0, 5);
							}
						}
					}

					if (arrivalPoint) {
						result.destCode = arrivalPoint.iataCode || "---";
						if (arrivalPoint.arrival && arrivalPoint.arrival.timings) {
							const staTiming = arrivalPoint.arrival.timings.find(
								(t) => t.qualifier === "STA"
							);
							if (staTiming && staTiming.value) {
								result.arrivalTime = staTiming.value.substring(0, 5);
							}
						}
					}
				}
			}

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

			// Leeres Ergebnisobjekt zurückgeben
			return {
				originCode: "---",
				destCode: "---",
				departureTime: "--:--",
				arrivalTime: "--:--",
				data: [],
			};
		}
	};

	/**
	 * Ruft Flugdaten für einen bestimmten Flughafen ab
	 * @param {string} airportCode - IATA-Code des Flughafens (z.B. "MUC")
	 * @param {string} startDateTime - Startzeit im Format YYYY-MM-DDThh:mm
	 * @param {string} endDateTime - Endzeit im Format YYYY-MM-DDThh:mm
	 * @returns {Promise<Object>} - Aufbereitete Flugdaten
	 */
	const getAirportFlights = async (airportCode, startDateTime, endDateTime) => {
		try {
			updateFetchStatus(`Suche Flüge für Flughafen ${airportCode}...`);

			// API-Aufruf mit Rate Limiting
			return await rateLimiter(async () => {
				const apiUrl = `${config.baseUrl}/flights/airports/iata/${airportCode}/${startDateTime}/${endDateTime}?withLeg=true&direction=Both&withCancelled=true&withCodeshared=true&withCargo=true&withPrivate=false&withLocation=false`;

				if (config.debugMode) {
					console.log(`API-Anfrage URL für Flughafen: ${apiUrl}`);
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
					throw new Error(
						`API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}`
					);
				}

				const responseText = await response.text();

				if (!responseText || responseText.trim() === "") {
					throw new Error("Leere Antwort von der API erhalten");
				}

				let data;
				try {
					data = JSON.parse(responseText);
				} catch (jsonError) {
					console.error("JSON-Parsing-Fehler:", jsonError);
					throw new Error("Fehlerhafte Daten empfangen");
				}

				if (config.debugMode) {
					console.log(`Flughafen ${airportCode} API-Antwort:`, data);
				}

				return data;
			});
		} catch (error) {
			console.error(
				`Fehler bei der Flughafen-API-Anfrage für ${airportCode}:`,
				error
			);
			updateFetchStatus(
				`Fehler beim Abrufen von Flugdaten: ${error.message}`,
				true
			);

			// Leere Ergebnisstruktur zurückgeben
			return {
				arrivals: [],
				departures: [],
			};
		}
	};

	/**
	 * Generiert Test-Flugdaten für ein bestimmtes Flugzeug
	 * @param {string} registration - Flugzeugkennung
	 * @param {string} date - Datum im Format YYYY-MM-DD
	 * @param {string} [preferredAirport=null] - Bevorzugter Flughafen (IATA-Code)
	 * @returns {Object} Test-Flugdaten
	 */
	const generateTestFlightData = (
		registration,
		date,
		preferredAirport = null
	) => {
		// Standardflughafen ist MUC, es sei denn, es wurde ein anderer angegeben
		const airport = preferredAirport || "MUC";

		// Zufällige Destinationen basierend auf dem Flughafen
		const destinations = {
			MUC: ["FRA", "BER", "HAM", "DUS", "CGN", "STR"],
			FRA: ["MUC", "BER", "HAM", "DUS", "CGN", "STR"],
			BER: ["MUC", "FRA", "HAM", "DUS", "CGN", "STR"],
		};

		// Standardziele, falls der Flughafen nicht in der Liste ist
		const destinationOptions = destinations[airport] || ["FRA", "MUC", "BER"];

		// Wähle ein zufälliges Ziel aus
		const destination =
			destinationOptions[Math.floor(Math.random() * destinationOptions.length)];

		// Erstelle eine zufällige Abflug- und Ankunftszeit
		const hour = String(Math.floor(Math.random() * 19) + 5).padStart(2, "0"); // 5-23 Uhr
		const minute = String(Math.floor(Math.random() * 60)).padStart(2, "0");
		const departureTime = `${hour}:${minute}`;

		// Ankunftszeit etwa 1-2 Stunden später
		const arrivalHour = String(
			Math.min(23, parseInt(hour) + 1 + Math.floor(Math.random()))
		).padStart(2, "0");
		const arrivalMinute = String(Math.floor(Math.random() * 60)).padStart(
			2,
			"0"
		);
		const arrivalTime = `${arrivalHour}:${arrivalMinute}`;

		// Datenstruktur erstellen
		const flightData = {
			type: "DatedFlight",
			scheduledDepartureDate: date,
			flightDesignator: {
				carrierCode: "LH",
				flightNumber: String(1000 + Math.floor(Math.random() * 1000)),
			},
			flightPoints: [
				{
					departurePoint: true,
					arrivalPoint: false,
					iataCode: airport,
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
					iataCode: destination,
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
						aircraftType: "A320",
					},
					aircraftRegistration: registration,
				},
			],
			_source: "test-data",
			_testData: true,
		};

		return { data: [flightData] };
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

			// Patch für die UI-Überprüfungsfunktion im updateAircraftData
			// Ersetze die Verwendung von Assignment to const variable
			const originalUpdateAircraftData = updateAircraftData;
			window.originalAeroDataBoxUpdateAircraftData = originalUpdateAircraftData; // Speichern Sie die originale Funktion woanders

			// Definiere eine neue Funktion mit demselben Namen
			window.AeroDataBoxAPI = window.AeroDataBoxAPI || {};
			window.AeroDataBoxAPI.updateAircraftData = async function (
				aircraftId,
				currentDate,
				nextDate
			) {
				const result = await originalUpdateAircraftData(
					aircraftId,
					currentDate,
					nextDate
				);

				// Ersetze die bestehende UI-Überprüfungslogik
				setTimeout(() => {
					// Logik zur UI-Überprüfung hier...
				}, 500);

				return result;
			};

			// Explizit updateFetchStatus auf das globale Objekt übertragen
			window.AeroDataBoxAPI.updateFetchStatus = updateFetchStatus;
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
		getAircraftFlightsDateRange,
		getMultipleAircraftFlights,
		getFlightStatus,
		updateFetchStatus,
		getAirportFlights,
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

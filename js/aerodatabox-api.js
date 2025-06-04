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

		// Aviationstack Konfiguration
		useAviationstack: false, // Schalter für die API-Auswahl
		aviationstackBaseUrl: "http://api.aviationstack.com/v1",
		aviationstackKey: "426b652e15703c7b01f50adf5c41e7e6",

		// AirLabs Konfiguration - 1000 kostenlose Anfragen pro Monat
		useAirLabs: false, // Schalter für AirLabs
		airLabsBaseUrl: "https://airlabs.co/api/v9",
		airLabsKey: "", // Hier deinen API-Key eintragen nach Registrierung

		// API-Provider Auswahl: "aerodatabox", "aviationstack" oder "airlabs"
		activeProvider: "aerodatabox",

		debugMode: true, // Debug-Modus für zusätzliche Konsolenausgaben
		rateLimitDelay: 1200, // 1.2 Sekunden Verzögerung zwischen API-Anfragen
		useMockData: false, // Wenn true, werden Testdaten statt API-Anfragen verwendet
	};

	// Tracking der letzten API-Anfrage für Rate Limiting
	let lastApiCall = 0;

	/**
	 * Initialisierungsfunktion für die API
	 * @param {Object} options - Konfigurationsoptionen
	 */
	const init = (options = {}) => {
		// Optionen aus dem Funktionsaufruf übernehmen
		if (options.activeProvider) {
			config.activeProvider = options.activeProvider;
			// Kompatibilität mit altem Code
			config.useAviationstack = options.activeProvider === "aviationstack";
			config.useAirLabs = options.activeProvider === "airlabs";
		} else if (options.useAviationstack !== undefined) {
			config.useAviationstack = Boolean(options.useAviationstack);
			config.activeProvider = options.useAviationstack
				? "aviationstack"
				: "aerodatabox";
		} else if (options.useAirLabs !== undefined) {
			config.useAirLabs = Boolean(options.useAirLabs);
			config.activeProvider = options.useAirLabs ? "airlabs" : "aerodatabox";
		}

		if (options.useMockData !== undefined)
			config.useMockData = Boolean(options.useMockData);
		if (options.debugMode !== undefined)
			config.debugMode = Boolean(options.debugMode);

		// API-Keys übernehmen, falls angegeben
		if (options.aviationstackKey)
			config.aviationstackKey = options.aviationstackKey;
		if (options.rapidApiKey) config.rapidApiKey = options.rapidApiKey;
		if (options.airLabsKey) config.airLabsKey = options.airLabsKey;

		if (config.debugMode) {
			console.log(
				`AeroDataBoxAPI initialisiert: ${config.activeProvider} API aktiviert`
			);
		}
	};

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
	 * Ruft Daten von der Aviationstack API ab
	 * @param {string} endpoint - API-Endpunkt (z.B. "flights")
	 * @param {Object} params - Abfrageparameter
	 * @returns {Promise<Object>} API-Antwortdaten
	 */
	const getAviationstackData = async (endpoint, params = {}) => {
		try {
			// URL aufbauen mit API-Key
			let url = `${config.aviationstackBaseUrl}/${endpoint}?access_key=${config.aviationstackKey}`;

			// Parameter hinzufügen
			Object.keys(params).forEach((key) => {
				url += `&${key}=${encodeURIComponent(params[key])}`;
			});

			if (config.debugMode) {
				console.log(`Aviationstack API-Anfrage: ${url}`);
			}

			// API-Anfrage durchführen
			const response = await fetch(url);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Aviationstack API-Fehler: ${response.status} ${response.statusText}. Details: ${errorText}`
				);
			}

			const data = await response.json();

			if (data.error) {
				throw new Error(
					`Aviationstack API-Fehler: ${data.error.code} - ${data.error.message}`
				);
			}

			if (config.debugMode) {
				console.log("Aviationstack API-Antwort:", data);
			}

			return data;
		} catch (error) {
			console.error("Fehler bei Aviationstack API-Anfrage:", error);
			throw error;
		}
	};

	/**
	 * Ruft Daten von der AirLabs API ab
	 * @param {string} endpoint - API-Endpunkt (z.B. "flights")
	 * @param {Object} params - Abfrageparameter
	 * @returns {Promise<Object>} API-Antwortdaten
	 */
	const getAirLabsData = async (endpoint, params = {}) => {
		try {
			// URL aufbauen mit API-Key
			let url = `${config.airLabsBaseUrl}/${endpoint}?api_key=${config.airLabsKey}`;

			// Parameter hinzufügen
			Object.keys(params).forEach((key) => {
				url += `&${key}=${encodeURIComponent(params[key])}`;
			});

			if (config.debugMode) {
				console.log(`AirLabs API-Anfrage: ${url}`);
			}

			// API-Anfrage durchführen
			const response = await fetch(url);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`AirLabs API-Fehler: ${response.status} ${response.statusText}. Details: ${errorText}`
				);
			}

			const data = await response.json();

			if (data.error) {
				throw new Error(
					`AirLabs API-Fehler: ${data.error.code} - ${data.error.message}`
				);
			}

			if (config.debugMode) {
				console.log("AirLabs API-Antwort:", data);
			}

			return data;
		} catch (error) {
			console.error("Fehler bei AirLabs API-Anfrage:", error);
			throw error;
		}
	};

	/**
	 * Konvertiert Aviationstack-Daten in das einheitliche Format
	 * @param {Object} aviationstackData - Daten von der Aviationstack API
	 * @param {string} aircraftRegistration - Flugzeugregistrierung
	 * @param {string} date - Abfragedatum
	 * @returns {Object} Vereinheitlichte Flugdaten
	 */
	const convertAviationstackToUnifiedFormat = (
		aviationstackData,
		aircraftRegistration,
		date
	) => {
		if (
			!aviationstackData ||
			!aviationstackData.data ||
			!aviationstackData.data.length
		) {
			return { data: [] };
		}

		const formattedData = aviationstackData.data
			.map((flight) => {
				try {
					// Extrahiere Flugdaten
					const departureIata = flight.departure?.iata || "???";
					const arrivalIata = flight.arrival?.iata || "???";
					const departureTime = flight.departure?.scheduled
						? new Date(flight.departure.scheduled)
								.toTimeString()
								.substring(0, 5)
						: "--:--";
					const arrivalTime = flight.arrival?.scheduled
						? new Date(flight.arrival.scheduled).toTimeString().substring(0, 5)
						: "--:--";

					// Fluggesellschaft und Flugnummer
					const airline = flight.airline?.iata || "";
					const flightNumber = flight.flight?.number || "";

					// Flugzeugtyp
					const aircraftType = flight.aircraft?.icao || "Unknown";

					// Geplantes Abflugdatum aus den API-Daten oder Parameter
					const scheduledDepartureDate = flight.flight_date || date;

					return {
						type: "DatedFlight",
						scheduledDepartureDate: scheduledDepartureDate,
						flightDesignator: {
							carrierCode: airline,
							flightNumber: flightNumber,
						},
						flightPoints: [
							{
								departurePoint: true,
								arrivalPoint: false,
								iataCode: departureIata,
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
								iataCode: arrivalIata,
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
									aircraftRegistration || flight.aircraft?.registration || "",
							},
						],
						_source: "aviationstack",
						_rawFlightData: flight,
					};
				} catch (error) {
					console.error(
						"Fehler bei der Konvertierung eines Aviationstack-Fluges:",
						error,
						flight
					);
					return null;
				}
			})
			.filter(Boolean);

		return { data: formattedData };
	};

	/**
	 * Konvertiert AirLabs-Daten in das einheitliche Format
	 * @param {Object} airLabsData - Daten von der AirLabs API
	 * @param {string} aircraftRegistration - Flugzeugregistrierung
	 * @param {string} date - Abfragedatum
	 * @returns {Object} Vereinheitlichte Flugdaten
	 */
	const convertAirLabsToUnifiedFormat = (
		airLabsData,
		aircraftRegistration,
		date
	) => {
		if (!airLabsData || !airLabsData.response || !airLabsData.response.length) {
			return { data: [] };
		}

		const formattedData = airLabsData.response
			.map((flight) => {
				try {
					// Extrahiere Flugdaten
					const departureIata = flight.dep_iata || "???";
					const arrivalIata = flight.arr_iata || "???";

					// Zeiten formatieren (falls vorhanden)
					const departureTime = flight.dep_time
						? new Date(flight.dep_time).toTimeString().substring(0, 5)
						: "--:--";
					const arrivalTime = flight.arr_time
						? new Date(flight.arr_time).toTimeString().substring(0, 5)
						: "--:--";

					// Fluggesellschaft und Flugnummer
					const airline = flight.airline_iata || "";
					const flightNumber =
						flight.flight_number || flight.flight_iata?.substring(2) || "";

					// Flugzeugtyp
					const aircraftType = flight.aircraft_icao || "Unknown";

					// Geplantes Abflugdatum aus den API-Daten oder Parameter
					const scheduledDepartureDate = flight.dep_time
						? new Date(flight.dep_time).toISOString().split("T")[0]
						: date;

					return {
						type: "DatedFlight",
						scheduledDepartureDate: scheduledDepartureDate,
						flightDesignator: {
							carrierCode: airline,
							flightNumber: flightNumber,
						},
						flightPoints: [
							{
								departurePoint: true,
								arrivalPoint: false,
								iataCode: departureIata,
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
								iataCode: arrivalIata,
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
									aircraftRegistration || flight.reg_number || "",
							},
						],
						_source: "airlabs",
						_rawFlightData: flight,
					};
				} catch (error) {
					console.error(
						"Fehler bei der Konvertierung eines AirLabs-Fluges:",
						error,
						flight
					);
					return null;
				}
			})
			.filter(Boolean);

		return { data: formattedData };
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

			// Entscheide, welche API verwendet werden soll
			if (config.activeProvider === "airlabs") {
				try {
					// Verwende AirLabs API
					const params = {
						reg_number: registration,
					};

					// Datum kann optional hinzugefügt werden, wenn die API es unterstützt
					// AirLabs unterstützt aktuell nur Live-Flüge, nicht historische nach Datum

					const airLabsData = await rateLimiter(() =>
						getAirLabsData("flights", params)
					);

					if (config.debugMode) {
						console.log(`AirLabs Antwort für ${registration}:`, airLabsData);
					}

					if (!airLabsData.response || airLabsData.response.length === 0) {
						updateFetchStatus(
							`Keine AirLabs-Daten für ${registration} gefunden, generiere Testdaten`,
							false
						);
						return generateTestFlightData(registration, date);
					}

					return convertAirLabsToUnifiedFormat(airLabsData, registration, date);
				} catch (airLabsError) {
					console.error(
						`Fehler bei AirLabs API-Anfrage für ${registration}:`,
						airLabsError
					);
					updateFetchStatus(
						`Fehler bei AirLabs-Anfrage, versuche Fallback...`,
						true
					);

					// Fallback zu AeroDataBox, wenn AirLabs fehlschlägt
					if (!config.useMockData) {
						config.activeProvider = "aerodatabox"; // Temporärer Fallback
						console.log("Fallback zu AeroDataBox API aktiviert");
					} else {
						return generateTestFlightData(registration, date);
					}
				}
			} else if (
				config.activeProvider === "aviationstack" ||
				config.useAviationstack
			) {
				try {
					// Verwende Aviationstack API
					const params = {
						flight_status: "scheduled",
						aircraft_reg: registration,
						flight_date: date,
					};

					const aviationstackData = await rateLimiter(() =>
						getAviationstackData("flights", params)
					);

					if (config.debugMode) {
						console.log(
							`Aviationstack Antwort für ${registration}:`,
							aviationstackData
						);
					}

					if (!aviationstackData.data || aviationstackData.data.length === 0) {
						updateFetchStatus(
							`Keine Aviationstack-Daten für ${registration} gefunden, generiere Testdaten`,
							false
						);
						return generateTestFlightData(registration, date);
					}

					return convertAviationstackToUnifiedFormat(
						aviationstackData,
						registration,
						date
					);
				} catch (aviationstackError) {
					console.error(
						`Fehler bei Aviationstack API-Anfrage für ${registration}:`,
						aviationstackError
					);
					updateFetchStatus(
						`Fehler bei Aviationstack-Anfrage, versuche AeroDataBox als Fallback...`,
						true
					);

					// Bei Fehler zu AeroDataBox wechseln, wenn nicht im Mock-Modus
					if (!config.useMockData) {
						config.activeProvider = "aerodatabox"; // Temporärer Fallback
						console.log("Fallback zu AeroDataBox API aktiviert");
					} else {
						return generateTestFlightData(registration, date);
					}
				}
			}

			// Standard AeroDataBox API oder Fallback
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
					const startDayData = generateTestFlightData(registration, date);
					const endDayData = generateTestFlightData(registration, date);
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
					const startDayData = generateTestFlightData(registration, date);
					const endDayData = generateTestFlightData(registration, date);
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
				return convertToUnifiedFormat(data, registration, date);
			});
		} catch (error) {
			console.error(
				`Fehler bei API-Anfrage für ${aircraftRegistration}:`,
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

			// Separate Flüge zum und vom ausgewählten Flughafen
			let arrivalFlights = [];
			let departureFlights = [];

			allFlights.forEach((flight) => {
				if (flight.flightPoints && flight.flightPoints.length >= 2) {
					const departurePoint = flight.flightPoints.find(
						(p) => p.departurePoint
					);
					const arrivalPoint = flight.flightPoints.find((p) => p.arrivalPoint);

					// Prüfen, ob der Flug zum ausgewählten Flughafen geht (Ankunft)
					if (arrivalPoint && arrivalPoint.iataCode === selectedAirport) {
						// Flug mit Ankunft am ausgewählten Flughafen
						// Datum aus scheduledDepartureDate extrahieren, um zu prüfen ob es der aktuelle Tag ist
						if (flight.scheduledDepartureDate === currentDate) {
							arrivalFlights.push(flight);
						}
					}

					// Prüfen, ob der Flug vom ausgewählten Flughafen kommt (Abflug)
					if (departurePoint && departurePoint.iataCode === selectedAirport) {
						// Flug mit Abflug vom ausgewählten Flughafen
						// Datum aus scheduledDepartureDate extrahieren, um zu prüfen ob es der nächste Tag ist
						if (flight.scheduledDepartureDate === nextDate) {
							departureFlights.push(flight);
						}
					}
				}
			});

			if (config.debugMode) {
				console.log(`Ankünfte am ${selectedAirport}: ${arrivalFlights.length}`);
				console.log(
					`Abflüge von ${selectedAirport}: ${departureFlights.length}`
				);
			}

			// Sortieren der Ankunftsflüge nach Zeit (späteste zuerst) und Abflüge (früheste zuerst)
			arrivalFlights.sort((a, b) => {
				// Zeit aus dem arrivalPoint extrahieren
				const timeA = getTimeFromFlightPoint(
					a.flightPoints.find((p) => p.arrivalPoint)
				);
				const timeB = getTimeFromFlightPoint(
					b.flightPoints.find((p) => p.arrivalPoint)
				);
				// Absteigende Sortierung für Ankünfte (späteste zuerst)
				return timeB - timeA;
			});

			departureFlights.sort((a, b) => {
				// Zeit aus dem departurePoint extrahieren
				const timeA = getTimeFromFlightPoint(
					a.flightPoints.find((p) => p.departurePoint)
				);
				const timeB = getTimeFromFlightPoint(
					b.flightPoints.find((p) => p.departurePoint)
				);
				// Aufsteigende Sortierung für Abflüge (früheste zuerst)
				return timeA - timeB;
			});

			// Verbesserte Sortierung mit Zeitrelevanz
			arrivalFlights = improveDayTimeRelevance(
				arrivalFlights,
				(flight) => flight.flightPoints.find((p) => p.arrivalPoint),
				true // ist Ankunft
			);

			departureFlights = improveDayTimeRelevance(
				departureFlights,
				(flight) => flight.flightPoints.find((p) => p.departurePoint),
				false // ist Abflug
			);

			// Die relevanten Flüge auswählen (letzter Ankunftsflug, erster Abflugsflug)
			const lastArrival = arrivalFlights.length > 0 ? arrivalFlights[0] : null;
			const firstDeparture =
				departureFlights.length > 0 ? departureFlights[0] : null;

			// Debug-Information zu den ausgewählten Flügen
			if (config.debugMode) {
				if (lastArrival) {
					const arrivalPoint = lastArrival.flightPoints.find(
						(p) => p.arrivalPoint
					);
					console.log(
						`Letzter Ankunftsflug: Von ${
							lastArrival.flightPoints.find((p) => p.departurePoint)
								?.iataCode || "---"
						} nach ${
							arrivalPoint?.iataCode || "---"
						} um ${getTimeStringFromFlightPoint(arrivalPoint)}`
					);
				}
				if (firstDeparture) {
					const departurePoint = firstDeparture.flightPoints.find(
						(p) => p.departurePoint
					);
					console.log(
						`Erster Abflugsflug: Von ${
							departurePoint?.iataCode || "---"
						} nach ${
							firstDeparture.flightPoints.find((p) => p.arrivalPoint)
								?.iataCode || "---"
						} um ${getTimeStringFromFlightPoint(departurePoint)}`
					);
				}
			}

			// Wenn keine passenden Flüge gefunden wurden
			if (!lastArrival && !firstDeparture) {
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

			// Flugdaten für die Rückgabe vorbereiten
			const selectedFlights = [];
			if (lastArrival) selectedFlights.push(lastArrival);
			if (firstDeparture) selectedFlights.push(firstDeparture);

			// Ergebnisse aufbereiten
			const result = {
				originCode: "---",
				destCode: "---",
				departureTime: "--:--",
				arrivalTime: "--:--",
				positionText: "---", // Neue Eigenschaft für formatierte Positionsbeschreibung
				data: selectedFlights,
			};

			// Daten aus den ausgewählten Flügen extrahieren
			if (lastArrival) {
				const arrivalPoint = lastArrival.flightPoints.find(
					(p) => p.arrivalPoint
				);
				const departurePoint = lastArrival.flightPoints.find(
					(p) => p.departurePoint
				);

				if (arrivalPoint) {
					result.destCode = arrivalPoint.iataCode || "---";
					result.arrivalTime = getTimeStringFromFlightPoint(arrivalPoint);
				}

				if (departurePoint) {
					result.originCode = departurePoint.iataCode || "---";
				}
			}

			if (firstDeparture) {
				const departurePoint = firstDeparture.flightPoints.find(
					(p) => p.departurePoint
				);
				const arrivalPoint = firstDeparture.flightPoints.find(
					(p) => p.arrivalPoint
				);

				if (departurePoint) {
					// Wenn lastArrival nicht vorhanden ist, verwende firstDeparture als Quelle für originCode
					if (!lastArrival) {
						result.originCode = departurePoint.iataCode || "---";
					}
					result.departureTime = getTimeStringFromFlightPoint(departurePoint);
				}

				if (arrivalPoint && !lastArrival) {
					result.destCode = arrivalPoint.iataCode || "---";
				}
			}

			// Positionstext formatieren
			if (result.originCode !== "---" || result.destCode !== "---") {
				// Wenn mindestens einer der beiden Flughäfen bekannt ist
				if (result.originCode !== "---" && result.destCode !== "---") {
					// Wenn beide Flughäfen bekannt sind
					result.positionText = `Abflug ${result.originCode} → ${result.destCode}`;
				} else if (result.originCode !== "---") {
					// Wenn nur der Abflughafen bekannt ist
					result.positionText = `Abflug ${result.originCode}`;
				} else {
					// Wenn nur der Zielflughafen bekannt ist
					result.positionText = `nach ${result.destCode}`;
				}
			}

			updateFetchStatus(
				`Flugdaten für ${aircraftId} gefunden: ${result.positionText}`
			);
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
	 * Holt Flugdaten für einen Flughafen
	 * @param {string} airportCode - IATA-Code des Flughafens (z.B. "MUC")
	 * @param {string} startDateTime - Startzeit für die Abfrage (ISO-Format oder YYYY-MM-DDThh:mm)
	 * @param {string} endDateTime - Endzeit für die Abfrage (ISO-Format oder YYYY-MM-DDThh:mm)
	 * @returns {Promise<Object>} Flughafenflüge
	 */
	const getAirportFlights = async (
		airportCode,
		startDateTime = null,
		endDateTime = null
	) => {
		// Standardwerte für Zeiten
		if (!startDateTime) {
			const now = new Date();
			startDateTime = now.toISOString();
		}
		if (!endDateTime) {
			const end = new Date();
			end.setHours(end.getHours() + 12); // 12 Stunden voraus
			endDateTime = end.toISOString();
		}

		if (config.useMockData) {
			return generateTestAirportFlightData(
				airportCode,
				startDateTime,
				endDateTime
			);
		}

		try {
			const normalizedAirport = airportCode.trim().toUpperCase();
			updateFetchStatus(
				`Flüge für Flughafen ${normalizedAirport} werden abgefragt...`
			);

			// Entscheiden, welche API für Flughafenanfragen verwendet werden soll
			if (config.activeProvider === "airlabs") {
				try {
					// Verwende AirLabs API für Flughafenanfragen
					const departuresParams = {
						dep_iata: normalizedAirport,
					};

					const arrivalsParams = {
						arr_iata: normalizedAirport,
					};

					// Parallel Abflüge und Ankünfte abrufen
					const [departuresData, arrivalsData] = await Promise.all([
						getAirLabsData("flights", departuresParams),
						getAirLabsData("flights", arrivalsParams),
					]);

					if (config.debugMode) {
						console.log(`AirLabs Flughafenanfrage für ${normalizedAirport}:`, {
							abflüge: departuresData,
							ankünfte: arrivalsData,
						});
					}

					// Format für die Rückgabe anpassen
					return {
						departures: departuresData.response || [],
						arrivals: arrivalsData.response || [],
					};
				} catch (airLabsError) {
					console.error(
						`Fehler bei AirLabs Flughafenanfrage für ${normalizedAirport}:`,
						airLabsError
					);
					updateFetchStatus(
						`Fehler bei AirLabs-Flughafenanfrage, versuche Fallback...`,
						true
					);

					// Bei Fehler zu Fallback wechseln wenn nicht im Mock-Modus
					if (!config.useMockData) {
						config.activeProvider = "aerodatabox"; // Temporärer Fallback
						console.log("Fallback zu AeroDataBox API aktiviert");
					} else {
						return generateTestAirportFlightData(
							airportCode,
							startDateTime,
							endDateTime
						);
					}
				}
			} else if (
				config.activeProvider === "aviationstack" ||
				config.useAviationstack
			) {
				try {
					// Verwende Aviationstack API für Flughafenanfragen
					const departuresParams = {
						flight_status: "scheduled",
						dep_iata: normalizedAirport,
					};

					const arrivalsParams = {
						flight_status: "scheduled",
						arr_iata: normalizedAirport,
					};

					// Parallel Abflüge und Ankünfte abrufen
					const [departuresData, arrivalsData] = await Promise.all([
						getAviationstackData("flights", departuresParams),
						getAviationstackData("flights", arrivalsParams),
					]);

					if (config.debugMode) {
						console.log(
							`Aviationstack Flughafenanfrage für ${normalizedAirport}:`,
							{
								abflüge: departuresData,
								ankünfte: arrivalsData,
							}
						);
					}

					// Format für die Rückgabe anpassen
					return {
						departures: departuresData.data || [],
						arrivals: arrivalsData.data || [],
					};
				} catch (aviationstackError) {
					console.error(
						`Fehler bei Aviationstack Flughafenanfrage für ${normalizedAirport}:`,
						aviationstackError
					);
					updateFetchStatus(
						`Fehler bei Aviationstack-Flughafenanfrage, versuche AeroDataBox als Fallback...`,
						true
					);

					// Bei Fehler zu AeroDataBox wechseln wenn nicht im Mock-Modus
					if (!config.useMockData) {
						config.activeProvider = "aerodatabox"; // Temporärer Fallback
						console.log("Fallback zu AeroDataBox API aktiviert");
					} else {
						return generateTestAirportFlightData(
							airportCode,
							startDateTime,
							endDateTime
						);
					}
				}
			}

			// Standard AeroDataBox Anfrage für Flughafen
			return await rateLimiter(async () => {
				const departuresUrl = `${config.baseUrl}/airports/iata/${normalizedAirport}/flights/departure?withLeg=true&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false`;
				const arrivalsUrl = `${config.baseUrl}/airports/iata/${normalizedAirport}/flights/arrival?withLeg=true&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false`;

				const headers = {
					"x-rapidapi-key": config.rapidApiKey,
					"x-rapidapi-host": config.rapidApiHost,
				};

				if (config.debugMode) {
					console.log(`AeroDataBox API-Anfrage URLs: 
						Abflüge: ${departuresUrl}
						Ankünfte: ${arrivalsUrl}`);
				}

				// Parallele Anfragen für bessere Performance
				const [departuresResponse, arrivalsResponse] = await Promise.all([
					fetch(departuresUrl, { headers }),
					fetch(arrivalsUrl, { headers }),
				]);

				// Fehlerbehandlung
				if (!departuresResponse.ok || !arrivalsResponse.ok) {
					throw new Error(
						`API-Anfrage fehlgeschlagen: ${
							!departuresResponse.ok
								? departuresResponse.status
								: arrivalsResponse.status
						}`
					);
				}

				// JSON-Daten extrahieren
				const departuresData = await departuresResponse.json();
				const arrivalsData = await arrivalsResponse.json();

				if (config.debugMode) {
					console.log(`AeroDataBox API-Antwort für ${normalizedAirport}:`, {
						departures: departuresData,
						arrivals: arrivalsData,
					});
				}

				return {
					departures: departuresData.departures || [],
					arrivals: arrivalsData.arrivals || [],
				};
			});
		} catch (error) {
			console.error(
				`Fehler bei API-Anfrage für Flughafen ${airportCode}:`,
				error
			);
			updateFetchStatus(
				`Fehler bei der Flughafenabfrage: ${error.message}`,
				true
			);

			// Bei Fehlern Testdaten zurückgeben
			return generateTestAirportFlightData(
				airportCode,
				startDateTime,
				endDateTime
			);
		}
	};

	/**
	 * Extrahiert den Zeitstring aus einem Flugpunkt
	 * @param {Object} flightPoint - Flugpunkt-Objekt
	 * @returns {string} Formatierte Zeit als String (HH:MM)
	 */
	const getTimeStringFromFlightPoint = (flightPoint) => {
		if (!flightPoint) return "--:--";

		let timings;
		if (flightPoint.departurePoint && flightPoint.departure) {
			timings = flightPoint.departure.timings;
		} else if (flightPoint.arrivalPoint && flightPoint.arrival) {
			timings = flightPoint.arrival.timings;
		}

		if (!timings || !timings.length) return "--:--";

		const timing = timings[0];
		if (!timing || !timing.value) return "--:--";

		// Format: "HH:MM:SS.mmm" -> "HH:MM"
		return timing.value.substring(0, 5);
	};

	/**
	 * Hilfsfunktion: Gibt den vollen Namen einer Fluggesellschaft basierend auf dem IATA-Code zurück
	 */
	const getAirlineName = (iataCode) => {
		const airlines = {
			LH: "Lufthansa",
			BA: "British Airways",
			AF: "Air France",
			EW: "Eurowings",
			"4U": "Germanwings",
			CL: "Lufthansa CityLine",
			VS: "Virgin Atlantic",
			UA: "United Airlines",
			AA: "American Airlines",
			DL: "Delta Air Lines",
			EZY: "easyJet",
		};
		return airlines[iataCode] || `Airline ${iataCode}`;
	};

	/**
	 * Hilfsfunktion, um die Uhrzeit aus einem Flugpunkt zu extrahieren und als Zahl zu konvertieren
	 * @param {Object} flightPoint - Ein Flugpunkt-Objekt
	 * @returns {number} Die Zeit als numerischer Wert (für Vergleiche)
	 */
	const getTimeFromFlightPoint = (flightPoint) => {
		if (!flightPoint) return 0;

		let timings;
		if (flightPoint.departurePoint && flightPoint.departure) {
			timings = flightPoint.departure.timings;
		} else if (flightPoint.arrivalPoint && flightPoint.arrival) {
			timings = flightPoint.arrival.timings;
		}

		if (!timings || !timings.length) return 0;

		const timing = timings[0];
		if (!timing || !timing.value) return 0;

		// Zeit extrahieren und als numerischen Wert zurückgeben für einfache Vergleiche
		const timeStr = timing.value.substring(0, 5); // Format: "HH:MM"
		const [hours, minutes] = timeStr.split(":").map(Number);
		return hours * 60 + minutes; // Zeit in Minuten seit Mitternacht
	};

	/**
	 * Validiert und verbessert die Sortierung von Flügen nach Tageszeit
	 * @param {Array} flights - Liste von Flügen
	 * @param {string} timeSelector - Funktion zur Auswahl des zu prüfenden Zeitfeldes
	 * @param {boolean} isArrival - Ob es sich um Ankunftsflüge handelt
	 * @returns {Array} Verbesserte Flugliste
	 */
	const improveDayTimeRelevance = (flights, timeSelector, isArrival) => {
		if (!flights || flights.length === 0) return flights;

		// Typische letzte Ankunftszeit ist zwischen 19:00-23:59 Uhr
		const lateEveningStart = 19 * 60; // 19:00 Uhr in Minuten
		const nightEnd = 5 * 60; // 5:00 Uhr in Minuten

		// Typische erste Abflugszeit ist zwischen 6:00-10:00 Uhr
		const earlyMorningStart = 6 * 60; // 6:00 Uhr in Minuten
		const morningEnd = 10 * 60; // 10:00 Uhr in Minuten

		// Flüge nach Zeit des Tages gruppieren
		const timeGroupedFlights = flights.reduce(
			(acc, flight) => {
				const time = getTimeFromFlightPoint(timeSelector(flight));

				// Für Ankünfte priorisieren wir Abendflüge, für Abflüge Morgenflüge
				if (isArrival) {
					if (time >= lateEveningStart) acc.preferred.push({ flight, time });
					else acc.other.push({ flight, time });
				} else {
					if (time >= earlyMorningStart && time <= morningEnd)
						acc.preferred.push({ flight, time });
					else acc.other.push({ flight, time });
				}

				return acc;
			},
			{ preferred: [], other: [] }
		);

		// Sortieren innerhalb der Gruppen
		if (isArrival) {
			// Für Ankünfte: Späteste zuerst (absteigend)
			timeGroupedFlights.preferred.sort((a, b) => b.time - a.time);
			timeGroupedFlights.other.sort((a, b) => b.time - a.time);
		} else {
			// Für Abflüge: Früheste zuerst (aufsteigend)
			timeGroupedFlights.preferred.sort((a, b) => a.time - b.time);
			timeGroupedFlights.other.sort((a, b) => a.time - b.time);
		}

		// Kombinierte sortierte Liste erstellen
		return [...timeGroupedFlights.preferred, ...timeGroupedFlights.other].map(
			(item) => item.flight
		);
	};

	// Update der public API um die neue Funktion zu exportieren
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
			console.log(`API Mock-Modus ${useMock ? "aktiviert" : "deaktiviert"}`);
		},
		setApiProvider: (provider) => {
			if (typeof provider === "string") {
				// String-basierte Anbieter-Einstellung
				if (["aerodatabox", "aviationstack", "airlabs"].includes(provider)) {
					config.activeProvider = provider;
					// Für Rückwärtskompatibilität
					config.useAviationstack = provider === "aviationstack";
					config.useAirLabs = provider === "airlabs";
					console.log(`API-Provider gewechselt zu ${provider}`);
				} else {
					console.error(`Ungültiger Provider: ${provider}`);
				}
			} else {
				// Boolean-basierte Anbieter-Einstellung (Rückwärtskompatibilität)
				const useAviationstack = Boolean(provider);
				config.useAviationstack = useAviationstack;
				config.activeProvider = useAviationstack
					? "aviationstack"
					: "aerodatabox";
				console.log(
					`API-Provider gewechselt zu ${
						useAviationstack ? "Aviationstack" : "AeroDataBox"
					}`
				);
			}
		},
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.AeroDataBoxAPI = AeroDataBoxAPI;

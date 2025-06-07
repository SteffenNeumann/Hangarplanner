/**
 * AeroDataBox API Integration
 * Spezialisiert auf das Abrufen von Flugdaten nach Flugzeugregistrierungen
 * Dokumentation: https://www.aerodatabox.com/docs/api
 */

const AeroDataBoxAPI = (() => {
	// Vereinfachte API-Konfiguration - nur AeroDataBox
	const config = {
		baseUrl: "https://aerodatabox.p.rapidapi.com",
		flightsEndpoint: "/flights",
		statusEndpoint: "/status",
		rapidApiHost: "aerodatabox.p.rapidapi.com",
		rapidApiKey: "b76afbf516mshf864818d919de86p10475ejsna65b718a8602", // RapidAPI Key
		debugMode: true, // Debug-Modus für zusätzliche Konsolenausgaben
		rateLimitDelay: 1200, // 1.2 Sekunden Verzögerung zwischen API-Anfragen
	};

	// Tracking der letzten API-Anfrage für Rate Limiting
	let lastApiCall = 0;

	/**
	 * Initialisierungsfunktion für die API
	 * @param {Object} options - Konfigurationsoptionen
	 */
	const init = (options = {}) => {
		// Nur die notwendigen Optionen übernehmen
		if (options.debugMode !== undefined)
			config.debugMode = Boolean(options.debugMode);
		if (options.rapidApiKey) config.rapidApiKey = options.rapidApiKey;

		if (config.debugMode) {
			console.log(
				`AeroDataBoxAPI initialisiert: nur AeroDataBox API aktiviert`
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
	 * Konvertiert AeroDataBox API Daten in das einheitliche Format
	 * @param {Array|Object} aeroDataBoxData - Daten von der AeroDataBox API
	 * @param {string} aircraftRegistration - Flugzeugregistrierung
	 * @param {string} date - Abfragedatum
	 * @returns {Object} Vereinheitlichte Flugdaten
	 */
	const convertToUnifiedFormat = (
		aeroDataBoxData,
		aircraftRegistration,
		date
	) => {
		// Wenn keine Daten vorhanden sind oder ein leeres Array zurückgegeben wurde
		if (
			!aeroDataBoxData ||
			(Array.isArray(aeroDataBoxData) && aeroDataBoxData.length === 0)
		) {
			return { data: [] };
		}

		// Sicherstellen, dass wir mit einem Array arbeiten
		const flightsArray = Array.isArray(aeroDataBoxData)
			? aeroDataBoxData
			: [aeroDataBoxData];

		const formattedData = flightsArray
			.map((flight) => {
				try {
					// Extrahiere Flugdaten
					const departureIata = flight.departure?.airport?.iata || "???";
					const arrivalIata = flight.arrival?.airport?.iata || "???";

					// Zeiten formatieren
					const departureTime = flight.departure?.scheduledTime?.local
						? flight.departure.scheduledTime.local.substring(11, 16) // Format HH:MM aus ISO-Timestamp
						: "--:--";
					const arrivalTime = flight.arrival?.scheduledTime?.local
						? flight.arrival.scheduledTime.local.substring(11, 16) // Format HH:MM aus ISO-Timestamp
						: "--:--";

					// Fluggesellschaft und Flugnummer
					const airline = flight.number?.slice(0, 2) || "";
					const flightNumber = flight.number?.slice(2) || "";

					// Flugzeugtyp und Registrierung
					const aircraftType = flight.aircraft?.model || "Unknown";
					const registration =
						flight.aircraft?.reg || aircraftRegistration || "";

					// Abflugdatum aus der API oder übergebenes Datum
					const scheduledDepartureDate = flight.departure?.scheduledTime?.local
						? flight.departure.scheduledTime.local.substring(0, 10) // Format YYYY-MM-DD
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
								aircraftRegistration: registration,
							},
						],
						_source: "aerodatabox",
						_rawFlightData: flight,
					};
				} catch (error) {
					console.error(
						"Fehler bei der Konvertierung eines AeroDataBox-Fluges:",
						error,
						flight
					);
					return null;
				}
			})
			.filter(Boolean); // Entferne null-Werte

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

			// Für Datumsanfragen in der Zukunft oder mehr als 1 Jahr zurück leeres Ergebnis zurückgeben
			if (
				queryDate > today.setFullYear(today.getFullYear() + 1) ||
				queryDate < today.setFullYear(today.getFullYear() - 1)
			) {
				if (config.debugMode) {
					console.log(
						`Datum ${date} ist weit in der Zukunft oder Vergangenheit, keine Daten für ${registration} verfügbar`
					);
				}
				updateFetchStatus(
					`Keine Daten verfügbar - Datum ${date} liegt außerhalb des gültigen Bereichs`,
					true
				);
				return { data: [] };
			}

			updateFetchStatus(
				`Suche Flüge für Aircraft ${registration} am ${date}...`
			);

			// Standard AeroDataBox API - direkte Abfrage mit Datum im Pfad
			return await rateLimiter(async () => {
				// Direkte AeroDataBox API-Abfrage mit Datum im Pfad und dateLocalRole=Both
				const apiUrl = `${config.baseUrl}/flights/reg/${registration}/${date}?withAircraftImage=false&withLocation=true&dateLocalRole=Both`;

				if (config.debugMode) {
					console.log(`API-Anfrage URL: ${apiUrl}`);
				}

				// API-Anfrage durchführen mit RapidAPI-Headers
				const options = {
					method: "GET",
					headers: {
						"x-rapidapi-key": config.rapidApiKey,
						"x-rapidapi-host": config.rapidApiHost,
					},
				};

				const response = await fetch(apiUrl, options);

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
						`Leere Antwort von der API für ${registration} im Zeitraum`,
						false
					);
					// Leeres Ergebnisobjekt zurückgeben
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
						`Fehlerhafte JSON-Daten für ${registration} im Zeitraum`,
						false
					);
					// Leeres Ergebnisobjekt zurückgeben
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
				`Fehler bei API-Anfrage für ${aircraftRegistration}:`,
				error
			);
			updateFetchStatus(
				`Fehler bei der API-Anfrage für ${aircraftRegistration}: ${error.message}`,
				true
			);

			// Bei Fehlern leeres Datenarray zurückgeben
			return { data: [] };
		}
	};

	/**
	 * Extrahiert eine numerische Zeitangabe aus einem Flugpunkt für die Sortierung
	 * @param {Object} flightPoint - Der Flugpunkt (Ankunft oder Abflug)
	 * @returns {number} Numerische Repräsentation der Zeit für Sortierung
	 */
	const getTimeFromFlightPoint = (flightPoint) => {
		if (!flightPoint) return 0;

		try {
			let timeStr;
			// Für Abflugpunkt
			if (
				flightPoint.departurePoint &&
				flightPoint.departure &&
				flightPoint.departure.timings &&
				flightPoint.departure.timings.length
			) {
				timeStr = flightPoint.departure.timings[0].value;
			}
			// Für Ankunftspunkt
			else if (
				flightPoint.arrivalPoint &&
				flightPoint.arrival &&
				flightPoint.arrival.timings &&
				flightPoint.arrival.timings.length
			) {
				timeStr = flightPoint.arrival.timings[0].value;
			} else {
				return 0;
			}

			// Extrahiere Stunden und Minuten und konvertiere in einen numerischen Wert
			const timeParts = timeStr.substring(0, 5).split(":");
			return parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
		} catch (error) {
			console.error("Fehler bei der Zeitextraktion:", error);
			return 0;
		}
	};

	/**
	 * Extrahiert einen Zeit-String aus einem Flugpunkt
	 * @param {Object} flightPoint - Der Flugpunkt (Ankunft oder Abflug)
	 * @returns {string} Zeit im Format HH:MM
	 */
	const getTimeStringFromFlightPoint = (flightPoint) => {
		if (!flightPoint) return "--:--";

		try {
			let timeStr;
			// Für Abflugpunkt
			if (
				flightPoint.departurePoint &&
				flightPoint.departure &&
				flightPoint.departure.timings &&
				flightPoint.departure.timings.length
			) {
				timeStr = flightPoint.departure.timings[0].value;
			}
			// Für Ankunftspunkt
			else if (
				flightPoint.arrivalPoint &&
				flightPoint.arrival &&
				flightPoint.arrival.timings &&
				flightPoint.arrival.timings.length
			) {
				timeStr = flightPoint.arrival.timings[0].value;
			} else {
				return "--:--";
			}

			// Extrahiere Stunden und Minuten
			return timeStr.substring(0, 5);
		} catch (error) {
			console.error("Fehler bei der Zeitextraktion:", error);
			return "--:--";
		}
	};

	/**
	 * Sucht Flugdaten für ein Flugzeug - VEREINFACHTE VERSION mit expliziten Abfragen für zwei Tage
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
			`AeroDataBoxAPI: Suche Flugdaten für ${aircraftId} - EXPLIZIT an zwei Tagen: ${currentDate} und ${nextDate}`
		);
		updateFetchStatus(`Suche Flugdaten für ${aircraftId}...`);

		try {
			// Hole den aktuell ausgewählten Flughafen für die Filterung
			const selectedAirport =
				document.getElementById("airportCodeInput")?.value || "MUC";

			if (config.debugMode) {
				console.log(`Gewählter Flughafen für Filterung: ${selectedAirport}`);
			}

			// VEREINFACHT: Zwei separate API-Abfragen für die beiden Tage
			console.log(
				`[EXPLIZITE ABFRAGE 1] Suche nach Flügen für ${aircraftId} am ${currentDate}`
			);
			updateFetchStatus(
				`[1/2] Suche Flüge für ${aircraftId} am ${currentDate}...`
			);

			// Erste Abfrage - aktueller Tag
			const currentDayResponse = await getAircraftFlights(
				aircraftId,
				currentDate
			);
			const currentDayFlights = currentDayResponse?.data || [];

			console.log(
				`[EXPLIZITE ABFRAGE 2] Suche nach Flügen für ${aircraftId} am ${nextDate}`
			);
			updateFetchStatus(
				`[2/2] Suche Flüge für ${aircraftId} am ${nextDate}...`
			);

			// Zweite Abfrage - Folgetag
			const nextDayResponse = await getAircraftFlights(aircraftId, nextDate);
			const nextDayFlights = nextDayResponse?.data || [];

			console.log(
				`[ERGEBNISSE] Gefunden: ${currentDayFlights.length} Flüge am ${currentDate} und ${nextDayFlights.length} Flüge am ${nextDate}`
			);

			// Separate Flüge zum und vom ausgewählten Flughafen
			let arrivalFlights = [];
			let departureFlights = [];

			// Flüge filtern für Ankunft am ausgewählten Flughafen am aktuellen Tag
			currentDayFlights.forEach((flight) => {
				if (flight.flightPoints && flight.flightPoints.length >= 2) {
					const arrivalPoint = flight.flightPoints.find((p) => p.arrivalPoint);

					// Prüfen, ob der Flug zum ausgewählten Flughafen geht (Ankunft)
					if (arrivalPoint && arrivalPoint.iataCode === selectedAirport) {
						arrivalFlights.push(flight);
					}
				}
			});

			// Flüge filtern für Abflug vom ausgewählten Flughafen am Folgetag
			nextDayFlights.forEach((flight) => {
				if (flight.flightPoints && flight.flightPoints.length >= 2) {
					const departurePoint = flight.flightPoints.find(
						(p) => p.departurePoint
					);

					// Prüfen, ob der Flug vom ausgewählten Flughafen kommt (Abflug)
					if (departurePoint && departurePoint.iataCode === selectedAirport) {
						departureFlights.push(flight);
					}
				}
			});

			// Debug-Info über gefundene Flüge
			console.log(
				`Gefilterte Ankünfte am ${selectedAirport} (${currentDate}): ${arrivalFlights.length}`
			);
			console.log(
				`Gefilterte Abflüge von ${selectedAirport} (${nextDate}): ${departureFlights.length}`
			);

			// Sortieren der Ankunftsflüge nach Zeit (späteste zuerst)
			arrivalFlights.sort((a, b) => {
				const timeA = getTimeFromFlightPoint(
					a.flightPoints.find((p) => p.arrivalPoint)
				);
				const timeB = getTimeFromFlightPoint(
					b.flightPoints.find((p) => p.arrivalPoint)
				);
				// Absteigende Sortierung für Ankünfte (späteste zuerst)
				return timeB - timeA;
			});

			// Sortieren der Abflüge nach Zeit (früheste zuerst)
			departureFlights.sort((a, b) => {
				const timeA = getTimeFromFlightPoint(
					a.flightPoints.find((p) => p.departurePoint)
				);
				const timeB = getTimeFromFlightPoint(
					b.flightPoints.find((p) => p.departurePoint)
				);
				// Aufsteigende Sortierung für Abflüge (früheste zuerst)
				return timeA - timeB;
			});

			// Die relevanten Flüge auswählen (letzter Ankunftsflug, erster Abflugsflug)
			const lastArrival = arrivalFlights.length > 0 ? arrivalFlights[0] : null;
			const firstDeparture =
				departureFlights.length > 0 ? departureFlights[0] : null;

			// Debug-Information zu den ausgewählten Flügen
			if (lastArrival) {
				const arrivalPoint = lastArrival.flightPoints.find(
					(p) => p.arrivalPoint
				);
				console.log(
					`Letzter Ankunftsflug am ${currentDate}: Von ${
						lastArrival.flightPoints.find((p) => p.departurePoint)?.iataCode ||
						"---"
					} nach ${
						arrivalPoint?.iataCode || "---"
					} um ${getTimeStringFromFlightPoint(arrivalPoint)}`
				);
			} else {
				console.log(`Kein passender Ankunftsflug am ${currentDate} gefunden`);
			}

			if (firstDeparture) {
				const departurePoint = firstDeparture.flightPoints.find(
					(p) => p.departurePoint
				);
				console.log(
					`Erster Abflugsflug am ${nextDate}: Von ${
						departurePoint?.iataCode || "---"
					} nach ${
						firstDeparture.flightPoints.find((p) => p.arrivalPoint)?.iataCode ||
						"---"
					} um ${getTimeStringFromFlightPoint(departurePoint)}`
				);
			} else {
				console.log(`Kein passender Abflugsflug am ${nextDate} gefunden`);
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
				positionText: "---",
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
					if (lastArrival) {
						// Wenn beide Flüge vorhanden sind, behält der Abflugsflug seine eigene originCode
						result.departureTime = getTimeStringFromFlightPoint(departurePoint);
					} else {
						// Wenn kein lastArrival vorhanden ist, verwende firstDeparture als Quelle für originCode
						result.originCode = departurePoint.iataCode || "---";
						result.departureTime = getTimeStringFromFlightPoint(departurePoint);
					}
				}

				if (arrivalPoint && !lastArrival) {
					result.destCode = arrivalPoint.iataCode || "---";
				}
			}

			// Positionstext formatieren - präziser mit Datumsangaben
			if (result.originCode !== "---" || result.destCode !== "---") {
				if (lastArrival && firstDeparture) {
					// Wenn beide Flüge bekannt sind - vollständige Information
					result.positionText = `${result.originCode} → ${result.destCode}`;
				} else if (lastArrival) {
					// Nur Ankunft bekannt
					result.positionText = `Ankunft: ${result.originCode} → ${result.destCode}`;
				} else if (firstDeparture) {
					// Nur Abflug bekannt
					result.positionText = `Abflug: ${result.originCode} → ${result.destCode}`;
				}
			}

			// Erfolgreiche Anfrage-Zusammenfassung
			console.log(
				`Flugdaten verarbeitet für ${aircraftId}: ${currentDate} und ${nextDate}`
			);
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
	 * Ruft Flugdaten für einen Flughafen ab
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

		try {
			const normalizedAirport = airportCode.trim().toUpperCase();
			updateFetchStatus(
				`Flüge für Flughafen ${normalizedAirport} werden abgefragt...`
			);

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

			// Bei Fehlern leere Arrays zurückgeben
			return { departures: [], arrivals: [] };
		}
	};

	// Update der public API - vereinfacht, aber mit beibehaltenen Signaturen
	return {
		updateAircraftData,
		getAircraftFlights,
		getAircraftFlightsDateRange: async (aircraftId, startDate, endDate) => {
			try {
				// Diese Funktion ist ein Wrapper um getAircraftFlights, der Daten
				// für einen Zeitraum abruft und zusammenführt
				const formattedStartDate = formatDate(startDate);
				const formattedEndDate = formatDate(endDate);

				// Statusmeldung anzeigen
				updateFetchStatus(
					`Suche Flüge für ${aircraftId} im Zeitraum ${formattedStartDate} bis ${formattedEndDate}...`
				);

				// Daten für Start- und Enddatum abrufen
				const startDateData = await getAircraftFlights(
					aircraftId,
					formattedStartDate
				);
				const endDateData = await getAircraftFlights(
					aircraftId,
					formattedEndDate
				);

				// Daten zusammenführen
				const combinedData = {
					data: [...(startDateData.data || []), ...(endDateData.data || [])],
				};

				if (config.debugMode) {
					console.log(
						`Kombinierte Daten für ${aircraftId} im Zeitraum:`,
						combinedData
					);
				}

				return combinedData;
			} catch (error) {
				console.error(`Fehler beim Abrufen der Flugdaten für Zeitraum:`, error);
				updateFetchStatus(`Fehler bei Zeitraumabfrage: ${error.message}`, true);
				return { data: [] };
			}
		},
		getMultipleAircraftFlights: async (registrations, date) => {
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
							data: { data: [] },
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
		},
		getFlightStatus: async (number, date) => {
			try {
				updateFetchStatus(`Prüfe Flugstatus für ${number} am ${date}...`);

				// Parameter für die Anfrage
				const withAircraftImage = true;
				const withLocation = true;

				// API-Aufruf mit Rate Limiting
				return await rateLimiter(async () => {
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
		},
		updateFetchStatus,
		getAirportFlights,
		init,
		setMockMode: (useMock) => {
			console.log(
				"Mock-Modus ist permanent deaktiviert. Es werden nur echte API-Daten verwendet."
			);
		},
		setApiProvider: (provider) => {
			console.log("Nur AeroDataBox API wird unterstützt.");
		},
		// Konfigurationsexport beibehalten
		config,
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.AeroDataBoxAPI = AeroDataBoxAPI;

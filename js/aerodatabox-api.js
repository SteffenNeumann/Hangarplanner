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

					// Zeiten formatieren - JETZT MIT UTC STATT LOCAL
					const departureTime = flight.departure?.scheduledTime?.utc
						? flight.departure.scheduledTime.utc.substring(11, 16) // Format HH:MM aus UTC ISO-Timestamp
						: "--:--";
					const arrivalTime = flight.arrival?.scheduledTime?.utc
						? flight.arrival.scheduledTime.utc.substring(11, 16) // Format HH:MM aus UTC ISO-Timestamp
						: "--:--";

					// Fluggesellschaft und Flugnummer
					const airline = flight.number?.slice(0, 2) || "";
					const flightNumber = flight.number?.slice(2) || "";

					// Flugzeugtyp und Registrierung
					const aircraftType = flight.aircraft?.model || "Unknown";
					const registration =
						flight.aircraft?.reg || aircraftRegistration || "";

					// Abflugdatum aus der API oder übergebenes Datum (JETZT MIT UTC)
					const scheduledDepartureDate = flight.departure?.scheduledTime?.utc
						? flight.departure.scheduledTime.utc.substring(0, 10) // Format YYYY-MM-DD aus UTC-Zeit
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
											isUtc: true, // Markierung für UTC-Zeit
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
											isUtc: true, // Markierung für UTC-Zeit
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
						_isUtc: true, // Flag zur Kennzeichnung, dass Zeiten in UTC sind
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
						`Leere Antwort von der API für ${registration} im Zeitraum, versuche alternative Abfrage...`,
						false
					);

					// NEUER CODE: Alternative Abfrage ohne Datumsbeschränkung starten
					console.log(
						`[FALLBACK] Starte alternative API-Anfrage für ${registration} ohne Datumsbeschränkung`
					);

					// Direkter Endpunkt ohne Datum
					const fallbackUrl = `${config.baseUrl}/flights/reg/${registration}?withAircraftImage=false&withLocation=true`;

					try {
						const fallbackResponse = await fetch(fallbackUrl, options);

						if (!fallbackResponse.ok) {
							console.warn(
								`[FALLBACK] Alternative Anfrage fehlgeschlagen: ${fallbackResponse.status}`
							);
							return { data: [] };
						}

						const fallbackData = await fallbackResponse.json();

						if (config.debugMode) {
							console.log(
								`[FALLBACK] Alternative API-Antwort für ${registration}:`,
								fallbackData
							);
						}

						// Prüfe, ob die Alternative Ergebnisse liefert
						if (
							!fallbackData ||
							(Array.isArray(fallbackData) && fallbackData.length === 0)
						) {
							console.warn(
								`[FALLBACK] Keine Daten gefunden in alternativer Anfrage`
							);
							return { data: [] };
						}

						// Filtere die Ergebnisse nach dem angeforderten Datum, falls möglich
						let filteredFlights = fallbackData;

						// Wenn es ein Array ist, filtern wir nach dem Datum
						if (Array.isArray(fallbackData)) {
							filteredFlights = fallbackData.filter((flight) => {
								// Prüfe, ob das Abflugdatum im UTC-Format dem angefragten Datum entspricht
								const flightDate =
									flight.departure?.scheduledTime?.utc?.substring(0, 10);
								return flightDate === date;
							});

							console.log(
								`[FALLBACK] ${filteredFlights.length} von ${fallbackData.length} Flügen passen zum Datum ${date}`
							);
						}

						// Falls keine passenden Flüge nach Datumsfilterung, verwende alle
						if (!filteredFlights.length && Array.isArray(fallbackData)) {
							console.log(
								`[FALLBACK] Keine Flüge für das Datum ${date} gefunden, verwende alle verfügbaren Flüge`
							);
							filteredFlights = fallbackData;
						}

						updateFetchStatus(
							`[FALLBACK] Alternative Abfrage für ${registration} erfolgreich: ${
								Array.isArray(filteredFlights) ? filteredFlights.length : 1
							} Flüge gefunden`
						);

						// Formatieren und zurückgeben
						return convertToUnifiedFormat(filteredFlights, registration, date);
					} catch (fallbackError) {
						console.error(
							`[FALLBACK] Fehler bei alternativer Abfrage:`,
							fallbackError
						);
						return { data: [] };
					}
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

				// Wenn keine Daten oder leeres Array zurückgegeben wurde, versuche die alternative Abfrage
				if (!data || (Array.isArray(data) && data.length === 0)) {
					console.log(
						`[HAUPTANFRAGE] Keine Daten für ${registration} am ${date} gefunden, starte Fallback...`
					);

					// Aufruf der alternativen Abfrage (gleicher Code wie oben)
					const fallbackUrl = `${config.baseUrl}/flights/reg/${registration}?withAircraftImage=false&withLocation=true`;

					try {
						// ...ähnlicher Code wie oben...
						const fallbackResponse = await fetch(fallbackUrl, options);

						if (!fallbackResponse.ok) {
							console.warn(
								`[FALLBACK] Alternative Anfrage fehlgeschlagen: ${fallbackResponse.status}`
							);
							return { data: [] };
						}

						const fallbackData = await fallbackResponse.json();

						if (config.debugMode) {
							console.log(
								`[FALLBACK] Alternative API-Antwort für ${registration}:`,
								fallbackData
							);
						}

						// Prüfe, ob die Alternative Ergebnisse liefert
						if (
							!fallbackData ||
							(Array.isArray(fallbackData) && fallbackData.length === 0)
						) {
							console.warn(
								`[FALLBACK] Keine Daten gefunden in alternativer Anfrage`
							);
							return { data: [] };
						}

						// Filtere die Ergebnisse nach dem angeforderten Datum, falls möglich
						let filteredFlights = fallbackData;

						// Wenn es ein Array ist, filtern wir nach dem Datum
						if (Array.isArray(fallbackData)) {
							filteredFlights = fallbackData.filter((flight) => {
								// Prüfe, ob das Abflugdatum im UTC-Format dem angefragten Datum entspricht
								const flightDate =
									flight.departure?.scheduledTime?.utc?.substring(0, 10);
								return flightDate === date;
							});

							console.log(
								`[FALLBACK] ${filteredFlights.length} von ${fallbackData.length} Flügen passen zum Datum ${date}`
							);
						}

						// Falls keine passenden Flüge nach Datumsfilterung, verwende alle
						if (!filteredFlights.length && Array.isArray(fallbackData)) {
							console.log(
								`[FALLBACK] Keine Flüge für das Datum ${date} gefunden, verwende alle verfügbaren Flüge`
							);
							filteredFlights = fallbackData;
						}

						updateFetchStatus(
							`[FALLBACK] Alternative Abfrage für ${registration} erfolgreich: ${
								Array.isArray(filteredFlights) ? filteredFlights.length : 1
							} Flüge gefunden`
						);

						// Formatieren und zurückgeben
						return convertToUnifiedFormat(filteredFlights, registration, date);
					} catch (fallbackError) {
						console.error(
							`[FALLBACK] Fehler bei alternativer Abfrage:`,
							fallbackError
						);
						return { data: [] };
					}
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
	 * Berücksichtigt, ob die Zeit als UTC markiert ist
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
				// Wir gehen davon aus, dass alle Zeiten in UTC sind (aufgrund der Anpassungen in convertToUnifiedFormat)
			}
			// Für Ankunftspunkt
			else if (
				flightPoint.arrivalPoint &&
				flightPoint.arrival &&
				flightPoint.arrival.timings &&
				flightPoint.arrival.timings.length
			) {
				timeStr = flightPoint.arrival.timings[0].value;
				// Wir gehen davon aus, dass alle Zeiten in UTC sind (aufgrund der Anpassungen in convertToUnifiedFormat)
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
			let isUtc = false;

			// Für Abflugpunkt
			if (
				flightPoint.departurePoint &&
				flightPoint.departure &&
				flightPoint.departure.timings &&
				flightPoint.departure.timings.length
			) {
				timeStr = flightPoint.departure.timings[0].value;
				isUtc = flightPoint.departure.timings[0].isUtc || false;
			}
			// Für Ankunftspunkt
			else if (
				flightPoint.arrivalPoint &&
				flightPoint.arrival &&
				flightPoint.arrival.timings &&
				flightPoint.arrival.timings.length
			) {
				timeStr = flightPoint.arrival.timings[0].value;
				isUtc = flightPoint.arrival.timings[0].isUtc || false;
			} else {
				return "--:--";
			}

			// Extrahiere Stunden und Minuten und füge UTC-Kennzeichnung hinzu wenn nötig
			const timeValue = timeStr.substring(0, 5);
			return isUtc ? `${timeValue} UTC` : timeValue;
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
	 * @returns {Promise<Object>} Flugdaten mit letztem Ankunftsflug und erstem Abflugsflug
	 */
	const updateAircraftData = async (aircraftId, currentDate, nextDate) => {
		if (!aircraftId) {
			updateFetchStatus("Bitte Flugzeugkennung eingeben", true);
			// Leere Standardwerte zurückgeben, damit die Anwendung die Felder zurücksetzen kann
			return {
				originCode: "---",
				destCode: "---",
				departureTime: "--:--",
				arrivalTime: "--:--",
				positionText: "---",
				data: [],
				_isUtc: true,
			};
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
				// Datum-Tags für die spätere Erkennung von Folgetags-Flügen hinzufügen
				flight._currentDateRequested = currentDate;
				flight._nextDateRequested = nextDate;

				// Stelle sicher, dass _isUtc Flag gesetzt ist
				flight._isUtc = true;

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
				// Datum-Tags für die spätere Erkennung von Folgetags-Flügen hinzufügen
				flight._currentDateRequested = currentDate;
				flight._nextDateRequested = nextDate;

				// Stelle sicher, dass _isUtc Flag gesetzt ist
				flight._isUtc = true;

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
					} um ${getTimeStringFromFlightPoint(arrivalPoint)} UTC` // UTC-Kennzeichnung hinzugefügt
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
					} um ${getTimeStringFromFlightPoint(departurePoint)} UTC` // UTC-Kennzeichnung hinzugefügt
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
				_isUtc: true, // Explizites Flag für UTC-Zeiten setzen
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
					let arrivalTimeStr = getTimeStringFromFlightPoint(arrivalPoint);
					// Entferne "UTC" für die interne Darstellung
					result.arrivalTime = arrivalTimeStr.replace(" UTC", "");
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
						let departureTimeStr = getTimeStringFromFlightPoint(departurePoint);
						// Entferne "UTC" für die interne Darstellung
						result.departureTime = departureTimeStr.replace(" UTC", "");
					} else {
						// Wenn kein lastArrival vorhanden ist, verwende firstDeparture als Quelle für originCode
						result.originCode = departurePoint.iataCode || "---";
						let departureTimeStr = getTimeStringFromFlightPoint(departurePoint);
						// Entferne "UTC" für die interne Darstellung
						result.departureTime = departureTimeStr.replace(" UTC", "");
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

	/**
	 * Sucht nach Flügen eines bestimmten Flugzeugs an einem Flughafen innerhalb eines Zeitfensters
	 * @param {string} airportCode - IATA-Code des Flughafens (z.B. "MUC")
	 * @param {string} date - Datum im Format YYYY-MM-DD
	 * @param {string} aircraftRegistration - Flugzeugregistrierung (z.B. "D-AIBL")
	 * @param {number} startHour - Startstunde für das Zeitfenster (0-23)
	 * @param {number} endHour - Endstunde für das Zeitfenster (0-23)
	 * @returns {Promise<Object>} Gefilterte Flugdaten für das gesuchte Flugzeug
	 */
	const getAircraftFlightsByAirport = async (
		airportCode,
		date,
		aircraftRegistration,
		startHour = 0,
		endHour = 23
	) => {
		try {
			// Parameter normalisieren
			const airport = airportCode.trim().toUpperCase();
			const registration = aircraftRegistration.trim().toUpperCase();

			// Zeitfenster erstellen (ISO-Format mit Datum und Zeit)
			const startDateTime = `${date}T${startHour
				.toString()
				.padStart(2, "0")}:00`;
			const endDateTime = `${date}T${endHour.toString().padStart(2, "0")}:00`;

			updateFetchStatus(
				`Suche Flüge für ${registration} am Flughafen ${airport} (${date})...`
			);

			return await rateLimiter(async () => {
				// Flughafenabfrage mit Zeitfenster
				const apiUrl = `${config.baseUrl}/flights/airports/iata/${airport}/${startDateTime}/${endDateTime}?withLeg=true&direction=Both&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=true&withLocation=false`;

				if (config.debugMode) {
					console.log(`[AIRPORT SEARCH] API-Anfrage URL: ${apiUrl}`);
				}

				// API-Anfrage durchführen
				const response = await fetch(apiUrl, {
					headers: {
						"x-rapidapi-key": config.rapidApiKey,
						"x-rapidapi-host": config.rapidApiHost,
					},
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`Flughafen-API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}. Details: ${errorText}`
					);
				}

				// JSON-Daten extrahieren
				const data = await response.json();

				if (config.debugMode) {
					console.log(`[AIRPORT SEARCH] API-Antwort für ${airport}:`, data);
				}

				// Kombinierte Liste aus Abflügen und Ankünften
				let allFlights = [];

				if (data.departures && Array.isArray(data.departures)) {
					allFlights = [...allFlights, ...data.departures];
				}

				if (data.arrivals && Array.isArray(data.arrivals)) {
					allFlights = [...allFlights, ...data.arrivals];
				}

				// Nach der gesuchten Registrierung filtern
				const filteredFlights = allFlights.filter(
					(flight) =>
						flight.aircraft?.reg &&
						flight.aircraft.reg.toUpperCase() === registration
				);

				if (config.debugMode) {
					console.log(
						`[AIRPORT SEARCH] Gefilterte Flüge für ${registration}:`,
						filteredFlights
					);
				}

				if (filteredFlights.length === 0) {
					updateFetchStatus(
						`Keine Flüge für ${registration} am Flughafen ${airport} gefunden`
					);
					return { data: [] };
				} else {
					updateFetchStatus(
						`${filteredFlights.length} Flüge für ${registration} am Flughafen ${airport} gefunden`
					);
				}

				// Formatieren der gefilterten Flüge in das einheitliche Format
				return convertToUnifiedFormat(filteredFlights, registration, date);
			});
		} catch (error) {
			console.error(
				`Fehler bei Flughafensuche für ${aircraftRegistration}:`,
				error
			);
			updateFetchStatus(
				`Fehler bei der Flughafensuche für ${aircraftRegistration}: ${error.message}`,
				true
			);

			// Bei Fehlern leeres Datenarray zurückgeben
			return { data: [] };
		}
	};

	/**
	 * Spezielle Funktion zum Abrufen zukünftiger Flüge für ein Flugzeug
	 * Verwendet verschiedene Strategien, um bessere Ergebnisse für den Folgetag zu erhalten
	 * @param {string} aircraftRegistration - Flugzeugregistrierung (z.B. "D-AIBL")
	 * @param {string} date - Datum im Format YYYY-MM-DD für den die Flüge gesucht werden sollen
	 * @param {boolean} isFollowingDay - Ob es sich um den Folgetag handelt (für spezielle Parameter)
	 * @returns {Promise<Object>} Flugdaten mit verbesserter Abfrage für zukünftige Flüge
	 */
	const getFutureAircraftFlights = async (
		aircraftRegistration,
		date,
		isFollowingDay = true
	) => {
		try {
			// Registrierung normalisieren
			const registration = aircraftRegistration.trim().toUpperCase();

			updateFetchStatus(
				`Suche zukünftige Flüge für ${registration} am ${date} (optimierte Abfrage)...`
			);

			// Mehrere Strategien für die Suche nach zukünftigen Flügen
			let strategies = [];

			// Strategie 1: Standardabfrage mit dateLocalRole=Departure für Priorität auf Abflüge
			strategies.push(async () => {
				const apiUrl = `${config.baseUrl}/flights/reg/${registration}/${date}?withAircraftImage=false&withLocation=true&dateLocalRole=Departure`;

				if (config.debugMode) {
					console.log(`[Strategie 1] Suche mit Departure-Priorität: ${apiUrl}`);
				}

				const response = await fetch(apiUrl, {
					headers: {
						"x-rapidapi-key": config.rapidApiKey,
						"x-rapidapi-host": config.rapidApiHost,
					},
				});

				if (!response.ok) return { success: false, data: [] };

				const data = await response.json();
				return { success: true, data };
			});

			// Strategie 2: Erweiterter Zeitraum mit +1 Tag (für Folgetag)
			if (isFollowingDay) {
				strategies.push(async () => {
					// Ein Tag später für die Anfrage (ISO-Format YYYY-MM-DD)
					const followingDate = new Date(date);
					followingDate.setDate(followingDate.getDate() + 1);
					const extendedDate = followingDate.toISOString().split("T")[0];

					const apiUrl = `${config.baseUrl}/flights/reg/${registration}/${extendedDate}?withAircraftImage=false&withLocation=true`;

					if (config.debugMode) {
						console.log(
							`[Strategie 2] Suche mit erweitertem Zeitraum: ${apiUrl}`
						);
					}

					const response = await fetch(apiUrl, {
						headers: {
							"x-rapidapi-key": config.rapidApiKey,
							"x-rapidapi-host": config.rapidApiHost,
						},
					});

					if (!response.ok) return { success: false, data: [] };

					const data = await response.json();
					return { success: true, data };
				});
			}

			// Strategie 3: Verwende den Airport-Endpunkt, wenn ein Flughafen bekannt ist
			const selectedAirport =
				document.getElementById("airportCodeInput")?.value || "MUC";
			if (selectedAirport && selectedAirport.length === 3) {
				strategies.push(async () => {
					// Flughafenabfrage für Abflüge
					const apiUrl = `${config.baseUrl}/airports/iata/${selectedAirport}/flights/departure?withLeg=true&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false`;

					if (config.debugMode) {
						console.log(
							`[Strategie 3] Suche über Flughafen ${selectedAirport}: ${apiUrl}`
						);
					}

					const response = await fetch(apiUrl, {
						headers: {
							"x-rapidapi-key": config.rapidApiKey,
							"x-rapidapi-host": config.rapidApiHost,
						},
					});

					if (!response.ok) return { success: false, data: [] };

					const data = await response.json();

					// Filterung nach der gesuchten Registrierung
					const filteredFlights =
						data.departures?.filter(
							(flight) =>
								flight.aircraft?.reg &&
								flight.aircraft.reg.toUpperCase() === registration
						) || [];

					return { success: true, data: filteredFlights };
				});
			}

			// Führe alle Strategien aus und sammle die Ergebnisse
			const results = await Promise.all(
				strategies.map((strategy) =>
					rateLimiter(() =>
						strategy().catch((error) => ({ success: false, data: [], error }))
					)
				)
			);

			// Kombiniere alle erfolgreichen Ergebnisse
			let allFlights = [];
			let errorOccurred = false;

			results.forEach((result, index) => {
				if (result.success && Array.isArray(result.data)) {
					if (config.debugMode) {
						console.log(
							`Strategie ${index + 1} erfolgreich: ${
								result.data.length
							} Flüge gefunden`
						);
					}
					allFlights = [...allFlights, ...result.data];
				} else if (result.data && !Array.isArray(result.data)) {
					// Wenn es ein einzelnes Objekt ist
					if (config.debugMode) {
						console.log(
							`Strategie ${index + 1} erfolgreich: Ein einzelner Flug gefunden`
						);
					}
					allFlights.push(result.data);
				} else {
					if (config.debugMode) {
						console.log(
							`Strategie ${index + 1} fehlgeschlagen oder leer`,
							result.error
						);
					}
					errorOccurred = true;
				}
			});

			// Entferne Duplikate basierend auf Flugnummer und Datum
			const uniqueFlights = allFlights.filter((flight, index, self) => {
				// Versuche einen eindeutigen Schlüssel für jeden Flug zu erstellen
				const flightKey =
					flight.number && flight.departure?.scheduledTime?.utc
						? `${flight.number}_${flight.departure.scheduledTime.utc}`
						: null;

				// Wenn kein Schlüssel erstellt werden kann, behalte den Flug
				if (!flightKey) return true;

				// Prüfe, ob dies der erste Flug mit diesem Schlüssel ist
				return (
					index ===
					self.findIndex(
						(f) =>
							f.number &&
							f.departure?.scheduledTime?.utc &&
							`${f.number}_${f.departure.scheduledTime.utc}` === flightKey
					)
				);
			});

			if (uniqueFlights.length === 0 && errorOccurred) {
				updateFetchStatus(
					`Keine zukünftigen Flüge für ${registration} gefunden (API-Fehler)`,
					true
				);
			} else if (uniqueFlights.length === 0) {
				updateFetchStatus(
					`Keine zukünftigen Flüge für ${registration} am ${date} gefunden`
				);
			} else {
				updateFetchStatus(
					`${uniqueFlights.length} zukünftige Flüge für ${registration} gefunden`
				);
			}

			// Formatieren der Antwort in ein einheitliches Format
			return convertToUnifiedFormat(uniqueFlights, registration, date);
		} catch (error) {
			console.error(
				`Fehler bei API-Anfrage für zukünftige Flüge (${aircraftRegistration}):`,
				error
			);
			updateFetchStatus(
				`Fehler bei der API-Anfrage für zukünftige Flüge: ${error.message}`,
				true
			);

			// Bei Fehlern leeres Datenarray zurückgeben
			return { data: [] };
		}
	};

	// Update der public API - vereinfacht, aber mit beibehaltenen Signaturen
	return {
		updateAircraftData,
		getAircraftFlights,
		getFutureAircraftFlights, // Neue Funktion exportieren
		getAircraftFlightsByAirport, // Neue Funktion exportieren
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
		/**
		 * Abrufen des Flugstatus für eine bestimmte Flugnummer
		 * @param {string} number - Flugnummer
		 * @param {string} date - Datum im Format YYYY-MM-DD
		 * @returns {Promise<Object>} Flugstatusdaten
		 */
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

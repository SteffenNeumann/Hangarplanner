/**
 * AeroDataBox API Integration
 * Spezialisiert auf das Abrufen von Flugdaten nach Flugzeugregistrierungen
 * Dokumentation: https://www.aerodatabox.com/docs/api
 */

const AeroDataBoxAPI = (() => {
	// API-Konfiguration
	const config = {
		apiKey:
			"eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJ3d3cuYWVyb2RhdGFib3guY29tIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmFlcm9kYXRhYm94LmNvbS9vYXV0aDIvdG9rZW4iLCJleHAiOjQ4NDM5MzA4MTYsInN1YiI6IkhBTkdBUlBMQU5ORVIiLCJzY29wZSI6WyJhaXJjcmFmdHM6cmVhZCIsImFpcmNyYWZ0LXNjaGVkdWxlczpyZWFkIl19.fGixcekDQJ3_8xNhD6ON48J9GmhGBrybfVOgCZUYm46crXdXgnrZn9eZ8JO7dUcP5fLu_T-FT0S9vTGxgkv6aOLC2PlgOUUy0d_oB_SMev3QRG_pKRIGZhrbWxQdZg9Q-BXXQl3xGxKns5dUYyJYo1RzrYk1sk7r9OmB_px1fJG1XQdBwV7nKJfJrYgHDek_hHr8BL-KJp2kcJOtUHYVPdmyAMaqXPbNi5tIM43RuWTx7iYJ8tk6oLxoXVKpNYxRvV6AFw3KDhfx8m27st0C3edf5SIu1SigywII4NHpnt1EK6PzE4RKzPNr3xfjsmkNY0lAWOTznt95DLrgmRpPzA",
		baseUrl: "https://aerodatabox.p.rapidapi.com/flights",
		rapidApiHost: "aerodatabox.p.rapidapi.com",
		rapidApiKey: "ad46b0002emsh24ee20863379507p1010e6jsn17e9247ba903", // RapidAPI Key
		debugMode: true, // Debug-Modus für zusätzliche Konsolenausgaben
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
			updateFetchStatus(
				`Suche Flüge für Aircraft ${aircraftRegistration} am ${date}...`
			);

			// AeroDataBox API-Pfad für Registrierungssuche
			const apiUrl = `${config.baseUrl}/registration/${aircraftRegistration}/${date}`;

			// API-Anfrage durchführen
			const response = await fetch(apiUrl, {
				headers: {
					"X-RapidAPI-Host": config.rapidApiHost,
					"X-RapidAPI-Key": config.rapidApiKey,
				},
			});

			if (!response.ok) {
				// Bei Fehlern Testdaten verwenden
				if (response.status === 404) {
					updateFetchStatus(
						`Keine echten Daten für ${aircraftRegistration} gefunden, generiere Testdaten`,
						false
					);
					return generateTestFlightData(aircraftRegistration, date);
				}

				const errorText = await response.text();
				throw new Error(
					`API-Anfrage fehlgeschlagen: ${response.status} ${response.statusText}. Details: ${errorText}`
				);
			}

			const data = await response.json();

			if (config.debugMode) {
				console.log(`AeroDataBox API-Antwort:`, data);
			}

			// Formatieren der Antwort in ein einheitliches Format
			return convertToUnifiedFormat(data, aircraftRegistration, date);
		} catch (error) {
			console.error("Fehler bei AeroDataBox API-Anfrage:", error);
			updateFetchStatus(
				`Verwende Testdaten für ${aircraftRegistration} (API-Fehler)`,
				false
			);

			// Bei Fehlern Testdaten zurückgeben
			return generateTestFlightData(aircraftRegistration, date);
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
	 * Aktualisiert Flugzeugdaten in der UI
	 * @param {string} aircraftId - Flugzeugkennung
	 * @param {string} currentDate - Aktuelles Datum
	 * @param {string} nextDate - Nächstes Datum
	 */
	const updateAircraftData = async (aircraftId, currentDate, nextDate) => {
		try {
			if (!aircraftId) {
				updateFetchStatus("Bitte Flugzeugkennung eingeben", true);
				return;
			}

			updateFetchStatus(
				`Flugdaten werden abgerufen für ${aircraftId} mit AeroDataBox API...`
			);

			// Formatiere Daten
			const formattedCurrentDate = currentDate
				? formatDate(currentDate)
				: formatDate(new Date());
			const formattedNextDate = nextDate
				? formatDate(nextDate)
				: formatDate(new Date());

			if (config.debugMode) {
				console.log(
					`Suche Flüge für ${aircraftId} am ${formattedCurrentDate} und ${formattedNextDate}`
				);
			}

			// Aktuelle und nächste Flüge abrufen
			const currentFlights = await getAircraftFlights(
				aircraftId,
				formattedCurrentDate
			);

			let nextFlights = { data: [] };
			if (formattedNextDate !== formattedCurrentDate) {
				nextFlights = await getAircraftFlights(aircraftId, formattedNextDate);
			}

			// Alle Flüge kombinieren
			const allFlights = [
				...(currentFlights.data || []),
				...(nextFlights.data || []),
			];

			if (allFlights.length === 0) {
				updateFetchStatus(`Keine Flüge für ${aircraftId} gefunden`, true);
				return;
			}

			updateFetchStatus(
				`${allFlights.length} Flüge für ${aircraftId} gefunden`
			);

			// Daten an das HangarData-Modul übergeben zur UI-Aktualisierung
			if (
				typeof window.HangarData !== "undefined" &&
				typeof window.HangarData.updateAircraftFromFlightData === "function"
			) {
				window.HangarData.updateAircraftFromFlightData(aircraftId, allFlights);
			} else {
				console.error(
					"HangarData-Modul nicht verfügbar - Flugdaten können nicht aktualisiert werden"
				);
				updateFetchStatus("Fehler beim Aktualisieren der Daten", true);
			}
		} catch (error) {
			console.error("Fehler beim Aktualisieren der Flugzeugdaten:", error);
			updateFetchStatus(`Fehler beim Datenabruf: ${error.message}`, true);
		}
	};

	/**
	 * Initialisiert das AeroDataBox API-Modul
	 */
	const init = () => {
		try {
			console.log("AeroDataBox API-Modul initialisiert");
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
		updateFetchStatus,
		init,
	};
})();

// Globalen Namespace für API-Zugriff erstellen
window.AeroDataBoxAPI = AeroDataBoxAPI;

/**
 * airport-flights.js
 * Funktionalität für die Anzeige von Flughafen-Flugplänen im HangarPlanner
 */

const AirportFlights = (() => {
	/**
	 * Zeigt Flugdaten für einen Flughafen im UI an
	 * @param {string} airportCode - IATA-Code des Flughafens
	 * @param {string} [startDateTime=null] - Optional: Startzeit, Standard ist heute 20:00 Uhr
	 * @param {string} [endDateTime=null] - Optional: Endzeit, Standard ist morgen 08:00 Uhr
	 * @param {string} [operatorCode=""] - Optional: ICAO/IATA-Code der Fluggesellschaft für Filterung
	 */
	const displayAirportFlights = async (
		airportCode,
		startDateTime = null,
		endDateTime = null,
		operatorCode = ""
	) => {
		try {
			// Standard-Zeitfenster: Heute 20:00 bis morgen 08:00 Uhr
			const now = new Date();
			const today = now.toISOString().split("T")[0];
			const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0];

			startDateTime = startDateTime || `${today}T20:00`;
			endDateTime = endDateTime || `${tomorrow}T08:00`;

			// Hole den aktuell ausgewählten Flughafen, falls keiner übergeben wurde
			if (!airportCode || airportCode.trim() === "") {
				const airportCodeInput = document.getElementById("airportCodeInput");
				airportCode = airportCodeInput?.value || "MUC";
			}

			// Flugdaten abrufen über die AeroDataBoxAPI
			window.AeroDataBoxAPI.updateFetchStatus(
				`Flugdaten für ${airportCode} werden geladen...`
			);

			// Prüfe, ob die API verfügbar ist
			if (!window.AeroDataBoxAPI || !window.AeroDataBoxAPI.getAirportFlights) {
				throw new Error("AeroDataBoxAPI ist nicht verfügbar");
			}

			// API-Anfrage durchführen
			const response = await window.AeroDataBoxAPI.getAirportFlights(
				airportCode,
				startDateTime,
				endDateTime
			);

			console.log("API-Antwort Format:", response);

			// Überprüfe und extrahiere die Flugdaten aus der API-Antwort
			// Die API-Antwort ist ein Objekt mit 'departures' und 'arrivals' Arrays
			let arrivals = [];
			let departures = [];

			if (response && typeof response === 'object') {
				// Format: {departures: Array, arrivals: Array}
				if (Array.isArray(response.departures)) {
					departures = response.departures;
				}
				if (Array.isArray(response.arrivals)) {
					arrivals = response.arrivals;
				}

				// Alternative Formate prüfen
				if (Array.isArray(response)) {
					// Fallback: Wenn response ein Array ist
					const flightData = response;
					arrivals = flightData.filter(flight => flight.arrival);
					departures = flightData.filter(flight => flight.departure);
				} else if (response.data && Array.isArray(response.data)) {
					// Fallback: Wenn response.data ein Array ist
					const flightData = response.data;
					arrivals = flightData.filter(flight => flight.arrival);
					departures = flightData.filter(flight => flight.departure);
				}
			} else {
				console.warn("API-Antwort hat unerwartetes Format:", response);
				throw new Error("Unerwartete Datenstruktur von der API erhalten");
			}

			// Filtere die Flüge nach dem Operator-Code, falls angegeben
			if (operatorCode && operatorCode.trim() !== "") {
				const operatorCodeUpper = operatorCode.trim().toUpperCase();

				// Filter für Ankünfte
				const originalArrivalsCount = arrivals.length;
				arrivals = arrivals.filter((flight) => {
					// Überprüfe verschiedene mögliche Orte für den Operator-Code:
					const airlineIcao = flight.airline?.icao || "";
					const airlineIata = flight.airline?.iata || "";
					const flightNumber = flight.number || "";

					return (
						airlineIcao.includes(operatorCodeUpper) ||
						airlineIata.includes(operatorCodeUpper) ||
						flightNumber.startsWith(operatorCodeUpper)
					);
				});

				// Filter für Abflüge
				const originalDeparturesCount = departures.length;
				departures = departures.filter((flight) => {
					const airlineIcao = flight.airline?.icao || "";
					const airlineIata = flight.airline?.iata || "";
					const flightNumber = flight.number || "";

					return (
						airlineIcao.includes(operatorCodeUpper) ||
						airlineIata.includes(operatorCodeUpper) ||
						flightNumber.startsWith(operatorCodeUpper)
					);
				});

				console.log(
					`Flüge gefiltert nach Operator ${operatorCodeUpper}: 
					Ankünfte: ${arrivals.length} von ${originalArrivalsCount}
					Abflüge: ${departures.length} von ${originalDeparturesCount}`
				);

				// Statusmeldung aktualisieren
				window.AeroDataBoxAPI.updateFetchStatus(
					`Flüge gefiltert nach Operator ${operatorCodeUpper}: ${
						arrivals.length + departures.length
					} von ${originalArrivalsCount + originalDeparturesCount} Flügen`
				);
			}

			// Suche den Container für die Anzeige - wir wollen die Flugdaten am Ende der Seite einfügen
			// Zuerst versuchen wir, das Ende des Hauptinhalts zu finden
			const mainContent = document.querySelector('main') || document.body;
			if (!mainContent) {
				console.error("Hauptinhalt nicht gefunden");
				return;
			}
			
			// Bestehende Fluginfos entfernen falls vorhanden
			const existingFlightInfo = document.getElementById("airport-flights-container");
			if (existingFlightInfo) {
				existingFlightInfo.remove();
			}

			// Erstelle einen Container für die Fluginfos mit der gleichen Breite wie der Seiteninhalt
			const flightInfoContainer = document.createElement("div");
			flightInfoContainer.id = "airport-flights-container";
			
			// Verwende inline styling und Klassen für ein konsistentes Layout
			flightInfoContainer.className = "container mx-auto px-4 my-8";
			
			// Erstelle einen Divider mit Label
			const divider = document.createElement("div");
			divider.className = "flex items-center my-4";
			const labelText = operatorCode.trim() !== "" 
				? `Flights at ${airportCode} (Operator: ${operatorCode.toUpperCase()})` 
				: `Flights at ${airportCode}`;
				
			divider.innerHTML = `
                <div class="flex-grow h-px bg-gray-300"></div>
                <div class="px-4 text-lg font-medium text-gray-600">${labelText}</div>
                <div class="flex-grow h-px bg-gray-300"></div>
            `;

			// Erstelle die Fluglistenansicht
			const flightList = document.createElement("div");
			flightList.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4";

			// Sortiere die Flüge nach Zeit
			arrivals.sort((a, b) => {
				if (!a.arrival?.scheduledTime?.local || !b.arrival?.scheduledTime?.local)
					return 0;
				return (
					new Date(a.arrival.scheduledTime.local) -
					new Date(b.arrival.scheduledTime.local)
				);
			});

			departures.sort((a, b) => {
				if (!a.departure?.scheduledTime?.local || !b.departure?.scheduledTime?.local)
					return 0;
				return (
					new Date(a.departure.scheduledTime.local) -
					new Date(b.departure.scheduledTime.local)
				);
			});
			
			// Formatierung der Flüge - mit besonderem Fokus auf korrekte Zeitanzeige
			const formatFlightItem = (flight, isArrival) => {
				try {
					const pointData = isArrival ? flight.arrival : flight.departure;
					if (!pointData || !pointData.scheduledTime) {
						return `
                            <div class="flex flex-col bg-white border rounded-lg shadow-sm p-4">
                                <div class="text-center text-gray-500">Unvollständige Flugdaten</div>
                            </div>
                        `;
					}

					const otherPointData = isArrival ? flight.departure : flight.arrival;
					const direction = isArrival ? "Ankunft" : "Abflug";
					const airport = isArrival
						? flight.departure?.airport?.iata
						: flight.arrival?.airport?.iata;

					// Sicheres Abrufen und Formatieren der Zeit
					let timeDisplay = "--:--";
					let scheduledTime = null;
					
					if (pointData.scheduledTime && pointData.scheduledTime.local) {
						try {
							scheduledTime = new Date(pointData.scheduledTime.local);
							timeDisplay = scheduledTime.toLocaleTimeString("de-DE", {
								hour: "2-digit",
								minute: "2-digit"
							});
						} catch (e) {
							console.warn("Fehler beim Parsen der Zeit:", e, pointData.scheduledTime);
						}
					} else if (typeof pointData.scheduledTime === 'string') {
						try {
							scheduledTime = new Date(pointData.scheduledTime);
							timeDisplay = scheduledTime.toLocaleTimeString("de-DE", {
								hour: "2-digit",
								minute: "2-digit"
							});
						} catch (e) {
							console.warn("Fehler beim Parsen der Zeit als String:", e, pointData.scheduledTime);
						}
					}
					
					// Debug-Ausgabe zur Zeitermittlung
					console.log(
						`Zeitverarbeitung für ${flight.number || 'unbekannt'}: `,
						pointData.scheduledTime,
						"→ Formatiert:",
						timeDisplay
					);

					const status = pointData.actualRunway
						? "Gelandet"
						: pointData.actualTime
						? "In der Luft"
						: pointData.estimatedRunway
						? "Verspätet"
						: "Geplant";

					let statusClass = "";
					switch (status) {
						case "Gelandet":
							statusClass = "text-green-600";
							break;
						case "In der Luft":
							statusClass = "text-blue-600";
							break;
						case "Verspätet":
							statusClass = "text-orange-600";
							break;
						default:
							statusClass = "text-gray-600";
					}

					const registration = flight.aircraft?.reg || "-----";
					const flightNumber = flight.number || "----";

					// Verbesserte Zeitdarstellung mit größerer Schrift
					return `
                        <div class="flex flex-col bg-white border rounded-lg shadow-sm p-4">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center space-x-2">
                                    <span class="font-bold text-lg">${flightNumber}</span>
                                    <span class="text-sm text-gray-500">${registration}</span>
                                </div>
                                <div class="flex items-center">
                                    <span class="px-2 py-1 text-sm ${statusClass} rounded-full">${status}</span>
                                </div>
                            </div>
                            <div class="mt-2 flex items-center">
                                <div class="flex-1">
                                    <div class="text-xs text-gray-500">${direction}</div>
                                    <div class="text-xl font-medium">${timeDisplay}</div>
                                </div>
                                <div class="text-lg font-bold mx-2">${isArrival ? "←" : "→"}</div>
                                <div class="flex-1 text-right">
                                    <div class="text-xs text-gray-500">Flughafen</div>
                                    <div class="text-lg font-medium">${airport || "---"}</div>
                                </div>
                            </div>
                        </div>
                    `;
				} catch (error) {
					console.error("Fehler beim Formatieren eines Flug-Items:", error);
					return `
                        <div class="flex flex-col bg-white border rounded-lg shadow-sm p-4">
                            <div class="text-center text-red-500">Fehler beim Formatieren der Flugdaten</div>
                        </div>
                    `;
				}
			};

			// Zeige bis zu 10 Ankünfte und 10 Abflüge an
			const maxFlightsToShow = 10;

			// Ankunftstabelle
			if (arrivals.length > 0) {
				const arrivalsTitle = document.createElement("h3");
				arrivalsTitle.className = "text-lg font-bold col-span-full mt-4";
				arrivalsTitle.textContent = `Ankünfte (${Math.min(
					arrivals.length,
					maxFlightsToShow
				)} von ${arrivals.length})`;
				flightList.appendChild(arrivalsTitle);

				arrivals.slice(0, maxFlightsToShow).forEach((flight) => {
					const flightItem = document.createElement("div");
					flightItem.innerHTML = formatFlightItem(flight, true);
					flightList.appendChild(flightItem.firstElementChild);
				});
			}

			// Abflugstabelle
			if (departures.length > 0) {
				const departuresTitle = document.createElement("h3");
				departuresTitle.className = "text-lg font-bold col-span-full mt-4";
				departuresTitle.textContent = `Abflüge (${Math.min(
					departures.length,
					maxFlightsToShow
				)} von ${departures.length})`;
				flightList.appendChild(departuresTitle);

				departures.slice(0, maxFlightsToShow).forEach((flight) => {
					const flightItem = document.createElement("div");
					flightItem.innerHTML = formatFlightItem(flight, false);
					flightList.appendChild(flightItem.firstElementChild);
				});
			}

			// Keine Flüge gefunden
			if (arrivals.length === 0 && departures.length === 0) {
				const noFlightsMessage = document.createElement("p");
				noFlightsMessage.className = "text-center text-gray-500 my-4";
				
				// Angepasste Meldung je nachdem, ob ein Operator-Filter aktiv ist
				if (operatorCode.trim() !== "") {
					noFlightsMessage.textContent = `Keine Flüge für Operator ${operatorCode.toUpperCase()} am Flughafen ${airportCode} im angegebenen Zeitraum gefunden.`;
				} else {
					noFlightsMessage.textContent = `Keine Flüge für ${airportCode} im angegebenen Zeitraum gefunden.`;
				}
				
				flightList.appendChild(noFlightsMessage);
			}

			// Alles zusammenfügen
			flightInfoContainer.appendChild(divider);
			flightInfoContainer.appendChild(flightList);

			// Füge den Container am Ende des Hauptinhalts ein, nach allen anderen Elementen
			mainContent.appendChild(flightInfoContainer);

			let statusMessage = `Flugdaten für ${airportCode} geladen (${arrivals.length} Ankünfte, ${departures.length} Abflüge)`;
			if (operatorCode.trim() !== "") {
				statusMessage += ` - gefiltert nach Operator ${operatorCode.toUpperCase()}`;
			}
			window.AeroDataBoxAPI.updateFetchStatus(statusMessage);
		} catch (error) {
			console.error("Fehler bei der Anzeige der Flughafen-Daten:", error);

			if (window.AeroDataBoxAPI && window.AeroDataBoxAPI.updateFetchStatus) {
				window.AeroDataBoxAPI.updateFetchStatus(
					`Fehler: ${error.message}`,
					true
				);
			}

			// Fehleranzeige erstellen
			const container = document.getElementById("hangarGrid");
			if (container) {
				const errorDiv = document.createElement("div");
				errorDiv.id = "airport-flights-container";
				errorDiv.className = "w-full my-4 p-4 bg-red-100 rounded-lg";
				errorDiv.innerHTML = `
                    <div class="text-red-600 font-medium">Fehler beim Laden der Flugdaten für ${airportCode}</div>
                    <div class="text-sm text-red-500">${error.message}</div>
                `;
				container.after(errorDiv);
			}
		}
	};

	/**
	 * Initialisiert die Event-Listener für die Airport-Flights-Funktionalität
	 */
	const init = () => {
		document.addEventListener("DOMContentLoaded", function () {
			// Event-Handler für den "Airport Flights" Button
			const showAirportFlightsBtn = document.getElementById(
				"showAirportFlightsBtn"
			);

			if (showAirportFlightsBtn) {
				// Füge das Operator-Eingabefeld vor dem Button ein
				const operatorInputContainer = document.createElement("div");
				operatorInputContainer.className = "sidebar-form-group mt-2";

				// Label für Operator-Eingabefeld
				const operatorLabel = document.createElement("label");
				operatorLabel.setAttribute("for", "operatorCodeInput");
				operatorLabel.textContent = "Airline Code (optional):";
				operatorInputContainer.appendChild(operatorLabel);

				// Eingabefeld für Operator
				const operatorInput = document.createElement("input");
				operatorInput.type = "text";
				operatorInput.id = "operatorCodeInput";
				operatorInput.className = "sidebar-form-control";
				operatorInput.placeholder = "z.B. LH, DLH";
				operatorInput.maxLength = "3";
				operatorInput.style.textTransform = "uppercase";
				operatorInputContainer.appendChild(operatorInput);

				// Hinweistext
				const operatorHint = document.createElement("p");
				operatorHint.className = "text-xs text-gray-400 mt-1";
				operatorHint.textContent =
					"Geben Sie einen ICAO/IATA-Code ein, um nach Fluggesellschaft zu filtern";
				operatorInputContainer.appendChild(operatorHint);

				// Füge das Element vor dem Button ein
				showAirportFlightsBtn.parentNode.insertBefore(
					operatorInputContainer,
					showAirportFlightsBtn
				);

				// Event-Handler für den Button aktualisieren
				showAirportFlightsBtn.addEventListener("click", function () {
					const airportCodeInput = document.getElementById("airportCodeInput");
					const airportCode = airportCodeInput?.value || "MUC";

					// Operator-Code aus dem neuen Eingabefeld auslesen
					const operatorCodeInput =
						document.getElementById("operatorCodeInput");
					const operatorCode = operatorCodeInput?.value || "";

					// Funktionsaufruf mit Operator-Code
					displayAirportFlights(airportCode, null, null, operatorCode);
				});
			}
		});
	};

	// Initialisierung ausführen
	init();

	// Public API
	return {
		displayAirportFlights,
		init,
	};
})();

// Globalen Namespace für Airport-Flights-Zugriff erstellen
window.AirportFlights = AirportFlights;

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
			// Maximale Anzahl an Flügen pro Kategorie, die angezeigt werden sollen
			const maxFlightsToShow = 10;

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

			console.log("API-Antwort vollständig:", response);

			// Überprüfe und extrahiere die Flugdaten aus der API-Antwort
			let arrivals = [];
			let departures = [];

			if (response && typeof response === "object") {
				// Format: {departures: Array, arrivals: Array}
				if (Array.isArray(response.departures)) {
					departures = response.departures;
					console.log(`${departures.length} Abflüge extrahiert`, departures[0]);
				}
				if (Array.isArray(response.arrivals)) {
					arrivals = response.arrivals;
					console.log(`${arrivals.length} Ankünfte extrahiert`, arrivals[0]);
				}

				// Alternative Formate prüfen
				if (Array.isArray(response)) {
					// Fallback: Wenn response ein Array ist
					const flightData = response;
					arrivals = flightData.filter((flight) => flight.arrival);
					departures = flightData.filter((flight) => flight.departure);
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

			// Suche den Container für die Anzeige
			const mainContent = document.querySelector("main") || document.body;

			// Bestehende Fluginfos entfernen falls vorhanden
			const existingFlightInfo = document.getElementById(
				"airport-flights-container"
			);
			if (existingFlightInfo) {
				existingFlightInfo.remove();
				console.log("Bestehenden Flug-Container entfernt");
			}

			// Erstelle einen Container für die Fluginfos mit dem Design des Hangarplanners
			const flightInfoContainer = document.createElement("div");
			flightInfoContainer.id = "airport-flights-container";
			flightInfoContainer.className = "section-container";
			flightInfoContainer.style.marginTop = "2rem";
			flightInfoContainer.style.backgroundColor = "white";
			flightInfoContainer.style.borderRadius = "0.5rem";
			flightInfoContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
			flightInfoContainer.style.padding = "1rem";

			// Erstelle einen Titel für den Abschnitt
			const sectionTitle = document.createElement("h2");
			sectionTitle.style.fontSize = "1.25rem";
			sectionTitle.style.fontWeight = "600";
			sectionTitle.style.color = "#3A4354"; // Industrial dark Farbe
			sectionTitle.style.marginBottom = "1rem";
			const labelText =
				operatorCode.trim() !== ""
					? `Flights at ${airportCode} (Operator: ${operatorCode.toUpperCase()})`
					: `Flights at ${airportCode}`;
			sectionTitle.textContent = labelText;
			flightInfoContainer.appendChild(sectionTitle);

			// Container für die Flugdaten
			const flightDataContainer = document.createElement("div");
			flightDataContainer.style.width = "100%";

			// Separate Container für Ankünfte und Abflüge
			const arrivalsContainer = document.createElement("div");
			arrivalsContainer.style.marginBottom = "1.5rem";

			const departuresContainer = document.createElement("div");

			// Ankunftsliste
			if (arrivals.length > 0) {
				const arrivalsTitle = document.createElement("h3");
				arrivalsTitle.style.fontSize = "1.125rem";
				arrivalsTitle.style.fontWeight = "500";
				arrivalsTitle.style.color = "#3A4354";
				arrivalsTitle.style.marginBottom = "0.75rem";
				arrivalsTitle.style.borderBottom = "1px solid rgba(209, 213, 219, 0.5)";
				arrivalsTitle.style.paddingBottom = "0.5rem";
				arrivalsTitle.textContent = `Ankünfte (${Math.min(
					arrivals.length,
					maxFlightsToShow
				)} von ${arrivals.length})`;
				arrivalsContainer.appendChild(arrivalsTitle);

				// Sortieren der Ankünfte nach Zeit
				arrivals.sort((a, b) => {
					if (
						!a.arrival?.scheduledTime?.local ||
						!b.arrival?.scheduledTime?.local
					)
						return 0;
					return (
						new Date(a.arrival.scheduledTime.local) -
						new Date(b.arrival.scheduledTime.local)
					);
				});

				// Grid-Container für die Flug-Karten
				const flightCardsGrid = document.createElement("div");
				flightCardsGrid.style.display = "grid";
				flightCardsGrid.style.gridTemplateColumns =
					"repeat(auto-fill, minmax(250px, 1fr))";
				flightCardsGrid.style.gap = "1rem";

				// Liste der Ankünfte erstellen
				arrivals.slice(0, maxFlightsToShow).forEach((flight) => {
					const flightCard = createFlightCard(flight, true);
					flightCardsGrid.appendChild(flightCard);
				});

				arrivalsContainer.appendChild(flightCardsGrid);
			}

			// Abflugsliste
			if (departures.length > 0) {
				const departuresTitle = document.createElement("h3");
				departuresTitle.style.fontSize = "1.125rem";
				departuresTitle.style.fontWeight = "500";
				departuresTitle.style.color = "#3A4354";
				departuresTitle.style.marginBottom = "0.75rem";
				departuresTitle.style.borderBottom =
					"1px solid rgba(209, 213, 219, 0.5)";
				departuresTitle.style.paddingBottom = "0.5rem";
				departuresTitle.textContent = `Abflüge (${Math.min(
					departures.length,
					maxFlightsToShow
				)} von ${departures.length})`;
				departuresContainer.appendChild(departuresTitle);

				// Sortieren der Abflüge nach Zeit
				departures.sort((a, b) => {
					if (
						!a.departure?.scheduledTime?.local ||
						!b.departure?.scheduledTime?.local
					)
						return 0;
					return (
						new Date(a.departure.scheduledTime.local) -
						new Date(b.departure.scheduledTime.local)
					);
				});

				// Grid-Container für die Flug-Karten
				const flightCardsGrid = document.createElement("div");
				flightCardsGrid.style.display = "grid";
				flightCardsGrid.style.gridTemplateColumns =
					"repeat(auto-fill, minmax(250px, 1fr))";
				flightCardsGrid.style.gap = "1rem";

				// Liste der Abflüge erstellen
				departures.slice(0, maxFlightsToShow).forEach((flight) => {
					const flightCard = createFlightCard(flight, false);
					flightCardsGrid.appendChild(flightCard);
				});

				departuresContainer.appendChild(flightCardsGrid);
			}

			// Keine Flüge gefunden
			if (arrivals.length === 0 && departures.length === 0) {
				const noFlightsMessage = document.createElement("p");
				noFlightsMessage.style.textAlign = "center";
				noFlightsMessage.style.color = "#666";
				noFlightsMessage.style.padding = "2rem 0";

				if (operatorCode.trim() !== "") {
					noFlightsMessage.textContent = `Keine Flüge für Operator ${operatorCode.toUpperCase()} am Flughafen ${airportCode} im angegebenen Zeitraum gefunden.`;
				} else {
					noFlightsMessage.textContent = `Keine Flüge für ${airportCode} im angegebenen Zeitraum gefunden.`;
				}

				flightDataContainer.appendChild(noFlightsMessage);
			} else {
				// Füge die Abschnitte dem Hauptcontainer hinzu
				flightDataContainer.appendChild(arrivalsContainer);
				flightDataContainer.appendChild(departuresContainer);
			}

			flightInfoContainer.appendChild(flightDataContainer);

			// Hauptbereich finden und den Container einfügen
			const hangarContainer = document.querySelector(".hangar-container");
			if (hangarContainer) {
				hangarContainer.appendChild(flightInfoContainer);

				// Nach dem Einfügen zum Container scrollen
				flightInfoContainer.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			} else {
				// Fallback: an den Body anhängen
				document.body.appendChild(flightInfoContainer);
			}

			// CSS-Stile für die Flugkarten hinzufügen
			const styleElement = document.createElement("style");
			styleElement.textContent = `
				#airport-flights-container .card-header {
					background-color: #5D6B89;
					padding: 8px 12px;
					color: white;
				}
				
				#airport-flights-container .flight-header-info {
					display: flex;
					flex-direction: column;
				}
				
				#airport-flights-container .flight-number {
					font-weight: bold;
					font-size: 1.1rem;
				}
				
				#airport-flights-container .flight-reg {
					font-size: 0.8rem;
					opacity: 0.8;
				}
				
				#airport-flights-container .flight-time-display {
					font-size: 1.25rem;
					font-weight: 500;
				}
				
				#airport-flights-container .header-elements {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
				
				#airport-flights-container .info-grid {
					display: grid;
					grid-template-columns: auto 1fr;
					gap: 0.5rem 1rem;
					align-items: center;
				}
				
				#airport-flights-container .info-label {
					font-weight: 500;
					color: #666;
					font-size: 0.875rem;
				}
				
				#airport-flights-container .info-value {
					font-size: 0.95rem;
				}
			`;
			document.head.appendChild(styleElement);

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
				errorDiv.style.width = "100%";
				errorDiv.style.margin = "1rem 0";
				errorDiv.style.padding = "1rem";
				errorDiv.style.backgroundColor = "#FEE2E2";
				errorDiv.style.borderRadius = "0.5rem";

				errorDiv.innerHTML = `
                    <div style="color: #DC2626; font-weight: 500;">Fehler beim Laden der Flugdaten für ${airportCode}</div>
                    <div style="font-size: 0.875rem; color: #EF4444;">${error.message}</div>
                `;
				container.after(errorDiv);
			}
		}
	};

	/**
	 * Erstellt eine Flug-Karte im Hangarplanner-Design
	 * @param {Object} flight - Flugdaten
	 * @param {boolean} isArrival - Handelt es sich um eine Ankunft
	 * @returns {HTMLElement} - Die Flugkarte
	 */
	const createFlightCard = (flight, isArrival) => {
		// Container für die Flugkarte
		const cardContainer = document.createElement("div");
		cardContainer.style.backgroundColor = "white";
		cardContainer.style.borderRadius = "0.5rem";
		cardContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
		cardContainer.style.display = "flex";
		cardContainer.style.flexDirection = "column";
		cardContainer.style.overflow = "hidden";

		// Header der Karte - ähnlich wie Hangar-Kacheln
		const cardHeader = document.createElement("div");
		cardHeader.className = "card-header";

		// Flugdetails extrahieren
		const pointData = isArrival ? flight.arrival : flight.departure;
		const otherPointData = isArrival ? flight.departure : flight.arrival;
		const flightNumber = flight.number || "----";
		const registration = flight.aircraft?.reg || "-----";
		const otherAirport = isArrival
			? flight.departure?.airport?.iata || "---"
			: flight.arrival?.airport?.iata || "---";

		// Zeitformatierung
		let timeText = "--:--";
		if (pointData && pointData.scheduledTime) {
			if (
				typeof pointData.scheduledTime === "object" &&
				pointData.scheduledTime.local
			) {
				const timePart = pointData.scheduledTime.local.match(/\d{2}:\d{2}/);
				if (timePart) timeText = timePart[0];
			} else if (typeof pointData.scheduledTime === "string") {
				const dateObj = new Date(pointData.scheduledTime);
				if (!isNaN(dateObj.getTime())) {
					timeText = dateObj.toLocaleTimeString("de-DE", {
						hour: "2-digit",
						minute: "2-digit",
					});
				}
			}
		}

		// Header mit Flugnummer und Registrierung
		const headerElements = document.createElement("div");
		headerElements.className = "header-elements";
		headerElements.innerHTML = `
			<div class="flight-header-info">
				<span class="flight-number">${flightNumber}</span>
				<span class="flight-reg">${registration}</span>
			</div>
			<div class="flight-time-display">
				${timeText}
			</div>
		`;

		cardHeader.appendChild(headerElements);
		cardContainer.appendChild(cardHeader);

		// Hauptbereich der Karte
		const cardBody = document.createElement("div");
		cardBody.style.padding = "0.75rem";
		cardBody.style.flexGrow = "1";
		cardBody.style.display = "flex";
		cardBody.style.flexDirection = "column";

		// Status bestimmen
		const status =
			pointData && pointData.actualRunway
				? "Gelandet"
				: pointData && pointData.actualTime
				? "In der Luft"
				: pointData && pointData.estimatedRunway
				? "Verspätet"
				: "Geplant";

		// Richtungssymbol
		const directionSymbol = isArrival ? "←" : "→";

		// Information Grid ähnlich wie in den Hangar-Kacheln
		const infoGrid = document.createElement("div");
		infoGrid.className = "info-grid";
		infoGrid.style.marginBottom = "0.5rem";

		infoGrid.innerHTML = `
			<div class="info-label">${isArrival ? "Von" : "Nach"}:</div>
			<div class="info-value">${otherAirport}</div>

			<div class="info-label">Status:</div>
			<div class="info-value">${status}</div>

			<div class="info-label">Richtung:</div>
			<div class="info-value">${directionSymbol} ${
			isArrival ? "Ankunft" : "Abflug"
		}</div>
		`;

		cardBody.appendChild(infoGrid);
		cardContainer.appendChild(cardBody);

		return cardContainer;
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

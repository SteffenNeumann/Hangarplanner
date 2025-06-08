/**
 * weather-api.js
 * Handhabt das Abrufen und Anzeigen von Wetterdaten von der AeroDataBox API
 */

const weatherAPI = {
	// Standard-Flughafencode
	currentAirport: "MUC",

	// Wetter-Icons Mapping basierend auf Bedingungen
	icons: {
		clear:
			'<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" /></svg>',
		partlyCloudy:
			'<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.75a3 3 0 00-3 3v.75h1.5v-.75a1.5 1.5 0 011.5-1.5h.75V3.75H4.5zM1.5 8.25v3h1.5v-3H1.5zM3 15v-.75H1.5V15a3 3 0 003 3h.75v-1.5H4.5a1.5 1.5 0 01-1.5-1.5zM8.25 3v1.5h3V3h-3zM15 3v1.5h.75A1.5 1.5 0 0117.25 6v.75H18.75V6a3 3 0 00-3-3H15zM18.75 8.25h-1.5v3h1.5v-3zM18 11.25v3h1.5v-3H18zM15 18.75v-1.5h-.75a1.5 1.5 0 01-1.5-1.5v-.75h-1.5v.75a3 3 0 003 3H15zM8.25 18.75v-1.5h-3v1.5h3zM9 9.75a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5z" /></svg>',
		cloudy:
			'<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></path></svg>',
		rain: '<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zM8.627 15.727c-.462.82-1.6.82-2.063 0l-1.59-2.8c-.462-.82.064-1.828 1.032-1.828h3.18c.968 0 1.494 1.008 1.032 1.828l-1.591 2.8z" /></svg>',
		snow: '<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
		default:
			'<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>',
	},

	// Initialisiere das Wetter-Widget
	init: function (airportCode = null) {
		console.log("Initialisiere Wetter-Widget...");

		// Prüfen ob DOM bereits geladen ist
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () =>
				this._init(airportCode)
			);
		} else {
			this._init(airportCode);
		}
	},

	// Interne Initialisierung nach DOM-Ladung
	_init: function (airportCode) {
		// Zuerst versuchen, den Code aus dem Input-Feld zu holen
		const airportInput = document.getElementById("airportCodeInput");
		this.currentAirport =
			airportCode || (airportInput ? airportInput.value : "MUC");

		// Prüfen ob Wetter-Widget-Elemente existieren
		const weatherWidget = document.getElementById("weather-widget");
		const airportDisplay = document.querySelector(".weather-airport");

		if (!weatherWidget) {
			console.error("Wetter-Widget Element nicht gefunden!");
			return;
		}

		if (!airportDisplay) {
			console.error("Airport-Display Element nicht gefunden!");
			return;
		}

		// Sicherstellen, dass es ein gültiger IATA-Code ist (3 Buchstaben)
		if (!this.currentAirport || this.currentAirport.length !== 3) {
			console.warn("Ungültiger Flughafencode, setze auf Standardwert MUC");
			this.currentAirport = "MUC";
		}

		this.currentAirport = this.currentAirport.toUpperCase();

		// Widget-Element mit dem Flughafencode aktualisieren
		airportDisplay.textContent = this.currentAirport;

		// Status anzeigen
		const weatherDesc = document.getElementById("weather-description");
		if (weatherDesc) {
			weatherDesc.textContent = "Lade Wetterdaten...";
		}

		// Daten initial laden
		console.log(`Starte Wetter-API-Abfrage für ${this.currentAirport}...`);
		this.fetchWeatherData();

		// Aktualisierungsintervall einrichten (jede Stunde)
		if (this._updateInterval) clearInterval(this._updateInterval);
		this._updateInterval = setInterval(() => {
			console.log("Stündliches Wetter-Update für", this.currentAirport);
			this.fetchWeatherData();
		}, 60 * 60 * 1000); // 1 Stunde

		// Event-Listener für Änderungen am Flughafen-Eingabefeld
		this.setupAirportChangeListener();

		console.log("Wetter-Widget initialisiert für", this.currentAirport);
	},

	// Event-Listener für das Flughafen-Eingabefeld einrichten
	setupAirportChangeListener: function () {
		const airportInput = document.getElementById("airportCodeInput");
		if (!airportInput) return;

		// Bestehende Listener entfernen, um Duplikate zu vermeiden
		airportInput.removeEventListener(
			"change",
			airportInput._weatherChangeHandler
		);
		airportInput.removeEventListener("blur", airportInput._weatherBlurHandler);

		// Neuen Listener für Change-Event registrieren
		airportInput._weatherChangeHandler = () => {
			if (airportInput.value && airportInput.value.length === 3) {
				this.updateAirport(airportInput.value);
				console.log(
					"Wetter-Widget auf Flughafen",
					airportInput.value,
					"aktualisiert"
				);
			}
		};
		airportInput.addEventListener("change", airportInput._weatherChangeHandler);

		// Zusätzlichen Listener für Blur-Event, um auch bei Klick außerhalb zu aktualisieren
		airportInput._weatherBlurHandler = () => {
			if (
				airportInput.value &&
				airportInput.value.length === 3 &&
				airportInput.value.toUpperCase() !== this.currentAirport
			) {
				this.updateAirport(airportInput.value);
			}
		};
		airportInput.addEventListener("blur", airportInput._weatherBlurHandler);

		console.log(
			"Wetter-Widget ist jetzt mit dem Flughafen-Eingabefeld synchronisiert"
		);
	},

	// Wetterdaten von API abrufen
	fetchWeatherData: async function () {
		console.log(`Rufe Wetterdaten für ${this.currentAirport} ab...`);

		// Status-Feedback im UI
		const weatherDesc = document.getElementById("weather-description");
		if (weatherDesc) {
			weatherDesc.textContent = "Verbinde...";
			weatherDesc.style.opacity = "0.7";
		}

		const url = `https://aerodatabox.p.rapidapi.com/airports/iata/${this.currentAirport}/weather`;
		const options = {
			method: "GET",
			headers: {
				"x-rapidapi-key": "b76afbf516mshf864818d919de86p10475ejsna65b718a8602",
				"x-rapidapi-host": "aerodatabox.p.rapidapi.com",
			},
		};

		try {
			console.log(`API-Anfrage wird gesendet an: ${url}`);
			const response = await fetch(url, options);

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();
			console.log("Wetterdaten erhalten:", data);

			// Wetterdaten verarbeiten und anzeigen
			this.displayWeatherData(data);
		} catch (error) {
			console.error("Fehler beim Abrufen der Wetterdaten:", error);
			this.showErrorState(error.message);
		}
	},

	// Wetterdaten im Widget anzeigen
	displayWeatherData: function (data) {
		const weatherTemp = document.getElementById("weather-temp");
		const weatherIcon = document.getElementById("weather-icon");
		const weatherDesc = document.getElementById("weather-description");
		const weatherVisibility = document.getElementById("weather-visibility");

		// Datenstruktur validieren - API gibt ein Array zurück
		if (
			!data ||
			!Array.isArray(data) ||
			data.length === 0 ||
			!data[0].airTemperature
		) {
			console.error("Unerwartete API-Antwortstruktur:", data);
			this.showErrorState();
			return;
		}

		const weatherData = data[0]; // Erstes Element des Arrays verwenden

		// Temperatur aktualisieren (korrekte Pfadstruktur)
		const temp = Math.round(weatherData.airTemperature.c);
		weatherTemp.textContent = `${temp}°C`;

		// Prominentere Positionierung der Temperatur
		weatherTemp.style.visibility = "visible";

		// Wind-Informationen extrahieren und anzeigen
		if (
			weatherData.wind &&
			weatherData.wind.speed &&
			weatherData.wind.direction
		) {
			const windSpeed = Math.round(weatherData.wind.speed.kmPerHour);
			const windDirection = this.formatWindDirection(
				weatherData.wind.direction.deg
			);

			// Windrichtungspfeil und Geschwindigkeit klarer darstellen
			const windElement = document.getElementById("weather-wind");
			if (windElement) {
				// Einheitlicher Stil für alle Elemente der zweiten Zeile
				windElement.innerHTML = `
					<span class="weather-wind-icon" style="transform: rotate(${weatherData.wind.direction.deg}deg)">→</span>
					${windDirection} ${windSpeed} km/h
				`;
				windElement.style.display = "inline-block";
				windElement.style.marginRight = "12px";
				windElement.style.whiteSpace = "nowrap";
				windElement.style.fontSize = "0.875rem";
				windElement.style.fontWeight = "normal";
				windElement.style.color = "#64748b";
			}
		} else if (document.getElementById("weather-wind")) {
			document.getElementById("weather-wind").style.display = "none";
		}

		// Sichtweite-Informationen - auf Englisch (Vis.)
		if (weatherData.visibility && weatherData.visibility.km) {
			const visibility = Math.round(weatherData.visibility.km * 10) / 10;

			// Nur anzeigen, wenn die Sicht eingeschränkt ist (<10km)
			if (visibility < 10 && weatherVisibility) {
				// Auf Englisch (Vis.) und mit einheitlichem Stil
				weatherVisibility.textContent = `Vis: ${visibility}km`;
				weatherVisibility.style.display = "inline-block";
				weatherVisibility.style.marginLeft = "12px";
				weatherVisibility.style.whiteSpace = "nowrap";
				weatherVisibility.style.fontSize = "0.875rem";
				weatherVisibility.style.fontWeight = "normal";
				weatherVisibility.style.color = "#64748b";
			} else if (weatherVisibility) {
				weatherVisibility.style.display = "none";
			}
		} else if (weatherVisibility) {
			weatherVisibility.style.display = "none";
		}

		// Wetterbeschreibung setzen
		let description = weatherData.cloudCover || "";
		if (weatherData.phenomenaGroups && weatherData.phenomenaGroups.length > 0) {
			if (description) description += ", ";
			description += weatherData.phenomenaGroups.join(", ");
		}
		if (!description) description = "Unbekannt";

		// Beschreibung kürzen, wenn sie zu lang ist
		if (description.length > 25) {
			description = description.substring(0, 22) + "...";
		}

		weatherDesc.textContent = description;
		// Einheitlicher Stil für Wetterbeschreibung
		weatherDesc.style.display = "inline-block";
		weatherDesc.style.whiteSpace = "nowrap";
		weatherDesc.style.fontSize = "0.875rem";
		weatherDesc.style.fontWeight = "normal";
		weatherDesc.style.color = "#64748b";

		// Icon basierend auf Bedingungen aktualisieren
		let iconKey = "default";
		const conditions = description.toLowerCase();

		// CloudCover-basierte Bedingungen prüfen
		if (conditions.includes("clear")) {
			iconKey = "clear";
		} else if (conditions.includes("scattered") || conditions.includes("few")) {
			iconKey = "partlyCloudy";
		} else if (
			conditions.includes("cloud") ||
			conditions.includes("overcast")
		) {
			iconKey = "cloudy";
		}

		// PhenomenaGroups prüfen, welche Priorität über CloudCover haben
		if (weatherData.phenomenaGroups) {
			if (
				weatherData.phenomenaGroups.some(
					(p) =>
						p.toLowerCase().includes("rain") ||
						p.toLowerCase().includes("shower") ||
						p.toLowerCase().includes("drizzle")
				)
			) {
				iconKey = "rain";
			} else if (
				weatherData.phenomenaGroups.some(
					(p) =>
						p.toLowerCase().includes("snow") || p.toLowerCase().includes("ice")
				)
			) {
				iconKey = "snow";
			}
		}

		weatherIcon.innerHTML = this.icons[iconKey];
	},

	// Formatiert Windrichtung in Grad zu Himmelsrichtungen
	formatWindDirection: function (degrees) {
		if (degrees === undefined) return "";

		const directions = [
			"N",
			"NNO",
			"NO",
			"ONO",
			"O",
			"OSO",
			"SO",
			"SSO",
			"S",
			"SSW",
			"SW",
			"WSW",
			"W",
			"WNW",
			"NW",
			"NNW",
			"N",
		];

		// Umrechnung von Gradzahl zur passenden Himmelsrichtung
		const index = Math.round(degrees / 22.5);
		return directions[index % 16];
	},

	// Gibt die vollständige Windrichtungsbezeichnung zurück
	getFullWindDirection: function (shortDirection) {
		const directions = {
			N: "Norden",
			NNO: "Nord-Nordost",
			NO: "Nordost",
			ONO: "Ost-Nordost",
			O: "Osten",
			OSO: "Ost-Südost",
			SO: "Südost",
			SSO: "Süd-Südost",
			S: "Süden",
			SSW: "Süd-Südwest",
			SW: "Südwest",
			WSW: "West-Südwest",
			W: "Westen",
			WNW: "West-Nordwest",
			NW: "Nordwest",
			NNW: "Nord-Nordwest",
		};

		return directions[shortDirection] || shortDirection;
	},

	// Fehlerzustand im Widget anzeigen mit spezifischer Fehlermeldung
	showErrorState: function (errorMsg = "") {
		console.error("Wetter-Widget Fehler:", errorMsg);

		const weatherTemp = document.getElementById("weather-temp");
		const weatherIcon = document.getElementById("weather-icon");
		const weatherDesc = document.getElementById("weather-description");
		const weatherWind = document.getElementById("weather-wind");
		const weatherVisibility = document.getElementById("weather-visibility");

		if (weatherTemp) weatherTemp.textContent = `--°C`;
		if (weatherDesc) weatherDesc.textContent = "Wetterdaten nicht verfügbar";
		if (weatherWind) weatherWind.style.display = "none";
		if (weatherVisibility) weatherVisibility.style.display = "none";

		if (weatherIcon) {
			weatherIcon.innerHTML =
				'<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
		}
	},

	// Flughafencode aktualisieren
	updateAirport: function (airportCode) {
		if (!airportCode || airportCode.length !== 3) {
			console.warn(
				"Ungültiger Flughafencode. Muss ein 3-stelliger IATA-Code sein."
			);
			return;
		}

		this.currentAirport = airportCode.toUpperCase();

		// Widget aktualisieren
		const airportDisplay = document.querySelector(".weather-airport");
		if (airportDisplay) {
			airportDisplay.textContent = this.currentAirport;
		}

		// Wetterdaten für den neuen Flughafen abrufen
		console.log(`Aktualisiere Wetterdaten für ${this.currentAirport}...`);
		this.fetchWeatherData();
	},
};

// Stelle sicher, dass weatherAPI direkt initialisiert wird
document.addEventListener("DOMContentLoaded", function () {
	console.log("DOM geladen, initialisiere Weather API...");

	// Verzögerte Initialisierung, um sicherzustellen, dass alle DOM-Elemente vorhanden sind
	setTimeout(() => {
		if (typeof weatherAPI.init === "function") {
			weatherAPI.init();
		} else {
			console.error("weatherAPI.init ist keine Funktion!");
		}
	}, 500);

	// Event-Handler für API-Aktualisierung
	document.addEventListener("fetchFlightDataComplete", function (event) {
		console.log("fetchFlightDataComplete Event empfangen, aktualisiere Wetter");

		// Flughafen könnte sich geändert haben - Widget mit dem neuen Code aktualisieren
		const airportInput = document.getElementById("airportCodeInput");
		if (airportInput && airportInput.value.length === 3) {
			weatherAPI.updateAirport(airportInput.value);
		}
	});
});

// Globalen Zugriff auf weatherAPI ermöglichen
window.weatherAPI = weatherAPI;

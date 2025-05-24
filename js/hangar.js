document.addEventListener("DOMContentLoaded", () => {
	// Datenstruktur für die Flugzeuge
	const hangarData = {
		cells: Array(8)
			.fill()
			.map((_, i) => ({
				id: i + 1,
				aircraftId: "",
				manualInput: "",
				arrivalTime: "",
				departureTime: "",
				position: "",
				status: "ready",
				lightsStatus: {
					arrival: false,
					present: false,
					departure: false,
				},
			})),
	};

	// Initialisiere die UI
	initializeUI();

	// Event-Listener für Speichern und Laden
	document.getElementById("saveBtn").addEventListener("click", saveProject);
	document.getElementById("loadBtn").addEventListener("click", showLoadModal);
	document
		.getElementById("cancelLoad")
		.addEventListener("click", hideLoadModal);
	document.getElementById("confirmLoad").addEventListener("click", loadProject);

	// Event-Listener für die Suche und Datenabruf
	document
		.getElementById("btnSearch")
		.addEventListener("click", searchAircraft);
	document
		.getElementById("fetchFlightData")
		.addEventListener("click", fetchFlightData);

	// Event-Listener für Eingaben in den Kacheln
	for (let i = 1; i <= 8; i++) {
		// Flugzeugkennzeichen Eingabe
		const aircraftInput = document.getElementById(`aircraft-${i}`);
		aircraftInput.addEventListener("change", (e) => {
			hangarData.cells[i - 1].aircraftId = e.target.value;
			updateCellData(i);
		});

		// Status-Änderung
		const statusSelect = document.getElementById(`status-${i}`);
		statusSelect.addEventListener("change", (e) => {
			hangarData.cells[i - 1].status = e.target.value;
			updateStatusLights(i);
		});

		// Manuelle Eingabe
		const manualInputs = document.querySelectorAll(
			`.hangar-cell:nth-child(${i}) input[placeholder="Manuelle Eingabe"]`
		);
		manualInputs.forEach((input) => {
			input.addEventListener("change", (e) => {
				hangarData.cells[i - 1].manualInput = e.target.value;
			});
		});
	}

	/**
	 * UI-Initialisierung
	 */
	function initializeUI() {
		// Initialen Status der Lichter für alle Zellen setzen
		for (let i = 1; i <= 8; i++) {
			updateStatusLights(i);
		}

		// Lade die gespeicherten Projekte
		loadProjectsList();
	}

	/**
	 * Aktualisiert die Statuslichter basierend auf dem Status des Flugzeugs
	 * @param {number} cellId - Die ID der Hangar-Zelle
	 */
	function updateStatusLights(cellId) {
		const cell = hangarData.cells[cellId - 1];
		const status = cell.status;

		// Standardmäßig alle Lichter ausschalten
		cell.lightsStatus = {
			arrival: false,
			present: false,
			departure: false,
		};

		// Je nach Status die entsprechenden Lichter einschalten
		switch (status) {
			case "maintenance":
				cell.lightsStatus.present = true;
				break;
			case "ready":
				cell.lightsStatus.arrival = true;
				cell.lightsStatus.present = true;
				break;
			case "boarding":
				cell.lightsStatus.present = true;
				cell.lightsStatus.departure = true;
				break;
			case "delay":
				cell.lightsStatus.arrival = true;
				cell.lightsStatus.departure = true;
				break;
		}

		// UI aktualisieren
		Object.keys(cell.lightsStatus).forEach((lightType) => {
			const light = document.querySelector(
				`.status-light[data-cell="${cellId}"][data-status="${lightType}"]`
			);
			if (light) {
				light.style.opacity = cell.lightsStatus[lightType] ? "1" : "0.2";
			}
		});
	}

	/**
	 * Aktualisiert die Daten für eine Zelle basierend auf dem Flugzeugkennzeichen
	 * @param {number} cellId - Die ID der Hangar-Zelle
	 */
	async function updateCellData(cellId) {
		const cell = hangarData.cells[cellId - 1];
		const aircraftId = cell.aircraftId;

		if (!aircraftId) {
			// Wenn kein Kennzeichen eingegeben wurde, zeige Standardwerte an
			document.getElementById(`arrival-time-${cellId}`).textContent = "--:--";
			document.getElementById(`departure-time-${cellId}`).textContent = "--:--";
			document.getElementById(`position-${cellId}`).textContent = "--";
			return;
		}

		// UI-Status auf "Laden" setzen
		document.getElementById(`arrival-time-${cellId}`).textContent = "Laden...";
		document.getElementById(`departure-time-${cellId}`).textContent =
			"Laden...";
		document.getElementById(`position-${cellId}`).textContent = "Laden...";

		try {
			// Simulierte API-Anfrage (in einer realen Anwendung würde hier eine echte API angefragt werden)
			await simulateFetchFlightData(aircraftId, cellId);
		} catch (error) {
			document.getElementById(`arrival-time-${cellId}`).textContent = "Fehler";
			document.getElementById(`departure-time-${cellId}`).textContent =
				"Fehler";
			document.getElementById(`position-${cellId}`).textContent = "Fehler";
			console.error("Fehler beim Abrufen der Flugdaten:", error);
		}
	}

	/**
	 * Simuliert das Abrufen von Flugdaten
	 * In einer realen Anwendung würde dies durch einen tatsächlichen API-Aufruf ersetzt werden
	 * @param {string} aircraftId - Flugzeugkennzeichen
	 * @param {number} cellId - Die ID der Hangar-Zelle
	 */
	function simulateFetchFlightData(aircraftId, cellId) {
		return new Promise((resolve) => {
			setTimeout(() => {
				// Generiere zufällige Daten für das Demo
				const now = new Date();
				const arrivalHours = (now.getHours() - Math.floor(Math.random() * 5))
					.toString()
					.padStart(2, "0");
				const arrivalMinutes = Math.floor(Math.random() * 60)
					.toString()
					.padStart(2, "0");
				const departureHours = (now.getHours() + Math.floor(Math.random() * 5))
					.toString()
					.padStart(2, "0");
				const departureMinutes = Math.floor(Math.random() * 60)
					.toString()
					.padStart(2, "0");
				const positions = ["A1", "B3", "C2", "D4", "E5", "F2", "G7", "H8"];
				const position =
					positions[Math.floor(Math.random() * positions.length)];

				// Daten speichern
				hangarData.cells[
					cellId - 1
				].arrivalTime = `${arrivalHours}:${arrivalMinutes}`;
				hangarData.cells[
					cellId - 1
				].departureTime = `${departureHours}:${departureMinutes}`;
				hangarData.cells[cellId - 1].position = position;

				// UI aktualisieren
				document.getElementById(`arrival-time-${cellId}`).textContent =
					hangarData.cells[cellId - 1].arrivalTime;
				document.getElementById(`departure-time-${cellId}`).textContent =
					hangarData.cells[cellId - 1].departureTime;
				document.getElementById(`position-${cellId}`).textContent =
					hangarData.cells[cellId - 1].position;

				resolve();
			}, 700); // Simuliere eine Verzögerung von 700ms
		});
	}

	/**
	 * Sucht nach einem Flugzeug basierend auf dem Kennzeichen
	 */
	function searchAircraft() {
		const searchText = document
			.getElementById("searchAircraft")
			.value.trim()
			.toUpperCase();
		if (!searchText) return;

		const foundCell = hangarData.cells.find(
			(cell) => cell.aircraftId.toUpperCase() === searchText
		);

		if (foundCell) {
			// Flugzeug gefunden, entsprechende Zelle hervorheben
			const cellElement = document.querySelector(
				`.hangar-cell:nth-child(${foundCell.id})`
			);
			cellElement.scrollIntoView({ behavior: "smooth" });

			// Visuelles Feedback durch kurzes Pulsieren
			cellElement.classList.add("ring-4", "ring-industrial-accent");
			setTimeout(() => {
				cellElement.classList.remove("ring-4", "ring-industrial-accent");
			}, 2000);
		} else {
			alert(`Flugzeug mit Kennzeichen ${searchText} wurde nicht gefunden.`);
		}
	}

	/**
	 * Aktualisiert die Flugdaten für alle Flugzeuge
	 */
	async function fetchFlightData() {
		const fetchStatusElement = document.getElementById("fetchStatus");
		fetchStatusElement.textContent = "Aktualisiere Daten...";
		fetchStatusElement.classList.add("text-status-yellow");

		try {
			// Für jedes vorhandene Flugzeug die Daten aktualisieren
			const updatePromises = hangarData.cells
				.filter((cell) => cell.aircraftId)
				.map((cell) => updateCellData(cell.id));

			await Promise.all(updatePromises);

			fetchStatusElement.textContent = "Alle Daten erfolgreich aktualisiert!";
			fetchStatusElement.classList.remove("text-status-yellow");
			fetchStatusElement.classList.add("text-status-green");

			// Nach 3 Sekunden zurücksetzen
			setTimeout(() => {
				fetchStatusElement.textContent = "Bereit zum Abrufen von Flugdaten";
				fetchStatusElement.classList.remove("text-status-green");
			}, 3000);
		} catch (error) {
			fetchStatusElement.textContent = "Fehler bei der Aktualisierung!";
			fetchStatusElement.classList.remove("text-status-yellow");
			fetchStatusElement.classList.add("text-status-red");
			console.error("Fehler beim Aktualisieren der Flugdaten:", error);
		}
	}

	/**
	 * Speichert den aktuellen Hangarplan
	 */
	function saveProject() {
		const projectName =
			document.getElementById("projectName").value.trim() ||
			"Hangarplan_" + new Date().toISOString().replace(/[:.]/g, "-");

		const projectData = {
			name: projectName,
			hangarData: hangarData,
			date: new Date().toISOString(),
		};

		// Im localStorage speichern
		localStorage.setItem(
			`hangarplanner_${projectName}`,
			JSON.stringify(projectData)
		);

		// Erfolgsmeldung
		alert(`Hangarplan "${projectName}" wurde gespeichert.`);

		// Liste der Projekte aktualisieren
		loadProjectsList();
	}

	/**
	 * Zeigt das Lade-Modal an
	 */
	function showLoadModal() {
		document.getElementById("loadModal").classList.remove("hidden");
		loadProjectsList();
	}

	/**
	 * Versteckt das Lade-Modal
	 */
	function hideLoadModal() {
		document.getElementById("loadModal").classList.add("hidden");
	}

	/**
	 * Lädt einen gespeicherten Hangarplan
	 */
	function loadProject() {
		const projectName = document.getElementById("loadProjectName").value.trim();
		const projectData = localStorage.getItem(`hangarplanner_${projectName}`);

		if (projectData) {
			const data = JSON.parse(projectData);

			// Hangar-Daten laden
			Object.assign(hangarData, data.hangarData);

			document.getElementById("projectName").value = data.name;

			// UI aktualisieren
			for (let i = 1; i <= 8; i++) {
				const cell = hangarData.cells[i - 1];

				// Flugzeug-ID
				document.getElementById(`aircraft-${i}`).value = cell.aircraftId || "";

				// Zeiten und Position
				document.getElementById(`arrival-time-${i}`).textContent =
					cell.arrivalTime || "--:--";
				document.getElementById(`departure-time-${i}`).textContent =
					cell.departureTime || "--:--";
				document.getElementById(`position-${i}`).textContent =
					cell.position || "--";

				// Status
				document.getElementById(`status-${i}`).value = cell.status || "ready";

				// Manuelle Eingabe
				const manualInput = document.querySelector(
					`.hangar-cell:nth-child(${i}) input[placeholder="Manuelle Eingabe"]`
				);
				if (manualInput) manualInput.value = cell.manualInput || "";

				// Statuslichter aktualisieren
				updateStatusLights(i);
			}

			hideLoadModal();
		} else {
			alert(`Hangarplan "${projectName}" wurde nicht gefunden.`);
		}
	}

	/**
	 * Lädt die Liste der gespeicherten Projekte
	 */
	function loadProjectsList() {
		const projectsList = document.getElementById("projectsList");
		projectsList.innerHTML = "";

		// Alle gespeicherten Projekte durchsuchen
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);

			if (key.startsWith("hangarplanner_")) {
				const projectName = key.replace("hangarplanner_", "");
				const projectData = JSON.parse(localStorage.getItem(key));
				const date = new Date(projectData.date);
				const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

				const li = document.createElement("li");
				li.className =
					"bg-industrial-dark p-2 rounded cursor-pointer hover:bg-opacity-80";
				li.innerHTML = `
                    <div class="font-medium">${projectName}</div>
                    <div class="text-xs text-industrial-light">${formattedDate}</div>
                `;

				li.addEventListener("click", () => {
					document.getElementById("loadProjectName").value = projectName;
					loadProject();
				});

				projectsList.appendChild(li);
			}
		}
	}
});

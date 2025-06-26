// DEBUG: Console-Test für Kachel-Zuordnung
// Kopieren Sie diesen Code in die Browser-Console der Slave-Datei

console.log("=== KACHEL-ZUORDNUNG DEBUG ===");

// 1. Prüfe verfügbare primäre Kacheln
console.log("PRIMÄRE KACHELN:");
for (let i = 1; i <= 12; i++) {
	const aircraftElement = document.getElementById(`aircraft-${i}`);
	const positionElement = document.getElementById(`hangar-position-${i}`);
	const arrivalElement = document.getElementById(`arrival-time-${i}`);
	const departureElement = document.getElementById(`departure-time-${i}`);

	console.log(`Kachel ${i}:`, {
		aircraft: aircraftElement ? aircraftElement.value : "NICHT GEFUNDEN",
		position: positionElement ? positionElement.value : "NICHT GEFUNDEN",
		arrival: arrivalElement ? arrivalElement.value : "NICHT GEFUNDEN",
		departure: departureElement ? departureElement.value : "NICHT GEFUNDEN",
	});
}

console.log("SEKUNDÄRE KACHELN:");
for (let i = 101; i <= 108; i++) {
	const aircraftElement = document.getElementById(`aircraft-${i}`);
	const positionElement = document.getElementById(`hangar-position-${i}`);
	const arrivalElement = document.getElementById(`arrival-time-${i}`);
	const departureElement = document.getElementById(`departure-time-${i}`);

	console.log(`Kachel ${i}:`, {
		aircraft: aircraftElement ? aircraftElement.value : "NICHT GEFUNDEN",
		position: positionElement ? positionElement.value : "NICHT GEFUNDEN",
		arrival: arrivalElement ? arrivalElement.value : "NICHT GEFUNDEN",
		departure: departureElement ? departureElement.value : "NICHT GEFUNDEN",
	});
}

// 2. Prüfe gespeicherte Daten
if (typeof window.hangarData !== "undefined") {
	console.log("GESPEICHERTE DATEN:");
	const data = window.hangarData.collectData();
	console.log("Primäre Kacheln:", data.primaryTiles);
	console.log("Sekundäre Kacheln:", data.secondaryTiles);
} else {
	console.log("hangarData nicht verfügbar!");
}

// 3. Prüfe localStorage
const storedData = localStorage.getItem("hangarData");
if (storedData) {
	try {
		const parsed = JSON.parse(storedData);
		console.log("LOCALSTORAGE DATEN:", parsed);
	} catch (e) {
		console.log("Fehler beim Parsen der localStorage Daten:", e);
	}
} else {
	console.log("Keine localStorage Daten gefunden");
}

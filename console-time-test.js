// Zeit-Synchronisations-Test Script für Browser Console

console.log("=== ZEIT-SYNCHRONISATIONS-TEST ===");

// 1. Prüfe verfügbare Funktionen
console.log("1. Prüfe verfügbare Funktionen...");
console.log("hangarData verfügbar:", !!window.hangarData);
console.log("eventManager verfügbar:", !!window.eventManager);

// 2. Setze Test-Zeiten im Master
console.log("2. Setze Test-Zeiten im Master...");
const arrivalField = document.getElementById("arrival-time-1");
const departureField = document.getElementById("departure-time-1");
const aircraftField = document.getElementById("aircraft-1");
const positionField = document.getElementById("hangar-position-1");

if (arrivalField) {
	arrivalField.value = "14:30";
	console.log("✅ Ankunftszeit auf 14:30 gesetzt");
} else {
	console.log("❌ Ankunftszeit-Feld nicht gefunden");
}

if (departureField) {
	departureField.value = "16:45";
	console.log("✅ Abflugzeit auf 16:45 gesetzt");
} else {
	console.log("❌ Abflugzeit-Feld nicht gefunden");
}

if (aircraftField) {
	aircraftField.value = "TEST123";
	console.log("✅ Aircraft ID auf TEST123 gesetzt");
}

if (positionField) {
	positionField.value = "A1";
	console.log("✅ Position auf A1 gesetzt");
}

// 3. Sammle und prüfe Master-Daten
console.log("3. Sammle Master-Daten...");
if (window.hangarData) {
	const masterData = window.hangarData.collectData();
	console.log("Master-Daten:", masterData);

	// Prüfe erste Kachel
	if (masterData.primaryHangar && masterData.primaryHangar.length > 0) {
		const tile1 = masterData.primaryHangar[0];
		console.log("Kachel 1 Daten:", tile1);
		console.log("Aircraft ID:", tile1.aircraftId);
		console.log("Position:", tile1.position);
		console.log("Arrival Time:", tile1.arrivalTime);
		console.log("Departure Time:", tile1.departureTime);
	}
}

// 4. Führe Synchronisation durch
console.log("4. Führe Synchronisation durch...");
if (window.hangarData) {
	// Speichern
	const saved = window.hangarData.saveCurrentState();
	console.log("Speichern erfolgreich:", saved);

	// Laden
	const loaded = window.hangarData.loadFromStorage();
	console.log("Laden erfolgreich:", loaded);
}

// 5. Prüfe Slave-Daten nach Synchronisation
setTimeout(() => {
	console.log("5. Prüfe Slave-Daten nach Synchronisation...");

	const slaveAircraft = document.getElementById("aircraft-101")?.value;
	const slavePosition = document.getElementById("hangar-position-101")?.value;
	const slaveArrival = document.getElementById("arrival-time-101")?.value;
	const slaveDeparture = document.getElementById("departure-time-101")?.value;

	console.log("=== ERGEBNIS ===");
	console.log("Slave Aircraft ID:", slaveAircraft, slaveAircraft ? "✅" : "❌");
	console.log("Slave Position:", slavePosition, slavePosition ? "✅" : "❌");
	console.log(
		"Slave Arrival Time:",
		slaveArrival,
		slaveArrival && slaveArrival !== "--:--" ? "✅" : "❌"
	);
	console.log(
		"Slave Departure Time:",
		slaveDeparture,
		slaveDeparture && slaveDeparture !== "--:--" ? "✅" : "❌"
	);

	const timesSynced =
		slaveArrival &&
		slaveArrival !== "--:--" &&
		slaveDeparture &&
		slaveDeparture !== "--:--";

	if (timesSynced) {
		console.log("🎉 ZEIT-SYNCHRONISATION ERFOLGREICH!");
	} else {
		console.log("❌ ZEIT-SYNCHRONISATION FEHLGESCHLAGEN!");

		// Zusätzliche Debug-Informationen
		console.log("Debug: Slave-Elemente:");
		console.log(
			"arrival-time-101 Element:",
			document.getElementById("arrival-time-101")
		);
		console.log(
			"departure-time-101 Element:",
			document.getElementById("departure-time-101")
		);
	}
}, 1000);

console.log("Test-Script ausgeführt. Ergebnis kommt in 1 Sekunde...");

// Direkter Test der collectTileData Funktion
// Führen Sie diesen Code in der Browser-Konsole aus

console.log("=== DIREKTER TEST DER COLLECTTILEDATA FUNKTION ===");

// Test mit primärer Kachel (ID 1-8)
console.log("\n--- Test primäre Kacheln (IDs 1-8) ---");
for (let i = 1; i <= 8; i++) {
	try {
		const tileData = collectTileData(i);
		const hasPositionInfo = tileData.hasOwnProperty("positionInfoGrid");
		console.log(
			`Kachel ID ${i}: positionInfoGrid = ${
				hasPositionInfo ? "VORHANDEN" : "FEHLT"
			}`
		);

		if (hasPositionInfo) {
			console.log(`  Wert: "${tileData.positionInfoGrid}"`);
		}
	} catch (error) {
		console.log(`Kachel ID ${i}: ERROR - ${error.message}`);
	}
}

// Test mit sekundären Kacheln (ID 101+)
console.log("\n--- Test sekundäre Kacheln (IDs 101-104) ---");
for (let i = 101; i <= 104; i++) {
	try {
		const tileData = collectTileData(i);
		const hasPositionInfo = tileData.hasOwnProperty("positionInfoGrid");
		console.log(
			`Kachel ID ${i}: positionInfoGrid = ${
				hasPositionInfo ? "FEHLERHAFT VORHANDEN" : "KORREKT NICHT VORHANDEN"
			}`
		);

		if (hasPositionInfo) {
			console.log(`  Fehlerhafter Wert: "${tileData.positionInfoGrid}"`);
		}
	} catch (error) {
		console.log(`Kachel ID ${i}: ERROR - ${error.message}`);
	}
}

console.log("\n=== TEST ABGESCHLOSSEN ===");
console.log("Erwartetes Ergebnis:");
console.log("- Primäre Kacheln (1-8): positionInfoGrid VORHANDEN");
console.log("- Sekundäre Kacheln (101+): positionInfoGrid NICHT VORHANDEN");

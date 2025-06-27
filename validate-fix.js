// Validierungs-Script für die Feld-Isolation-Behebung
// Dieses Script kann in der Browser-Konsole ausgeführt werden

function validateFieldIsolationFix() {
	console.log("=== VALIDIERUNG DER FELD-ISOLATION-BEHEBUNG ===");

	const results = {
		timeFieldTypes: [],
		idUniqueness: [],
		eventListeners: [],
		valueIsolation: [],
	};

	// 1. Überprüfe Zeit-Feld-Typen
	console.log("\n1. Überprüfe Zeit-Feld-Typen...");
	const timeFields = document.querySelectorAll('input[id*="time"]');
	timeFields.forEach((field) => {
		const isCorrectType = field.type === "time";
		results.timeFieldTypes.push({
			id: field.id,
			type: field.type,
			correct: isCorrectType,
		});

		if (isCorrectType) {
			console.log(`✅ ${field.id}: korrekt (type="time")`);
		} else {
			console.log(
				`❌ ${field.id}: falsch (type="${field.type}", erwartet "time")`
			);
		}
	});

	// 2. Überprüfe ID-Eindeutigkeit
	console.log("\n2. Überprüfe ID-Eindeutigkeit...");
	const allIds = [];
	const allElements = document.querySelectorAll("[id]");
	allElements.forEach((el) => {
		if (allIds.includes(el.id)) {
			console.log(`❌ Doppelte ID gefunden: ${el.id}`);
			results.idUniqueness.push({ id: el.id, unique: false });
		} else {
			allIds.push(el.id);
			results.idUniqueness.push({ id: el.id, unique: true });
		}
	});

	// 3. Teste sekundäre Kacheln-Erstellung
	console.log("\n3. Teste sekundäre Kacheln-Erstellung...");

	// Erstelle sekundäre Kacheln falls die Funktion verfügbar ist
	if (typeof updateSecondaryTiles === "function") {
		console.log("Erstelle 2 sekundäre Kacheln für Test...");
		updateSecondaryTiles(2, 2);

		// Kurz warten, dann testen
		setTimeout(() => {
			console.log("\n4. Teste Werte-Isolation...");

			// Setze Test-Werte in primäre Kacheln
			const testValues = {
				"hangar-position-1": "TEST-A1",
				"arrival-time-1": "10:30",
				"departure-time-1": "15:45",
				"aircraft-1": "D-TEST",
				"manual-input-1": "TEST-MANUAL",
			};

			// Werte setzen
			Object.entries(testValues).forEach(([id, value]) => {
				const element = document.getElementById(id);
				if (element) {
					element.value = value;
					console.log(`Primär gesetzt: ${id} = ${value}`);
				}
			});

			// Sekundäre Kacheln überprüfen
			const secondaryIds = [
				"hangar-position-101",
				"arrival-time-101",
				"departure-time-101",
				"aircraft-101",
				"manual-input-101",
			];

			let isolationSuccess = true;
			secondaryIds.forEach((id) => {
				const element = document.getElementById(id);
				if (element) {
					const hasValue = element.value && element.value.trim() !== "";
					if (hasValue) {
						console.log(
							`❌ ISOLATION FEHLGESCHLAGEN: ${id} hat Wert "${element.value}"`
						);
						isolationSuccess = false;
						results.valueIsolation.push({
							id,
							isolated: false,
							value: element.value,
						});
					} else {
						console.log(`✅ ${id}: korrekt isoliert (leer)`);
						results.valueIsolation.push({ id, isolated: true, value: "" });
					}
				} else {
					console.log(`⚠️ Sekundäres Element nicht gefunden: ${id}`);
				}
			});

			// Zusammenfassung
			console.log("\n=== ZUSAMMENFASSUNG ===");
			const timeFieldsOk = results.timeFieldTypes.every((f) => f.correct);
			const idsUnique = results.idUniqueness.every((f) => f.unique);
			const valuesIsolated = results.valueIsolation.every((f) => f.isolated);

			console.log(`Zeit-Felder korrekt: ${timeFieldsOk ? "✅" : "❌"}`);
			console.log(`IDs eindeutig: ${idsUnique ? "✅" : "❌"}`);
			console.log(`Werte isoliert: ${valuesIsolated ? "✅" : "❌"}`);

			if (timeFieldsOk && idsUnique && valuesIsolated) {
				console.log(
					"\n🎉 ALLE TESTS BESTANDEN! Die Feld-Isolation-Behebung funktioniert korrekt."
				);
			} else {
				console.log(
					"\n⚠️ EINIGE TESTS FEHLGESCHLAGEN! Überprüfen Sie die Details oben."
				);
			}

			return results;
		}, 1000);
	} else {
		console.log("❌ updateSecondaryTiles Funktion nicht verfügbar");
	}
}

// Automatisch ausführen, wenn das Script geladen wird
if (typeof document !== "undefined" && document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", validateFieldIsolationFix);
} else {
	validateFieldIsolationFix();
}

console.log(
	"Validierungs-Script geladen. Führen Sie validateFieldIsolationFix() aus, um den Test zu starten."
);

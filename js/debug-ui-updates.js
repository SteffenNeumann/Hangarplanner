/**
 * Debug-Helfer für UI-Aktualisierungen
 * Überwacht die Aktualisierung der Kacheln und meldet Probleme
 */

const UIDebugger = (() => {
	const config = {
		enabled: true,
		logLevel: "verbose", // "minimal", "normal", "verbose"
	};

	/**
	 * Überprüft, ob eine Kachel korrekt mit Flugdaten aktualisiert wurde
	 * @param {string} aircraftId - Die Flugzeug-ID
	 * @param {Object} expectedData - Die erwarteten Daten
	 */
	const checkTileUpdate = (aircraftId, expectedData) => {
		if (!config.enabled) return;

		setTimeout(() => {
			const kachel = document.querySelector(
				`.aircraft-tile[data-id='${aircraftId}']`
			);

			if (!kachel) {
				console.warn(`UIDebugger: Keine Kachel mit ID ${aircraftId} gefunden`);
				return;
			}

			const positionEl = kachel.querySelector(".position-value");
			const arrivalEl = kachel.querySelector(".arrival-time");
			const departureEl = kachel.querySelector(".departure-time");

			const actualPosition = positionEl
				? positionEl.textContent
				: "nicht gefunden";
			const actualArrival = arrivalEl
				? arrivalEl.textContent
				: "nicht gefunden";
			const actualDeparture = departureEl
				? departureEl.textContent
				: "nicht gefunden";

			if (
				config.logLevel === "verbose" ||
				actualPosition === "---→---" ||
				actualPosition !== expectedData.position
			) {
				console.group(`UIDebugger: Kachel ${aircraftId} Update-Prüfung`);
				console.log(
					`Position: ${actualPosition} (erwartet: ${expectedData.position})`
				);
				console.log(
					`Ankunft: ${actualArrival} (erwartet: ${expectedData.arrivalTime})`
				);
				console.log(
					`Abflug: ${actualDeparture} (erwartet: ${expectedData.departureTime})`
				);

				if (
					actualPosition === "---→---" ||
					actualPosition !== expectedData.position
				) {
					console.error(`UI wurde nicht korrekt aktualisiert!`);
					console.log("DOM-Element:", kachel);

					// Versuche die Daten manuell zu setzen
					if (positionEl) positionEl.textContent = expectedData.position;
					if (arrivalEl) arrivalEl.textContent = expectedData.arrivalTime;
					if (departureEl) departureEl.textContent = expectedData.departureTime;
					console.log("Korrekturversuch durchgeführt.");
				}

				console.groupEnd();
			} else if (config.logLevel === "normal") {
				console.log(
					`UIDebugger: Kachel ${aircraftId} - Position: ${actualPosition}, Ankunft: ${actualArrival}, Abflug: ${actualDeparture}`
				);
			}
		}, 500);
	};

	/**
	 * Beobachtet den DOM auf Änderungen an den Kacheln
	 */
	const setupMutationObserver = () => {
		if (!config.enabled) return;

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === "childList" || mutation.type === "attributes") {
					const kachel = mutation.target.closest(".aircraft-tile");
					if (kachel) {
						const aircraftId = kachel.dataset.id;
						if (aircraftId && config.logLevel === "verbose") {
							console.log(
								`UIDebugger: DOM-Änderung an Kachel ${aircraftId} erkannt`,
								mutation
							);
						}
					}
				}
			});
		});

		// Überwache alle Änderungen an Kacheln
		const container = document.querySelector("#tilesContainer");
		if (container) {
			observer.observe(container, {
				childList: true,
				subtree: true,
				attributes: true,
				characterData: true,
			});
			console.log("UIDebugger: DOM-Beobachtung für Kacheln aktiviert");
		}
	};

	// Initialisierung
	const init = () => {
		if (config.enabled) {
			console.log("UIDebugger: UI-Debugging-Hilfen aktiviert");
			setupMutationObserver();

			// Patche die API-Funktionen, um Debug-Informationen hinzuzufügen
			const originalUpdateAircraftData =
				window.AeroDataBoxAPI.updateAircraftData;

			window.AeroDataBoxAPI.updateAircraftData = async (...args) => {
				const result = await originalUpdateAircraftData(...args);
				if (result) {
					checkTileUpdate(args[0], result);
				}
				return result;
			};

			console.log("UIDebugger: API-Funktionen für Debugging erweitert");
		}
	};

	// Öffentliche API
	return {
		init,
		checkTileUpdate,
		config,
	};
})();

// Initialisieren
document.addEventListener("DOMContentLoaded", UIDebugger.init);

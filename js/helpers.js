/**
 * helpers.js
 * Enthält allgemeine Hilfsfunktionen für die HangarPlanner-Anwendung
 */

/**
 * Zeigt Benachrichtigungen für den Benutzer an
 * @param {string} message - Die anzuzeigende Nachricht
 * @param {string} type - Der Typ der Nachricht (info, success, error, warning)
 * @param {number} duration - Wie lange die Nachricht angezeigt wird (in ms)
 */
function showNotification(message, type = "info", duration = 3000) {
	// Prüfe, ob bereits eine Benachrichtigung angezeigt wird
	let notification = document.getElementById("notification");
	if (!notification) {
		notification = document.createElement("div");
		notification.id = "notification";
		notification.style.position = "fixed";
		notification.style.bottom = "20px";
		notification.style.right = "20px";
		notification.style.padding = "10px 20px";
		notification.style.borderRadius = "4px";
		notification.style.minWidth = "200px";
		notification.style.maxWidth = "400px";
		notification.style.boxShadow = "0 3px 6px rgba(0,0,0,0.16)";
		notification.style.zIndex = "9999";
		notification.style.transition = "opacity 0.3s";
		document.body.appendChild(notification);
	}

	// Stil basierend auf Typ setzen
	switch (type) {
		case "success":
			notification.style.backgroundColor = "#4CAF50";
			notification.style.color = "#fff";
			break;
		case "error":
			notification.style.backgroundColor = "#F44336";
			notification.style.color = "#fff";
			break;
		case "warning":
			notification.style.backgroundColor = "#FFC107";
			notification.style.color = "#000";
			break;
		default:
			notification.style.backgroundColor = "#2196F3";
			notification.style.color = "#fff";
	}

	notification.textContent = message;
	notification.style.opacity = "1";

	// Nach der angegebenen Zeit ausblenden
	setTimeout(() => {
		notification.style.opacity = "0";
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	}, duration);
}

/**
 * Erstellt einen Zeitstempel für die Benennung von Dateien
 * @returns {string} Formatierter Zeitstempel
 */
function generateTimestamp() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");

	return `HangarPlan_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Hilfsfunktion zum Herunterladen einer Datei
 * @param {string|object} content - Dateiinhalt (wird zu JSON konvertiert, wenn es ein Objekt ist)
 * @param {string} filename - Name der Datei
 */
function downloadFile(content, filename) {
	const contentStr =
		typeof content === "object" ? JSON.stringify(content, null, 2) : content;
	const blob = new Blob([contentStr], { type: "application/json" });
	const downloadLink = document.createElement("a");
	downloadLink.href = URL.createObjectURL(blob);
	downloadLink.download = filename;
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

/**
 * Überprüft die Browser-Unterstützung für verschiedene APIs
 * @returns {Object} Ein Objekt mit Informationen über unterstützte Features
 */
function checkBrowserSupport() {
	const support = {
		fileSystem: "showSaveFilePicker" in window,
		indexedDB: "indexedDB" in window,
		localStorage: "localStorage" in window,
		permissions: "permissions" in navigator,
	};

	console.log("Browser API Support:", support);

	// Als Meldung anzeigen, wenn Debug aktiviert ist
	if (localStorage.getItem("debugMode") === "true") {
		let message = "Browser-Unterstützung:\n";
		for (const [key, value] of Object.entries(support)) {
			message += `- ${key}: ${value ? "✓" : "✗"}\n`;
		}
		showNotification(message, "info", 5000);

		// Explizit auf localStorage-Unterstützung prüfen und Fehler ausgeben
		if (!support.localStorage) {
			console.error(
				"WARNUNG: LocalStorage wird nicht unterstützt! Einstellungen können nicht gespeichert werden."
			);
			showNotification(
				"LocalStorage wird nicht unterstützt! Einstellungen können nicht gespeichert werden.",
				"error",
				10000
			);
		} else {
			// Test-Speichervorgang durchführen
			try {
				localStorage.setItem("test", "test");
				localStorage.removeItem("test");
				console.log("LocalStorage Test erfolgreich");
			} catch (e) {
				console.error("LocalStorage Test fehlgeschlagen:", e);
				showNotification(
					"LocalStorage Test fehlgeschlagen: " + e.message,
					"error",
					10000
				);
			}
		}
	}

	return support;
}

// Funktion für den globalen Zugriff verfügbar machen
window.showNotification = showNotification;

/**
 * Verzögert die Ausführung einer Funktion
 * @param {Function} func - Die zu verzögernde Funktion
 * @param {number} wait - Verzögerung in Millisekunden
 * @returns {Function} - Verzögerte Funktion
 */
function debounce(func, wait) {
	let timeout;
	return function () {
		const context = this;
		const args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), wait);
	};
}

/**
 * Erstellt eine Auto-Save-Funktion mit Debouncing und Änderungsverfolgung
 * @param {Function} saveFunction - Die eigentliche Speicherfunktion
 * @param {Object} options - Konfigurationsoptionen
 * @param {number} options.debounceTime - Verzögerungszeit in ms (Standard: 1000)
 * @param {number} options.maxRetries - Maximale Anzahl von Wiederholungsversuchen (Standard: 3)
 * @param {Function} options.onChange - Optional: Callback-Funktion, die bei Änderungen aufgerufen wird
 * @param {Function} options.compareFunction - Optional: Funktion zum Vergleich von altem und neuem Zustand
 * @param {boolean} options.preserveExisting - Bestehende Daten erhalten und nur neue Felder hinzufügen (Standard: true)
 * @param {boolean} options.forceSyncSave - Erzwingt eine sofortige synchrone Speicherung, ohne Debouncing (Standard: false)
 * @returns {Function} - Eine optimierte Autosave-Funktion
 */
function createAutoSave(saveFunction, options = {}) {
	const {
		debounceTime = 1000,
		maxRetries = 3,
		onChange = null,
		compareFunction = null,
		preserveExisting = true,
		forceSyncSave = false,
	} = options;

	let lastSavedData = null;
	let saveRetryCount = 0;
	let savePending = false;
	let saveQueue = [];

	// Funktion, um die nächste ausstehende Speicherung zu verarbeiten
	const processQueue = () => {
		if (saveQueue.length > 0 && !savePending) {
			const nextData = saveQueue.shift();
			executeSave(nextData);
		}
	};

	/**
	 * Prüft, ob ein Teil der Daten Positionswerte enthält, die spezielle Behandlung benötigen
	 * @param {Object} data - Die zu prüfenden Daten
	 * @returns {boolean} - True, wenn Positionsdaten enthalten sind
	 */
	const hasPositionData = (data) => {
		if (!data || typeof data !== "object") return false;

		// Prüfe auf typische Strukturen von Positionsdaten
		if (data.tileValues && Array.isArray(data.tileValues)) {
			return true;
		}

		// Prüfe auf sekundäre Kacheln mit Positionsangaben
		if (
			Array.isArray(data) &&
			data.some(
				(item) => item && item.position && item.id >= 101 && item.id <= 104
			)
		) {
			return true;
		}

		// Prüfe auf einzelne Positionsfelder
		if (data.position && data.id && data.id >= 101 && data.id <= 104) {
			return true;
		}

		return false;
	};

	/**
	 * Versucht, Positionswerte für sekundäre Kacheln zu setzen
	 * @param {Object} data - Die zu speichernden Daten
	 * @returns {Promise<boolean>} - True, wenn die Werte gesetzt wurden
	 */
	const trySetPositionValues = async (data) => {
		// Extrahiere Positionsdaten, falls vorhanden
		const positions = extractPositions(data);
		if (Object.keys(positions).length === 0) return true;

		// Warten bis DOM bereit ist
		await new Promise((resolve) => {
			// Versuche, die Positionsfelder zu finden und Werte zu setzen
			const maxAttempts = 5;
			let attempts = 0;

			const trySetValues = () => {
				attempts++;
				let allSet = true;

				// Versuche jeden Positionswert zu setzen
				for (const [id, value] of Object.entries(positions)) {
					const fieldId = `hangar-position-${id}`;
					const field = document.getElementById(fieldId);

					if (field) {
						field.value = value;
						if (localStorage.getItem("debugMode") === "true") {
							console.log(
								`Position für Kachel ${id} erfolgreich gesetzt: ${value}`
							);
						}
					} else {
						if (attempts === maxAttempts) {
							console.warn(
								`Position für Kachel ${id} konnte nicht gesetzt werden - Feld nicht gefunden`
							);
						}
						allSet = false;
					}
				}

				if (allSet || attempts >= maxAttempts) {
					resolve(allSet);
				} else {
					setTimeout(trySetValues, 300 * attempts);
				}
			};

			trySetValues();
		});

		return true;
	};

	/**
	 * Extrahiert Positionsdaten aus verschiedenen Datenformaten
	 * @param {Object} data - Die zu analysierenden Daten
	 * @returns {Object} - Gefundene Positionsdaten als {id: wert}
	 */
	const extractPositions = (data) => {
		const positions = {};

		if (!data || typeof data !== "object") return positions;

		// Extrahiere aus tileValues Array
		if (data.tileValues && Array.isArray(data.tileValues)) {
			for (const tile of data.tileValues) {
				if (
					tile &&
					tile.id &&
					tile.position &&
					tile.id >= 101 &&
					tile.id <= 104
				) {
					positions[tile.id] = tile.position;
				}
			}
		}

		// Extrahiere aus einem Array von Tiles
		if (Array.isArray(data)) {
			for (const tile of data) {
				if (
					tile &&
					tile.id &&
					tile.position &&
					tile.id >= 101 &&
					tile.id <= 104
				) {
					positions[tile.id] = tile.position;
				}
			}
		}

		// Extrahiere aus einem einzelnen Tile
		if (data.id && data.position && data.id >= 101 && data.id <= 104) {
			positions[data.id] = data.position;
		}

		return positions;
	};

	// Hauptspeicherfunktion
	const executeSave = async (data) => {
		// Wenn keine Änderungen vorliegen, nicht speichern
		if (compareFunction && lastSavedData !== null) {
			if (!compareFunction(lastSavedData, data)) {
				console.log(
					"Keine relevanten Änderungen festgestellt, Speichervorgang übersprungen"
				);
				savePending = false;
				processQueue(); // Verarbeite die nächste Speicherung, falls vorhanden
				return;
			}
		}

		savePending = true;

		// Prüfe, ob Positionsdaten enthalten sind
		const containsPositionData = hasPositionData(data);

		try {
			// Bei Positionsdaten: Versuche zuerst, die Werte in die Felder zu schreiben
			if (containsPositionData) {
				await trySetPositionValues(data);
			}

			// Führe dann die eigentliche Speicherfunktion aus
			await saveFunction(data);
			lastSavedData = JSON.parse(JSON.stringify(data)); // Deep copy
			saveRetryCount = 0;
			savePending = false;

			if (localStorage.getItem("debugMode") === "true") {
				console.log(
					"Autosave erfolgreich durchgeführt",
					new Date().toISOString()
				);
			}

			// Verarbeite die nächste Speicherung, falls vorhanden
			processQueue();
		} catch (error) {
			console.error("Fehler beim automatischen Speichern:", error);

			// Wiederholungsversuch, wenn maximale Anzahl nicht erreicht
			if (saveRetryCount < maxRetries) {
				saveRetryCount++;
				console.log(
					`Wiederholungsversuch ${saveRetryCount}/${maxRetries} in ${
						saveRetryCount * 1000
					}ms`
				);
				setTimeout(() => executeSave(data), saveRetryCount * 1000);
			} else {
				saveRetryCount = 0;
				savePending = false;
				showNotification(
					"Automatisches Speichern fehlgeschlagen. Bitte manuell speichern.",
					"error",
					5000
				);
				// Verarbeite trotzdem die nächste Speicherung
				processQueue();
			}
		}
	};

	// Debounce-Wrapper für die Speicherfunktion
	const debouncedSave = debounce((data) => {
		if (savePending) {
			// Wenn bereits eine Speicherung läuft, füge die Daten zur Warteschlange hinzu
			saveQueue.push(data);
		} else {
			executeSave(data);
		}
	}, debounceTime);

	// Die zurückgegebene Funktion
	return function (data, key = null, forceSync = false) {
		// Optional: Callback bei Änderungen aufrufen
		if (onChange) {
			onChange(data, key);
		}

		let dataToSave;

		// Bestehende Daten erhalten, wenn Option gesetzt
		if (
			preserveExisting &&
			typeof data === "object" &&
			data !== null &&
			lastSavedData !== null
		) {
			// Tiefe Kopie von bestehenden Daten erstellen
			dataToSave = JSON.parse(JSON.stringify(lastSavedData));

			// Neuen Daten hinzufügen oder aktualisieren
			Object.keys(data).forEach((key) => {
				dataToSave[key] = data[key];
			});
		} else {
			// Neues Datenobjekt erstellen
			dataToSave =
				typeof data === "object" && data !== null ? { ...data } : data;
		}

		// Zeitstempel für letzte Änderung hinzufügen
		if (typeof dataToSave === "object" && dataToSave !== null) {
			dataToSave.lastSaved = new Date().toISOString();
		}

		// Entscheide, ob synchron oder mit Verzögerung gespeichert werden soll
		if (forceSync || forceSyncSave) {
			executeSave(dataToSave);
		} else {
			debouncedSave(dataToSave);
		}
	};
}

/**
 * Storage Helper für localStorage Operationen
 * Bietet eine einheitliche Schnittstelle für Speicherzugriffe
 */
const storageHelper = {
	/**
	 * Speichert Daten im localStorage
	 * @param {string} key - Schlüssel für die Daten
	 * @param {any} data - Die zu speichernden Daten (werden zu JSON konvertiert)
	 * @returns {boolean} - Gibt an, ob die Speicherung erfolgreich war
	 */
	set: function (key, data) {
		try {
			const jsonData = typeof data === "string" ? data : JSON.stringify(data);
			localStorage.setItem(key, jsonData);
			return true;
		} catch (error) {
			console.error(
				`Fehler beim Speichern von Daten mit Schlüssel "${key}":`,
				error
			);
			return false;
		}
	},

	/**
	 * Lädt Daten aus dem localStorage
	 * @param {string} key - Schlüssel für die Daten
	 * @param {boolean} parseJson - Ob die Daten als JSON geparst werden sollen
	 * @returns {any} - Die geladenen Daten oder null, wenn keine Daten vorhanden
	 */
	get: function (key, parseJson = true) {
		try {
			const data = localStorage.getItem(key);
			if (data === null) return null;
			return parseJson ? JSON.parse(data) : data;
		} catch (error) {
			console.error(
				`Fehler beim Laden von Daten mit Schlüssel "${key}":`,
				error
			);
			return null;
		}
	},

	/**
	 * Löscht Daten aus dem localStorage
	 * @param {string} key - Schlüssel für die zu löschenden Daten
	 * @returns {boolean} - Gibt an, ob das Löschen erfolgreich war
	 */
	remove: function (key) {
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			console.error(
				`Fehler beim Löschen von Daten mit Schlüssel "${key}":`,
				error
			);
			return false;
		}
	},
};

// Storage Helper zum globalen Hilfsobjekt hinzufügen
window.helpers = window.helpers || {};
window.helpers.storageHelper = storageHelper;

// Für den globalen Zugriff verfügbar machen
window.showNotification = showNotification;

/**
 * Verzögert die Ausführung einer Funktion
 * @param {Function} func - Die zu verzögernde Funktion
 * @param {number} wait - Verzögerung in Millisekunden
 * @returns {Function} - Verzögerte Funktion
 */
function debounce(func, wait) {
	let timeout;
	return function () {
		const context = this;
		const args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), wait);
	};
}

/**
 * Erstellt eine Auto-Save-Funktion mit Debouncing und Änderungsverfolgung
 * @param {Function} saveFunction - Die eigentliche Speicherfunktion
 * @param {Object} options - Konfigurationsoptionen
 * @param {number} options.debounceTime - Verzögerungszeit in ms (Standard: 1000)
 * @param {number} options.maxRetries - Maximale Anzahl von Wiederholungsversuchen (Standard: 3)
 * @param {Function} options.onChange - Optional: Callback-Funktion, die bei Änderungen aufgerufen wird
 * @param {Function} options.compareFunction - Optional: Funktion zum Vergleich von altem und neuem Zustand
 * @param {boolean} options.preserveExisting - Bestehende Daten erhalten und nur neue Felder hinzufügen (Standard: true)
 * @param {boolean} options.forceSyncSave - Erzwingt eine sofortige synchrone Speicherung, ohne Debouncing (Standard: false)
 * @returns {Function} - Eine optimierte Autosave-Funktion
 */
function createAutoSave(saveFunction, options = {}) {
	const {
		debounceTime = 1000,
		maxRetries = 3,
		onChange = null,
		compareFunction = null,
		preserveExisting = true,
		forceSyncSave = false,
	} = options;

	let lastSavedData = null;
	let saveRetryCount = 0;
	let savePending = false;
	let saveQueue = [];

	// Funktion, um die nächste ausstehende Speicherung zu verarbeiten
	const processQueue = () => {
		if (saveQueue.length > 0 && !savePending) {
			const nextData = saveQueue.shift();
			executeSave(nextData);
		}
	};

	/**
	 * Prüft, ob ein Teil der Daten Positionswerte enthält, die spezielle Behandlung benötigen
	 * @param {Object} data - Die zu prüfenden Daten
	 * @returns {boolean} - True, wenn Positionsdaten enthalten sind
	 */
	const hasPositionData = (data) => {
		if (!data || typeof data !== "object") return false;

		// Prüfe auf typische Strukturen von Positionsdaten
		if (data.tileValues && Array.isArray(data.tileValues)) {
			return true;
		}

		// Prüfe auf sekundäre Kacheln mit Positionsangaben
		if (
			Array.isArray(data) &&
			data.some(
				(item) => item && item.position && item.id >= 101 && item.id <= 104
			)
		) {
			return true;
		}

		// Prüfe auf einzelne Positionsfelder
		if (data.position && data.id && data.id >= 101 && data.id <= 104) {
			return true;
		}

		return false;
	};

	/**
	 * Versucht, Positionswerte für sekundäre Kacheln zu setzen
	 * @param {Object} data - Die zu speichernden Daten
	 * @returns {Promise<boolean>} - True, wenn die Werte gesetzt wurden
	 */
	const trySetPositionValues = async (data) => {
		// Extrahiere Positionsdaten, falls vorhanden
		const positions = extractPositions(data);
		if (Object.keys(positions).length === 0) return true;

		// Warten bis DOM bereit ist
		await new Promise((resolve) => {
			// Versuche, die Positionsfelder zu finden und Werte zu setzen
			const maxAttempts = 5;
			let attempts = 0;

			const trySetValues = () => {
				attempts++;
				let allSet = true;

				// Versuche jeden Positionswert zu setzen
				for (const [id, value] of Object.entries(positions)) {
					const fieldId = `hangar-position-${id}`;
					const field = document.getElementById(fieldId);

					if (field) {
						field.value = value;
						if (localStorage.getItem("debugMode") === "true") {
							console.log(
								`Position für Kachel ${id} erfolgreich gesetzt: ${value}`
							);
						}
					} else {
						if (attempts === maxAttempts) {
							console.warn(
								`Position für Kachel ${id} konnte nicht gesetzt werden - Feld nicht gefunden`
							);
						}
						allSet = false;
					}
				}

				if (allSet || attempts >= maxAttempts) {
					resolve(allSet);
				} else {
					setTimeout(trySetValues, 300 * attempts);
				}
			};

			trySetValues();
		});

		return true;
	};

	/**
	 * Extrahiert Positionsdaten aus verschiedenen Datenformaten
	 * @param {Object} data - Die zu analysierenden Daten
	 * @returns {Object} - Gefundene Positionsdaten als {id: wert}
	 */
	const extractPositions = (data) => {
		const positions = {};

		if (!data || typeof data !== "object") return positions;

		// Extrahiere aus tileValues Array
		if (data.tileValues && Array.isArray(data.tileValues)) {
			for (const tile of data.tileValues) {
				if (
					tile &&
					tile.id &&
					tile.position &&
					tile.id >= 101 &&
					tile.id <= 104
				) {
					positions[tile.id] = tile.position;
				}
			}
		}

		// Extrahiere aus einem Array von Tiles
		if (Array.isArray(data)) {
			for (const tile of data) {
				if (
					tile &&
					tile.id &&
					tile.position &&
					tile.id >= 101 &&
					tile.id <= 104
				) {
					positions[tile.id] = tile.position;
				}
			}
		}

		// Extrahiere aus einem einzelnen Tile
		if (data.id && data.position && data.id >= 101 && data.id <= 104) {
			positions[data.id] = data.position;
		}

		return positions;
	};

	// Hauptspeicherfunktion
	const executeSave = async (data) => {
		// Wenn keine Änderungen vorliegen, nicht speichern
		if (compareFunction && lastSavedData !== null) {
			if (!compareFunction(lastSavedData, data)) {
				console.log(
					"Keine relevanten Änderungen festgestellt, Speichervorgang übersprungen"
				);
				savePending = false;
				processQueue(); // Verarbeite die nächste Speicherung, falls vorhanden
				return;
			}
		}

		savePending = true;

		// Prüfe, ob Positionsdaten enthalten sind
		const containsPositionData = hasPositionData(data);

		try {
			// Bei Positionsdaten: Versuche zuerst, die Werte in die Felder zu schreiben
			if (containsPositionData) {
				await trySetPositionValues(data);
			}

			// Führe dann die eigentliche Speicherfunktion aus
			await saveFunction(data);
			lastSavedData = JSON.parse(JSON.stringify(data)); // Deep copy
			saveRetryCount = 0;
			savePending = false;

			if (localStorage.getItem("debugMode") === "true") {
				console.log(
					"Autosave erfolgreich durchgeführt",
					new Date().toISOString()
				);
			}

			// Verarbeite die nächste Speicherung, falls vorhanden
			processQueue();
		} catch (error) {
			console.error("Fehler beim automatischen Speichern:", error);

			// Wiederholungsversuch, wenn maximale Anzahl nicht erreicht
			if (saveRetryCount < maxRetries) {
				saveRetryCount++;
				console.log(
					`Wiederholungsversuch ${saveRetryCount}/${maxRetries} in ${
						saveRetryCount * 1000
					}ms`
				);
				setTimeout(() => executeSave(data), saveRetryCount * 1000);
			} else {
				saveRetryCount = 0;
				savePending = false;
				showNotification(
					"Automatisches Speichern fehlgeschlagen. Bitte manuell speichern.",
					"error",
					5000
				);
				// Verarbeite trotzdem die nächste Speicherung
				processQueue();
			}
		}
	};

	// Debounce-Wrapper für die Speicherfunktion
	const debouncedSave = debounce((data) => {
		if (savePending) {
			// Wenn bereits eine Speicherung läuft, füge die Daten zur Warteschlange hinzu
			saveQueue.push(data);
		} else {
			executeSave(data);
		}
	}, debounceTime);

	// Die zurückgegebene Funktion
	return function (data, key = null, forceSync = false) {
		// Optional: Callback bei Änderungen aufrufen
		if (onChange) {
			onChange(data, key);
		}

		let dataToSave;

		// Bestehende Daten erhalten, wenn Option gesetzt
		if (
			preserveExisting &&
			typeof data === "object" &&
			data !== null &&
			lastSavedData !== null
		) {
			// Tiefe Kopie von bestehenden Daten erstellen
			dataToSave = JSON.parse(JSON.stringify(lastSavedData));

			// Neuen Daten hinzufügen oder aktualisieren
			Object.keys(data).forEach((key) => {
				dataToSave[key] = data[key];
			});
		} else {
			// Neues Datenobjekt erstellen
			dataToSave =
				typeof data === "object" && data !== null ? { ...data } : data;
		}

		// Zeitstempel für letzte Änderung hinzufügen
		if (typeof dataToSave === "object" && dataToSave !== null) {
			dataToSave.lastSaved = new Date().toISOString();
		}

		// Entscheide, ob synchron oder mit Verzögerung gespeichert werden soll
		if (forceSync || forceSyncSave) {
			executeSave(dataToSave);
		} else {
			debouncedSave(dataToSave);
		}
	};
}

/**
 * Stellt eine optimierte Version der localStorage API bereit
 * @type {Object}
 */
const storageHelperExtended = {
	/**
	 * Speichert Daten im localStorage mit Fehlerbehandlung
	 * @param {string} key - Der Schlüssel unter dem gespeichert wird
	 * @param {any} value - Der zu speichernde Wert (wird zu JSON serialisiert)
	 * @param {boolean} merge - Ob bestehende Daten zusammengeführt werden sollen
	 * @returns {boolean} - Erfolg der Operation
	 */
	set(key, value, merge = false) {
		try {
			// Wenn merge aktiviert ist, bestehende Daten laden und zusammenführen
			if (merge) {
				const existingData = this.get(key, {});

				// Bei Arrays, verwende Concat
				if (Array.isArray(value) && Array.isArray(existingData)) {
					value = [...existingData, ...value];
				}
				// Bei Objekten, führe Eigenschaften zusammen
				else if (
					typeof value === "object" &&
					value !== null &&
					typeof existingData === "object" &&
					existingData !== null
				) {
					value = { ...existingData, ...value };
				}
			}

			// Debug-Nachricht ausgeben
			if (localStorage.getItem("debugMode") === "true") {
				console.log(`Speichere in localStorage[${key}]:`, value);
			}

			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (e) {
			console.error("Fehler beim Speichern im localStorage:", e, {
				key,
				value,
			});
			if (e.name === "QuotaExceededError") {
				showNotification(
					"Speicherplatz erschöpft. Bitte einige Daten exportieren und löschen.",
					"error",
					5000
				);
			}
			return false;
		}
	},

	/**
	 * Liest Daten aus dem localStorage mit Fehlerbehandlung
	 * @param {string} key - Der zu lesende Schlüssel
	 * @param {any} defaultValue - Standardwert, falls der Schlüssel nicht existiert
	 * @returns {any} - Der gelesene Wert oder der Standardwert
	 */
	get(key, defaultValue = null) {
		try {
			const item = localStorage.getItem(key);
			const value = item ? JSON.parse(item) : defaultValue;

			// Debug-Nachricht ausgeben
			if (localStorage.getItem("debugMode") === "true") {
				console.log(`Gelesen aus localStorage[${key}]:`, value);
			}

			return value;
		} catch (e) {
			console.error("Fehler beim Lesen aus localStorage:", e, { key });
			return defaultValue;
		}
	},

	/**
	 * Speichert Daten für sekundäre Kacheln
	 * @param {Array} tiles - Array mit Kacheldaten
	 * @param {string} key - Der Schlüssel unter dem gespeichert wird (Standard: 'uiSettings')
	 * @returns {boolean} - Erfolg der Operation
	 */
	saveSecondaryTiles(tiles, key = "uiSettings") {
		try {
			if (!Array.isArray(tiles)) {
				console.error("Fehler: tiles muss ein Array sein");
				return false;
			}

			// Aktuellen UI-Status holen, falls vorhanden
			const uiSettings = this.get(key, {
				tilesCount: 8,
				secondaryTilesCount: 0,
				layout: 4,
				tileValues: [],
			});

			// Sekundäre Kacheln aktualisieren
			uiSettings.secondaryTilesCount = tiles.length;

			// Stelle sicher, dass tileValues existiert und die richtige Größe hat
			if (!uiSettings.tileValues) {
				uiSettings.tileValues = [];
			}

			// Erstelle eine vollständige Kopie des aktuellen tileValues-Arrays
			const allTilesData = Array.isArray(uiSettings.tileValues)
				? [...uiSettings.tileValues]
				: [];

			// Füge sekundäre Kacheldaten hinzu oder aktualisiere sie
			tiles.forEach((tile, index) => {
				if (!tile) return;

				const tileIndex = uiSettings.tilesCount + index;
				const tileId = 100 + index + 1; // IDs für sekundäre Kacheln beginnen bei 101

				// Stelle sicher, dass der Index im Array existiert
				while (allTilesData.length <= tileIndex) {
					allTilesData.push(null);
				}

				// Bewahre vorhandene Daten, falls vorhanden
				const existingTile = allTilesData[tileIndex] || {};

				// Stelle sicher, dass die Datenstruktur konsistent ist
				allTilesData[tileIndex] = {
					...existingTile,
					...tile,
					id: tileId,
					position: tile.position || existingTile.position || "",
					data: tile.data || existingTile.data || {},
				};
			});

			// Aktualisiere das vollständige tileValues-Array
			uiSettings.tileValues = allTilesData;

			// Debug-Nachricht
			console.log("Speichere sekundäre Kacheln:", tiles.length, "Kacheln");
			if (localStorage.getItem("debugMode") === "true") {
				console.log("Details der sekundären Kacheln:", tiles);
				console.log("Aktualisierte UI-Einstellungen:", uiSettings);
			}

			// In localStorage speichern
			const success = this.set(key, uiSettings);

			if (success) {
				console.log(
					`${tiles.length} sekundäre Kacheln erfolgreich gespeichert`
				);
			} else {
				console.error(
					"Fehler beim Speichern der sekundären Kacheln im localStorage"
				);
			}

			return success;
		} catch (e) {
			console.error("Fehler beim Speichern der sekundären Kacheln:", e);
			return false;
		}
	},

	/**
	 * Lädt Daten für sekundäre Kacheln
	 * @param {string} key - Der Schlüssel aus dem geladen wird (Standard: 'uiSettings')
	 * @returns {Array|null} - Array mit Kacheldaten oder leeres Array bei Fehler
	 */
	loadSecondaryTiles(key = "uiSettings") {
		try {
			const uiSettings = this.get(key);

			if (
				!uiSettings ||
				!uiSettings.tileValues ||
				!Array.isArray(uiSettings.tileValues)
			) {
				console.log("Keine sekundären Kacheln zum Laden gefunden");
				return [];
			}

			const primaryCount = uiSettings.tilesCount || 8;
			const secondaryCount = uiSettings.secondaryTilesCount || 0;

			// Sekundäre Kacheln aus tileValues extrahieren
			const secondaryTiles = uiSettings.tileValues
				.slice(primaryCount, primaryCount + secondaryCount)
				.filter((tile) => tile !== null && tile !== undefined);

			console.log(`${secondaryTiles.length} sekundäre Kacheln geladen`);

			if (localStorage.getItem("debugMode") === "true") {
				console.log("Geladene sekundäre Kacheln:", secondaryTiles);
			}

			return secondaryTiles;
		} catch (e) {
			console.error("Fehler beim Laden der sekundären Kacheln:", e);
			return [];
		}
	},

	/**
	 * Prüft und repariert die Datenstruktur für UI-Einstellungen
	 * @param {string} key - Der Schlüssel der zu prüfenden Daten (Standard: 'uiSettings')
	 * @returns {boolean} - Erfolg der Operation
	 */
	validateUISettings(key = "uiSettings") {
		try {
			const uiSettings = this.get(key);

			if (!uiSettings) {
				console.log("Keine UI-Einstellungen gefunden, nichts zu validieren");
				return true;
			}

			let isModified = false;

			// Standard-Werte sicherstellen
			if (typeof uiSettings.tilesCount !== "number") {
				uiSettings.tilesCount = 8;
				isModified = true;
			}

			if (typeof uiSettings.secondaryTilesCount !== "number") {
				uiSettings.secondaryTilesCount = 0;
				isModified = true;
			}

			if (typeof uiSettings.layout !== "number") {
				uiSettings.layout = 4;
				isModified = true;
			}

			// tileValues-Array prüfen und reparieren
			if (!Array.isArray(uiSettings.tileValues)) {
				uiSettings.tileValues = [];
				isModified = true;
			}

			// Stelle sicher, dass das Array groß genug ist
			const requiredLength =
				uiSettings.tilesCount + uiSettings.secondaryTilesCount;
			if (uiSettings.tileValues.length < requiredLength) {
				while (uiSettings.tileValues.length < requiredLength) {
					uiSettings.tileValues.push(null);
				}
				isModified = true;
			}

			// Sicherstellen, dass alle sekundären Kacheln eine gültige ID haben
			for (let i = uiSettings.tilesCount; i < requiredLength; i++) {
				if (uiSettings.tileValues[i]) {
					const secondaryIndex = i - uiSettings.tilesCount;
					const expectedId = 100 + secondaryIndex + 1;

					if (uiSettings.tileValues[i].id !== expectedId) {
						uiSettings.tileValues[i].id = expectedId;
						isModified = true;
					}
				}
			}

			// Speichern, wenn Änderungen vorgenommen wurden
			if (isModified) {
				console.log("UI-Einstellungen wurden repariert und werden gespeichert");
				return this.set(key, uiSettings);
			}

			return true;
		} catch (e) {
			console.error("Fehler bei der Validierung der UI-Einstellungen:", e);
			return false;
		}
	},

	/**
	 * Warten auf die Verfügbarkeit eines DOM-Elements mit wiederholten Versuchen
	 * @param {string} selector - CSS-Selektor, nach dem gesucht wird
	 * @param {number} maxAttempts - Maximale Anzahl von Versuchen (Standard: 10)
	 * @param {number} interval - Zeitabstand zwischen den Versuchen in ms (Standard: 200)
	 * @returns {Promise<Element|null>} - Promise mit dem gefundenen Element oder null
	 */
	waitForElement(selector, maxAttempts = 10, interval = 200) {
		return new Promise((resolve) => {
			let attempts = 0;

			const checkElement = () => {
				attempts++;
				const element = document.querySelector(selector);

				if (element) {
					return resolve(element);
				}

				if (attempts >= maxAttempts) {
					console.warn(
						`Element mit Selektor "${selector}" wurde nach ${maxAttempts} Versuchen nicht gefunden`
					);
					return resolve(null);
				}

				setTimeout(checkElement, interval);
			};

			checkElement();
		});
	},

	/**
	 * Initialisiert ein Ereignis, wenn alle Felder einer bestimmten Klasse verfügbar sind
	 * @param {string} className - Klassenname der zu überwachenden Felder
	 * @param {Function} callback - Funktion, die aufgerufen wird, wenn alle Felder bereit sind
	 * @param {number} timeout - Maximale Wartezeit in ms (Standard: 5000)
	 * @param {Object} options - Zusätzliche Optionen
	 */
	whenFieldsReady(className, callback, timeout = 5000, options = {}) {
		const {
			checkInterval = 500,
			alternativeSelectors = [],
			onTimeout = null,
			minElements = 1,
		} = options;

		// Suche nach Elementen über verschiedene Selektoren
		const findElements = () => {
			let elements = document.getElementsByClassName(className);

			if (elements.length >= minElements) {
				return elements;
			}

			// Versuche alternative Selektoren
			for (const selector of alternativeSelectors) {
				const altElements = document.querySelectorAll(selector);
				if (altElements.length >= minElements) {
					return altElements;
				}
			}

			return null;
		};

		// Überprüfe zuerst, ob die Elemente bereits existieren
		const existingElements = findElements();
		if (existingElements) {
			console.log(
				`${existingElements.length} Elemente mit Klasse '${className}' direkt gefunden`
			);
			setTimeout(() => callback(existingElements), 50);
			return;
		}

		// MutationObserver für DOM-Änderungen einrichten
		const observer = new MutationObserver((mutations, observer) => {
			const elements = findElements();
			if (elements && elements.length >= minElements) {
				// Kurze Verzögerung für vollständige Initialisierung
				setTimeout(() => {
					observer.disconnect();
					console.log(
						`${elements.length} Elemente mit Klasse '${className}' durch MutationObserver gefunden`
					);
					callback(elements);
				}, 100);
			}
		});

		// DOM-Änderungen beobachten
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"],
		});

		// Regelmäßige Überprüfung als zusätzliche Sicherheit
		const intervalCheck = setInterval(() => {
			const elements = findElements();
			if (elements && elements.length >= minElements) {
				clearInterval(intervalCheck);
				observer.disconnect();
				console.log(
					`${elements.length} Elemente mit Klasse '${className}' durch Interval-Check gefunden`
				);
				callback(elements);
			}
		}, checkInterval);

		// Timeout, falls keine Elemente gefunden werden
		setTimeout(() => {
			observer.disconnect();
			clearInterval(intervalCheck);

			// Letzte Chance zur Überprüfung
			const elements = findElements();
			if (elements && elements.length >= minElements) {
				console.log(
					`${elements.length} Elemente mit Klasse '${className}' durch finalen Check gefunden`
				);
				callback(elements);
			} else {
				console.warn(
					`Keine Elemente mit Klasse '${className}' oder alternativen Selektoren nach ${timeout}ms gefunden`
				);
				if (onTimeout) {
					onTimeout();
				}
			}
		}, timeout);
	},
};

// Zum vorhandenen helpers-Objekt hinzufügen
if (window.helpers) {
	window.helpers.debounce = debounce;
	window.helpers.createAutoSave = createAutoSave;
	window.helpers.storage = storageHelper;
} else {
	window.helpers = {
		debounce,
		createAutoSave,
		storage: storageHelper,
	};
}

/**
 * Verzögerungsbasierte DOM-Manipulation, sobald ein Element verfügbar ist
 * @param {string} selector - CSS-Selektor zum Finden des Elements
 * @param {Function} callback - Funktion, die mit dem Element aufgerufen wird
 * @param {Object} options - Optionen für die Suche
 */
function whenElementReady(selector, callback, options = {}) {
	const { maxAttempts = 10, interval = 200, errorCallback = null } = options;

	if (window.helpers && window.helpers.storage) {
		window.helpers.storage
			.waitForElement(selector, maxAttempts, interval)
			.then((element) => {
				if (element) {
					callback(element);
				} else if (errorCallback) {
					errorCallback();
				}
			});
	} else {
		// Fallback, wenn helpers nicht verfügbar
		let attempts = 0;

		const checkElement = () => {
			attempts++;
			const element = document.querySelector(selector);

			if (element) {
				callback(element);
				return;
			}

			if (attempts >= maxAttempts) {
				console.warn(
					`Element mit Selektor "${selector}" wurde nach ${maxAttempts} Versuchen nicht gefunden`
				);
				if (errorCallback) {
					errorCallback();
				}
				return;
			}

			setTimeout(checkElement, interval);
		};

		checkElement();
	}
}

// Validiere UI-Einstellungen bei der Initialisierung
document.addEventListener("DOMContentLoaded", function () {
	setTimeout(() => {
		if (
			typeof storageHelper !== "undefined" &&
			storageHelper &&
			typeof storageHelper.validateUISettings === "function"
		) {
			console.log("Validiere UI-Einstellungen...");
			storageHelper.validateUISettings();
		} else {
			console.log(
				"storageHelper noch nicht verfügbar, überspringe UI-Validierung"
			);
		}

		// Event für die Initialisierung der sekundären Kacheln einrichten
		if (window.helpers && window.helpers.storage) {
			// Verwende erweiterte Konfiguration für die Erkennung
			window.helpers.storage.whenFieldsReady(
				"secondary-tile",
				(elements) => {
					console.log(
						`${elements.length} sekundäre Kacheln im DOM gefunden, initialisiere Positionsfelder...`
					);
					document.dispatchEvent(
						new CustomEvent("secondaryTilesReady", {
							detail: { count: elements.length },
						})
					);
				},
				15000,
				{
					checkInterval: 1000,
					alternativeSelectors: [
						'[data-tile-type="secondary"]',
						".tile-section-secondary .hangar-tile",
						'input[id^="hangar-position-10"]',
					],
					onTimeout: () => {
						// Versuche explizit nach Positionsfeldern zu suchen
						const positionFields = Array.from({ length: 4 }, (_, i) =>
							document.getElementById(`hangar-position-${101 + i}`)
						).filter(Boolean);

						if (positionFields.length > 0) {
							console.log(
								`${positionFields.length} Positionsfelder für sekundäre Kacheln gefunden, obwohl keine sekundären Kacheln erkannt wurden`
							);
							document.dispatchEvent(
								new CustomEvent("secondaryTilesReady", {
									detail: { count: positionFields.length },
								})
							);
						} else {
							console.error(
								"Keine sekundären Kacheln oder Positionsfelder gefunden"
							);
						}
					},
				}
			);

			// Auch auf manuelle Aktualisierungen der sekundären Kacheln lauschen
			document.addEventListener("secondarySectionToggled", (event) => {
				if (event.detail && event.detail.visible) {
					console.log(
						"Sekundäre Sektion wurde sichtbar gemacht, initiiere Überprüfung der Positionsfelder"
					);
					setTimeout(() => {
						const positionFields = Array.from({ length: 4 }, (_, i) =>
							document.getElementById(`hangar-position-${101 + i}`)
						).filter(Boolean);

						if (positionFields.length > 0) {
							console.log(
								`${positionFields.length} Positionsfelder nach Toggle gefunden`
							);
							document.dispatchEvent(
								new CustomEvent("secondaryTilesReady", {
									detail: { count: positionFields.length },
								})
							);
						}
					}, 500);
				}
			});
		}
	}, 500);
});

// Füge whenElementReady zum window.helpers-Objekt hinzu
if (window.helpers) {
	window.helpers.whenElementReady = whenElementReady;
}
//# sourceMappingURL=helpers.js.map

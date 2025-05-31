/**
 * hangar-utils.js
 * Hilfsfunktionen für die gesamte Anwendung
 */

/**
 * Erweiterte Debug-Funktion mit mehreren Debug-Leveln
 * @param {string} message - Die Nachricht
 * @param {string} level - Debug-Level (debug, info, warn, error)
 */
function enhancedDebug(message, level = "debug") {
	const debugMode = localStorage.getItem("debugMode") === "true";

	if (debugMode || level === "error" || level === "warn") {
		const timestamp = new Date().toISOString().substring(11, 23);
		switch (level) {
			case "info":
				console.info(`[INFO ${timestamp}] ${message}`);
				break;
			case "warn":
				console.warn(`[WARN ${timestamp}] ${message}`);
				break;
			case "error":
				console.error(`[ERROR ${timestamp}] ${message}`);
				break;
			default:
				console.log(`[DEBUG ${timestamp}] ${message}`);
		}
	}
}

/**
 * LocalStorage-Helfer mit erweitertem Fehlerhandling
 */
const localStorageHelper = {
	/**
	 * Liest einen Wert aus dem LocalStorage
	 * @param {string} key - Der Schlüssel
	 * @param {any} defaultValue - Standardwert falls nichts gefunden wird
	 * @return {any} Der gelesene Wert oder der Standardwert
	 */
	get: function (key, defaultValue = null) {
		try {
			const value = localStorage.getItem(key);
			return value !== null ? JSON.parse(value) : defaultValue;
		} catch (error) {
			enhancedDebug(
				`Fehler beim Lesen aus LocalStorage (${key}): ${error.message}`,
				"error"
			);
			return defaultValue;
		}
	},

	/**
	 * Schreibt einen Wert in den LocalStorage
	 * @param {string} key - Der Schlüssel
	 * @param {any} value - Der zu speichernde Wert
	 * @return {boolean} Erfolgsstatus
	 */
	set: function (key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (error) {
			enhancedDebug(
				`Fehler beim Schreiben in LocalStorage (${key}): ${error.message}`,
				"error"
			);
			return false;
		}
	},
};

// Funktionen global verfügbar machen
window.enhancedDebug = enhancedDebug;
window.localStorageHelper = localStorageHelper;

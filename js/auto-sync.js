/**
 * auto-sync.js
 * Ermöglicht die automatische Synchronisation von Projekt-Dateien zwischen verschiedenen Instanzen
 */

class AutoSyncManager {
	constructor() {
		this.currentProjectName = null;
		this.lastSyncTimestamp = Date.now();
		this.syncInterval = 5000; // 5 Sekunden
		this.isActive = false;
		this.intervalId = null;
	}

	/**
	 * Initialisiert den AutoSyncManager
	 */
	init() {
		console.log("AutoSyncManager wird initialisiert...");

		// Event-Listener für automatisches Speichern hinzufügen
		document.addEventListener("autoSaveProject", (event) => {
			if (event.detail && event.detail.projectData) {
				this.handleAutoSave(event.detail.projectData);
			}
		});

		// Prüfen, ob der fileManager verfügbar ist
		if (!window.fileManager) {
			console.error(
				"fileManager ist nicht verfügbar, AutoSync wird nicht gestartet"
			);
			return false;
		}

		console.log("AutoSyncManager erfolgreich initialisiert");
		return true;
	}

	/**
	 * Startet die automatische Synchronisation
	 * @param {string} projectName - Der Name des aktuellen Projekts
	 */
	startSync(projectName = null) {
		if (!window.fileManager) {
			console.error(
				"fileManager ist nicht verfügbar, AutoSync kann nicht gestartet werden"
			);
			return false;
		}

		this.currentProjectName = projectName || this.getCurrentProjectName();
		this.isActive = true;

		console.log(`AutoSync gestartet für Projekt: ${this.currentProjectName}`);

		// Bestehenden Interval stoppen falls vorhanden
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		// Sofortige erste Synchronisation
		this.syncNow();

		// Regelmäßige Synchronisation starten
		this.intervalId = setInterval(() => this.syncNow(), this.syncInterval);

		// Benachrichtigung anzeigen
		if (window.showNotification) {
			window.showNotification(
				`Auto-Sync aktiviert für ${this.currentProjectName}`,
				"info"
			);
		}

		return true;
	}

	/**
	 * Stoppt die automatische Synchronisation
	 */
	stopSync() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.isActive = false;
		console.log("AutoSync gestoppt");

		// Benachrichtigung anzeigen
		if (window.showNotification) {
			window.showNotification("Auto-Sync deaktiviert", "info");
		}
	}

	/**
	 * Führt eine sofortige Synchronisation durch
	 */
	async syncNow() {
		try {
			if (!this.currentProjectName) {
				this.currentProjectName = this.getCurrentProjectName();
				if (!this.currentProjectName) {
					console.warn(
						"Kein Projektname verfügbar, Synchronisation nicht möglich"
					);
					return false;
				}
			}

			const fileName = `${this.currentProjectName}.json`;
			console.log(`Synchronisiere Projekt: ${fileName}...`);

			// Aktuelle Daten aus dem lokalen Speicher laden
			const projectData = await window.fileManager.loadProjectFromFixedLocation(
				fileName
			);

			if (projectData) {
				// Prüfen, ob die Daten neuer sind als die zuletzt synchronisierten
				const remoteTimestamp = new Date(
					projectData.metadata?.lastModified || 0
				).getTime();

				if (remoteTimestamp > this.lastSyncTimestamp) {
					console.log(
						`Neue Version gefunden (${new Date(
							remoteTimestamp
						).toLocaleTimeString()}), wende Änderungen an...`
					);

					// Anwenden der geladenen Daten auf die Anwendung
					if (
						window.hangarData &&
						typeof window.hangarData.applyLoadedHangarPlan === "function"
					) {
						window.hangarData.applyLoadedHangarPlan(projectData);
						this.lastSyncTimestamp = remoteTimestamp;

						// Subtiles Update-Hinweis zeigen
						if (window.showNotification) {
							window.showNotification(
								"Projekt automatisch aktualisiert",
								"success"
							);
						}

						return true;
					} else {
						console.warn("applyLoadedHangarPlan-Funktion nicht verfügbar");
					}
				} else {
					console.log("Keine neueren Daten gefunden");
				}
			} else {
				console.log(
					`Keine Daten für ${fileName} im festen Speicherort gefunden`
				);
			}
		} catch (error) {
			console.error("Fehler bei der Synchronisation:", error);
		}

		return false;
	}

	/**
	 * Verarbeitet ein automatisches Speichern
	 * @param {Object} projectData - Die zu speichernden Projektdaten
	 */
	async handleAutoSave(projectData) {
		if (!this.isActive || !window.fileManager) return;

		try {
			// In den festen Speicherort speichern
			await window.fileManager.saveProjectToFixedLocation(projectData);

			// Timestamp aktualisieren
			this.lastSyncTimestamp = Date.now();
			console.log("Automatisches Speichern erfolgreich");
		} catch (error) {
			console.error("Fehler beim automatischen Speichern:", error);
		}
	}

	/**
	 * Holt den aktuellen Projektnamen aus dem UI
	 * @returns {string} Der aktuelle Projektname oder ein Standardname
	 */
	getCurrentProjectName() {
		const projectNameInput = document.getElementById("projectName");
		return projectNameInput?.value || "HangarPlan";
	}

	/**
	 * Sendet ein Auto-Save-Event an den AutoSyncManager
	 * @param {Object} projectData - Die zu speichernden Projektdaten
	 */
	static triggerAutoSave(projectData) {
		const event = new CustomEvent("autoSaveProject", {
			detail: { projectData },
		});
		document.dispatchEvent(event);
		console.log("Auto-Save Event ausgelöst");
	}
}

// Globale Instanz erstellen
window.autoSyncManager = new AutoSyncManager();

// Nach DOM-Ladung initialisieren
document.addEventListener("DOMContentLoaded", () => {
	if (window.autoSyncManager) {
		window.autoSyncManager.init();

		// Auto-Sync-Toggle-Button suchen und Event-Handler hinzufügen
		const autoSyncToggle = document.getElementById("autoSyncToggle");
		if (autoSyncToggle) {
			autoSyncToggle.addEventListener("change", function () {
				if (this.checked) {
					window.autoSyncManager.startSync();
				} else {
					window.autoSyncManager.stopSync();
				}
			});
		}
	}
});

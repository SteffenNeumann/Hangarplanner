/**
 * Datenbank-Manager für Hangarplanner
 * Verwendet IndexedDB für lokale Persistenz, um Projekte und Einstellungen zu speichern
 */

class DatabaseManager {
	constructor() {
		this.dbName = "hangarplannerDB";
		this.dbVersion = 1;
		this.db = null;
		this.initDB();
	}

	/**
	 * Initialisiert die IndexedDB-Datenbank
	 * @returns {Promise} Promise, das beim erfolgreichen Öffnen der Datenbank erfüllt wird
	 */
	async initDB() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);

			// Bei einer neuen Datenbank oder Versionsupgrade
			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Projekte-Store erstellen
				if (!db.objectStoreNames.contains("projects")) {
					const projectsStore = db.createObjectStore("projects", {
						keyPath: "id",
					});
					projectsStore.createIndex("by_name", "metadata.projectName", {
						unique: false,
					});
					projectsStore.createIndex("by_date", "metadata.exportDate", {
						unique: false,
					});
				}

				// Einstellungen-Store erstellen
				if (!db.objectStoreNames.contains("settings")) {
					db.createObjectStore("settings", { keyPath: "id" });
				}
			};

			request.onsuccess = (event) => {
				this.db = event.target.result;
				console.log("Datenbank erfolgreich initialisiert");
				resolve(this.db);
			};

			request.onerror = (event) => {
				console.error("Datenbankfehler:", event.target.error);
				reject(event.target.error);
			};
		});
	}

	/**
	 * Speichert ein Projekt in der Datenbank
	 * @param {Object} projectData - Die zu speichernden Projektdaten
	 * @returns {Promise<string>} Promise mit der Projekt-ID
	 */
	async saveProject(projectData) {
		if (!this.db) await this.initDB();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(["projects"], "readwrite");
			const store = transaction.objectStore("projects");

			// Automatische ID generieren wenn keine vorhanden
			if (!projectData.id) {
				projectData.id = Date.now().toString();
			}

			// Timestamp aktualisieren beim Speichern
			if (projectData.metadata) {
				projectData.metadata.lastModified = new Date().toISOString();
			}

			const request = store.put(projectData);

			request.onsuccess = () => {
				resolve(projectData.id);
			};

			request.onerror = (event) => {
				reject(event.target.error);
			};
		});
	}

	/**
	 * Lädt ein Projekt aus der Datenbank
	 * @param {string} projectId - ID des zu ladenden Projekts
	 * @returns {Promise<Object>} Promise mit den Projektdaten
	 */
	async loadProject(projectId) {
		if (!this.db) await this.initDB();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(["projects"], "readonly");
			const store = transaction.objectStore("projects");
			const request = store.get(projectId);

			request.onsuccess = (event) => {
				if (event.target.result) {
					resolve(event.target.result);
				} else {
					reject(new Error("Projekt nicht gefunden"));
				}
			};

			request.onerror = (event) => {
				reject(event.target.error);
			};
		});
	}

	/**
	 * Löscht ein Projekt aus der Datenbank
	 * @param {string} projectId - ID des zu löschenden Projekts
	 * @returns {Promise<boolean>} Promise mit dem Erfolg des Löschvorgangs
	 */
	async deleteProject(projectId) {
		if (!this.db) await this.initDB();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(["projects"], "readwrite");
			const store = transaction.objectStore("projects");
			const request = store.delete(projectId);

			request.onsuccess = () => {
				resolve(true);
			};

			request.onerror = (event) => {
				reject(event.target.error);
			};
		});
	}

	/**
	 * Listet alle verfügbaren Projekte auf
	 * @param {string} sortBy - Sortierfeld (name, date)
	 * @param {boolean} ascending - Ob aufsteigend sortiert werden soll
	 * @returns {Promise<Array>} Promise mit Array der Projekte
	 */
	async listProjects(sortBy = "date", ascending = false) {
		if (!this.db) await this.initDB();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(["projects"], "readonly");
			const store = transaction.objectStore("projects");

			// Verwende index für sortierung, wenn verfügbar
			let request;
			if (sortBy === "name") {
				request = store.index("by_name").getAll();
			} else if (sortBy === "date") {
				request = store.index("by_date").getAll();
			} else {
				request = store.getAll();
			}

			request.onsuccess = (event) => {
				let results = event.target.result;

				// Manuelles Sortieren für komplexere Sortieroptionen
				if (sortBy === "name") {
					results.sort((a, b) => {
						const nameA = (a.metadata?.projectName || "").toLowerCase();
						const nameB = (b.metadata?.projectName || "").toLowerCase();
						return ascending
							? nameA.localeCompare(nameB)
							: nameB.localeCompare(nameA);
					});
				} else if (sortBy === "date") {
					results.sort((a, b) => {
						const dateA = new Date(a.metadata?.exportDate || 0);
						const dateB = new Date(b.metadata?.exportDate || 0);
						return ascending ? dateA - dateB : dateB - dateA;
					});
				}

				resolve(results);
			};

			request.onerror = (event) => {
				reject(event.target.error);
			};
		});
	}

	/**
	 * Speichert Einstellungen in der Datenbank
	 * @param {Object} settingsData - Die zu speichernden Einstellungen
	 * @returns {Promise<boolean>} Promise mit dem Erfolg des Speichervorgangs
	 */
	async saveSettings(settingsData) {
		if (!this.db) await this.initDB();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(["settings"], "readwrite");
			const store = transaction.objectStore("settings");

			// Verwende 'global' als ID für allgemeine Einstellungen, wenn keine angegeben
			if (!settingsData.id) {
				settingsData.id = "global";
			}

			const request = store.put(settingsData);

			request.onsuccess = () => {
				resolve(true);
			};

			request.onerror = (event) => {
				reject(event.target.error);
			};
		});
	}

	/**
	 * Lädt Einstellungen aus der Datenbank
	 * @param {string} settingsId - ID der zu ladenden Einstellungen (default: 'global')
	 * @returns {Promise<Object>} Promise mit den Einstellungsdaten
	 */
	async loadSettings(settingsId = "global") {
		if (!this.db) await this.initDB();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(["settings"], "readonly");
			const store = transaction.objectStore("settings");
			const request = store.get(settingsId);

			request.onsuccess = (event) => {
				if (event.target.result) {
					resolve(event.target.result);
				} else {
					resolve(null); // Keine Einstellungen gefunden
				}
			};

			request.onerror = (event) => {
				reject(event.target.error);
			};
		});
	}

	/**
	 * Konfiguriert und öffnet den Speicherdialog für Dateien
	 * @param {string} fileName - Der vorgeschlagene Dateiname
	 * @param {string} fileType - Der Dateityp (z.B. "json")
	 * @param {string} preferredDir - Der bevorzugte Ordner (z.B. "Projects")
	 * @returns {Promise<FileSystemFileHandle>} - Handle für die gewählte Datei
	 */
	async openSaveDialog(fileName, fileType = "json", preferredDir = null) {
		try {
			if (!window.showSaveFilePicker) {
				throw new Error("File System Access API wird nicht unterstützt");
			}

			// Ordner-Auswahl anzeigen
			let startIn = null;

			if (preferredDir) {
				try {
					// Versuchen, direkten Zugriff auf den bevorzugten Ordner zu erhalten
					startIn = { name: preferredDir };
				} catch (e) {
					console.warn("Direkter Ordnerzugriff nicht möglich:", e);
				}
			}

			// Konfiguriere die Optionen für den File Picker mit Ordnervorauswahl
			const options = {
				suggestedName: fileName.endsWith(`.${fileType}`)
					? fileName
					: `${fileName}.${fileType}`,
				types: [
					{
						description: fileType.toUpperCase() + " Files",
						accept: {
							[`application/${fileType}`]: [`.${fileType}`],
						},
					},
				],
			};

			// Wenn ein startIn-Pfad verfügbar ist, füge ihn zu den Optionen hinzu
			if (startIn) {
				options.startIn = startIn;
			}

			// Öffne den Speicherdialog
			return await window.showSaveFilePicker(options);
		} catch (error) {
			if (error.name !== "AbortError") {
				console.error("Fehler beim Öffnen des Speicherdialogs:", error);
			}
			throw error;
		}
	}

	/**
	 * Exportiert ein Projekt als JSON-Datei mit Ordnerauswahl
	 * @param {string} projectId - ID des zu exportierenden Projekts
	 * @param {boolean} useFileSystem - Ob File System Access API verwendet werden soll
	 * @returns {Promise<boolean>} Promise mit dem Erfolg des Exports
	 */
	async exportProject(projectId, useFileSystem = true) {
		try {
			const projectData = await this.loadProject(projectId);
			const jsonString = JSON.stringify(projectData, null, 2);
			const fileName = `${
				projectData.metadata?.projectName || "HangarPlan"
			}.json`;

			// Wenn File System API verwendet werden soll und verfügbar ist
			if (useFileSystem && window.showSaveFilePicker) {
				try {
					// Dialog zur Dateiauswahl mit bevorzugtem Ordner öffnen
					window.showNotification(
						"Bitte wählen Sie einen Ordner zur Speicherung des Projekts",
						"info",
						3000
					);

					const fileHandle = await this.openSaveDialog(
						fileName,
						"json",
						"Projects"
					);

					// Datei schreiben
					const writable = await fileHandle.createWritable();
					await writable.write(jsonString);
					await writable.close();

					window.showNotification(
						`Projekt ${fileName} erfolgreich gespeichert!`,
						"success"
					);

					return true;
				} catch (error) {
					if (error.name === "AbortError") {
						// Benutzer hat abgebrochen
						return false;
					}

					console.error("Fehler beim Speichern mit File System API:", error);
					// Fallback zu regulärem Download
					window.downloadFile(jsonString, fileName);
					window.showNotification(
						"Projekt wurde als Download gespeichert. Sie können es später in Ihren Projektordner verschieben.",
						"info",
						5000
					);
					return true;
				}
			} else {
				// Standardmäßig als Download anbieten
				window.downloadFile(jsonString, fileName);
				window.showNotification("Projekt wurde exportiert", "success");
				return true;
			}
		} catch (error) {
			console.error("Export fehlgeschlagen:", error);
			window.showNotification(
				`Export fehlgeschlagen: ${error.message}`,
				"error"
			);
			return false;
		}
	}

	/**
	 * Importiert ein Projekt aus einer JSON-Datei
	 * @param {string|Object} jsonData - Die zu importierenden JSON-Daten
	 * @returns {Promise<string>} Promise mit der ID des importierten Projekts
	 */
	async importProject(jsonData) {
		try {
			const projectData =
				typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

			// Stelle sicher, dass wir eine ID haben
			if (!projectData.id) {
				projectData.id = Date.now().toString();
			}

			// Aktualisiere Import-Zeitstempel
			if (projectData.metadata) {
				projectData.metadata.importDate = new Date().toISOString();
			}

			await this.saveProject(projectData);
			return projectData.id;
		} catch (error) {
			console.error("Import fehlgeschlagen:", error);
			throw error;
		}
	}

	/**
	 * Erhöht die Persistenz der Datenbank, wenn vom Browser unterstützt
	 * @returns {Promise<boolean>} - ob die erhöhte Persistenz aktiviert werden konnte
	 */
	async requestPersistentStorage() {
		try {
			// Prüfen ob die Persistent Storage API verfügbar ist
			if (navigator.storage && navigator.storage.persist) {
				// Prüfen ob bereits persistenter Speicher aktiviert ist
				const isPersisted = await navigator.storage.persisted();
				if (isPersisted) {
					console.log("Persistenter Speicher ist bereits aktiviert");
					return true;
				}

				// Persistenten Speicher anfordern
				const result = await navigator.storage.persist();
				if (result) {
					console.log("Persistenter Speicher wurde erfolgreich aktiviert");
					showNotification("Daten werden dauerhaft gespeichert", "success");
				} else {
					console.log("Persistenter Speicher konnte nicht aktiviert werden");
					showNotification(
						"Daten könnten bei Speicherbereinigung verloren gehen",
						"warning",
						5000
					);
				}
				return result;
			} else {
				console.log("Persistent Storage API wird nicht unterstützt");
				return false;
			}
		} catch (error) {
			console.error("Fehler beim Anfordern von persistentem Speicher:", error);
			return false;
		}
	}
}

// Erstelle eine globale Instanz
window.databaseManager = new DatabaseManager();

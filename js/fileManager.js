/**
 * FileManager für Hangarplanner
 * Verwaltet das Speichern und Laden von Projektdateien über den File System Access API
 */

class FileManager {
	constructor() {
		// Status, ob File System API unterstützt wird
		this.fileSystemSupported =
			"showSaveFilePicker" in window && "showOpenFilePicker" in window;

		console.log(
			`File System API wird ${
				this.fileSystemSupported ? "" : "NICHT "
			}unterstützt`
		);
	}

	/**
	 * Öffnet den Speichern-Dialog des File System Access API
	 * @param {string} fileName - Der vorgeschlagene Dateiname
	 * @param {string} fileType - Der Dateityp (z.B. "json")
	 * @returns {Promise<FileSystemFileHandle>} Handle für die gewählte Datei
	 */
	async openSaveDialog(fileName, fileType = "json") {
		try {
			// Prüfen, ob die File System Access API unterstützt wird
			if (!this.fileSystemSupported) {
				console.warn("File System Access API wird nicht unterstützt");
				throw new Error("File System Access API wird nicht unterstützt");
			}

			console.log(`Öffne Speicherdialog für ${fileName} vom Typ ${fileType}`);

			// Optionen für den File Picker
			const options = {
				suggestedName: fileName.endsWith(`.${fileType}`)
					? fileName
					: `${fileName}.${fileType}`,
				types: [
					{
						description: fileType.toUpperCase() + " Files",
						accept: { [`application/${fileType}`]: [`.${fileType}`] },
					},
				],
			};

			// Dialog öffnen und Handle zurückgeben
			return await window.showSaveFilePicker(options);
		} catch (error) {
			if (error.name === "AbortError") {
				console.log("Benutzer hat den Dialog abgebrochen");
			} else {
				console.error("Fehler beim Öffnen des Speicherdialogs:", error);
			}
			throw error;
		}
	}

	/**
	 * Öffnet den Öffnen-Dialog des File System Access API
	 * @param {string} fileType - Der Dateityp (z.B. "json")
	 * @returns {Promise<File>} Die ausgewählte Datei
	 */
	async openLoadDialog(fileType = "json") {
		try {
			// Prüfen, ob die File System Access API unterstützt wird
			if (!this.fileSystemSupported) {
				console.warn("File System Access API wird nicht unterstützt");
				throw new Error("File System Access API wird nicht unterstützt");
			}

			console.log(`Öffne Ladedialog für Dateien vom Typ ${fileType}`);

			// Optionen für den File Picker
			const options = {
				types: [
					{
						description: fileType.toUpperCase() + " Files",
						accept: { [`application/${fileType}`]: [`.${fileType}`] },
					},
				],
				multiple: false,
			};

			// Dialog öffnen und File Handle zurückgeben
			const [fileHandle] = await window.showOpenFilePicker(options);
			return await fileHandle.getFile();
		} catch (error) {
			if (error.name === "AbortError") {
				console.log("Benutzer hat den Dialog abgebrochen");
			} else {
				console.error("Fehler beim Öffnen des Ladedialogs:", error);
			}
			throw error;
		}
	}

	/**
	 * Speichert ein Projekt als JSON-Datei mit dem Filepicker
	 * @param {Object} projectData - Die zu speichernden Projektdaten
	 * @returns {Promise<boolean>} Erfolg des Speichervorgangs
	 */
	async saveProject(projectData) {
		try {
			// Aktuelle Zeit in Metadaten speichern
			if (!projectData.metadata) {
				projectData.metadata = {};
			}

			projectData.metadata.lastModified = new Date().toISOString();

			// Dateiname aus Projektname generieren
			const fileName = `${
				projectData.metadata?.projectName || "HangarPlan"
			}.json`;

			// Prüfen ob File System API verwendet werden kann
			if (this.fileSystemSupported) {
				try {
					window.showNotification("Datei-Dialog wird geöffnet...", "info");

					// File Picker öffnen - hier ist der Dialog sichtbar
					const fileHandle = await this.openSaveDialog(fileName);
					console.log("File Handle erhalten:", fileHandle);

					// Erst NACH der Dialogauswahl JSON erstellen
					const jsonString = JSON.stringify(projectData, null, 2);

					// In Datei schreiben
					const writable = await fileHandle.createWritable();
					await writable.write(jsonString);
					await writable.close();

					window.showNotification(
						`Projekt "${projectData.metadata?.projectName}" erfolgreich gespeichert!`,
						"success"
					);

					return true;
				} catch (error) {
					if (error.name === "AbortError") {
						window.showNotification("Speichern abgebrochen", "info");
						return false;
					}

					// Fallback zum Standard-Download nur bei echten Fehlern
					console.warn("Fallback auf Standard-Download:", error.message);
					const jsonString = JSON.stringify(projectData, null, 2);
					this.downloadFile(jsonString, fileName);
					return true;
				}
			} else {
				// Standard-Download wenn File System API nicht unterstützt wird
				const jsonString = JSON.stringify(projectData, null, 2);
				this.downloadFile(jsonString, fileName);
				window.showNotification(
					"Projekt wurde als Download gespeichert",
					"success"
				);
				return true;
			}
		} catch (error) {
			console.error("Fehler beim Speichern des Projekts:", error);
			window.showNotification(
				`Speichern fehlgeschlagen: ${error.message}`,
				"error"
			);
			return false;
		}
	}

	/**
	 * Lädt ein Projekt aus einer JSON-Datei mit dem Filepicker
	 * @returns {Promise<Object|null>} Das geladene Projekt oder null bei Fehler
	 */
	async loadProject() {
		try {
			let jsonData = null;

			// Versuche File System API zu verwenden
			if (this.fileSystemSupported) {
				try {
					window.showNotification("Datei-Auswahl wird geöffnet...", "info");

					const file = await this.openLoadDialog("json");
					console.log("Datei ausgewählt:", file.name);

					// Dateiinhalt lesen
					jsonData = await file.text();
				} catch (error) {
					if (error.name === "AbortError") {
						window.showNotification("Laden abgebrochen", "info");
						return null;
					}

					// Fallback auf Standard-Dateiauswahl
					return this.loadFileFallback();
				}
			} else {
				// Standard-Dateiauswahl verwenden
				return this.loadFileFallback();
			}

			// Daten parsen und zurückgeben
			if (jsonData) {
				const projectData = JSON.parse(jsonData);
				window.showNotification("Projekt erfolgreich geladen!", "success");
				return projectData;
			}

			return null;
		} catch (error) {
			console.error("Fehler beim Laden des Projekts:", error);
			window.showNotification(
				`Laden fehlgeschlagen: ${error.message}`,
				"error"
			);
			return null;
		}
	}

	/**
	 * Fallback für den Datei-Upload über einen Standard-Dateiauswahldialog
	 * @returns {Promise<Object|null>} Das geladene Projekt oder null bei Fehler
	 */
	loadFileFallback() {
		return new Promise((resolve, reject) => {
			// Standard Dateiauswahl verwenden
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json";
			fileInput.style.display = "none";
			document.body.appendChild(fileInput);

			// Event-Handler für Dateiauswahl
			fileInput.onchange = async (event) => {
				try {
					if (!event.target.files || event.target.files.length === 0) {
						resolve(null);
						return;
					}

					// Datei lesen
					const file = event.target.files[0];
					const reader = new FileReader();

					reader.onload = (e) => {
						try {
							const projectData = JSON.parse(e.target.result);
							window.showNotification(
								"Projekt erfolgreich geladen!",
								"success"
							);
							resolve(projectData);
						} catch (error) {
							console.error("Fehler beim Parsen der Datei:", error);
							window.showNotification(
								`Datei-Format ungültig: ${error.message}`,
								"error"
							);
							reject(error);
						}
					};

					reader.onerror = (e) => {
						reject(new Error("Datei konnte nicht gelesen werden"));
					};

					reader.readAsText(file);
				} catch (error) {
					reject(error);
				} finally {
					document.body.removeChild(fileInput);
				}
			};

			// Dialog öffnen
			fileInput.click();
		});
	}

	/**
	 * Hilfsfunktion für direkten Datei-Download
	 * @param {string} content - Dateiinhalt
	 * @param {string} fileName - Dateiname
	 */
	downloadFile(content, fileName) {
		const blob = new Blob([content], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}
}

// Erstelle globale Instanz des FileManagers
window.fileManager = new FileManager();

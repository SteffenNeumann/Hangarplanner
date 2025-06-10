/**
 * Datei-Browser für gespeicherte Dateien im OPFS-Speicher
 */

class StorageBrowser {
	constructor() {
		this.containerElement = null;
		this.fileListElement = null;
	}

	/**
	 * Initialisiert den Storage-Browser in einem Container
	 * @param {string} containerId - ID des Container-Elements für den Datei-Browser
	 */
	initialize(containerId = "storageBrowserContainer") {
		// Container-Element finden oder erstellen
		this.containerElement = document.getElementById(containerId);
		if (!this.containerElement) {
			this.containerElement = document.createElement("div");
			this.containerElement.id = containerId;
			this.containerElement.className =
				"storage-browser bg-white rounded-lg shadow-md p-4 mt-4";

			// An einer passenden Stelle einfügen (z.B. nach dem Auto-Sync Toggle)
			const projectSettingsSection = document.querySelector(
				".sidebar-accordion-content"
			);
			if (projectSettingsSection) {
				projectSettingsSection.appendChild(this.containerElement);
			} else {
				document.body.appendChild(this.containerElement);
			}
		}

		// UI erstellen
		this.createUI();

		// Initial Dateien laden
		this.refreshFileList();

		console.log("Storage Browser initialisiert");
	}

	/**
	 * Erstellt die UI des Storage-Browsers
	 */
	createUI() {
		// Titel
		const title = document.createElement("h3");
		title.textContent = "Gespeicherte Dateien";
		title.className = "text-sm font-medium mb-2";

		// Button-Container für bessere Anordnung
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "flex justify-between items-center mb-2";

		// Speichern-Button
		const saveButton = document.createElement("button");
		saveButton.textContent = "💾 Speichern";
		saveButton.className = "sidebar-btn sidebar-btn-primary text-xs";
		saveButton.onclick = () => this.saveCurrentProject();

		// Aktualisieren-Button
		const refreshButton = document.createElement("button");
		refreshButton.textContent = "↻ Aktualisieren";
		refreshButton.className = "sidebar-btn sidebar-btn-secondary text-xs";
		refreshButton.onclick = () => this.refreshFileList();

		buttonContainer.appendChild(saveButton);
		buttonContainer.appendChild(refreshButton);

		// Container für die Dateiliste
		this.fileListElement = document.createElement("div");
		this.fileListElement.className =
			"storage-file-list text-sm max-h-40 overflow-y-auto";

		// Info-Text
		const infoText = document.createElement("p");
		infoText.textContent = "Dateien werden im Browser-Speicher gespeichert";
		infoText.className = "text-xs text-gray-500 mt-2";

		// Alles zum Container hinzufügen
		this.containerElement.innerHTML = ""; // Container leeren
		this.containerElement.appendChild(title);
		this.containerElement.appendChild(buttonContainer);
		this.containerElement.appendChild(this.fileListElement);
		this.containerElement.appendChild(infoText);
	}

	/**
	 * Lädt die Dateiliste und zeigt sie an
	 */
	async refreshFileList() {
		if (!window.fileManager) {
			console.error("fileManager ist nicht verfügbar");
			this.showError("Datei-Manager nicht verfügbar");
			return;
		}

		try {
			// Lade-Animation anzeigen
			this.fileListElement.innerHTML =
				'<div class="text-center py-2"><span class="animate-pulse">Lade Dateien...</span></div>';

			// Dateien abrufen
			const files = await window.fileManager.listProjectsInFixedLocation();

			if (files && files.length > 0) {
				// Dateien anzeigen
				this.fileListElement.innerHTML = "";
				files.forEach((fileName) => {
					const fileItem = document.createElement("div");
					fileItem.className =
						"storage-file-item py-1 px-2 hover:bg-gray-100 flex justify-between items-center";

					// Linke Seite: Dateiname
					const nameSpan = document.createElement("span");
					nameSpan.textContent = fileName;
					nameSpan.className = "file-name";
					nameSpan.style.cursor = "pointer";
					nameSpan.onclick = () => this.loadFile(fileName);

					// Rechte Seite: Aktionen
					const actionsDiv = document.createElement("div");
					actionsDiv.className = "file-actions";

					// Laden-Button
					const loadBtn = document.createElement("button");
					loadBtn.innerHTML = "📂";
					loadBtn.title = "Datei laden";
					loadBtn.className = "text-sm p-1 mr-1 hover:text-industrial-accent";
					loadBtn.onclick = () => this.loadFile(fileName);

					// Löschen-Button
					const deleteBtn = document.createElement("button");
					deleteBtn.innerHTML = "🗑️";
					deleteBtn.title = "Datei löschen";
					deleteBtn.className = "text-sm p-1 hover:text-status-red";
					deleteBtn.onclick = (e) => {
						e.stopPropagation();
						this.deleteFile(fileName);
					};

					actionsDiv.appendChild(loadBtn);
					actionsDiv.appendChild(deleteBtn);
					fileItem.appendChild(nameSpan);
					fileItem.appendChild(actionsDiv);

					this.fileListElement.appendChild(fileItem);
				});
			} else {
				this.fileListElement.innerHTML =
					'<div class="text-center py-2 text-gray-500">Keine Dateien gefunden</div>';
			}
		} catch (error) {
			console.error("Fehler beim Laden der Dateien:", error);
			this.showError("Fehler beim Laden: " + error.message);
		}
	}

	/**
	 * Speichert das aktuelle Projekt in den festen Speicherort
	 */
	async saveCurrentProject() {
		try {
			if (!window.fileManager) {
				throw new Error("Datei-Manager nicht verfügbar");
			}

			// Projektname aus Eingabefeld abrufen oder Standardwert verwenden
			const projectNameInput = document.getElementById("projectName");
			const projectName =
				projectNameInput && projectNameInput.value
					? projectNameInput.value.trim()
					: "HangarPlan";

			// Projektdaten sammeln
			let projectData = {};

			console.log("Versuche Projektdaten zu sammeln...");

			// Prüfe alle möglichen Methoden, um Projektdaten zu erhalten
			if (window.hangarData) {
				console.log("hangarData verfügbar, prüfe Methoden...");

				if (typeof window.hangarData.getCurrentData === "function") {
					console.log("Verwende getCurrentData()...");
					projectData = window.hangarData.getCurrentData();
				} else if (typeof window.hangarData.getProjectData === "function") {
					console.log("Verwende getProjectData()...");
					projectData = window.hangarData.getProjectData();
				} else if (typeof window.hangarData.collectProjectData === "function") {
					console.log("Verwende collectProjectData()...");
					projectData = window.hangarData.collectProjectData();
				} else {
					console.log("Verwende hangarData direkt...");
					// Direkter Zugriff auf Daten als Fallback
					projectData = {
						positions: window.hangarData.positions || {},
						aircraft: window.hangarData.aircraft || {},
						settings: window.hangarData.settings || {},
					};
				}
			} else {
				throw new Error("Hangar-Daten nicht verfügbar");
			}

			// Prüfe, ob wir Daten haben
			if (!projectData || Object.keys(projectData).length === 0) {
				throw new Error("Keine Projektdaten gefunden");
			}

			// Metadaten hinzufügen
			if (!projectData.metadata) {
				projectData.metadata = {};
			}
			projectData.metadata.projectName = projectName;
			projectData.metadata.lastSaved = new Date().toISOString();

			// Korrektes Dateinamensformat sicherstellen
			const fileName = projectName.endsWith(".json")
				? projectName
				: `${projectName}.json`;

			// Tiefe Kopie der Daten erstellen
			const projectDataCopy = JSON.parse(JSON.stringify(projectData));

			console.log(`Speichere Projekt "${fileName}"...`);

			// Verwende die korrekte Parameterreihenfolge (Daten zuerst, dann Dateiname)
			await window.fileManager.saveProjectToFixedLocation(
				projectDataCopy,
				fileName
			);
			console.log(`Projekt "${fileName}" erfolgreich gespeichert.`);

			// Aktualisieren
			await this.refreshFileList();

			if (window.showNotification) {
				window.showNotification(
					`Projekt "${projectName}" gespeichert`,
					"success"
				);
			}
		} catch (error) {
			console.error("Fehler beim Speichern:", error);
			if (window.showNotification) {
				window.showNotification("Speicherfehler: " + error.message, "error");
			}
		}
	}

	/**
	 * Löscht eine Datei aus dem Speicher
	 * @param {string} fileName - Name der zu löschenden Datei
	 */
	async deleteFile(fileName) {
		if (confirm(`Soll die Datei "${fileName}" wirklich gelöscht werden?`)) {
			try {
				if (!window.fileManager) {
					throw new Error("Datei-Manager nicht verfügbar");
				}

				await window.fileManager.deleteProjectFromFixedLocation(fileName);
				await this.refreshFileList();

				if (window.showNotification) {
					window.showNotification(`Datei "${fileName}" gelöscht`, "info");
				}
			} catch (error) {
				console.error("Fehler beim Löschen der Datei:", error);
				if (window.showNotification) {
					window.showNotification("Löschfehler: " + error.message, "error");
				}
			}
		}
	}

	/**
	 * Lädt eine Datei aus dem Speicher
	 * @param {string} fileName - Name der zu ladenden Datei
	 */
	async loadFile(fileName) {
		try {
			if (!window.fileManager) {
				throw new Error("Datei-Manager nicht verfügbar");
			}

			const projectData = await window.fileManager.loadProjectFromFixedLocation(
				fileName
			);

			if (
				projectData &&
				window.hangarData &&
				typeof window.hangarData.applyLoadedHangarPlan === "function"
			) {
				window.hangarData.applyLoadedHangarPlan(projectData);

				// Projektnamen im UI aktualisieren
				const projectNameInput = document.getElementById("projectName");
				if (
					projectNameInput &&
					projectData.metadata &&
					projectData.metadata.projectName
				) {
					projectNameInput.value = projectData.metadata.projectName;
				}

				// Erfolgsbenachrichtigung
				if (window.showNotification) {
					window.showNotification(`Projekt "${fileName}" geladen`, "success");
				}
			} else {
				console.error(
					"Projekt konnte nicht geladen werden oder Anwendung ist nicht bereit"
				);
				if (window.showNotification) {
					window.showNotification("Fehler beim Laden des Projekts", "error");
				}
			}
		} catch (error) {
			console.error("Fehler beim Laden der Datei:", error);
			if (window.showNotification) {
				window.showNotification("Fehler beim Laden: " + error.message, "error");
			}
		}
	}

	/**
	 * Zeigt eine Fehlermeldung in der Dateiliste an
	 * @param {string} message - Die anzuzeigende Fehlermeldung
	 */
	showError(message) {
		if (this.fileListElement) {
			this.fileListElement.innerHTML = `<div class="text-center py-2 text-status-red">${message}</div>`;
		}
	}
}

// Globale Instanz erstellen
window.storageBrowser = new StorageBrowser();

// Nach DOM-Ladung initialisieren
document.addEventListener("DOMContentLoaded", () => {
	// Verzögert initialisieren, um sicherzustellen dass andere Komponenten geladen sind
	setTimeout(() => {
		if (window.storageBrowser) {
			window.storageBrowser.initialize();
		}
	}, 1000);
});

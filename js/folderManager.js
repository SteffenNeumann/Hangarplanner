/**
 * folderManager.js
 * Dieses Modul verwaltet die empfohlene Ordnerstruktur für die HangarPlanner-Anwendung.
 * Da Browser keinen direkten Zugriff auf das Dateisystem haben, implementieren wir
 * einen Mechanismus, der Benutzern hilft, eine konsistente Ordnerstruktur zu verwenden.
 */

class FolderManager {
	constructor() {
		// Basis-Ordnerstruktur definieren
		this.folderStructure = {
			baseDir: "Settings",
			projectsDir: "Settings/Projekte",
			settingsDir: "Settings/Einstellungen",
		};
	}

	/**
	 * Gibt den empfohlenen Pfad für eine Projektdatei zurück
	 * @param {string} fileName - Name der Projektdatei ohne Erweiterung
	 * @returns {string} Vollständiger Pfad
	 */
	getProjectPath(fileName) {
		if (!fileName.endsWith(".json")) {
			fileName += ".json";
		}
		return `${this.folderStructure.projectsDir}/${fileName}`;
	}

	/**
	 * Gibt den empfohlenen Pfad für eine Einstellungsdatei zurück
	 * @param {string} fileName - Name der Einstellungsdatei ohne Erweiterung
	 * @returns {string} Vollständiger Pfad
	 */
	getSettingsPath(fileName) {
		if (!fileName.endsWith(".json")) {
			fileName += ".json";
		}
		return `${this.folderStructure.settingsDir}/${fileName}`;
	}

	/**
	 * Zeigt einen Dialog mit Informationen zur empfohlenen Ordnerstruktur an
	 */
	showFolderStructureInfo() {
		// Erstelle Modales Fenster für die Ordnerstruktur-Informationen
		const modalHtml = `
            <div id="folderStructureModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-industrial-medium rounded-lg p-6 w-96 max-w-md">
                    <h2 class="text-xl font-bold mb-4">Empfohlene Ordnerstruktur</h2>
                    <p class="mb-3">Bitte speichern Sie Ihre Dateien in der folgenden Struktur:</p>
                    <div class="bg-industrial-dark p-3 rounded mb-4 font-mono text-sm">
                        📁 ${this.folderStructure.baseDir}/<br>
                        &nbsp;&nbsp;📁 Projekte/<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;📄 IhrProjekt.json<br>
                        &nbsp;&nbsp;📁 Einstellungen/<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;📄 IhrProjekt_Settings.json
                    </div>
                    <p class="mb-4 text-sm">Diese Struktur hilft Ihnen, Ihre Projekte und Einstellungen besser zu organisieren.</p>
                    <div class="flex justify-between">
                        <button id="createFoldersBtn" class="px-4 py-2 bg-industrial-accent rounded hover:bg-opacity-80">
                            Ordnerstruktur erstellen
                        </button>
                        <button id="closeFolderModalBtn" class="px-4 py-2 bg-industrial-light text-industrial-dark rounded hover:bg-opacity-80">
                            Schließen
                        </button>
                    </div>
                </div>
            </div>
        `;

		// Füge das Modal zum DOM hinzu
		const modalContainer = document.createElement("div");
		modalContainer.innerHTML = modalHtml;
		document.body.appendChild(modalContainer.firstChild);

		// Event-Listener für die Buttons hinzufügen
		document
			.getElementById("closeFolderModalBtn")
			.addEventListener("click", () => {
				const modal = document.getElementById("folderStructureModal");
				if (modal) document.body.removeChild(modal);
			});

		document
			.getElementById("createFoldersBtn")
			.addEventListener("click", () => {
				this.createFolderStructure();
				const modal = document.getElementById("folderStructureModal");
				if (modal) document.body.removeChild(modal);
			});
	}

	/**
	 * Erstellt Platzhalter-Dateien, um die empfohlene Ordnerstruktur zu simulieren
	 */
	createFolderStructure() {
		try {
			// Da Browser keinen direkten Dateisystemzugriff haben, laden wir stattdessen
			// vorgefertigte leere JSON-Dateien herunter, die als Platzhalter dienen

			// Erstelle Platzhalter-Datei für den Hauptordner
			const readmeContent = {
				info: "Dies ist der Hauptordner für HangarPlanner Dateien.",
				structure: {
					Projekte: "Speicherort für Ihre Hangarplaner-Projekte",
					Einstellungen: "Speicherort für Ihre Einstellungsdateien",
				},
				version: "1.0",
			};

			this.downloadPlaceholderFile(
				readmeContent,
				`${this.folderStructure.baseDir}/README.json`
			);

			// Erstelle Platzhalter-Datei für den Projekte-Ordner
			const projekteContent = {
				info: "Dies ist der Ordner für Ihre HangarPlanner Projekte.",
				hint: "Speichern Sie hier Ihre .json Projektdateien",
			};

			this.downloadPlaceholderFile(
				projekteContent,
				`${this.folderStructure.projectsDir}/README.json`
			);

			// Erstelle Platzhalter-Datei für den Einstellungen-Ordner
			const einstellungenContent = {
				info: "Dies ist der Ordner für Ihre HangarPlanner Einstellungen.",
				hint: "Speichern Sie hier Ihre _Settings.json Dateien",
			};

			this.downloadPlaceholderFile(
				einstellungenContent,
				`${this.folderStructure.settingsDir}/README.json`
			);

			// Zeige Erfolgsmeldung
			this.showNotification(
				"Platzhalter-Dateien für die Ordnerstruktur wurden heruntergeladen",
				"success"
			);
		} catch (error) {
			console.error("Fehler beim Erstellen der Ordnerstruktur:", error);
			this.showNotification(
				`Fehler beim Erstellen der Ordnerstruktur: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Lädt eine Platzhalter-Datei herunter
	 * @param {object} content - Der Inhalt der JSON-Datei
	 * @param {string} path - Der komplette Pfad mit Dateiname
	 */
	downloadPlaceholderFile(content, path) {
		const jsonStr = JSON.stringify(content, null, 2);
		const blob = new Blob([jsonStr], { type: "application/json" });

		// Extrahiere den Dateinamen aus dem Pfad
		const pathParts = path.split("/");
		const filename = pathParts[pathParts.length - 1];

		const downloadLink = document.createElement("a");
		downloadLink.href = URL.createObjectURL(blob);
		downloadLink.download = filename;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
	}

	/**
	 * Zeigt eine Benachrichtigung an
	 * @param {string} message - Die anzuzeigende Nachricht
	 * @param {string} type - Der Typ (success, error, warning, info)
	 */
	showNotification(message, type = "info") {
		// Prüfe, ob die globale Funktion vorhanden ist
		if (typeof window.showNotification === "function") {
			window.showNotification(message, type);
			return;
		}

		// Fallback-Implementation, wenn die globale Funktion nicht verfügbar ist
		alert(message);
	}
}

// Erstelle eine globale Instanz
window.folderManager = new FolderManager();

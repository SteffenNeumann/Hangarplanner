/**
 * Projektverwaltung für Hangarplanner
 * Bietet UI-Komponenten und Funktionen zum Verwalten von Projekten
 */

class ProjectManager {
	constructor(dbManager) {
		this.dbManager = dbManager || window.databaseManager;
		this.modalContainer = null;
		this.projectListElement = null;
		this.sortOrder = {
			field: "date",
			ascending: false,
		};
	}

	/**
	 * Zeigt den Projektmanager-Dialog an
	 */
	async showProjectManager() {
		// Dialog erstellen und zur Seite hinzufügen
		const modalHtml = `
      <div id="projectManagerModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-industrial-medium rounded-lg p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Projekt-Manager</h2>
            <div class="flex gap-2">
              <button id="refreshProjectList" class="px-3 py-1 bg-industrial-light text-industrial-dark rounded hover:bg-opacity-80">
                <span>🔄</span>
              </button>
              <button id="closeProjectManager" class="px-3 py-1 bg-industrial-light text-industrial-dark rounded hover:bg-opacity-80">
                Schließen
              </button>
            </div>
          </div>
          
          <div class="flex justify-between items-center mb-4">
            <div class="flex gap-3">
              <button id="importProjectBtn" class="px-3 py-1 bg-industrial-accent rounded hover:bg-opacity-80">
                Projekt importieren
              </button>
              <button id="newProjectBtn" class="px-3 py-1 bg-green-600 rounded hover:bg-opacity-80">
                Neues Projekt
              </button>
            </div>
            
            <div class="flex gap-2">
              <button id="exportAllBtn" class="px-3 py-1 bg-blue-600 rounded hover:bg-opacity-80 text-sm">
                Backup erstellen
              </button>
              <button id="importBackupBtn" class="px-3 py-1 bg-purple-600 rounded hover:bg-opacity-80 text-sm">
                Backup wiederherstellen
              </button>
              <div class="flex items-center ml-4">
                <label class="inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="useFileSystemToggle" class="sr-only peer">
                  <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span class="ms-3 text-sm font-medium text-gray-100">Ordner-Auswahl</span>
                </label>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <span class="text-sm">Sortieren nach:</span>
                <select id="sortProjects" class="bg-industrial-dark text-white px-2 py-1 rounded text-sm">
                  <option value="date-desc">Datum (neueste zuerst)</option>
                  <option value="date-asc">Datum (älteste zuerst)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="overflow-auto grow">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-industrial-dark">
                  <th class="text-left p-2 border-b border-gray-600">Projektname</th>
                  <th class="text-left p-2 border-b border-gray-600">Erstellt am</th>
                  <th class="text-left p-2 border-b border-gray-600">Zuletzt bearbeitet</th>
                  <th class="text-center p-2 border-b border-gray-600">Aktionen</th>
                </tr>
              </thead>
              <tbody id="projectList" class="text-white">
                <tr>
                  <td colspan="4" class="text-center p-4">Projekte werden geladen...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

		// Füge den Dialog zum DOM hinzu
		this.modalContainer = document.createElement("div");
		this.modalContainer.innerHTML = modalHtml;
		document.body.appendChild(this.modalContainer.firstChild);

		// Referenzen auf wichtige Elemente speichern
		this.projectListElement = document.getElementById("projectList");

		// Gespeicherte Einstellung für File System Access laden
		const useFileSystem =
			localStorage.getItem("useFileSystemAccess") === "true";
		document.getElementById("useFileSystemToggle").checked = useFileSystem;

		// Event-Listener hinzufügen
		document
			.getElementById("closeProjectManager")
			.addEventListener("click", () => this.closeManager());
		document
			.getElementById("refreshProjectList")
			.addEventListener("click", () => this.refreshProjects());
		document
			.getElementById("importProjectBtn")
			.addEventListener("click", () => this.importProject());
		document
			.getElementById("newProjectBtn")
			.addEventListener("click", () => this.createNewProject());
		document
			.getElementById("sortProjects")
			.addEventListener("change", (e) => this.changeSortOrder(e.target.value));
		document
			.getElementById("exportAllBtn")
			.addEventListener("click", () => this.exportAllProjects());
		document
			.getElementById("importBackupBtn")
			.addEventListener("click", () => this.importBackup());
		document
			.getElementById("useFileSystemToggle")
			.addEventListener("change", (e) => {
				localStorage.setItem("useFileSystemAccess", e.target.checked);
			});

		// Projekte laden
		await this.refreshProjects();

		// Persistenz erhöhen, wenn möglich
		if (this.dbManager.requestPersistentStorage) {
			this.dbManager.requestPersistentStorage();
		}
	}

	/**
	 * Schließt den Projektmanager-Dialog
	 */
	closeManager() {
		const modal = document.getElementById("projectManagerModal");
		if (modal) {
			document.body.removeChild(modal);
			this.projectListElement = null;
			this.modalContainer = null;
		}
	}

	/**
	 * Aktualisiert die Projektliste
	 */
	async refreshProjects() {
		try {
			if (!this.projectListElement) return;

			// Loading-Status anzeigen
			this.projectListElement.innerHTML = `
        <tr>
          <td colspan="4" class="text-center p-4">
            <div class="flex justify-center items-center">
              <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-industrial-accent"></div>
              <span class="ml-2">Projekte werden geladen...</span>
            </div>
          </td>
        </tr>
      `;

			// Projekte aus Datenbank holen, nach aktueller Sortierung
			const [field, direction] = this.sortOrder.field.split("-");
			const ascending = direction === "asc";
			const projects = await this.dbManager.listProjects(field, ascending);

			// Projekte anzeigen oder Meldung, wenn keine vorhanden
			if (projects.length === 0) {
				this.projectListElement.innerHTML = `
          <tr>
            <td colspan="4" class="text-center p-4">Keine Projekte gefunden. Erstellen Sie ein neues Projekt oder importieren Sie eines.</td>
          </tr>
        `;
				return;
			}

			// HTML für die Projektliste erstellen
			let html = "";
			for (const project of projects) {
				const created = new Date(
					project.metadata?.exportDate || 0
				).toLocaleString();
				const modified = new Date(
					project.metadata?.lastModified || project.metadata?.exportDate || 0
				).toLocaleString();

				html += `
          <tr class="border-b border-gray-700 hover:bg-industrial-dark/50">
            <td class="p-2">${
							project.metadata?.projectName || "Unbenanntes Projekt"
						}</td>
            <td class="p-2">${created}</td>
            <td class="p-2">${modified}</td>
            <td class="p-2 text-center">
              <div class="flex justify-center gap-2">
                <button 
                  class="px-2 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700" 
                  data-action="load" 
                  data-id="${project.id}">
                  Laden
                </button>
                <button 
                  class="px-2 py-1 bg-industrial-accent rounded text-sm hover:bg-opacity-80" 
                  data-action="export" 
                  data-id="${project.id}">
                  Exportieren
                </button>
                <button 
                  class="px-2 py-1 bg-red-600 rounded text-sm hover:bg-red-700" 
                  data-action="delete" 
                  data-id="${project.id}">
                  Löschen
                </button>
              </div>
            </td>
          </tr>
        `;
			}

			this.projectListElement.innerHTML = html;

			// Event-Listener für Aktionsschaltflächen hinzufügen
			this.projectListElement
				.querySelectorAll("button[data-action]")
				.forEach((button) => {
					const action = button.getAttribute("data-action");
					const projectId = button.getAttribute("data-id");

					button.addEventListener("click", () => {
						switch (action) {
							case "load":
								this.loadProject(projectId);
								break;
							case "export":
								this.exportProject(projectId);
								break;
							case "delete":
								this.deleteProject(projectId);
								break;
						}
					});
				});
		} catch (error) {
			console.error("Fehler beim Laden der Projekte:", error);
			if (this.projectListElement) {
				this.projectListElement.innerHTML = `
          <tr>
            <td colspan="4" class="text-center p-4 text-red-500">
              Fehler beim Laden der Projekte: ${error.message}
            </td>
          </tr>
        `;
			}
		}
	}

	/**
	 * Ändert die Sortierreihenfolge der Projekte
	 */
	changeSortOrder(sortValue) {
		// Wert im Format "field-direction" (z.B. "date-desc")
		this.sortOrder = {
			field: sortValue,
		};
		this.refreshProjects();
	}

	/**
	 * Lädt ein Projekt
	 */
	async loadProject(projectId) {
		try {
			// Modal schließen
			this.closeManager();

			// Benachrichtigung anzeigen
			window.showNotification("Projekt wird geladen...", "info");

			// Projekt aus DB laden
			const projectData = await this.dbManager.loadProject(projectId);

			// Daten an die Anwendung übergeben (die existierende loadProjectData-Funktion verwenden)
			if (typeof window.loadProjectFromDatabase === "function") {
				window.loadProjectFromDatabase(projectData);
			} else {
				console.error("loadProjectFromDatabase-Funktion nicht gefunden");
				window.showNotification(
					"Fehler: Projekladefunktion nicht gefunden",
					"error"
				);
			}
		} catch (error) {
			console.error("Fehler beim Laden des Projekts:", error);
			window.showNotification(
				`Fehler beim Laden des Projekts: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Exportiert ein Projekt als JSON-Datei
	 */
	async exportProject(projectId) {
		try {
			// Prüfen, ob File System Access verwendet werden soll
			const useFileSystem =
				localStorage.getItem("useFileSystemAccess") === "true";

			await this.dbManager.exportProject(projectId, useFileSystem);

			if (!useFileSystem) {
				window.showNotification("Projekt wurde exportiert", "success");
			}
		} catch (error) {
			console.error("Fehler beim Exportieren des Projekts:", error);
			window.showNotification(
				`Export fehlgeschlagen: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Löscht ein Projekt nach Bestätigung
	 */
	async deleteProject(projectId) {
		// Bestätigungsdialog
		if (
			!confirm(
				"Möchten Sie dieses Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
			)
		) {
			return;
		}

		try {
			await this.dbManager.deleteProject(projectId);
			window.showNotification("Projekt wurde gelöscht", "success");
			this.refreshProjects();
		} catch (error) {
			console.error("Fehler beim Löschen des Projekts:", error);
			window.showNotification(
				`Löschen fehlgeschlagen: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Importiert ein Projekt aus einer JSON-Datei
	 */
	importProject() {
		// Dateiauswahldialog erstellen und öffnen
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = ".json";
		fileInput.style.display = "none";
		document.body.appendChild(fileInput);

		fileInput.onchange = async (event) => {
			try {
				const file = event.target.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = async (e) => {
					try {
						const projectId = await this.dbManager.importProject(
							e.target.result
						);
						window.showNotification(
							"Projekt erfolgreich importiert",
							"success"
						);
						this.refreshProjects();
					} catch (error) {
						console.error("Fehler beim Importieren des Projekts:", error);
						window.showNotification(
							`Import fehlgeschlagen: ${error.message}`,
							"error"
						);
					}
				};
				reader.readAsText(file);
			} finally {
				// Aufräumen
				document.body.removeChild(fileInput);
			}
		};

		fileInput.click();
	}

	/**
	 * Erstellt ein neues Projekt
	 */
	createNewProject() {
		// Dialog zum Eingeben des Projektnamens anzeigen
		const projectName = prompt(
			"Bitte geben Sie einen Namen für das neue Projekt ein:"
		);
		if (!projectName) return; // Abgebrochen

		// Neues Projekt erstellen (mit der existierenden createNewProject-Funktion)
		if (typeof window.createNewProjectInDatabase === "function") {
			window.createNewProjectInDatabase(projectName);
			this.closeManager();
		} else {
			console.error("createNewProjectInDatabase-Funktion nicht gefunden");
			window.showNotification(
				"Fehler: Funktion zum Erstellen neuer Projekte nicht gefunden",
				"error"
			);
		}
	}

	/**
	 * Exportiert alle Projekte als gepackte JSON-Datei (Backup)
	 */
	async exportAllProjects() {
		try {
			const projects = await this.dbManager.listProjects();

			if (projects.length === 0) {
				window.showNotification(
					"Keine Projekte zum Exportieren vorhanden",
					"info"
				);
				return;
			}

			const backup = {
				metadata: {
					exportDate: new Date().toISOString(),
					version: "1.0",
					projectCount: projects.length,
				},
				projects: projects,
			};

			const jsonStr = JSON.stringify(backup, null, 2);
			const filename = `HangarPlanner_Backup_${new Date()
				.toISOString()
				.slice(0, 10)}.json`;

			// Datei zum Download anbieten
			window.downloadFile(jsonStr, filename);

			window.showNotification(
				`Backup mit ${projects.length} Projekten erstellt`,
				"success"
			);
		} catch (error) {
			console.error("Fehler beim Erstellen des Backups:", error);
			window.showNotification(
				`Backup fehlgeschlagen: ${error.message}`,
				"error"
			);
		}
	}

	/**
	 * Importiert ein Backup aus einer Datei
	 */
	importBackup() {
		// Dateiauswahldialog erstellen und öffnen
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = ".json";
		fileInput.style.display = "none";
		document.body.appendChild(fileInput);

		fileInput.onchange = async (event) => {
			try {
				const file = event.target.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = async (e) => {
					try {
						await this.importProjectBackup(e.target.result);
					} catch (error) {
						console.error("Fehler beim Importieren des Backups:", error);
						window.showNotification(
							`Backup-Import fehlgeschlagen: ${error.message}`,
							"error"
						);
					}
				};
				reader.readAsText(file);
			} finally {
				// Aufräumen
				document.body.removeChild(fileInput);
			}
		};

		fileInput.click();
	}

	// Füge eine Methode zum Importieren des Backups hinzu
	async importProjectBackup(backupData) {
		try {
			// Wenn String eingegeben wurde, parsen
			const data =
				typeof backupData === "string" ? JSON.parse(backupData) : backupData;

			if (!data.projects || !Array.isArray(data.projects)) {
				throw new Error("Ungültiges Backup-Format");
			}

			// Zähler für erfolgreiche Importe
			let imported = 0;

			// Projekte einzeln importieren
			for (const project of data.projects) {
				try {
					await this.dbManager.saveProject(project);
					imported++;
				} catch (err) {
					console.error(
						`Fehler beim Importieren von Projekt ${project.id}:`,
						err
					);
				}
			}

			window.showNotification(
				`${imported} von ${data.projects.length} Projekten importiert`,
				"success"
			);
			this.refreshProjects();

			return imported;
		} catch (error) {
			console.error("Fehler beim Importieren des Backups:", error);
			window.showNotification(
				`Import fehlgeschlagen: ${error.message}`,
				"error"
			);
			return 0;
		}
	}
}

// Erstelle eine globale Instanz
window.projectManager = new ProjectManager(window.databaseManager);

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
 * Hilfsfunktion zum Debuggen des Sidebar-Status
 */
function checkSidebarStatus() {
	const body = document.body;
	const menuToggleBtn = document.getElementById("menuToggle");
	const isSidebarCollapsed = body.classList.contains("sidebar-collapsed");

	console.log(
		"Sidebar Status:",
		isSidebarCollapsed ? "Eingeklappt" : "Ausgeklappt"
	);
	console.log(
		"Toggle Button Text:",
		menuToggleBtn ? menuToggleBtn.textContent : "Nicht gefunden"
	);
	console.log("Body Klassen:", body.className);

	return {
		isCollapsed: isSidebarCollapsed,
		buttonText: menuToggleBtn ? menuToggleBtn.textContent : null,
		bodyClasses: body.className,
	};
}

// Globale Verfügbarkeit für die Debugging-Funktion
window.checkSidebarStatus = checkSidebarStatus;

// Füge die Funktion zum vorhandenen helpers-Objekt hinzu, falls es existiert
if (window.helpers) {
	window.helpers.checkSidebarStatus = checkSidebarStatus;
}

/**
 * Setzt den Sidebar-Status explizit auf ausgeklappt beim ersten Laden
 */
function resetSidebarState() {
	localStorage.setItem("sidebarCollapsed", "false");
	console.log(
		"Sidebar-Zustand auf ausgeklappt zurückgesetzt (localStorage: false)"
	);

	if (window.toggleSidebar) {
		window.toggleSidebar(false);
		return "Sidebar wurde ausgeklappt";
	} else {
		return "toggleSidebar-Funktion nicht gefunden";
	}
}

// Globale Verfügbarkeit für Debugging
window.resetSidebarState = resetSidebarState;

// Nach dem ersten Laden der Seite einmal prüfen und ggf. korrigieren
document.addEventListener("DOMContentLoaded", function () {
	setTimeout(() => {
		// Wenn die Sidebar trotz allem noch eingeklappt ist, automatisch ausklappen
		const body = document.body;
		if (body.classList.contains("sidebar-collapsed")) {
			console.warn(
				"Sidebar ist nach Laden immer noch eingeklappt - korrigiere..."
			);
			resetSidebarState();
		}
	}, 1000);
});

// Exportieren der Hilfsfunktionen
window.helpers = {
	showNotification,
	debounce,
};

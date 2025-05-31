/**
 * hangar.js
 * Hauptanwendungsdatei, die alle Module zusammenbringt und initialisierende Funktionen enthält
 */

document.addEventListener("DOMContentLoaded", function () {
	console.log("Hangar Planner wird initialisiert...");

	// Überprüfen der Browser-Unterstützung
	if (typeof window.checkBrowserSupport === "function") {
		window.checkBrowserSupport();
	}

	// UI-Event-Listener einrichten
	if (
		typeof window.hangarEvents !== "undefined" &&
		typeof window.hangarEvents.setupUIEventListeners === "function"
	) {
		window.hangarEvents.setupUIEventListeners();
	}

	// UI initialisieren
	if (typeof window.initializeUI === "function") {
		window.initializeUI();
	}

	// Sidebar-Status aus LocalStorage wiederherstellen
	const isSidebarCollapsed =
		localStorage.getItem("sidebarCollapsed") === "true";
	if (isSidebarCollapsed) {
		document.body.classList.add("sidebar-collapsed");
	}

	// Zustand aus LocalStorage laden, falls vorhanden
	if (
		window.hangarData &&
		typeof window.hangarData.loadStateFromLocalStorage === "function"
	) {
		setTimeout(() => {
			window.hangarData.loadStateFromLocalStorage();
		}, 500);
	}

	console.log("Hangar Planner wurde initialisiert!");
});

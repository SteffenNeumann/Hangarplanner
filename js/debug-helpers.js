/**
 * debug-helpers.js
 * Hilfsfunktionen zur Fehlerdiagnose und Debugging
 */

// Globales Objekt für Debugging-Funktionen
window.debugHelpers = {
	// Überprüft den Sidebar-Status und zeigt Details im Console
	checkSidebarStatus: function () {
		const body = document.body;
		const menuToggleBtn = document.getElementById("menuToggle");
		const sidebar = document.getElementById("sidebarMenu");
		const isSidebarCollapsed = body.classList.contains("sidebar-collapsed");

		console.group("Sidebar-Status-Diagnose");
		console.log(
			"Sidebar-Status:",
			isSidebarCollapsed ? "Eingeklappt" : "Ausgeklappt"
		);
		console.log(
			"Toggle-Button Text:",
			menuToggleBtn ? menuToggleBtn.textContent : "Nicht gefunden"
		);
		console.log(
			"Toggle-Button Position:",
			menuToggleBtn
				? `top: ${menuToggleBtn.offsetTop}px, right: ${
						document.body.clientWidth -
						menuToggleBtn.offsetLeft -
						menuToggleBtn.offsetWidth
				  }px`
				: "N/A"
		);
		console.log("Sidebar-Container:", sidebar ? "Gefunden" : "Nicht gefunden");
		if (sidebar) {
			console.log("Sidebar-Container Breite:", sidebar.offsetWidth);
			console.log(
				"Sidebar-Container Stil width:",
				getComputedStyle(sidebar).width
			);
		}
		console.log("Body-Klassen:", body.className);
		console.groupEnd();

		return {
			isCollapsed: isSidebarCollapsed,
			buttonText: menuToggleBtn ? menuToggleBtn.textContent : null,
			sidebarWidth: sidebar ? sidebar.offsetWidth : null,
			bodyClasses: body.className,
		};
	},

	// Sidebar-Status direkt umschalten - als Notfallmethode
	toggleSidebarManually: function () {
		const body = document.body;
		const menuToggleBtn = document.getElementById("menuToggle");
		const wasCollapsed = body.classList.contains("sidebar-collapsed");

		// Umschalten des Zustands
		if (wasCollapsed) {
			body.classList.remove("sidebar-collapsed");
			if (menuToggleBtn) menuToggleBtn.textContent = "«";
		} else {
			body.classList.add("sidebar-collapsed");
			if (menuToggleBtn) menuToggleBtn.textContent = "»";
		}

		// LocalStorage aktualisieren
		localStorage.setItem("sidebarCollapsed", !wasCollapsed);

		// Layout aktualisieren
		if (window.hangarUI && window.hangarUI.adjustScaling) {
			setTimeout(window.hangarUI.adjustScaling, 50);
		}

		console.log(
			"Sidebar-Status manuell umgeschaltet:",
			wasCollapsed ? "→ Ausgeklappt" : "→ Eingeklappt"
		);
		return !wasCollapsed;
	},

	// Fügt einen sichtbaren Notfall-Toggle-Button zur Seite hinzu
	addEmergencyToggleButton: function () {
		const btn = document.createElement("button");
		btn.innerText = "Sidebar Toggle (Notfall)";
		btn.style.cssText =
			"position:fixed;bottom:20px;left:20px;z-index:9999;padding:10px;background:#ff7043;color:white;border:none;border-radius:4px;";
		btn.onclick = this.toggleSidebarManually;
		document.body.appendChild(btn);
		console.log("Notfall-Toggle-Button zur Seite hinzugefügt");
	},

	// Notfallfunktion zum Zurücksetzen der Sidebar
	resetSidebarState: function () {
		try {
			// Sidebar-Status im localStorage zurücksetzen
			localStorage.removeItem("sidebarCollapsed");
			localStorage.setItem("sidebarCollapsed", "false");

			// Body-Klasse direkt entfernen
			document.body.classList.remove("sidebar-collapsed");

			// Toggle-Button Text aktualisieren
			const menuToggleBtn = document.getElementById("menuToggle");
			if (menuToggleBtn) {
				menuToggleBtn.textContent = "«";
				menuToggleBtn.setAttribute("title", "Menü einklappen");
			}

			// Direkte CSS-Manipulation für den Fall, dass andere Methoden fehlschlagen
			const sidebar = document.getElementById("sidebarMenu");
			if (sidebar) {
				sidebar.style.width = "320px";
				sidebar.style.minWidth = "320px";
				sidebar.style.opacity = "1";
				sidebar.style.visibility = "visible";
			}

			// Sidebar-Content sichtbar machen
			const sidebarContent = document.querySelector(".sidebar-content");
			if (sidebarContent) {
				sidebarContent.style.opacity = "1";
				sidebarContent.style.visibility = "visible";
			}

			console.log("Sidebar wurde auf ausgeklappt zurückgesetzt");

			// Layout neu berechnen
			if (window.hangarUI && window.hangarUI.adjustScaling) {
				setTimeout(window.hangarUI.adjustScaling, 100);
			}

			return "Sidebar erfolgreich zurückgesetzt";
		} catch (error) {
			console.error("Fehler beim Zurücksetzen der Sidebar:", error);
			return "Fehler beim Zurücksetzen der Sidebar: " + error.message;
		}
	},
};

// Automatische Ausführung beim Laden
document.addEventListener("DOMContentLoaded", function () {
	// Status beim Laden überprüfen
	setTimeout(() => {
		window.debugHelpers.checkSidebarStatus();
	}, 1000);

	// Tastaturabruf für Debugging-Funktionen einrichten
	document.addEventListener("keydown", function (e) {
		// Alt+Shift+D drücken, um Debugging-Funktionen zu aktivieren
		if (e.altKey && e.shiftKey && e.key === "D") {
			window.debugHelpers.addEmergencyToggleButton();
			alert(
				"Debugging-Funktionen aktiviert. Notfall-Toggle-Button wurde hinzugefügt."
			);
		}
	});
});

console.log(
	"Debug-Helfer geladen - Drücken Sie Alt+Shift+D für Notfall-Sidebar-Toggle"
);

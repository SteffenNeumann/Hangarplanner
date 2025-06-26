#!/usr/bin/env node

const puppeteer = require("puppeteer");
const path = require("path");

async function testTimeSync() {
	const browser = await puppeteer.launch({
		headless: false,
		devtools: true,
		slowMo: 250,
	});

	try {
		const page = await browser.newPage();
		const testUrl = `file://${path.join(__dirname, "time-sync-test.html")}`;

		console.log("🚀 Lade Zeit-Synchronisations-Test...");
		await page.goto(testUrl);

		// Warte auf vollständiges Laden
		await page.waitForTimeout(2000);

		console.log("⏰ Setze Test-Zeiten...");
		await page.click('button[onclick="setTestTimes()"]');
		await page.waitForTimeout(1000);

		// Prüfe, ob Zeiten gesetzt wurden
		const arrivalTime = await page.evaluate(() => {
			return document.getElementById("arrival-time-1")?.value;
		});
		const departureTime = await page.evaluate(() => {
			return document.getElementById("departure-time-1")?.value;
		});

		console.log(`📅 Master Ankunftszeit: ${arrivalTime}`);
		console.log(`📅 Master Abflugzeit: ${departureTime}`);

		if (!arrivalTime || !departureTime) {
			throw new Error("Test-Zeiten konnten nicht gesetzt werden!");
		}

		console.log("🔄 Führe Synchronisation durch...");
		await page.click('button[onclick="performSync()"]');
		await page.waitForTimeout(2000);

		// Prüfe Slave-Werte
		const slaveData = await page.evaluate(() => {
			return {
				aircraft: document.getElementById("aircraft-101")?.value,
				position: document.getElementById("hangar-position-101")?.value,
				arrivalTime: document.getElementById("arrival-time-101")?.value,
				departureTime: document.getElementById("departure-time-101")?.value,
				status: document.getElementById("status-101")?.value,
				towStatus: document.getElementById("tow-status-101")?.value,
			};
		});

		console.log("\n=== SYNCHRONISATION ERGEBNIS ===");
		console.log(
			`✈️  Aircraft ID: ${slaveData.aircraft} ${
				slaveData.aircraft ? "✅" : "❌"
			}`
		);
		console.log(
			`📍 Position: ${slaveData.position} ${slaveData.position ? "✅" : "❌"}`
		);
		console.log(
			`⏰ Ankunftszeit: ${slaveData.arrivalTime} ${
				slaveData.arrivalTime && slaveData.arrivalTime !== "--:--" ? "✅" : "❌"
			}`
		);
		console.log(
			`⏰ Abflugzeit: ${slaveData.departureTime} ${
				slaveData.departureTime && slaveData.departureTime !== "--:--"
					? "✅"
					: "❌"
			}`
		);
		console.log(
			`📊 Status: ${slaveData.status} ${slaveData.status ? "✅" : "❌"}`
		);
		console.log(
			`🚚 Tow Status: ${slaveData.towStatus} ${
				slaveData.towStatus ? "✅" : "❌"
			}`
		);

		// Bewerte Ergebnis
		const success =
			slaveData.aircraft &&
			slaveData.position &&
			slaveData.arrivalTime &&
			slaveData.arrivalTime !== "--:--" &&
			slaveData.departureTime &&
			slaveData.departureTime !== "--:--";

		if (success) {
			console.log("\n🎉 ZEIT-SYNCHRONISATION ERFOLGREICH!");
		} else {
			console.log("\n❌ ZEIT-SYNCHRONISATION FEHLGESCHLAGEN!");

			// Hole Logs aus der Seite
			const logs = await page.evaluate(() => {
				const logContainer = document.getElementById("testLog");
				return logContainer ? logContainer.textContent : "Keine Logs verfügbar";
			});

			console.log("\n📋 Test-Logs:");
			console.log(logs);
		}

		// Halte Browser für Inspektion offen
		console.log("\n🔍 Browser bleibt für Inspektion geöffnet...");
		await page.waitForTimeout(30000);
	} catch (error) {
		console.error("❌ Test-Fehler:", error);
	} finally {
		await browser.close();
	}
}

if (require.main === module) {
	testTimeSync().catch(console.error);
}

module.exports = { testTimeSync };

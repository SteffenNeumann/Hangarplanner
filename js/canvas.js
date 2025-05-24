document.addEventListener("DOMContentLoaded", () => {
	// Canvas-Initialisierung
	const canvas = document.getElementById("mainCanvas");
	const ctx = canvas.getContext("2d");
	const propertiesPanel = document.getElementById("propertiesPanel");

	// Canvas Größe anpassen
	function resizeCanvas() {
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
		redrawCanvas();
	}

	window.addEventListener("resize", resizeCanvas);
	resizeCanvas();

	// Objekte und Zustandsvariablen
	let shapes = [];
	let currentShape = null;
	let selectedShape = null;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let currentMode = "select"; // 'select', 'rectangle', 'circle', etc.

	// Form-Klasse
	class Shape {
		constructor(type, x, y, width, height, color = "#EF8354") {
			this.type = type;
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
			this.color = color;
		}

		draw() {
			ctx.fillStyle = this.color;

			switch (this.type) {
				case "rectangle":
					ctx.fillRect(this.x, this.y, this.width, this.height);
					break;
				case "circle":
					ctx.beginPath();
					ctx.arc(
						this.x + this.width / 2,
						this.y + this.height / 2,
						Math.min(this.width, this.height) / 2,
						0,
						Math.PI * 2
					);
					ctx.fill();
					break;
				case "triangle":
					ctx.beginPath();
					ctx.moveTo(this.x + this.width / 2, this.y);
					ctx.lineTo(this.x + this.width, this.y + this.height);
					ctx.lineTo(this.x, this.y + this.height);
					ctx.closePath();
					ctx.fill();
					break;
				case "line":
					ctx.beginPath();
					ctx.moveTo(this.x, this.y);
					ctx.lineTo(this.x + this.width, this.y + this.height);
					ctx.lineWidth = 3;
					ctx.strokeStyle = this.color;
					ctx.stroke();
					break;
			}

			// Wenn ausgewählt, zeichne Auswahlrahmen
			if (this === selectedShape) {
				ctx.strokeStyle = "#3182CE";
				ctx.lineWidth = 2;
				ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);

				// Eckpunkte für Größenänderung
				ctx.fillStyle = "#3182CE";
				[
					[this.x - 5, this.y - 5],
					[this.x + this.width + 5, this.y - 5],
					[this.x - 5, this.y + this.height + 5],
					[this.x + this.width + 5, this.y + this.height + 5],
				].forEach(([x, y]) => {
					ctx.fillRect(x - 3, y - 3, 6, 6);
				});
			}
		}

		isPointInside(x, y) {
			switch (this.type) {
				case "rectangle":
					return (
						x >= this.x &&
						x <= this.x + this.width &&
						y >= this.y &&
						y <= this.y + this.height
					);
				case "circle":
					const cx = this.x + this.width / 2;
					const cy = this.y + this.height / 2;
					const radius = Math.min(this.width, this.height) / 2;
					return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= radius;
				case "triangle":
					// Vereinfachte Punkt-im-Dreieck-Prüfung
					if (
						x < this.x ||
						x > this.x + this.width ||
						y < this.y ||
						y > this.y + this.height
					) {
						return false;
					}

					const p1 = { x: this.x + this.width / 2, y: this.y };
					const p2 = { x: this.x + this.width, y: this.y + this.height };
					const p3 = { x: this.x, y: this.y + this.height };

					// Punkt-im-Dreieck-Test
					const area =
						0.5 *
						Math.abs(
							(p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
						);
					const area1 =
						0.5 * Math.abs((p1.x - x) * (p2.y - y) - (p2.x - x) * (p1.y - y));
					const area2 =
						0.5 * Math.abs((p2.x - x) * (p3.y - y) - (p3.x - x) * (p2.y - y));
					const area3 =
						0.5 * Math.abs((p3.x - x) * (p1.y - y) - (p1.x - x) * (p3.y - y));

					return Math.abs(area - (area1 + area2 + area3)) < 0.01;
				case "line":
					// Vereinfachte Prüfung, ob Punkt nahe der Linie liegt
					const lineStart = { x: this.x, y: this.y };
					const lineEnd = { x: this.x + this.width, y: this.y + this.height };

					// Abstand Punkt zu Linie
					const length = Math.sqrt(
						(lineEnd.x - lineStart.x) ** 2 + (lineEnd.y - lineStart.y) ** 2
					);
					const distance =
						Math.abs(
							(lineEnd.y - lineStart.y) * x -
								(lineEnd.x - lineStart.x) * y +
								lineEnd.x * lineStart.y -
								lineEnd.y * lineStart.x
						) / length;

					// Punkt muss innerhalb der Liniensegmentgrenzen liegen
					const dotproduct =
						(x - lineStart.x) * (lineEnd.x - lineStart.x) +
						(y - lineStart.y) * (lineEnd.y - lineStart.y);
					const squaredlength = length * length;

					return distance < 5 && dotproduct >= 0 && dotproduct <= squaredlength;
			}
			return false;
		}
	}

	// Canvas neu zeichnen
	function redrawCanvas() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		shapes.forEach((shape) => shape.draw());
	}

	// Form-Buttons Event-Handler
	document.querySelectorAll(".form-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			currentMode = btn.getAttribute("data-shape");
			// Visuelle Feedback
			document
				.querySelectorAll(".form-btn")
				.forEach((b) => b.classList.remove("ring-2", "ring-industrial-accent"));
			btn.classList.add("ring-2", "ring-industrial-accent");

			// Aktuelle Auswahl zurücksetzen
			selectShape(null);
		});
	});

	// Canvas Event-Handler
	canvas.addEventListener("mousedown", (e) => {
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (currentMode === "select") {
			// Versuchen, eine Form zu selektieren
			const clickedShape = shapes
				.slice()
				.reverse()
				.find((shape) => shape.isPointInside(x, y));

			if (clickedShape) {
				selectShape(clickedShape);
				isDragging = true;
				dragStartX = x - clickedShape.x;
				dragStartY = y - clickedShape.y;
			} else {
				selectShape(null);
			}
		} else {
			// Neue Form erstellen
			createNewShape(x, y);
		}
	});

	canvas.addEventListener("mousemove", (e) => {
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (isDragging && selectedShape) {
			selectedShape.x = x - dragStartX;
			selectedShape.y = y - dragStartY;
			updatePropertiesPanelValues();
			redrawCanvas();
		} else if (currentShape) {
			currentShape.width = x - currentShape.x;
			currentShape.height = y - currentShape.y;

			// Mindestgröße festlegen
			currentShape.width = Math.max(10, currentShape.width);
			currentShape.height = Math.max(10, currentShape.height);

			redrawCanvas();
		}
	});

	canvas.addEventListener("mouseup", () => {
		if (currentShape) {
			shapes.push(currentShape);
			selectShape(currentShape);
			currentShape = null;
		}
		isDragging = false;
	});

	// Neue Form erstellen
	function createNewShape(x, y) {
		currentShape = new Shape(currentMode, x, y, 0, 0);
		redrawCanvas();
	}

	// Form auswählen und Eigenschaften-Panel aktualisieren
	function selectShape(shape) {
		selectedShape = shape;

		if (shape) {
			propertiesPanel.classList.remove("hidden");
			updatePropertiesPanelValues();
		} else {
			propertiesPanel.classList.add("hidden");
		}

		redrawCanvas();
	}

	// Eigenschaften-Panel mit aktuellen Werten aktualisieren
	function updatePropertiesPanelValues() {
		if (!selectedShape) return;

		document.getElementById("posX").value = Math.round(selectedShape.x);
		document.getElementById("posY").value = Math.round(selectedShape.y);
		document.getElementById("width").value = Math.round(selectedShape.width);
		document.getElementById("height").value = Math.round(selectedShape.height);
		document.getElementById("color").value = selectedShape.color;
	}

	// Eigenschaften-Panel Event-Handler
	document.getElementById("posX").addEventListener("change", (e) => {
		if (selectedShape) {
			selectedShape.x = parseFloat(e.target.value);
			redrawCanvas();
		}
	});

	document.getElementById("posY").addEventListener("change", (e) => {
		if (selectedShape) {
			selectedShape.y = parseFloat(e.target.value);
			redrawCanvas();
		}
	});

	document.getElementById("width").addEventListener("change", (e) => {
		if (selectedShape) {
			selectedShape.width = parseFloat(e.target.value);
			redrawCanvas();
		}
	});

	document.getElementById("height").addEventListener("change", (e) => {
		if (selectedShape) {
			selectedShape.height = parseFloat(e.target.value);
			redrawCanvas();
		}
	});

	document.getElementById("color").addEventListener("input", (e) => {
		if (selectedShape) {
			selectedShape.color = e.target.value;
			redrawCanvas();
		}
	});

	// Speicher- und Ladefunktionalität
	document.getElementById("saveBtn").addEventListener("click", saveProject);
	document.getElementById("loadBtn").addEventListener("click", () => {
		document.getElementById("loadModal").classList.remove("hidden");
		loadProjectsList();
	});

	document.getElementById("cancelLoad").addEventListener("click", () => {
		document.getElementById("loadModal").classList.add("hidden");
	});

	document.getElementById("confirmLoad").addEventListener("click", loadProject);

	function saveProject() {
		const projectName =
			document.getElementById("projectName").value.trim() ||
			"Projekt_" + new Date().toISOString().replace(/[:.]/g, "-");

		const projectData = {
			name: projectName,
			shapes: shapes,
			date: new Date().toISOString(),
		};

		// Im localStorage speichern
		localStorage.setItem(
			`hangarplanner_${projectName}`,
			JSON.stringify(projectData)
		);

		// Erfolgsmeldung
		alert(`Projekt "${projectName}" wurde gespeichert.`);

		// Liste der Projekte aktualisieren
		loadProjectsList();
	}

	function loadProject() {
		const projectName = document.getElementById("loadProjectName").value.trim();
		const projectData = localStorage.getItem(`hangarplanner_${projectName}`);

		if (projectData) {
			const data = JSON.parse(projectData);

			// Shapes neu erstellen (weil JSON die Methoden nicht speichert)
			shapes = data.shapes.map((s) => {
				return new Shape(s.type, s.x, s.y, s.width, s.height, s.color);
			});

			document.getElementById("projectName").value = data.name;

			redrawCanvas();
			selectShape(null);
			document.getElementById("loadModal").classList.add("hidden");
		} else {
			alert(`Projekt "${projectName}" wurde nicht gefunden.`);
		}
	}

	function loadProjectsList() {
		const projectsList = document.getElementById("projectsList");
		projectsList.innerHTML = "";

		// Alle gespeicherten Projekte durchsuchen
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);

			if (key.startsWith("hangarplanner_")) {
				const projectName = key.replace("hangarplanner_", "");
				const projectData = JSON.parse(localStorage.getItem(key));
				const date = new Date(projectData.date);
				const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

				const li = document.createElement("li");
				li.className =
					"bg-industrial-dark p-2 rounded cursor-pointer hover:bg-opacity-80";
				li.innerHTML = `
                    <div class="font-medium">${projectName}</div>
                    <div class="text-xs text-industrial-light">${formattedDate}</div>
                `;

				li.addEventListener("click", () => {
					document.getElementById("loadProjectName").value = projectName;
					loadProject();
				});

				projectsList.appendChild(li);
			}
		}
	}

	// Initial die Liste der Projekte laden
	loadProjectsList();
});

import { RadialBarChart } from "./radialChart.js";
import { LineChartGrid, actualitzarOmbraHora } from "./lineChartGrid.js";
import {
  tick,
  startTimeAnimation,
  stopTimeAnimation,
  setupManualSliderSync,
  setupSpeedControl
} from "./timeController.js";
import { inicialitzarRaceChart } from "./barChartRace.js";
import { StreamGraph } from "./StreamGraph.js";
import { MapaMultes, updateMapaHora } from "./mapa.js";
import { HeatmapWeek } from "./HeatmapWeek.js";

// Mostrar només el missatge de càrrega
document.getElementById("loading-message").style.display = "block";
document.getElementById("app").style.display = "none";

// Crear el worker
const worker = new Worker("js/worker.js");
worker.postMessage("/dades_final.csv");

// Selectors globals (fora de condicions)
const customTotal = document.getElementById("custom-total");
const customVehicle = document.getElementById("custom-vehicle");
const customOrigen = document.getElementById("custom-origen");
const customVehicleLabel = document.getElementById("custom-vehicle-label");
const customOrigenLabel = document.getElementById("custom-origen-label");

// Esperar que el worker estigui llest
worker.addEventListener("message", e => {
  const data = e.data;

  if (data.ready) {
    //console.log("✅ Worker llest! Dades carregades.");
    document.getElementById("loading-message").style.display = "none";
    document.getElementById("app").style.display = "block";

    // Inici rellotge
    document.getElementById("play").click();
    document.getElementById("time-slider").value = 0;
    document.getElementById("clock-time").textContent = "00:00";
    document.getElementById("play").addEventListener("click", startTimeAnimation);
    document.getElementById("pause").addEventListener("click", stopTimeAnimation);
    setupManualSliderSync(); 
    setupSpeedControl();
    startTimeAnimation();

    // Radial Chart
    if (data.radialData) {
      inicialitzarVisualitzacions(Array.from(data.radialData));
    }

    // Race Chart
    if (data.raceData) {
      inicialitzarRaceChart(data.raceData);
    }

    // Line Chart Grid
    if (Array.isArray(data.lineData)) {
      LineChartGrid("#LineChartGrid", data.lineData);
    }

    // StreamGraph
    if (Array.isArray(data.streamData)) {
      const stream = StreamGraph("#streamgraph", data.streamData);
      window.updateStreamHour = stream.updateHour;
    }

    // Mapa
    if (Array.isArray(data.heatmapData)) {
      MapaMultes("mapa", data.heatmapData, data.heatmapPerVehicle, data.heatmapPerAgent);
      window.updateMapaHora = updateMapaHora;

      // VEHICLES
      const vehicles = data.vehiclesUnics || [];
      const vehicleSelect = document.getElementById("vehicle-filter");
      vehicleSelect.innerHTML = "";

      vehicles.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        vehicleSelect.appendChild(opt);

        const opt2 = opt.cloneNode(true);
        customVehicle.appendChild(opt2);
      });

      vehicleSelect.addEventListener("change", e => {
        if (window.setVehicleFilter) {
          window.setVehicleFilter(e.target.value);
        }
      });

      // AGENTS
      const agents = data.agentsUnics || [];
      const agentSelect = document.getElementById("agent-filter");
      agentSelect.innerHTML = "";

      agents.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a;
        opt.textContent = a;
        agentSelect.appendChild(opt);

        const opt2 = opt.cloneNode(true);
        customOrigen.appendChild(opt2);
      });

      agentSelect.addEventListener("change", e => {
        if (window.setAgentFilter) {
          window.setAgentFilter(e.target.value);
        }
      });

      // Mostrar/ocultar selectors segons custom-total
      function actualitzarVisibilitatSelectors(valor) {
        customVehicle.style.display = "none";
        customVehicleLabel.style.display = "none";
        customOrigen.style.display = "none";
        customOrigenLabel.style.display = "none";

        if (valor === "mes50") {
          customVehicle.style.display = "inline-block";
          customVehicleLabel.style.display = "inline-block";
        } else if (valor === "mes100") {
          customOrigen.style.display = "inline-block";
          customOrigenLabel.style.display = "inline-block";
        }
      }

      customTotal.addEventListener("change", e => {
        actualitzarVisibilitatSelectors(e.target.value);
        updateHeatmapWeek(); // actualitza també el heatmap
      });

      customVehicle.addEventListener("change", updateHeatmapWeek);
      customOrigen.addEventListener("change", updateHeatmapWeek);

      actualitzarVisibilitatSelectors(customTotal.value);

      // HeatmapWeek
      const heatmapWeek = HeatmapWeek(
        "#heatmap-week",
        data.heatmapWeekData,
        data.groupedTotal,
        data.groupedByVehicle,
        data.groupedByAgent
      );

      function updateHeatmapWeek() {
        const metric = customTotal.value;
        let valor = null;

        if (metric === "mes50") {
          valor = customVehicle.value;
        } else if (metric === "mes100") {
          valor = customOrigen.value;
        }

        heatmapWeek.update(metric === "totes" ? "total" : metric === "mes50" ? "vehicle" : "agent", valor);
      }

      updateHeatmapWeek();
    }
  }

  if (data.error) {
    //console.error("❌ Error del worker:", data.error);
    document.getElementById("loading-message").textContent = "❌ Error en carregar les dades.";
  }
});

function inicialitzarVisualitzacions(radialData) {
  RadialBarChart("#radial-container", Array.isArray(radialData) ? radialData : Array.from(radialData));
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}


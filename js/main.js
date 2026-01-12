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

let streamChart = null;
let heatmap = null;


// Mostrar només el missatge de càrrega
document.getElementById("loading-message").style.display = "block";
document.getElementById("app").style.display = "none";

// Selectors globals (fora de condicions)
const heatmapMode = document.getElementById("custom-total");
const heatmapVehicle = document.getElementById("custom-vehicle");
const heatmapAgent = document.getElementById("custom-origen");
const heatmapVehicleLabel = document.getElementById("custom-vehicle-label");
const heatmapAgentLabel = document.getElementById("custom-origen-label");


let dadesCarregades = null;

function agruparICount(data, ...claus) {
  const mapa = new Map();
  for (const d of data) {
    let nivell = mapa;
    for (let i = 0; i < claus.length - 1; i++) {
      const clau = d[claus[i]];
      if (!nivell.has(clau)) nivell.set(clau, new Map());
      nivell = nivell.get(clau);
    }
    const ultimaClau = d[claus[claus.length - 1]];
    const valorAnterior = nivell.get(ultimaClau) || 0;
    nivell.set(ultimaClau, valorAnterior + d.count);
  }
  return mapa;
}


window.addEventListener("DOMContentLoaded", () => {
  if (!dadesCarregades) {
    const worker = new Worker("js/worker_1.js");
    worker.postMessage("inicia");

    worker.onmessage = (e) => {
      const data = e.data;

      if (data?.type === "dadesCombinades" && data.ready) {
        console.log("✅ Dades rebudes:", {
          radial: data.radialData?.length,
          race: data.raceData?.length,
          stream: data.streamData?.length,
          line: data.lineChartData?.length,
          mapaTotals: data.totals?.length,
          mapaPerVehicle: data.perVehicle?.length,
          mapaPerAgent: data.perAgent?.length,
          heatmapTotal: data.groupedTotal?.size, 
          heatmapVehicle: data.groupedByVehicle?.size, 
          heatmapAgent: data.groupedByAgent?.size
        });

        dadesCarregades = true;

        document.getElementById("loading-message").style.display = "none";
        document.getElementById("app").style.display = "block";

        // Radial Chart
        if (Array.isArray(data.radialData)) {
          const radial = RadialBarChart("#radial-container", data.radialData);
          window.updateActiveHour = radial.updateActiveHour;
        }

        // Race Chart
        if (Array.isArray(data.raceData)) {
          inicialitzarRaceChart(data.raceData);
        }

        // Streamgraph
        if (Array.isArray(data.streamData)) {
          streamChart = StreamGraph("#streamgraph", data.streamData);
          window.updateStreamHour = streamChart.updateHour;
        }

        // LineChart
        if (Array.isArray(data.lineChartData)) {
          const lineChart = LineChartGrid("#LineChartGrid", data.lineChartData);
          window.updateLineChartHour = lineChart.updateHour;
        }

        // Mapa
        if (Array.isArray(data.totals) && Array.isArray(data.perVehicle) && Array.isArray(data.perAgent)) {
          MapaMultes("mapa", data.totals, data.perVehicle, data.perAgent);
          window.updateMapaHora = updateMapaHora;
          omplirSelectorsMapa(data.perVehicle, data.perAgent);
        }

        // Heatmap Week
        if (data.heatmapData?.total && data.heatmapData?.byVehicle && data.heatmapData?.byAgent) {
          const groupedTotal = agruparICount(data.heatmapData.total, "dia", "hora");
          const groupedByVehicle = agruparICount(data.heatmapData.byVehicle, "vehicle", "dia", "hora");
          const groupedByAgent = agruparICount(data.heatmapData.byAgent, "agent", "dia", "hora");
          heatmap = HeatmapWeek("#heatmap-week", null, groupedTotal, groupedByVehicle, groupedByAgent);
          heatmap.update("total");
          window.updateHeatmap = heatmap.update;
        }

        const vehicleOptions = new Set(data.heatmapData.byVehicle.map(d => d.vehicle));
        const agentOptions = new Set(data.heatmapData.byAgent.map(d => d.agent));

        vehicleOptions.forEach(v => {
          const opt = document.createElement("option");
          opt.value = opt.textContent = v;
          heatmapVehicle.appendChild(opt);
        });

        agentOptions.forEach(a => {
          const opt = document.createElement("option");
          opt.value = opt.textContent = a;
          heatmapAgent.appendChild(opt);
        });

        heatmapMode.addEventListener("change", () => {
          const mode = heatmapMode.value;

          if (mode === "totes") {
            heatmapVehicle.style.display = "none";
            heatmapVehicleLabel.style.display = "none";
            heatmapAgent.style.display = "none";
            heatmapAgentLabel.style.display = "none";
            heatmap.update("total");
          }

          if (mode === "mes50") {
            heatmapVehicle.style.display = "inline-block";
            heatmapVehicleLabel.style.display = "inline-block";
            heatmapAgent.style.display = "none";
            heatmapAgentLabel.style.display = "none";
            const selected = heatmapVehicle.value;
            if (selected) heatmap.update("vehicle", selected);
          }

          if (mode === "mes100") {
            heatmapVehicle.style.display = "none";
            heatmapVehicleLabel.style.display = "none";
            heatmapAgent.style.display = "inline-block";
            heatmapAgentLabel.style.display = "inline-block";
            const selected = heatmapAgent.value;
            if (selected) heatmap.update("agent", selected);
          }
        });

        heatmapVehicle.addEventListener("change", () => {
          const selected = heatmapVehicle.value;
          heatmap.update("vehicle", selected);
        });

        heatmapAgent.addEventListener("change", () => {
          const selected = heatmapAgent.value;
          heatmap.update("agent", selected);
        });



        // Controls de temps
        document.getElementById("play").click();
        document.getElementById("time-slider").value = 0;
        document.getElementById("clock-time").textContent = "00:00";
        document.getElementById("play").addEventListener("click", startTimeAnimation);
        document.getElementById("pause").addEventListener("click", stopTimeAnimation);
        setupManualSliderSync();
        setupSpeedControl();
        startTimeAnimation();
      }

      if (data?.error) {
        console.error("❌ Error del worker:", data.error);
        document.getElementById("loading-message").textContent = "❌ Error en carregar les dades.";
      }
    };
  }
});

function omplirSelectorsMapa(perVehicle, perAgent) {
  const vehicleSet = new Set(perVehicle.map(d => d.vehicle));
  const agentSet = new Set(perAgent.map(d => d.agent));

  const vehicleSelect = document.getElementById("vehicle-filter");
  const agentSelect = document.getElementById("agent-filter");

  vehicleSet.forEach(v => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = v;
    vehicleSelect.appendChild(opt);
  });  
   

  agentSet.forEach(a => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = a;
    agentSelect.appendChild(opt);
  });

  vehicleSelect.addEventListener("change", e => setVehicleFilter(e.target.value));
  agentSelect.addEventListener("change", e => setAgentFilter(e.target.value));
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

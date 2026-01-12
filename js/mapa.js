let map, heatLayer;
let heatDataTotals = new Map();         // hora → [[lat, lon, count]]
let heatDataPerVehicle = new Map();     // hora → vehicle → [[lat, lon, count]]
let heatDataPerAgent = new Map();       // hora → agent → [[lat, lon, count]]

let currentMode = "total";
let currentVehicle = null;
let currentAgent = null;
let currentHour = 0;

export function MapaMultes(containerId, totals, perVehicle, perAgent) {
  // Agrupar dades totals per hora
  totals.forEach(d => {
    const h = String(d.hora).padStart(2, "0");
    if (!heatDataTotals.has(h)) heatDataTotals.set(h, []);
    heatDataTotals.get(h).push([d.lat, d.lon, d.count]);
  });

  // Agrupar per vehicle
  perVehicle.forEach(d => {
    const h = String(d.hora).padStart(2, "0");
    if (!heatDataPerVehicle.has(h)) heatDataPerVehicle.set(h, new Map());
    const vehicleMap = heatDataPerVehicle.get(h);
    if (!vehicleMap.has(d.vehicle)) vehicleMap.set(d.vehicle, []);
    vehicleMap.get(d.vehicle).push([d.lat, d.lon, d.count]);
  });

  // Agrupar per agent
  perAgent.forEach(d => {
    const h = String(d.hora).padStart(2, "0");
    if (!heatDataPerAgent.has(h)) heatDataPerAgent.set(h, new Map());
    const agentMap = heatDataPerAgent.get(h);
    if (!agentMap.has(d.agent)) agentMap.set(d.agent, []);
    agentMap.get(d.agent).push([d.lat, d.lon, d.count]);
  });

  // Inicialitzar valors per defecte
  if (!currentVehicle) {
    const primerHora = Array.from(heatDataPerVehicle.keys())[0];
    const vehicleMap = heatDataPerVehicle.get(primerHora);
    if (vehicleMap) currentVehicle = Array.from(vehicleMap.keys())[0];
  }

  if (!currentAgent) {
    const primerHora = Array.from(heatDataPerAgent.keys())[0];
    const agentMap = heatDataPerAgent.get(primerHora);
    if (agentMap) currentAgent = Array.from(agentMap.keys())[0];
  }

  // Inicialitzar mapa
  map = L.map(containerId).setView([41.387, 2.17], 13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© CARTO"
  }).addTo(map);

  heatLayer = L.heatLayer([], {
    radius: 20,
    blur: 15,
    maxZoom: 17,
    gradient: {
      0.0: "#ffffb2", 
      0.4: "#fecc5c", 
      0.7: "#fd8d3c", 
      1.0: "#e31a1c"
    }
  }).addTo(map);
  


  updateMapaHora(0);

  // Canvi de mode
  document.getElementById("map-mode").addEventListener("change", e => {
    currentMode = e.target.value;

    const vehicleFilter = document.getElementById("vehicle-filter");
    const vehicleLabel = document.getElementById("vehicle-filter-label");
    const agentFilter = document.getElementById("agent-filter");
    const agentLabel = document.getElementById("agent-filter-label");

    const mostrar = (el, visible) => el.style.display = visible ? "inline" : "none";

    mostrar(vehicleFilter, currentMode === "vehicle");
    mostrar(vehicleLabel, currentMode === "vehicle");
    mostrar(agentFilter, currentMode === "agent");
    mostrar(agentLabel, currentMode === "agent");

    updateMapaHora(currentHour);
  });
}

export function updateMapaHora(hora) {
  currentHour = hora;
  const h = String(hora).padStart(2, "0");

  let punts = [];

  if (currentMode === "total") {
    punts = heatDataTotals.get(h) || [];
  } else if (currentMode === "vehicle") {
    const vehicleMap = heatDataPerVehicle.get(h);
    if (!vehicleMap || !currentVehicle) {
      //console.warn("⚠️ Vehicle no disponible per a l'hora", h);
      return heatLayer.setLatLngs([]);
    }
    punts = vehicleMap.get(currentVehicle) || [];
  } else if (currentMode === "agent") {
    const agentMap = heatDataPerAgent.get(h);
    if (!agentMap || !currentAgent) {
      //console.warn("⚠️ Agent no disponible per a l'hora", h);
      return heatLayer.setLatLngs([]);
    }
    punts = agentMap.get(currentAgent) || [];
  }

  heatLayer.setLatLngs(punts);
}

export function setVehicleFilter(vehicle) {
  currentVehicle = vehicle;
  updateMapaHora(currentHour);
}
window.setVehicleFilter = setVehicleFilter;

export function setAgentFilter(agent) {
  currentAgent = agent;
  updateMapaHora(currentHour);
}
window.setAgentFilter = setAgentFilter;

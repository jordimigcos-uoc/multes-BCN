self.importScripts("https://d3js.org/d3.v7.min.js");

self.onmessage = async function (e) {
  if (e.data !== "inicia") return;

  console.log("Worker iniciat per carregar dades");

  try {
    // 🔹 1. Radial Chart
    const radialURL = "https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_hora.csv";
    const radialText = await (await fetch(radialURL)).text();
    const radialData = d3.csvParse(radialText, d => ({
      Hora: d.Hora,
      total_multes: +d.total_multes
    }));
    console.log("Radial chart carregat:", radialData.length, "franges horàries");

    // 🔹 2. Race Chart
    const raceURL = "https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_hora_districte.csv";
    const raceText = await (await fetch(raceURL)).text();
    const raceData = d3.csvParse(raceText, d => ({
      districte: d.Nom_Districte,
      hora: d.Hora.padStart(2, "0"),
      count: +d.total_multes
    }));
    console.log("Race chart carregat:", raceData.length, "files");

    // 🔹 3. Streamchart
    const streamURL = "https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_vehicle.csv";
    const streamText = await (await fetch(streamURL)).text();
    const streamData = d3.csvParse(streamText, d => ({
      Hora: d.Hora,
      Grup_Vehicle: d.Grup_Vehicle,
      total_multes: +d.total_multes
    }));
    console.log("Streamchart carregat:", streamData.length, "files");

    // 🔹 4. LineChart
    const lineChartData = streamData.map(d => ({
      Grup_Vehicle: d.Grup_Vehicle.trim(),
      Hora: `${String(d.Hora).padStart(2, "0")}:00`,
      total_multes: d.total_multes
    }));
    console.log("lineChartData carregat:", lineChartData.length, "files");

    // 🔹 5. Mapa: totals, per vehicle, per agent
    const [totalsText, perVehicleText, perAgentText] = await Promise.all([
      fetch("https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_hora_coords.csv").then(r => r.text()),
      fetch("https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_hora_coords_vehicle.csv").then(r => r.text()),
      fetch("https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_hora_coords_agent.csv").then(r => r.text())
    ]);

    const totals = d3.csvParse(totalsText, d => ({
      hora: d.hora.padStart(2, "0"),
      lat: +d.lat,
      lon: +d.lon,
      count: +d.count
    }));

    const perVehicle = d3.csvParse(perVehicleText, d => ({
      hora: d.hora.padStart(2, "0"),
      lat: +d.lat,
      lon: +d.lon,
      count: +d.count,
      vehicle: d.Grup_Vehicle
    }));

    const perAgent = d3.csvParse(perAgentText, d => ({
      hora: d.hora.padStart(2, "0"),
      lat: +d.lat,
      lon: +d.lon,
      count: +d.count,
      agent: d.Agent
    }));

    console.log("Dades del mapa carregades:", {
      totals: totals.length,
      perVehicle: perVehicle.length,
      perAgent: perAgent.length
    });

    // 🔹 6. Heatmap: setmana i hora
    const [heatTotalText, heatVehicleText, heatAgentText] = await Promise.all([
      fetch("https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_setm_dia.csv").then(r => r.text()),
      fetch("https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_setm_dia_vehicle.csv").then(r => r.text()),
      fetch("https://jordimigcos-uoc.github.io/multes-BCN/data/denuncies_setm_dia_agent.csv").then(r => r.text())
    ]);

    const dataTotal = d3.csvParse(heatTotalText, d => ({
      dia: +d.dia_setmana,
      hora: +d.hora,
      count: +d.count
    }));

    const dataByVehicle = d3.csvParse(heatVehicleText, d => ({
      vehicle: d.Grup_Vehicle,
      dia: +d.dia_setmana,
      hora: +d.hora,
      count: +d.count
    }));

    const dataByAgent = d3.csvParse(heatAgentText, d => ({
      agent: d.Agent,
      dia: +d.dia_setmana,
      hora: +d.hora,
      count: +d.count
    }));

    const groupedTotal = d3.group(dataTotal, d => d.dia, d => d.hora);
    const groupedByVehicle = d3.group(dataByVehicle, d => d.vehicle, d => d.dia, d => d.hora);
    const groupedByAgent = d3.group(dataByAgent, d => d.agent, d => d.dia, d => d.hora);

    console.log("Dades heatmap carregades:", {
      groupedTotal: dataTotal.length,
      groupedByVehicle: dataByVehicle.length,
      groupedByAgent: dataByAgent.length
    });  


    // Enviar totes les dades al main.js
    self.postMessage({
      type: "dadesCombinades",
      ready: true,
      radialData,
      raceData,
      streamData,
      lineChartData,
      totals,
      perVehicle,
      perAgent,
      heatmapData: { 
        total: dataTotal, 
        byVehicle: dataByVehicle, 
        byAgent: dataByAgent 
        }
    });

  } catch (error) {
    console.error("❌ Error carregant dades:", error);
    self.postMessage({
      type: "dadesCombinades",
      ready: false,
      error: error.message
    });
  }
};

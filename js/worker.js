// Carrega D3 per poder fer servir d3.csvParse
self.importScripts("https://d3js.org/d3.v7.min.js");

self.onmessage = async function (e) {
  const msg = e.data;
  console.log("📥 Worker ha rebut:", msg);

  if (typeof msg === "string") {
    try {
      const response = await fetch(msg);
      const text = await response.text();
      const data = d3.csvParse(text);

      // Preprocessar: afegir camp "Minuts" i convertir coordenades
      data.forEach(d => {
        const [h, m] = d.franja_hora.split(":").map(Number);
        d.Minuts = h * 60 + m;
        d.Lat = +d.lat || +d.Lat || null;
        d.Lon = +d.lon || +d.Lon || null;
      });

      // -----------------------------
      // RadialChart
      // -----------------------------
      const multesPerFranja = d3.rollup(
        data,
        v => v.length,
        d => d.franja_hora
      );

      const radialData = Array.from(multesPerFranja, ([franja, count]) => ({
        franja,
        count
      })).sort((a, b) => d3.ascending(a.franja, b.franja));

      // -----------------------------
      // RaceChart
      // -----------------------------
      const hores = Array.from(new Set(data.map(d => d.franja_hora))).sort(d3.ascending);
      const acumulades = new Map();
      const raceData = [];

      hores.forEach(hora => {
        const filtres = data.filter(d => d.franja_hora === hora);
        filtres.forEach(d => {
          const districte = d.Nom_Districte;
          acumulades.set(districte, (acumulades.get(districte) || 0) + 1);
        });
        acumulades.forEach((count, districte) => {
          raceData.push({ hora, districte, count });
        });
      });

      // -----------------------------
      // LineChartGrid
      // -----------------------------
      const multesPerVehicleHora = d3.rollups(
        data,
        v => v.length,
        d => d.Grup_Vehicle,
        d => d.franja_hora
      );

      const lineData = [];
      multesPerVehicleHora.forEach(([vehicle, horesArray]) => {
        horesArray.forEach(([hora, count]) => {
          lineData.push({ vehicle, hora, count });
        });
      });

      // -----------------------------
      // StreamGraph
      // -----------------------------
      const streamData = [];
      multesPerVehicleHora.forEach(([vehicle, horesArray]) => {
        horesArray.forEach(([hora, count]) => {
          streamData.push({
            Grup_Vehicle: vehicle,
            Hora: +hora.split(":")[0],
            total_multes: +count
          });
        });
      });

      // -----------------------------
      // Heatmap per hora i vehicle
      // -----------------------------
      const heatmapPerVehicle = [];

      const multesPerHoraCoordVehicle = d3.rollups(
        data,
        v => v.length,
        d => d.franja_hora?.split(":")[0]?.padStart(2, "0") || "00",
        d => d.Grup_Vehicle,
        d => `${d.Lat},${d.Lon}`
      );

      multesPerHoraCoordVehicle.forEach(([hora, vehicles]) => {
        vehicles.forEach(([vehicle, coords]) => {
          const ordenat = coords
            .map(([coord, count]) => {
              const [lat, lon] = coord.split(",").map(Number);
              return { lat, lon, count };
            })
            .sort((a, b) => b.count - a.count);

          const total = d3.sum(ordenat, d => d.count);
          let acumulat = 0;

          for (const d of ordenat) {
            acumulat += d.count;
            heatmapPerVehicle.push({
              hora,
              vehicle,
              lat: d.lat,
              lon: d.lon,
              count: d.count
            });
            if (acumulat >= total * 0.5) break;
          }
        });
      });

      // -----------------------------
      // Heatmap totals per hora
      // -----------------------------
      const heatmapData = [];

      const multesPerHoraCoord = d3.rollups(
        data,
        v => v.length,
        d => d.franja_hora?.split(":")[0]?.padStart(2, "0") || "00",
        d => `${d.Lat},${d.Lon}`
      );

      multesPerHoraCoord.forEach(([hora, coords]) => {
        const ordenat = coords
          .map(([coord, count]) => {
            const [lat, lon] = coord.split(",").map(Number);
            return { lat, lon, count };
          })
          .sort((a, b) => b.count - a.count);

        const total = d3.sum(ordenat, d => d.count);
        let acumulat = 0;

        for (const d of ordenat) {
          acumulat += d.count;
          heatmapData.push({ hora, ...d });
          if (acumulat >= total * 0.5) break;
        }
      });

      // -----------------------------
      // Heatmap totals per Agent
      // -----------------------------
      const heatmapPerAgent = [];

      const multesPerHoraAgentCoord = d3.rollups(
        data,
        v => v.length,
        d => d.franja_hora?.split(":")[0]?.padStart(2, "0") || "00",
        d => d.Agent?.trim(),
        d => `${d.Lat},${d.Lon}`
      );

      multesPerHoraAgentCoord.forEach(([hora, agents]) => {
        agents.forEach(([agent, coords]) => {
          const ordenat = coords
            .map(([coord, count]) => {
              const [lat, lon] = coord.split(",").map(Number);
              return { lat, lon, count };
            })
            .filter(d => !isNaN(d.lat) && !isNaN(d.lon))
            .sort((a, b) => b.count - a.count);

          const total = d3.sum(ordenat, d => d.count);
          let acumulat = 0;

          for (const d of ordenat) {
            acumulat += d.count;
            heatmapPerAgent.push({
              hora,
              agent,
              lat: d.lat,
              lon: d.lon,
              count: d.count
            });
            if (acumulat >= total * 0.5) break;
          }
        });
      });

      // -----------------------------
      // HeatmapWeek: agrupació per dia i hora
      // -----------------------------
      function getDiaSetmana(d) {
        const [h, m] = d.franja_hora.split(":").map(Number);
        const data = new Date(d.Data_Infraccio);
        const dia = data.getDay(); // 0 = Diumenge, 1 = Dilluns, ..., 6 = Dissabte
        return dia === 0 ? 6 : dia - 1;
      }

      const groupedTotal = new Map();
      const groupedByVehicle = new Map();
      const groupedByAgent = new Map();

      data.forEach(d => {
        const dia = getDiaSetmana(d);
        const hora = +d.franja_hora.split(":")[0];
        const vehicle = d.Grup_Vehicle;
        const agent = d.Agent?.trim();

        // Total
        if (!groupedTotal.has(dia)) groupedTotal.set(dia, new Map());
        const totalHora = groupedTotal.get(dia);
        totalHora.set(hora, (totalHora.get(hora) || 0) + 1);

        // Per vehicle
        if (!groupedByVehicle.has(vehicle)) groupedByVehicle.set(vehicle, new Map());
        const vehicleMap = groupedByVehicle.get(vehicle);
        if (!vehicleMap.has(dia)) vehicleMap.set(dia, new Map());
        const vehicleHora = vehicleMap.get(dia);
        vehicleHora.set(hora, (vehicleHora.get(hora) || 0) + 1);

        // Per agent
        if (!groupedByAgent.has(agent)) groupedByAgent.set(agent, new Map());
        const agentMap = groupedByAgent.get(agent);
        if (!agentMap.has(dia)) agentMap.set(dia, new Map());
        const agentHora = agentMap.get(dia);
        agentHora.set(hora, (agentHora.get(hora) || 0) + 1);
      });

      const vehiclesUnics = Array.from(new Set(data.map(d => d.Grup_Vehicle))).sort();
      const agentsUnics = Array.from(new Set(data.map(d => d.Agent?.trim()))).sort();

      // ✅ Enviar totes les dades
      self.postMessage({
        ready: true,
        radialData,
        raceData,
        lineData,
        streamData,
        heatmapData,
        heatmapPerVehicle,
        heatmapPerAgent,
        vehiclesUnics,
        agentsUnics,
        groupedTotal,
        groupedByVehicle,
        groupedByAgent
      });

    } catch (error) {
      self.postMessage({ error: error.message });
    }
  }
};

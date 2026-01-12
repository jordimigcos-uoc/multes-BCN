import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function LineChartGrid(containerSelector, data) {  
  const container = d3.select(containerSelector);
  container.html(""); // Neteja contingut anterior

  if (!Array.isArray(data)) return;

  const node = container.node();
  const containerWidth = node && typeof node.getBoundingClientRect === "function"
    ? node.getBoundingClientRect().width
    : 800;

  const width = containerWidth;
  const height = 400;
  const margin = { top: 60, right: 20, bottom: 30, left: 40 };

  // Agrupem les dades per vehicle
  const dadesPerVehicle = d3.groups(data, d => d.Grup_Vehicle);

  // Escala horària comuna
  const x = d3.scaleLinear()
    .domain([0, 23])
    .range([margin.left, width - margin.right]);

  // Estil de grid per al contenidor
  container
    .style("display", "grid")
    .style("grid-template-columns", "repeat(2, 1fr)")
    .style("gap", "20px");

  // Per a cada vehicle, crear un gràfic individual
  dadesPerVehicle.forEach(([Grup_Vehicle, valors]) => {
    const valorsValids = valors.filter(d =>
      typeof d.Hora === "string" &&
      /^\d{2}:\d{2}$/.test(d.Hora) &&
      !isNaN(+d.total_multes)
    );

    // Ordenem per hora ascendent
    valorsValids.sort((a, b) => {
      const ha = parseInt(a.Hora.split(":")[0]);
      const hb = parseInt(b.Hora.split(":")[0]);
      return ha - hb;
    });

    if (valorsValids.length === 0) return;

    // Escala Y específica per vehicle
    const y = d3.scaleLinear()
      .domain([0, d3.max(valorsValids, d => +d.total_multes)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Línia específica per vehicle
    const line = d3.line()
      .x(d => x(parseInt(d.Hora.split(":")[0])))
      .y(d => y(+d.total_multes))
      .curve(d3.curveMonotoneX);


    const svg = container
      .append("svg")
      .attr("class", "linechart-svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img")
      .attr("title", Grup_Vehicle);

    // Títol del gràfic
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("class", "linechart-title")
      .text(Grup_Vehicle);

    // Línia de dades
    svg.append("path")
      .datum(valorsValids)
      .attr("fill", "none")
      .attr("stroke", "#2A9D8F")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Eix X
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      //.call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}h`))
      .selectAll("text")
      .style("font-size", "8px");

    // Eix Y
    //svg.append("g")
    //  .attr("transform", `translate(${margin.left},0)`)
    //  .call(d3.axisLeft(y).ticks(3))
    //  .selectAll("text")
    //  .style("font-size", "8px");

    // Ombra horària inicial
    svg.append("rect")
      .attr("class", "ombra-hora")
      .attr("y", margin.top)
      .attr("height", height - margin.top - margin.bottom)
      .attr("width", x(1) - x(0))
      .attr("fill", "rgba(0,0,0,0.1)")
      .attr("x", x(0));
  });
  return { updateHour: actualitzarOmbraHora };
}

// Funció per actualitzar la posició de l’ombra horària
export function actualitzarOmbraHora(hora) {
  d3.selectAll("svg.linechart-svg").each(function () {
    const svg = d3.select(this);
    const width = +svg.attr("width");
    const marginLeft = 40;
    const marginRight = 20;

    const x = d3.scaleLinear()
      .domain([0, 23])
      .range([marginLeft, width - marginRight]);

    svg.selectAll(".ombra-hora")
      .transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .attr("x", x(hora));
  });
  
}



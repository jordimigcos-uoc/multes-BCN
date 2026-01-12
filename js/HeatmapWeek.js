export function HeatmapWeek(containerSelector, data, groupedTotal, groupedByVehicle, groupedByAgent) {
  const container = d3.select(containerSelector);
  container.html(""); // Neteja contingut anterior

  const node = container.node();
  const containerWidth = node && typeof node.getBoundingClientRect === "function"
    ? node.getBoundingClientRect().width
    : 800;

  const margin = { top: 30, right: 30, bottom: 30, left: 110 };
  const width = containerWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const days = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
  const hours = d3.range(24).map(String); // "0" a "23"

  const svg = container
    .append("svg")
    .attr("class", "heatmap-svg")
    .attr("width", "100%")
    .attr("viewBox", `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .range([0, width])
    .domain(hours)
    .padding(0.05);

  const y = d3.scaleBand()
    .range([0, height])
    .domain(days)
    .padding(0.05);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues(["0", "6", "12", "18", "23"]));

  svg.append("g")
    .call(d3.axisLeft(y));

  const color = d3.scaleSequential()
    .interpolator(d3.interpolatePuBu)
    .domain([0, 1]); // actualitzat a update()

  const tooltip = container
    .append("div")
    .style("opacity", 0)
    .attr("class", "heatmap-tooltip")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)");

  function showTooltip(event, d) {
    tooltip
      .style("opacity", 1)
      .html(`<strong>${d.variable} ${d.group}:00</strong><br>${d.value} multes`)
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 28) + "px");
  }

  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  function computeMatrix(metric, vehicle) {
    const matrix = [];

    if (metric === "total") {
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const value = groupedTotal.get(d)?.get(h) || 0;
          matrix.push({ group: String(h), variable: days[d], value });
        }
      }
    } else if (metric === "vehicle") {
      const vehicleMap = groupedByVehicle.get(vehicle) || new Map();
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const value = vehicleMap.get(d)?.get(h) || 0;
          matrix.push({ group: String(h), variable: days[d], value });
        }
      }
    } else if (metric === "agent") {
      const agentMap = groupedByAgent.get(vehicle);
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const value = agentMap?.get(d)?.get(h) || 0;
          matrix.push({ group: String(h), variable: days[d], value });
        }
      }
    }

    return matrix;
  }

  function update(metric, vehicle) {
    const matrix = computeMatrix(metric, vehicle);
    const maxValue = d3.max(matrix, d => d.value);
    color.domain([0, maxValue || 1]);

    const cells = svg.selectAll("rect")
      .data(matrix, d => d.variable + "-" + d.group);

    cells.enter()
      .append("rect")
      .attr("x", d => x(d.group))
      .attr("y", d => y(d.variable))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .style("stroke", "white")
      .style("stroke-width", 1)
      .attr("rx", 4)
      .attr("ry", 4)
      .on("mouseover", showTooltip)
      .on("mousemove", showTooltip)
      .on("mouseleave", hideTooltip)
      .merge(cells)
      .transition()
      .duration(300)
      .style("fill", d => color(d.value));

    cells.exit().remove();
  }

  return { update };
}

export function StreamGraph(container, data) {
  const containerWidth = d3.select(container).node()?.getBoundingClientRect().width || 800;
  const width = containerWidth;
  const height = 400;

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const vehicles = Array.from(d3.group(data, d => d.Grup_Vehicle).keys());

  const x = d3.scaleLinear()
    .domain([0, 23])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(vehicles)
    .range(d3.schemeTableau10);

  const stackedData = d3.stack()
    .keys(vehicles)
    .offset(d3.stackOffsetWiggle)
    .value((d, key) => {
      const row = d.values.find(v => v.Grup_Vehicle === key);
      return row ? row.total_multes : 0;
    })
    (d3.groups(data, d => d.Hora).map(([hora, values]) => ({ hora: +hora, values })));

  y.domain([
    d3.min(stackedData, layer => d3.min(layer, d => d[0])),
    d3.max(stackedData, layer => d3.max(layer, d => d[1]))
  ]);

  const area = d3.area()
    .x(d => x(d.data.hora))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom);

  const layers = svg.append("g")
    .selectAll("path")
    .data(stackedData)
    .join("path")
    .attr("pointer-events", "all")
    .attr("fill", d => color(d.key))
    .attr("d", area)
    .on("mousemove", function(event, layerData) {
      const [mouseX, mouseY] = d3.pointer(event, document.body);
      const hour = Math.round(x.invert(mouseX));
      const hourStr = String(hour).padStart(2, "0");

      const rowsAtHour = data.filter(d => d.Hora === hourStr);
      const totalHour = d3.sum(rowsAtHour, d => d.total_multes);

      const sorted = rowsAtHour
        .map(d => ({
          vehicle: d.Grup_Vehicle,
          value: d.total_multes,
          pct: totalHour > 0 ? (d.total_multes / totalHour) * 100 : 0
        }))
        .sort((a, b) => b.pct - a.pct);

      const listHTML = sorted
        .map(d => `
          <div>
            <strong>${d.vehicle}</strong>: ${d.pct.toFixed(1)}%
          </div>
        `)
        .join("");

      d3.select("#tooltip")
        .style("opacity", 1)
        .style("left", (mouseX + 12) + "px")
        .style("top", (mouseY - 40) + "px")
        .html(`
          <div style="font-size:16px; margin-bottom:6px;">
            <strong>${hourStr}:00</strong>
          </div>
          ${listHTML}
        `);
    })
    .on("mouseleave", () => {
      d3.select("#tooltip").style("opacity", 0);
    });

  const hourRect = svg.append("rect")
    .attr("class", "hour-highlight")
    .attr("y", margin.top)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "#00000015") 
    .attr("x", x(0))
    .attr("width", x(1) - x(0))
    .style("pointer-events", "none");

  hourRect.lower();
  layers.raise();

  function updateHour(h) {
    const xStart = x(h);
    const xEnd = x(h + 1);

    
    hourRect
      .transition().duration(150)
      .attr("x", xStart)
      .attr("width", xEnd - xStart);
  }

  return { updateHour };
}

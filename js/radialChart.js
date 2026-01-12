import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function RadialBarChart(containerSelector, data) {
  if (!Array.isArray(data)) {    
    data = Array.from(data);
  }

  // Obté amplada real del contenidor 
  const container = d3.select(containerSelector); 
  const boundingWidth = parseInt(container.style("width")) || 500; 
  const width = boundingWidth; 
  const height = boundingWidth;  
  const innerRadius = width * 0.2; 
  const outerRadius = width / 2 - 40;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`) 
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.franja))
    .range([0, 2 * Math.PI])
    .align(0);

  const y = d3.scaleRadial()
    .domain([0, d3.max(data, d => d.count)])
    .range([innerRadius, outerRadius]);

  svg.append("g")
    .selectAll("path")
    .data(data)
    .join("path")
    .attr("class", "arc")
    .attr("d", d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(d => y(d.count))
      .startAngle(d => x(d.franja))
      .endAngle(d => x(d.franja) + x.bandwidth())
      .padAngle(0.01)
      .padRadius(innerRadius));

  svg.append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("text-anchor", "middle")
    .attr("transform", d => `
      rotate(${((x(d.franja) + x.bandwidth() / 2) * 180 / Math.PI - 90)})
      translate(${outerRadius + 10},0)
    `)
    .append("text")
    .text(d => d.franja)
    .attr("transform", d => (x(d.franja) + x.bandwidth() / 2 + Math.PI / 2) % (2 * Math.PI) < Math.PI
      ? "rotate(90)translate(0,0)"
      : "rotate(-90)translate(0,0)")
    .style("font-size", "16px")
    .attr("alignment-baseline", "middle");
}

export function updateActiveHour(hourString) {
  d3.selectAll(".arc")
    .classed("active", d => d.franja === hourString);
}

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let svg, x, y, color, bars, labels;
let currentData = [];
let raceDataGlobal = [];

export function RaceChart(containerSelector, data) {
  const width = 500;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 30, left: 100 };

  d3.select(containerSelector).selectAll("*").remove();
  
  svg = d3.select(containerSelector)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");



  x = d3.scaleLinear().range([margin.left, width - margin.right]);
  y = d3.scaleBand().range([margin.top, height - margin.bottom]).padding(0.1);

  const districtes = Array.from(new Set(data.map(d => d.districte))); // o d.Nom_Districte

  color = d3.scaleOrdinal()
    .domain(districtes)
    .range(districtes.map((_, i) => d3.interpolatePuBu(i / (districtes.length - 1))));

  
  

  //svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${margin.top})`);
  svg.append("g").attr("class", "y-axis").attr("transform", `translate(${margin.left},0)`);

  currentData = data;
}

export function updateRaceChart(hourString) {
  if (!x || !y || !svg) return;

  const hourData = currentData
    .filter(d => d.hora === hourString)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // mostra els 10 primers

  x.domain([0, d3.max(hourData, d => d.count)]);
  y.domain(hourData.map(d => d.districte));

  svg.select(".x-axis")
    .transition().duration(300)
    .call(d3.axisTop(x).ticks(5));

  svg.select(".y-axis")
    .style("display", "none");


  const bars = svg.selectAll(".bar")
    .data(hourData, d => d.districte);

  bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", x(0))
    .attr("y", d => y(d.districte))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.count) - x(0))
    .attr("fill", d => color(d.districte))
    .merge(bars)
    .transition().duration(300)
    .attr("y", d => y(d.districte))
    .attr("width", d => x(d.count) - x(0));

  bars.exit().remove();
  // TEXTOS amb el nom del districte
  const texts = svg.selectAll(".label")
    .data(hourData, d => d.districte);

  texts.enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => x(d.count) + 5) // lleugerament a la dreta del final de la barra
    .attr("y", d => y(d.districte) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text(d => d.districte)
    .merge(texts)
    .transition().duration(300)
    .attr("x", d => x(d.count) + 5)
    .attr("y", d => y(d.districte) + y.bandwidth() / 2)
    .text(d => d.districte);

  texts.exit().remove();
}


export function inicialitzarRaceChart(data) {
  raceDataGlobal = data;
  RaceChart("#race-chart", data); // o el contenidor que facis servir
}



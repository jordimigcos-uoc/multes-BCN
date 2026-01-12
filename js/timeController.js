let intervalId = null;
let currentTime = 0;
let speed = 1;

// Avança el temps automàticament
export function tick() {
  const slider = document.getElementById("time-slider");

  currentTime = parseInt(slider.value);
  currentTime += 60 * speed;
  if (currentTime > 86400) currentTime = 0;

  slider.value = currentTime;
  updateClockDisplay(currentTime);
  updateSliderFill();

  const hora = Math.floor(currentTime / 3600);
  if (window.updateStreamHour) window.updateStreamHour(hora);
  if (window.updateMapaHora) window.updateMapaHora(hora);
}

// Mostra l’hora al rellotge i actualitza gràfics
export function updateClockDisplay(seconds) {
  const clock = document.getElementById("clock-time");
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String((seconds % 3600) / 60).padStart(2, "0");
  const hourString = `${hours}:00`;

  clock.textContent = `${hours}:${minutes}`;

  if (window.updateActiveHour) window.updateActiveHour(hourString);
  if (window.updateRaceChart) window.updateRaceChart(hourString);
  if (window.actualitzarOmbraHora) window.actualitzarOmbraHora(parseInt(hours));  
  if (window.updateStreamHour) window.updateStreamHour(parseInt(hours));
  if (window.updateMapaHora) window.updateMapaHora(parseInt(hours));
  if (window.updateLineChartHour) window.updateLineChartHour(parseInt(hours));
}

// Inicia l’animació
export function startTimeAnimation() {
  if (intervalId) return;

  const speedSelect = document.getElementById("speed");
  speed = parseInt(speedSelect?.value || "1");

  intervalId = setInterval(tick, 200);
}

// Atura l’animació
export function stopTimeAnimation() {
  clearInterval(intervalId);
  intervalId = null;
}

// Control de velocitat
export function setupSpeedControl() {
  const speedSelect = document.getElementById("speed");
  if (!speedSelect) return;

  speedSelect.addEventListener("change", () => {
    speed = parseInt(speedSelect.value);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = setInterval(tick, 200);
    }
  });
}

// Sincronització manual amb el slider
export function setupManualSliderSync() {
  const slider = document.getElementById("time-slider");
  slider.addEventListener("input", () => {
    const value = parseInt(slider.value);
    currentTime = value;
    updateClockDisplay(value);
    updateSliderFill();
  });
}

// Actualitza el fons del slider
function updateSliderFill() {
  const slider = document.getElementById("time-slider");
  const percent = (slider.value / slider.max) * 100;
  slider.style.background = `linear-gradient(to right, #69b3a2 0%, #69b3a2 ${percent}%, #ccc ${percent}%, #ccc 100%)`;
}

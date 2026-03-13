export function ruleExplorerWidget(rd) {
  const container = document.createElement("div");
  container.style.fontFamily = "system-ui, sans-serif";

  const controlRow = document.createElement("div");
  controlRow.style.display    = "flex";
  controlRow.style.gap        = "20px";
  controlRow.style.alignItems = "center";
  controlRow.style.marginBottom = "16px";
  controlRow.style.flexWrap   = "wrap";

  const makeSlider = (label, min, max, step, initial) => {
    const wrapper = document.createElement("label");
    wrapper.style.display    = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap        = "8px";
    wrapper.style.fontSize   = "14px";
    const lbl = document.createElement("span");
    lbl.innerHTML = `<strong>${label}:</strong>`;
    wrapper.appendChild(lbl);
    const sl = document.createElement("input");
    sl.type  = "range";
    sl.min   = String(min);
    sl.max   = String(max);
    sl.step  = String(step);
    sl.value = String(initial);
    sl.style.width = "120px";
    wrapper.appendChild(sl);
    const val = document.createElement("span");
    val.style.minWidth = "40px";
    val.textContent    = String(initial);
    wrapper.appendChild(val);
    sl.addEventListener("input", () => { val.textContent = sl.value; update(); });
    wrapper._getValue = () => parseFloat(sl.value);
    return wrapper;
  };

  const minSuppSlider = makeSlider("Min Support",    0.01, 0.3,  0.01, 0.05);
  const minConfSlider = makeSlider("Min Confidence", 0.1,  1.0,  0.05, 0.4);
  const minLiftSlider = makeSlider("Min Lift",       0.5,  5.0,  0.1,  1.0);

  const searchBox = document.createElement("input");
  searchBox.type        = "text";
  searchBox.placeholder = "🔍 Search ingredient...";
  searchBox.style.padding      = "6px 12px";
  searchBox.style.border       = "1px solid #ccc";
  searchBox.style.borderRadius = "4px";
  searchBox.style.fontSize     = "14px";
  searchBox.style.width        = "180px";
  searchBox.addEventListener("input", update);

  controlRow.appendChild(minSuppSlider);
  controlRow.appendChild(minConfSlider);
  controlRow.appendChild(minLiftSlider);
  controlRow.appendChild(searchBox);
  container.appendChild(controlRow);

  const plotWidth  = 700, plotHeight = 400;
  const margin     = { top: 20, right: 30, bottom: 50, left: 60 };

  const canvas = document.createElement("canvas");
  canvas.width  = plotWidth;
  canvas.height = plotHeight;
  canvas.style.border       = "1px solid #e0e0e0";
  canvas.style.borderRadius = "6px";
  canvas.style.cursor       = "crosshair";

  const layout = document.createElement("div");
  layout.style.display    = "flex";
  layout.style.gap        = "24px";
  layout.style.alignItems = "flex-start";

  const detailPanel = document.createElement("div");
  detailPanel.style.minWidth       = "350px";
  detailPanel.style.fontSize       = "14px";
  detailPanel.style.padding        = "12px";
  detailPanel.style.backgroundColor = "#f8f9fa";
  detailPanel.style.borderRadius   = "8px";
  detailPanel.innerHTML = "<em>Hover over a point to see rule details.</em>";

  layout.appendChild(canvas);
  layout.appendChild(detailPanel);
  container.appendChild(layout);

  const countDiv = document.createElement("div");
  countDiv.style.marginTop = "8px";
  countDiv.style.fontSize  = "13px";
  countDiv.style.color     = "#666";
  container.appendChild(countDiv);

  let filtered = [];

  function update() {
    const minS   = minSuppSlider._getValue();
    const minC   = minConfSlider._getValue();
    const minL   = minLiftSlider._getValue();
    const search = searchBox.value.toLowerCase().trim();

    filtered = rd.filter(r =>
      r.support    >= minS &&
      r.confidence >= minC &&
      r.lift       >= minL &&
      (search === "" || r.lhs.toLowerCase().includes(search) || r.rhs.toLowerCase().includes(search))
    );

    countDiv.textContent = `Showing ${filtered.length} of ${rd.length} rules`;
    drawPlot();
  }

  function drawPlot() {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    if (filtered.length === 0) {
      ctx.fillStyle  = "#999";
      ctx.font       = "16px system-ui";
      ctx.textAlign  = "center";
      ctx.fillText("No rules match the current filters", plotWidth / 2, plotHeight / 2);
      return;
    }

    const xMin = 0, xMax = Math.max(...filtered.map(r => r.support)) * 1.1;
    const yMin = 0, yMax = 1.0;
    const liftMax = Math.max(...filtered.map(r => r.lift), 2);

    const px = margin.left, pw = plotWidth  - margin.left - margin.right;
    const py = margin.top,  ph = plotHeight - margin.top  - margin.bottom;

    const xScale = (v) => px + (v - xMin) / (xMax - xMin) * pw;
    const yScale = (v) => py + ph - (v - yMin) / (yMax - yMin) * ph;

    ctx.strokeStyle = "#eee"; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = py + ph * i / 5;
      ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke();
      const x = px + pw * i / 5;
      ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke();
    }

    ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph);
    ctx.stroke();

    ctx.fillStyle = "#333"; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Support", px + pw / 2, plotHeight - 8);
    ctx.save();
    ctx.translate(14, py + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Confidence", 0, 0);
    ctx.restore();

    ctx.font = "11px system-ui"; ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const v = xMin + (xMax - xMin) * i / 5;
      ctx.fillText(v.toFixed(2), xScale(v), py + ph + 18);
    }
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const v = yMin + (yMax - yMin) * i / 5;
      ctx.fillText(v.toFixed(1), px - 6, yScale(v) + 4);
    }

    filtered.forEach(r => {
      const x      = xScale(r.support);
      const y      = yScale(r.confidence);
      const radius = Math.max(3, Math.min(12, (r.lift / liftMax) * 12));
      const hue    = Math.max(0, Math.min(120, (r.lift - 0.5) / (liftMax - 0.5) * 120));
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle   = `hsla(${hue}, 70%, 50%, 0.6)`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hue}, 70%, 40%, 0.8)`;
      ctx.lineWidth   = 1;
      ctx.stroke();
    });
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  function hitTest(e) {
    if (filtered.length === 0) return null;
    const { x: mx, y: my } = canvasCoords(e);
    const xMax = Math.max(...filtered.map(r => r.support)) * 1.1;
    const pw = plotWidth  - margin.left - margin.right;
    const ph = plotHeight - margin.top  - margin.bottom;
    const xScale = (v) => margin.left + v / xMax * pw;
    const yScale = (v) => margin.top  + ph - v * ph;
    let closest = null, closestDist = Infinity;
    filtered.forEach(r => {
      const dx = xScale(r.support)    - mx;
      const dy = yScale(r.confidence) - my;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist && d < 40) { closestDist = d; closest = r; }
    });
    return closest;
  }

  function showDetails(r) {
    const liftColor = r.lift > 1.05 ? "#2ca02c" : r.lift < 0.95 ? "#d62728" : "#666";
    detailPanel.innerHTML = `
      <div style="font-size:16px; margin-bottom:10px;">
        <strong>{${r.lhs}}</strong> → <strong>{${r.rhs}}</strong>
      </div>
      <table style="border-collapse:collapse; width:100%;">
        <tr><td style="padding:4px 8px;">Support:</td><td><strong>${r.support.toFixed(4)}</strong></td></tr>
        <tr><td style="padding:4px 8px;">Confidence:</td><td><strong>${r.confidence.toFixed(4)}</strong></td></tr>
        <tr><td style="padding:4px 8px;">Lift:</td><td><strong style="color:${liftColor}">${r.lift.toFixed(3)}</strong></td></tr>
        <tr><td style="padding:4px 8px;">Count:</td><td>${r.count}</td></tr>
      </table>
    `;
  }

  canvas.addEventListener("mousemove", (e) => { const r = hitTest(e); if (r) showDetails(r); });
  canvas.addEventListener("click",     (e) => { const r = hitTest(e); if (r) showDetails(r); });

  update();
  container.value = { filtered };
  return container;
}

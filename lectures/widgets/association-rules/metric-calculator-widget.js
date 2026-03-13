export function metricCalculatorWidget(data) {
  const items  = data.items;
  const matrix = data.matrix;
  const N      = data.nTrans;

  const container = document.createElement("div");
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.display    = "flex";
  container.style.gap        = "24px";
  container.style.alignItems = "flex-start";

  const antMap  = {};
  const consMap = {};

  function makePanel(heading, checkboxMap) {
    const wrapper = document.createElement("div");
    wrapper.style.minWidth = "130px";
    const lbl = document.createElement("div");
    lbl.style.fontWeight   = "bold";
    lbl.style.marginBottom = "8px";
    lbl.style.fontSize     = "15px";
    lbl.textContent        = heading;
    wrapper.appendChild(lbl);
    items.forEach(opt => {
      const row = document.createElement("label");
      row.style.display    = "flex";
      row.style.alignItems = "center";
      row.style.gap        = "6px";
      row.style.marginBottom = "4px";
      row.style.cursor     = "pointer";
      const cb = document.createElement("input");
      cb.type  = "checkbox";
      cb.value = opt;
      cb.addEventListener("change", () => { syncDisabled(); update(); });
      checkboxMap[opt] = { cb, row };
      row.appendChild(cb);
      row.appendChild(document.createTextNode(opt));
      wrapper.appendChild(row);
    });
    wrapper._getSelected = () =>
      Object.values(checkboxMap).filter(x => x.cb.checked).map(x => x.cb.value);
    return wrapper;
  }

  const antPanel  = makePanel("Antecedent (A):", antMap);
  const consPanel = makePanel("Consequent (B):", consMap);

  function syncDisabled() {
    items.forEach(item => {
      const inA = antMap[item].cb.checked;
      const inB = consMap[item].cb.checked;
      consMap[item].cb.disabled       = inA;
      consMap[item].row.style.opacity = inA ? "0.35" : "1";
      consMap[item].row.style.cursor  = inA ? "not-allowed" : "pointer";
      antMap[item].cb.disabled        = inB;
      antMap[item].row.style.opacity  = inB ? "0.35" : "1";
      antMap[item].row.style.cursor   = inB ? "not-allowed" : "pointer";
    });
  }

  const displayPanel = document.createElement("div");
  displayPanel.style.flex = "1";

  const canvas = document.createElement("canvas");
  canvas.width  = 440;
  canvas.height = 240;
  displayPanel.appendChild(canvas);

  const metricsDiv = document.createElement("div");
  metricsDiv.style.marginTop  = "10px";
  metricsDiv.style.fontSize   = "14px";
  metricsDiv.style.lineHeight = "1.8";
  displayPanel.appendChild(metricsDiv);

  const explainDiv = document.createElement("div");
  explainDiv.style.marginTop  = "12px";
  explainDiv.style.fontSize   = "13px";
  explainDiv.style.color      = "#555";
  explainDiv.style.borderTop  = "1px solid #ddd";
  explainDiv.style.paddingTop = "10px";
  explainDiv.style.lineHeight = "1.6";
  explainDiv.innerHTML = `
    <strong>Reading the diagram:</strong> The blue circle = transactions with A selected;
    the orange circle = transactions with B selected; the <span style="color:#2a7a2a"><strong>green overlap</strong></span>
    = transactions containing <em>both</em> A and B.<br>
    <strong>Why can't A and B share items?</strong> A rule says "given A, predict B" —
    if an item is in both sides it would trivially predict itself.<br>
    <strong>Confidence</strong> = overlap ÷ blue circle = P(B|A).
    <strong>Lift &gt; 1</strong> means B appears more often <em>with</em> A than it does on its own — a genuine association.
  `;
  displayPanel.appendChild(explainDiv);

  function transactionsContaining(itemNames) {
    return matrix.filter(row =>
      itemNames.every(name => row[items.indexOf(name)] === 1)
    ).length;
  }

  function update() {
    const A = antPanel._getSelected();
    const B = consPanel._getSelected();

    if (A.length === 0 || B.length === 0) {
      metricsDiv.innerHTML = "<em style='color:#888'>Select at least one item for both A and B.</em>";
      drawVenn(0, 0, 0);
      container.value = {};
      container.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    const countA  = transactionsContaining(A);
    const countB  = transactionsContaining(B);
    const countAB = transactionsContaining([...A, ...B]);

    const suppA  = countA  / N;
    const suppB  = countB  / N;
    const suppAB = countAB / N;
    const conf   = suppA > 0 ? suppAB / suppA : 0;
    const lift   = (suppA > 0 && suppB > 0) ? suppAB / (suppA * suppB) : 0;

    drawVenn(countA, countB, countAB);

    const liftColor = lift > 1.05 ? "#2ca02c" : lift < 0.95 ? "#d62728" : "#666";
    const liftLabel = lift > 1.05 ? "positive association ✓"
                    : lift < 0.95 ? "negative association" : "approximately independent";

    metricsDiv.innerHTML = `
      <table style="border-collapse:collapse;">
        <tr><td style="padding:3px 10px;">supp(A):</td>
            <td><strong>${suppA.toFixed(3)}</strong> <span style="color:#888">(${countA}/${N} transactions)</span></td></tr>
        <tr><td style="padding:3px 10px;">supp(B):</td>
            <td><strong>${suppB.toFixed(3)}</strong> <span style="color:#888">(${countB}/${N})</span></td></tr>
        <tr><td style="padding:3px 10px;">supp(A∪B):</td>
            <td><strong>${suppAB.toFixed(3)}</strong> <span style="color:#888">(${countAB}/${N} — the overlap)</span></td></tr>
        <tr style="border-top:2px solid #ddd;">
          <td style="padding:3px 10px;">confidence(A→B):</td>
          <td><strong>${conf.toFixed(3)}</strong>
            <span style="color:#888; font-size:12px"> = ${countAB}/${countA}</span></td>
        </tr>
        <tr>
          <td style="padding:3px 10px;">lift(A→B):</td>
          <td><strong style="color:${liftColor}">${lift.toFixed(3)}</strong>
            <span style="font-size:12px; color:${liftColor}"> — ${liftLabel}</span></td>
        </tr>
      </table>
    `;

    container.value = { suppA, suppB, suppAB, conf, lift };
    container.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function drawVenn(countA, countB, countAB) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx1 = W * 0.38, cx2 = W * 0.62, cy = H * 0.5;
    const r = 80;

    ctx.beginPath();
    ctx.arc(cx1, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(78, 121, 167, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#4e79a7"; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx2, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(242, 142, 44, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#f28e2c"; ctx.lineWidth = 2; ctx.stroke();

    if (countAB > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx1, cy, r, 0, 2 * Math.PI); ctx.clip();
      ctx.beginPath(); ctx.arc(cx2, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(100, 180, 100, 0.45)"; ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#333"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
    ctx.fillText("A", cx1 - 48, cy - 6);
    ctx.fillText("B", cx2 + 48, cy - 6);
    ctx.font = "12px system-ui";
    ctx.fillText(`${countA - countAB}`, cx1 - 38, cy + 14);
    ctx.fillText(`${countB - countAB}`, cx2 + 38, cy + 14);
    if (countAB > 0) {
      ctx.fillStyle = "#2a7a2a"; ctx.font = "bold 15px system-ui";
      ctx.fillText(`${countAB}`, (cx1 + cx2) / 2, cy + 6);
    }
    ctx.fillStyle = "#aaa"; ctx.font = "11px system-ui";
    ctx.fillText(`N = ${N} transactions`, W / 2, H - 6);
  }

  container.appendChild(antPanel);
  container.appendChild(consPanel);
  container.appendChild(displayPanel);
  update();
  container.value = {};
  return container;
}

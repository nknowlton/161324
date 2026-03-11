export function transactionBuilderWidget() {
  const items = ["Pepperoni", "Mushrooms", "Olives", "Onions", "Peppers", "Sausage"];
  const nTrans = 8;

  const defaults = [
    [1,1,0,1,0,0],
    [1,0,0,0,1,1],
    [1,1,1,0,0,0],
    [1,0,0,1,1,1],
    [0,1,1,1,0,0],
    [1,1,0,0,1,0],
    [1,0,1,0,0,1],
    [0,1,0,1,1,0]
  ];

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.gap = "40px";
  container.style.flexWrap = "wrap";
  container.style.fontFamily = "system-ui, sans-serif";

  let matrix = defaults.map(r => [...r]);

  const leftPanel = document.createElement("div");

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "15px";

  const thead = document.createElement("thead");
  const hrow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "Transaction";
  corner.style.padding = "6px 12px";
  corner.style.borderBottom = "2px solid #333";
  hrow.appendChild(corner);
  items.forEach(item => {
    const th = document.createElement("th");
    th.textContent = item;
    th.style.padding = "6px 12px";
    th.style.borderBottom = "2px solid #333";
    th.style.textAlign = "center";
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const checkboxes = [];

  for (let t = 0; t < nTrans; t++) {
    const row = document.createElement("tr");
    row.style.backgroundColor = t % 2 === 0 ? "#f8f9fa" : "#fff";
    const label = document.createElement("td");
    label.textContent = `T${t + 1}`;
    label.style.padding = "6px 12px";
    label.style.fontWeight = "bold";
    row.appendChild(label);
    checkboxes[t] = [];
    for (let i = 0; i < items.length; i++) {
      const td = document.createElement("td");
      td.style.textAlign = "center";
      td.style.padding = "6px 12px";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = matrix[t][i] === 1;
      cb.style.width = "18px";
      cb.style.height = "18px";
      cb.style.cursor = "pointer";
      cb.addEventListener("change", () => {
        matrix[t][i] = cb.checked ? 1 : 0;
        updateDisplay();
        container.value = computeOutput();
        container.dispatchEvent(new Event("input", { bubbles: true }));
      });
      checkboxes[t][i] = cb;
      td.appendChild(cb);
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  leftPanel.appendChild(table);

  const rightPanel = document.createElement("div");
  rightPanel.style.minWidth = "320px";

  const freqTitle = document.createElement("h4");
  freqTitle.textContent = "Item Frequencies";
  freqTitle.style.margin = "0 0 8px 0";
  rightPanel.appendChild(freqTitle);

  const freqContainer = document.createElement("div");
  rightPanel.appendChild(freqContainer);

  const statsDiv = document.createElement("div");
  statsDiv.style.marginTop = "16px";
  statsDiv.style.padding = "12px";
  statsDiv.style.backgroundColor = "#f0f4f8";
  statsDiv.style.borderRadius = "8px";
  statsDiv.style.fontSize = "14px";
  rightPanel.appendChild(statsDiv);

  function updateDisplay() {
    freqContainer.innerHTML = "";
    const counts = items.map((item, i) =>
      matrix.reduce((sum, row) => sum + row[i], 0)
    );
    const maxCount = Math.max(...counts, 1);

    items.forEach((item, i) => {
      const barRow = document.createElement("div");
      barRow.style.display = "flex";
      barRow.style.alignItems = "center";
      barRow.style.marginBottom = "4px";

      const lbl = document.createElement("span");
      lbl.textContent = item;
      lbl.style.width = "100px";
      lbl.style.fontSize = "13px";
      barRow.appendChild(lbl);

      const barBg = document.createElement("div");
      barBg.style.flex = "1";
      barBg.style.height = "20px";
      barBg.style.backgroundColor = "#e9ecef";
      barBg.style.borderRadius = "4px";
      barBg.style.overflow = "hidden";

      const bar = document.createElement("div");
      const pct = (counts[i] / nTrans) * 100;
      bar.style.width = pct + "%";
      bar.style.height = "100%";
      bar.style.backgroundColor = "#4e79a7";
      bar.style.borderRadius = "4px";
      bar.style.transition = "width 0.3s ease";
      barBg.appendChild(bar);
      barRow.appendChild(barBg);

      const valLbl = document.createElement("span");
      valLbl.textContent = `${counts[i]}/${nTrans}`;
      valLbl.style.width = "50px";
      valLbl.style.textAlign = "right";
      valLbl.style.fontSize = "13px";
      valLbl.style.marginLeft = "8px";
      barRow.appendChild(valLbl);

      freqContainer.appendChild(barRow);
    });

    const totalItems = matrix.flat().reduce((a, b) => a + b, 0);
    const avgPerTrans = (totalItems / nTrans).toFixed(1);
    statsDiv.innerHTML = `
      <strong>Summary:</strong> ${nTrans} transactions, ${items.length} unique items<br>
      Average items per transaction: <strong>${avgPerTrans}</strong><br>
      Total item occurrences: <strong>${totalItems}</strong>
    `;
  }

  function computeOutput() {
    return {
      matrix: matrix.map(r => [...r]),
      items: [...items],
      nTrans: nTrans
    };
  }

  container.appendChild(leftPanel);
  container.appendChild(rightPanel);
  updateDisplay();
  container.value = computeOutput();
  return container;
}

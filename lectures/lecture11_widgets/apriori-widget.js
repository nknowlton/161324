export function aprioriWidget(data) {
  const items  = data.items;
  const matrix = data.matrix;
  const N      = data.nTrans;

  const container = document.createElement("div");
  container.style.fontFamily = "system-ui, sans-serif";

  const controls = document.createElement("div");
  controls.style.display    = "flex";
  controls.style.gap        = "16px";
  controls.style.alignItems = "center";
  controls.style.marginBottom = "16px";
  controls.style.flexWrap   = "wrap";

  const suppLabel = document.createElement("label");
  suppLabel.innerHTML = "<strong>Min Support:</strong> ";
  const suppSlider = document.createElement("input");
  suppSlider.type  = "range";
  suppSlider.min   = "1";
  suppSlider.max   = String(N);
  suppSlider.value = "2";
  suppSlider.style.width = "200px";
  const suppVal = document.createElement("span");
  suppVal.textContent = `${2}/${N} = ${(2 / N).toFixed(2)}`;
  suppVal.style.minWidth = "100px";
  suppLabel.appendChild(suppSlider);
  suppLabel.appendChild(suppVal);
  controls.appendChild(suppLabel);

  const stepBackBtn = document.createElement("button");
  stepBackBtn.textContent = "◀ Back";
  stepBackBtn.style.padding = "6px 16px";
  stepBackBtn.style.cursor = "pointer";
  stepBackBtn.style.borderRadius = "4px";
  stepBackBtn.style.border = "1px solid #ccc";

  const stepFwdBtn = document.createElement("button");
  stepFwdBtn.textContent = "Forward ▶";
  stepFwdBtn.style.padding = "6px 16px";
  stepFwdBtn.style.cursor = "pointer";
  stepFwdBtn.style.borderRadius = "4px";
  stepFwdBtn.style.border = "1px solid #ccc";
  stepFwdBtn.style.backgroundColor = "#4e79a7";
  stepFwdBtn.style.color = "white";

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.style.padding = "6px 16px";
  resetBtn.style.cursor = "pointer";
  resetBtn.style.borderRadius = "4px";
  resetBtn.style.border = "1px solid #ccc";

  controls.appendChild(stepBackBtn);
  controls.appendChild(stepFwdBtn);
  controls.appendChild(resetBtn);

  const stepLabel = document.createElement("span");
  stepLabel.style.fontSize   = "15px";
  stepLabel.style.fontWeight = "bold";
  stepLabel.style.marginLeft = "12px";
  controls.appendChild(stepLabel);

  container.appendChild(controls);

  const displayArea = document.createElement("div");
  displayArea.style.display  = "flex";
  displayArea.style.gap      = "24px";
  displayArea.style.flexWrap = "wrap";
  container.appendChild(displayArea);

  const rulesArea = document.createElement("div");
  rulesArea.style.marginTop  = "16px";
  rulesArea.style.maxHeight  = "600px";
  rulesArea.style.overflowY  = "auto";
  container.appendChild(rulesArea);

  function countSupport(indices) {
    return matrix.filter(row => indices.every(i => row[i] === 1)).length;
  }

  function combinations(arr, k) {
    if (k === 1) return arr.map(x => [x]);
    const result = [];
    for (let i = 0; i <= arr.length - k; i++) {
      const rest = combinations(arr.slice(i + 1), k - 1);
      rest.forEach(combo => result.push([arr[i], ...combo]));
    }
    return result;
  }

  function runApriori(minCount) {
    const levels = [];

    const singleCandidates = items.map((item, i) => ({
      indices: [i],
      label: item,
      count: countSupport([i]),
    }));
    levels.push({
      k: 1,
      candidates: singleCandidates,
      frequent: singleCandidates.filter(c => c.count >= minCount),
      pruned:   singleCandidates.filter(c => c.count < minCount)
    });

    let prevFreqIndices = levels[0].frequent.map(c => c.indices[0]);
    for (let k = 2; k <= items.length; k++) {
      if (prevFreqIndices.length < k) break;
      const combos = combinations(prevFreqIndices, k);
      const candidates = combos.map(indices => ({
        indices,
        label: indices.map(i => items[i]).join(", "),
        count: countSupport(indices),
      }));
      const frequent = candidates.filter(c => c.count >= minCount);
      const pruned   = candidates.filter(c => c.count < minCount);
      levels.push({ k, candidates, frequent, pruned });
      if (frequent.length === 0) break;
      prevFreqIndices = [...new Set(frequent.flatMap(c => c.indices))];
    }

    return levels;
  }

  function generateRules(levels, minCount) {
    const allFrequent = levels.flatMap(l => l.frequent).filter(f => f.indices.length >= 2);
    const rules = [];
    allFrequent.forEach(fset => {
      const indices = fset.indices;
      for (let mask = 1; mask < (1 << indices.length) - 1; mask++) {
        const ant  = indices.filter((_, i) => (mask >> i) & 1);
        const cons = indices.filter((_, i) => !((mask >> i) & 1));
        const suppAB = fset.count / N;
        const suppA  = countSupport(ant)  / N;
        const suppB  = countSupport(cons) / N;
        const conf   = suppA > 0 ? suppAB / suppA : 0;
        const lift   = (suppA > 0 && suppB > 0) ? suppAB / (suppA * suppB) : 0;
        rules.push({
          ant:        ant.map(i  => items[i]).join(", "),
          cons:       cons.map(i => items[i]).join(", "),
          support:    suppAB,
          confidence: conf,
          lift:       lift
        });
      }
    });
    return rules.sort((a, b) => b.lift - a.lift);
  }

  let currentStep = 0;
  let levels = [];
  let rules  = [];

  function rebuild() {
    const minCount = parseInt(suppSlider.value);
    suppVal.textContent = `${minCount}/${N} = ${(minCount / N).toFixed(2)}`;
    levels = runApriori(minCount);
    rules  = generateRules(levels, minCount);
    currentStep = 0;
    render();
  }

  function render() {
    const totalSteps = levels.length + 1;
    stepLabel.textContent = `Step ${currentStep + 1} / ${totalSteps}`;
    stepBackBtn.disabled  = currentStep <= 0;
    stepFwdBtn.disabled   = currentStep >= totalSteps - 1;

    displayArea.innerHTML = "";
    rulesArea.innerHTML   = "";

    if (currentStep < levels.length) {
      const level = levels[currentStep];
      const panel = document.createElement("div");
      panel.style.flex     = "1";
      panel.style.minWidth = "300px";

      const title = document.createElement("h4");
      title.textContent = `Level ${level.k}: ${level.k === 1 ? "Single items" : level.k + "-itemsets"}`;
      title.style.margin = "0 0 10px 0";
      panel.appendChild(title);

      level.candidates.forEach(c => {
        const row = document.createElement("div");
        row.style.display    = "flex";
        row.style.alignItems = "center";
        row.style.marginBottom = "4px";
        row.style.opacity    = c.count >= parseInt(suppSlider.value) ? "1" : "0.4";

        const name = document.createElement("span");
        name.textContent = `{${c.label}}`;
        name.style.width    = "200px";
        name.style.fontSize = "14px";
        if (c.count < parseInt(suppSlider.value)) {
          name.style.textDecoration = "line-through";
          name.style.color = "#d62728";
        }
        row.appendChild(name);

        const barBg = document.createElement("div");
        barBg.style.flex            = "1";
        barBg.style.height          = "20px";
        barBg.style.backgroundColor = "#e9ecef";
        barBg.style.borderRadius    = "4px";
        barBg.style.position        = "relative";
        barBg.style.overflow        = "hidden";

        const bar = document.createElement("div");
        bar.style.width           = (c.count / N * 100) + "%";
        bar.style.height          = "100%";
        bar.style.borderRadius    = "4px";
        bar.style.transition      = "width 0.3s";
        bar.style.backgroundColor = c.count >= parseInt(suppSlider.value) ? "#4e79a7" : "#d62728";
        barBg.appendChild(bar);

        const thresh = document.createElement("div");
        thresh.style.position        = "absolute";
        thresh.style.left            = (parseInt(suppSlider.value) / N * 100) + "%";
        thresh.style.top             = "0";
        thresh.style.bottom          = "0";
        thresh.style.width           = "2px";
        thresh.style.backgroundColor = "#333";
        barBg.appendChild(thresh);

        row.appendChild(barBg);

        const countLbl = document.createElement("span");
        countLbl.textContent   = `${c.count}/${N}`;
        countLbl.style.width   = "50px";
        countLbl.style.textAlign = "right";
        countLbl.style.marginLeft = "8px";
        countLbl.style.fontSize   = "13px";
        row.appendChild(countLbl);

        panel.appendChild(row);
      });

      const summary = document.createElement("div");
      summary.style.marginTop       = "12px";
      summary.style.padding         = "8px 12px";
      summary.style.backgroundColor = "#f0f4f8";
      summary.style.borderRadius    = "6px";
      summary.style.fontSize        = "14px";
      summary.innerHTML = `
        <strong>${level.frequent.length}</strong> frequent itemset${level.frequent.length !== 1 ? "s" : ""} survive
        (${level.pruned.length} pruned by min support)
      `;
      panel.appendChild(summary);
      displayArea.appendChild(panel);

      if (currentStep > 0) {
        const prevPanel = document.createElement("div");
        prevPanel.style.minWidth       = "200px";
        prevPanel.style.padding        = "12px";
        prevPanel.style.backgroundColor = "#f8f9fa";
        prevPanel.style.borderRadius   = "8px";
        const prevTitle = document.createElement("h4");
        prevTitle.textContent = "Previous Levels";
        prevTitle.style.margin = "0 0 8px 0";
        prevPanel.appendChild(prevTitle);

        for (let i = 0; i < currentStep; i++) {
          const l = levels[i];
          const line = document.createElement("div");
          line.style.fontSize    = "13px";
          line.style.marginBottom = "4px";
          line.innerHTML = `Level ${l.k}: <strong>${l.frequent.length}</strong> frequent → ${l.frequent.map(f => `{${f.label}}`).join(", ")}`;
          prevPanel.appendChild(line);
        }
        displayArea.appendChild(prevPanel);
      }

    } else {
      const panel = document.createElement("div");
      panel.style.width = "100%";
      const title = document.createElement("h4");
      title.textContent = `Generated Rules (${rules.length} total, sorted by lift)`;
      title.style.margin = "0 0 10px 0";
      panel.appendChild(title);

      if (rules.length === 0) {
        panel.innerHTML += "<p><em>No rules generated. Try lowering the minimum support.</em></p>";
      } else {
        const tbl = document.createElement("table");
        tbl.style.borderCollapse = "collapse";
        tbl.style.width          = "100%";
        tbl.style.fontSize       = "14px";

        const hdr = document.createElement("tr");
        ["Antecedent", "→", "Consequent", "Support", "Confidence", "Lift"].forEach(h => {
          const th = document.createElement("th");
          th.textContent = h;
          th.style.padding      = "6px 10px";
          th.style.borderBottom = "2px solid #333";
          th.style.textAlign    = "left";
          hdr.appendChild(th);
        });
        tbl.appendChild(hdr);

        rules.slice(0, 20).forEach((r, idx) => {
          const row = document.createElement("tr");
          row.style.backgroundColor = idx % 2 === 0 ? "#f8f9fa" : "#fff";
          const liftColor = r.lift > 1.05 ? "#2ca02c" : r.lift < 0.95 ? "#d62728" : "#666";

          [{ v: `{${r.ant}}` }, { v: "→" }, { v: `{${r.cons}}` },
           { v: r.support.toFixed(3) }, { v: r.confidence.toFixed(3) },
           { v: r.lift.toFixed(3), color: liftColor }].forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell.v;
            td.style.padding = "6px 10px";
            if (cell.color) { td.style.color = cell.color; td.style.fontWeight = "bold"; }
            row.appendChild(td);
          });
          tbl.appendChild(row);
        });
        panel.appendChild(tbl);

        if (rules.length > 20) {
          const more = document.createElement("p");
          more.style.fontSize = "13px";
          more.style.color    = "#888";
          more.textContent    = `...and ${rules.length - 20} more rules`;
          panel.appendChild(more);
        }
      }
      rulesArea.appendChild(panel);
    }
  }

  suppSlider.addEventListener("input",  rebuild);
  stepFwdBtn.addEventListener("click",  () => { currentStep = Math.min(currentStep + 1, levels.length); render(); });
  stepBackBtn.addEventListener("click", () => { currentStep = Math.max(currentStep - 1, 0); render(); });
  resetBtn.addEventListener("click",    rebuild);

  rebuild();
  container.value = { levels, rules };
  return container;
}

import { card, clearNode, linearScale, palette, svgEl } from "./shared.js"

const visibleRowCount = 8

const sortOptions = [
  { key: "auc", label: "AUC", maximize: true, digits: 3 },
  { key: "accuracy", label: "Accuracy", maximize: true, digits: 3 },
  { key: "aucpr", label: "AUCPR", maximize: true, digits: 3 },
  { key: "logloss", label: "Logloss", maximize: false, digits: 3 },
  { key: "best_threshold", label: "Best threshold", maximize: false, digits: 2 }
]

function sortOption(key) {
  return sortOptions.find((option) => option.key === key) ?? sortOptions[0]
}

function normalizeFamily(row) {
  if (row.algorithm === "Other" && /^XRT/.test(row.model_id)) return "XRT"
  return row.algorithm
}

function annotateRows(rows) {
  const countsByFamily = {}

  return rows.map((row, index) => {
    const familyLabel = normalizeFamily(row)
    countsByFamily[familyLabel] = (countsByFamily[familyLabel] ?? 0) + 1

    return {
      ...row,
      familyLabel,
      sourceRank: row.rank ?? index + 1,
      teachingLabel: `${familyLabel} ${countsByFamily[familyLabel]}`
    }
  })
}

function formatMetric(key, value) {
  const option = sortOption(key)
  return value.toFixed(option.digits)
}

function familyExplanation(familyLabel) {
  if (familyLabel === "Stacked Ensemble") {
    return "Stacked ensembles combine several strong base models into one blended prediction."
  }
  if (familyLabel === "Random Forest") {
    return "Random forests average many bootstrapped trees, so they are a bagging-style ensemble."
  }
  if (familyLabel === "GBM") {
    return "GBMs build trees sequentially, so each new tree tries to improve the earlier fit."
  }
  if (familyLabel === "Deep Learning") {
    return "Deep learning models are neural networks that can fit flexible nonlinear patterns."
  }
  if (familyLabel === "GLM") {
    return "GLM is the simpler logistic-regression-style baseline in this AutoML run."
  }
  if (familyLabel === "XRT") {
    return "XRT is an extremely randomized tree method, a more random cousin of standard random forests."
  }
  return "This is one of the model families AutoML tried during its search."
}

function thresholdExplanation(threshold, positiveClass) {
  if (threshold < 0.45) {
    return `Its best cutoff is below 0.50, so it predicts ${positiveClass} with comparatively less evidence.`
  }
  if (threshold > 0.55) {
    return `Its best cutoff is above 0.50, so it asks for stronger evidence before predicting ${positiveClass}.`
  }
  return `Its best cutoff is near 0.50, so it uses a fairly balanced decision rule for ${positiveClass}.`
}

function metricDirectionLabel(option) {
  if (option.key === "best_threshold") return "lower cutoffs appear first"
  return option.maximize ? "higher is better" : "lower is better"
}

function makeHint(text) {
  const hint = document.createElement("div")
  hint.style.fontSize = "0.78rem"
  hint.style.color = "#5f6c7b"
  hint.style.lineHeight = "1.45"
  hint.textContent = text
  return hint
}

export function automlWidget(data) {
  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  if (!data || !Array.isArray(data.leaderboard) || data.leaderboard.length === 0) {
    const message = document.createElement("div")
    message.textContent = "The offline AutoML artifact is missing. Run lectures/helpers/prepare_longbeach_automl.R first."
    message.style.padding = "1rem"
    message.style.borderRadius = "14px"
    message.style.background = "rgba(255,255,255,0.82)"
    message.style.border = "1px solid rgba(31, 42, 51, 0.10)"
    container.appendChild(message)
    return container
  }

  const rows = annotateRows(data.leaderboard)
  const leaderModelId = data.leader?.model_id ?? rows[0].model_id

  const state = {
    sortKey: "auc",
    selectedModelId: null
  }

  const layout = document.createElement("div")
  layout.style.display = "grid"
  layout.style.gridTemplateColumns = "minmax(0, 1.2fr) minmax(320px, 0.9fr)"
  layout.style.gap = "12px"
  layout.style.alignItems = "start"

  const tableCard = card("AutoML leaderboard")
  tableCard.shell.style.minWidth = "0"
  const tableHint = makeHint("Click a metric header to sort. Click a row to inspect what that model is doing.")
  const tableWrap = document.createElement("div")
  tableWrap.style.overflowX = "auto"
  tableCard.shell.append(tableHint, tableWrap)

  const stripCard = card("Best thresholds")
  stripCard.shell.style.minWidth = "0"
  const stripHint = makeHint(`Each marker shows the probability cutoff that maximized accuracy for predicting ${data.meta?.positive_class ?? "the positive class"}.`)
  const stripSvg = svgEl("svg", { width: "100%", height: "292" })
  stripCard.shell.append(stripHint, stripSvg)

  const noteCard = card("Teaching note")
  const noteBody = document.createElement("div")
  noteBody.style.display = "grid"
  noteBody.style.gap = "7px"
  noteBody.style.fontSize = "0.88rem"
  noteBody.style.color = "#425565"
  noteBody.style.lineHeight = "1.55"
  noteCard.shell.appendChild(noteBody)

  layout.append(tableCard.shell, stripCard.shell)
  container.append(layout, noteCard.shell)

  function sortedRows() {
    const option = sortOption(state.sortKey)

    return rows
      .slice()
      .sort((left, right) => {
        const diff = option.maximize ? right[option.key] - left[option.key] : left[option.key] - right[option.key]
        if (Math.abs(diff) > 1e-12) return diff
        return left.sourceRank - right.sourceRank
      })
  }

  function sortableHeader(label, key, align = "right") {
    const th = document.createElement("th")
    th.style.padding = "7px 8px"
    th.style.borderBottom = "2px solid #d6deea"
    th.style.textAlign = align
    th.style.verticalAlign = "bottom"

    const button = document.createElement("button")
    button.type = "button"
    button.style.border = "none"
    button.style.background = "transparent"
    button.style.padding = "0"
    button.style.cursor = "pointer"
    button.style.font = "inherit"
    button.style.color = state.sortKey === key ? "#1f3c88" : "#334155"
    button.style.fontWeight = state.sortKey === key ? "700" : "600"
    button.style.whiteSpace = "nowrap"
    button.style.width = "100%"
    button.style.textAlign = align
    button.textContent = `${label}${state.sortKey === key ? ` ${sortOption(key).maximize ? "\u2193" : "\u2191"}` : ""}`
    button.addEventListener("click", () => {
      state.sortKey = key
      state.selectedModelId = null
      render()
    })

    th.appendChild(button)
    return th
  }

  function renderTable(visibleRows) {
    const table = document.createElement("table")
    table.style.width = "100%"
    table.style.borderCollapse = "separate"
    table.style.borderSpacing = "0"
    table.style.fontSize = "0.8rem"

    const thead = document.createElement("thead")
    const headerRow = document.createElement("tr")

    const rankHeader = document.createElement("th")
    rankHeader.textContent = "Rank"
    rankHeader.style.textAlign = "left"
    rankHeader.style.padding = "7px 8px"
    rankHeader.style.borderBottom = "2px solid #d6deea"
    headerRow.appendChild(rankHeader)

    const modelHeader = document.createElement("th")
    modelHeader.textContent = "Model"
    modelHeader.style.textAlign = "left"
    modelHeader.style.padding = "7px 8px"
    modelHeader.style.borderBottom = "2px solid #d6deea"
    headerRow.appendChild(modelHeader)

    const familyHeader = document.createElement("th")
    familyHeader.textContent = "Family"
    familyHeader.style.textAlign = "left"
    familyHeader.style.padding = "7px 8px"
    familyHeader.style.borderBottom = "2px solid #d6deea"
    headerRow.appendChild(familyHeader)

    headerRow.appendChild(sortableHeader("AUC", "auc"))
    headerRow.appendChild(sortableHeader("Accuracy", "accuracy"))
    headerRow.appendChild(sortableHeader("AUCPR", "aucpr"))
    headerRow.appendChild(sortableHeader("Logloss", "logloss"))
    headerRow.appendChild(sortableHeader("Best thr.", "best_threshold"))
    thead.appendChild(headerRow)
    table.appendChild(thead)

    const tbody = document.createElement("tbody")

    visibleRows.forEach((row, index) => {
      const isSelected = row.model_id === state.selectedModelId
      const isLeader = row.model_id === leaderModelId
      const tr = document.createElement("tr")
      tr.style.cursor = "pointer"
      tr.style.background = isSelected
        ? "rgba(36, 99, 235, 0.12)"
        : isLeader
          ? "rgba(214, 158, 46, 0.11)"
          : index % 2 === 0
            ? "rgba(248, 250, 252, 0.92)"
            : "white"
      tr.style.boxShadow = isSelected ? "inset 4px 0 0 #2463eb" : isLeader ? "inset 4px 0 0 #d69e2e" : "none"
      tr.addEventListener("click", () => {
        state.selectedModelId = row.model_id
        render()
      })

      const values = [
        { text: String(index + 1), align: "left" },
        { text: row.teachingLabel, align: "left", key: "model" },
        { text: row.familyLabel, align: "left" },
        { text: formatMetric("auc", row.auc), align: "right" },
        { text: formatMetric("accuracy", row.accuracy), align: "right" },
        { text: formatMetric("aucpr", row.aucpr), align: "right" },
        { text: formatMetric("logloss", row.logloss), align: "right" },
        { text: formatMetric("best_threshold", row.best_threshold), align: "right" }
      ]

      values.forEach((entry) => {
        const td = document.createElement("td")
        td.style.padding = "7px 8px"
        td.style.borderBottom = "1px solid rgba(214, 222, 234, 0.85)"
        td.style.textAlign = entry.align
        td.style.whiteSpace = entry.key === "model" || entry.align === "left" ? "nowrap" : "normal"

        if (entry.key === "model") {
          const modelWrap = document.createElement("div")
          modelWrap.style.display = "inline-flex"
          modelWrap.style.alignItems = "center"
          modelWrap.style.gap = "6px"

          const label = document.createElement("span")
          label.textContent = entry.text
          label.style.fontWeight = isSelected ? "700" : "600"
          modelWrap.appendChild(label)

          if (isLeader) {
            const badge = document.createElement("span")
            badge.textContent = "Leader"
            badge.style.fontSize = "0.66rem"
            badge.style.padding = "0.1rem 0.35rem"
            badge.style.borderRadius = "999px"
            badge.style.background = "rgba(214, 158, 46, 0.18)"
            badge.style.color = "#8a6116"
            badge.style.fontWeight = "700"
            modelWrap.appendChild(badge)
          }

          td.appendChild(modelWrap)
        } else {
          td.textContent = entry.text
        }

        tr.appendChild(td)
      })

      tbody.appendChild(tr)
    })

    table.appendChild(tbody)
    tableWrap.innerHTML = ""
    tableWrap.appendChild(table)
  }

  function renderThresholdStrip(visibleRows) {
    clearNode(stripSvg)

    const width = 520
    const rowGap = 27
    const height = 64 + visibleRows.length * rowGap
    const margin = { top: 26, right: 56, bottom: 30, left: 138 }
    const axisEnd = width - margin.right
    const xScale = linearScale(0, 1, margin.left, axisEnd)
    const selectedRow = visibleRows.find((row) => row.model_id === state.selectedModelId)

    stripSvg.setAttribute("viewBox", `0 0 ${width} ${height}`)
    stripSvg.setAttribute("height", String(height))

    ;[0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      const x = xScale(tick)
      stripSvg.appendChild(
        svgEl(
          "line",
          tick === 0.5
            ? {
                x1: x,
                y1: margin.top - 6,
                x2: x,
                y2: height - margin.bottom,
                stroke: "rgba(31, 60, 136, 0.38)",
                "stroke-width": 1.6,
                "stroke-dasharray": "4 4"
              }
            : {
                x1: x,
                y1: margin.top - 6,
                x2: x,
                y2: height - margin.bottom,
                stroke: "rgba(100, 116, 139, 0.18)",
                "stroke-width": 1
              }
        )
      )

      const label = svgEl("text", {
        x,
        y: height - 10,
        "text-anchor": "middle",
        "font-size": "11",
        fill: "#64748b"
      })
      label.textContent = tick.toFixed(2)
      stripSvg.appendChild(label)
    })

    const axisLabel = svgEl("text", {
      x: (margin.left + axisEnd) / 2,
      y: height - 2,
      "text-anchor": "middle",
      "font-size": "11.5",
      fill: "#475569"
    })
    axisLabel.textContent = `Probability cutoff for predicting ${data.meta?.positive_class ?? "the positive class"}`
    stripSvg.appendChild(axisLabel)

    visibleRows.forEach((row, index) => {
      const y = margin.top + index * rowGap + 10
      const isSelected = row.model_id === state.selectedModelId
      const isLeader = row.model_id === leaderModelId
      const fill = isSelected ? "rgba(36, 99, 235, 0.10)" : isLeader ? "rgba(214, 158, 46, 0.10)" : "transparent"

      stripSvg.appendChild(
        svgEl("rect", {
          x: 6,
          y: y - 11,
          width: width - 12,
          height: 22,
          rx: 10,
          fill
        })
      )

      const label = svgEl("text", {
        x: 14,
        y: y + 4,
        "font-size": "12",
        fill: isSelected ? palette.navy : "#334155",
        "font-weight": isSelected ? "700" : "600"
      })
      label.textContent = row.teachingLabel
      stripSvg.appendChild(label)

      stripSvg.appendChild(
        svgEl("line", {
          x1: margin.left,
          y1: y,
          x2: axisEnd,
          y2: y,
          stroke: isSelected ? "rgba(36, 99, 235, 0.34)" : "rgba(148, 163, 184, 0.55)",
          "stroke-width": isSelected ? 2.2 : 1.4
        })
      )

      const markerX = xScale(row.best_threshold)
      stripSvg.appendChild(
        svgEl("line", {
          x1: markerX,
          y1: y - 8,
          x2: markerX,
          y2: y + 8,
          stroke: isSelected ? palette.blue : isLeader ? palette.gold : palette.navy,
          "stroke-width": isSelected ? 3 : 2
        })
      )
      stripSvg.appendChild(
        svgEl("circle", {
          cx: markerX,
          cy: y,
          r: isSelected ? 5.5 : 4.6,
          fill: isSelected ? palette.blue : palette.navy,
          stroke: isLeader ? palette.gold : "white",
          "stroke-width": isLeader ? 2.2 : 1.6
        })
      )

      const value = svgEl("text", {
        x: width - 12,
        y: y + 4,
        "text-anchor": "end",
        "font-size": "11.5",
        fill: "#475569",
        "font-weight": isSelected ? "700" : "500"
      })
      value.textContent = row.best_threshold.toFixed(2)
      stripSvg.appendChild(value)
    })

    if (selectedRow) {
      const selectedLabelX = Math.max(margin.left + 48, Math.min(axisEnd - 48, xScale(selectedRow.best_threshold)))
      const selectedLine = svgEl("text", {
        x: selectedLabelX,
        y: margin.top - 10,
        "text-anchor": "middle",
        "font-size": "11.5",
        fill: palette.blue,
        "font-weight": "700"
      })
      selectedLine.textContent = `${selectedRow.teachingLabel}: ${selectedRow.best_threshold.toFixed(2)}`
      stripSvg.appendChild(selectedLine)
    }
  }

  function renderNote(sorted, selectedRow) {
    const selectedRank = sorted.findIndex((row) => row.model_id === selectedRow.model_id) + 1
    const option = sortOption(state.sortKey)
    const selectedIsLeader = selectedRow.model_id === leaderModelId
    const summary = document.createElement("div")
    summary.innerHTML = `
      <strong>${selectedRow.teachingLabel}</strong> is currently selected.
      It is <strong>#${selectedRank}</strong> when sorting by <strong>${option.label}</strong> (${metricDirectionLabel(option)}).
      ${selectedIsLeader ? "It is also the overall AutoML leader by AUC." : ""}
    `

    const metrics = document.createElement("div")
    metrics.style.display = "flex"
    metrics.style.flexWrap = "wrap"
    metrics.style.gap = "6px"

    ;[
      `Family: ${selectedRow.familyLabel}`,
      `AUC: ${selectedRow.auc.toFixed(3)}`,
      `Accuracy: ${selectedRow.accuracy.toFixed(3)}`,
      `AUCPR: ${selectedRow.aucpr.toFixed(3)}`,
      `Logloss: ${selectedRow.logloss.toFixed(3)}`,
      `Best threshold: ${selectedRow.best_threshold.toFixed(2)}`
    ].forEach((text) => {
      const chip = document.createElement("span")
      chip.textContent = text
      chip.style.padding = "0.16rem 0.5rem"
      chip.style.borderRadius = "999px"
      chip.style.background = "rgba(232, 237, 244, 0.92)"
      chip.style.color = "#334155"
      chip.style.fontSize = "0.78rem"
      chip.style.fontWeight = "600"
      metrics.appendChild(chip)
    })

    const explanation = document.createElement("div")
    explanation.innerHTML = `
      ${familyExplanation(selectedRow.familyLabel)}
      ${thresholdExplanation(selectedRow.best_threshold, data.meta?.positive_class ?? "the positive class")}
    `

    const interaction = document.createElement("div")
    interaction.innerHTML = `
      <strong>How to read this:</strong> the table sorts models, the strip shows each visible model's best cutoff,
      and the highlighted row links those two views together.
    `

    const rawId = document.createElement("div")
    rawId.style.wordBreak = "break-all"
    rawId.style.fontSize = "0.82rem"
    rawId.innerHTML = `<strong>Raw H2O model id:</strong> <code>${selectedRow.model_id}</code>`

    const provenance = document.createElement("div")
    provenance.style.fontSize = "0.78rem"
    provenance.style.color = "#64748b"
    provenance.innerHTML = `
      <strong>Artifact provenance:</strong> ${data.meta?.dataset ?? "dataset"}, seed ${data.meta?.seed ?? "?"},
      runtime budget ${data.meta?.max_runtime_secs ?? "?"}s, train rows ${data.meta?.train_rows ?? "?"},
      test rows ${data.meta?.test_rows ?? "?"}. This is a static offline AutoML artifact for teaching.
    `

    noteBody.innerHTML = ""
    noteBody.append(summary, metrics, explanation, interaction, rawId, provenance)
  }

  function render() {
    const sorted = sortedRows()
    const visibleRows = sorted.slice(0, visibleRowCount)

    if (!visibleRows.some((row) => row.model_id === state.selectedModelId)) {
      state.selectedModelId = visibleRows[0]?.model_id ?? null
    }

    const selectedRow = visibleRows.find((row) => row.model_id === state.selectedModelId) ?? visibleRows[0]
    renderTable(visibleRows)
    renderThresholdStrip(visibleRows)
    renderNote(sorted, selectedRow)
  }

  render()
  return container
}

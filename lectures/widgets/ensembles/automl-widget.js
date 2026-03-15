import { card, clearNode, drawAxes, linearScale, palette, svgEl, ticks } from "./shared.js"

const metricOptions = [
  { key: "auc", label: "AUC", maximize: true },
  { key: "accuracy", label: "Accuracy", maximize: true },
  { key: "aucpr", label: "AUCPR", maximize: true },
  { key: "logloss", label: "Logloss", maximize: false }
]

export function automlWidget(data) {
  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

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

  const state = { metric: "auc" }
  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"
  const metricSelect = document.createElement("select")
  metricOptions.forEach((option) => {
    const el = document.createElement("option")
    el.value = option.key
    el.textContent = option.label
    metricSelect.appendChild(el)
  })
  controls.append("Leaderboard metric", metricSelect)

  const layout = document.createElement("div")
  layout.style.display = "grid"
  layout.style.gridTemplateColumns = "1.05fr 0.95fr"
  layout.style.gap = "12px"

  const tableCard = card("Offline H2O AutoML leaderboard")
  const tableWrap = document.createElement("div")
  tableWrap.style.overflowX = "auto"
  tableCard.shell.appendChild(tableWrap)

  const curveCard = card("Leader threshold trade-off")
  const curveSvg = svgEl("svg", { viewBox: "0 0 500 320", width: "100%", height: "320" })
  const leaderText = document.createElement("div")
  leaderText.style.fontSize = "0.9rem"
  leaderText.style.color = "#425565"
  leaderText.style.lineHeight = "1.6"
  curveCard.shell.append(curveSvg, leaderText)

  layout.append(tableCard.shell, curveCard.shell)

  const meta = document.createElement("div")
  meta.style.fontSize = "0.92rem"
  meta.style.color = "#425565"

  container.append(controls, layout, meta)

  function sortedRows() {
    const option = metricOptions.find((item) => item.key === state.metric)
    return data.leaderboard
      .slice()
      .sort((left, right) => {
        if (option.maximize) return right[state.metric] - left[state.metric]
        return left[state.metric] - right[state.metric]
      })
  }

  function renderTable(rows) {
    const table = document.createElement("table")
    table.style.width = "100%"
    table.style.borderCollapse = "collapse"
    table.style.fontSize = "0.88rem"
    table.innerHTML = `
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #d6deea;">Rank</th>
          <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #d6deea;">Model</th>
          <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #d6deea;">Family</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #d6deea;">AUC</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #d6deea;">Accuracy</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #d6deea;">Logloss</th>
        </tr>
      </thead>
    `
    const body = document.createElement("tbody")

    rows.slice(0, 8).forEach((row, index) => {
      const tr = document.createElement("tr")
      tr.style.background = index === 0 ? "rgba(214, 158, 46, 0.10)" : index % 2 === 0 ? "rgba(248, 250, 252, 0.9)" : "white"
      tr.innerHTML = `
        <td style="padding:8px 10px;">${index + 1}</td>
        <td style="padding:8px 10px;"><code>${row.model_id}</code></td>
        <td style="padding:8px 10px;">${row.algorithm}</td>
        <td style="padding:8px 10px;text-align:right;">${row.auc.toFixed(3)}</td>
        <td style="padding:8px 10px;text-align:right;">${row.accuracy.toFixed(3)}</td>
        <td style="padding:8px 10px;text-align:right;">${row.logloss.toFixed(3)}</td>
      `
      body.appendChild(tr)
    })

    table.appendChild(body)
    tableWrap.innerHTML = ""
    tableWrap.appendChild(table)
  }

  function renderCurve() {
    clearNode(curveSvg)
    const width = 500
    const height = 320
    const margin = { top: 24, right: 24, bottom: 44, left: 56 }
    const xScale = linearScale(0.1, 0.9, margin.left, width - margin.right)
    const yScale = linearScale(0, 1, height - margin.bottom, margin.top)
    drawAxes(curveSvg, width, height, margin, ticks(0.1, 0.9, 5), ticks(0, 1, 5), xScale, yScale, "Probability threshold", "Metric value")

    const metrics = [
      { key: "accuracy", color: palette.navy },
      { key: "precision", color: palette.orange },
      { key: "recall", color: palette.green }
    ]

    metrics.forEach((metric) => {
      curveSvg.appendChild(
        svgEl("polyline", {
          points: data.threshold_curve
            .map((row) => `${xScale(row.threshold)},${yScale(row[metric.key])}`)
            .join(" "),
          fill: "none",
          stroke: metric.color,
          "stroke-width": 2.6
        })
      )
    })

    metrics.forEach((metric, index) => {
      const legend = svgEl("text", {
        x: margin.left + index * 110,
        y: margin.top - 8,
        "font-size": "12",
        fill: metric.color
      })
      legend.textContent = metric.key
      curveSvg.appendChild(legend)
    })
  }

  function render() {
    const rows = sortedRows()
    const leader = rows[0]
    renderTable(rows)
    renderCurve()

    leaderText.innerHTML = `
      <strong>Leader:</strong> ${data.leader.model_id}<br>
      <strong>Family:</strong> ${data.leader.algorithm}<br>
      <strong>Best threshold:</strong> ${data.leader.best_threshold.toFixed(2)}<br>
      <strong>Best accuracy:</strong> ${data.leader.best_accuracy.toFixed(3)}<br>
      <strong>Stacked ensemble present:</strong> ${data.stacked_ensemble.present ? "Yes" : "No"}
    `

    meta.innerHTML = `
      <strong>Artifact provenance:</strong> ${data.meta.dataset}, seed ${data.meta.seed}, runtime budget ${data.meta.max_runtime_secs}s,
      train rows ${data.meta.train_rows}, test rows ${data.meta.test_rows}. This widget reads a static JSON artifact generated offline, so the lecture stays fast while still showing a real AutoML run.
    `
  }

  metricSelect.addEventListener("change", () => {
    state.metric = metricSelect.value
    render()
  })

  render()
  return container
}

import { card, clearNode, palette, svgEl } from "./shared.js"

const depthValues = [2, 4, 6]
const etaValues = [0.05, 0.1, 0.3]
const subsampleValues = [0.6, 0.8, 1.0]
const featureNames = ["intake_type", "age_years", "animal_type", "intake_condition", "has_name", "sex"]

function featureProfile(depth, eta, subsample) {
  const base = {
    intake_type: 0.28,
    age_years: 0.21,
    animal_type: 0.17,
    intake_condition: 0.15,
    has_name: 0.11,
    sex: 0.08
  }

  const tweak = {
    intake_type: 0.02 * (depth - 4) / 2,
    age_years: 0.03 * (0.12 - Math.abs(eta - 0.12)),
    animal_type: 0.02 * (subsample - 0.8),
    intake_condition: 0.015 * (depth - 2) / 4,
    has_name: -0.01 * (depth - 2) / 4,
    sex: -0.01 * (subsample - 0.8)
  }

  const raw = featureNames.map((name) => ({
    feature: name,
    gain: Math.max(base[name] + tweak[name], 0.03)
  }))
  const total = raw.reduce((sum, item) => sum + item.gain, 0)
  return raw.map((item) => ({ ...item, gain: item.gain / total }))
}

function makeGrid() {
  const rows = []
  depthValues.forEach((depth) => {
    etaValues.forEach((eta) => {
      subsampleValues.forEach((subsample) => {
        const auc =
          0.72 +
          0.04 * (depth === 4) +
          0.02 * (depth === 6) +
          0.035 * (eta === 0.1) +
          0.012 * (eta === 0.05) -
          0.01 * (eta === 0.3) +
          0.02 * (subsample === 0.8) +
          0.01 * (subsample === 1.0)
        const logloss = 0.62 - (auc - 0.72) * 0.8 + 0.025 * (depth === 6 && eta === 0.3)
        const fitTime = 1 + depth * (1 / eta) * subsample * 0.12

        rows.push({
          depth,
          eta,
          subsample,
          auc: Number(auc.toFixed(3)),
          logloss: Number(logloss.toFixed(3)),
          fitTime: Number(fitTime.toFixed(2)),
          features: featureProfile(depth, eta, subsample)
        })
      })
    })
  })
  return rows
}

export function xgboostWidget() {
  const rows = makeGrid()
  const state = { depth: 4, eta: 0.1, subsample: 0.8 }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"

  const makeSelect = (values, selected) => {
    const el = document.createElement("select")
    values.forEach((value) => {
      const option = document.createElement("option")
      option.value = String(value)
      option.textContent = String(value)
      if (value === selected) option.selected = true
      el.appendChild(option)
    })
    return el
  }

  const depthSelect = makeSelect(depthValues, state.depth)
  const etaSelect = makeSelect(etaValues, state.eta)
  const subsampleSelect = makeSelect(subsampleValues, state.subsample)
  controls.append("Depth", depthSelect, "Learning rate", etaSelect, "Subsample", subsampleSelect)

  const layout = document.createElement("div")
  layout.style.display = "grid"
  layout.style.gridTemplateColumns = "0.9fr 1.1fr"
  layout.style.gap = "12px"

  const metricCard = card("Validation summary")
  const featureCard = card("Feature gain profile")
  const metricPanel = document.createElement("div")
  metricPanel.style.display = "grid"
  metricPanel.style.gap = "10px"
  const metricBars = document.createElement("div")
  metricBars.style.display = "grid"
  metricBars.style.gap = "10px"
  metricPanel.appendChild(metricBars)
  metricCard.shell.appendChild(metricPanel)

  const featureSvg = svgEl("svg", { viewBox: "0 0 520 320", width: "100%", height: "320" })
  featureCard.shell.appendChild(featureSvg)
  layout.append(metricCard.shell, featureCard.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, layout, note)

  function metricBar(label, value, maxValue, color, suffix = "") {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "4px"
    const head = document.createElement("div")
    head.style.display = "flex"
    head.style.justifyContent = "space-between"
    head.style.fontSize = "0.9rem"
    head.innerHTML = `<strong>${label}</strong><span>${value.toFixed(3)}${suffix}</span>`

    const bg = document.createElement("div")
    bg.style.height = "14px"
    bg.style.background = palette.light
    bg.style.borderRadius = "999px"
    bg.style.overflow = "hidden"
    const bar = document.createElement("div")
    bar.style.width = `${(value / maxValue) * 100}%`
    bar.style.height = "100%"
    bar.style.background = color
    bar.style.borderRadius = "999px"
    bg.appendChild(bar)

    wrap.append(head, bg)
    return wrap
  }

  function currentRow() {
    return rows.find(
      (row) => row.depth === state.depth && row.eta === state.eta && row.subsample === state.subsample
    )
  }

  function renderFeatureChart(features) {
    clearNode(featureSvg)
    const width = 520
    const height = 320
    const margin = { top: 30, right: 24, bottom: 32, left: 120 }
    const maxGain = Math.max(...features.map((item) => item.gain))
    const xEnd = width - margin.right
    const rowHeight = (height - margin.top - margin.bottom) / features.length

    features.forEach((item, index) => {
      const y = margin.top + index * rowHeight
      const barWidth = ((item.gain / maxGain) * (xEnd - margin.left))
      const label = svgEl("text", {
        x: margin.left - 10,
        y: y + rowHeight / 2 + 4,
        "text-anchor": "end",
        "font-size": "12",
        fill: "#334155"
      })
      label.textContent = item.feature
      featureSvg.appendChild(label)

      featureSvg.appendChild(
        svgEl("rect", {
          x: margin.left,
          y: y + 4,
          width: xEnd - margin.left,
          height: rowHeight - 8,
          fill: "#eef2f7",
          rx: 8
        })
      )
      featureSvg.appendChild(
        svgEl("rect", {
          x: margin.left,
          y: y + 4,
          width: barWidth,
          height: rowHeight - 8,
          fill: index < 2 ? palette.orange : palette.blue,
          rx: 8
        })
      )

      const value = svgEl("text", {
        x: margin.left + barWidth + 8,
        y: y + rowHeight / 2 + 4,
        "font-size": "12",
        fill: "#334155"
      })
      value.textContent = `${(item.gain * 100).toFixed(1)}%`
      featureSvg.appendChild(value)
    })
  }

  function render() {
    const row = currentRow()
    metricBars.innerHTML = ""
    metricBars.appendChild(metricBar("Validation AUC", row.auc, 0.84, palette.navy))
    metricBars.appendChild(metricBar("1 - logloss", 1 - row.logloss, 0.6, palette.green))
    metricBars.appendChild(metricBar("Relative fit time", row.fitTime, 12, palette.orange, "x"))
    renderFeatureChart(row.features)

    const best = rows.slice().sort((left, right) => right.auc - left.auc)[0]
    note.innerHTML = `
      <strong>What to notice:</strong> XGBoost adds extra knobs on top of boosting.
      Here, depth <strong>${row.depth}</strong>, eta <strong>${row.eta}</strong>, and subsample <strong>${row.subsample}</strong>
      produce AUC <strong>${row.auc.toFixed(3)}</strong>. The strongest setting in this toy grid is
      depth <strong>${best.depth}</strong>, eta <strong>${best.eta}</strong>, subsample <strong>${best.subsample}</strong>,
      which shows the tuning mindset we want students to practice in the lab.
    `
  }

  depthSelect.addEventListener("change", () => {
    state.depth = Number(depthSelect.value)
    render()
  })
  etaSelect.addEventListener("change", () => {
    state.eta = Number(etaSelect.value)
    render()
  })
  subsampleSelect.addEventListener("change", () => {
    state.subsample = Number(subsampleSelect.value)
    render()
  })

  render()
  return container
}

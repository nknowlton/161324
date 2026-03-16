import { card, clearNode, palette, svgEl } from "./shared.js"

const baseModels = [
  { key: "tree", label: "Decision tree", auc: 0.702, weight: 0.08, color: palette.gray },
  { key: "stump_bag", label: "Bagged decision stump", auc: 0.721, weight: 0.11, color: palette.gold },
  { key: "bagged", label: "Bagged trees", auc: 0.773, weight: 0.21, color: palette.teal },
  { key: "xgboost", label: "XGBoost", auc: 0.821, weight: 0.31, color: palette.orange },
  { key: "glm", label: "Logistic regression", auc: 0.744, weight: 0.16, color: palette.blue },
  { key: "lm", label: "Linear regression", auc: 0.694, weight: 0.13, color: palette.navy }
]

const holdoutCases = [
  { label: "Named young cat", truth: "Adopted", truthY: 1, tree: 0.58, stump_bag: 0.55, bagged: 0.66, xgboost: 0.79, glm: 0.61, lm: 0.57 },
  { label: "Older stray dog", truth: "Other", truthY: 0, tree: 0.34, stump_bag: 0.39, bagged: 0.24, xgboost: 0.14, glm: 0.27, lm: 0.32 },
  { label: "Owner surrender puppy", truth: "Adopted", truthY: 1, tree: 0.63, stump_bag: 0.60, bagged: 0.72, xgboost: 0.83, glm: 0.66, lm: 0.62 },
  { label: "Unknown-age cat", truth: "Adopted", truthY: 1, tree: 0.39, stump_bag: 0.43, bagged: 0.47, xgboost: 0.49, glm: 0.44, lm: 0.40 },
  { label: "Transfer hold", truth: "Other", truthY: 0, tree: 0.40, stump_bag: 0.44, bagged: 0.31, xgboost: 0.19, glm: 0.30, lm: 0.35 },
  { label: "Senior dog with owner notes", truth: "Adopted", truthY: 1, tree: 0.44, stump_bag: 0.47, bagged: 0.53, xgboost: 0.57, glm: 0.50, lm: 0.46 },
  { label: "Fractious intake cat", truth: "Other", truthY: 0, tree: 0.58, stump_bag: 0.60, bagged: 0.53, xgboost: 0.43, glm: 0.52, lm: 0.59 },
  { label: "Long stay kennel case", truth: "Other", truthY: 0, tree: 0.49, stump_bag: 0.52, bagged: 0.45, xgboost: 0.34, glm: 0.44, lm: 0.48 }
]

function normalizedActiveModels(activeKeys) {
  const activeModels = baseModels.filter((model) => activeKeys.has(model.key))
  const totalWeight = activeModels.reduce((sum, model) => sum + model.weight, 0)
  if (totalWeight === 0) return []
  return activeModels.map((model) => ({
    ...model,
    normalizedWeight: model.weight / totalWeight
  }))
}

function blendedProbability(caseRow, activeModels) {
  if (activeModels.length === 0) return null
  return activeModels.reduce((sum, model) => sum + caseRow[model.key] * model.normalizedWeight, 0)
}

function computeAuc(rows, scoreAccessor) {
  const positives = rows.filter((row) => row.truthY === 1)
  const negatives = rows.filter((row) => row.truthY === 0)
  if (positives.length === 0 || negatives.length === 0) return null

  let concordance = 0
  positives.forEach((positive) => {
    negatives.forEach((negative) => {
      const positiveScore = scoreAccessor(positive)
      const negativeScore = scoreAccessor(negative)
      if (positiveScore > negativeScore) concordance += 1
      else if (positiveScore === negativeScore) concordance += 0.5
    })
  })

  return concordance / (positives.length * negatives.length)
}

function emptyState(message) {
  const wrap = document.createElement("div")
  wrap.style.minHeight = "240px"
  wrap.style.display = "grid"
  wrap.style.placeItems = "center"
  wrap.style.padding = "1rem"
  wrap.style.borderRadius = "14px"
  wrap.style.background = "#f8fafc"
  wrap.style.color = "#64748b"
  wrap.style.fontSize = "0.95rem"
  wrap.style.textAlign = "center"
  wrap.style.whiteSpace = "pre-line"
  wrap.textContent = message
  return wrap
}

function pieSlicePath(cx, cy, radius, startAngle, endAngle) {
  const startX = cx + radius * Math.cos(startAngle)
  const startY = cy + radius * Math.sin(startAngle)
  const endX = cx + radius * Math.cos(endAngle)
  const endY = cy + radius * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`
}

export function stackingWidget() {
  const state = { active: new Set(baseModels.map((model) => model.key)) }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "12px"
  controls.style.alignItems = "center"

  baseModels.forEach((model) => {
    const label = document.createElement("label")
    label.style.display = "flex"
    label.style.alignItems = "center"
    label.style.gap = "5px"
    label.style.padding = "0.2rem 0.4rem"
    label.style.borderRadius = "999px"
    label.style.background = "rgba(255,255,255,0.75)"
    label.style.border = "1px solid rgba(31, 42, 51, 0.10)"
    label.style.fontSize = "0.82rem"

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.checked = true
    checkbox.style.transform = "scale(0.82)"
    checkbox.style.margin = "0"
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.active.add(model.key)
      else state.active.delete(model.key)
      render()
    })

    const swatch = document.createElement("span")
    swatch.style.width = "9px"
    swatch.style.height = "9px"
    swatch.style.borderRadius = "999px"
    swatch.style.background = model.color
    label.append(checkbox, swatch, document.createTextNode(model.label))
    controls.appendChild(label)
  })

  const topRow = document.createElement("div")
  topRow.style.display = "grid"
  topRow.style.gridTemplateColumns = "1fr 1fr"
  topRow.style.gap = "12px"

  const strengthCard = card("Base learner strength")
  const strengthPanel = document.createElement("div")
  strengthPanel.style.display = "grid"
  strengthPanel.style.gap = "8px"
  strengthCard.shell.appendChild(strengthPanel)

  const weightCard = card("Blend weight pie")
  const weightPanel = document.createElement("div")
  weightPanel.style.display = "grid"
  weightPanel.style.gridTemplateColumns = "0.95fr 0.85fr"
  weightPanel.style.gap = "10px"
  weightPanel.style.alignItems = "center"
  weightPanel.style.position = "relative"
  const weightSvg = svgEl("svg", { viewBox: "0 0 280 260", width: "100%", height: "260" })
  const weightLegend = document.createElement("div")
  weightLegend.style.display = "grid"
  weightLegend.style.gap = "8px"
  const weightEmpty = document.createElement("div")
  weightEmpty.style.display = "none"
  weightEmpty.style.gridColumn = "1 / -1"
  const pieTooltip = document.createElement("div")
  pieTooltip.style.position = "absolute"
  pieTooltip.style.display = "none"
  pieTooltip.style.pointerEvents = "none"
  pieTooltip.style.padding = "0.45rem 0.6rem"
  pieTooltip.style.borderRadius = "10px"
  pieTooltip.style.background = "rgba(15, 23, 42, 0.94)"
  pieTooltip.style.color = "white"
  pieTooltip.style.fontSize = "0.82rem"
  pieTooltip.style.lineHeight = "1.3"
  pieTooltip.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.18)"
  pieTooltip.style.zIndex = "3"
  weightPanel.append(weightSvg, weightLegend, weightEmpty, pieTooltip)
  weightCard.shell.appendChild(weightPanel)

  topRow.append(strengthCard.shell, weightCard.shell)

  const bottomCard = card("Blended holdout probabilities")
  bottomCard.shell.style.gap = "6px"
  bottomCard.shell.style.padding = "0.65rem 0.75rem"
  const holdoutPanel = document.createElement("div")
  holdoutPanel.style.display = "grid"
  holdoutPanel.style.gap = "3px"
  bottomCard.shell.appendChild(holdoutPanel)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, topRow, bottomCard.shell, note)

  function strengthRow(model, isActive) {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "4px"
    wrap.style.opacity = isActive ? "1" : "0.45"

    const head = document.createElement("div")
    head.style.display = "flex"
    head.style.justifyContent = "space-between"
    head.style.alignItems = "center"
    head.style.fontSize = "0.88rem"
    head.innerHTML = `<strong>${model.label}</strong><span>AUC ${model.auc.toFixed(3)}</span>`

    const bg = document.createElement("div")
    bg.style.height = "13px"
    bg.style.background = "#eef2f7"
    bg.style.borderRadius = "999px"
    bg.style.overflow = "hidden"

    const bar = document.createElement("div")
    bar.style.width = `${Math.max(10, ((model.auc - 0.6) / 0.25) * 100)}%`
    bar.style.height = "100%"
    bar.style.background = model.color
    bar.style.borderRadius = "999px"

    bg.appendChild(bar)
    wrap.append(head, bg)
    return wrap
  }

  function renderWeightPie(activeModels) {
    clearNode(weightSvg)
    weightLegend.innerHTML = ""
    clearNode(weightEmpty)
    pieTooltip.style.display = "none"

    if (activeModels.length === 0) {
      weightPanel.style.gridTemplateColumns = "1fr"
      weightSvg.style.display = "none"
      weightLegend.style.display = "none"
      weightEmpty.style.display = "block"
      weightEmpty.appendChild(emptyState("No models selected.\nChoose at least one learner to see the blend weights."))
      return
    }

    weightPanel.style.gridTemplateColumns = "0.95fr 0.85fr"
    weightSvg.style.display = "block"
    weightLegend.style.display = "grid"
    weightEmpty.style.display = "none"

    const cx = 118
    const cy = 128
    const radius = 88
    let startAngle = -Math.PI / 2

    activeModels.forEach((model) => {
      const angle = model.normalizedWeight * Math.PI * 2
      const endAngle = startAngle + angle
      const slice = svgEl("path", {
        d: pieSlicePath(cx, cy, radius, startAngle, endAngle),
        fill: model.color,
        stroke: "white",
        "stroke-width": 2
      })
      slice.style.cursor = "pointer"
      slice.addEventListener("mouseenter", (event) => {
        pieTooltip.innerHTML = `<strong>${model.label}</strong><br>${(model.normalizedWeight * 100).toFixed(1)}% of selected weight`
        pieTooltip.style.display = "block"
        const rect = weightPanel.getBoundingClientRect()
        pieTooltip.style.left = `${event.clientX - rect.left + 10}px`
        pieTooltip.style.top = `${event.clientY - rect.top + 10}px`
      })
      slice.addEventListener("mousemove", (event) => {
        const rect = weightPanel.getBoundingClientRect()
        pieTooltip.style.left = `${event.clientX - rect.left + 10}px`
        pieTooltip.style.top = `${event.clientY - rect.top + 10}px`
      })
      slice.addEventListener("mouseleave", () => {
        pieTooltip.style.display = "none"
      })
      weightSvg.appendChild(slice)
      startAngle = endAngle

      const legendRow = document.createElement("div")
      legendRow.style.display = "grid"
      legendRow.style.gap = "3px"

      const head = document.createElement("div")
      head.style.display = "flex"
      head.style.alignItems = "center"
      head.style.justifyContent = "space-between"
      head.style.gap = "8px"
      head.style.fontSize = "0.86rem"

      const left = document.createElement("div")
      left.style.display = "flex"
      left.style.alignItems = "center"
      left.style.gap = "6px"

      const swatch = document.createElement("span")
      swatch.style.width = "10px"
      swatch.style.height = "10px"
      swatch.style.borderRadius = "999px"
      swatch.style.background = model.color

      const label = document.createElement("span")
      label.textContent = model.label

      const value = document.createElement("strong")
      value.textContent = `${(model.normalizedWeight * 100).toFixed(0)}%`

      left.append(swatch, label)
      head.append(left, value)
      legendRow.appendChild(head)
      weightLegend.appendChild(legendRow)
    })
  }

  function holdoutRow(caseRow, activeModels) {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "2px"
    wrap.style.padding = "0.08rem 0"

    const score = blendedProbability(caseRow, activeModels)
    const predicted = score >= 0.5 ? "Adopted" : "Other"
    const isCorrect = predicted === caseRow.truth

    const head = document.createElement("div")
    head.style.display = "flex"
    head.style.justifyContent = "space-between"
    head.style.alignItems = "center"
    head.style.gap = "8px"
    head.style.fontSize = "0.78rem"
    head.innerHTML = `<strong>${caseRow.label}</strong><span>Predicted: ${predicted} (blend ${score.toFixed(2)})</span>`

    const bg = document.createElement("div")
    bg.style.height = "10px"
    bg.style.background = "#eef2f7"
    bg.style.borderRadius = "999px"
    bg.style.overflow = "hidden"

    const bar = document.createElement("div")
    bar.style.width = `${score * 100}%`
    bar.style.height = "100%"
    bar.style.background = isCorrect ? palette.green : palette.red
    bar.style.borderRadius = "999px"
    bg.appendChild(bar)

    const foot = document.createElement("div")
    foot.style.fontSize = "0.7rem"
    foot.style.color = "#64748b"
    foot.textContent = `Observed outcome: ${caseRow.truth}`

    wrap.append(head, bg, foot)
    return wrap
  }

  function render() {
    const activeModels = normalizedActiveModels(state.active)
    const blendedAuc =
      activeModels.length === 0
        ? null
        : computeAuc(holdoutCases, (caseRow) => blendedProbability(caseRow, activeModels))

    strengthPanel.innerHTML = ""
    baseModels.forEach((model) => {
      strengthPanel.appendChild(strengthRow(model, state.active.has(model.key)))
    })

    renderWeightPie(activeModels)

    holdoutPanel.innerHTML = ""
    if (activeModels.length === 0) {
      holdoutPanel.appendChild(
        emptyState("No models selected.\nSelect one or more learners to see the blended holdout probabilities.")
      )
      bottomCard.heading.textContent = "Blended holdout probabilities · AUC unavailable"
    } else {
      holdoutCases.forEach((caseRow) => holdoutPanel.appendChild(holdoutRow(caseRow, activeModels)))
      bottomCard.heading.textContent = `Blended holdout probabilities · AUC ${blendedAuc.toFixed(3)}`
    }

    if (activeModels.length === 0) {
      note.innerHTML = `
        <strong>What to notice:</strong> stacking blends only the selected base learners. If none are selected,
        there is no ensemble to score, so the weight pie and blended AUC are shown as unavailable rather than failing.
      `
      return
    }

    const strongest = activeModels.slice().sort((left, right) => right.normalizedWeight - left.normalizedWeight)[0]
    note.innerHTML = `
      <strong>What to notice:</strong> the percentages in the pie are <strong>model weights</strong> inside the stack,
      while the percentage shown on each holdout row is that case's <strong>blended adoption probability</strong>.
      Deselecting a learner redistributes the pie weights across the remaining models. In this view,
      <strong>${strongest.label}</strong> has the largest selected weight at <strong>${(strongest.normalizedWeight * 100).toFixed(0)}%</strong>,
      and the blended holdout AUC is <strong>${blendedAuc.toFixed(3)}</strong>.
    `
  }

  render()
  return container
}

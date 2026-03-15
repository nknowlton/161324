import { card, palette } from "./shared.js"

const baseModels = [
  { key: "tree", label: "Decision tree", auc: 0.712, weight: 0.12, color: palette.gray },
  { key: "bagged", label: "Bagged trees", auc: 0.764, weight: 0.24, color: palette.teal },
  { key: "xgboost", label: "XGBoost", auc: 0.809, weight: 0.44, color: palette.orange },
  { key: "glm", label: "Logistic regression", auc: 0.735, weight: 0.20, color: palette.blue }
]

const cases = [
  { label: "Named young cat", truth: "Adopted", tree: 0.58, bagged: 0.63, xgboost: 0.77, glm: 0.59 },
  { label: "Older stray dog", truth: "Other", tree: 0.34, bagged: 0.21, xgboost: 0.15, glm: 0.29 },
  { label: "Injured intake", truth: "Other", tree: 0.26, bagged: 0.18, xgboost: 0.11, glm: 0.24 },
  { label: "Owner surrender puppy", truth: "Adopted", tree: 0.62, bagged: 0.69, xgboost: 0.81, glm: 0.64 },
  { label: "Unknown-age cat", truth: "Adopted", tree: 0.49, bagged: 0.56, xgboost: 0.61, glm: 0.51 },
  { label: "Transfer hold", truth: "Other", tree: 0.39, bagged: 0.33, xgboost: 0.19, glm: 0.30 }
]

function blendedProbability(caseRow, activeModels) {
  const totalWeight = activeModels.reduce((sum, model) => sum + model.weight, 0)
  if (totalWeight === 0) return 0
  return (
    activeModels.reduce((sum, model) => sum + caseRow[model.key] * model.weight, 0) /
    totalWeight
  )
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
    label.style.gap = "6px"
    label.style.padding = "0.35rem 0.65rem"
    label.style.borderRadius = "999px"
    label.style.background = "rgba(255,255,255,0.75)"
    label.style.border = "1px solid rgba(31, 42, 51, 0.10)"

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.checked = true
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.active.add(model.key)
      else state.active.delete(model.key)
      render()
    })

    const swatch = document.createElement("span")
    swatch.style.width = "10px"
    swatch.style.height = "10px"
    swatch.style.borderRadius = "999px"
    swatch.style.background = model.color
    label.append(checkbox, swatch, document.createTextNode(model.label))
    controls.appendChild(label)
  })

  const layout = document.createElement("div")
  layout.style.display = "grid"
  layout.style.gridTemplateColumns = "0.9fr 1.1fr"
  layout.style.gap = "12px"

  const perfCard = card("Base learner strength")
  const perfPanel = document.createElement("div")
  perfPanel.style.display = "grid"
  perfPanel.style.gap = "10px"
  perfCard.shell.appendChild(perfPanel)

  const stackCard = card("Blended holdout probabilities")
  const stackPanel = document.createElement("div")
  stackPanel.style.display = "grid"
  stackPanel.style.gap = "10px"
  stackCard.shell.appendChild(stackPanel)

  layout.append(perfCard.shell, stackCard.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, layout, note)

  function aucBar(model) {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "4px"
    const head = document.createElement("div")
    head.style.display = "flex"
    head.style.justifyContent = "space-between"
    head.style.fontSize = "0.9rem"
    head.innerHTML = `<strong>${model.label}</strong><span>AUC ${model.auc.toFixed(3)}</span>`

    const bg = document.createElement("div")
    bg.style.height = "14px"
    bg.style.background = "#eef2f7"
    bg.style.borderRadius = "999px"
    const bar = document.createElement("div")
    bar.style.width = `${((model.auc - 0.65) / 0.2) * 100}%`
    bar.style.height = "100%"
    bar.style.background = model.color
    bar.style.borderRadius = "999px"
    bg.appendChild(bar)
    wrap.append(head, bg)
    return wrap
  }

  function caseRow(caseRow, activeModels) {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "4px"

    const score = blendedProbability(caseRow, activeModels)
    const predicted = score >= 0.5 ? "Adopted" : "Other"
    const isCorrect = predicted === caseRow.truth
    const head = document.createElement("div")
    head.style.display = "flex"
    head.style.justifyContent = "space-between"
    head.style.fontSize = "0.9rem"
    head.innerHTML = `<strong>${caseRow.label}</strong><span>${predicted} at ${score.toFixed(2)}</span>`

    const bg = document.createElement("div")
    bg.style.height = "16px"
    bg.style.background = "#eef2f7"
    bg.style.borderRadius = "999px"
    const bar = document.createElement("div")
    bar.style.width = `${score * 100}%`
    bar.style.height = "100%"
    bar.style.background = isCorrect ? palette.green : palette.red
    bar.style.borderRadius = "999px"
    bg.appendChild(bar)

    const foot = document.createElement("div")
    foot.style.fontSize = "0.82rem"
    foot.style.color = "#64748b"
    foot.textContent = `Observed outcome: ${caseRow.truth}`
    wrap.append(head, bg, foot)
    return wrap
  }

  function render() {
    const activeModels = baseModels.filter((model) => state.active.has(model.key))
    perfPanel.innerHTML = ""
    baseModels.forEach((model) => perfPanel.appendChild(aucBar(model)))

    stackPanel.innerHTML = ""
    cases.forEach((row) => stackPanel.appendChild(caseRow(row, activeModels)))

    const accuracy =
      cases.filter((row) => {
        const score = blendedProbability(row, activeModels)
        return (score >= 0.5 ? "Adopted" : "Other") === row.truth
      }).length / cases.length

    note.innerHTML = `
      <strong>What to notice:</strong> stacking does not vote equally by default. A meta-learner gives more influence to
      stronger base models, so the blend can keep the stability of bagging while still using the sharper signals from XGBoost.
      With the current model set the blended accuracy on these held-out examples is <strong>${accuracy.toFixed(2)}</strong>.
    `
  }

  render()
  return container
}

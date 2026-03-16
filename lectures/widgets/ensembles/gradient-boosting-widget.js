import {
  card,
  clearNode,
  collectThresholds,
  drawAxes,
  fitGreedyTree,
  linearScale,
  mean,
  mulberry32,
  palette,
  predictTree,
  svgEl,
  ticks
} from "./shared.js"

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value))
}

function logit(probability) {
  return Math.log(probability / (1 - probability))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeClassificationPoints(seed = 32411) {
  const rng = mulberry32(seed)
  return Array.from({ length: 28 }, (_, index) => {
    const x = index / 27
    const signal = -2.8 + 6.8 * x + (x > 0.38 ? -0.8 : 0.5) + (x > 0.73 ? 0.9 : 0)
    const probability = clamp(sigmoid(signal) + (rng() - 0.5) * 0.06, 0.02, 0.98)
    return {
      x,
      y: probability > 0.5 ? 1 : 0
    }
  })
}

function averageLogloss(points, probabilities) {
  return mean(
    points.map((point, index) => {
      const probability = clamp(probabilities[index], 0.001, 0.999)
      return -(point.y * Math.log(probability) + (1 - point.y) * Math.log(1 - probability))
    })
  )
}

function gradientBoostingTrace(points, rounds = 10, learningRate = 0.35, treeSplits = 1) {
  const baseProbability = clamp(mean(points.map((point) => point.y)), 0.05, 0.95)
  let scores = points.map(() => logit(baseProbability))
  let probabilities = scores.map((score) => sigmoid(score))
  const trace = [
    {
      round: 0,
      scores: scores.slice(),
      probabilities: probabilities.slice(),
      gradients: points.map((point, index) => point.y - probabilities[index]),
      logloss: averageLogloss(points, probabilities),
      tree: null
    }
  ]

  for (let round = 1; round <= rounds; round += 1) {
    const gradients = points.map((point, index) => point.y - probabilities[index])
    const tree = fitGreedyTree(points, gradients, treeSplits)
    scores = scores.map((score, index) => score + learningRate * predictTree(tree, points[index].x))
    probabilities = scores.map((score) => sigmoid(score))
    trace.push({
      round,
      scores: scores.slice(),
      probabilities: probabilities.slice(),
      gradients,
      logloss: averageLogloss(points, probabilities),
      tree
    })
  }

  return trace
}

export function gradientBoostingWidget() {
  const points = makeClassificationPoints()
  const maxRounds = 10
  const state = { rounds: 5, learningRate: 0.45, treeSplits: 2 }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.alignItems = "center"
  controls.style.gap = "10px"

  const roundsSlider = document.createElement("input")
  roundsSlider.type = "range"
  roundsSlider.min = "0"
  roundsSlider.max = String(maxRounds)
  roundsSlider.step = "1"
  roundsSlider.value = String(state.rounds)
  roundsSlider.style.width = "220px"
  const roundsLabel = document.createElement("strong")

  const etaSlider = document.createElement("input")
  etaSlider.type = "range"
  etaSlider.min = "0.1"
  etaSlider.max = "0.8"
  etaSlider.step = "0.05"
  etaSlider.value = String(state.learningRate)
  etaSlider.style.width = "220px"
  const etaLabel = document.createElement("strong")

  const splitSelect = document.createElement("select")
  ;[1, 2, 3].forEach((value) => {
    const option = document.createElement("option")
    option.value = String(value)
    option.textContent = value === 1 ? "1 split (stump)" : `${value} splits`
    if (value === state.treeSplits) option.selected = true
    splitSelect.appendChild(option)
  })

  controls.append("Boosting rounds", roundsSlider, roundsLabel, "Learning rate", etaSlider, etaLabel, "Tree size", splitSelect)

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1.2fr 0.9fr"
  panels.style.gap = "12px"

  const fitCard = card("Predicted probability after each learner")
  const gradientCard = card("Pseudo-residuals: round 0 vs current")
  const fitSvg = svgEl("svg", { viewBox: "0 0 620 330", width: "100%", height: "330" })
  const gradientSvg = svgEl("svg", { viewBox: "0 0 460 330", width: "100%", height: "330" })
  fitCard.shell.appendChild(fitSvg)
  gradientCard.shell.appendChild(gradientSvg)
  panels.append(fitCard.shell, gradientCard.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, panels, note)

  function render() {
    roundsLabel.textContent = String(state.rounds)
    etaLabel.textContent = state.learningRate.toFixed(2)
    const trace = gradientBoostingTrace(points, maxRounds, state.learningRate, state.treeSplits)
    const current = trace[state.rounds]
    const baseline = trace[0]

    clearNode(fitSvg)
    clearNode(gradientSvg)

    const fitWidth = 620
    const fitHeight = 330
    const fitMargin = { top: 24, right: 24, bottom: 44, left: 54 }
    const xScale = linearScale(0, 1, fitMargin.left, fitWidth - fitMargin.right)
    const yScale = linearScale(0, 1, fitHeight - fitMargin.bottom, fitMargin.top)
    drawAxes(fitSvg, fitWidth, fitHeight, fitMargin, ticks(0, 1, 6), ticks(0, 1, 5), xScale, yScale, "Toy predictor", "Class probability")

    points.forEach((point) => {
      const observedY = point.y === 1 ? 0.94 : 0.06
      fitSvg.appendChild(
        svgEl("circle", {
          cx: xScale(point.x),
          cy: yScale(observedY),
          r: 5.5,
          fill: point.y === 1 ? palette.orange : "#94a3b8",
          stroke: "white",
          "stroke-width": 1.2
        })
      )
    })

    const probabilityLine = points
      .map((point, index) => `${xScale(point.x)},${yScale(current.probabilities[index])}`)
      .join(" ")
    fitSvg.appendChild(
      svgEl("polyline", {
        points: probabilityLine,
        fill: "none",
        stroke: palette.navy,
        "stroke-width": 3
      })
    )

    collectThresholds(current.tree).forEach((threshold) => {
      fitSvg.appendChild(
        svgEl("line", {
          x1: xScale(threshold),
          y1: fitMargin.top,
          x2: xScale(threshold),
          y2: fitHeight - fitMargin.bottom,
          stroke: palette.blue,
          "stroke-width": 1.8,
          "stroke-dasharray": "6 5"
        })
      )
    })

    const gradientWidth = 460
    const gradientHeight = 330
    const gradientMargin = { top: 24, right: 22, bottom: 44, left: 60 }
    const gradientX = linearScale(0, 1, gradientMargin.left, gradientWidth - gradientMargin.right)
    const gradientY = linearScale(-1, 1, gradientHeight - gradientMargin.bottom, gradientMargin.top)
    drawAxes(
      gradientSvg,
      gradientWidth,
      gradientHeight,
      gradientMargin,
      ticks(0, 1, 6),
      [-1, -0.5, 0, 0.5, 1],
      gradientX,
      gradientY,
      "Toy predictor",
      "Pseudo-residual"
    )

    gradientSvg.appendChild(
      svgEl("line", {
        x1: gradientMargin.left,
        y1: gradientY(0),
        x2: gradientWidth - gradientMargin.right,
        y2: gradientY(0),
        stroke: "#64748b",
        "stroke-width": 1.2,
        "stroke-dasharray": "4 4"
      })
    )

    points.forEach((point, index) => {
      const baseGradient = baseline.gradients[index]
      const gradient = current.gradients[index]
      const x = gradientX(point.x)
      const baseX = x - 3
      const currentX = x + 3

      gradientSvg.appendChild(
        svgEl("line", {
          x1: baseX,
          y1: gradientY(0),
          x2: baseX,
          y2: gradientY(baseGradient),
          stroke: "#cbd5e1",
          "stroke-width": 2.2
        })
      )
      gradientSvg.appendChild(
        svgEl("line", {
          x1: currentX,
          y1: gradientY(0),
          x2: currentX,
          y2: gradientY(gradient),
          stroke: gradient >= 0 ? palette.green : palette.red,
          "stroke-width": 3.2
        })
      )
      gradientSvg.appendChild(
        svgEl("circle", {
          cx: currentX,
          cy: gradientY(gradient),
          r: 4.6,
          fill: gradient >= 0 ? palette.green : palette.red,
          stroke: "white",
          "stroke-width": 1.2
        })
      )
    })

    const loglossImprovement = baseline.logloss - current.logloss
    const baselineMagnitude = mean(baseline.gradients.map((gradient) => Math.abs(gradient)))
    const currentMagnitude = mean(current.gradients.map((gradient) => Math.abs(gradient)))
    note.innerHTML = `
      <strong>What to notice:</strong> gradient boosting fits each tree to the <em>negative gradient</em> of the loss.
      For Bernoulli logloss that gradient is <strong>y - p</strong>, so badly underpredicted positives get large positive
      updates while overpredicted negatives get large negative ones. After <strong>${state.rounds}</strong> rounds,
      the training logloss is <strong>${current.logloss.toFixed(3)}</strong>, a drop of <strong>${loglossImprovement.toFixed(3)}</strong>
      from the baseline. The pale stems show round 0, while the colored stems show the current round: average
      pseudo-residual magnitude falls from <strong>${baselineMagnitude.toFixed(3)}</strong> to <strong>${currentMagnitude.toFixed(3)}</strong>.
      Using <strong>${state.treeSplits}</strong> ${state.treeSplits === 1 ? "split" : "splits"} per learner makes each update
      ${state.treeSplits === 1 ? "a stump" : "a slightly richer tree"}.
    `
  }

  roundsSlider.addEventListener("input", () => {
    state.rounds = Number(roundsSlider.value)
    render()
  })
  etaSlider.addEventListener("input", () => {
    state.learningRate = Number(etaSlider.value)
    render()
  })
  splitSelect.addEventListener("change", () => {
    state.treeSplits = Number(splitSelect.value)
    render()
  })

  render()
  return container
}

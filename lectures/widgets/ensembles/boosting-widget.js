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
  randn,
  svgEl,
  ticks
} from "./shared.js"

function makeRegressionPoints(seed = 32410) {
  const rng = mulberry32(seed)
  return Array.from({ length: 26 }, (_, index) => {
    const x = index / 25
    const signal = 0.35 + 0.45 * Math.sin(2.7 * x) + (x > 0.58 ? 0.22 : -0.08)
    return {
      x,
      y: signal + 0.06 * randn(rng)
    }
  })
}

function boostingTrace(points, rounds = 10, learningRate = 0.35, treeSplits = 1) {
  const base = mean(points.map((point) => point.y))
  let prediction = points.map(() => base)
  const trace = [
    {
      round: 0,
      prediction: prediction.slice(),
      mse: mean(points.map((point, index) => (point.y - prediction[index]) ** 2)),
      tree: null
    }
  ]

  for (let round = 1; round <= rounds; round += 1) {
    const residuals = points.map((point, index) => point.y - prediction[index])
    const tree = fitGreedyTree(points, residuals, treeSplits)
    prediction = prediction.map((value, index) => {
      const update = predictTree(tree, points[index].x)
      return value + learningRate * update
    })
    trace.push({
      round,
      prediction: prediction.slice(),
      mse: mean(points.map((point, index) => (point.y - prediction[index]) ** 2)),
      tree
    })
  }

  return trace
}

export function boostingWidget() {
  const points = makeRegressionPoints()
  const maxRounds = 10
  const state = { rounds: 4, learningRate: 0.35, treeSplits: 1 }

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

  const fitCard = card("Prediction after each weak learner")
  const mseCard = card("Training error by round")
  const fitSvg = svgEl("svg", { viewBox: "0 0 620 330", width: "100%", height: "330" })
  const mseSvg = svgEl("svg", { viewBox: "0 0 460 330", width: "100%", height: "330" })
  fitCard.shell.appendChild(fitSvg)
  mseCard.shell.appendChild(mseSvg)
  panels.append(fitCard.shell, mseCard.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, panels, note)

  function render() {
    roundsLabel.textContent = String(state.rounds)
    etaLabel.textContent = state.learningRate.toFixed(2)
    const trace = boostingTrace(points, maxRounds, state.learningRate, state.treeSplits)
    const current = trace[state.rounds]

    clearNode(fitSvg)
    clearNode(mseSvg)

    const fitWidth = 620
    const fitHeight = 330
    const fitMargin = { top: 24, right: 24, bottom: 44, left: 54 }
    const xScale = linearScale(0, 1, fitMargin.left, fitWidth - fitMargin.right)
    const yScale = linearScale(0, 1, fitHeight - fitMargin.bottom, fitMargin.top)
    drawAxes(fitSvg, fitWidth, fitHeight, fitMargin, ticks(0, 1, 6), ticks(0, 1, 5), xScale, yScale, "Toy predictor", "Response")

    points.forEach((point, index) => {
      fitSvg.appendChild(
        svgEl("line", {
          x1: xScale(point.x),
          y1: yScale(point.y),
          x2: xScale(point.x),
          y2: yScale(current.prediction[index]),
          stroke: palette.light,
          "stroke-width": 3.4
        })
      )
    })

    points.forEach((point) => {
      fitSvg.appendChild(
        svgEl("circle", {
          cx: xScale(point.x),
          cy: yScale(point.y),
          r: 5.5,
          fill: palette.orange,
          stroke: "white",
          "stroke-width": 1.2
        })
      )
    })

    const line = points.map((point, index) => `${xScale(point.x)},${yScale(current.prediction[index])}`).join(" ")
    fitSvg.appendChild(
      svgEl("polyline", {
        points: line,
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

    const mseWidth = 460
    const mseHeight = 330
    const mseMargin = { top: 24, right: 22, bottom: 44, left: 60 }
    const roundScale = linearScale(0, maxRounds, mseMargin.left, mseWidth - mseMargin.right)
    const mseMax = Math.max(...trace.map((step) => step.mse)) * 1.06
    const mseScale = linearScale(0, mseMax, mseHeight - mseMargin.bottom, mseMargin.top)
    drawAxes(
      mseSvg,
      mseWidth,
      mseHeight,
      mseMargin,
      Array.from({ length: maxRounds + 1 }, (_, index) => index),
      ticks(0, mseMax, 5),
      roundScale,
      mseScale,
      "Boosting round",
      "Mean squared error"
    )

    mseSvg.appendChild(
      svgEl("polyline", {
        points: trace.map((step) => `${roundScale(step.round)},${mseScale(step.mse)}`).join(" "),
        fill: "none",
        stroke: palette.green,
        "stroke-width": 3
      })
    )

    trace.forEach((step) => {
      mseSvg.appendChild(
        svgEl("circle", {
          cx: roundScale(step.round),
          cy: mseScale(step.mse),
          r: step.round === state.rounds ? 6.2 : 4.4,
          fill: step.round === state.rounds ? palette.red : palette.green,
          stroke: "white",
          "stroke-width": 1.4
        })
      )
    })

    const improvement = trace[0].mse - current.mse
    note.innerHTML = `
      <strong>What to notice:</strong> boosting is not averaging independent trees. Each new weak learner is trained on the
      current residuals, so the prediction line bends toward the mistakes left by earlier rounds.
      Using <strong>${state.treeSplits}</strong> ${state.treeSplits === 1 ? "split" : "splits"} per learner makes each round
      ${state.treeSplits === 1 ? "a stump" : "a slightly richer tree"}.
      After <strong>${state.rounds}</strong> rounds the training MSE has fallen by <strong>${improvement.toFixed(3)}</strong>
      from the round-0 baseline.
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

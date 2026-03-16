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

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value))
}

function logit(probability) {
  return Math.log(probability / (1 - probability))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeToyPoints(seed = 32410) {
  const rng = mulberry32(seed)
  return Array.from({ length: 26 }, (_, index) => {
    const x = index / 25
    const regressionSignal = 0.35 + 0.45 * Math.sin(2.7 * x) + (x > 0.58 ? 0.22 : -0.08)
    const classSignal = -2.4 + 5.6 * x + 0.9 * Math.sin(2.5 * x) + (x > 0.58 ? 0.8 : -0.35)
    const classProbability = clamp(sigmoid(classSignal), 0.03, 0.97)
    return {
      x,
      regressionY: regressionSignal + 0.06 * randn(rng),
      classProbability,
      classY: rng() < classProbability ? 1 : 0
    }
  })
}

function averageSquaredError(points, predictions) {
  return mean(points.map((point, index) => (point.y - predictions[index]) ** 2))
}

function averageLogloss(points, probabilities) {
  return mean(
    points.map((point, index) => {
      const probability = clamp(probabilities[index], 0.001, 0.999)
      return -(point.y * Math.log(probability) + (1 - point.y) * Math.log(1 - probability))
    })
  )
}

function squaredTrace(points, rounds, learningRate, treeSplits) {
  const base = mean(points.map((point) => point.y))
  let predictions = points.map(() => base)
  const trace = [
    {
      round: 0,
      predictions: predictions.slice(),
      residuals: points.map((point, index) => point.y - predictions[index]),
      error: averageSquaredError(points, predictions),
      tree: null
    }
  ]

  for (let round = 1; round <= rounds; round += 1) {
    const fitTargets = points.map((point, index) => point.y - predictions[index])
    const tree = fitGreedyTree(points, fitTargets, treeSplits)
    predictions = predictions.map((value, index) => value + learningRate * predictTree(tree, points[index].x))
    trace.push({
      round,
      predictions: predictions.slice(),
      residuals: points.map((point, index) => point.y - predictions[index]),
      error: averageSquaredError(points, predictions),
      tree
    })
  }

  return trace
}

function bernoulliTrace(points, rounds, learningRate, treeSplits, mode) {
  const baseProbability = clamp(mean(points.map((point) => point.y)), 0.05, 0.95)
  let probabilities = points.map(() => baseProbability)
  let scores = probabilities.map((probability) => logit(probability))
  const trace = [
    {
      round: 0,
      predictions: probabilities.slice(),
      residuals: points.map((point, index) => point.y - probabilities[index]),
      error: averageLogloss(points, probabilities),
      tree: null
    }
  ]

  for (let round = 1; round <= rounds; round += 1) {
    const fitTargets = points.map((point, index) => point.y - probabilities[index])
    const tree = fitGreedyTree(points, fitTargets, treeSplits)

    if (mode === "gradient") {
      scores = scores.map((score, index) => score + learningRate * predictTree(tree, points[index].x))
      probabilities = scores.map((score) => sigmoid(score))
    } else {
      probabilities = probabilities.map((probability, index) =>
        clamp(probability + learningRate * predictTree(tree, points[index].x), 0.001, 0.999)
      )
      scores = probabilities.map((probability) => logit(probability))
    }

    trace.push({
      round,
      predictions: probabilities.slice(),
      residuals: points.map((point, index) => point.y - probabilities[index]),
      error: averageLogloss(points, probabilities),
      tree
    })
  }

  return trace
}

function makeScenario(loss, mode, rounds, learningRate, treeSplits) {
  const toyPoints = makeToyPoints()

  if (loss === "squared") {
    const points = toyPoints.map((point) => ({
      x: point.x,
      y: point.regressionY
    }))
    return {
      points,
      trace: squaredTrace(points, rounds, learningRate, treeSplits),
      predictionLabel: "Predicted response after each learner",
      responseLabel: "Response",
      errorLabel: "Mean squared error",
      pointY: (point) => point.y,
      pointColor: () => palette.orange,
      residualLabel: mode === "gradient" ? "Pseudo-residual" : "Residual",
      yDomain: [0, 1]
    }
  }

  const points = toyPoints.map((point) => ({
    x: point.x,
    y: point.classY
  }))
  return {
    points,
    trace: bernoulliTrace(points, rounds, learningRate, treeSplits, mode),
    predictionLabel: "Predicted probability after each learner",
    responseLabel: "Class probability",
    errorLabel: "Logloss",
    pointY: (point) => point.y,
    pointColor: (point) => (point.y === 1 ? palette.orange : "#94a3b8"),
    residualLabel: mode === "gradient" ? "Pseudo-residual" : "Residual",
    yDomain: [-0.05, 1.05]
  }
}

function noteText(loss, mode, state, baseline, current) {
  const startMagnitude = mean(baseline.residuals.map((residual) => Math.abs(residual)))
  const currentMagnitude = mean(current.residuals.map((residual) => Math.abs(residual)))
  const errorDrop = baseline.error - current.error

  if (loss === "squared") {
    return `
      <strong>What to notice:</strong> with squared error, plain boosting and gradient boosting line up:
      the pseudo-residual is just the ordinary residual <strong>y - prediction</strong>. After
      <strong>${state.rounds}</strong> rounds the training MSE falls by <strong>${errorDrop.toFixed(3)}</strong>,
      and the average residual magnitude drops from <strong>${startMagnitude.toFixed(3)}</strong> to
      <strong>${currentMagnitude.toFixed(3)}</strong>.
    `
  }

  if (mode === "gradient") {
    return `
      <strong>What to notice:</strong> with Bernoulli logloss, gradient boosting fits trees to the
      pseudo-residual <strong>y - p</strong> but updates the model on the <strong>log-odds</strong> scale before
      converting back to probabilities. After <strong>${state.rounds}</strong> rounds the training logloss falls by
      <strong>${errorDrop.toFixed(3)}</strong>, and the average pseudo-residual magnitude drops from
      <strong>${startMagnitude.toFixed(3)}</strong> to <strong>${currentMagnitude.toFixed(3)}</strong>.
    `
  }

  return `
    <strong>What to notice:</strong> this plain boosting view uses the residual on the probability scale,
    <strong>y - p</strong>, and adds each learner directly to the predicted probability. After
    <strong>${state.rounds}</strong> rounds the training logloss falls by <strong>${errorDrop.toFixed(3)}</strong>,
    and the average residual magnitude drops from <strong>${startMagnitude.toFixed(3)}</strong> to
    <strong>${currentMagnitude.toFixed(3)}</strong>.
  `
}

export function boostingCombinedWidget() {
  const maxRounds = 10
  const state = { loss: "squared", mode: "boosting", rounds: 0, learningRate: 0.35, treeSplits: 1 }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const controls = document.createElement("div")
  controls.style.display = "grid"
  controls.style.gap = "10px"

  const controlsTop = document.createElement("div")
  controlsTop.style.display = "flex"
  controlsTop.style.flexWrap = "wrap"
  controlsTop.style.alignItems = "center"
  controlsTop.style.gap = "12px"

  const controlsBottom = document.createElement("div")
  controlsBottom.style.display = "flex"
  controlsBottom.style.flexWrap = "wrap"
  controlsBottom.style.alignItems = "center"
  controlsBottom.style.gap = "12px"

  function makeSelect(values, selected, labelFn = (value) => String(value)) {
    const el = document.createElement("select")
    el.style.fontSize = "1.02rem"
    el.style.padding = "0.35rem 0.55rem"
    el.style.minHeight = "2.25rem"
    values.forEach((value) => {
      const option = document.createElement("option")
      option.value = String(value)
      option.textContent = labelFn(value)
      if (value === selected) option.selected = true
      el.appendChild(option)
    })
    return el
  }

  const lossSelect = makeSelect(["bernoulli", "squared"], state.loss, (value) =>
    value === "bernoulli" ? "Bernoulli logloss" : "Squared error"
  )
  lossSelect.style.minWidth = "170px"
  const modeSelect = makeSelect(["gradient", "boosting"], state.mode, (value) =>
    value === "gradient" ? "Gradient boosting" : "Boosting"
  )
  modeSelect.style.minWidth = "170px"

  const roundsSlider = document.createElement("input")
  roundsSlider.type = "range"
  roundsSlider.min = "0"
  roundsSlider.max = String(maxRounds)
  roundsSlider.step = "1"
  roundsSlider.value = String(state.rounds)
  roundsSlider.style.width = "180px"
  const roundsLabel = document.createElement("strong")

  const etaSlider = document.createElement("input")
  etaSlider.type = "range"
  etaSlider.min = "0.1"
  etaSlider.max = "0.8"
  etaSlider.step = "0.05"
  etaSlider.value = String(state.learningRate)
  etaSlider.style.width = "180px"
  const etaLabel = document.createElement("strong")

  const splitSelect = makeSelect([1, 2, 3], state.treeSplits, (value) =>
    value === 1 ? "1 split (stump)" : `${value} splits`
  )

  controlsTop.append(
    "Loss",
    lossSelect,
    "Mode",
    modeSelect
  )

  controlsBottom.append(
    "Rounds",
    roundsSlider,
    roundsLabel,
    "Learning rate",
    etaSlider,
    etaLabel,
    "Tree size",
    splitSelect
  )
  controls.append(controlsTop, controlsBottom)

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1.15fr 0.85fr 0.85fr"
  panels.style.gap = "12px"

  const predictionCard = card("Prediction")
  const residualCard = card("Residuals")
  const errorCard = card("Training error by round")
  const predictionSvg = svgEl("svg", { viewBox: "0 0 560 330", width: "100%", height: "330" })
  const residualSvg = svgEl("svg", { viewBox: "0 0 420 330", width: "100%", height: "330" })
  const errorSvg = svgEl("svg", { viewBox: "0 0 420 330", width: "100%", height: "330" })
  predictionCard.shell.appendChild(predictionSvg)
  residualCard.shell.appendChild(residualSvg)
  errorCard.shell.appendChild(errorSvg)
  panels.append(predictionCard.shell, residualCard.shell, errorCard.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, panels, note)

  function renderPredictionPanel(predictionSvgEl, scenario, current) {
    clearNode(predictionSvgEl)
    predictionCard.heading.textContent = scenario.predictionLabel

    const width = 560
    const height = 330
    const margin = { top: 24, right: 24, bottom: 44, left: 54 }
    const xScale = linearScale(0, 1, margin.left, width - margin.right)
    const yScale = linearScale(scenario.yDomain[0], scenario.yDomain[1], height - margin.bottom, margin.top)
    drawAxes(predictionSvgEl, width, height, margin, ticks(0, 1, 6), ticks(0, 1, 5), xScale, yScale, "Toy predictor", scenario.responseLabel)

    scenario.points.forEach((point, index) => {
      if (scenario.responseLabel === "Response") {
        predictionSvgEl.appendChild(
          svgEl("line", {
            x1: xScale(point.x),
            y1: yScale(point.y),
            x2: xScale(point.x),
            y2: yScale(current.predictions[index]),
            stroke: palette.light,
            "stroke-width": 3.2
          })
        )
      }
    })

    if (scenario.responseLabel !== "Response") {
      predictionSvgEl.appendChild(
        svgEl("line", {
          x1: margin.left,
          y1: yScale(0),
          x2: width - margin.right,
          y2: yScale(0),
          stroke: "rgba(100, 116, 139, 0.28)",
          "stroke-width": 1
        })
      )
      predictionSvgEl.appendChild(
        svgEl("line", {
          x1: margin.left,
          y1: yScale(1),
          x2: width - margin.right,
          y2: yScale(1),
          stroke: "rgba(100, 116, 139, 0.28)",
          "stroke-width": 1
        })
      )
    }

    scenario.points.forEach((point) => {
      predictionSvgEl.appendChild(
        svgEl("circle", {
          cx: xScale(point.x),
          cy: yScale(scenario.pointY(point)),
          r: 5.5,
          fill: scenario.pointColor(point),
          stroke: "white",
          "stroke-width": 1.2
        })
      )
    })

    predictionSvgEl.appendChild(
      svgEl("polyline", {
        points: scenario.points
          .map((point, index) => `${xScale(point.x)},${yScale(current.predictions[index])}`)
          .join(" "),
        fill: "none",
        stroke: palette.navy,
        "stroke-width": 3
      })
    )

    collectThresholds(current.tree).forEach((threshold) => {
      predictionSvgEl.appendChild(
        svgEl("line", {
          x1: xScale(threshold),
          y1: margin.top,
          x2: xScale(threshold),
          y2: height - margin.bottom,
          stroke: palette.blue,
          "stroke-width": 1.8,
          "stroke-dasharray": "6 5"
        })
      )
    })
  }

  function renderResidualPanel(residualSvgEl, scenario, baseline, current) {
    clearNode(residualSvgEl)
    residualCard.heading.textContent = `${scenario.residualLabel}s: Round 0 vs Current`

    const width = 420
    const height = 330
    const margin = { top: 24, right: 22, bottom: 44, left: 60 }
    const xScale = linearScale(0, 1, margin.left, width - margin.right)
    const maxAbs = Math.max(
      0.35,
      ...baseline.residuals.map((residual) => Math.abs(residual)),
      ...current.residuals.map((residual) => Math.abs(residual))
    )
    const yScale = linearScale(-maxAbs * 1.08, maxAbs * 1.08, height - margin.bottom, margin.top)
    drawAxes(
      residualSvgEl,
      width,
      height,
      margin,
      ticks(0, 1, 6),
      ticks(-maxAbs, maxAbs, 5),
      xScale,
      yScale,
      "Toy predictor",
      scenario.residualLabel
    )

    residualSvgEl.appendChild(
      svgEl("line", {
        x1: margin.left,
        y1: yScale(0),
        x2: width - margin.right,
        y2: yScale(0),
        stroke: "#64748b",
        "stroke-width": 1.2,
        "stroke-dasharray": "4 4"
      })
    )

    scenario.points.forEach((point, index) => {
      const baselineResidual = baseline.residuals[index]
      const currentResidual = current.residuals[index]
      const x = xScale(point.x)

      residualSvgEl.appendChild(
        svgEl("line", {
          x1: x - 3,
          y1: yScale(0),
          x2: x - 3,
          y2: yScale(baselineResidual),
          stroke: "#cbd5e1",
          "stroke-width": 2.2
        })
      )
      residualSvgEl.appendChild(
        svgEl("line", {
          x1: x + 3,
          y1: yScale(0),
          x2: x + 3,
          y2: yScale(currentResidual),
          stroke: currentResidual >= 0 ? palette.green : palette.red,
          "stroke-width": 3
        })
      )
      residualSvgEl.appendChild(
        svgEl("circle", {
          cx: x + 3,
          cy: yScale(currentResidual),
          r: 4.6,
          fill: currentResidual >= 0 ? palette.green : palette.red,
          stroke: "white",
          "stroke-width": 1.2
        })
      )
    })
  }

  function renderErrorPanel(errorSvgEl, scenario, trace) {
    clearNode(errorSvgEl)
    errorCard.heading.textContent = "Training error by round"

    const width = 420
    const height = 330
    const margin = { top: 24, right: 22, bottom: 44, left: 60 }
    const xScale = linearScale(0, maxRounds, margin.left, width - margin.right)
    const errorMax = Math.max(...trace.map((step) => step.error)) * 1.06
    const yScale = linearScale(0, errorMax, height - margin.bottom, margin.top)
    drawAxes(
      errorSvgEl,
      width,
      height,
      margin,
      Array.from({ length: maxRounds + 1 }, (_, index) => index),
      ticks(0, errorMax, 5),
      xScale,
      yScale,
      "Boosting round",
      scenario.errorLabel
    )

    errorSvgEl.appendChild(
      svgEl("polyline", {
        points: trace.map((step) => `${xScale(step.round)},${yScale(step.error)}`).join(" "),
        fill: "none",
        stroke: palette.green,
        "stroke-width": 3
      })
    )

    trace.forEach((step) => {
      errorSvgEl.appendChild(
        svgEl("circle", {
          cx: xScale(step.round),
          cy: yScale(step.error),
          r: step.round === state.rounds ? 6.2 : 4.4,
          fill: step.round === state.rounds ? palette.red : palette.green,
          stroke: "white",
          "stroke-width": 1.4
        })
      )
    })
  }

  function render() {
    roundsLabel.textContent = String(state.rounds)
    etaLabel.textContent = state.learningRate.toFixed(2)

    const boostingOption = Array.from(modeSelect.options).find((option) => option.value === "boosting")
    const bernoulliMode = state.loss === "bernoulli"
    if (boostingOption) boostingOption.disabled = bernoulliMode
    if (bernoulliMode && state.mode !== "gradient") {
      state.mode = "gradient"
      modeSelect.value = "gradient"
    }

    const scenario = makeScenario(state.loss, state.mode, maxRounds, state.learningRate, state.treeSplits)
    const baseline = scenario.trace[0]
    const current = scenario.trace[state.rounds]

    renderPredictionPanel(predictionSvg, scenario, current)
    renderResidualPanel(residualSvg, scenario, baseline, current)
    renderErrorPanel(errorSvg, scenario, scenario.trace)
    note.innerHTML = noteText(state.loss, state.mode, state, baseline, current)
  }

  lossSelect.addEventListener("change", () => {
    state.loss = lossSelect.value
    render()
  })
  modeSelect.addEventListener("change", () => {
    state.mode = modeSelect.value
    render()
  })
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

import { card, clearNode, drawAxes, linearScale, mulberry32, palette, randn, svgEl, ticks } from "./shared.js"

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

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

function fitResidualStump(points, residuals) {
  const ordered = points.slice().sort((left, right) => left.x - right.x)
  const candidates = ordered.slice(0, -1).map((point, index) => (point.x + ordered[index + 1].x) / 2)
  let best = { threshold: 0.5, leftValue: 0, rightValue: 0, loss: Infinity }

  candidates.forEach((threshold) => {
    const leftIndices = points.map((point, index) => ({ point, index })).filter(({ point }) => point.x < threshold).map(({ index }) => index)
    const rightIndices = points.map((point, index) => ({ point, index })).filter(({ point }) => point.x >= threshold).map(({ index }) => index)
    if (leftIndices.length === 0 || rightIndices.length === 0) return

    const leftValue = mean(leftIndices.map((index) => residuals[index]))
    const rightValue = mean(rightIndices.map((index) => residuals[index]))
    const loss = residuals.reduce((sum, residual, index) => {
      const pred = points[index].x < threshold ? leftValue : rightValue
      return sum + (residual - pred) ** 2
    }, 0)

    if (loss < best.loss) {
      best = { threshold, leftValue, rightValue, loss }
    }
  })

  return best
}

function boostingTrace(points, rounds = 7, learningRate = 0.35) {
  const base = mean(points.map((point) => point.y))
  let prediction = points.map(() => base)
  const trace = [{ round: 0, prediction: prediction.slice(), mse: mean(points.map((point, index) => (point.y - prediction[index]) ** 2)), stump: null }]

  for (let round = 1; round <= rounds; round += 1) {
    const residuals = points.map((point, index) => point.y - prediction[index])
    const stump = fitResidualStump(points, residuals)
    prediction = prediction.map((value, index) => {
      const update = points[index].x < stump.threshold ? stump.leftValue : stump.rightValue
      return value + learningRate * update
    })
    trace.push({
      round,
      prediction: prediction.slice(),
      mse: mean(points.map((point, index) => (point.y - prediction[index]) ** 2)),
      stump
    })
  }

  return trace
}

export function boostingWidget() {
  const points = makeRegressionPoints()
  const state = { rounds: 4, learningRate: 0.35 }

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
  roundsSlider.max = "7"
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

  controls.append("Boosting rounds", roundsSlider, roundsLabel, "Learning rate", etaSlider, etaLabel)

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
    const trace = boostingTrace(points, 7, state.learningRate)
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

    if (current.stump) {
      fitSvg.appendChild(
        svgEl("line", {
          x1: xScale(current.stump.threshold),
          y1: fitMargin.top,
          x2: xScale(current.stump.threshold),
          y2: fitHeight - fitMargin.bottom,
          stroke: palette.blue,
          "stroke-width": 1.8,
          "stroke-dasharray": "6 5"
        })
      )
    }

    const mseWidth = 460
    const mseHeight = 330
    const mseMargin = { top: 24, right: 22, bottom: 44, left: 60 }
    const roundScale = linearScale(0, 7, mseMargin.left, mseWidth - mseMargin.right)
    const mseMax = Math.max(...trace.map((step) => step.mse)) * 1.06
    const mseScale = linearScale(0, mseMax, mseHeight - mseMargin.bottom, mseMargin.top)
    drawAxes(mseSvg, mseWidth, mseHeight, mseMargin, [0, 1, 2, 3, 4, 5, 6, 7], ticks(0, mseMax, 5), roundScale, mseScale, "Boosting round", "Mean squared error")

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
      <strong>What to notice:</strong> boosting is not averaging independent trees. Each new stump is trained on the
      current residuals, so the prediction line bends toward the mistakes left by earlier rounds.
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

  render()
  return container
}

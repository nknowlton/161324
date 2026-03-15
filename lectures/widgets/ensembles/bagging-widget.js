import { card, clearNode, drawAxes, extent, linearScale, mulberry32, palette, randn, svgEl, ticks } from "./shared.js"

function makeToyPoints(seed = 161324) {
  const rng = mulberry32(seed)
  return Array.from({ length: 28 }, (_, index) => {
    const x = 0.04 + (index / 27) * 0.92
    const boundary = 0.52 + 0.03 * Math.sin(index / 3)
    let label = x > boundary ? 1 : 0
    if (Math.abs(x - boundary) < 0.08 && rng() < 0.32) label = 1 - label
    if (rng() < 0.04) label = 1 - label
    return {
      id: index,
      x,
      label,
      y: label === 1 ? 0.74 + 0.08 * randn(rng) : 0.28 + 0.08 * randn(rng)
    }
  })
}

function bootstrapSample(points, rng) {
  return Array.from({ length: points.length }, () => points[Math.floor(rng() * points.length)])
}

function majorityClass(points) {
  const ones = points.filter((point) => point.label === 1).length
  return ones >= points.length / 2 ? 1 : 0
}

function stumpLoss(sample, threshold, leftClass, rightClass) {
  return sample.reduce((sum, point) => {
    const pred = point.x < threshold ? leftClass : rightClass
    return sum + Number(pred !== point.label)
  }, 0)
}

function bestStump(sample) {
  const ordered = sample.slice().sort((left, right) => left.x - right.x)
  const candidates = ordered.slice(0, -1).map((point, index) => (point.x + ordered[index + 1].x) / 2)
  let best = { threshold: 0.5, leftClass: 0, rightClass: 1, loss: Infinity }

  candidates.forEach((threshold) => {
    const left = sample.filter((point) => point.x < threshold)
    const right = sample.filter((point) => point.x >= threshold)
    if (left.length === 0 || right.length === 0) return

    const leftClass = majorityClass(left)
    const rightClass = majorityClass(right)
    const loss = stumpLoss(sample, threshold, leftClass, rightClass)
    if (loss < best.loss) {
      best = { threshold, leftClass, rightClass, loss }
    }
  })

  return best
}

function makeForest(points, trees = 15, seed = 2026) {
  const rng = mulberry32(seed)
  return Array.from({ length: trees }, () => bestStump(bootstrapSample(points, rng)))
}

function ensembleProbability(x, forest) {
  const votes = forest.reduce((sum, stump) => sum + (x < stump.threshold ? stump.leftClass : stump.rightClass), 0)
  return votes / Math.max(forest.length, 1)
}

export function baggingWidget() {
  const points = makeToyPoints()
  const state = { trees: 15 }
  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.alignItems = "center"
  controls.style.gap = "10px"

  const slider = document.createElement("input")
  slider.type = "range"
  slider.min = "1"
  slider.max = "40"
  slider.step = "1"
  slider.value = String(state.trees)
  slider.style.width = "260px"
  const label = document.createElement("strong")
  controls.append("Bootstrap trees", slider, label)

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1.15fr 1fr"
  panels.style.gap = "12px"

  const forestCard = card("Single-tree instability vs bagging")
  const voteCard = card("Majority vote across X")
  const forestSvg = svgEl("svg", { viewBox: "0 0 620 320", width: "100%", height: "320" })
  const voteSvg = svgEl("svg", { viewBox: "0 0 520 320", width: "100%", height: "320" })
  forestCard.shell.appendChild(forestSvg)
  voteCard.shell.appendChild(voteSvg)
  panels.append(forestCard.shell, voteCard.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.94rem"
  note.style.color = "#425565"

  container.append(controls, panels, note)

  function render() {
    const forest = makeForest(points, state.trees, 4000 + state.trees)
    label.textContent = String(state.trees)

    clearNode(forestSvg)
    clearNode(voteSvg)

    const forestWidth = 620
    const forestHeight = 320
    const forestMargin = { top: 24, right: 18, bottom: 44, left: 54 }
    const xScale = linearScale(0, 1, forestMargin.left, forestWidth - forestMargin.right)
    const yScale = linearScale(0, 1, forestHeight - forestMargin.bottom, forestMargin.top)
    drawAxes(
      forestSvg,
      forestWidth,
      forestHeight,
      forestMargin,
      ticks(0, 1, 6),
      [0.2, 0.5, 0.8],
      xScale,
      yScale,
      "Toy predictor",
      "Class strip"
    )

    forest.forEach((stump, index) => {
      forestSvg.appendChild(
        svgEl("line", {
          x1: xScale(stump.threshold),
          y1: forestMargin.top,
          x2: xScale(stump.threshold),
          y2: forestHeight - forestMargin.bottom,
          stroke: palette.blue,
          "stroke-width": index === forest.length - 1 ? 2.8 : 1.2,
          opacity: index === forest.length - 1 ? 0.85 : 0.16
        })
      )
    })

    points.forEach((point) => {
      forestSvg.appendChild(
        svgEl("circle", {
          cx: xScale(point.x),
          cy: yScale(point.y),
          r: 6.5,
          fill: point.label === 1 ? palette.orange : palette.teal,
          stroke: "white",
          "stroke-width": 1.4
        })
      )
    })

    const voteWidth = 520
    const voteHeight = 320
    const voteMargin = { top: 24, right: 18, bottom: 44, left: 56 }
    const voteX = linearScale(0, 1, voteMargin.left, voteWidth - voteMargin.right)
    const voteY = linearScale(0, 1, voteHeight - voteMargin.bottom, voteMargin.top)
    drawAxes(voteSvg, voteWidth, voteHeight, voteMargin, ticks(0, 1, 6), ticks(0, 1, 5), voteX, voteY, "Toy predictor", "Vote for class 1")

    const grid = Array.from({ length: 60 }, (_, index) => index / 59)
    const pointsString = grid.map((value) => `${voteX(value)},${voteY(ensembleProbability(value, forest))}`).join(" ")
    voteSvg.appendChild(
      svgEl("polyline", {
        points: pointsString,
        fill: "none",
        stroke: palette.navy,
        "stroke-width": 3
      })
    )

    forest.forEach((stump) => {
      voteSvg.appendChild(
        svgEl("circle", {
          cx: voteX(stump.threshold),
          cy: voteY(ensembleProbability(stump.threshold, forest)),
          r: 3.2,
          fill: palette.blue,
          opacity: 0.45
        })
      )
    })

    const avgThreshold = forest.reduce((sum, stump) => sum + stump.threshold, 0) / forest.length
    const spread = Math.sqrt(
      forest.reduce((sum, stump) => sum + (stump.threshold - avgThreshold) ** 2, 0) / Math.max(forest.length - 1, 1)
    )

    note.innerHTML = `
      <strong>What to notice:</strong> one shallow tree can place its split in noticeably different places after each bootstrap resample.
      Bagging leaves that variance visible as faint blue lines, then averages it into a smoother vote curve.
      With <strong>${state.trees}</strong> trees the average split is around <strong>${avgThreshold.toFixed(2)}</strong> with spread <strong>${spread.toFixed(2)}</strong>.
    `
  }

  slider.addEventListener("input", () => {
    state.trees = Number(slider.value)
    render()
  })

  render()
  return container
}

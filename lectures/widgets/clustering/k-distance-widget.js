import { palette, svgEl, clearNode, densityPoints, distance } from "./shared.js"

function makePanel(title) {
  const shell = document.createElement("div")
  shell.style.display = "grid"
  shell.style.gap = "0.7rem"
  shell.style.padding = "0.8rem"
  shell.style.borderRadius = "16px"
  shell.style.background = "rgba(255,255,255,0.56)"
  shell.style.border = "1px solid rgba(31, 42, 51, 0.1)"

  const heading = document.createElement("div")
  heading.style.fontSize = "0.84rem"
  heading.style.fontWeight = "700"
  heading.style.color = "#1f2a33"
  heading.textContent = title

  return { shell, heading }
}

function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

function orderedKDistance(points, neighborRank) {
  const safeRank = Math.max(1, Math.min(points.length - 1, neighborRank))
  const values = points.map((point) => {
    const sorted = points
      .map((other) => distance(point, other))
      .sort((left, right) => left - right)
    return sorted[safeRank]
  })

  return values.sort((left, right) => left - right)
}

function drawAxes(svg, width, height, margin, xTicks, yTicks, xScale, yScale, xLabel, yLabel) {
  svg.appendChild(
    svgEl("line", {
      x1: margin.left,
      y1: height - margin.bottom,
      x2: width - margin.right,
      y2: height - margin.bottom,
      stroke: "#6b7280",
      "stroke-width": 1.2
    })
  )
  svg.appendChild(
    svgEl("line", {
      x1: margin.left,
      y1: margin.top,
      x2: margin.left,
      y2: height - margin.bottom,
      stroke: "#6b7280",
      "stroke-width": 1.2
    })
  )

  yTicks.forEach((tick) => {
    const y = yScale(tick)
    svg.appendChild(
      svgEl("line", {
        x1: margin.left,
        y1: y,
        x2: width - margin.right,
        y2: y,
        stroke: "rgba(107, 114, 128, 0.18)",
        "stroke-width": 1
      })
    )
    const label = svgEl("text", {
      x: margin.left - 10,
      y: y + 4,
      "text-anchor": "end",
      "font-size": "11",
      fill: "#5b6770"
    })
    label.textContent = tick.toFixed(2)
    svg.appendChild(label)
  })

  xTicks.forEach((tick) => {
    const x = xScale(tick)
    svg.appendChild(
      svgEl("line", {
        x1: x,
        y1: height - margin.bottom,
        x2: x,
        y2: height - margin.bottom + 6,
        stroke: "#6b7280",
        "stroke-width": 1
      })
    )
    const label = svgEl("text", {
      x,
      y: height - margin.bottom + 20,
      "text-anchor": "middle",
      "font-size": "11",
      fill: "#5b6770"
    })
    label.textContent = String(tick)
    svg.appendChild(label)
  })

  const xAxisLabel = svgEl("text", {
    x: (margin.left + width - margin.right) / 2,
    y: height - 8,
    "text-anchor": "middle",
    "font-size": "12",
    fill: "#334155"
  })
  xAxisLabel.textContent = xLabel
  svg.appendChild(xAxisLabel)

  const yAxisLabel = svgEl("text", {
    x: 16,
    y: (margin.top + height - margin.bottom) / 2,
    transform: `rotate(-90 16 ${(margin.top + height - margin.bottom) / 2})`,
    "text-anchor": "middle",
    "font-size": "12",
    fill: "#334155"
  })
  yAxisLabel.textContent = yLabel
  svg.appendChild(yAxisLabel)
}

export function kDistanceWidget() {
  const state = { minPts: 5, neighborRank: 2 }
  const maxRank = Math.min(10, densityPoints.length - 1)
  const sourceColors = new Map([
    ["crescent", palette[0]],
    ["ring", palette[1]],
    ["noise", "#9aa3ab"]
  ])

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.alignItems = "center"
  controls.style.gap = "10px"

  const minPts = document.createElement("input")
  minPts.type = "range"
  minPts.min = "3"
  minPts.max = "8"
  minPts.step = "1"
  minPts.value = String(state.minPts)

  const neighborRank = document.createElement("input")
  neighborRank.type = "range"
  neighborRank.min = "1"
  neighborRank.max = String(maxRank)
  neighborRank.step = "1"
  neighborRank.value = String(state.neighborRank)

  const labels = document.createElement("strong")
  controls.append("MinPts", minPts, "Comparison neighbor rank", neighborRank, labels)

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1fr 1.15fr"
  panels.style.gap = "12px"

  const scatterPanel = makePanel("Synthetic DBSCAN geometry")
  const curvePanel = makePanel("Ordered k-distance curves")

  const scatterSvg = svgEl("svg", { viewBox: "0 0 360 340", width: "100%", height: "340" })
  const curveSvg = svgEl("svg", { viewBox: "0 0 460 340", width: "100%", height: "340" })
  const summary = document.createElement("div")
  summary.style.fontSize = "0.9rem"
  summary.style.color = "#425565"
  const note = document.createElement("div")
  note.style.fontSize = "0.9rem"
  note.style.color = "#425565"

  scatterPanel.shell.append(scatterPanel.heading, scatterSvg)
  curvePanel.shell.append(curvePanel.heading, curveSvg)
  panels.append(scatterPanel.shell, curvePanel.shell)
  container.append(controls, panels, summary, note)

  function renderScatter() {
    clearNode(scatterSvg)
    scatterSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 360, height: 340, fill: "rgba(255,255,255,0.74)" }))

    const xs = densityPoints.map((point) => point.x)
    const ys = densityPoints.map((point) => point.y)
    const minX = Math.min(...xs) - 1
    const maxX = Math.max(...xs) + 1
    const minY = Math.min(...ys) - 1
    const maxY = Math.max(...ys) + 1
    const xScale = linearScale(minX, maxX, 32, 328)
    const yScale = linearScale(minY, maxY, 292, 44)

    densityPoints.forEach((point) => {
      const location = { x: xScale(point.x), y: yScale(point.y) }
      scatterSvg.appendChild(
        svgEl("circle", {
          cx: location.x,
          cy: location.y,
          r: 6,
          fill: sourceColors.get(point.source) ?? palette[0],
          stroke: "rgba(255,255,255,0.9)",
          "stroke-width": 1.2,
          opacity: 0.9
        })
      )
    })

    const legendY = 24
    ;[
      ["crescent", "Crescent"],
      ["ring", "Ring"],
      ["noise", "Noise"]
    ].forEach(([source, label], index) => {
      const x = 32 + index * 94
      scatterSvg.appendChild(
        svgEl("circle", {
          cx: x,
          cy: legendY,
          r: 5.5,
          fill: sourceColors.get(source),
          stroke: "rgba(31,42,51,0.18)",
          "stroke-width": 1
        })
      )
      const text = svgEl("text", { x: x + 10, y: legendY + 4, "font-size": "11", fill: "#334155" })
      text.textContent = label
      scatterSvg.appendChild(text)
    })

    const caption = svgEl("text", {
      x: 180,
      y: 324,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#51616f"
    })
    caption.textContent = "Same synthetic crescent, ring, and noise points used in the DBSCAN demo."
    scatterSvg.appendChild(caption)
  }

  function renderCurves() {
    clearNode(curveSvg)
    curveSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 460, height: 340, fill: "rgba(255,255,255,0.74)" }))

    const recommendedRank = Math.max(1, state.minPts - 1)
    const comparisonRank = Math.max(1, Math.min(maxRank, state.neighborRank))
    const recommended = orderedKDistance(densityPoints, recommendedRank)
    const comparison = orderedKDistance(densityPoints, comparisonRank)
    const yValues = [...recommended, ...comparison]
    const width = 460
    const height = 340
    const margin = { top: 24, right: 22, bottom: 54, left: 58 }
    const xScale = linearScale(1, recommended.length, margin.left, width - margin.right)
    const yScale = linearScale(0, Math.max(...yValues) * 1.08, height - margin.bottom, margin.top)
    const yMax = Math.max(...yValues) * 1.02
    const yTicks = Array.from({ length: 5 }, (_, index) => (index / 4) * yMax)
    const xTicks = [...new Set([1, 10, 20, 30, 40, recommended.length])].filter((tick) => tick <= recommended.length)

    drawAxes(
      curveSvg,
      width,
      height,
      margin,
      xTicks,
      yTicks,
      xScale,
      yScale,
      "Ordered points",
      "Distance to kth nearest other point"
    )

    const recLine = svgEl("polyline", {
      fill: "none",
      stroke: "#cf5d2e",
      "stroke-width": 3,
      points: recommended.map((value, index) => `${xScale(index + 1)},${yScale(value)}`).join(" ")
    })
    curveSvg.appendChild(recLine)

    if (comparisonRank !== recommendedRank) {
      const compLine = svgEl("polyline", {
        fill: "none",
        stroke: "#197278",
        "stroke-width": 2.3,
        "stroke-dasharray": "7 4",
        points: comparison.map((value, index) => `${xScale(index + 1)},${yScale(value)}`).join(" ")
      })
      curveSvg.appendChild(compLine)
    }

    const legendItems = comparisonRank === recommendedRank
      ? [{ label: `Recommended: k = ${recommendedRank}`, color: "#cf5d2e", dashed: false }]
      : [
          { label: `Recommended: k = ${recommendedRank}`, color: "#cf5d2e", dashed: false },
          { label: `Comparison: k = ${comparisonRank}`, color: "#197278", dashed: true }
        ]

    legendItems.forEach((item, index) => {
      const y = 22 + index * 18
      const legendLineAttrs = {
        x1: width - 174,
        y1: y,
        x2: width - 144,
        y2: y,
        stroke: item.color,
        "stroke-width": item.dashed ? 2.2 : 3
      }
      if (item.dashed) legendLineAttrs["stroke-dasharray"] = "7 4"
      curveSvg.appendChild(
        svgEl("line", legendLineAttrs)
      )
      const text = svgEl("text", { x: width - 138, y: y + 4, "font-size": "11", fill: "#334155" })
      text.textContent = item.label
      curveSvg.appendChild(text)
    })
  }

  function render() {
    const recommendedRank = Math.max(1, state.minPts - 1)
    labels.textContent = `MinPts = ${state.minPts} | DBSCAN-matching rank = ${recommendedRank} | comparison rank = ${state.neighborRank}`
    summary.textContent =
      `Because MinPts counts the point itself, the matching diagnostic curve is the distance to the ${recommendedRank}th nearest other point.`
    note.textContent =
      state.neighborRank === recommendedRank
        ? "The comparison rank currently matches the DBSCAN recommendation, so the widget shows the single curve you would inspect for the eps elbow."
        : "Changing the comparison rank changes the slope of the ordered-distance curve. Use the rank tied to MinPts when choosing the curve for eps."
    renderScatter()
    renderCurves()
  }

  minPts.addEventListener("input", () => {
    state.minPts = Number(minPts.value)
    if (state.neighborRank > maxRank) state.neighborRank = maxRank
    render()
  })

  neighborRank.addEventListener("input", () => {
    state.neighborRank = Number(neighborRank.value)
    render()
  })

  render()
  return container
}

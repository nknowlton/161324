import { palette, svgEl, clearNode, shortMonsterType } from "./shared.js"

function toRows(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const keys = Object.keys(data)
  const size = keys.length === 0 ? 0 : Math.max(...keys.map((key) => (Array.isArray(data[key]) ? data[key].length : 0)))
  return Array.from({ length: size }, (_, index) =>
    Object.fromEntries(keys.map((key) => [key, Array.isArray(data[key]) ? data[key][index] : data[key]]))
  )
}

function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

function extent(values, paddingFraction = 0.08) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return [min - span * paddingFraction, max + span * paddingFraction]
}

function drawAxes(svg, width, height, margin, xTicks, yTicks, xScale, yScale, xLabel, yLabel) {
  svg.appendChild(svgEl("line", { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: "#6b7280", "stroke-width": 1.2 }))
  svg.appendChild(svgEl("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: "#6b7280", "stroke-width": 1.2 }))

  yTicks.forEach((tick) => {
    const y = yScale(tick)
    svg.appendChild(svgEl("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: "rgba(107, 114, 128, 0.22)", "stroke-width": 1 }))
    const label = svgEl("text", { x: margin.left - 10, y: y + 4, "text-anchor": "end", "font-size": "11", fill: "#5b6770" })
    label.textContent = tick.toFixed(0)
    svg.appendChild(label)
  })

  xTicks.forEach((tick) => {
    const x = xScale(tick)
    svg.appendChild(svgEl("line", { x1: x, y1: height - margin.bottom, x2: x, y2: height - margin.bottom + 6, stroke: "#6b7280", "stroke-width": 1 }))
    const label = svgEl("text", { x, y: height - margin.bottom + 20, "text-anchor": "middle", "font-size": "11", fill: "#5b6770" })
    label.textContent = String(tick)
    svg.appendChild(label)
  })

  const xAxisLabel = svgEl("text", { x: (margin.left + width - margin.right) / 2, y: height - 8, "text-anchor": "middle", "font-size": "12", fill: "#334155" })
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

function makePanel(title) {
  const shell = document.createElement("div")
  shell.style.display = "grid"
  shell.style.gap = "8px"
  shell.style.padding = "0.75rem"
  shell.style.borderRadius = "16px"
  shell.style.background = "rgba(255,255,255,0.5)"
  shell.style.border = "1px solid rgba(31, 42, 51, 0.1)"

  const heading = document.createElement("div")
  heading.style.fontSize = "0.82rem"
  heading.style.fontWeight = "700"
  heading.style.color = "#1f2a33"
  heading.textContent = title

  return { shell, heading }
}

export function monsterKmeansWidget(pointsData, elbowData) {
  const points = toRows(pointsData).map((point) => {
    const converted = { ...point, pc1: Number(point.pc1), pc2: Number(point.pc2) }
    for (let k = 2; k <= 8; k += 1) {
      converted[`k${k}`] = Number(point[`k${k}`])
    }
    return converted
  })
  const elbow = toRows(elbowData).map((item) => ({
    k: Number(item.k),
    totWithinss: Number(item["tot.withinss"] ?? item.tot_withinss)
  }))
  const state = { k: 5, hovered: null, hoveredType: null }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.alignItems = "center"
  controls.style.gap = "10px"

  const kSlider = document.createElement("input")
  kSlider.type = "range"
  kSlider.min = "2"
  kSlider.max = "8"
  kSlider.step = "1"
  kSlider.value = "5"
  kSlider.style.width = "240px"

  const kLabel = document.createElement("strong")
  controls.append("Choose K", kSlider, kLabel)

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1fr 1fr"
  panels.style.gap = "12px"

  const elbowPanel = makePanel("Scree / Elbow Plot")
  const scatterPanel = makePanel("PCA Score Plot")

  const elbowSvg = svgEl("svg", { viewBox: "0 0 520 340", width: "100%", height: "340" })
  const scatterSvg = svgEl("svg", { viewBox: "0 0 520 340", width: "100%", height: "340" })
  const hoverNote = document.createElement("div")
  hoverNote.style.fontSize = "0.88rem"
  hoverNote.style.color = "#51616f"
  hoverNote.style.minHeight = "1.2em"

  elbowPanel.shell.append(elbowPanel.heading, elbowSvg)
  scatterPanel.shell.append(scatterPanel.heading, scatterSvg, hoverNote)
  panels.append(elbowPanel.shell, scatterPanel.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(controls, panels, note)

  const renderElbow = () => {
    clearNode(elbowSvg)
    elbowSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 520, height: 340, fill: "rgba(255,255,255,0.74)" }))

    const width = 520
    const height = 340
    const margin = { top: 24, right: 24, bottom: 48, left: 70 }
    const xTicks = elbow.map((item) => item.k)
    const yValues = elbow.map((item) => item.totWithinss)
    const yBreaks = 5
    const yTicks = Array.from({ length: yBreaks }, (_, index) => {
      const fraction = index / (yBreaks - 1)
      return Math.max(...yValues) - fraction * (Math.max(...yValues) - Math.min(...yValues))
    })

    const xScale = linearScale(Math.min(...xTicks), Math.max(...xTicks), margin.left, width - margin.right)
    const yScale = linearScale(Math.min(...yValues), Math.max(...yValues), height - margin.bottom, margin.top)

    drawAxes(elbowSvg, width, height, margin, xTicks, yTicks, xScale, yScale, "Number of clusters K", "Total within-cluster SS")

    const line = svgEl("polyline", {
      fill: "none",
      stroke: "#c44e2b",
      "stroke-width": 2.5,
      points: elbow.map((item) => `${xScale(item.k)},${yScale(item.totWithinss)}`).join(" ")
    })
    elbowSvg.appendChild(line)

    const selectedX = xScale(state.k)
    elbowSvg.appendChild(
      svgEl("line", {
        x1: selectedX,
        y1: margin.top,
        x2: selectedX,
        y2: height - margin.bottom,
        stroke: "#111827",
        "stroke-width": 1.8,
        "stroke-dasharray": "6 5",
        opacity: 0.8
      })
    )

    elbow.forEach((item) => {
      const selected = item.k === state.k
      elbowSvg.appendChild(
        svgEl("circle", {
          cx: xScale(item.k),
          cy: yScale(item.totWithinss),
          r: selected ? 6.2 : 4.4,
          fill: selected ? "#111827" : "#c44e2b",
          stroke: "white",
          "stroke-width": 1.6
        })
      )
    })

    const flag = svgEl("text", {
      x: selectedX + 8,
      y: margin.top + 14,
      "font-size": "12",
      fill: "#111827"
    })
    flag.textContent = `K = ${state.k}`
    elbowSvg.appendChild(flag)
  }

  const renderScatter = () => {
    clearNode(scatterSvg)
    scatterSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 520, height: 340, fill: "rgba(255,255,255,0.74)" }))

    const width = 520
    const height = 340
    const margin = { top: 24, right: 24, bottom: 48, left: 54 }
    const [minX, maxX] = extent(points.map((point) => point.pc1))
    const [minY, maxY] = extent(points.map((point) => point.pc2))
    const xScale = linearScale(minX, maxX, margin.left, width - margin.right)
    const yScale = linearScale(minY, maxY, height - margin.bottom, margin.top)
    const xTicks = [-2, 0, 2, 4].filter((value) => value >= minX && value <= maxX)
    const yTicks = [-2, 0, 2, 4].filter((value) => value >= minY && value <= maxY)

    drawAxes(scatterSvg, width, height, margin, xTicks, yTicks, xScale, yScale, "PC1", "PC2")

    const selectedKey = `k${state.k}`
    points.forEach((point) => {
      const cluster = point[selectedKey]
      const hovered = state.hovered === point.name
      const highlighted = state.hoveredType != null && point.type === state.hoveredType
      const dimmed = state.hoveredType != null && point.type !== state.hoveredType
      const circle = svgEl("circle", {
        cx: xScale(point.pc1),
        cy: yScale(point.pc2),
        r: hovered ? 7.4 : highlighted ? 6.4 : 5.4,
        fill: palette[(cluster - 1) % palette.length],
        stroke: hovered || highlighted ? "#111827" : "rgba(255,255,255,0.92)",
        "stroke-width": hovered ? 2.3 : highlighted ? 1.8 : 1.2,
        opacity: dimmed ? 0.22 : hovered ? 1 : 0.92,
        cursor: "pointer"
      })

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
      title.textContent = `${point.name} (${point.type})`
      circle.appendChild(title)

      circle.addEventListener("mouseenter", () => {
        state.hovered = point.name
        state.hoveredType = point.type
        hoverNote.textContent = `${point.name} | ${shortMonsterType(point.type)}`
        renderScatter()
      })
      circle.addEventListener("mouseleave", () => {
        state.hovered = null
        state.hoveredType = null
        hoverNote.textContent = "Hover a point to highlight all monsters of that type."
        renderScatter()
      })

      scatterSvg.appendChild(circle)
    })

    hoverNote.textContent = state.hovered
      ? hoverNote.textContent
      : "Hover a point to highlight all monsters of that type."

    const hoverLabel = svgEl("text", {
      x: margin.left,
      y: height - 14,
      "font-size": "12",
      fill: "#334155"
    })
    hoverLabel.textContent =
      state.hoveredType && state.hovered ? `${state.hovered} | ${shortMonsterType(state.hoveredType)}` : ""
    scatterSvg.appendChild(hoverLabel)
  }

  const render = () => {
    kLabel.textContent = `K = ${state.k}`
    renderElbow()
    renderScatter()
    note.textContent =
      `The left panel shows the elbow curve for the monsters data. The right panel shows the final K-means grouping in the PC1/PC2 view for the selected K.`
  }

  kSlider.addEventListener("input", () => {
    state.k = Number(kSlider.value)
    state.hovered = null
    state.hoveredType = null
    render()
  })

  render()
  return container
}

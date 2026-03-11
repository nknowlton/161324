import { svgEl, clearNode, shortMonsterType, monsterTypeColorMap } from "./shared.js"

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

function ticks(min, max, count = 5) {
  if (count <= 1) return [min]
  return Array.from({ length: count }, (_, index) => min + (index / (count - 1)) * (max - min))
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
    label.textContent = tick.toFixed(1)
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
    label.textContent = tick.toFixed(1)
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

export function monsterUmapWidget(pointsData, axisXLabel = "UMAP 1", axisYLabel = "UMAP 2") {
  const points = toRows(pointsData).map((point) => ({
    ...point,
    id: Number(point.id),
    x: Number(point.x),
    y: Number(point.y)
  }))
  const state = { activeType: null, hoveredName: null }
  const types = [...new Set(points.map((point) => point.type))].sort((left, right) => shortMonsterType(left).localeCompare(shortMonsterType(right)))
  const typeColors = monsterTypeColorMap(types)

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const legend = document.createElement("div")
  legend.style.display = "grid"
  legend.style.gridTemplateColumns = "repeat(auto-fit, minmax(140px, 1fr))"
  legend.style.gap = "8px 12px"

  const svg = svgEl("svg", { viewBox: "0 0 760 420", width: "100%", height: "420" })

  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(legend, svg, note)

  function renderLegend() {
    clearNode(legend)
    types.forEach((type) => {
      const item = document.createElement("div")
      item.style.display = "inline-flex"
      item.style.alignItems = "center"
      item.style.gap = "8px"
      item.style.padding = "0.28rem 0.5rem"
      item.style.borderRadius = "999px"
      item.style.border = state.activeType === type ? "1px solid rgba(17, 24, 39, 0.35)" : "1px solid rgba(31, 42, 51, 0.1)"
      item.style.background = state.activeType === type ? "rgba(17, 24, 39, 0.06)" : "rgba(255,255,255,0.55)"
      item.style.cursor = "pointer"

      const swatch = document.createElement("span")
      swatch.style.display = "inline-block"
      swatch.style.width = "12px"
      swatch.style.height = "12px"
      swatch.style.borderRadius = "999px"
      swatch.style.background = typeColors.get(type)
      swatch.style.border = "1px solid rgba(17, 24, 39, 0.2)"

      const label = document.createElement("span")
      label.style.fontSize = "0.85rem"
      label.style.fontWeight = state.activeType === type ? "700" : "500"
      label.style.color = "#1f2a33"
      label.textContent = shortMonsterType(type)

      item.append(swatch, label)
      item.addEventListener("mouseenter", () => {
        state.activeType = type
        state.hoveredName = null
        render()
      })
      item.addEventListener("mouseleave", () => {
        state.activeType = null
        state.hoveredName = null
        render()
      })

      legend.appendChild(item)
    })
  }

  function render() {
    renderLegend()
    clearNode(svg)
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 760, height: 420, fill: "rgba(255,255,255,0.74)" }))

    const width = 760
    const height = 420
    const margin = { top: 24, right: 24, bottom: 56, left: 58 }
    const [minX, maxX] = extent(points.map((point) => point.x))
    const [minY, maxY] = extent(points.map((point) => point.y))
    const xScale = linearScale(minX, maxX, margin.left, width - margin.right)
    const yScale = linearScale(minY, maxY, height - margin.bottom, margin.top)

    drawAxes(
      svg,
      width,
      height,
      margin,
      ticks(minX, maxX, 5),
      ticks(minY, maxY, 5),
      xScale,
      yScale,
      axisXLabel,
      axisYLabel
    )

    points.forEach((point) => {
      const highlighted = state.activeType != null && point.type === state.activeType
      const dimmed = state.activeType != null && point.type !== state.activeType
      const circle = svgEl("circle", {
        cx: xScale(point.x),
        cy: yScale(point.y),
        r: highlighted ? 7 : 5.2,
        fill: typeColors.get(point.type),
        stroke: highlighted ? "#111827" : "rgba(255,255,255,0.9)",
        "stroke-width": highlighted ? 2.1 : 1.2,
        opacity: dimmed ? 0.2 : 0.9,
        cursor: "pointer"
      })

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
      title.textContent = `${point.name} (${point.type})`
      circle.appendChild(title)

      circle.addEventListener("mouseenter", () => {
        state.activeType = point.type
        state.hoveredName = point.name
        render()
      })
      circle.addEventListener("mouseleave", () => {
        state.activeType = null
        state.hoveredName = null
        render()
      })

      svg.appendChild(circle)
    })

    const hoverLabel = svgEl("text", {
      x: margin.left,
      y: height - 14,
      "font-size": "12",
      fill: "#334155"
    })
    hoverLabel.textContent = state.activeType
      ? `Monster type: ${shortMonsterType(state.activeType)}${state.hoveredName ? ` | ${state.hoveredName}` : ""}`
      : "Hover a monster type or a point to highlight that type."
    svg.appendChild(hoverLabel)

    note.textContent = "Colours encode monster type. Hover a legend label or point to bold every monster of that type."
  }

  render()
  return container
}

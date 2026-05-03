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

function parseMaybeNumber(value) {
  return value == null || value === "" ? Number.NaN : Number(value)
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

export function monsterProjectionWidget(pointsData) {
  const points = toRows(pointsData).map((point) => ({
    ...point,
    id: Number(point.id),
    pc1: Number(point.pc1),
    pc2: Number(point.pc2),
    umap1: parseMaybeNumber(point.umap1),
    umap2: parseMaybeNumber(point.umap2)
  }))
  const state = { activeType: null, hoveredName: null }
  const hasUmap = points.every((point) => Number.isFinite(point.umap1) && Number.isFinite(point.umap2))
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

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1fr 1fr"
  panels.style.gap = "12px"

  const pcaPanel = makePanel("PCA view")
  const umapPanel = makePanel("UMAP view")
  const pcaSvg = svgEl("svg", { viewBox: "0 0 520 360", width: "100%", height: "360" })
  const umapSvg = svgEl("svg", { viewBox: "0 0 520 360", width: "100%", height: "360" })
  pcaPanel.shell.append(pcaPanel.heading, pcaSvg)
  umapPanel.shell.append(umapPanel.heading, umapSvg)
  panels.append(pcaPanel.shell, umapPanel.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(legend, panels, note)

  function renderLegend() {
    clearNode(legend)
    const allItem = document.createElement("div")
    allItem.style.display = "inline-flex"
    allItem.style.alignItems = "center"
    allItem.style.gap = "8px"
    allItem.style.padding = "0.28rem 0.5rem"
    allItem.style.borderRadius = "999px"
    allItem.style.border = state.activeType == null ? "1px solid rgba(17, 24, 39, 0.35)" : "1px solid rgba(31, 42, 51, 0.1)"
    allItem.style.background = state.activeType == null ? "rgba(17, 24, 39, 0.06)" : "rgba(255,255,255,0.55)"
    allItem.style.cursor = "pointer"

    const allSwatch = document.createElement("span")
    allSwatch.style.display = "inline-block"
    allSwatch.style.width = "12px"
    allSwatch.style.height = "12px"
    allSwatch.style.borderRadius = "999px"
    allSwatch.style.background = "linear-gradient(135deg, #197278, #cf5d2e)"
    allSwatch.style.border = "1px solid rgba(17, 24, 39, 0.2)"

    const allLabel = document.createElement("span")
    allLabel.style.fontSize = "0.85rem"
    allLabel.style.fontWeight = state.activeType == null ? "700" : "500"
    allLabel.style.color = "#1f2a33"
    allLabel.textContent = "All Monsters"

    allItem.append(allSwatch, allLabel)
    allItem.addEventListener("mouseenter", () => {
      state.activeType = null
      state.hoveredName = null
      render()
    })
    legend.appendChild(allItem)

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

  function drawProjection(svg, xKey, yKey, xLabel, yLabel) {
    clearNode(svg)
    const width = 520
    const height = 360
    const margin = { top: 24, right: 22, bottom: 56, left: 58 }
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: "rgba(255,255,255,0.74)" }))

    const xs = points.map((point) => point[xKey])
    const ys = points.map((point) => point[yKey])
    const [minX, maxX] = extent(xs)
    const [minY, maxY] = extent(ys)
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
      xLabel,
      yLabel
    )

    points.forEach((point) => {
      const highlighted = state.activeType != null && point.type === state.activeType
      const dimmed = state.activeType != null && point.type !== state.activeType
      const circle = svgEl("circle", {
        cx: xScale(point[xKey]),
        cy: yScale(point[yKey]),
        r: highlighted ? 7 : 5.1,
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
  }

  function drawUmapUnavailable() {
    clearNode(umapSvg)
    umapSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 520, height: 360, fill: "rgba(255,255,255,0.74)" }))

    const title = svgEl("text", {
      x: 260,
      y: 150,
      "text-anchor": "middle",
      "font-size": "17",
      fill: "#1f2a33"
    })
    title.textContent = "UMAP embedding unavailable"
    umapSvg.appendChild(title)

    const subtitle = svgEl("text", {
      x: 260,
      y: 182,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#5b6770"
    })
    subtitle.textContent = "Render with the uwot package installed to display the UMAP panel."
    umapSvg.appendChild(subtitle)
  }

  function render() {
    renderLegend()
    drawProjection(pcaSvg, "pc1", "pc2", "PC1", "PC2")
    if (hasUmap) {
      drawProjection(umapSvg, "umap1", "umap2", "UMAP 1", "UMAP 2")
    } else {
      drawUmapUnavailable()
    }

    note.textContent = state.activeType
      ? `Monster type: ${shortMonsterType(state.activeType)}${state.hoveredName ? ` | ${state.hoveredName}` : ""}`
      : "Hover a legend label or a point to highlight that monster type in both panels. Use All Monsters to reset the full view."
  }

  render()
  return container
}

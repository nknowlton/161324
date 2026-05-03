import { palette, svgEl, clearNode } from "./shared.js"

function toRows(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const keys = Object.keys(data)
  const size = keys.length === 0 ? 0 : Math.max(...keys.map((key) => (Array.isArray(data[key]) ? data[key].length : 0)))
  return Array.from({ length: size }, (_, index) =>
    Object.fromEntries(keys.map((key) => [key, Array.isArray(data[key]) ? data[key][index] : data[key]]))
  )
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits)
}

function minkowski(left, right, q) {
  const dx = Math.abs(left.x - right.x)
  const dy = Math.abs(left.y - right.y)
  return Math.pow(Math.pow(dx, q) + Math.pow(dy, q), 1 / q)
}

function extent(values, paddingFraction = 0.08) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return [min - span * paddingFraction, max + span * paddingFraction]
}

function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

function ticks(min, max, count = 5) {
  if (count <= 1) return [min]
  return Array.from({ length: count }, (_, index) => min + (index / (count - 1)) * (max - min))
}

function pointInPolygon(point, polygon) {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi

    if (intersects) inside = !inside
  }

  return inside
}

function prettyShape(shape) {
  return shape
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function makePanel(title) {
  const shell = document.createElement("div")
  shell.style.display = "grid"
  shell.style.gap = "0.75rem"
  shell.style.padding = "0.85rem"
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

function svgPointFromEvent(event, svg, width, height) {
  const rect = svg.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * width
  const y = ((event.clientY - rect.top) / rect.height) * height
  return { x, y }
}

export function syntheticDistanceWidget(pointsData) {
  const points = toRows(pointsData)
    .map((row) => ({
      id: Number(row.id),
      label: String(row.label),
      x: Number(row.x),
      y: Number(row.y),
      shape: String(row.shape)
    }))
    .sort((left, right) => left.id - right.id)

  const shapeLevels = [...new Set(points.map((row) => row.shape))]
  const shapeColors = new Map(shapeLevels.map((shape, index) => [shape, palette[index % palette.length]]))
  const width = 760
  const height = 390
  const margin = { top: 24, right: 24, bottom: 54, left: 58 }

  const state = {
    selected: new Set(points.slice(0, 5).map((row) => row.id)),
    q: 2,
    lasso: [],
    lassoActive: false,
    hoveredId: null,
    status: "Default selection uses rows P1-P5. Draw a lasso to replace that set."
  }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.alignItems = "center"
  controls.style.gap = "10px"

  const reset = document.createElement("button")
  reset.type = "button"
  reset.textContent = "Reset to P1-P5"

  const clear = document.createElement("button")
  clear.type = "button"
  clear.textContent = "Clear selection"

  const qWrap = document.createElement("label")
  qWrap.style.display = "inline-flex"
  qWrap.style.alignItems = "center"
  qWrap.style.gap = "0.45rem"
  qWrap.style.fontSize = "0.82rem"
  qWrap.style.fontWeight = "600"
  qWrap.style.color = "#1f2a33"
  qWrap.textContent = "Minkowski q"

  const qSelect = document.createElement("select")
  qSelect.setAttribute("aria-label", "Select Minkowski q")
  ;[1, 2, 3, 4].forEach((qValue) => {
    const option = document.createElement("option")
    option.value = String(qValue)
    option.textContent = String(qValue)
    if (qValue === state.q) option.selected = true
    qSelect.appendChild(option)
  })
  qSelect.style.padding = "0.24rem 0.42rem"
  qSelect.style.borderRadius = "8px"
  qSelect.style.border = "1px solid rgba(31, 42, 51, 0.14)"
  qSelect.style.background = "rgba(255,255,255,0.96)"
  qWrap.appendChild(qSelect)

  ;[reset, clear].forEach((button) => {
    button.style.padding = "0.38rem 0.72rem"
    button.style.borderRadius = "10px"
    button.style.border = "1px solid rgba(31, 42, 51, 0.14)"
    button.style.background = "rgba(255,255,255,0.92)"
    button.style.cursor = "pointer"
  })

  const selectedCount = document.createElement("div")
  selectedCount.style.padding = "0.34rem 0.7rem"
  selectedCount.style.borderRadius = "999px"
  selectedCount.style.background = "rgba(25, 114, 120, 0.1)"
  selectedCount.style.color = "#114e54"
  selectedCount.style.fontSize = "0.82rem"
  selectedCount.style.fontWeight = "600"

  controls.append(reset, clear, qWrap, selectedCount)

  const layout = document.createElement("div")
  layout.style.display = "grid"
  layout.style.gridTemplateColumns = "1.15fr 1fr"
  layout.style.gap = "12px"

  const plotPanel = makePanel("Lasso points on the synthetic scatterplot")
  const matrixPanel = makePanel("Distance matrix from selected points")

  const legend = document.createElement("div")
  legend.style.display = "grid"
  legend.style.gridTemplateColumns = "repeat(auto-fit, minmax(110px, 1fr))"
  legend.style.gap = "6px 10px"

  const plotSvg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height: String(height) })

  const selectionWrap = document.createElement("div")
  selectionWrap.style.display = "grid"
  selectionWrap.style.gap = "0.55rem"

  const selectionTitle = document.createElement("div")
  selectionTitle.style.fontSize = "0.78rem"
  selectionTitle.style.fontWeight = "700"
  selectionTitle.style.color = "#51616f"
  selectionTitle.textContent = "Selected rows"

  const selectionScroll = document.createElement("div")
  selectionScroll.style.maxHeight = "130px"
  selectionScroll.style.overflow = "auto"
  selectionScroll.style.border = "1px solid rgba(31, 42, 51, 0.08)"
  selectionScroll.style.borderRadius = "12px"
  selectionScroll.style.background = "rgba(255,255,255,0.92)"

  selectionWrap.append(selectionTitle, selectionScroll)
  plotPanel.shell.append(plotPanel.heading, legend, plotSvg, selectionWrap)

  const matrixStatus = document.createElement("div")
  matrixStatus.style.fontSize = "0.8rem"
  matrixStatus.style.color = "#51616f"

  const matrixScroll = document.createElement("div")
  matrixScroll.style.maxHeight = "540px"
  matrixScroll.style.overflow = "auto"
  matrixScroll.style.border = "1px solid rgba(31, 42, 51, 0.08)"
  matrixScroll.style.borderRadius = "14px"
  matrixScroll.style.background = "rgba(255,255,255,0.92)"

  matrixPanel.shell.append(matrixPanel.heading, matrixStatus, matrixScroll)
  layout.append(plotPanel.shell, matrixPanel.shell)

  const note = document.createElement("div")
  note.style.fontSize = "0.84rem"
  note.style.color = "#425565"

  container.append(controls, layout, note)

  let projectedPoints = []

  function selectedRows() {
    return points.filter((row) => state.selected.has(row.id)).sort((left, right) => left.id - right.id)
  }

  function renderLegend() {
    legend.replaceChildren()

    shapeLevels.forEach((shape) => {
      const item = document.createElement("div")
      item.style.display = "inline-flex"
      item.style.alignItems = "center"
      item.style.gap = "8px"
      item.style.padding = "0.26rem 0.5rem"
      item.style.borderRadius = "999px"
      item.style.background = "rgba(255,255,255,0.65)"
      item.style.border = "1px solid rgba(31, 42, 51, 0.08)"

      const swatch = document.createElement("span")
      swatch.style.display = "inline-block"
      swatch.style.width = "11px"
      swatch.style.height = "11px"
      swatch.style.borderRadius = "999px"
      swatch.style.background = shapeColors.get(shape)
      swatch.style.border = "1px solid rgba(17, 24, 39, 0.18)"

      const label = document.createElement("span")
      label.style.fontSize = "0.76rem"
      label.style.color = "#1f2a33"
      label.textContent = prettyShape(shape)

      item.append(swatch, label)
      legend.appendChild(item)
    })
  }

  function renderSelectionTable() {
    selectionScroll.replaceChildren()

    const rows = selectedRows()
    if (rows.length === 0) {
      const empty = document.createElement("div")
      empty.style.padding = "0.7rem 0.8rem"
      empty.style.fontSize = "0.76rem"
      empty.style.color = "#6b7280"
      empty.textContent = "No points selected yet."
      selectionScroll.appendChild(empty)
      return
    }

    const table = document.createElement("table")
    table.style.width = "100%"
    table.style.borderCollapse = "collapse"
    table.style.fontSize = "0.74rem"

    const thead = document.createElement("thead")
    const headRow = document.createElement("tr")
    headRow.style.position = "sticky"
    headRow.style.top = "0"
    headRow.style.background = "#eef3f5"
    headRow.style.zIndex = "1"

    ;["Label", "x", "y", "Shape"].forEach((text, index) => {
      const th = document.createElement("th")
      th.textContent = text
      th.style.padding = "0.38rem 0.48rem"
      th.style.borderBottom = "1px solid rgba(31, 42, 51, 0.12)"
      th.style.textAlign = index === 0 || index === 3 ? "left" : "right"
      headRow.appendChild(th)
    })
    thead.appendChild(headRow)
    table.appendChild(thead)

    const tbody = document.createElement("tbody")
    rows.forEach((row) => {
      const tr = document.createElement("tr")

      const labelCell = document.createElement("td")
      labelCell.textContent = row.label
      labelCell.style.padding = "0.36rem 0.48rem"
      labelCell.style.borderBottom = "1px solid rgba(31, 42, 51, 0.08)"
      labelCell.style.fontWeight = "600"
      tr.appendChild(labelCell)

      ;[formatNumber(row.x), formatNumber(row.y)].forEach((value) => {
        const td = document.createElement("td")
        td.textContent = value
        td.style.padding = "0.36rem 0.48rem"
        td.style.borderBottom = "1px solid rgba(31, 42, 51, 0.08)"
        td.style.textAlign = "right"
        td.style.fontVariantNumeric = "tabular-nums"
        tr.appendChild(td)
      })

      const shapeCell = document.createElement("td")
      shapeCell.textContent = prettyShape(row.shape)
      shapeCell.style.padding = "0.36rem 0.48rem"
      shapeCell.style.borderBottom = "1px solid rgba(31, 42, 51, 0.08)"
      tr.appendChild(shapeCell)

      tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    selectionScroll.appendChild(table)
  }

  function renderMatrix() {
    matrixScroll.replaceChildren()

    const rows = selectedRows()
    selectedCount.textContent = `${rows.length} selected`

    if (rows.length === 0) {
      matrixStatus.textContent = "Lasso at least one point to build the distance matrix."
      note.textContent = state.status
      return
    }

    matrixStatus.textContent = `Minkowski distances computed from selected points with q = ${state.q}.`

    const table = document.createElement("table")
    table.style.width = "100%"
    table.style.borderCollapse = "collapse"
    table.style.fontSize = rows.length > 10 ? "0.66rem" : "0.74rem"

    const thead = document.createElement("thead")
    const headRow = document.createElement("tr")

    const corner = document.createElement("th")
    corner.textContent = ""
    corner.style.position = "sticky"
    corner.style.left = "0"
    corner.style.top = "0"
    corner.style.zIndex = "3"
    corner.style.background = "#eef3f5"
    corner.style.padding = "0.42rem 0.5rem"
    corner.style.borderBottom = "1px solid rgba(31, 42, 51, 0.12)"
    headRow.appendChild(corner)

    rows.forEach((row) => {
      const th = document.createElement("th")
      th.textContent = row.label
      th.style.padding = "0.42rem 0.5rem"
      th.style.borderBottom = "1px solid rgba(31, 42, 51, 0.12)"
      th.style.background = "#eef3f5"
      th.style.textAlign = "right"
      th.style.position = "sticky"
      th.style.top = "0"
      th.style.zIndex = "2"
      headRow.appendChild(th)
    })
    thead.appendChild(headRow)
    table.appendChild(thead)

    const tbody = document.createElement("tbody")
    rows.forEach((row) => {
      const tr = document.createElement("tr")

      const rowHeader = document.createElement("th")
      rowHeader.textContent = row.label
      rowHeader.style.position = "sticky"
      rowHeader.style.left = "0"
      rowHeader.style.zIndex = "1"
      rowHeader.style.background = "rgba(255,255,255,0.98)"
      rowHeader.style.padding = "0.4rem 0.5rem"
      rowHeader.style.borderBottom = "1px solid rgba(31, 42, 51, 0.08)"
      rowHeader.style.textAlign = "left"
      tr.appendChild(rowHeader)

      rows.forEach((other) => {
        const td = document.createElement("td")
        td.textContent = formatNumber(minkowski(row, other, state.q))
        td.style.padding = "0.4rem 0.5rem"
        td.style.borderBottom = "1px solid rgba(31, 42, 51, 0.08)"
        td.style.textAlign = "right"
        td.style.fontVariantNumeric = "tabular-nums"
        tr.appendChild(td)
      })

      tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    matrixScroll.appendChild(table)
    note.textContent = state.status
  }

  function renderPlot() {
    clearNode(plotSvg)

    plotSvg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: "rgba(255,255,255,0.74)" }))

    const [minX, maxX] = extent(points.map((row) => row.x))
    const [minY, maxY] = extent(points.map((row) => row.y))
    const xScale = linearScale(minX, maxX, margin.left, width - margin.right)
    const yScale = linearScale(minY, maxY, height - margin.bottom, margin.top)

    projectedPoints = points.map((row) => ({
      ...row,
      plotX: xScale(row.x),
      plotY: yScale(row.y)
    }))

    ticks(minY, maxY, 5).forEach((tick) => {
      const y = yScale(tick)
      plotSvg.appendChild(svgEl("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: "rgba(107, 114, 128, 0.16)", "stroke-width": 1 }))
      const label = svgEl("text", { x: margin.left - 10, y: y + 4, "text-anchor": "end", "font-size": "11", fill: "#5b6770" })
      label.textContent = formatNumber(tick, 1)
      plotSvg.appendChild(label)
    })

    ticks(minX, maxX, 5).forEach((tick) => {
      const x = xScale(tick)
      plotSvg.appendChild(svgEl("line", { x1: x, y1: height - margin.bottom, x2: x, y2: margin.top, stroke: "rgba(107, 114, 128, 0.12)", "stroke-width": 1 }))
      const label = svgEl("text", { x, y: height - margin.bottom + 20, "text-anchor": "middle", "font-size": "11", fill: "#5b6770" })
      label.textContent = formatNumber(tick, 1)
      plotSvg.appendChild(label)
    })

    plotSvg.appendChild(svgEl("line", { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: "#6b7280", "stroke-width": 1.2 }))
    plotSvg.appendChild(svgEl("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: "#6b7280", "stroke-width": 1.2 }))

    const xAxisLabel = svgEl("text", { x: (margin.left + width - margin.right) / 2, y: height - 10, "text-anchor": "middle", "font-size": "12", fill: "#334155" })
    xAxisLabel.textContent = "x"
    plotSvg.appendChild(xAxisLabel)

    const yAxisLabel = svgEl("text", {
      x: 16,
      y: (margin.top + height - margin.bottom) / 2,
      transform: `rotate(-90 16 ${(margin.top + height - margin.bottom) / 2})`,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#334155"
    })
    yAxisLabel.textContent = "y"
    plotSvg.appendChild(yAxisLabel)

    const overlay = svgEl("rect", {
      x: margin.left,
      y: margin.top,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
      fill: "transparent"
    })
    overlay.style.cursor = state.lassoActive ? "crosshair" : "cell"
    plotSvg.appendChild(overlay)

    const handlePointerMove = (event) => {
      if (!state.lassoActive) return
      const point = svgPointFromEvent(event, plotSvg, width, height)
      const previous = state.lasso[state.lasso.length - 1]
      if (!previous || Math.hypot(previous.x - point.x, previous.y - point.y) >= 4) {
        state.lasso = [...state.lasso, point]
        renderPlot()
      }
    }

    const handlePointerUp = () => {
      if (!state.lassoActive) return
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)

      const polygon = state.lasso
      state.lassoActive = false
      state.lasso = []

      if (polygon.length < 3) {
        state.status = "Lasso needs at least three points to define a region."
        render()
        return
      }

      const selectedIds = projectedPoints
        .filter((row) => pointInPolygon({ x: row.plotX, y: row.plotY }, polygon))
        .map((row) => row.id)

      state.selected = new Set(selectedIds)
      state.status = selectedIds.length === 0
        ? "No points fell inside that lasso."
        : `Lasso selected ${selectedIds.length} point${selectedIds.length === 1 ? "" : "s"}.`
      render()
    }

    overlay.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      state.hoveredId = null
      state.lassoActive = true
      state.lasso = [svgPointFromEvent(event, plotSvg, width, height)]
      state.status = "Release the mouse to replace the current distance-matrix selection."
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
      renderPlot()
    })

    projectedPoints.forEach((row) => {
      const selected = state.selected.has(row.id)
      const hovered = state.hoveredId === row.id

      const circle = svgEl("circle", {
        cx: row.plotX,
        cy: row.plotY,
        r: selected ? 6.1 : hovered ? 5.2 : 4.4,
        fill: shapeColors.get(row.shape),
        stroke: selected ? "#111827" : "white",
        "stroke-width": selected ? 2.2 : 1.1,
        opacity: selected || hovered ? 0.98 : 0.82
      })

      circle.style.cursor = "pointer"
      circle.addEventListener("mouseenter", () => {
        state.hoveredId = row.id
        renderPlot()
      })
      circle.addEventListener("mouseleave", () => {
        state.hoveredId = null
        renderPlot()
      })
      circle.addEventListener("click", (event) => {
        event.stopPropagation()
        if (state.selected.has(row.id)) {
          state.selected.delete(row.id)
          state.status = `Removed ${row.label} from the current selection.`
        } else {
          state.selected.add(row.id)
          state.status = `Added ${row.label} to the current selection.`
        }
        render()
      })
      plotSvg.appendChild(circle)

      if (selected || hovered) {
        const label = svgEl("text", {
          x: row.plotX + 8,
          y: row.plotY - 8,
          "font-size": "11",
          fill: "#111827"
        })
        label.textContent = row.label
        plotSvg.appendChild(label)
      }
    })

    if (state.lasso.length > 1) {
      const polygon = svgEl("polygon", {
        points: state.lasso.map((point) => `${point.x},${point.y}`).join(" "),
        fill: "rgba(25, 114, 120, 0.12)",
        stroke: "#197278",
        "stroke-width": 2,
        "stroke-dasharray": "6 4"
      })
      plotSvg.appendChild(polygon)
    }
  }

  function render() {
    renderLegend()
    renderPlot()
    renderSelectionTable()
    renderMatrix()
  }

  reset.addEventListener("click", () => {
    state.selected = new Set(points.slice(0, 5).map((row) => row.id))
    state.lasso = []
    state.lassoActive = false
    state.status = "Reset to the first five rows."
    render()
  })

  clear.addEventListener("click", () => {
    state.selected = new Set()
    state.lasso = []
    state.lassoActive = false
    state.status = "Selection cleared."
    render()
  })

  qSelect.addEventListener("change", () => {
    const nextQ = Number.parseInt(qSelect.value, 10)
    if (![1, 2, 3, 4].includes(nextQ)) return
    state.q = nextQ
    state.status = `Updated Minkowski power to q = ${state.q}; selection unchanged.`
    renderMatrix()
  })

  render()
  return container
}

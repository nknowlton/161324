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

function ticks(min, max, count = 5) {
  if (count <= 1) return [min]
  return Array.from({ length: count }, (_, index) => min + (index / (count - 1)) * (max - min))
}

function titleCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`
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

export function clusterComparisonWidget(pointsData, assignmentsData) {
  const points = toRows(pointsData).map((point) => ({
    ...point,
    id: Number(point.id),
    x: point.x == null || point.x === "" ? null : Number(point.x),
    y: point.y == null || point.y === "" ? null : Number(point.y),
    pc1: point.pc1 == null || point.pc1 === "" ? null : Number(point.pc1),
    pc2: point.pc2 == null || point.pc2 === "" ? null : Number(point.pc2),
    umap1: point.umap1 == null || point.umap1 === "" ? null : Number(point.umap1),
    umap2: point.umap2 == null || point.umap2 === "" ? null : Number(point.umap2)
  }))
  const assignments = toRows(assignmentsData).map((row) => ({
    ...row,
    id: Number(row.id),
    k: row.k == null || row.k === "" ? null : Number(row.k),
    eps: row.eps == null || row.eps === "" ? null : Number(row.eps),
    min_pts: row.min_pts == null || row.min_pts === "" ? null : Number(row.min_pts),
    cluster_id: Number(row.cluster_id)
  }))

  const hasPca = points.every((point) => Number.isFinite(point.pc1) && Number.isFinite(point.pc2))
  const hasUmap = points.every((point) => Number.isFinite(point.umap1) && Number.isFinite(point.umap2))
  const hasLegacyXY = points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  const displayOptions = [
    hasUmap ? { value: "umap", label: "UMAP" } : null,
    hasPca ? { value: "pca", label: "PCA" } : null,
    !hasUmap && !hasPca && hasLegacyXY ? { value: "xy", label: "Display" } : null
  ].filter(Boolean)

  const state = {
    method: "hierarchical",
    linkage: "complete",
    k: 5,
    eps: 1,
    minPts: 5,
    display: displayOptions[0]?.value ?? "xy",
    hovered: null,
    hoveredType: null
  }
  const kOptions = [...new Set(assignments.filter((row) => row.k != null).map((row) => row.k))].sort((a, b) => a - b)
  const epsOptions = [...new Set(assignments.filter((row) => row.eps != null).map((row) => row.eps))].sort((a, b) => a - b)
  const minPtsOptions = [...new Set(assignments.filter((row) => row.min_pts != null).map((row) => row.min_pts))].sort((a, b) => a - b)

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"

  const method = document.createElement("select")
  ;[
    { value: "hierarchical", label: "Hierarchical" },
    { value: "kmeans", label: "K-means" },
    { value: "kmedoids", label: "K-medoids" },
    { value: "dbscan", label: "DBSCAN" }
  ].forEach((item) => {
    const option = document.createElement("option")
    option.value = item.value
    option.textContent = item.label
    if (item.value === state.method) option.selected = true
    method.appendChild(option)
  })

  const displayWrap = document.createElement("label")
  displayWrap.style.display = "flex"
  displayWrap.style.alignItems = "center"
  displayWrap.style.gap = "8px"
  const display = document.createElement("select")
  displayOptions.forEach((item) => {
    const option = document.createElement("option")
    option.value = item.value
    option.textContent = item.label
    if (item.value === state.display) option.selected = true
    display.appendChild(option)
  })
  displayWrap.append("Display", display)

  const linkageWrap = document.createElement("label")
  linkageWrap.style.display = "flex"
  linkageWrap.style.alignItems = "center"
  linkageWrap.style.gap = "8px"
  const linkage = document.createElement("select")
  ;["single", "complete", "average"].forEach((value) => {
    const option = document.createElement("option")
    option.value = value
    option.textContent = `${titleCase(value)} linkage`
    if (value === state.linkage) option.selected = true
    linkage.appendChild(option)
  })
  linkageWrap.append("Linkage", linkage)

  const kWrap = document.createElement("label")
  kWrap.style.display = "flex"
  kWrap.style.alignItems = "center"
  kWrap.style.gap = "8px"
  const kSlider = document.createElement("input")
  kSlider.type = "range"
  kSlider.min = String(Math.min(...kOptions))
  kSlider.max = String(Math.max(...kOptions))
  kSlider.step = "1"
  kSlider.value = String(state.k)
  const kLabel = document.createElement("strong")
  kWrap.append("K", kSlider, kLabel)

  const epsWrap = document.createElement("label")
  epsWrap.style.display = "flex"
  epsWrap.style.alignItems = "center"
  epsWrap.style.gap = "8px"
  const epsSlider = document.createElement("input")
  epsSlider.type = "range"
  epsSlider.min = String(Math.min(...epsOptions))
  epsSlider.max = String(Math.max(...epsOptions))
  epsSlider.step = "0.1"
  epsSlider.value = String(state.eps)
  const epsLabel = document.createElement("strong")
  epsWrap.append("eps", epsSlider, epsLabel)

  const minPtsWrap = document.createElement("label")
  minPtsWrap.style.display = "flex"
  minPtsWrap.style.alignItems = "center"
  minPtsWrap.style.gap = "8px"
  const minPtsSlider = document.createElement("input")
  minPtsSlider.type = "range"
  minPtsSlider.min = String(Math.min(...minPtsOptions))
  minPtsSlider.max = String(Math.max(...minPtsOptions))
  minPtsSlider.step = "1"
  minPtsSlider.value = String(state.minPts)
  const minPtsLabel = document.createElement("strong")
  minPtsWrap.append("MinPts", minPtsSlider, minPtsLabel)

  controls.append("Method", method, displayWrap, linkageWrap, kWrap, epsWrap, minPtsWrap)

  const svg = svgEl("svg", { viewBox: "0 0 760 400", width: "100%", height: "400" })
  const summary = document.createElement("div")
  summary.style.fontSize = "0.92rem"
  summary.style.color = "#425565"
  const hoverNote = document.createElement("div")
  hoverNote.style.fontSize = "0.88rem"
  hoverNote.style.color = "#51616f"
  hoverNote.style.minHeight = "1.2em"
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(controls, svg, summary, hoverNote, note)

  function currentRows() {
    return assignments.filter((row) => {
      if (row.method !== state.method) return false
      if (state.method === "hierarchical") return row.linkage === state.linkage
      if (state.method === "kmeans" || state.method === "kmedoids") return row.k === state.k
      return row.eps === state.eps && row.min_pts === state.minPts
    })
  }

  function methodSummary(clusterCount, noiseCount) {
    if (state.method === "hierarchical") {
      return `${titleCase(state.linkage)} linkage cut at k = 5 on the scaled monster features. ${clusterCount} displayed clusters.`
    }
    if (state.method === "kmeans") {
      return `K-means with K = ${state.k} on the scaled monster features. ${clusterCount} displayed clusters.`
    }
    if (state.method === "kmedoids") {
      return `PAM / K-medoids with K = ${state.k} on the scaled monster features. ${clusterCount} displayed clusters.`
    }
    return `DBSCAN with eps = ${state.eps.toFixed(1)} and MinPts = ${state.minPts} on the scaled monster features. ${clusterCount} clusters and ${noiseCount} noise points, with the cluster count discovered from the density settings rather than chosen in advance.`
  }

  function displayConfig() {
    if (state.display === "pca") {
      return {
        label: "PCA",
        xLabel: "PC1",
        yLabel: "PC2",
        xKey: "pc1",
        yKey: "pc2"
      }
    }
    if (state.display === "umap") {
      return {
        label: "UMAP",
        xLabel: "UMAP 1",
        yLabel: "UMAP 2",
        xKey: "umap1",
        yKey: "umap2"
      }
    }
    return {
      label: "display",
      xLabel: "x",
      yLabel: "y",
      xKey: "x",
      yKey: "y"
    }
  }

  function render() {
    linkageWrap.style.display = state.method === "hierarchical" ? "flex" : "none"
    kWrap.style.display = state.method === "kmeans" || state.method === "kmedoids" ? "flex" : "none"
    epsWrap.style.display = state.method === "dbscan" ? "flex" : "none"
    minPtsWrap.style.display = state.method === "dbscan" ? "flex" : "none"
    kLabel.textContent = String(state.k)
    epsLabel.textContent = state.eps.toFixed(1)
    minPtsLabel.textContent = String(state.minPts)

    const rows = currentRows()
    const assignmentMap = new Map(rows.map((row) => [row.id, row.cluster_id]))
    const clusterIds = rows.map((row) => row.cluster_id).filter((value) => value > 0)
    const clusterCount = new Set(clusterIds).size
    const noiseCount = rows.filter((row) => row.cluster_id < 0).length
    const currentDisplay = displayConfig()
    const displayPoints = points.filter(
      (point) => Number.isFinite(point[currentDisplay.xKey]) && Number.isFinite(point[currentDisplay.yKey])
    )

    clearNode(svg)
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 760, height: 400, fill: "rgba(255,255,255,0.74)" }))

    const width = 760
    const height = 400
    const margin = { top: 24, right: 24, bottom: 52, left: 58 }
    const [minX, maxX] = extent(displayPoints.map((point) => point[currentDisplay.xKey]))
    const [minY, maxY] = extent(displayPoints.map((point) => point[currentDisplay.yKey]))
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
      currentDisplay.xLabel,
      currentDisplay.yLabel
    )

    displayPoints.forEach((point) => {
      const cluster = assignmentMap.get(point.id) ?? -1
      const hovered = state.hovered === point.id
      const highlighted = state.hoveredType != null && point.type === state.hoveredType
      const dimmed = state.hoveredType != null && point.type !== state.hoveredType
      const circle = svgEl("circle", {
        cx: xScale(point[currentDisplay.xKey]),
        cy: yScale(point[currentDisplay.yKey]),
        r: hovered ? 7.4 : highlighted ? 6.4 : 5.4,
        fill: cluster < 0 ? "#a1a8ae" : palette[(cluster - 1) % palette.length],
        stroke: hovered || highlighted ? "#111827" : "rgba(255,255,255,0.9)",
        "stroke-width": hovered ? 2.3 : highlighted ? 1.8 : 1.2,
        opacity: dimmed ? 0.22 : cluster < 0 ? 0.76 : 0.94
      })

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
      title.textContent = `${point.name} (${point.type})`
      circle.appendChild(title)

      circle.addEventListener("mouseenter", () => {
        state.hovered = point.id
        state.hoveredType = point.type
        hoverNote.textContent = `${point.name} | ${shortMonsterType(point.type)}`
        render()
      })
      circle.addEventListener("mouseleave", () => {
        state.hovered = null
        state.hoveredType = null
        hoverNote.textContent = "Hover a point to highlight all monsters of that type."
        render()
      })

      svg.appendChild(circle)
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
      state.hoveredType && state.hovered
        ? `${points.find((point) => point.id === state.hovered)?.name ?? ""} | ${shortMonsterType(state.hoveredType)}`
        : ""
    svg.appendChild(hoverLabel)

    summary.textContent =
      state.method === "dbscan"
        ? `${clusterCount} clusters | ${noiseCount} noise points`
        : `${clusterCount} clusters shown on the ${currentDisplay.label} display`
    note.textContent =
      `${methodSummary(clusterCount, noiseCount)} The display uses ${currentDisplay.xLabel} and ${currentDisplay.yLabel}, but the clustering itself is fit on the full scaled monster feature set.`
  }

  method.addEventListener("change", () => {
    state.method = method.value
    state.hovered = null
    state.hoveredType = null
    render()
  })

  display.addEventListener("change", () => {
    state.display = display.value
    state.hovered = null
    state.hoveredType = null
    render()
  })

  linkage.addEventListener("change", () => {
    state.linkage = linkage.value
    state.hovered = null
    state.hoveredType = null
    render()
  })

  kSlider.addEventListener("input", () => {
    state.k = Number(kSlider.value)
    state.hovered = null
    state.hoveredType = null
    render()
  })

  epsSlider.addEventListener("input", () => {
    state.eps = Number(epsSlider.value)
    state.hovered = null
    state.hoveredType = null
    render()
  })

  minPtsSlider.addEventListener("input", () => {
    state.minPts = Number(minPtsSlider.value)
    state.hovered = null
    state.hoveredType = null
    render()
  })

  render()
  return container
}

export function kmeansPamDisagreementWidget(disagreementData, axisLabelsData, axisLimitsData) {
  const rows = toRows(disagreementData).map((row) => ({
    ...row,
    id: Number(row.id),
    k: Number(row.k),
    x: Number(row.x),
    y: Number(row.y),
    kmeans_cluster: Number(row.kmeans_cluster),
    pam_cluster: Number(row.pam_cluster),
    pam_relabelled_cluster: Number(row.pam_relabelled_cluster)
  }))

  const labelRows = toRows(axisLabelsData)
  const axisLabels = Array.isArray(axisLabelsData)
    ? axisLabelsData
    : labelRows.length > 0
      ? Object.values(labelRows[0])
      : ["x", "y"]

  const limitsRows = toRows(axisLimitsData)
  const limitMap = new Map(limitsRows.map((row) => [row.axis, { min: Number(row.min), max: Number(row.max) }]))

  const kOptions = [...new Set(rows.map((row) => row.k))].sort((a, b) => a - b)
  const state = {
    k: kOptions.includes(5) ? 5 : kOptions[0],
    hoveredId: null,
    hoveredType: null
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

  const kSlider = document.createElement("input")
  kSlider.type = "range"
  kSlider.min = String(Math.min(...kOptions))
  kSlider.max = String(Math.max(...kOptions))
  kSlider.step = "1"
  kSlider.value = String(state.k)
  kSlider.style.width = "240px"

  const kLabel = document.createElement("strong")
  controls.append("Choose K", kSlider, kLabel)

  const legend = document.createElement("div")
  legend.style.display = "flex"
  legend.style.gap = "16px"
  legend.style.alignItems = "center"
  legend.style.fontSize = "0.84rem"
  legend.style.color = "#425565"

  const legendDisagree = document.createElement("span")
  legendDisagree.textContent = "Different cluster"
  legendDisagree.style.padding = "0.15rem 0.42rem"
  legendDisagree.style.borderRadius = "999px"
  legendDisagree.style.background = "rgba(196, 69, 54, 0.16)"
  legendDisagree.style.border = "1px solid rgba(196, 69, 54, 0.28)"

  const legendAgree = document.createElement("span")
  legendAgree.textContent = "Same cluster after relabelling"
  legendAgree.style.padding = "0.15rem 0.42rem"
  legendAgree.style.borderRadius = "999px"
  legendAgree.style.background = "rgba(25, 114, 120, 0.13)"
  legendAgree.style.border = "1px solid rgba(25, 114, 120, 0.24)"

  legend.append(legendDisagree, legendAgree)

  const svg = svgEl("svg", { viewBox: "0 0 760 400", width: "100%", height: "400" })
  const summary = document.createElement("div")
  summary.style.fontSize = "0.92rem"
  summary.style.color = "#425565"
  const hoverNote = document.createElement("div")
  hoverNote.style.fontSize = "0.88rem"
  hoverNote.style.color = "#51616f"
  hoverNote.style.minHeight = "1.2em"
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(controls, legend, svg, summary, hoverNote, note)

  function render() {
    const currentRows = rows.filter((row) => row.k === state.k)
    const disagreementRows = currentRows.filter((row) => row.agreement === "Different cluster")
    const disagreementRate = currentRows.length === 0 ? 0 : (100 * disagreementRows.length) / currentRows.length

    const xValues = rows.map((row) => row.x)
    const yValues = rows.map((row) => row.y)
    const xBounds = limitMap.get("x") ?? { min: extent(xValues)[0], max: extent(xValues)[1] }
    const yBounds = limitMap.get("y") ?? { min: extent(yValues)[0], max: extent(yValues)[1] }

    clearNode(svg)
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 760, height: 400, fill: "rgba(255,255,255,0.74)" }))

    const width = 760
    const height = 400
    const margin = { top: 24, right: 24, bottom: 52, left: 58 }
    const xScale = linearScale(xBounds.min, xBounds.max, margin.left, width - margin.right)
    const yScale = linearScale(yBounds.min, yBounds.max, height - margin.bottom, margin.top)

    drawAxes(
      svg,
      width,
      height,
      margin,
      ticks(xBounds.min, xBounds.max, 5),
      ticks(yBounds.min, yBounds.max, 5),
      xScale,
      yScale,
      axisLabels[0] ?? "x",
      axisLabels[1] ?? "y"
    )

    currentRows.forEach((row) => {
      const disagreement = row.agreement === "Different cluster"
      const hovered = state.hoveredId === row.id
      const highlightedType = state.hoveredType != null && row.type === state.hoveredType
      const dimmed = state.hoveredType != null && row.type !== state.hoveredType

      const circle = svgEl("circle", {
        cx: xScale(row.x),
        cy: yScale(row.y),
        r: hovered ? 7.2 : disagreement ? 6.1 : 4.7,
        fill: disagreement ? "#c44536" : "#197278",
        stroke: hovered || highlightedType ? "#111827" : "rgba(255,255,255,0.9)",
        "stroke-width": hovered ? 2.2 : disagreement ? 1.5 : 1.2,
        opacity: dimmed ? 0.18 : disagreement ? 0.96 : 0.26
      })

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
      title.textContent =
        `${row.name} (${row.type}) | K-means C${row.kmeans_cluster} vs PAM C${row.pam_cluster} ` +
        `(relabelled to C${row.pam_relabelled_cluster})`
      circle.appendChild(title)

      circle.addEventListener("mouseenter", () => {
        state.hoveredId = row.id
        state.hoveredType = row.type
        hoverNote.textContent =
          `${row.name} | ${shortMonsterType(row.type)} | ` +
          `${disagreement ? "different" : "same"} cluster after relabelling`
        render()
      })

      circle.addEventListener("mouseleave", () => {
        state.hoveredId = null
        state.hoveredType = null
        hoverNote.textContent = "Hover a point to inspect K-means versus PAM assignment details."
        render()
      })

      svg.appendChild(circle)
    })

    hoverNote.textContent = state.hoveredId
      ? hoverNote.textContent
      : "Hover a point to inspect K-means versus PAM assignment details."

    kLabel.textContent = `K = ${state.k}`
    summary.textContent =
      `${disagreementRows.length} disagreements out of ${currentRows.length} monsters ` +
      `(${disagreementRate.toFixed(1)}%).`
    note.textContent =
      "PAM cluster labels are relabelled to their closest K-means labels before comparison, " +
      "so highlighted points indicate substantive assignment disagreement rather than label naming differences."
  }

  kSlider.addEventListener("input", () => {
    state.k = Number(kSlider.value)
    state.hoveredId = null
    state.hoveredType = null
    render()
  })

  render()
  return container
}

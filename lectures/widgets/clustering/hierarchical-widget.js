import {
  palette,
  svgEl,
  clearNode,
  projectFactory,
  hierarchyPoints,
  hierarchicalTrace,
  snapshotAssignments
} from "./shared.js"

const fullPlot = {
  width: 520,
  height: 360,
  padding: 30,
  pointRadius: 6.4,
  highlightRadius: 8.8,
  pointStroke: 1.25,
  highlightStroke: 2.4,
  pointLabelSize: 10,
  leafLabelSize: 10,
  labelDx: 9,
  labelDy: -8,
  dendroPaddingX: 40,
  dendroTop: 48,
  dendroBottom: 34
}

const compactPlot = {
  width: 228,
  height: 188,
  padding: 18,
  pointRadius: 4.4,
  highlightRadius: 5.8,
  pointStroke: 1,
  highlightStroke: 1.8,
  pointLabelSize: 7,
  leafLabelSize: 7,
  labelDx: 6,
  labelDy: -5,
  dendroPaddingX: 22,
  dendroTop: 28,
  dendroBottom: 22
}

const comparisonPlot = {
  width: 420,
  height: 260,
  leafLabelSize: 9,
  dendroPaddingX: 28,
  dendroTop: 24,
  dendroBottom: 28
}

function titleCase(text) {
  return `${text[0].toUpperCase()}${text.slice(1)}`
}

function linkageSummary(linkage) {
  if (linkage === "single") {
    return "Nearest-neighbor chaining can pull stretched groups together early."
  }
  if (linkage === "complete") {
    return "Merges are more conservative because whole groups must stay close."
  }
  return "Average linkage usually lands between chaining and tight compact groups."
}

function makeSvg(plot) {
  return svgEl("svg", {
    viewBox: `0 0 ${plot.width} ${plot.height}`,
    width: "100%",
    height: String(plot.height)
  })
}

function renderScatter(svg, assignments, highlightMembers, plot) {
  clearNode(svg)
  const project = projectFactory(hierarchyPoints, plot.width, plot.height, plot.padding)
  svg.appendChild(
    svgEl("rect", {
      x: 0,
      y: 0,
      width: plot.width,
      height: plot.height,
      fill: "rgba(255,255,255,0.74)"
    })
  )

  hierarchyPoints.forEach((point, index) => {
    const location = project(point)
    const highlighted = highlightMembers.has(index)

    svg.appendChild(
      svgEl("circle", {
        cx: location.x,
        cy: location.y,
        r: highlighted ? plot.highlightRadius : plot.pointRadius,
        fill: assignments[index] < 0 ? "#a4a9ad" : palette[assignments[index] % palette.length],
        stroke: highlighted ? "#1f2a33" : "rgba(255,255,255,0.85)",
        "stroke-width": highlighted ? plot.highlightStroke : plot.pointStroke,
        opacity: highlighted ? 1 : 0.9
      })
    )

    if (highlighted) {
      const label = svgEl("text", {
        x: location.x + plot.labelDx,
        y: location.y + plot.labelDy,
        fill: "#1f2a33",
        "font-size": String(plot.pointLabelSize)
      })
      label.textContent = point.label
      svg.appendChild(label)
    }
  })
}

function renderDendrogram(svg, trace, step, plot) {
  clearNode(svg)
  svg.appendChild(
    svgEl("rect", {
      x: 0,
      y: 0,
      width: plot.width,
      height: plot.height,
      fill: "rgba(255,255,255,0.74)"
    })
  )

  const nodes = trace.nodes
  const maxHeight = trace.maxHeight
  const usableWidth = plot.width - 2 * plot.dendroPaddingX
  const usableHeight = plot.height - plot.dendroTop - plot.dendroBottom
  const scaleX = (value) =>
    plot.dendroPaddingX + (value / Math.max(trace.leafOrder.length - 1, 1)) * usableWidth
  const scaleY = (value) => plot.height - plot.dendroBottom - (value / maxHeight) * usableHeight

  trace.merges.slice(0, step).forEach((merge, mergeIndex) => {
    const node = nodes.get(merge.id)
    const left = trace.layout.get(node.left)
    const right = trace.layout.get(node.right)
    const current = trace.layout.get(node.id)
    const tone = palette[mergeIndex % palette.length]

    svg.appendChild(
      svgEl("line", {
        x1: scaleX(left.x),
        y1: scaleY(left.y),
        x2: scaleX(left.x),
        y2: scaleY(current.y),
        stroke: tone,
        "stroke-width": 2
      })
    )
    svg.appendChild(
      svgEl("line", {
        x1: scaleX(right.x),
        y1: scaleY(right.y),
        x2: scaleX(right.x),
        y2: scaleY(current.y),
        stroke: tone,
        "stroke-width": 2
      })
    )
    svg.appendChild(
      svgEl("line", {
        x1: scaleX(left.x),
        y1: scaleY(current.y),
        x2: scaleX(right.x),
        y2: scaleY(current.y),
        stroke: tone,
        "stroke-width": 2
      })
    )
  })

  trace.leafOrder.forEach((leafId, orderIndex) => {
    const label = svgEl("text", {
      x: scaleX(orderIndex),
      y: plot.height - 10,
      "text-anchor": "middle",
      "font-size": String(plot.leafLabelSize),
      fill: "#4f6070"
    })
    label.textContent = hierarchyPoints[leafId].label
    svg.appendChild(label)
  })
}

function finalStateCard(linkage) {
  const trace = hierarchicalTrace(hierarchyPoints, linkage)
  const step = trace.snapshots.length - 1

  const card = document.createElement("div")
  card.style.display = "grid"
  card.style.gap = "8px"
  card.style.padding = "0.7rem"
  card.style.borderRadius = "14px"
  card.style.background = "rgba(255,255,255,0.5)"
  card.style.border = "1px solid rgba(31, 42, 51, 0.1)"

  const heading = document.createElement("div")
  heading.style.fontSize = "0.82rem"
  heading.style.fontWeight = "700"
  heading.style.color = "#1f2a33"
  heading.textContent = `${titleCase(linkage)} linkage`

  const dendrogram = makeSvg(comparisonPlot)
  renderDendrogram(dendrogram, trace, step, comparisonPlot)

  const caption = document.createElement("div")
  caption.style.fontSize = "0.72rem"
  caption.style.lineHeight = "1.35"
  caption.style.color = "#425565"
  caption.textContent = linkageSummary(linkage)

  card.append(heading, dendrogram, caption)
  return card
}

export function hierarchicalComparison() {
  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const grid = document.createElement("div")
  grid.style.display = "grid"
  grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))"
  grid.style.gap = "14px"
  ;["single", "complete", "average"].forEach((linkage) => {
    grid.appendChild(finalStateCard(linkage))
  })

  container.appendChild(grid)
  return container
}

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

export function hierarchicalCutWidget(pointsData, mergesData, orderData, axisLabelsData) {
  const points = toRows(pointsData).map((row, index) => ({
    id: Number(row.id ?? index + 1),
    name: String(row.name ?? `Obs ${index + 1}`),
    type: String(row.type ?? ""),
    x: Number(row.x),
    y: Number(row.y)
  }))
  const merges = toRows(mergesData)
    .map((row) => ({
      step: Number(row.step),
      left: Number(row.left),
      right: Number(row.right),
      height: Number(row.height)
    }))
    .sort((left, right) => left.step - right.step)

  const order = (Array.isArray(orderData) ? orderData : []).map((value) => Number(value))
  const axisLabels = Array.isArray(axisLabelsData) && axisLabelsData.length >= 2
    ? axisLabelsData.map((value) => String(value))
    : ["x", "y"]

  const n = points.length
  const levels = [0, ...merges.map((merge) => merge.height)]
  const nodes = new Map()
  const parent = new Map()

  for (let leaf = 1; leaf <= n; leaf += 1) {
    nodes.set(leaf, { id: leaf, left: null, right: null, height: 0, members: [leaf] })
  }

  const resolveChild = (value) => {
    if (value < 0) return -value
    return n + value
  }

  merges.forEach((merge, index) => {
    const leftId = resolveChild(merge.left)
    const rightId = resolveChild(merge.right)
    const nodeId = n + index + 1
    const node = {
      id: nodeId,
      left: leftId,
      right: rightId,
      height: merge.height,
      members: nodes.get(leftId).members.concat(nodes.get(rightId).members)
    }
    nodes.set(nodeId, node)
    parent.set(leftId, nodeId)
    parent.set(rightId, nodeId)
  })

  const rootId = n + merges.length
  const leafOrder = order.length === n ? order : Array.from({ length: n }, (_, index) => index + 1)
  const xByLeaf = new Map(leafOrder.map((leafId, index) => [leafId, index]))
  const xByNode = new Map()

  const locateX = (nodeId) => {
    if (xByNode.has(nodeId)) return xByNode.get(nodeId)
    const node = nodes.get(nodeId)
    if (!node) return 0
    if (node.left == null) {
      const x = xByLeaf.get(nodeId) ?? 0
      xByNode.set(nodeId, x)
      return x
    }
    const x = (locateX(node.left) + locateX(node.right)) / 2
    xByNode.set(nodeId, x)
    return x
  }
  if (rootId > n) locateX(rootId)

  const state = {
    cutIndex: Math.max(0, Math.min(levels.length - 1, n - 5))
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

  const slider = document.createElement("input")
  slider.type = "range"
  slider.min = "0"
  slider.max = String(Math.max(levels.length - 1, 0))
  slider.step = "1"
  slider.value = String(state.cutIndex)
  slider.style.width = "320px"

  const label = document.createElement("strong")
  controls.append("Cut height", slider, label)

  const panel = document.createElement("div")
  panel.style.display = "grid"
  panel.style.gridTemplateColumns = "1fr 1fr"
  panel.style.gap = "14px"

  const scatterSvg = svgEl("svg", { viewBox: "0 0 560 360", width: "100%", height: "360" })
  const dendroSvg = svgEl("svg", { viewBox: "0 0 560 360", width: "100%", height: "360" })
  panel.append(scatterSvg, dendroSvg)

  const note = document.createElement("div")
  note.style.fontSize = "0.9rem"
  note.style.color = "#425565"

  container.append(controls, panel, note)

  const clustersAtHeight = (cutHeight) => {
    const frontier = []
    nodes.forEach((node) => {
      if (node.height > cutHeight) return
      const parentId = parent.get(node.id)
      if (parentId == null || nodes.get(parentId).height > cutHeight) {
        frontier.push(node)
      }
    })

    frontier.sort((left, right) => Math.min(...left.members) - Math.min(...right.members))
    const assignments = Array(n).fill(-1)
    frontier.forEach((node, clusterIndex) => {
      node.members.forEach((member) => {
        assignments[member - 1] = clusterIndex
      })
    })

    return { assignments, clusters: frontier.length }
  }

  const renderScatter = (assignments) => {
    clearNode(scatterSvg)
    const width = 560
    const height = 360
    const margin = { top: 24, right: 22, bottom: 54, left: 58 }
    scatterSvg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: "rgba(255,255,255,0.74)" }))

    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const xScale = linearScale(minX, maxX, margin.left, width - margin.right)
    const yScale = linearScale(minY, maxY, height - margin.bottom, margin.top)

    scatterSvg.appendChild(svgEl("line", { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: "#6b7280", "stroke-width": 1.2 }))
    scatterSvg.appendChild(svgEl("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: "#6b7280", "stroke-width": 1.2 }))

    const xAxisLabel = svgEl("text", { x: (margin.left + width - margin.right) / 2, y: height - 10, "text-anchor": "middle", "font-size": "12", fill: "#334155" })
    xAxisLabel.textContent = axisLabels[0]
    scatterSvg.appendChild(xAxisLabel)

    const yAxisLabel = svgEl("text", {
      x: 16,
      y: (margin.top + height - margin.bottom) / 2,
      transform: `rotate(-90 16 ${(margin.top + height - margin.bottom) / 2})`,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#334155"
    })
    yAxisLabel.textContent = axisLabels[1]
    scatterSvg.appendChild(yAxisLabel)

    points.forEach((point, index) => {
      const cluster = assignments[index]
      scatterSvg.appendChild(
        svgEl("circle", {
          cx: xScale(point.x),
          cy: yScale(point.y),
          r: 5.4,
          fill: cluster < 0 ? "#a4a9ad" : palette[cluster % palette.length],
          stroke: "rgba(255,255,255,0.9)",
          "stroke-width": 1.2,
          opacity: 0.92
        })
      )
    })
  }

  const renderDendrogram = (cutHeight) => {
    clearNode(dendroSvg)
    const width = 560
    const height = 360
    const paddingX = 40
    const top = 30
    const bottom = 32
    const maxHeight = Math.max(...merges.map((merge) => merge.height), 1)
    const usableWidth = width - 2 * paddingX
    const usableHeight = height - top - bottom
    const scaleX = (value) => paddingX + (value / Math.max(n - 1, 1)) * usableWidth
    const scaleY = (value) => height - bottom - (value / maxHeight) * usableHeight

    dendroSvg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: "rgba(255,255,255,0.74)" }))

    merges.forEach((merge, index) => {
      const nodeId = n + index + 1
      const node = nodes.get(nodeId)
      const leftNode = nodes.get(node.left)
      const rightNode = nodes.get(node.right)

      dendroSvg.appendChild(svgEl("line", {
        x1: scaleX(locateX(leftNode.id)),
        y1: scaleY(leftNode.height),
        x2: scaleX(locateX(leftNode.id)),
        y2: scaleY(node.height),
        stroke: "#64748b",
        "stroke-width": 1.8
      }))
      dendroSvg.appendChild(svgEl("line", {
        x1: scaleX(locateX(rightNode.id)),
        y1: scaleY(rightNode.height),
        x2: scaleX(locateX(rightNode.id)),
        y2: scaleY(node.height),
        stroke: "#64748b",
        "stroke-width": 1.8
      }))
      dendroSvg.appendChild(svgEl("line", {
        x1: scaleX(locateX(leftNode.id)),
        y1: scaleY(node.height),
        x2: scaleX(locateX(rightNode.id)),
        y2: scaleY(node.height),
        stroke: "#64748b",
        "stroke-width": 1.8
      }))
    })

    dendroSvg.appendChild(svgEl("line", {
      x1: paddingX,
      y1: scaleY(cutHeight),
      x2: width - paddingX,
      y2: scaleY(cutHeight),
      stroke: "#cf5d2e",
      "stroke-width": 2.4,
      "stroke-dasharray": "8 5"
    }))
  }

  const update = () => {
    const cutHeight = levels[state.cutIndex] ?? 0
    const { assignments, clusters } = clustersAtHeight(cutHeight)
    label.textContent = `h = ${cutHeight.toFixed(2)} | clusters = ${clusters}`
    renderScatter(assignments)
    renderDendrogram(cutHeight)
    note.textContent = "Move the slider to shift the horizontal cut line. Point colours update to the partition implied by that cut height."
  }

  slider.addEventListener("input", () => {
    state.cutIndex = Number(slider.value)
    update()
  })

  update()
  return container
}

export function hierarchicalWidget() {
  const state = { linkage: "complete", step: 0 }
  const cache = new Map()

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "14px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"

  const select = document.createElement("select")
  ;["single", "complete", "average"].forEach((label) => {
    const option = document.createElement("option")
    option.value = label
    option.textContent = `${label[0].toUpperCase()}${label.slice(1)} linkage`
    if (label === state.linkage) option.selected = true
    select.appendChild(option)
  })

  const slider = document.createElement("input")
  slider.type = "range"
  slider.min = "0"
  slider.step = "1"
  slider.value = "0"
  slider.style.width = "280px"

  const stepLabel = document.createElement("strong")
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.lineHeight = "1.35"
  note.style.color = "#425565"

  controls.append("Linkage", select, "Merge", slider, stepLabel)

  const panel = document.createElement("div")
  panel.style.display = "grid"
  panel.style.gridTemplateColumns = "1fr 1fr"
  panel.style.gap = "14px"

  const scatter = makeSvg(fullPlot)
  const dendrogram = makeSvg(fullPlot)
  panel.append(scatter, dendrogram)
  container.append(controls, panel, note)

  const getTrace = () => {
    if (!cache.has(state.linkage)) {
      cache.set(state.linkage, hierarchicalTrace(hierarchyPoints, state.linkage))
    }
    return cache.get(state.linkage)
  }

  const update = () => {
    const trace = getTrace()
    const maxStep = trace.snapshots.length - 1
    if (state.step > maxStep) state.step = maxStep
    slider.max = String(maxStep)
    slider.value = String(state.step)
    stepLabel.textContent = `Step ${state.step} / ${maxStep}`

    const snapshot = trace.snapshots[state.step]
    const assignments = snapshotAssignments(snapshot, hierarchyPoints.length)
    const highlighted = new Set(snapshot.lastMerge ? snapshot.lastMerge.members : [])

    renderScatter(scatter, assignments, highlighted, fullPlot)
    renderDendrogram(dendrogram, trace, state.step, fullPlot)

    if (!snapshot.lastMerge) {
      note.textContent = `${titleCase(state.linkage)} linkage decides which pair counts as closest. Move the slider to watch how that choice changes the merge order.`
      return
    }

    note.textContent =
      `${titleCase(state.linkage)} linkage latest merge: ${snapshot.lastMerge.leftSize} + ` +
      `${snapshot.lastMerge.rightSize} points at distance ${snapshot.lastMerge.height.toFixed(2)}. ` +
      `${linkageSummary(state.linkage)} ${snapshot.clusters.length} clusters remain.`
  }

  select.addEventListener("change", () => {
    state.linkage = select.value
    state.step = 0
    update()
  })

  slider.addEventListener("input", () => {
    state.step = Number(slider.value)
    update()
  })

  update()
  return container
}

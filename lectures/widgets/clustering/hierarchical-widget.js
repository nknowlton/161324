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

import {
  palette,
  svgEl,
  clearNode,
  projectFactory,
  centroidPoints,
  kmeansTrace,
  withinClusterScore,
  choiceLabel,
  distance
} from "./shared.js"

function sameAssignments(left, right) {
  if (!left || !right || left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function sameCenters(left, right) {
  if (!left || !right || left.length !== right.length) return false
  return left.every(
    (center, index) =>
      Math.abs(center.x - right[index].x) < 1e-6 && Math.abs(center.y - right[index].y) < 1e-6
  )
}

function compressTrace(trace) {
  return trace.filter((snapshot, index) => {
    if (index === 0) return true
    const previous = trace[index - 1]
    return !(
      sameAssignments(snapshot.assignments, previous.assignments) && sameCenters(snapshot.centers, previous.centers)
    )
  })
}

function objectiveValue(points, assignments, centers, mode) {
  if (mode === "kmedoids") {
    return assignments.reduce((sum, cluster, index) => sum + distance(points[index], centers[cluster]), 0)
  }
  return withinClusterScore(points, assignments, centers)
}

export function kmeansKmedoidsWidget() {
  const state = { mode: "kmeans", k: 4, step: 0 }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"

  const mode = document.createElement("select")
  ;[
    { value: "kmeans", label: "K-means" },
    { value: "kmedoids", label: "K-medoids" }
  ].forEach((item) => {
    const option = document.createElement("option")
    option.value = item.value
    option.textContent = item.label
    if (item.value === state.mode) option.selected = true
    mode.appendChild(option)
  })

  const kSlider = document.createElement("input")
  kSlider.type = "range"
  kSlider.min = "2"
  kSlider.max = "6"
  kSlider.step = "1"
  kSlider.value = String(state.k)

  const stepSlider = document.createElement("input")
  stepSlider.type = "range"
  stepSlider.min = "0"
  stepSlider.step = "1"
  stepSlider.value = "0"
  stepSlider.style.width = "220px"

  const labels = document.createElement("strong")
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  controls.append("Method", mode, "k", kSlider, "Iteration", stepSlider, labels)

  const svg = svgEl("svg", { viewBox: "0 0 720 360", width: "100%", height: "360" })
  container.append(controls, svg, note)

  const render = () => {
    const trace = compressTrace(kmeansTrace(centroidPoints, state.k, state.mode, 7))
    const maxStep = trace.length - 1
    if (state.step > maxStep) state.step = maxStep
    stepSlider.max = String(maxStep)
    stepSlider.value = String(state.step)

    clearNode(svg)
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 720, height: 360, fill: "rgba(255,255,255,0.74)" }))

    const snapshot = trace[state.step]
    const previous = state.step > 0 ? trace[state.step - 1] : null
    const project = projectFactory(centroidPoints, 720, 360, 28)
    const xs = centroidPoints.map((point) => point.x)
    const ys = centroidPoints.map((point) => point.y)
    const minX = Math.min(...xs) - 0.45
    const maxX = Math.max(...xs) + 0.45
    const minY = Math.min(...ys) - 0.45
    const maxY = Math.max(...ys) + 0.45

    for (let xi = 0; xi < 42; xi += 1) {
      for (let yi = 0; yi < 24; yi += 1) {
        const probe = {
          x: minX + ((maxX - minX) * xi) / 41,
          y: minY + ((maxY - minY) * yi) / 23
        }
        let best = 0
        let bestGap = Infinity
        snapshot.centers.forEach((center, index) => {
          const gap = (probe.x - center.x) ** 2 + (probe.y - center.y) ** 2
          if (gap < bestGap) {
            best = index
            bestGap = gap
          }
        })
        const location = project(probe)
        svg.appendChild(
          svgEl("rect", {
            x: location.x - 10,
            y: location.y - 10,
            width: 20,
            height: 20,
            fill: palette[best % palette.length],
            opacity: 0.08
          })
        )
      }
    }

    if (previous) {
      snapshot.centers.forEach((center, index) => {
        const current = project(center)
        const prior = project(previous.centers[index])
        if (Math.hypot(current.x - prior.x, current.y - prior.y) < 2) return
        svg.appendChild(
          svgEl("line", {
            x1: prior.x,
            y1: prior.y,
            x2: current.x,
            y2: current.y,
            stroke: palette[index % palette.length],
            "stroke-width": 2.6,
            "stroke-dasharray": "5 4",
            opacity: 0.85
          })
        )
      })
    }

    centroidPoints.forEach((point, index) => {
      const location = project(point)
      const changed = previous ? previous.assignments[index] !== snapshot.assignments[index] : false
      svg.appendChild(
        svgEl("circle", {
          cx: location.x,
          cy: location.y,
          r: 6,
          fill: palette[snapshot.assignments[index] % palette.length],
          stroke: changed ? "#111827" : "rgba(255,255,255,0.9)",
          "stroke-width": changed ? 2.2 : 1.2,
          opacity: changed ? 1 : 0.94
        })
      )
    })

    snapshot.centers.forEach((center, index) => {
      const location = project(center)
      const marker = svgEl("g")
      marker.appendChild(
        svgEl("rect", {
          x: location.x - 8,
          y: location.y - 8,
          width: 16,
          height: 16,
          fill: "white",
          stroke: palette[index % palette.length],
          "stroke-width": 3,
          transform: `rotate(45 ${location.x} ${location.y})`
        })
      )
      const text = svgEl("text", {
        x: location.x + 11,
        y: location.y - 10,
        fill: palette[index % palette.length],
        "font-size": "10"
      })
      text.textContent = choiceLabel(index)
      marker.appendChild(text)
      svg.appendChild(marker)
    })

    const changedAssignments = previous
      ? snapshot.assignments.filter((value, index) => value !== previous.assignments[index]).length
      : 0
    const centerShift = previous
      ? snapshot.centers.reduce((sum, center, index) => sum + distance(center, previous.centers[index]), 0)
      : 0
    const score = objectiveValue(centroidPoints, snapshot.assignments, snapshot.centers, state.mode)
    const objectiveLabel =
      state.mode === "kmeans"
        ? "Objective = total within-cluster sum of squares"
        : "Objective = total point-to-medoid distance"

    labels.textContent = `${mode.value === "kmeans" ? "Centroids" : "Medoids"} | frame ${state.step + 1} / ${trace.length}`
    if (!previous) {
      note.textContent = `Initial placement with ${state.k} clusters. ${objectiveLabel}: ${score.toFixed(2)}.`
      return
    }

    if (snapshot.phase === "update") {
      note.textContent =
        `Update step: the ${state.mode === "kmeans" ? "centroids" : "medoids"} move to better representatives. ` +
        `Total center movement = ${centerShift.toFixed(2)}. ${objectiveLabel}: ${score.toFixed(2)}.`
      return
    }

    note.textContent =
      `Assignment step: ${changedAssignments} points switched cluster since the previous frame. ` +
      `${objectiveLabel}: ${score.toFixed(2)}.` +
      (changedAssignments === 0 && centerShift < 0.01 ? " The algorithm has effectively converged." : "")
  }

  mode.addEventListener("change", () => {
    state.mode = mode.value
    state.step = 0
    render()
  })

  kSlider.addEventListener("input", () => {
    state.k = Number(kSlider.value)
    state.step = 0
    render()
  })

  stepSlider.addEventListener("input", () => {
    state.step = Number(stepSlider.value)
    render()
  })

  render()
  return container
}

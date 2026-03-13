import { palette, svgEl, clearNode, projectFactory, densityPoints, dbscanTrace, distance } from "./shared.js"

export function dbscanWidget() {
  const state = { eps: 0.9, minPts: 5, step: 0 }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"

  const eps = document.createElement("input")
  eps.type = "range"
  eps.min = "0.45"
  eps.max = "1.25"
  eps.step = "0.05"
  eps.value = String(state.eps)

  const minPts = document.createElement("input")
  minPts.type = "range"
  minPts.min = "3"
  minPts.max = "8"
  minPts.step = "1"
  minPts.value = String(state.minPts)

  const stepSlider = document.createElement("input")
  stepSlider.type = "range"
  stepSlider.min = "0"
  stepSlider.step = "1"
  stepSlider.value = "0"
  stepSlider.style.width = "220px"

  const labels = document.createElement("strong")
  const summary = document.createElement("div")
  summary.style.fontSize = "0.9rem"
  summary.style.color = "#425565"
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  controls.append("eps radius", eps, "MinPts for core", minPts, "Step", stepSlider, labels)

  const svg = svgEl("svg", { viewBox: "0 0 720 360", width: "100%", height: "360" })
  container.append(controls, svg, summary, note)

  const render = () => {
    const trace = dbscanTrace(densityPoints, state.eps, state.minPts)
    const maxStep = Math.max(trace.snapshots.length - 1, 0)
    if (state.step > maxStep) state.step = maxStep
    stepSlider.max = String(maxStep)
    stepSlider.value = String(state.step)

    clearNode(svg)
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 720, height: 360, fill: "rgba(255,255,255,0.74)" }))

    const project = projectFactory(densityPoints, 720, 360, 28)
    const snapshot = trace.snapshots[state.step]
    const current = densityPoints[snapshot.current]
    const currentLocation = project(current)
    const neighborCount = densityPoints.filter((point) => distance(point, current) <= state.eps).length
    const assignedCount = snapshot.assignments.filter((value) => value >= 0).length
    const currentIsCore = neighborCount >= state.minPts

    svg.appendChild(
      svgEl("circle", {
        cx: currentLocation.x,
        cy: currentLocation.y,
        r: state.eps * 34,
        fill: "rgba(11,107,111,0.08)",
        stroke: "rgba(11,107,111,0.35)",
        "stroke-width": 2
      })
    )

    densityPoints.forEach((point, index) => {
      const location = project(point)
      const assignment = snapshot.assignments[index]
      const type = trace.pointTypes[index]
      const stroke = index === snapshot.current ? "#1f2a33" : "rgba(255,255,255,0.85)"
      const radius = type === "core" ? 7 : 5.5
      svg.appendChild(
        svgEl("circle", {
          cx: location.x,
          cy: location.y,
          r: radius,
          fill: assignment === -1 ? "#a1a8ae" : palette[assignment % palette.length],
          stroke,
          "stroke-width": index === snapshot.current ? 2.4 : 1.2,
          opacity: type === "noise" ? 0.72 : 0.96
        })
      )
      if (type === "core") {
        svg.appendChild(
          svgEl("circle", {
            cx: location.x,
            cy: location.y,
            r: radius + 2,
            fill: "none",
            stroke: "rgba(31,42,51,0.22)",
            "stroke-width": 1
          })
        )
      }
    })

    labels.textContent = `eps = ${state.eps.toFixed(2)} | MinPts = ${state.minPts} | current neighborhood = ${neighborCount}`
    summary.textContent =
      `${assignedCount} assigned so far | ${trace.pointTypes.filter((item) => item === "noise").length} final-noise candidates`
    note.textContent =
      `${snapshot.message} MinPts counts the current point too. ${current.label} sees ${neighborCount} points inside the eps circle, ` +
      `so it is ${currentIsCore ? "a core point" : "not a core point"} under the current settings.`
  }

  eps.addEventListener("input", () => {
    state.eps = Number(eps.value)
    state.step = 0
    render()
  })

  minPts.addEventListener("input", () => {
    state.minPts = Number(minPts.value)
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

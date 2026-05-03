import {
  palette,
  svgEl,
  clearNode,
  projectFactory,
  stabilityPoints,
  resampleStability
} from "./shared.js"

function panel(title, svg) {
  const wrap = document.createElement("div")
  wrap.style.display = "grid"
  wrap.style.gap = "6px"

  const label = document.createElement("div")
  label.textContent = title
  label.style.fontWeight = "600"
  label.style.fontSize = "0.95rem"
  label.style.color = "#1f2a33"

  wrap.append(label, svg)
  return wrap
}

export function bootstrapStabilityWidget() {
  const state = { linkage: "complete", reps: 24, draw: 0 }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "12px"

  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.flexWrap = "wrap"
  controls.style.gap = "10px"
  controls.style.alignItems = "center"

  const linkage = document.createElement("select")
  ;["single", "complete", "average"].forEach((item) => {
    const option = document.createElement("option")
    option.value = item
    option.textContent = `${item[0].toUpperCase()}${item.slice(1)} linkage`
    if (item === state.linkage) option.selected = true
    linkage.appendChild(option)
  })

  const reps = document.createElement("input")
  reps.type = "range"
  reps.min = "10"
  reps.max = "40"
  reps.step = "2"
  reps.value = String(state.reps)

  const draw = document.createElement("input")
  draw.type = "range"
  draw.min = "0"
  draw.step = "1"
  draw.value = "0"
  draw.style.width = "220px"

  const labels = document.createElement("strong")
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  controls.append("Linkage", linkage, "View draw", draw, "Summary resamples", reps, labels)

  const layout = document.createElement("div")
  layout.style.display = "grid"
  layout.style.gridTemplateColumns = "0.92fr 1.08fr"
  layout.style.gap = "12px"

  const left = document.createElement("div")
  left.style.display = "grid"
  left.style.gap = "12px"

  const sampleSvg = svgEl("svg", { viewBox: "0 0 340 260", width: "100%", height: "260" })
  const dendrogramSvg = svgEl("svg", { viewBox: "0 0 340 260", width: "100%", height: "260" })
  const heatmapSvg = svgEl("svg", { viewBox: "0 0 470 540", width: "100%", height: "540" })

  left.append(panel("Selected bootstrap draw", sampleSvg), panel("Selected draw hierarchical tree", dendrogramSvg))
  layout.append(left, panel("Pairwise stability matrix across all resamples", heatmapSvg))
  container.append(controls, layout, note)

  const renderSample = (result, selected) => {
    clearNode(sampleSvg)
    sampleSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 340, height: 260, fill: "rgba(255,255,255,0.74)" }))

    const project = projectFactory(stabilityPoints, 340, 260, 26)
    stabilityPoints.forEach((point, index) => {
      const location = project(point)
      const count = selected.counts[index]
      const inSample = count > 0
      sampleSvg.appendChild(
        svgEl("circle", {
          cx: location.x,
          cy: location.y,
          r: 4.5 + Math.min(count, 4) * 2,
          fill: palette[result.baseline[index] % palette.length],
          opacity: inSample ? 0.92 : 0.16,
          stroke: inSample ? "#1f2a33" : "rgba(255,255,255,0.7)",
          "stroke-width": inSample ? 1.6 : 1.1
        })
      )

      const label = svgEl("text", {
        x: location.x + 8,
        y: location.y - 7,
        "font-size": "9",
        fill: inSample ? "#1f2a33" : "#8d97a1"
      })
      label.textContent = count > 1 ? `${point.label} x${count}` : point.label
      sampleSvg.appendChild(label)
    })
  }

  const renderDendrogram = (selected) => {
    clearNode(dendrogramSvg)
    dendrogramSvg.appendChild(
      svgEl("rect", { x: 0, y: 0, width: 340, height: 260, fill: "rgba(255,255,255,0.74)" })
    )

    const trace = selected.drawTrace
    const maxHeight = trace.maxHeight
    const paddingX = 30
    const width = 340 - 2 * paddingX
    const scaleX = (value) => paddingX + (value / Math.max(trace.leafOrder.length - 1, 1)) * width
    const scaleY = (value) => 226 - (value / maxHeight) * 178
    const branchColor = (nodeId) => {
      const node = trace.nodes.get(nodeId)
      const clusters = [...new Set(node.members.map((member) => selected.drawAssignments[member]))]
      return clusters.length === 1 ? palette[clusters[0] % palette.length] : "#7f8b96"
    }

    trace.merges.forEach((merge) => {
      const node = trace.nodes.get(merge.id)
      const left = trace.layout.get(node.left)
      const right = trace.layout.get(node.right)
      const current = trace.layout.get(node.id)
      const tone = branchColor(node.id)
      dendrogramSvg.appendChild(
        svgEl("line", {
          x1: scaleX(left.x),
          y1: scaleY(left.y),
          x2: scaleX(left.x),
          y2: scaleY(current.y),
          stroke: tone,
          "stroke-width": 2
        })
      )
      dendrogramSvg.appendChild(
        svgEl("line", {
          x1: scaleX(right.x),
          y1: scaleY(right.y),
          x2: scaleX(right.x),
          y2: scaleY(current.y),
          stroke: tone,
          "stroke-width": 2
        })
      )
      dendrogramSvg.appendChild(
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
      const text = svgEl("text", {
        x: scaleX(orderIndex),
        y: 244,
        "text-anchor": "middle",
        "font-size": "8",
        fill: palette[selected.drawAssignments[leafId] % palette.length]
      })
      text.textContent = selected.drawPoints[leafId].label
      dendrogramSvg.appendChild(text)
    })
  }

  const renderHeatmap = (result) => {
    clearNode(heatmapSvg)
    heatmapSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 470, height: 540, fill: "rgba(255,255,255,0.74)" }))

    const order = result.baselineTrace.leafOrder
    const box = 16
    const originX = 58
    const originY = 36

    order.forEach((rowIndex, rowPosition) => {
      order.forEach((colIndex, colPosition) => {
        const sameCluster = result.baseline[rowIndex] === result.baseline[colIndex]
        heatmapSvg.appendChild(
          svgEl("rect", {
            x: originX + colPosition * box,
            y: originY + rowPosition * box,
            width: box,
            height: box,
            fill: sameCluster ? palette[result.baseline[rowIndex] % palette.length] : "#8f99a3",
            opacity: rowIndex === colIndex ? 1 : 0.12 + 0.88 * result.consensus[rowIndex][colIndex],
            stroke: "rgba(31,42,51,0.12)",
            "stroke-width": 1
          })
        )
      })
    })

    order.forEach((pointIndex, axisPosition) => {
      const rowLabel = svgEl("text", {
        x: 50,
        y: originY + 11 + axisPosition * box,
        "text-anchor": "end",
        "font-size": "8",
        fill: palette[result.baseline[pointIndex] % palette.length]
      })
      rowLabel.textContent = stabilityPoints[pointIndex].label
      heatmapSvg.appendChild(rowLabel)

      const colLabel = svgEl("text", {
        x: originX + 8 + axisPosition * box,
        y: 26,
        "text-anchor": "middle",
        "font-size": "8",
        fill: palette[result.baseline[pointIndex] % palette.length]
      })
      colLabel.textContent = stabilityPoints[pointIndex].label
      heatmapSvg.appendChild(colLabel)
    })

    result.scores.forEach((item, index) => {
      heatmapSvg.appendChild(
        svgEl("rect", {
          x: 328,
          y: 110 + index * 52,
          width: 100 * item.score,
          height: 16,
          fill: palette[item.clusterId % palette.length],
          opacity: 0.86
        })
      )
      const text = svgEl("text", {
        x: 328,
        y: 102 + index * 52,
        "font-size": "10",
        fill: "#1f2a33"
      })
      text.textContent = `Cluster ${item.clusterId + 1}: ${(100 * item.score).toFixed(0)}% stable`
      heatmapSvg.appendChild(text)
    })

    const explainer = svgEl("text", {
      x: 328,
      y: 292,
      "font-size": "10",
      fill: "#51616f"
    })
    explainer.textContent = "Colour = baseline cluster"
    heatmapSvg.appendChild(explainer)

    const explainer2 = svgEl("text", {
      x: 328,
      y: 308,
      "font-size": "10",
      fill: "#51616f"
    })
    explainer2.textContent = "Alpha = fraction of resamples paired together"
    heatmapSvg.appendChild(explainer2)
  }

  const render = () => {
    const result = resampleStability(stabilityPoints, state.linkage, 3, state.reps, 2026)
    const maxDraw = Math.max(result.draws.length - 1, 0)
    if (state.draw > maxDraw) state.draw = maxDraw
    draw.max = String(maxDraw)
    draw.value = String(state.draw)

    const selected = result.draws[state.draw]
    renderSample(result, selected)
    renderDendrogram(selected)
    renderHeatmap(result)

    const meanAri =
      result.ari.length === 0
        ? 0
        : result.ari.reduce((sum, value) => sum + value, 0) / result.ari.length
    const distinctCount = selected.unique.length
    labels.textContent = `${state.reps} resamples | viewing draw ${state.draw + 1} / ${result.draws.length}`
    note.textContent =
      `Bootstrap resampling draws the whole dataset with replacement. In this draw, ` +
      `${stabilityPoints.length} picks produced ${distinctCount} distinct points; repeated observations are larger and labelled x2/x3. ` +
      `The tree updates for the selected draw, while the matrix changes only when the summary resample count or linkage changes because it aggregates across all ${state.reps} resamples. ` +
      `The bars on the right summarise average within-cluster stability for the baseline clusters. ` +
      `Mean ARI = ${meanAri.toFixed(2)}, selected draw ARI = ${selected.ari.toFixed(2)}.`
  }

  linkage.addEventListener("change", () => {
    state.linkage = linkage.value
    state.draw = 0
    render()
  })

  reps.addEventListener("input", () => {
    state.reps = Number(reps.value)
    state.draw = 0
    render()
  })

  draw.addEventListener("input", () => {
    state.draw = Number(draw.value)
    render()
  })

  render()
  return container
}

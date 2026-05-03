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

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left - right)
}

function clusterLayout(rows) {
  const clusters = uniqueSorted(rows.map((row) => row.cluster))
  const gapUnits = 3
  let cursor = 0
  const ordered = []
  const labels = []

  clusters.forEach((cluster) => {
    const clusterRows = rows
      .filter((row) => row.cluster === cluster)
      .sort((left, right) => right.sil_width - left.sil_width)
    const start = cursor
    clusterRows.forEach((row) => {
      ordered.push({ ...row, slot: cursor })
      cursor += 1
    })
    const end = cursor - 1
    labels.push({ cluster, mid: (start + end) / 2, end })
    cursor += gapUnits
  })

  return { ordered, labels, totalSlots: Math.max(cursor - gapUnits, 1) }
}

function drawScatterAxes(svg, width, height, margin, xTicks, yTicks, xScale, yScale, xLabel, yLabel) {
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
    y: height - 10,
    "text-anchor": "middle",
    "font-size": "12",
    fill: "#334155"
  })
  xAxisLabel.textContent = xLabel
  svg.appendChild(xAxisLabel)

  const yAxisLabel = svgEl("text", {
    x: 18,
    y: (margin.top + height - margin.bottom) / 2,
    transform: `rotate(-90 18 ${(margin.top + height - margin.bottom) / 2})`,
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

export function pamDiagnosticWidget(pointsData, silhouetteData, summaryData) {
  const points = toRows(pointsData).map((point) => ({
    ...point,
    id: Number(point.id),
    pc1: Number(point.pc1),
    pc2: Number(point.pc2),
    umap1: point.umap1 == null || point.umap1 === "" ? null : Number(point.umap1),
    umap2: point.umap2 == null || point.umap2 === "" ? null : Number(point.umap2),
    k2: Number(point.k2),
    k3: Number(point.k3),
    k4: Number(point.k4),
    k5: Number(point.k5)
  }))
  const silhouettes = toRows(silhouetteData).map((row) => ({
    ...row,
    k: Number(row.k),
    id: Number(row.id),
    cluster: Number(row.cluster),
    sil_width: Number(row.sil_width)
  }))
  const summaries = new Map(
    toRows(summaryData).map((row) => [
      Number(row.k),
      {
        average_width: Number(row.average_width),
        negative_count: Number(row.negative_count),
        near_boundary_count: Number(row.near_boundary_count)
      }
    ])
  )

  const hasUmap = points.every((point) => Number.isFinite(point.umap1) && Number.isFinite(point.umap2))
  const state = { k: 5, display: hasUmap ? "umap" : "pca", hoveredId: null }

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
  kSlider.max = "5"
  kSlider.step = "1"
  kSlider.value = String(state.k)
  kSlider.style.width = "220px"
  const kLabel = document.createElement("strong")
  controls.append("Choose K", kSlider, kLabel)

  const displayWrap = document.createElement("label")
  displayWrap.style.display = "flex"
  displayWrap.style.alignItems = "center"
  displayWrap.style.gap = "8px"
  const display = document.createElement("select")
  ;[
    hasUmap ? { value: "umap", label: "UMAP" } : null,
    { value: "pca", label: "PCA" }
  ]
    .filter(Boolean)
    .forEach((item) => {
      const option = document.createElement("option")
      option.value = item.value
      option.textContent = item.label
      if (item.value === state.display) option.selected = true
      display.appendChild(option)
    })
  displayWrap.append("Display", display)
  controls.append(displayWrap)

  const panels = document.createElement("div")
  panels.style.display = "grid"
  panels.style.gridTemplateColumns = "1fr 1.08fr"
  panels.style.gap = "12px"

  const scatterPanel = makePanel("Final PAM clustering")
  const silhouettePanel = makePanel("Silhouette diagnostic")
  const scatterSvg = svgEl("svg", { viewBox: "0 0 520 360", width: "100%", height: "360" })
  const silhouetteSvg = svgEl("svg", { viewBox: "0 0 560 360", width: "100%", height: "360" })
  scatterPanel.shell.append(scatterPanel.heading, scatterSvg)
  silhouettePanel.shell.append(silhouettePanel.heading, silhouetteSvg)
  panels.append(scatterPanel.shell, silhouettePanel.shell)

  const hoverNote = document.createElement("div")
  hoverNote.style.fontSize = "0.88rem"
  hoverNote.style.color = "#51616f"
  hoverNote.style.minHeight = "1.2em"
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(controls, panels, hoverNote, note)

  function displayConfig() {
    if (state.display === "umap") {
      return { label: "UMAP", xKey: "umap1", yKey: "umap2", xLabel: "UMAP 1", yLabel: "UMAP 2" }
    }
    return { label: "PCA", xKey: "pc1", yKey: "pc2", xLabel: "PC1", yLabel: "PC2" }
  }

  function currentHoverText(row) {
    return `${row.name} | ${shortMonsterType(row.type)} | cluster ${row.cluster} | silhouette ${row.sil_width.toFixed(2)}`
  }

  function render() {
    const currentSilhouetteRows = silhouettes.filter((row) => row.k === state.k)
    const summary = summaries.get(state.k)
    const clusterMap = new Map(currentSilhouetteRows.map((row) => [row.id, row.cluster]))
    const pointMap = new Map(points.map((point) => [point.id, point]))
    const currentDisplay = displayConfig()
    const displayPoints = points.filter(
      (point) => Number.isFinite(point[currentDisplay.xKey]) && Number.isFinite(point[currentDisplay.yKey])
    )
    const { ordered, labels, totalSlots } = clusterLayout(currentSilhouetteRows)

    clearNode(scatterSvg)
    clearNode(silhouetteSvg)
    scatterSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 520, height: 360, fill: "rgba(255,255,255,0.74)" }))
    silhouetteSvg.appendChild(svgEl("rect", { x: 0, y: 0, width: 560, height: 360, fill: "rgba(255,255,255,0.74)" }))

    const scatterWidth = 520
    const scatterHeight = 360
    const scatterMargin = { top: 26, right: 24, bottom: 52, left: 58 }
    const [minX, maxX] = extent(displayPoints.map((point) => point[currentDisplay.xKey]))
    const [minY, maxY] = extent(displayPoints.map((point) => point[currentDisplay.yKey]))
    const xScale = linearScale(minX, maxX, scatterMargin.left, scatterWidth - scatterMargin.right)
    const yScale = linearScale(minY, maxY, scatterHeight - scatterMargin.bottom, scatterMargin.top)
    const xTicks = uniqueSorted([
      minX,
      minX + (maxX - minX) / 3,
      minX + (2 * (maxX - minX)) / 3,
      maxX
    ])
    const yTicks = uniqueSorted([
      minY,
      minY + (maxY - minY) / 3,
      minY + (2 * (maxY - minY)) / 3,
      maxY
    ])

    drawScatterAxes(
      scatterSvg,
      scatterWidth,
      scatterHeight,
      scatterMargin,
      xTicks,
      yTicks,
      xScale,
      yScale,
      currentDisplay.xLabel,
      currentDisplay.yLabel
    )

    displayPoints.forEach((point) => {
      const cluster = point[`k${state.k}`]
      const hovered = state.hoveredId === point.id
      const circle = svgEl("circle", {
        cx: xScale(point[currentDisplay.xKey]),
        cy: yScale(point[currentDisplay.yKey]),
        r: hovered ? 7.2 : 5.2,
        fill: palette[(cluster - 1) % palette.length],
        stroke: hovered ? "#111827" : "rgba(255,255,255,0.9)",
        "stroke-width": hovered ? 2.1 : 1.2,
        opacity: state.hoveredId == null || hovered ? 0.94 : 0.4
      })

      circle.addEventListener("mouseenter", () => {
        state.hoveredId = point.id
        const row = currentSilhouetteRows.find((item) => item.id === point.id)
        hoverNote.textContent = row ? currentHoverText(row) : `${point.name} | ${shortMonsterType(point.type)}`
        render()
      })
      circle.addEventListener("mouseleave", () => {
        state.hoveredId = null
        hoverNote.textContent = "Hover a silhouette bar or a plotted monster to link the diagnostic to the final PAM map."
        render()
      })

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
      title.textContent = `${point.name} (${point.type})`
      circle.appendChild(title)
      scatterSvg.appendChild(circle)
    })

    const legendY = 18
    uniqueSorted(currentSilhouetteRows.map((row) => row.cluster)).forEach((cluster, index) => {
      const x = 76 + index * 64
      scatterSvg.appendChild(
        svgEl("circle", {
          cx: x,
          cy: legendY,
          r: 5,
          fill: palette[(cluster - 1) % palette.length],
          stroke: "rgba(31,42,51,0.18)",
          "stroke-width": 1
        })
      )
      const text = svgEl("text", {
        x: x + 10,
        y: legendY + 4,
        "font-size": "11",
        fill: "#334155"
      })
      text.textContent = `C${cluster}`
      scatterSvg.appendChild(text)
    })

    const silWidth = 560
    const silHeight = 360
    const silMargin = { top: 28, right: 24, bottom: 52, left: 74 }
    const plotTop = silMargin.top
    const plotBottom = silHeight - silMargin.bottom
    const plotHeight = plotBottom - plotTop
    const slotHeight = plotHeight / totalSlots
    const yForSlot = (slot) => plotTop + slot * slotHeight
    const silMin = Math.min(-0.35, Math.min(...ordered.map((row) => row.sil_width)) - 0.05)
    const silXScale = linearScale(silMin, 1, silMargin.left, silWidth - silMargin.right)
    const silXTicks = [-0.25, 0, 0.25, 0.5, 0.75, 1].filter((tick) => tick >= silMin && tick <= 1)
    const avgX = silXScale(summary?.average_width ?? 0)

    silhouetteSvg.appendChild(
      svgEl("line", {
        x1: silXScale(0),
        y1: plotTop,
        x2: silXScale(0),
        y2: plotBottom,
        stroke: "#6b7280",
        "stroke-width": 1.2
      })
    )

    silXTicks.forEach((tick) => {
      const x = silXScale(tick)
      silhouetteSvg.appendChild(
        svgEl("line", {
          x1: x,
          y1: plotTop,
          x2: x,
          y2: plotBottom,
          stroke: tick === 0 ? "#6b7280" : "rgba(107, 114, 128, 0.16)",
          "stroke-width": tick === 0 ? 1.2 : 1
        })
      )
      const label = svgEl("text", {
        x,
        y: silHeight - silMargin.bottom + 20,
        "text-anchor": "middle",
        "font-size": "11",
        fill: "#5b6770"
      })
      label.textContent = tick.toFixed(2).replace(/\.00$/, "")
      silhouetteSvg.appendChild(label)
    })

    const silAxis = svgEl("text", {
      x: (silMargin.left + silWidth - silMargin.right) / 2,
      y: silHeight - 8,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#334155"
    })
    silAxis.textContent = "Silhouette width"
    silhouetteSvg.appendChild(silAxis)

    labels.forEach((labelInfo) => {
      const separatorY = yForSlot(labelInfo.end + 1.5)
      if (labelInfo.cluster !== labels[labels.length - 1]?.cluster) {
        silhouetteSvg.appendChild(
          svgEl("line", {
            x1: silMargin.left,
            y1: separatorY,
            x2: silWidth - silMargin.right,
            y2: separatorY,
            stroke: "rgba(107, 114, 128, 0.18)",
            "stroke-width": 1
          })
        )
      }

      const label = svgEl("text", {
        x: silMargin.left - 12,
        y: yForSlot(labelInfo.mid) + slotHeight * 0.45,
        "text-anchor": "end",
        "font-size": "11",
        fill: palette[(labelInfo.cluster - 1) % palette.length]
      })
      label.textContent = `C${labelInfo.cluster}`
      silhouetteSvg.appendChild(label)
    })

    silhouetteSvg.appendChild(
      svgEl("line", {
        x1: avgX,
        y1: plotTop,
        x2: avgX,
        y2: plotBottom,
        stroke: "#8a3324",
        "stroke-width": 1.8,
        "stroke-dasharray": "6 5",
        opacity: 0.9
      })
    )

    const avgLabel = svgEl("text", {
      x: Math.min(avgX + 8, silWidth - silMargin.right - 48),
      y: plotTop + 14,
      "font-size": "11",
      fill: "#8a3324"
    })
    avgLabel.textContent = `avg = ${(summary?.average_width ?? 0).toFixed(2)}`
    silhouetteSvg.appendChild(avgLabel)

    ordered.forEach((row) => {
      const top = yForSlot(row.slot)
      const barY = top + slotHeight * 0.1
      const barHeight = Math.max(slotHeight * 0.8, 1.2)
      const zeroX = silXScale(0)
      const barX = row.sil_width >= 0 ? zeroX : silXScale(row.sil_width)
      const barWidth = Math.max(Math.abs(silXScale(row.sil_width) - zeroX), 1.2)
      const hovered = state.hoveredId === row.id

      const rect = svgEl("rect", {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        fill: palette[(row.cluster - 1) % palette.length],
        stroke: hovered ? "#111827" : "rgba(255,255,255,0.9)",
        "stroke-width": hovered ? 1.6 : 0.6,
        opacity: state.hoveredId == null || hovered ? row.sil_width < 0 ? 0.7 : 0.9 : 0.45
      })

      rect.addEventListener("mouseenter", () => {
        state.hoveredId = row.id
        hoverNote.textContent = currentHoverText(row)
        render()
      })
      rect.addEventListener("mouseleave", () => {
        state.hoveredId = null
        hoverNote.textContent = "Hover a silhouette bar or a plotted monster to link the diagnostic to the final PAM map."
        render()
      })

      silhouetteSvg.appendChild(rect)
    })

    hoverNote.textContent = state.hoveredId
      ? hoverNote.textContent
      : "Hover a silhouette bar or a plotted monster to link the diagnostic to the final PAM map."

    note.textContent =
      `K = ${state.k} on the ${currentDisplay.label} display. Average silhouette width = ${(summary?.average_width ?? 0).toFixed(2)}; ` +
      `${summary?.negative_count ?? 0} monsters have negative silhouette widths and ${summary?.near_boundary_count ?? 0} sit close to a cluster boundary.`
  }

  kSlider.addEventListener("input", () => {
    state.k = Number(kSlider.value)
    state.hoveredId = null
    kLabel.textContent = `K = ${state.k}`
    render()
  })

  display.addEventListener("change", () => {
    state.display = display.value
    state.hoveredId = null
    render()
  })

  kLabel.textContent = `K = ${state.k}`
  render()
  return container
}

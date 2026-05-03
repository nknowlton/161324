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
    labels.push({ cluster, mid: (start + end) / 2, start, end, size: clusterRows.length })
    cursor += gapUnits
  })

  return { ordered, labels, totalSlots: Math.max(cursor - gapUnits, 1) }
}

export function pamSilhouetteWidget(silhouetteData, summaryData) {
  const rows = toRows(silhouetteData).map((row) => ({
    ...row,
    k: Number(row.k),
    id: Number(row.id),
    cluster: Number(row.cluster),
    neighbor: Number(row.neighbor),
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

  const state = { k: 5, hoveredId: null }

  const container = document.createElement("div")
  container.className = "widget-shell"
  container.style.display = "grid"
  container.style.gap = "10px"

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

  const svg = svgEl("svg", { viewBox: "0 0 560 380", width: "100%", height: "380" })
  const hoverNote = document.createElement("div")
  hoverNote.style.fontSize = "0.88rem"
  hoverNote.style.color = "#51616f"
  hoverNote.style.minHeight = "1.2em"
  const note = document.createElement("div")
  note.style.fontSize = "0.92rem"
  note.style.color = "#425565"

  container.append(controls, svg, hoverNote, note)

  function render() {
    clearNode(svg)
    svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 560, height: 380, fill: "rgba(255,255,255,0.74)" }))

    const currentRows = rows.filter((row) => row.k === state.k)
    const { ordered, labels, totalSlots } = clusterLayout(currentRows)
    const summary = summaries.get(state.k)

    const width = 560
    const height = 380
    const margin = { top: 28, right: 24, bottom: 54, left: 74 }
    const plotTop = margin.top
    const plotBottom = height - margin.bottom
    const plotHeight = plotBottom - plotTop
    const slotHeight = plotHeight / totalSlots
    const yForSlot = (slot) => plotTop + slot * slotHeight
    const xMin = Math.min(-0.35, Math.min(...ordered.map((row) => row.sil_width)) - 0.05)
    const xMax = 1
    const xScale = linearScale(xMin, xMax, margin.left, width - margin.right)
    const xTicks = [-0.25, 0, 0.25, 0.5, 0.75, 1].filter((tick) => tick >= xMin && tick <= xMax)
    const averageX = xScale(summary?.average_width ?? 0)

    svg.appendChild(
      svgEl("line", {
        x1: xScale(0),
        y1: plotTop,
        x2: xScale(0),
        y2: plotBottom,
        stroke: "#6b7280",
        "stroke-width": 1.2
      })
    )

    xTicks.forEach((tick) => {
      const x = xScale(tick)
      svg.appendChild(
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
        y: height - margin.bottom + 22,
        "text-anchor": "middle",
        "font-size": "11",
        fill: "#5b6770"
      })
      label.textContent = tick.toFixed(2).replace(/\.00$/, "")
      svg.appendChild(label)
    })

    const xAxisLabel = svgEl("text", {
      x: (margin.left + width - margin.right) / 2,
      y: height - 10,
      "text-anchor": "middle",
      "font-size": "12",
      fill: "#334155"
    })
    xAxisLabel.textContent = "Silhouette width"
    svg.appendChild(xAxisLabel)

    labels.forEach((labelInfo) => {
      const separatorY = yForSlot(labelInfo.end + 1.5)
      if (labelInfo.cluster !== labels[labels.length - 1]?.cluster) {
        svg.appendChild(
          svgEl("line", {
            x1: margin.left,
            y1: separatorY,
            x2: width - margin.right,
            y2: separatorY,
            stroke: "rgba(107, 114, 128, 0.18)",
            "stroke-width": 1
          })
        )
      }

      const label = svgEl("text", {
        x: margin.left - 12,
        y: yForSlot(labelInfo.mid) + slotHeight * 0.45,
        "text-anchor": "end",
        "font-size": "11",
        fill: palette[(labelInfo.cluster - 1) % palette.length]
      })
      label.textContent = `C${labelInfo.cluster}`
      svg.appendChild(label)
    })

    svg.appendChild(
      svgEl("line", {
        x1: averageX,
        y1: plotTop,
        x2: averageX,
        y2: plotBottom,
        stroke: "#8a3324",
        "stroke-width": 1.8,
        "stroke-dasharray": "6 5",
        opacity: 0.9
      })
    )

    const averageLabel = svgEl("text", {
      x: Math.min(averageX + 8, width - margin.right - 48),
      y: plotTop + 14,
      "font-size": "11",
      fill: "#8a3324"
    })
    averageLabel.textContent = `avg = ${(summary?.average_width ?? 0).toFixed(2)}`
    svg.appendChild(averageLabel)

    ordered.forEach((row) => {
      const top = yForSlot(row.slot)
      const barY = top + slotHeight * 0.1
      const barHeight = Math.max(slotHeight * 0.8, 1.2)
      const zeroX = xScale(0)
      const barX = row.sil_width >= 0 ? zeroX : xScale(row.sil_width)
      const barWidth = Math.max(Math.abs(xScale(row.sil_width) - zeroX), 1.2)
      const hovered = state.hoveredId === row.id

      const rect = svgEl("rect", {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        fill: palette[(row.cluster - 1) % palette.length],
        stroke: hovered ? "#111827" : "rgba(255,255,255,0.9)",
        "stroke-width": hovered ? 1.6 : 0.6,
        opacity: row.sil_width < 0 ? 0.65 : 0.9
      })

      rect.addEventListener("mouseenter", () => {
        state.hoveredId = row.id
        hoverNote.textContent =
          `${row.name} | ${shortMonsterType(row.type)} | cluster ${row.cluster} | silhouette ${row.sil_width.toFixed(2)}`
        render()
      })
      rect.addEventListener("mouseleave", () => {
        state.hoveredId = null
        hoverNote.textContent = "Hover a bar to identify the monster and its silhouette width."
        render()
      })

      svg.appendChild(rect)
    })

    hoverNote.textContent = state.hoveredId
      ? hoverNote.textContent
      : "Hover a bar to identify the monster and its silhouette width."

    note.textContent =
      `K = ${state.k} gives an average silhouette width of ${(summary?.average_width ?? 0).toFixed(2)}. ` +
      `${summary?.negative_count ?? 0} monsters have negative silhouette widths and ` +
      `${summary?.near_boundary_count ?? 0} sit near the cluster boundary with widths between 0 and 0.1.`
  }

  kSlider.addEventListener("input", () => {
    state.k = Number(kSlider.value)
    state.hoveredId = null
    kLabel.textContent = `K = ${state.k}`
    render()
  })

  kLabel.textContent = `K = ${state.k}`
  render()
  return container
}

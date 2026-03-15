export const palette = {
  navy: "#1f3c88",
  blue: "#2463eb",
  teal: "#0f766e",
  green: "#2f855a",
  orange: "#dd6b20",
  red: "#c53030",
  gold: "#d69e2e",
  gray: "#5f6c7b",
  light: "#e8edf4"
}

export function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function randn(rng) {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

export function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name)
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
  return el
}

export function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

export function extent(values, paddingFraction = 0.08) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return [min - span * paddingFraction, max + span * paddingFraction]
}

export function ticks(min, max, count = 5) {
  if (count <= 1) return [min]
  return Array.from({ length: count }, (_, index) => min + (index / (count - 1)) * (max - min))
}

export function card(title) {
  const shell = document.createElement("div")
  shell.style.display = "grid"
  shell.style.gap = "8px"
  shell.style.padding = "0.8rem"
  shell.style.borderRadius = "16px"
  shell.style.background = "rgba(255,255,255,0.82)"
  shell.style.border = "1px solid rgba(31, 42, 51, 0.10)"
  shell.style.boxShadow = "0 10px 24px rgba(31, 42, 51, 0.08)"

  const heading = document.createElement("div")
  heading.style.fontSize = "0.82rem"
  heading.style.fontWeight = "700"
  heading.style.letterSpacing = "0.02em"
  heading.style.textTransform = "uppercase"
  heading.style.color = "#334155"
  heading.textContent = title

  shell.appendChild(heading)
  return { shell, heading }
}

export function drawAxes(svg, width, height, margin, xTicks, yTicks, xScale, yScale, xLabel, yLabel) {
  svg.appendChild(
    svgEl("line", {
      x1: margin.left,
      y1: height - margin.bottom,
      x2: width - margin.right,
      y2: height - margin.bottom,
      stroke: "#64748b",
      "stroke-width": 1.2
    })
  )
  svg.appendChild(
    svgEl("line", {
      x1: margin.left,
      y1: margin.top,
      x2: margin.left,
      y2: height - margin.bottom,
      stroke: "#64748b",
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
        stroke: "rgba(100, 116, 139, 0.18)",
        "stroke-width": 1
      })
    )
    const label = svgEl("text", {
      x: margin.left - 8,
      y: y + 4,
      "text-anchor": "end",
      "font-size": "11",
      fill: "#64748b"
    })
    label.textContent = tick.toFixed(2)
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
        stroke: "#64748b",
        "stroke-width": 1
      })
    )
    const label = svgEl("text", {
      x,
      y: height - margin.bottom + 18,
      "text-anchor": "middle",
      "font-size": "11",
      fill: "#64748b"
    })
    label.textContent = tick.toFixed(2)
    svg.appendChild(label)
  })

  const xAxisLabel = svgEl("text", {
    x: (margin.left + width - margin.right) / 2,
    y: height - 6,
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

export const palette = [
  "#00b83d",
  "#005dff",
  "#ff2a2a",
  "#b86b1b",
  "#7851a9",
  "#2e8b57",
  "#bc5090",
  "#5c677d"
]

const monsterTypeAliases = new Map([
  ["Swarm of Tiny Beasts", "Swarm Beast"],
  ["Swarm of Tiny Undead", "Swarm Undead"]
])

export function shortMonsterType(type) {
  return monsterTypeAliases.get(type) ?? type
}

export function categoricalColor(index, total = palette.length) {
  if (index < palette.length) return palette[index]
  const hue = Math.round((index / Math.max(total, 1)) * 360)
  return `hsl(${hue} 72% 46%)`
}

export function monsterTypeColorMap(types) {
  const uniqueTypes = [...new Set(types)]
  return new Map(uniqueTypes.map((type, index) => [type, categoricalColor(index, uniqueTypes.length)]))
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

export function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name)
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
  return el
}

export function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild)
  }
}

export function makeSyntheticData(seed = 161324) {
  const rng = mulberry32(seed)
  const points = []

  const pushPoint = (x, y, source) => {
    points.push({
      id: points.length,
      label: `P${points.length + 1}`,
      x,
      y,
      source
    })
  }

  for (let i = 0; i < 22; i += 1) {
    pushPoint(-2.7 + 0.42 * randn(rng), -1.6 + 0.42 * randn(rng), "blob_a")
  }

  for (let i = 0; i < 22; i += 1) {
    const a = 0.85 * randn(rng)
    const b = 0.18 * randn(rng)
    pushPoint(-0.2 + a - 0.35 * b, 2.3 + 0.35 * a + b, "ellipse")
  }

  for (let i = 0; i < 22; i += 1) {
    pushPoint(2.7 + 0.38 * randn(rng), -1.8 + 0.4 * randn(rng), "blob_b")
  }

  for (let i = 0; i < 20; i += 1) {
    const theta = Math.PI * (0.1 + 0.92 * rng())
    const radius = 1.15 + 0.08 * randn(rng)
    pushPoint(2.3 + radius * Math.cos(theta), 1.8 + 0.78 * radius * Math.sin(theta), "crescent")
  }

  for (let i = 0; i < 20; i += 1) {
    const theta = 2 * Math.PI * rng()
    const radius = 0.86 + 0.07 * randn(rng)
    pushPoint(-3.1 + radius * Math.cos(theta), 2.2 + radius * Math.sin(theta), "ring")
  }

  for (let i = 0; i < 12; i += 1) {
    pushPoint(-4 + 8 * rng(), -3 + 6 * rng(), "noise")
  }

  return points
}

export const syntheticPoints = makeSyntheticData()
export const hierarchyPoints = syntheticPoints
  .filter((point) => point.source === "blob_a" || point.source === "ellipse" || point.source === "blob_b")
  .slice(0, 14)
function makeCentroidDemoData(seed = 32410) {
  const rng = mulberry32(seed)
  const points = []

  const pushPoint = (x, y, source) => {
    points.push({
      id: points.length,
      label: `K${points.length + 1}`,
      x,
      y,
      source
    })
  }

  for (let i = 0; i < 18; i += 1) {
    pushPoint(-2.1 + 0.52 * randn(rng), -0.85 + 0.48 * randn(rng), "near_a")
  }

  for (let i = 0; i < 18; i += 1) {
    pushPoint(-1.05 + 0.5 * randn(rng), 0.3 + 0.45 * randn(rng), "near_b")
  }

  for (let i = 0; i < 18; i += 1) {
    const a = 0.62 * randn(rng)
    const b = 0.2 * randn(rng)
    pushPoint(0.55 + a - 0.5 * b, 1.0 + 0.55 * a + b, "diagonal")
  }

  for (let i = 0; i < 18; i += 1) {
    pushPoint(1.85 + 0.48 * randn(rng), -0.55 + 0.44 * randn(rng), "near_c")
  }

  for (let i = 0; i < 12; i += 1) {
    pushPoint(2.6 + 0.32 * randn(rng), 0.72 + 0.3 * randn(rng), "near_d")
  }

  for (let i = 0; i < 8; i += 1) {
    pushPoint(-0.1 + 1.7 * rng(), -0.3 + 0.8 * rng(), "bridge")
  }

  return points
}

export const centroidPoints = makeCentroidDemoData()
export const densityPoints = syntheticPoints.filter(
  (point) => point.source === "crescent" || point.source === "ring" || point.source === "noise"
)
export const stabilityPoints = [
  ...syntheticPoints.filter((point) => point.source === "blob_a").slice(0, 8),
  ...syntheticPoints.filter((point) => point.source === "ellipse").slice(0, 8),
  ...syntheticPoints.filter((point) => point.source === "blob_b").slice(0, 8)
].map((point) => {
  if (point.source === "blob_a") {
    return { ...point, x: point.x + 2.35, y: point.y + 1.6 }
  }
  if (point.source === "ellipse") {
    return { ...point, x: 0.55 * point.x + 0.05, y: 0.55 * point.y - 0.75 }
  }
  return { ...point, x: point.x - 2.35, y: point.y + 1.55 }
})

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function squaredDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function meanPoint(points) {
  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  )
  return { x: total.x / points.length, y: total.y / points.length }
}

export function projectFactory(points, width, height, padding = 26) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)

  return function (point) {
    return {
      x: padding + ((point.x - minX) / spanX) * (width - 2 * padding),
      y: height - padding - ((point.y - minY) / spanY) * (height - 2 * padding)
    }
  }
}

export function choiceLabel(index) {
  return `C${index + 1}`
}

function clusterDistance(clusterA, clusterB, points, linkage) {
  const distances = []
  clusterA.members.forEach((left) => {
    clusterB.members.forEach((right) => {
      distances.push(distance(points[left], points[right]))
    })
  })
  if (linkage === "single") return Math.min(...distances)
  if (linkage === "average") return distances.reduce((sum, value) => sum + value, 0) / distances.length
  return Math.max(...distances)
}

export function hierarchicalTrace(points, linkage = "complete") {
  const nodes = new Map()
  const meanX = (members) => members.reduce((sum, index) => sum + points[index].x, 0) / members.length

  let active = points.map((point, index) => {
    const node = { id: index, members: [index], left: null, right: null, height: 0 }
    nodes.set(node.id, node)
    return node
  })

  const snapshots = [
    {
      clusters: active.map((cluster) => ({ id: cluster.id, members: cluster.members.slice() })),
      lastMerge: null
    }
  ]

  let nextId = points.length
  const merges = []

  while (active.length > 1) {
    let bestPair = [0, 1]
    let bestDistance = Infinity

    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const gap = clusterDistance(active[i], active[j], points, linkage)
        if (gap < bestDistance) {
          bestDistance = gap
          bestPair = [i, j]
        }
      }
    }

    const leftRaw = active[bestPair[0]]
    const rightRaw = active[bestPair[1]]
    const ordered = meanX(leftRaw.members) <= meanX(rightRaw.members) ? [leftRaw, rightRaw] : [rightRaw, leftRaw]

    const merged = {
      id: nextId,
      members: ordered[0].members.concat(ordered[1].members),
      left: ordered[0].id,
      right: ordered[1].id,
      height: bestDistance
    }
    nextId += 1
    nodes.set(merged.id, merged)
    merges.push({
      id: merged.id,
      left: ordered[0].id,
      right: ordered[1].id,
      members: merged.members.slice(),
      height: merged.height,
      leftSize: ordered[0].members.length,
      rightSize: ordered[1].members.length
    })

    active = active.filter((_, index) => index !== bestPair[0] && index !== bestPair[1])
    active.push(merged)
    snapshots.push({
      clusters: active.map((cluster) => ({ id: cluster.id, members: cluster.members.slice() })),
      lastMerge: merges[merges.length - 1]
    })
  }

  const rootId = active[0].id
  const leafOrder = []

  const walkLeaves = (nodeId) => {
    const node = nodes.get(nodeId)
    if (node.left === null) {
      leafOrder.push(nodeId)
      return
    }
    walkLeaves(node.left)
    walkLeaves(node.right)
  }
  walkLeaves(rootId)

  const baseX = new Map(leafOrder.map((nodeId, index) => [nodeId, index]))
  const layout = new Map()

  const locate = (nodeId) => {
    if (layout.has(nodeId)) return layout.get(nodeId)
    const node = nodes.get(nodeId)
    if (node.left === null) {
      const position = { x: baseX.get(nodeId), y: 0 }
      layout.set(nodeId, position)
      return position
    }
    const left = locate(node.left)
    const right = locate(node.right)
    const position = { x: (left.x + right.x) / 2, y: node.height }
    layout.set(nodeId, position)
    return position
  }
  locate(rootId)

  return {
    nodes,
    merges,
    snapshots,
    rootId,
    layout,
    leafOrder,
    maxHeight: Math.max(...merges.map((merge) => merge.height), 1)
  }
}

export function snapshotAssignments(snapshot, size) {
  const assignments = Array(size).fill(-1)
  snapshot.clusters
    .slice()
    .sort((left, right) => left.id - right.id)
    .forEach((cluster, clusterIndex) => {
      cluster.members.forEach((member) => {
        assignments[member] = clusterIndex
      })
    })
  return assignments
}

export function hierarchicalAssignments(points, linkage = "complete", k = 3) {
  const trace = hierarchicalTrace(points, linkage)
  const snapshot =
    trace.snapshots.find((item) => item.clusters.length === k) || trace.snapshots[trace.snapshots.length - 1]
  return snapshotAssignments(snapshot, points.length)
}

function initialCenters(points, k) {
  const ranked = points
    .map((point, index) => ({ point, index, score: point.x + 0.35 * point.y }))
    .sort((left, right) => left.score - right.score)

  const picks = []
  for (let i = 0; i < k; i += 1) {
    const where = Math.round((i * (ranked.length - 1)) / Math.max(k - 1, 1))
    picks.push({ ...ranked[where].point, sourceIndex: ranked[where].index })
  }
  return picks
}

function nearestCenter(point, centers) {
  let bestIndex = 0
  let bestDistance = Infinity
  centers.forEach((center, index) => {
    const gap = squaredDistance(point, center)
    if (gap < bestDistance) {
      bestDistance = gap
      bestIndex = index
    }
  })
  return bestIndex
}

function pickMedoid(points, memberIndices) {
  let bestIndex = memberIndices[0]
  let bestDistance = Infinity
  memberIndices.forEach((candidate) => {
    const total = memberIndices.reduce((sum, other) => sum + distance(points[candidate], points[other]), 0)
    if (total < bestDistance) {
      bestDistance = total
      bestIndex = candidate
    }
  })
  return { ...points[bestIndex], sourceIndex: bestIndex }
}

export function kmeansTrace(points, k = 3, mode = "kmeans", maxIterations = 5) {
  let centers = initialCenters(points, k)
  const snapshots = []

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const assignments = points.map((point) => nearestCenter(point, centers))
    snapshots.push({
      iteration,
      phase: iteration === 0 ? "initialise" : "assign",
      assignments: assignments.slice(),
      centers: centers.map((center) => ({ ...center }))
    })

    const nextCenters = centers.map((center, index) => {
      const memberIndices = assignments
        .map((assignment, pointIndex) => ({ assignment, pointIndex }))
        .filter((item) => item.assignment === index)
        .map((item) => item.pointIndex)

      if (memberIndices.length === 0) return { ...center }
      if (mode === "kmedoids") return pickMedoid(points, memberIndices)

      const mean = meanPoint(memberIndices.map((member) => points[member]))
      return { ...mean, sourceIndex: center.sourceIndex }
    })

    const updatedAssignments = points.map((point) => nearestCenter(point, nextCenters))
    snapshots.push({
      iteration: iteration + 1,
      phase: "update",
      assignments: updatedAssignments.slice(),
      centers: nextCenters.map((center) => ({ ...center }))
    })

    const stable =
      updatedAssignments.every((value, index) => value === assignments[index]) &&
      nextCenters.every(
        (center, index) =>
          Math.abs(center.x - centers[index].x) < 1e-6 && Math.abs(center.y - centers[index].y) < 1e-6
      )

    centers = nextCenters
    if (stable) break
  }

  return snapshots
}

export function withinClusterScore(points, assignments, centers) {
  return assignments.reduce((sum, cluster, index) => sum + squaredDistance(points[index], centers[cluster]), 0)
}

export function dbscanTrace(points, eps = 0.9, minPts = 5) {
  const neighbors = points.map((point) =>
    points
      .map((candidate, candidateIndex) => ({ candidateIndex, gap: distance(point, candidate) }))
      .filter((item) => item.gap <= eps)
      .map((item) => item.candidateIndex)
  )

  const isCore = neighbors.map((hits) => hits.length >= minPts)
  const visited = Array(points.length).fill(false)
  const assignments = Array(points.length).fill(-1)
  const snapshots = []

  const pushSnapshot = (current, message) => {
    snapshots.push({
      assignments: assignments.slice(),
      visited: visited.slice(),
      isCore: isCore.slice(),
      current,
      message
    })
  }

  let clusterId = 0

  for (let i = 0; i < points.length; i += 1) {
    if (visited[i]) continue
    visited[i] = true
    pushSnapshot(i, `${points[i].label} becomes the next candidate point.`)

    if (!isCore[i]) {
      pushSnapshot(i, `${points[i].label} has too few neighbors, so it is provisional noise.`)
      continue
    }

    assignments[i] = clusterId
    const queue = neighbors[i].filter((neighbor) => neighbor !== i)
    pushSnapshot(i, `${points[i].label} is a core point and starts cluster ${clusterId + 1}.`)

    while (queue.length > 0) {
      const neighbor = queue.shift()
      if (!visited[neighbor]) {
        visited[neighbor] = true
        pushSnapshot(neighbor, `${points[neighbor].label} is visited from the frontier.`)
        if (isCore[neighbor]) {
          neighbors[neighbor].forEach((candidate) => {
            if (!queue.includes(candidate)) queue.push(candidate)
          })
          pushSnapshot(neighbor, `${points[neighbor].label} is core, so its neighbors are added to the queue.`)
        }
      }

      if (assignments[neighbor] === -1) {
        assignments[neighbor] = clusterId
        pushSnapshot(neighbor, `${points[neighbor].label} is attached to cluster ${clusterId + 1}.`)
      }
    }

    clusterId += 1
  }

  return {
    snapshots,
    assignments,
    isCore,
    pointTypes: assignments.map((assignment, index) => {
      if (assignment === -1) return "noise"
      if (isCore[index]) return "core"
      return "border"
    })
  }
}

function combinations2(count) {
  return (count * (count - 1)) / 2
}

export function adjustedRandIndex(labelsA, labelsB) {
  const uniqueA = [...new Set(labelsA)]
  const uniqueB = [...new Set(labelsB)]
  const table = Array.from({ length: uniqueA.length }, () => Array(uniqueB.length).fill(0))

  labelsA.forEach((value, index) => {
    const row = uniqueA.indexOf(value)
    const col = uniqueB.indexOf(labelsB[index])
    table[row][col] += 1
  })

  const sumNij = table.reduce(
    (sum, row) => sum + row.reduce((inner, cell) => inner + combinations2(cell), 0),
    0
  )
  const rowSums = table.map((row) => row.reduce((sum, cell) => sum + cell, 0))
  const colSums = uniqueB.map((_, column) => table.reduce((sum, row) => sum + row[column], 0))
  const sumAi = rowSums.reduce((sum, value) => sum + combinations2(value), 0)
  const sumBj = colSums.reduce((sum, value) => sum + combinations2(value), 0)
  const totalPairs = combinations2(labelsA.length)
  const expected = (sumAi * sumBj) / Math.max(totalPairs, 1)
  const maxIndex = 0.5 * (sumAi + sumBj)

  if (maxIndex === expected) return 1
  return (sumNij - expected) / (maxIndex - expected)
}

export function resampleStability(points, linkage = "complete", k = 3, reps = 24, seed = 2026) {
  const baselineTrace = hierarchicalTrace(points, linkage)
  const baseline =
    snapshotAssignments(
      baselineTrace.snapshots.find((item) => item.clusters.length === k) ||
        baselineTrace.snapshots[baselineTrace.snapshots.length - 1],
      points.length
    )
  const same = Array.from({ length: points.length }, () => Array(points.length).fill(0))
  const seen = Array.from({ length: points.length }, () => Array(points.length).fill(0))
  const rng = mulberry32(seed)
  const ari = []
  const draws = []

  for (let rep = 0; rep < reps; rep += 1) {
    const boot = []
    for (let i = 0; i < points.length; i += 1) {
      boot.push(Math.floor(rng() * points.length))
    }
    const counts = Array(points.length).fill(0)
    boot.forEach((index) => {
      counts[index] += 1
    })
    const unique = [...new Set(boot)]
    if (unique.length <= k) continue

    const seenLabels = new Map()
    const drawPoints = boot.map((originalIndex) => {
      const nextCount = (seenLabels.get(originalIndex) || 0) + 1
      seenLabels.set(originalIndex, nextCount)
      return {
        ...points[originalIndex],
        label: `${points[originalIndex].label}.${nextCount}`,
        originalIndex
      }
    })
    const drawTrace = hierarchicalTrace(drawPoints, linkage)
    const drawAssignments =
      snapshotAssignments(
        drawTrace.snapshots.find((item) => item.clusters.length === k) ||
          drawTrace.snapshots[drawTrace.snapshots.length - 1],
        drawPoints.length
      )
    const baselineDraw = boot.map((index) => baseline[index])
    const drawAri = adjustedRandIndex(baselineDraw, drawAssignments)
    ari.push(drawAri)

    const mappedAssignments = Array(points.length).fill(-1)
    unique.forEach((originalIndex) => {
      const matching = boot
        .map((bootIndex, drawIndex) => ({ bootIndex, drawIndex }))
        .filter((item) => item.bootIndex === originalIndex)
        .map((item) => drawAssignments[item.drawIndex])
      mappedAssignments[originalIndex] = matching.length === 0 ? -1 : matching[0]
    })

    draws.push({
      boot: boot.slice(),
      counts,
      unique: unique.slice(),
      sampleAssignments: mappedAssignments,
      drawAssignments,
      drawPoints,
      drawTrace,
      ari: drawAri
    })

    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const left = unique[i]
        const right = unique[j]
        seen[left][right] += 1
        seen[right][left] += 1
        const leftAssignment = mappedAssignments[left]
        const rightAssignment = mappedAssignments[right]
        if (leftAssignment !== -1 && leftAssignment === rightAssignment) {
          same[left][right] += 1
          same[right][left] += 1
        }
      }
    }
  }

  const consensus = same.map((row, rowIndex) =>
    row.map((value, colIndex) => {
      if (rowIndex === colIndex) return 1
      return seen[rowIndex][colIndex] === 0 ? 0 : value / seen[rowIndex][colIndex]
    })
  )

  const scores = [...new Set(baseline)].map((clusterId) => {
    const members = baseline
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value === clusterId)
      .map((item) => item.index)

    if (members.length < 2) {
      return { clusterId, size: members.length, score: 1 }
    }

    let total = 0
    let count = 0
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        total += consensus[members[i]][members[j]]
        count += 1
      }
    }
    return { clusterId, size: members.length, score: total / count }
  })

  return { baseline, baselineTrace, consensus, scores, ari, draws }
}

import * as THREE from 'three'

const GREEN_TRIPLET_CHANCE = 0.16
const YELLOW_TRIPLET_CHANCE = 0.14
const RED_TRIPLET_CHANCE = 0.1
const RED_SINGLE_CHANCE = 0.18
const YELLOW_SINGLE_CHANCE = 0.42

function distanceSqToSegment2(point, segStart, segEnd) {
  const seg = segEnd.clone().sub(segStart)
  const pointVec = point.clone().sub(segStart)
  const segLenSq = seg.lengthSq()
  if (segLenSq === 0) return point.distanceToSquared(segStart)

  const t = THREE.MathUtils.clamp(pointVec.dot(seg) / segLenSq, 0, 1)
  const closest = segStart.clone().addScaledVector(seg, t)
  return point.distanceToSquared(closest)
}

function isSphereIntersectingCone(playerPos, playerRadius, cone) {
  const coneRadius = Number(cone.r || 0)
  const coneHeight = Number(cone.h || 0)
  if (!cone.active || coneRadius <= 0 || coneHeight <= 0) return false

  const isCeilingCone = Boolean(cone.isCeiling)
  const apexY = isCeilingCone ? cone.position.y - coneHeight / 2 : cone.position.y + coneHeight / 2
  const axisDepth = isCeilingCone ? playerPos.y - apexY : apexY - playerPos.y
  const radialDistance = Math.hypot(playerPos.x - cone.position.x, playerPos.z - cone.position.z)
  const point2 = new THREE.Vector2(radialDistance, axisDepth)

  const apex2 = new THREE.Vector2(0, 0)
  const baseCenter2 = new THREE.Vector2(0, coneHeight)
  const baseEdge2 = new THREE.Vector2(coneRadius, coneHeight)

  const insideCone =
    axisDepth >= 0 &&
    axisDepth <= coneHeight &&
    radialDistance <= (axisDepth / coneHeight) * coneRadius

  if (insideCone) return true

  const distSq = Math.min(
    point2.distanceToSquared(apex2),
    distanceSqToSegment2(point2, apex2, baseEdge2),
    distanceSqToSegment2(point2, baseCenter2, baseEdge2)
  )

  return distSq <= playerRadius * playerRadius
}

function getGenerationNumber(rowNumber, rowsPerGeneration) {
  return Math.floor(rowNumber / rowsPerGeneration) + 1
}

function getSpikeDensityByGeneration(generation, baseDensity, densityStep, maxSpikeDensity) {
  const currentGeneration = Math.max(1, Number(generation || 1))
  const initialDensity = Number(baseDensity || 0.2)
  const step = Number(densityStep || 0.1)
  const maxDensity = Number(maxSpikeDensity || 0.8)
  const nextDensity = initialDensity + (currentGeneration - 1) * step
  return THREE.MathUtils.clamp(nextDensity, initialDensity, maxDensity)
}

function createConeSpecPicker({
  lowSpikeHeight,
  midSpikeHeight,
  highSpikeHeight,
  highSpikeUnlockScore,
  coneGeometryLow,
  coneGeometryMid,
  coneGeometryHigh,
  coneMaterialLow,
  coneMaterialMid,
  coneMaterialHigh,
}) {
  const green = {
    key: 'green',
    height: lowSpikeHeight,
    geometry: coneGeometryLow,
    material: coneMaterialLow,
    scoreValue: 1,
  }
  const yellow = {
    key: 'yellow',
    height: midSpikeHeight,
    geometry: coneGeometryMid,
    material: coneMaterialMid,
    scoreValue: 2,
  }
  const red = {
    key: 'red',
    height: highSpikeHeight,
    geometry: coneGeometryHigh,
    material: coneMaterialHigh,
    scoreValue: 3,
  }

  return {
    green,
    yellow,
    red,
    pickSingle(currentScore = 0) {
      const allowRed = Number(currentScore || 0) >= Number(highSpikeUnlockScore || 100)
      const roll = Math.random()
      if (allowRed && roll < RED_SINGLE_CHANCE) return red
      if (roll < RED_SINGLE_CHANCE + YELLOW_SINGLE_CHANCE) return yellow
      return green
    },
  }
}

function setConeInactive(cone, rowZ) {
  cone.active = false
  cone.visible = false
  cone.passed = true
  cone.scoreValue = 0
  cone.h = 0
  cone.position.z = rowZ
}

function applyConeSpec(cone, spec, { x, z, ceilingY }) {
  cone.active = true
  cone.visible = true
  cone.geometry = spec.geometry
  cone.material = spec.material
  cone.h = spec.height
  cone.scoreValue = spec.scoreValue
  cone.passed = false
  cone.position.x = x
  cone.position.z = z
  cone.scale.set(1, 1, 1)

  if (Math.random() <= 0.5) {
    cone.position.y = ceilingY
    cone.rotation.z = Math.PI
    cone.isCeiling = true
  } else {
    cone.position.y = 0
    cone.rotation.z = 0
    cone.isCeiling = false
  }
}

function buildRowLayout({
  rowNumber,
  density,
  lanePositions,
  specPicker,
  currentScore,
  rowsPerGeneration,
}) {
  const generation = getGenerationNumber(rowNumber, rowsPerGeneration)
  const layout = new Array(lanePositions.length).fill(null)
  const roll = Math.random()

  if (generation >= 4 && roll < RED_TRIPLET_CHANCE) {
    return layout.map(() => specPicker.red)
  }

  if (generation >= 3 && roll < YELLOW_TRIPLET_CHANCE) {
    return layout.map(() => specPicker.yellow)
  }

  if (generation >= 2 && roll < GREEN_TRIPLET_CHANCE) {
    return layout.map(() => specPicker.green)
  }

  let activeCount = 0
  for (let laneIndex = 0; laneIndex < lanePositions.length; laneIndex++) {
    if (Math.random() < density) {
      layout[laneIndex] = specPicker.pickSingle(currentScore)
      activeCount += 1
    }
  }

  if (!activeCount) {
    const laneIndex = Math.floor(Math.random() * lanePositions.length)
    layout[laneIndex] = specPicker.pickSingle(currentScore)
  }

  return layout
}

function rebuildRow(row, {
  rowNumber,
  z,
  density,
  ceilingY,
  lanePositions,
  specPicker,
  currentScore,
  rowsPerGeneration,
}) {
  row.rowNumber = rowNumber
  row.z = z
  row.initialRowNumber = row.initialRowNumber ?? rowNumber
  row.initialZ = row.initialZ ?? z
  row.density = density

  const layout = buildRowLayout({
    rowNumber,
    density,
    lanePositions,
    specPicker,
    currentScore,
    rowsPerGeneration,
  })

  for (let laneIndex = 0; laneIndex < row.cones.length; laneIndex++) {
    const cone = row.cones[laneIndex]
    const spec = layout[laneIndex]
    if (!spec) {
      setConeInactive(cone, z)
      continue
    }

    applyConeSpec(cone, spec, {
      x: lanePositions[laneIndex],
      z,
      ceilingY,
    })
  }
}

export function createConeField(world, {
  ceilingY,
  lanes = [],
  rowCount = 50,
  rowsPerGeneration = 50,
  spacing = 30,
  startZ = -30,
  lowSpikeHeight = 5,
  midSpikeHeight = 10,
  highSpikeHeight = 16,
  highSpikeUnlockScore = 100,
  radius = 3,
  radialSegments = 10,
  baseSpikeDensity = 0.2,
  densityStep = 0.1,
  maxSpikeDensity = 0.8,
}) {
  const coneGeometryLow = new THREE.ConeGeometry(radius, lowSpikeHeight, radialSegments)
  const coneGeometryMid = new THREE.ConeGeometry(radius, midSpikeHeight, radialSegments)
  const coneGeometryHigh = new THREE.ConeGeometry(radius, highSpikeHeight, radialSegments)
  const coneMaterialLow = new THREE.MeshBasicMaterial({ color: '#57c96a' })
  const coneMaterialMid = new THREE.MeshBasicMaterial({ color: '#fcba03' })
  const coneMaterialHigh = new THREE.MeshBasicMaterial({ color: '#ff5b5b' })

  const lanePositions = Array.isArray(lanes) && lanes.length ? lanes : [0]
  const specPicker = createConeSpecPicker({
    lowSpikeHeight,
    midSpikeHeight,
    highSpikeHeight,
    highSpikeUnlockScore,
    coneGeometryLow,
    coneGeometryMid,
    coneGeometryHigh,
    coneMaterialLow,
    coneMaterialMid,
    coneMaterialHigh,
  })

  const rows = []
  const cones = []

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const generation = getGenerationNumber(rowIndex, rowsPerGeneration)
    const density = getSpikeDensityByGeneration(generation, baseSpikeDensity, densityStep, maxSpikeDensity)
    const rowZ = startZ - rowIndex * spacing
    const estimatedScore = rowIndex >= rowsPerGeneration ? highSpikeUnlockScore : 0
    const row = {
      rowNumber: rowIndex,
      initialRowNumber: rowIndex,
      z: rowZ,
      initialZ: rowZ,
      density,
      cones: [],
    }

    for (let laneIndex = 0; laneIndex < lanePositions.length; laneIndex++) {
      const placeholder = new THREE.Mesh(coneGeometryLow, coneMaterialLow)
      placeholder.r = radius
      placeholder.active = false
      placeholder.passed = true
      placeholder.visible = false
      row.cones.push(placeholder)
      cones.push(placeholder)
      world.add(placeholder)
    }

    rebuildRow(row, {
      rowNumber: rowIndex,
      z: rowZ,
      density,
      ceilingY,
      lanePositions,
      specPicker,
      currentScore: estimatedScore,
      rowsPerGeneration,
    })

    rows.push(row)
  }

  return {
    cones,
    rows,
    recycleState: { nextRowNumber: rowCount },
    coneGeometryLow,
    coneGeometryMid,
    coneGeometryHigh,
    coneMaterialLow,
    coneMaterialMid,
    coneMaterialHigh,
    spacing,
  }
}

export function resetConeField(rows, recycleState, {
  ceilingY,
  lanes = [],
  lowSpikeHeight = 5,
  midSpikeHeight = 10,
  highSpikeHeight = 16,
  highSpikeUnlockScore = 100,
  coneGeometryLow,
  coneGeometryMid,
  coneGeometryHigh,
  coneMaterialLow,
  coneMaterialMid,
  coneMaterialHigh,
  baseSpikeDensity = 0.2,
  densityStep = 0.1,
  maxSpikeDensity = 0.8,
  rowsPerGeneration = 50,
}) {
  const lanePositions = Array.isArray(lanes) && lanes.length ? lanes : [0]
  const specPicker = createConeSpecPicker({
    lowSpikeHeight,
    midSpikeHeight,
    highSpikeHeight,
    highSpikeUnlockScore,
    coneGeometryLow,
    coneGeometryMid,
    coneGeometryHigh,
    coneMaterialLow,
    coneMaterialMid,
    coneMaterialHigh,
  })

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const estimatedScore = row.initialRowNumber >= rowsPerGeneration ? highSpikeUnlockScore : 0
    const density = getSpikeDensityByGeneration(
      getGenerationNumber(row.initialRowNumber, rowsPerGeneration),
      baseSpikeDensity,
      densityStep,
      maxSpikeDensity
    )
    rebuildRow(row, {
      rowNumber: row.initialRowNumber,
      z: row.initialZ,
      density,
      ceilingY,
      lanePositions,
      specPicker,
      currentScore: estimatedScore,
      rowsPerGeneration,
    })
  }

  if (recycleState) {
    recycleState.nextRowNumber = rows.length
  }
}

export function advanceCones(rows, panSpeed, dt) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    row.z += panSpeed * dt
    for (let j = 0; j < row.cones.length; j++) {
      row.cones[j].position.z = row.z
    }
  }
}

export function recycleConeField(rows, recycleState, {
  playerZ,
  ceilingY,
  lanes = [],
  recycleThreshold = 140,
  spacing = 30,
  currentScore = 0,
  lowSpikeHeight = 5,
  midSpikeHeight = 10,
  highSpikeHeight = 16,
  highSpikeUnlockScore = 100,
  coneGeometryLow,
  coneGeometryMid,
  coneGeometryHigh,
  coneMaterialLow,
  coneMaterialMid,
  coneMaterialHigh,
  baseSpikeDensity = 0.2,
  densityStep = 0.1,
  maxSpikeDensity = 0.8,
  rowsPerGeneration = 50,
}) {
  if (!Array.isArray(rows) || !rows.length || !recycleState) return

  const lanePositions = Array.isArray(lanes) && lanes.length ? lanes : [0]
  const specPicker = createConeSpecPicker({
    lowSpikeHeight,
    midSpikeHeight,
    highSpikeHeight,
    highSpikeUnlockScore,
    coneGeometryLow,
    coneGeometryMid,
    coneGeometryHigh,
    coneMaterialLow,
    coneMaterialMid,
    coneMaterialHigh,
  })

  let minCurrentZ = Math.min(...rows.map((row) => row.z))
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.z <= playerZ + recycleThreshold) continue

    const nextRowNumber = recycleState.nextRowNumber++
    const nextZ = minCurrentZ - spacing
    const density = getSpikeDensityByGeneration(
      getGenerationNumber(nextRowNumber, rowsPerGeneration),
      baseSpikeDensity,
      densityStep,
      maxSpikeDensity
    )

    rebuildRow(row, {
      rowNumber: nextRowNumber,
      z: nextZ,
      density,
      ceilingY,
      lanePositions,
      specPicker,
      currentScore,
      rowsPerGeneration,
    })

    minCurrentZ = nextZ
  }
}

export function getSpikeDensityByScore(score, baseDensity, densityStep, maxSpikeDensity) {
  return getSpikeDensityByGeneration(score, baseDensity, densityStep, maxSpikeDensity)
}

export function detectConeCollision({
  cones,
  collisionStartIndex,
  playerPos,
  playerRadius,
  playerHit,
  playerZ,
  range = 60,
}) {
  let dead = false
  for (let i = 0; i < cones.length; i++) {
    const cone = cones[i]
    if (!cone.active) continue
    if (Math.abs(cone.position.z - playerZ) > range) continue

    if (!playerHit && isSphereIntersectingCone(playerPos, playerRadius, cone)) {
      dead = true
      break
    }
  }

  return {
    dead,
    collisionStartIndex,
  }
}

export function updatePassedConeScore(cones, playerZ, currentScore = 0, playerRadius = 0) {
  let nextScore = Number(currentScore || 0)
  const passedZ = playerZ + Math.max(0.25, Number(playerRadius || 0))

  for (let i = 0; i < cones.length; i++) {
    const cone = cones[i]
    if (!cone.active || cone.passed) continue
    if (cone.position.z <= passedZ) continue

    cone.passed = true
    nextScore += Number(cone.scoreValue || 0)
  }

  return nextScore
}

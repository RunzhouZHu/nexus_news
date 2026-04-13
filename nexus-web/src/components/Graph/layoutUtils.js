// Graph-coordinate distances — graphology units, not pixels.
// Sigma scales these via the camera. Adjust if nodes feel too compressed or spread.
const ZONE_X_OFFSET = 5     // left/right zone x distance from center
const ZONE_Y_SPREAD = 2     // vertical gap between nodes in a zone
const ARC_RADIUS = 3.5      // radius of the surrounding arc for context nodes

/**
 * Compute semantic positions for a selected node and its immediate neighbors.
 *
 * Zone logic (by edge type, regardless of edge direction):
 *   CAUSED_BY  → left  zone  (x = -ZONE_X_OFFSET)
 *   LED_TO     → right zone  (x = +ZONE_X_OFFSET)
 *   CONTEXT / RELATED_TO → surrounding arc
 *
 * The selected node is placed at the origin { x: 0, y: 0 }.
 * Call translatePositions() to shift the result to an actual graph coordinate.
 *
 * @param {string} selectedNodeId
 * @param {import('graphology').default} graph
 * @returns {{ [nodeId: string]: { x: number, y: number } }}
 */
export function computeSemanticPositions(selectedNodeId, graph) {
  const positions = { [selectedNodeId]: { x: 0, y: 0 } }
  const seen = new Set([selectedNodeId])

  const causes = []
  const effects = []
  const surrounding = []

  graph.forEachEdge(selectedNodeId, (edgeKey, attrs, source, target) => {
    const edgeType = attrs.edgeType || 'CONTEXT'
    const neighbor = source === selectedNodeId ? target : source
    if (seen.has(neighbor)) return
    seen.add(neighbor)

    if (edgeType === 'CAUSED_BY') {
      causes.push(neighbor)
    } else if (edgeType === 'LED_TO') {
      effects.push(neighbor)
    } else {
      surrounding.push(neighbor)
    }
  })

  function placeVertical(list, x) {
    list.forEach((id, i) => {
      positions[id] = {
        x,
        y: (i - (list.length - 1) / 2) * ZONE_Y_SPREAD,
      }
    })
  }

  placeVertical(causes, -ZONE_X_OFFSET)
  placeVertical(effects, ZONE_X_OFFSET)

  surrounding.forEach((id, i) => {
    const angle = (Math.PI / (surrounding.length + 1)) * (i + 1) - Math.PI / 2
    positions[id] = {
      x: Math.cos(angle) * ARC_RADIUS,
      y: Math.sin(angle) * ARC_RADIUS,
    }
  })

  return positions
}

/**
 * Shift all positions in the map by (centerX, centerY).
 * Use this to place the semantic layout at an actual graph coordinate
 * instead of the origin.
 *
 * @param {{ [nodeId: string]: { x: number, y: number } }} positions
 * @param {number} centerX
 * @param {number} centerY
 * @returns {{ [nodeId: string]: { x: number, y: number } }}
 */
export function translatePositions(positions, centerX, centerY) {
  return Object.fromEntries(
    Object.entries(positions).map(([id, pos]) => [
      id,
      { x: pos.x + centerX, y: pos.y + centerY },
    ])
  )
}

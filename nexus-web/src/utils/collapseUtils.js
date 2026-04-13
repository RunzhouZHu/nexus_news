/**
 * Find all nodes downstream from a given node using BFS
 * @param {string} startNodeId - The node to start traversal from
 * @param {Array} edges - All edges in the graph
 * @param {Set} pinnedNodes - Set of nodes that should not be included
 * @returns {Set} Set of downstream node IDs
 */
export function findDownstreamNodes(startNodeId, edges, pinnedNodes = new Set()) {
  const visited = new Set()
  const queue = [startNodeId]
  const queued = new Set([startNodeId])

  while (queue.length > 0) {
    const current = queue.shift()

    // Find all outgoing edges from current node
    const outgoing = edges.filter((edge) => edge.from_node === current)

    for (const edge of outgoing) {
      const target = edge.to_node

      // Skip if already queued
      if (queued.has(target)) {
        continue
      }

      queued.add(target)

      // Add to visited only if not pinned
      if (!pinnedNodes.has(target)) {
        visited.add(target)
      }

      // Always add to queue for traversal (even pinned nodes)
      queue.push(target)
    }
  }

  return visited
}

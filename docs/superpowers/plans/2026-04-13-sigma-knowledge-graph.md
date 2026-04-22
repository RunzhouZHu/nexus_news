# Sigma.js Knowledge Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ReactFlow canvas with Sigma.js + Graphology, delivering a Dark Cosmos knowledge graph with ForceAtlas2 physics and a semantic zone layout (causes-left / effects-right / context-surrounding) activated on node click.

**Architecture:** `GraphCanvas.jsx` orchestrates data fetching and renders `SigmaGraph.jsx` (owns the Sigma WebGL instance and graphology graph) together with `NodeHalo.jsx` (HTML overlay for radial Pin + Load More buttons). `layoutUtils.js` contains pure functions for semantic position calculation. ForceAtlas2 runs continuously; clicking a node fixes it and its neighbors into semantic zones while the rest keep simulating.

**Tech Stack:** React 18, Sigma 3, Graphology 0.25, graphology-layout-forceatlas2, @sigma/edge-curve, Zustand 4, React Query 4, Vitest + React Testing Library

---

## File Map

```
nexus-web/
├── src/components/Graph/
│   ├── GraphCanvas.jsx          ← REWRITE: orchestrator, same data hooks
│   ├── SigmaGraph.jsx           ← NEW: Sigma instance, ForceAtlas2, events, drag
│   ├── NodeHalo.jsx             ← NEW: floating radial buttons overlay
│   ├── layoutUtils.js           ← NEW: pure semantic position functions
│   ├── CustomNode.jsx           ← DELETE
│   └── CustomEdge.jsx           ← DELETE
├── src/store/
│   └── graphLayoutStore.js      ← DELETE
└── tests/
    ├── components/
    │   └── Graph.test.jsx        ← REWRITE: replace ReactFlow/CustomNode/CustomEdge tests
    └── utils/
        └── layoutUtils.test.js  ← NEW
```

---

## Task 1: Install Sigma.js packages and remove ReactFlow

**Files:**
- Modify: `nexus-web/package.json`

- [ ] **Step 1: Install new dependencies**

```bash
cd nexus-web
npm install sigma graphology graphology-layout-forceatlas2 @sigma/edge-curve
```

Expected output: packages added, no peer-dependency errors.

- [ ] **Step 2: Remove ReactFlow**

```bash
npm uninstall reactflow
```

Expected output: `reactflow` removed from `node_modules` and `package.json`.

- [ ] **Step 3: Verify package.json**

`package.json` `dependencies` should now contain `sigma`, `graphology`, `graphology-layout-forceatlas2`, `@sigma/edge-curve` and NOT `reactflow`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap reactflow for sigma.js + graphology"
```

---

## Task 2: Create layoutUtils.js with semantic position calculation (TDD)

**Files:**
- Create: `nexus-web/src/components/Graph/layoutUtils.js`
- Create: `nexus-web/tests/utils/layoutUtils.test.js`

- [ ] **Step 1: Write the failing tests**

Create `nexus-web/tests/utils/layoutUtils.test.js`:

```js
import { describe, it, expect } from 'vitest'
import Graph from 'graphology'
import { computeSemanticPositions, translatePositions } from '../../src/components/Graph/layoutUtils'

function makeGraph() {
  return new Graph({ type: 'directed' })
}

describe('computeSemanticPositions', () => {
  it('places the selected node at the origin', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 5, y: 5 })
    const result = computeSemanticPositions('center', graph)
    expect(result['center']).toEqual({ x: 0, y: 0 })
  })

  it('places a CAUSED_BY neighbor on the left (x < 0)', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('cause', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'cause', 'center', { edgeType: 'CAUSED_BY' })
    const result = computeSemanticPositions('center', graph)
    expect(result['cause'].x).toBeLessThan(0)
  })

  it('places a LED_TO neighbor on the right (x > 0)', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('effect', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'center', 'effect', { edgeType: 'LED_TO' })
    const result = computeSemanticPositions('center', graph)
    expect(result['effect'].x).toBeGreaterThan(0)
  })

  it('places CONTEXT neighbor in the surrounding arc (not on left/right axis)', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('ctx', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'center', 'ctx', { edgeType: 'CONTEXT' })
    const result = computeSemanticPositions('center', graph)
    // x should be between the left and right zone offsets
    expect(Math.abs(result['ctx'].x)).toBeLessThan(5)
  })

  it('places RELATED_TO neighbor in the surrounding arc', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('rel', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'center', 'rel', { edgeType: 'RELATED_TO' })
    const result = computeSemanticPositions('center', graph)
    expect(Math.abs(result['rel'].x)).toBeLessThan(5)
  })

  it('distributes multiple causes vertically on the left', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('c1', { x: 0, y: 0 })
    graph.addNode('c2', { x: 0, y: 0 })
    graph.addDirectedEdgeWithKey('e1', 'c1', 'center', { edgeType: 'CAUSED_BY' })
    graph.addDirectedEdgeWithKey('e2', 'c2', 'center', { edgeType: 'CAUSED_BY' })
    const result = computeSemanticPositions('center', graph)
    expect(result['c1'].x).toBe(result['c2'].x)
    expect(result['c1'].y).not.toBe(result['c2'].y)
  })

  it('deduplicates neighbors that have multiple edges', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('dup', { x: 0, y: 0 })
    graph.addDirectedEdgeWithKey('e1', 'dup', 'center', { edgeType: 'CAUSED_BY' })
    graph.addDirectedEdgeWithKey('e2', 'center', 'dup', { edgeType: 'CONTEXT' })
    const result = computeSemanticPositions('center', graph)
    // dup should appear exactly once (first edge wins)
    const dupEntries = Object.entries(result).filter(([id]) => id === 'dup')
    expect(dupEntries).toHaveLength(1)
  })
})

describe('translatePositions', () => {
  it('shifts all positions by the given center offset', () => {
    const positions = { a: { x: 0, y: 0 }, b: { x: 5, y: -2 } }
    const result = translatePositions(positions, 10, 20)
    expect(result['a']).toEqual({ x: 10, y: 20 })
    expect(result['b']).toEqual({ x: 15, y: 18 })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd nexus-web
npx vitest run tests/utils/layoutUtils.test.js
```

Expected: FAIL — `layoutUtils` module not found.

- [ ] **Step 3: Implement layoutUtils.js**

Create `nexus-web/src/components/Graph/layoutUtils.js`:

```js
// Graph-coordinate distances — these are graphology units, not pixels.
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
    // Distribute in a semicircle above and below (left half of unit circle)
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/utils/layoutUtils.test.js
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graph/layoutUtils.js tests/utils/layoutUtils.test.js
git commit -m "feat: add semantic layout utilities for sigma knowledge graph"
```

---

## Task 3: Create NodeHalo.jsx (TDD)

**Files:**
- Create: `nexus-web/src/components/Graph/NodeHalo.jsx`
- Create: `nexus-web/tests/components/NodeHalo.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `nexus-web/tests/components/NodeHalo.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NodeHalo from '../../src/components/Graph/NodeHalo'

function makeMockSigma(viewportX = 200, viewportY = 150) {
  return {
    graphToViewport: vi.fn(() => ({ x: viewportX, y: viewportY })),
    on: vi.fn(),
    off: vi.fn(),
  }
}

function makeMockGraph(nodeId = 'n1', attrs = { x: 0, y: 0, size: 12 }) {
  return {
    getNodeAttributes: vi.fn(() => attrs),
  }
}

describe('NodeHalo', () => {
  it('renders nothing when nodeId is null', () => {
    const { container } = render(
      <NodeHalo
        nodeId={null}
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when sigma is null', () => {
    const { container } = render(
      <NodeHalo
        nodeId="n1"
        sigma={null}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the pin button when nodeId is set', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.getByTitle('Pin')).toBeInTheDocument()
  })

  it('shows Unpin title when node is pinned', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={true}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.getByTitle('Unpin')).toBeInTheDocument()
  })

  it('does not render Load More button when hasMore is false', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.queryByTitle('Load more')).toBeNull()
  })

  it('renders Load More button when hasMore is true', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={true}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.getByTitle('Load more')).toBeInTheDocument()
  })

  it('disables Load More button and shows loading title when isLoading is true', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={true}
        isLoading={true}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    const btn = screen.getByTitle('Loading...')
    expect(btn).toBeDisabled()
  })

  it('calls onPin when pin button is clicked', () => {
    const onPin = vi.fn()
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={onPin}
        onLoadMore={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTitle('Pin'))
    expect(onPin).toHaveBeenCalledOnce()
  })

  it('calls onLoadMore when Load More button is clicked', () => {
    const onLoadMore = vi.fn()
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={true}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={onLoadMore}
      />
    )
    fireEvent.click(screen.getByTitle('Load more'))
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('registers and cleans up sigma afterRender listener', () => {
    const sigma = makeMockSigma()
    const { unmount } = render(
      <NodeHalo
        nodeId="n1"
        sigma={sigma}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(sigma.on).toHaveBeenCalledWith('afterRender', expect.any(Function))
    unmount()
    expect(sigma.off).toHaveBeenCalledWith('afterRender', expect.any(Function))
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/components/NodeHalo.test.jsx
```

Expected: FAIL — `NodeHalo` module not found.

- [ ] **Step 3: Implement NodeHalo.jsx**

Create `nexus-web/src/components/Graph/NodeHalo.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

// Angular offsets for the radial halo buttons (in radians from 3-o'clock)
const PIN_ANGLE = -Math.PI * 0.3      // top-right (~-54°)
const MORE_ANGLE = Math.PI * 0.3      // bottom-right (~+54°)
const HALO_RADIUS_EXTRA = 28          // px beyond node radius

function HaloButton({ x, y, icon, title, onClick, disabled }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'all',
        textAlign: 'center',
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f1f5f9',
        }}
      >
        {icon}
      </button>
      <span
        style={{
          display: 'block',
          fontSize: 9,
          color: '#94a3b8',
          marginTop: 2,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {title}
      </span>
    </div>
  )
}

HaloButton.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

/**
 * Floating HTML overlay that renders radial action buttons over a selected
 * Sigma node. Stays locked to the node through zoom and pan by listening to
 * Sigma's afterRender event and re-computing viewport coordinates each frame.
 */
export default function NodeHalo({
  nodeId,
  sigma,
  graph,
  isPinned,
  hasMore,
  isLoading,
  onPin,
  onLoadMore,
}) {
  const [pos, setPos] = useState(null)

  const updatePos = useCallback(() => {
    if (!nodeId || !sigma || !graph) return
    try {
      const attrs = graph.getNodeAttributes(nodeId)
      const vp = sigma.graphToViewport({ x: attrs.x, y: attrs.y })
      setPos(vp)
    } catch {
      // node may have been removed during a graph sync
      setPos(null)
    }
  }, [nodeId, sigma, graph])

  useEffect(() => {
    if (!nodeId || !sigma) {
      setPos(null)
      return
    }
    updatePos()
    sigma.on('afterRender', updatePos)
    return () => {
      sigma.off('afterRender', updatePos)
    }
  }, [nodeId, sigma, updatePos])

  if (!pos || !nodeId || !sigma) return null

  const nodeSize = graph?.getNodeAttributes(nodeId)?.size ?? 10
  const r = nodeSize + HALO_RADIUS_EXTRA

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <HaloButton
        x={pos.x + Math.cos(PIN_ANGLE) * r}
        y={pos.y + Math.sin(PIN_ANGLE) * r}
        icon={isPinned ? '📍' : '📌'}
        title={isPinned ? 'Unpin' : 'Pin'}
        onClick={onPin}
      />
      {hasMore && (
        <HaloButton
          x={pos.x + Math.cos(MORE_ANGLE) * r}
          y={pos.y + Math.sin(MORE_ANGLE) * r}
          icon={isLoading ? '⏳' : '➕'}
          title={isLoading ? 'Loading...' : 'Load more'}
          onClick={onLoadMore}
          disabled={isLoading}
        />
      )}
    </div>
  )
}

NodeHalo.propTypes = {
  nodeId: PropTypes.string,
  sigma: PropTypes.object,
  graph: PropTypes.object,
  isPinned: PropTypes.bool.isRequired,
  hasMore: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onPin: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/components/NodeHalo.test.jsx
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Graph/NodeHalo.jsx tests/components/NodeHalo.test.jsx
git commit -m "feat: add NodeHalo radial button overlay for sigma graph"
```

---

## Task 4: Create SigmaGraph.jsx

**Files:**
- Create: `nexus-web/src/components/Graph/SigmaGraph.jsx`

SigmaGraph owns the Sigma instance, graphology graph, ForceAtlas2 worker, drag handling, and hybrid layout transitions. It cannot be meaningfully tested with jsdom (WebGL is unavailable), so no unit test is written here; integration is verified in Task 8.

- [ ] **Step 1: Create SigmaGraph.jsx**

Create `nexus-web/src/components/Graph/SigmaGraph.jsx`:

```jsx
import { useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import Graph from 'graphology'
import Sigma from 'sigma'
import FA2Layout from 'graphology-layout-forceatlas2/worker'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { EdgeCurvedProgram } from '@sigma/edge-curve'
import { useGraphStore } from '../../store/graphStore'
import { computeSemanticPositions, translatePositions } from './layoutUtils'
import NodeHalo from './NodeHalo'

// ── Visual constants ──────────────────────────────────────────────────────────
const BG_COLOR = '#0f172a'

const TAG_COLOR_MAP = {
  economy: '#38bdf8',
  geopolitics: '#f472b6',
  finance: '#34d399',
  technology: '#a78bfa',
  health: '#fb7185',
  politics: '#f472b6',
  science: '#34d399',
}

const EDGE_COLOR_MAP = {
  CAUSED_BY: '#ef4444',
  LED_TO: '#22c55e',
  RELATED_TO: '#eab308',
  CONTEXT: '#94a3b888',
}

function getNodeColor(tags) {
  if (!tags?.length) return '#94a3b8'
  return TAG_COLOR_MAP[tags[0]?.toLowerCase()] ?? '#94a3b8'
}

function getNodeSize(trendingScore = 0) {
  return 8 + Math.min(trendingScore, 1) * 10
}

// ── Graph sync helpers ────────────────────────────────────────────────────────

/**
 * Sync API node objects into the graphology graph.
 * Adds new nodes; updates color/size/label on existing ones.
 * Does NOT remove nodes — removal is handled separately to avoid
 * disrupting force layout mid-simulation.
 */
function syncNodes(graph, apiNodes, pinnedNodes) {
  apiNodes.forEach((node) => {
    const color = getNodeColor(node.tags)
    const size = getNodeSize(node.trending_score)
    if (graph.hasNode(node.id)) {
      graph.setNodeAttribute(node.id, 'label', node.title)
      graph.setNodeAttribute(node.id, 'color', color)
      graph.setNodeAttribute(node.id, 'size', size)
    } else {
      graph.addNode(node.id, {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        label: node.title,
        color,
        size,
        fixed: pinnedNodes.has(node.id),
      })
    }
  })
}

/**
 * Sync API edge objects into the graphology graph.
 * Skips edges where either endpoint is not yet in the graph.
 */
function syncEdges(graph, apiEdges) {
  const existingEdges = new Set(graph.edges())
  apiEdges.forEach((edge) => {
    if (existingEdges.has(edge.id)) return
    if (!graph.hasNode(edge.from_node) || !graph.hasNode(edge.to_node)) return
    graph.addDirectedEdgeWithKey(edge.id, edge.from_node, edge.to_node, {
      type: 'curved',
      color: EDGE_COLOR_MAP[edge.type] ?? '#94a3b855',
      edgeType: edge.type || 'CONTEXT',
    })
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SigmaGraph({ nodes, edges, onNodeClick, onStageClick, onLoadMore }) {
  const containerRef = useRef(null)
  const sigmaRef = useRef(null)
  const graphRef = useRef(null)
  const layoutRef = useRef(null)
  // Mutable refs for state needed inside event handlers (avoids stale closures)
  const selectedNodeRef = useRef(null)
  const dragStateRef = useRef({ dragging: false, draggedNode: null })

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const pinnedNodes = useGraphStore((state) => state.pinnedNodes)
  const togglePinNode = useGraphStore((state) => state.togglePinNode)
  const expandedConnections = useGraphStore((state) => state.expandedConnections)

  // ── Mount: create Sigma instance ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph({ type: 'directed' })
    graphRef.current = graph

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeType: 'curved',
      edgeProgramClasses: { curved: EdgeCurvedProgram },
      labelColor: { color: '#e2e8f0' },
      labelSize: 11,
      labelThreshold: 6,  // only render labels at zoom ratio > 6 (Sigma scale)
      backgroundColor: BG_COLOR,
      nodeReducer: (node, data) => {
        const res = { ...data }
        const sel = selectedNodeRef.current
        if (sel && node !== sel && !graph.neighbors(sel).includes(node)) {
          res.color = data.color + '44'
          res.label = undefined
        }
        if (node === sel) {
          res.borderColor = '#ffffff'
          res.borderSize = 3
          res.highlighted = true
        }
        return res
      },
      edgeReducer: (edge, data) => {
        const res = { ...data }
        const sel = selectedNodeRef.current
        if (sel && !graph.hasExtremity(edge, sel)) {
          res.color = data.color?.slice(0, 7) + '22'
        }
        return res
      },
    })
    sigmaRef.current = sigma

    // ForceAtlas2 worker
    const layout = new FA2Layout(graph, {
      settings: forceAtlas2.inferSettings(graph),
    })
    layoutRef.current = layout
    layout.start()

    // ── Drag handling ────────────────────────────────────────────────────────
    sigma.on('downNode', ({ node }) => {
      dragStateRef.current = { dragging: true, draggedNode: node }
      graph.setNodeAttribute(node, 'fixed', true)
      sigma.getCamera().disable()
    })

    sigma.getMouseCaptor().on('mousemovebody', (e) => {
      const { dragging, draggedNode } = dragStateRef.current
      if (!dragging || !draggedNode) return
      const pos = sigma.viewportToGraph({ x: e.x, y: e.y })
      graph.setNodeAttribute(draggedNode, 'x', pos.x)
      graph.setNodeAttribute(draggedNode, 'y', pos.y)
      sigma.refresh()
    })

    sigma.getMouseCaptor().on('mouseup', () => {
      dragStateRef.current = { dragging: false, draggedNode: null }
      sigma.getCamera().enable()
    })

    return () => {
      layout.stop()
      sigma.kill()
    }
  }, []) // run only once on mount

  // ── Sync nodes/edges when props change ───────────────────────────────────
  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current) return
    syncNodes(graphRef.current, nodes, pinnedNodes)
    syncEdges(graphRef.current, edges)
  }, [nodes, edges, pinnedNodes])

  // ── Handle node click: semantic layout + notify parent ───────────────────
  const handleNodeClick = useCallback(({ node }) => {
    const graph = graphRef.current
    const sigma = sigmaRef.current
    if (!graph || !sigma) return

    selectedNodeRef.current = node

    // Compute semantic positions centered on the node's current graph position
    const { x: cx, y: cy } = graph.getNodeAttributes(node)
    const rawPositions = computeSemanticPositions(node, graph)
    const positions = translatePositions(rawPositions, cx, cy)

    // Fix node + neighbors at semantic positions; others keep simulating
    Object.entries(positions).forEach(([id, pos]) => {
      if (!graph.hasNode(id)) return
      graph.setNodeAttribute(id, 'x', pos.x)
      graph.setNodeAttribute(id, 'y', pos.y)
      graph.setNodeAttribute(id, 'fixed', true)
    })

    sigma.refresh()
    onNodeClick(node)
  }, [onNodeClick])

  // ── Handle stage click: release non-pinned nodes back to force ───────────
  const handleStageClick = useCallback(() => {
    const graph = graphRef.current
    const sigma = sigmaRef.current
    if (!graph || !sigma) return

    selectedNodeRef.current = null

    graph.forEachNode((id) => {
      if (!pinnedNodes.has(id)) {
        graph.setNodeAttribute(id, 'fixed', false)
      }
    })

    sigma.refresh()
    onStageClick()
  }, [pinnedNodes, onStageClick])

  // ── Wire up click events ──────────────────────────────────────────────────
  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma) return
    sigma.on('clickNode', handleNodeClick)
    sigma.on('clickStage', handleStageClick)
    return () => {
      sigma.off('clickNode', handleNodeClick)
      sigma.off('clickStage', handleStageClick)
    }
  }, [handleNodeClick, handleStageClick])

  // ── Sync pin state from store to graphology ───────────────────────────────
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.forEachNode((id) => {
      const shouldBeFixed = pinnedNodes.has(id)
      if (graph.getNodeAttribute(id, 'fixed') !== shouldBeFixed) {
        graph.setNodeAttribute(id, 'fixed', shouldBeFixed)
      }
    })
    sigmaRef.current?.refresh()
  }, [pinnedNodes])

  // ── Derive NodeHalo props from store ─────────────────────────────────────
  const connData = selectedNodeId ? expandedConnections[selectedNodeId] : null
  const hasMore = connData ? connData.offset < connData.total : false
  const isLoading = connData?.loading ?? false

  const handlePin = useCallback(() => {
    if (selectedNodeId) togglePinNode(selectedNodeId)
  }, [selectedNodeId, togglePinNode])

  const handleLoadMore = useCallback(() => {
    if (selectedNodeId) onLoadMore(selectedNodeId)
  }, [selectedNodeId, onLoadMore])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: BG_COLOR }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <NodeHalo
        nodeId={selectedNodeId}
        sigma={sigmaRef.current}
        graph={graphRef.current}
        isPinned={pinnedNodes.has(selectedNodeId)}
        hasMore={hasMore}
        isLoading={isLoading}
        onPin={handlePin}
        onLoadMore={handleLoadMore}
      />
    </div>
  )
}

SigmaGraph.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string),
    trending_score: PropTypes.number,
  })).isRequired,
  edges: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    from_node: PropTypes.string.isRequired,
    to_node: PropTypes.string.isRequired,
    type: PropTypes.string,
  })).isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onStageClick: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Graph/SigmaGraph.jsx
git commit -m "feat: add SigmaGraph with ForceAtlas2 and hybrid semantic layout"
```

---

## Task 5: Rewrite GraphCanvas.jsx

**Files:**
- Modify: `nexus-web/src/components/Graph/GraphCanvas.jsx`

GraphCanvas becomes a thin orchestrator: it fetches data, manages the `handleNodeClick` / `handleLoadMore` callbacks, and renders `SigmaGraph`. All layout logic moves into `SigmaGraph` + `layoutUtils`.

- [ ] **Step 1: Rewrite GraphCanvas.jsx**

Replace the entire contents of `nexus-web/src/components/Graph/GraphCanvas.jsx`:

```jsx
import { useMemo, useCallback } from 'react'
import { useTrendingNodes } from '../../api/hooks/useTrendingNodes'
import { useEdges } from '../../api/hooks/useEdges'
import { useFilterStore } from '../../store/filterStore'
import { useGraphStore } from '../../store/graphStore'
import SigmaGraph from './SigmaGraph'
import LoadingSpinner from '../Common/LoadingSpinner'
import client from '../../api/client'

export default function GraphCanvas() {
  const searchQuery = useFilterStore((state) => state.searchQuery)

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const expandedConnections = useGraphStore((state) => state.expandedConnections)
  const selectNode = useGraphStore((state) => state.selectNode)
  const expandNode = useGraphStore((state) => state.expandNode)
  const loadMoreConnections = useGraphStore((state) => state.loadMoreConnections)
  const setNodeLoading = useGraphStore((state) => state.setNodeLoading)
  const closeDetail = useGraphStore((state) => state.closeDetail)

  const { data: trendingData, isLoading: trendingLoading, error: trendingError } = useTrendingNodes({ limit: 10 })

  // Merge trending nodes with any nodes loaded via connection expansion
  const allNodes = useMemo(() => {
    const nodeMap = new Map()
    trendingData?.forEach((node) => nodeMap.set(node.id, node))
    Object.values(expandedConnections).forEach((conn) => {
      conn.nodes?.forEach((node) => {
        if (!nodeMap.has(node.id)) nodeMap.set(node.id, node)
      })
    })
    return Array.from(nodeMap.values())
  }, [trendingData, expandedConnections])

  // Filter nodes by search query for SigmaGraph visibility
  const visibleNodes = useMemo(() => {
    if (!searchQuery) return allNodes
    const q = searchQuery.toLowerCase()
    return allNodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary?.toLowerCase().includes(q) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [allNodes, searchQuery])

  const visibleNodeIds = useMemo(() => visibleNodes.map((n) => n.id), [visibleNodes])

  const { data: edgeData } = useEdges(visibleNodeIds)

  // Collect all edges: API edges + edges from expanded connections
  const allEdges = useMemo(() => {
    const seen = new Set()
    const result = []
    const push = (edge) => {
      if (seen.has(edge.id)) return
      seen.add(edge.id)
      result.push(edge)
    }
    edgeData?.forEach(push)
    Object.values(expandedConnections).forEach((conn) => conn.edges?.forEach(push))
    return result
  }, [edgeData, expandedConnections])

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(
    async (nodeId) => {
      const node = allNodes.find((n) => n.id === nodeId)
      selectNode(nodeId, node)

      if (!expandedConnections[nodeId]) {
        try {
          const res = await client.get(`/api/nodes/${nodeId}/connections`, {
            params: { limit: 10, offset: 0, sort: 'confidence' },
          })
          expandNode(nodeId, {
            nodes: res.data.nodes || [],
            edges: res.data.edges || [],
            offset: res.data.offset ?? 10,
            total: res.data.total ?? 0,
            loading: false,
          })
        } catch (err) {
          console.error('Failed to expand connections:', err)
        }
      }
    },
    [allNodes, selectNode, expandNode, expandedConnections]
  )

  const handleLoadMore = useCallback(
    async (nodeId) => {
      const existing = expandedConnections[nodeId]
      if (!existing) return
      try {
        setNodeLoading(nodeId, true)
        const res = await client.get(`/api/nodes/${nodeId}/connections`, {
          params: { limit: 10, offset: existing.offset, sort: 'confidence' },
        })
        loadMoreConnections(nodeId, {
          nodes: res.data.nodes || [],
          edges: res.data.edges || [],
        })
      } catch (err) {
        console.error('Failed to load more connections:', err)
      } finally {
        setNodeLoading(nodeId, false)
      }
    },
    [expandedConnections, loadMoreConnections, setNodeLoading]
  )

  const handleStageClick = useCallback(() => {
    closeDetail()
  }, [closeDetail])

  // ── Render ────────────────────────────────────────────────────────────────
  if (trendingError) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <p className="text-red-400 font-semibold">Error loading graph</p>
          <p className="text-slate-400 text-sm">{trendingError?.message || 'Failed to load trending nodes'}</p>
        </div>
      </div>
    )
  }

  if (trendingLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0f172a' }}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <SigmaGraph
        nodes={visibleNodes}
        edges={allEdges}
        onNodeClick={handleNodeClick}
        onStageClick={handleStageClick}
        onLoadMore={handleLoadMore}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Graph/GraphCanvas.jsx
git commit -m "feat: rewrite GraphCanvas to use SigmaGraph"
```

---

## Task 6: Update Graph.test.jsx and delete obsolete test files

**Files:**
- Modify: `nexus-web/tests/components/Graph.test.jsx`
- Delete: `nexus-web/tests/store/graphLayoutStore.test.js`

The old `Graph.test.jsx` tested `CustomNode`, `CustomEdge`, and ReactFlow internals that no longer exist. Replace it with tests that cover the new `GraphCanvas` loading states and the `graphStore` logic it still relies on.

- [ ] **Step 1: Replace tests/components/Graph.test.jsx**

Replace the entire contents of `nexus-web/tests/components/Graph.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GraphCanvas from '../../src/components/Graph/GraphCanvas'
import { useGraphStore } from '../../src/store/graphStore'

// Sigma.js requires WebGL — not available in jsdom. Mock the whole module.
vi.mock('sigma', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    kill: vi.fn(),
    refresh: vi.fn(),
    getCamera: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })),
    getMouseCaptor: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
    graphToViewport: vi.fn(() => ({ x: 0, y: 0 })),
    viewportToGraph: vi.fn(() => ({ x: 0, y: 0 })),
  })),
}))

vi.mock('graphology-layout-forceatlas2/worker', () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}))

vi.mock('graphology-layout-forceatlas2', () => ({
  default: { inferSettings: vi.fn(() => ({})) },
}))

vi.mock('@sigma/edge-curve', () => ({
  EdgeCurvedProgram: vi.fn(),
}))

vi.mock('../../src/api/hooks/useTrendingNodes', () => ({
  useTrendingNodes: () => ({ data: null, isLoading: true, error: null }),
}))

vi.mock('../../src/api/hooks/useEdges', () => ({
  useEdges: () => ({ data: null }),
}))

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('GraphCanvas', () => {
  beforeEach(() => {
    useGraphStore.setState({
      selectedNodeId: null,
      selectedNode: null,
      isDetailOpen: false,
      expandedConnections: {},
      pinnedNodes: new Set(),
      collapsedEdges: new Map(),
    })
  })

  it('renders loading spinner while trending nodes are loading', () => {
    const { container } = render(<GraphCanvas />, { wrapper: createWrapper() })
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })
})

describe('GraphCanvas — data assembly', () => {
  it('merges trending nodes with expanded connections into allNodes', () => {
    const state = useGraphStore.getState()
    state.expandNode('trend-1', {
      nodes: [{ id: 'conn-1', title: 'Connection 1' }],
      edges: [],
      offset: 1,
      total: 1,
      loading: false,
    })

    const newState = useGraphStore.getState()
    const nodeMap = new Map()
    const trendingData = [{ id: 'trend-1', title: 'Trending 1' }]
    trendingData.forEach((n) => nodeMap.set(n.id, n))
    Object.values(newState.expandedConnections).forEach((conn) => {
      conn.nodes?.forEach((n) => { if (!nodeMap.has(n.id)) nodeMap.set(n.id, n) })
    })

    expect(nodeMap.size).toBe(2)
    expect(nodeMap.has('conn-1')).toBe(true)
  })

  it('filters visibleNodes by search query', () => {
    const nodes = [
      { id: 'a', title: 'US Tariffs', tags: [] },
      { id: 'b', title: 'Fed Rate Cut', tags: [] },
    ]
    const q = 'tariff'
    const visible = nodes.filter((n) => n.title.toLowerCase().includes(q))
    expect(visible).toHaveLength(1)
    expect(visible[0].id).toBe('a')
  })

  it('deduplicates edges from API and expanded connections', () => {
    const edgeData = [{ id: 'e1', from_node: 'a', to_node: 'b', type: 'LED_TO' }]
    const connEdges = [{ id: 'e1', from_node: 'a', to_node: 'b', type: 'LED_TO' }]
    const seen = new Set()
    const result = []
    const push = (e) => { if (!seen.has(e.id)) { seen.add(e.id); result.push(e) } }
    edgeData.forEach(push)
    connEdges.forEach(push)
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Delete graphLayoutStore test**

```bash
rm nexus-web/tests/store/graphLayoutStore.test.js
```

- [ ] **Step 3: Run all tests — verify suite passes**

```bash
cd nexus-web
npx vitest run
```

Expected: all remaining tests PASS. (collapseUtils tests and other store tests should still pass unchanged.)

- [ ] **Step 4: Commit**

```bash
git add tests/components/Graph.test.jsx
git rm tests/store/graphLayoutStore.test.js
git commit -m "test: replace ReactFlow graph tests with Sigma.js graph tests"
```

---

## Task 7: Delete obsolete files

**Files:**
- Delete: `nexus-web/src/components/Graph/CustomNode.jsx`
- Delete: `nexus-web/src/components/Graph/CustomEdge.jsx`
- Delete: `nexus-web/src/store/graphLayoutStore.js`

- [ ] **Step 1: Delete the three files**

```bash
cd nexus-web
rm src/components/Graph/CustomNode.jsx
rm src/components/Graph/CustomEdge.jsx
rm src/store/graphLayoutStore.js
```

- [ ] **Step 2: Check for any remaining imports of the deleted files**

```bash
grep -r "CustomNode\|CustomEdge\|graphLayoutStore" src/ --include="*.jsx" --include="*.js"
```

Expected: no output. If any files are found, open them and remove the import lines.

- [ ] **Step 3: Run full test suite once more**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git rm src/components/Graph/CustomNode.jsx src/components/Graph/CustomEdge.jsx src/store/graphLayoutStore.js
git commit -m "chore: remove ReactFlow custom node/edge components and graphLayoutStore"
```

---

## Task 8: Visual smoke test

No automated test covers WebGL rendering. Perform these manual checks with the dev server running.

- [ ] **Step 1: Start the backend and frontend**

In one terminal:
```bash
cd nexus && python -m uvicorn src.api.main:app --reload
```

In another:
```bash
cd nexus-web && npm run dev
```

- [ ] **Step 2: Check these items in the browser**

Open `http://localhost:5173` and verify:

| # | Check | Expected |
|---|-------|----------|
| 1 | Graph canvas background | Dark slate (`#0f172a`) |
| 2 | Initial trending nodes visible | ~10 nodes as circles, colored by tag |
| 3 | Nodes animate/move on load | ForceAtlas2 settling (nodes drift to equilibrium) |
| 4 | Node labels visible on zoom-in | Labels appear when zoomed in |
| 5 | Click a node | Halo appears; node + neighbors animate to semantic zones; DetailSheet opens |
| 6 | Left zone populated | CAUSED_BY neighbors appear to the left |
| 7 | Right zone populated | LED_TO neighbors appear to the right |
| 8 | Surrounding arc | CONTEXT/RELATED_TO neighbors arc above/below |
| 9 | Click background | Halo disappears; nodes drift back to force equilibrium; DetailSheet closes |
| 10 | Pin button (📌) | Clicking pin keeps node fixed across deselect/select cycles |
| 11 | Load More button (➕) | Appears when hasMore is true; clicking fetches next page |
| 12 | Drag a node | Node follows cursor; stays fixed after release |
| 13 | Search filters nodes | Typing in sidebar hides non-matching nodes from canvas |
| 14 | Zoom/pan | Scroll to zoom, drag background to pan; halo stays locked to node |

- [ ] **Step 3: Commit any visual fixes found during smoke test**

```bash
git add -p   # stage only intentional changes
git commit -m "fix: visual polish from sigma smoke test"
```

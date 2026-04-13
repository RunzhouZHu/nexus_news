# Sigma.js Knowledge Graph — Design Spec

**Date:** 2026-04-13
**Scope:** Replace the ReactFlow canvas in `nexus-web` with Sigma.js + Graphology, delivering a Dark Cosmos interactive knowledge graph with a hybrid layout: ForceAtlas2 physics for background nodes, semantic zone layout when a node is selected.

---

## Goal

The current graph canvas uses ReactFlow, a DOM-based renderer. This produces a rigid, card-like layout that does not feel like a knowledge graph. The replacement uses Sigma.js (WebGL canvas renderer) with a hybrid layout system:

- **Background state**: ForceAtlas2 physics — nodes float and cluster organically
- **Selected state**: When a node is clicked, it and its neighbors animate into a semantic zone layout that makes causal relationships immediately legible:
  - **Center**: selected node
  - **Left zone**: nodes connected via `CAUSED_BY` (what caused this)
  - **Right zone**: nodes connected via `LED_TO` (what this led to)
  - **Surrounding arc**: nodes connected via `CONTEXT` or `RELATED_TO`

---

## Packages

**Added to `nexus-web`:**

| Package | Purpose |
|---|---|
| `sigma` | WebGL graph renderer |
| `graphology` | Graph data structure (Sigma's required graph model) |
| `graphology-layout-forceatlas2` | ForceAtlas2 continuous force simulation |
| `@sigma/edge-curve` | Curved edge rendering plugin for Sigma |

**Removed from `nexus-web`:**

| Package | Reason |
|---|---|
| `reactflow` | Fully replaced by Sigma.js |

---

## File Changes

### Deleted
- `nexus-web/src/components/Graph/CustomNode.jsx` — Sigma renders nodes on WebGL canvas; no React node components needed
- `nexus-web/src/components/Graph/CustomEdge.jsx` — same reason
- `nexus-web/src/store/graphLayoutStore.js` — manual position persistence replaced by the hybrid layout system

### Rewritten
- `nexus-web/src/components/Graph/GraphCanvas.jsx` — orchestrates data fetching, builds the graphology graph, renders `SigmaGraph` + `NodeHalo` overlay

### New
- `nexus-web/src/components/Graph/SigmaGraph.jsx` — owns the Sigma instance via `useRef`; sets up ForceAtlas2, handles canvas events, drives the hybrid layout transitions
- `nexus-web/src/components/Graph/NodeHalo.jsx` — floating HTML `<div>` overlay with radial Pin + Load More buttons, positioned via `sigma.graphToViewport()`
- `nexus-web/src/components/Graph/layoutUtils.js` — pure functions: `computeSemanticPositions(selectedNodeId, graph)` returns `{ [nodeId]: {x, y} }` for the selected node and its neighbors based on edge type zones

### Unchanged
- All Zustand stores: `graphStore.js`, `filterStore.js`, `authStore.js`
- All API hooks: `useNodes`, `useEdges`, `useTrendingNodes`, `useConnections`, etc.
- All UI outside the canvas: `DetailSheet`, `Sidebar`, `GraphPage`, `Header`

---

## Visual Design — Dark Cosmos

### Canvas
- Background: `#0f172a` (Tailwind slate-900)
- Sigma renders into a full-height `<div>` replacing the ReactFlow container

### Nodes
- Shape: circle
- Radius: scales with `trending_score` — base 8px, max 18px for trending nodes
- Color by tag category:
  - `economy` → `#38bdf8`
  - `geopolitics` → `#f472b6`
  - `finance` → `#34d399`
  - default → `#94a3b8`
- Trending nodes: a second larger circle rendered behind acts as a glow ring (orange, semi-transparent)
- Selected node: white dashed border ring (`borderColor: #ffffff`, `borderSize: 3`)
- Labels: Sigma built-in renderer, color `#e2e8f0`, visible at camera ratio > 0.5 to avoid clutter at low zoom

### Edges
- Type: `"curved"` via `@sigma/edge-curve`
- Color by relationship type:
  - `CAUSED_BY` → `#ef4444`
  - `LED_TO` → `#22c55e`
  - `RELATED_TO` → `#eab308`
  - `CONTEXT` → `#94a3b8`
- Opacity: 40% by default, 80% when adjacent to hovered/selected node
- No inline edge labels (removed for visual cleanliness in Dark Cosmos)

---

## Hybrid Layout System

### Background state (no selection)
- ForceAtlas2 runs continuously via its Web Worker
- All nodes are `fixed: false` — they simulate freely
- Camera is free to zoom/pan

### On node click — semantic layout transition
1. `computeSemanticPositions(selectedNodeId, graph)` calculates target positions:
   - **Center**: selected node → viewport center coordinates
   - **Left zone** (`CAUSED_BY` neighbors): fan out to the left, distributed vertically (e.g. x = center.x − 250, y spaced evenly)
   - **Right zone** (`LED_TO` neighbors): fan out to the right (e.g. x = center.x + 250, y spaced evenly)
   - **Surrounding arc** (`CONTEXT` + `RELATED_TO` neighbors): placed in a circular arc above and below center (radius ~180px)
2. All other (non-neighbor) nodes remain `fixed: false` and continue simulating with ForceAtlas2
3. Selected node + its neighbors are set to `fixed: true` with their computed semantic positions
4. Sigma animates position changes smoothly (graphology node attributes updated, Sigma re-renders each frame)

### On background click — return to force layout
1. All semantically-fixed nodes (except pinned ones) are set to `fixed: false`
2. ForceAtlas2 resumes control of those nodes — they drift back to a force equilibrium naturally
3. Radial halo hides, `DetailSheet` closes

### Pinned nodes
- A pinned node (📌) stays `fixed: true` permanently across both states
- Pinning persists through selection/deselection cycles
- Toggling pin off sets `fixed: false`, returning it to ForceAtlas2 control

---

## Radial Halo (Node Action Overlay)

When a node is clicked, a floating HTML overlay appears with two action buttons in a radial arrangement:

| Button | Angle | Icon | Action |
|---|---|---|---|
| Pin | ~45° (top-right) | 📌 | Toggles `fixed: true` permanently on the graphology node; syncs to `graphStore.pinnedNodes`. Toggling off also sets `fixed: false`. |
| Load More | ~-45° (bottom-right) | ➕ | Calls `handleLoadMore(nodeId)`; new neighbors are placed into the semantic layout immediately if a node is selected |

**Positioning:** `NodeHalo.jsx` listens to Sigma's `afterRender` event and repositions its `<div>` via `sigma.graphToViewport(nodeId)` on every frame, keeping it locked to the node through zoom and pan.

**Visibility:** Appears on `clickNode`, hides on `clickStage` or when a different node is clicked.

---

## Interaction Model

### Click a node
1. Sigma fires `clickNode` → `handleNodeClick(nodeId)`
2. Fetches connections from `GET /api/nodes/:id/connections` (unchanged)
3. New nodes/edges added to graphology graph
4. `computeSemanticPositions` runs → selected node + neighbors set to `fixed: true` at zone positions
5. Non-neighbor nodes continue simulating freely
6. `DetailSheet` opens; radial halo appears

### Click background (`clickStage`)
- Non-pinned semantic nodes released (`fixed: false`) → ForceAtlas2 resumes
- Halo hides, `DetailSheet` closes

### Hover a node
- Sigma `hoveredNode` highlights node, dims non-adjacent edges (built-in, no extra code)

### Drag a node
- Drag moves node; on drag end node gets `fixed: true`
- 📌 Pin button reflects this state and toggles it

### Load More (➕)
- Fetches next page of connections, adds to graphology graph
- If a node is currently selected, newly added neighbors are placed into the semantic zone layout immediately

### Zoom / Pan
- Sigma built-in; radial halo repositions on every `afterRender` event

---

## What Is Dropped

| Feature | Reason |
|---|---|
| Edge collapse (⊖ button) | Deferred; can be re-added once the graph is fully built |
| MiniMap | Not in Sigma core; deferred |
| Reset Layout button | Not needed; releasing pin/deselecting returns nodes to force equilibrium |
| Manual position persistence (`graphLayoutStore`) | Replaced by the hybrid layout system |

---

## Data Flow

```
GraphCanvas
  ├── useTrendingNodes()         → initial nodes
  ├── useEdges(visibleNodeIds)   → edges between visible nodes
  ├── graphStore                 → selectedNodeId, expandedConnections, pinnedNodes
  └── renders:
       ├── SigmaGraph
       │    ├── graphology.Graph  (nodes + edges with x,y,fixed attributes)
       │    ├── ForceAtlas2 worker (continuous, controls non-fixed nodes)
       │    ├── layoutUtils.computeSemanticPositions()  (on clickNode)
       │    └── Sigma events: clickNode → semantic layout
       │                       clickStage → release to force
       │                       enterNode/leaveNode → highlight
       └── NodeHalo (overlay div, shown when selectedNodeId != null)
            ├── 📌 Pin → graphStore.togglePinNode + graphology node.fixed toggle
            └── ➕ Load More → handleLoadMore → add to graph + update semantic layout
```

---

## Out of Scope

- Edge labels / edge collapse (deferred)
- MiniMap (deferred)
- Node search highlighting within the canvas (sidebar search still filters node visibility)
- Graph export or screenshot

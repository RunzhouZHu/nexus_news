---
title: Progressive Graph Exploration & Smart Node Collapse
date: 2026-04-13
status: Design Review
---

# Progressive Graph Exploration & Smart Node Collapse

## 1. Problem Statement

**Current state:** All nodes and edges are visible at once (~200 nodes, 1000+ edges), resulting in visual tangling that overwhelms users and obscures causal relationships.

**Goal:** Enable users to explore the knowledge graph incrementally—starting with trending news, then expanding to related events one click at a time. This builds a logical narrative tree that helps users understand cause-effect chains without cognitive overload.

---

## 2. Solution Overview

**Progressive Disclosure Model:**

1. **Initial Load:** Show only top 10 trending/important nodes
2. **On Click:** User clicks a news node → related nodes "grow" around it with connecting edges
3. **Load More:** User can load next 10 connections to see less important relationships
4. **Smart Collapse:** User can collapse individual edges to hide branches, with smart preservation of pinned nodes and parent nodes
5. **Edge Styling:** All 4 relationship types (CAUSED_BY, LED_TO, RELATED_TO, CONTEXT) are color-coded

**Result:** Users build their own exploration path, understanding relationships progressively.

---

## 3. Architecture & Data Flow

### 3.1 Initial Load

```
Action: Page mount
Request: GET /api/trending?limit=10
Response: { nodes: [...], edges: [...] }
Display: 10 top trending nodes in grid layout (no edges shown yet)
```

### 3.2 Node Expansion (Click to Explore)

```
Action: User clicks Node A
Request: GET /api/nodes/{A}/connections?limit=10&offset=0&sort=confidence
Response: { 
  nodes: [B, C, D, ...],           // Top 10 connections
  edges: [{from: A, to: B, type: CAUSED_BY, confidence: 0.92}, ...],
  total: 45                        // Total connections available
}

Display:
  - Node A remains in center (or where user clicked)
  - Nodes B-K animate in around Node A (300ms fade-in + scale-up, staggered 30ms each)
  - Edges from A to B-K appear with appropriate colors and labels
  - Show "Load more (showing 10 of 45)" button on Node A
```

### 3.3 Load More Connections

```
Action: User clicks "Load more" on Node A
Request: GET /api/nodes/{A}/connections?limit=10&offset=10&sort=confidence
Response: { nodes: [L, M, N, ...], edges: [...], total: 45 }

Display:
  - Button shows loading state ("Loading...")
  - New nodes L-U animate in below existing connections
  - New edges appear
  - Button updates to "Load more (showing 20 of 45)"
```

### 3.4 Edge Collapse (Hide Branches)

```
Action: User hovers over edge A→B, sees collapse icon, clicks it
Behavior: Hide Node B and all nodes downstream of B (except pinned nodes)

Collapsed state stored:
  collapsedEdges = new Map([
    ['edge-A→B', new Set(['B', 'C', 'D'])],  // B is direct, C/D are downstream
  ])

Display:
  - Edge A→B appears dimmed/faded
  - Nodes B, C, D fade out (200ms animation)
  - Visual indicator shows edge is collapsed

Click again to expand: Reverse the fade-out animation
```

### 3.5 Node Pinning

```
Action: User hovers over Node B, sees pin icon, clicks it
Behavior: Pin Node B so it won't be hidden when parent edges collapse

Pinned state stored:
  pinnedNodes = new Set(['B'])

Display:
  - Node B shows gold border or pin badge
  - When user collapses edge A→B, Node B stays visible (not hidden)
  - But its downstream nodes (C, D) are still hidden based on collapsed edges
```

---

## 4. UI Components

### 4.1 GraphCanvas (Modified)

**Responsibilities:**
- Fetch trending nodes on mount
- Render all visible nodes and edges (filtered by collapsed/pinned states)
- Handle click events on nodes → fetch connections
- Manage animations (fade-in, stagger, collapse)

**Key logic:**
```
visibleNodes = allNodes - hiddenByCollapse + pinnedNodes
visibleEdges = allEdges - collapsedEdges.keys()
```

**Animations:**
- Node spawn: 300ms fade-in + scale-up from center of parent
- Stagger: 30ms delay between each connection
- Collapse: 200ms fade-out
- Load more: Stagger new nodes down the list

### 4.2 CustomNode (Modified)

**Additions:**
- **Pin icon** (visible on hover): Toggle pinned state
- **Load more button**: Conditionally shown if `hasMoreConnections`
  - Text: `"Load more (showing 10 of 45)"`
  - On click: Trigger loading state, fetch next batch
  - Loading state: Spinner inside button

**Styling:**
- Pinned nodes: Gold border or pin badge overlay

### 4.3 CustomEdge (Enhanced)

**Additions:**
- **Color coding by type:**
  - `CAUSED_BY`: Red solid (`#ef4444`)
  - `LED_TO`: Green solid (`#22c55e`)
  - `RELATED_TO`: Yellow solid (`#eab308`)
  - `CONTEXT`: Gray dashed (`#94a3b8`, `strokeDasharray: '5,5'`)
- **Edge label**: Show relationship type (small, centered on edge)
- **Collapse icon**: Appear on hover, allow collapse/expand
- **Tooltip on hover**: `"CAUSED_BY • Confidence: 0.92"`
- **Collapsed state**: Dimmed/faded appearance

### 4.4 Collapse Direction Logic

**Smart collapse algorithm:**

When user collapses edge `A → B`:
1. Find all downstream nodes from B using BFS/DFS through edges
2. Mark them in `collapsedEdges` map with their hidden set
3. Exception: Don't hide pinned nodes
4. Filter React Flow nodes/edges before rendering

**Example:**
```
Graph structure:
  A (user clicked here)
  ├─ B ─┬─ C
  │     └─ D
  └─ E

Collapse A→B:
  - Hide: B, C, D
  - Keep: A, E and A→E edge

Collapse A→E:
  - Hide: E and its downstream
  - Keep: A, B, C, D and their edges

Pin Node B, then collapse A→B:
  - Hide: C, D (but NOT B because it's pinned)
  - Keep: A, B and A→B edge
```

---

## 5. State Management (Zustand)

### 5.1 graphStore additions

```js
import { create } from 'zustand'

export const useGraphStore = create((set) => ({
  // ... existing state ...
  
  // NEW: Track expanded connections for each node
  expandedConnections: {
    // nodeId → { nodes, edges, offset, total }
    'node-123': {
      nodes: [{ id: 'node-456', title: '...', ... }, ...],
      edges: [{ id: 'edge-1', from_node: 'node-123', to_node: 'node-456', ... }, ...],
      offset: 10,    // How many loaded so far
      total: 45,     // Total available
      loading: false,
    },
  },
  
  // NEW: Pinned nodes (won't be hidden on collapse)
  pinnedNodes: new Set(['node-456']),
  
  // NEW: Collapsed edges and their hidden nodes
  collapsedEdges: new Map([
    ['edge-123', new Set(['node-456', 'node-789'])],  // edge ID → hidden nodes
  ]),
  
  // NEW: Actions
  expandNode: (nodeId, connections) => set((state) => ({
    expandedConnections: {
      ...state.expandedConnections,
      [nodeId]: connections,
    },
  })),
  
  togglePinNode: (nodeId) => set((state) => ({
    pinnedNodes: state.pinnedNodes.has(nodeId)
      ? state.pinnedNodes.delete(nodeId) && state.pinnedNodes
      : new Set([...state.pinnedNodes, nodeId]),
  })),
  
  toggleCollapseEdge: (edgeId, hiddenNodeIds) => set((state) => {
    const newCollapsed = new Map(state.collapsedEdges)
    if (newCollapsed.has(edgeId)) {
      newCollapsed.delete(edgeId)
    } else {
      newCollapsed.set(edgeId, hiddenNodeIds)
    }
    return { collapsedEdges: newCollapsed }
  }),
  
  loadMoreConnections: (nodeId, newBatch) => set((state) => ({
    expandedConnections: {
      ...state.expandedConnections,
      [nodeId]: {
        ...state.expandedConnections[nodeId],
        nodes: [...state.expandedConnections[nodeId].nodes, ...newBatch.nodes],
        edges: [...state.expandedConnections[nodeId].edges, ...newBatch.edges],
        offset: state.expandedConnections[nodeId].offset + newBatch.nodes.length,
        loading: false,
      },
    },
  })),
}))
```

---

## 6. API Integration

### 6.1 Endpoints Used

```
GET /api/trending?limit=10
  Response: { nodes: [...], edges: [...] }
  
GET /api/nodes/{nodeId}/connections?limit=10&offset=0&sort=confidence
  Response: { 
    nodes: [...],        // Connected nodes
    edges: [...],        // Edges from nodeId to connections
    total: 45,           // Total connections available
    confidence: [0.7+]   // Only high-confidence connections
  }
  
GET /api/nodes/{nodeId}/connections?limit=10&offset=10&sort=confidence
  Response: { nodes: [...], edges: [...], total: 45 }
  // Same, but next batch
```

### 6.2 Data Structure Assumptions

- Backend returns edges with required fields:
  - `id`: edge UUID
  - `from_node`: source node ID
  - `to_node`: target node ID
  - `type`: CAUSED_BY | LED_TO | RELATED_TO | CONTEXT
  - `confidence`: 0–1 score
  - `reasoning`: brief explanation

---

## 7. Error Handling & UX

**Failed connection fetch:**
- Show error toast: "Failed to load connections. Retry?"
- Disable load more button temporarily
- Retry button available

**Empty connections:**
- Show message on node: "No related events found"
- No expansion, button not shown

**Network timeout:**
- Show offline indicator
- Offer manual retry

**Mobile-specific:**
- Pin/collapse icons: 44px minimum touch target
- Load more button always visible (no hover dependency)
- Tooltips: Long-press to show (instead of hover)

---

## 8. Animations & Timing

| Event | Duration | Effect |
|-------|----------|--------|
| Node spawn | 300ms | Fade-in + scale-up from center |
| Stagger delay | 30ms | Between each connection node |
| Edge collapse | 200ms | Fade-out |
| Edge expand | 200ms | Fade-in |
| Load more spin | Indefinite | Spinner on button during fetch |

---

## 9. Testing Strategy

**Unit tests:**
- `graphStore.expandNode()` — state updates correctly
- `graphStore.togglePinNode()` — toggle logic
- `graphStore.toggleCollapseEdge()` — collapse map updates
- Collapse direction algorithm — BFS to find hidden nodes

**Component tests:**
- GraphCanvas renders trending nodes on mount
- Click node → fetches connections, animates in
- Load more button → fetches and appends nodes
- Pin icon toggle → visual feedback
- Collapse icon toggle → nodes fade out, visual feedback

**Integration tests:**
- Full user flow: Load → Click → Expand → Collapse → Collapse again
- Pin then collapse → pinned node stays visible
- Responsive behavior on mobile

---

## 10. Success Criteria

- ✅ Initial load shows only 10 trending nodes (no clutter)
- ✅ Click expands to show connections with smooth animation
- ✅ Edge colors match specification (red/green/yellow/gray)
- ✅ Collapse hides downstream nodes, preserves pinned nodes
- ✅ Load more reveals additional connections
- ✅ Mobile touch targets are 44px minimum
- ✅ All tests pass
- ✅ Performance: <500ms for initial load, <1s for expansion fetch

---

## 11. Future Enhancements (V2)

- Relationship type filtering (toggle CAUSED_BY/LED_TO/etc.)
- "Focus mode" — show only central node + one layer
- Auto-layout algorithm (currently manual grid)
- Save exploration paths
- Breadcrumb history of clicked nodes

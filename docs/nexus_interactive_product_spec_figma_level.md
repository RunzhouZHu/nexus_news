# Nexus — Interactive Product Spec (Figma-Level)

## 1. Product Vision
Nexus is a living knowledge graph that connects global news through causality, impact, and context. Users explore *why events happen* and *what they lead to* through an interactive, dynamic graph.

---

## 2. Primary User Flow

### Entry Point
- User lands on Home
- Sees a central trending node (e.g., “Spike in Gas Prices”)
- Surrounding nodes show causes and effects

### Core Loop
1. Click node
2. Graph re-centers
3. Related nodes expand
4. Side panel updates with details
5. User continues exploring

---

## 3. Screen Layout (Desktop)

### A. Top Navigation Bar
- Logo (Nexus)
- Search bar ("Search news events...")
- Tabs:
  - Home
  - Trending
  - My Topics
- Right side:
  - Notifications
  - Profile avatar

---

### B. Main Canvas (Graph Area)

#### Layout Logic
- Center: selected node
- Left: causes
- Right: effects
- Surrounding: context + related
- Vertical axis: time (top = older, bottom = newer)

#### Node Design
Each node includes:
- Headline (2-line max)
- Source + timestamp
- Popularity indicator (🔥 + number)

Visual encoding:
- Size → popularity
- Color → category
- Glow → breaking news

#### Edge Types
- Caused by → arrow pointing inward
- Leads to → arrow pointing outward
- Related → dashed line
- Context → curved soft line

---

### C. Right Panel (Details Panel)

#### Sections:
1. Headline (full)
2. Source + time
3. Summary
4. "Why this is connected"
5. Related articles list
6. Confidence score

---

### D. Bottom Panel (Activity Feed)
- Live updating news
- Horizontal scroll
- Click → adds node to graph

---

## 4. Interactions

### Click Node
- Smooth zoom + center
- Fade unrelated nodes
- Expand next-level connections

### Hover Node
- Tooltip:
  - Headline
  - Relationship type
  - Quick summary

### Drag Canvas
- Pan freely

### Scroll
- Zoom in/out

---

## 5. Advanced Interactions

### A. Timeline Scrubber
- Slider at bottom
- Adjusts visible time range
- Animates graph evolution

### B. Filters Panel
- Category filter
- Region filter
- Source credibility
- Time range

### C. Perspective Toggle
Switch between:
- Economic
- Political
- Social

---

## 6. Key Components (Figma Frames)

### Frame 1: Home Graph View
- Full graph visible
- Center node highlighted

### Frame 2: Node Focus State
- Selected node enlarged
- Side panel open

### Frame 3: Expanded Graph
- Additional nodes revealed
- Edge density increases

### Frame 4: Timeline Interaction
- Graph shifts over time

### Frame 5: Mobile View
- Simplified graph
- Swipe-based navigation

---

## 7. Motion & Animation

- Node expansion: spring animation
- Edge drawing: animated stroke
- Graph transitions: smooth interpolation
- Hover: subtle glow

---

## 8. Empty & Loading States

### Loading
- Skeleton nodes
- Animated graph placeholders

### Empty
- "No connections found"
- Suggest related topics

---

## 9. Design System

### Colors
- Background: dark gradient
- Categories:
  - Economy → blue
  - Politics → red
  - Energy → orange
  - Social → green

### Typography
- Headlines: bold
- Metadata: light

### Spacing
- Grid-based
- Consistent node padding

---

## 10. MVP vs V1

### MVP
- Static graph
- Click + expand
- Basic edges

### V1
- AI-generated connections
- Timeline
- Filters
- Real-time updates

---

## 11. Key Differentiator

"Explain the chain" feature:

User clicks a node → system shows:
- Causes
- Effects
- Narrative explanation

---

## 12. Figma File Structure

Pages:
1. Foundations (colors, typography)
2. Components (nodes, edges, panels)
3. Screens
4. Prototypes

Components:
- Node (default, hover, active)
- Edge (4 types)
- Panel
- Card

---

## 13. Prototype Interactions (Figma)

- On click → Navigate to frame + smart animate
- Hover → Overlay tooltip
- Drag → Simulated pan

---

## 14. Next Steps

- Convert to wireframes
- Build component library
- Implement graph engine

---

End of Spec


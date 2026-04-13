# Nexus — Design Spec
**Date:** 2026-04-11  
**Status:** Approved  

---

## 1. Product Overview

**Nexus** is a living knowledge graph that connects the world's news by cause, effect, and ripple. Instead of showing isolated headlines, Nexus reveals *why* things happened and *what followed* — letting anyone trace the chain from OPEC's output cuts to airline cancellations to street protests.

**Target user:** General public / curious readers — people who want to understand the "why" behind events without needing domain expertise.

**Core value proposition:** Click any news event and instantly see what caused it, what it caused, and what else is related — sourced from BBC, NYT, YouTube, X, and more, in one unified graph.

---

## 2. Core User Flow

1. User opens Nexus — sees a live knowledge graph of connected events
2. Graph nodes vary in size by engagement; trending nodes pulse and carry a 🔥 badge
3. User filters by tag (# energy, # inflation, etc.) or searches for an event
4. User clicks a node → full detail sheet slides up over the dimmed graph
5. Detail sheet tabs: **Sources** (articles, videos, posts) · **Reactions** (top comments from X/Reddit/YouTube) · **Timeline** (when each outlet reported it) · **Connections** (linked nodes with edge types)
6. User clicks a connection → graph recenters on that node
7. Optional: sign up to Save nodes or Follow tags for push notifications when new connections are discovered

---

## 3. Connection Types

All edges between nodes are typed and directional:

| Type | Direction | Meaning |
|---|---|---|
| `CAUSED_BY` | A ← B | B is a cause of A |
| `LED_TO` | A → B | A caused or triggered B |
| `RELATED_TO` | A ↔ B | Meaningfully related, non-causal |
| `CONTEXT` | A — B | Background context for A |

Color coding: red = `CAUSED_BY`, green = `LED_TO`, yellow = `RELATED_TO`, dashed gray = `CONTEXT`.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────┐
│              CLIENT LAYER                   │
│   React Web App  │  React Native Mobile     │
│   (graph, node detail, search, filters)     │
└──────────────────┬──────────────────────────┘
                   │ REST / GraphQL API
┌──────────────────▼──────────────────────────┐
│              API LAYER (Node.js)            │
│   Graph queries · User auth · Notifications │
└──────┬─────────────────────┬────────────────┘
       │                     │
┌──────▼──────┐    ┌─────────▼──────────────┐
│  PostgreSQL  │    │    AI Pipeline          │
│  + pgvector  │    │  (ingestion → extract   │
│  (graph DB)  │    │   → connect → review)   │
└─────────────┘    └─────────────────────────┘
                             │
                   ┌─────────▼──────────────┐
                   │   News Sources          │
                   │  NewsAPI · GDELT · RSS  │
                   │  Twitter/X · YouTube    │
                   └─────────────────────────┘
```

**Key technology choices:**
- **Graph storage:** PostgreSQL with nodes + edges schema; pgvector for semantic similarity search. No dedicated graph DB (keeps infra simple at this scale).
- **AI pipeline:** Claude API for event extraction, deduplication, and connection reasoning. Background job queue via BullMQ.
- **Web graph renderer:** React Flow (handles large graphs with zoom/pan natively)
- **Mobile:** React Native, sharing the same API, with touch-optimized graph interaction

---

## 5. Data Model

### nodes
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| title | text | e.g. "Gas Prices Spike 18% — Feb 2025" |
| summary | text | LLM-generated 2–3 sentence neutral summary |
| date | timestamptz | when the event occurred |
| embedding | vector(1536) | for similarity search |
| tags | text[] | e.g. ["oil", "OPEC", "energy", "inflation"] |
| importance | float | computed: source count + connection density + engagement |
| trending_score | float | computed: recency-weighted engagement rate |
| created_by | enum | `ai` / `editor` / `user` |
| status | enum | `published` / `pending_review` / `rejected` |

### edges
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| from_node | uuid | → nodes.id |
| to_node | uuid | → nodes.id |
| type | enum | `CAUSED_BY` / `LED_TO` / `RELATED_TO` / `CONTEXT` |
| confidence | float | 0.0–1.0 (AI confidence score) |
| proposed_by | enum | `ai` / `editor` / `user` |
| status | enum | `published` / `pending_review` |

### sources
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| node_id | uuid | → nodes.id |
| outlet | text | "BBC", "NYT", "YouTube", "X" |
| url | text | |
| published_at | timestamptz | |
| media_type | enum | `article` / `video` / `post` |

### users (optional accounts)
| Field | Type |
|---|---|
| id | uuid |
| email | text |
| avatar_url | text |
| created_at | timestamptz |

### saved_nodes
`user_id, node_id, saved_at`

### followed_topics
`user_id, tag (text), followed_at`

### notifications
`user_id, node_id, trigger_type, sent_at, read_at`

---

## 6. AI Pipeline

The pipeline runs as a BullMQ job queue on Node.js. Each ingested article triggers one job with six stages:

### Stage 1 — Fetch
Pull article text from URL (via NewsAPI / RSS / scraper). Extract: title, body, published_at, outlet, media_type.

### Stage 2 — Extract (LLM call #1)
```
Prompt: Given this article, identify:
  - The core event (1 sentence)
  - Date it occurred
  - Tags: named entities, topics, locations, orgs (array)
  - A 2–3 sentence neutral summary
Output: structured JSON → candidate node
```

### Stage 3 — Deduplicate (vector search + LLM call #2)
- Embed the candidate event summary
- pgvector similarity search → top 5 closest existing nodes
- LLM: "Is this the same event as any of these?"
  - **Yes** → attach as new source to existing node (no new node created)
  - **No** → insert new node with embedding + tags

### Stage 4 — Connect (LLM call #3)
```
Prompt: Given this event and its tags, find up to 5 connections.
  For each: identify the related event, classify as
  CAUSED_BY / LED_TO / RELATED_TO / CONTEXT, confidence 0–1, reasoning.
```
For each proposed connection:
- Vector + tag search to find a matching existing node
- **If found** → propose edge (existing ↔ existing)
- **If not found** → create stub node + propose edge (stub flagged for enrichment on next hit)

The LLM searches in both directions: "what caused this?" and "what did this cause?" — finding or creating nodes for each answer. This allows the graph to grow autonomously.

### Stage 5 — Review Queue
| Confidence | Action |
|---|---|
| ≥ 0.85 | Auto-publish |
| 0.60–0.84 | Queue for human reviewer |
| < 0.60 | Discard silently |

### Stage 6 — Notify
For published nodes: check followed tags → push notification to matching users.

**Ingestion schedule:** NewsAPI / RSS feeds polled every 5 minutes. GDELT available as continuous stream. Initial launch: ~50–100 anchor events seeded manually by editors to bootstrap the graph.

---

## 7. Node Sizing & Trending

Node visual weight is driven by two computed scores:

- **importance** = `(source_count × 0.4) + (connection_count × 0.4) + (reaction_count × 0.2)`
- **trending_score** = engagement rate over the last 24h, decay-weighted

Visual tiers:
| Tier | Size | Style |
|---|---|---|
| Trending | Large (r=42) | Purple fill, pulse rings, 🔥 badge, reaction count |
| High coverage | Medium (r=26) | Colored fill, glow border |
| Low coverage | Small (r=16) | Dark fill, dim border |

A "🔥 Trending only" filter in the tag bar collapses the graph to trending nodes only.

---

## 8. Frontend

### Web App (React, desktop-first)
- **Main view:** Zoomable, pannable knowledge graph (React Flow)
- **Top bar:** Logo · search · Saved · Alerts · user avatar
- **Tag filter bar:** Horizontally scrollable tag chips; active tags highlighted; "🔥 Trending only" toggle
- **Legend:** Connection type colors + node size key
- **Zoom controls:** +/− and fit-to-screen
- **Status bar:** Total events/connections count + "● Live" indicator

### Node detail sheet (web)
- Slides up over dimmed graph on node click; drag handle to dismiss
- **Header:** Trending badge · date · title · summary · tags · Save + Follow buttons · stats
- **Tabs:** Sources · Reactions · Timeline · Connections
- Sources tab: outlet-branded cards (logo, headline, timestamp, direct link)
- Connections tab: clicking a linked node dismisses sheet and recenters graph

### Mobile App (React Native)
Same API and feature set as web. Mobile-specific adaptations:
- **Bottom tab bar:** Graph · Trending · Saved · Profile
- **Pinch-to-zoom** on graph; tap node to expand
- **Horizontal scroll** for tag chips
- **Swipe down** to dismiss detail sheet
- Node detail sheet is structurally identical to desktop

---

## 9. User Accounts (Optional)

Users can browse and explore fully without an account. Signing up unlocks:
- **Save nodes** — bookmark events for later
- **Follow tags** — e.g. `#energy`, `#uselection`
- **Push notifications** — when new nodes with followed tags are published
- Auth: email + password; OAuth (Google, Apple) for mobile

No user-generated content in V1. Users read and save only. Community contribution (submitting events, proposing connections) is a V2 feature once graph has critical mass.

---

## 10. Error Handling & Moderation

- **AI pipeline failures:** Failed jobs retry 3× with exponential backoff; after 3 failures, job is dead-lettered and flagged for manual inspection
- **Low-confidence edges:** Queued for human review, never auto-published below 0.60
- **Duplicate detection:** Conservative threshold — when uncertain, LLM attaches as a new source rather than merging nodes (avoids false merges)
- **Source fetching failures:** Graceful skip — article skipped, URL logged, pipeline continues
- **Misinformation:** Human review queue serves as the moderation layer; editors can reject nodes or edges; no community flagging in V1

---

## 11. Testing Strategy

- **AI pipeline:** Integration tests against real NewsAPI responses (not mocked) to catch prompt regressions
- **Vector search:** Accuracy benchmarks on deduplication — track false-merge rate and false-new-node rate
- **Graph API:** Unit tests for node/edge CRUD; integration tests for graph traversal queries
- **Frontend:** Cypress E2E tests for core flows (graph load, node click, tab navigation, save/follow)
- **Mobile:** Detox E2E for the same core flows on iOS and Android simulators

---

## 12. Out of Scope (V1)

- User-submitted events or connections
- Community upvoting/downvoting of edges
- Export / embeddable graph widgets
- Paid subscription tier
- Multi-language support
- Historical deep-archive (graph covers rolling 12 months at launch)

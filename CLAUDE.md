# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Nexus News is an AI-powered knowledge graph that ingests news articles, extracts events via Claude AI, deduplicates them using pgvector semantic similarity, and visualizes causal relationships as an interactive graph.

The repo has two independently runnable packages:
- `nexus/` — Node.js/Express 5 backend (ES Modules, Node ≥ 20)
- `nexus-web/` — React 18 + Vite frontend

## Commands

### Backend (`nexus/`)
```bash
npm run migrate        # Run DB migrations (required before first start)
npm run dev            # API server with file watching (port 3000)
npm run worker         # BullMQ pipeline worker (concurrency: 3)
npm run ingest         # NewsAPI polling scheduler (every 5 min)
npm test               # Run all tests (single-threaded, 30s timeout)
npm run test:watch     # Tests in watch mode
```

Run a single test file:
```bash
npx vitest run tests/api/auth.test.js
```

### Frontend (`nexus-web/`)
```bash
npm run dev            # Vite dev server at http://localhost:5173
npm run build          # Production build to dist/
npm test               # Vitest component/unit tests
```

### Infrastructure
```bash
cd nexus && docker-compose up -d   # Start PostgreSQL (5432) and Redis (6379)
```

## Architecture

### Backend pipeline flow
```
NewsAPI scheduler (ingestion/scheduler.js)
  → BullMQ queue "articles" (pipeline/queue.js)
    → worker.js (concurrency: 3) runs these stages in order:
      1. fetch.js        — scrape article body text
      2. extract.js      — Claude extracts title/summary/date/tags + OpenAI embedding
      3. deduplicate.js  — pgvector cosine similarity (threshold 0.85, top 5) → Claude confirms match
      4. If new: createNode → createSource → connect.js → review.js → notify.js
      5. If duplicate: createSource on existing node, stop
```

The worker skips articles whose URL already exists in `sources` (URL deduplication before the expensive LLM path).

### LLM clients (`nexus/src/llm/`)
- `client.js` — wraps Anthropic SDK (`claude-sonnet-4-6`) for `extractEvent`, `deduplicateEvent`, `connectEvents`, and OpenAI (`text-embedding-3-small`, 1536-dim) for embeddings.
- `prompts.js` — all prompt builders (`buildExtractPrompt`, `buildDeduplicatePrompt`, `buildConnectPrompt`). Prompts expect JSON-only responses from Claude.

### Database (`nexus/src/db/`)
- `client.js` — exports a `pg.Pool`; all query files import from it.
- `nodes.js`, `edges.js`, `sources.js`, `users.js` — thin query modules per table.
- `migrate.js` — runs `.sql` files in `migrations/` alphabetically. Two migrations: `001_graph.sql` (nodes/edges/sources + pgvector), `002_users.sql` (users/saved_nodes/followed_topics/notifications).

Edge types: `CAUSED_BY`, `LED_TO`, `RELATED_TO`, `CONTEXT`

### API (`nexus/src/api/`)
- Routes mounted on the Express app in `app.js`:
  - `POST/GET /api/auth` — JWT auth (`middleware/auth.js` validates Bearer tokens)
  - `GET /api/graph` — graph data (nodes + edges)
  - `GET /api/search` — full-text search
  - `GET/POST/DELETE /api/user` — saved nodes, followed topics, notifications
- Tests run against a real database (not mocked); the test setup closes the pool in `afterAll`.

### Frontend (`nexus-web/src/`)
- **State**: Three Zustand stores — `authStore` (JWT/user), `filterStore` (tag/type filters), `graphStore` (selected node, expanded connections, pinned nodes, collapsed edges).
- **Graph rendering**: `components/Graph/` uses Sigma.js 3 + Graphology with ForceAtlas2 layout. Node size = trending score; node color = category; edge style = relationship type.
- **Data fetching**: React Query 4 via `api/` Axios client (base URL from `VITE_API_BASE_URL`).
- **Routing**: React Router v7.

## Environment Variables

Backend (`.env` in `nexus/`):
```
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEWSAPI_KEY=
JWT_SECRET=
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

Frontend (`.env` in `nexus-web/`):
```
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Nexus
```

## Key Constraints

- Backend is pure ES Modules (`"type": "module"` in package.json) — use `import`/`export`, no `require()`.
- Tests are single-threaded (`singleThread: true`, `fileParallelism: false`) because they hit a real database.
- Migrations must be run before starting any service; the `sources` table existence is the common failure indicator.
- The pipeline runs 3 services concurrently (API server + worker + ingest scheduler) — they are separate Node processes, not threads.

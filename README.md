# Nexus News

An AI-powered knowledge graph that automatically ingests global news, extracts events, and visualizes causal relationships between them in an interactive graph interface.

---

## What It Does

Nexus continuously pulls news articles from NewsAPI, uses Claude AI to extract discrete events, deduplicates them using semantic similarity, and then connects related events with typed edges (causes, leads to, relates to, provides context for). The result is a living, explorable graph of world events.

**Pipeline at a glance:**

```
NewsAPI (every 5 min)
    → Redis Queue
        → Fetch article text
        → Claude: extract event + embedding
        → pgvector: deduplicate
        → Claude: discover connections
        → Publish to graph
```

---

## Try on this demo
https://nexus-news-five.vercel.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5, ES Modules |
| Database | PostgreSQL 16 + pgvector |
| Queue | Redis 7 + BullMQ |
| LLM | Anthropic Claude (claude-sonnet-4-6) |
| Embeddings | OpenAI (text-embedding-3-small, 1536-dim) |
| News Data | NewsAPI |
| Frontend | React 18, Vite 4, TailwindCSS 3 |
| Graph UI | Sigma.js 3, Graphology, ForceAtlas2 |
| State | Zustand, React Query 4 |
| Auth | JWT + bcrypt |
| Container | Docker, Docker Compose |

---

## Project Structure

```
nexus_news_dev/
├── nexus/                  # Backend API + ingestion pipeline
│   ├── src/
│   │   ├── api/            # Express server and routes
│   │   ├── db/             # Database queries and migrations
│   │   ├── ingestion/      # NewsAPI scheduler
│   │   ├── pipeline/       # BullMQ worker and processing stages
│   │   └── llm/            # Claude/OpenAI client and prompts
│   ├── docker-compose.yml
│   └── package.json
├── nexus-web/              # React frontend
│   ├── src/
│   │   ├── components/     # Graph, NodeDetail, Auth, Common UI
│   │   ├── pages/
│   │   ├── store/          # Zustand state
│   │   └── api/            # Axios client
│   └── package.json
└── docs/                   # Product specification
```

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL 16+** with the [pgvector](https://github.com/pgvector/pgvector) extension
- **Redis 7+**
- **Docker + Docker Compose** (optional, simplifies Postgres/Redis setup)
- API keys for **Anthropic**, **OpenAI**, and **NewsAPI**

---

## Setup — Option A: Docker for Services, Local for Code

This is the recommended approach for development. Docker handles Postgres and Redis; you run the Node processes locally for fast iteration.

### 1. Clone the repository

```bash
git clone <repo-url>
cd nexus_news_dev
```

### 2. Start PostgreSQL and Redis with Docker

```bash
cd nexus
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432` (user: `nexus`, password: `nexus`, db: `nexus`)
- Redis on `localhost:6379`

### 3. Configure backend environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus
REDIS_URL=redis://localhost:6379

ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
NEWSAPI_KEY=your_newsapi_key

JWT_SECRET=change_me_in_production
PORT=3000
NODE_ENV=development
```

> **Where to get API keys:**
> - Anthropic: https://console.anthropic.com
> - OpenAI: https://platform.openai.com/api-keys
> - NewsAPI: https://newsapi.org (free tier works)

### 4. Install backend dependencies and run migrations

```bash
npm install
npm run migrate
```

`npm run migrate` creates all database tables (`nodes`, `edges`, `sources`, `users`, etc.). You must run this before starting any other service.

### 5. Start the backend services

Open three terminal tabs inside `nexus/`:

```bash
# Tab 1 — API server (port 3000)
npm run dev

# Tab 2 — Pipeline worker (processes queued articles)
npm run worker

# Tab 3 — Ingestion scheduler (polls NewsAPI every 5 min)
npm run ingest
```

### 6. Configure and start the frontend

```bash
cd ../nexus-web
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Nexus
```

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Setup — Option B: Fully Local (No Docker)

If you prefer to install Postgres and Redis directly on your machine:

1. Install PostgreSQL 16 and enable the `pgvector` extension:
   ```sql
   CREATE EXTENSION vector;
   ```
2. Install Redis 7.
3. Create a database and user matching the `DATABASE_URL` in your `.env`.
4. Follow steps 3–6 from Option A above.

---

## Setup — Option C: Full Docker Production Build

```bash
cd nexus
docker-compose -f docker-compose.production.yml up -d

# Run migrations inside the container
docker exec nexus-api node src/db/migrate.js
```

Then start the frontend:

```bash
cd nexus-web
npm install && npm run build
# Serve dist/ with nginx or any static host
```

---

## Available Scripts

### Backend (`nexus/`)

| Script | Description |
|---|---|
| `npm run dev` | Development server with file watching |
| `npm start` | Production server |
| `npm run migrate` | Run pending database migrations |
| `npm run ingest` | Start the NewsAPI polling scheduler |
| `npm run worker` | Start the BullMQ pipeline worker |
| `npm test` | Run tests |
| `npm run test:watch` | Tests in watch mode |

### Frontend (`nexus-web/`)

| Script | Description |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run tests |

---

## Database Schema

| Table | Description |
|---|---|
| `nodes` | News events — title, summary, tags, embedding, trending score |
| `edges` | Typed relationships between events with confidence scores |
| `sources` | Original article URLs linked to each event |
| `users` | User accounts (email + hashed password) |
| `saved_nodes` | User bookmarks |
| `followed_topics` | Tags a user is following |
| `notifications` | Alerts when new events match followed topics |

Edge types: `CAUSED_BY`, `LED_TO`, `RELATED_TO`, `CONTEXT`

Migrations live in `nexus/src/db/migrations/` and run in alphabetical order.

---

## Features

**Graph visualization**
- Force-directed layout (ForceAtlas2) — nodes repel, edges attract
- Node color by category (economy, geopolitics, environment, etc.)
- Node size by trending score
- Edge color and style by relationship type
- Drag, pin, and zoom interactions

**AI pipeline**
- Claude extracts structured events from raw article text
- pgvector semantic deduplication prevents duplicate nodes
- Claude identifies and classifies causal relationships
- Pipeline runs 3 concurrent jobs with automatic retry (up to 3 times)

**User features**
- Register / login with JWT auth
- Save events to a personal list
- Follow topics — get notified when relevant events are added
- Full-text search across event titles, summaries, and tags

---

## Troubleshooting

**`relation "sources" does not exist`**
You haven't run migrations yet. Run `npm run migrate` inside the `nexus/` directory.

**`connect ECONNREFUSED` on port 5432 or 6379**
PostgreSQL or Redis isn't running. Start them with `docker-compose up -d` (or your local service manager).

**Scheduler polls but no nodes appear**
The worker isn't running. Start it with `npm run worker` in a separate terminal.

**`ANTHROPIC_API_KEY` errors**
Check that your `.env` file is in the `nexus/` directory and the key is valid.

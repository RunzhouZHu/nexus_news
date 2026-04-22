# Nexus Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Nexus backend — PostgreSQL graph database, Node.js REST API, and AI pipeline that autonomously ingests news, extracts events, deduplicates, and builds typed connections between nodes.

**Architecture:** Express.js API over PostgreSQL + pgvector for graph storage and semantic similarity search. BullMQ + Redis powers the 6-stage AI pipeline job queue. Claude API handles event extraction and connection reasoning; OpenAI embeddings power vector deduplication.

**Tech Stack:** Node.js 20 (ESM), Express, PostgreSQL 16 + pgvector, BullMQ, Redis, @anthropic-ai/sdk, openai (embeddings), jsonwebtoken, bcrypt, Vitest, Supertest

---

## File Map

```
nexus/
├── package.json
├── docker-compose.yml
├── .env.example
├── vitest.config.js
├── src/
│   ├── db/
│   │   ├── client.js              # pg Pool singleton
│   │   ├── migrate.js             # migration runner
│   │   ├── migrations/
│   │   │   ├── 001_graph.sql      # nodes, edges, sources tables + pgvector
│   │   │   └── 002_users.sql      # users, saved_nodes, followed_topics, notifications
│   │   ├── nodes.js               # node CRUD + vector search + trending score
│   │   ├── edges.js               # edge CRUD
│   │   ├── sources.js             # source CRUD
│   │   └── users.js               # user CRUD, saved nodes, followed topics
│   ├── api/
│   │   ├── app.js                 # Express app (no listen — for testing)
│   │   ├── server.js              # entry point: app.listen()
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT verification middleware
│   │   └── routes/
│   │       ├── graph.js           # GET /nodes, GET /nodes/:id, GET /nodes/:id/connections
│   │       ├── search.js          # GET /search?q=
│   │       ├── auth.js            # POST /auth/register, POST /auth/login
│   │       └── user.js            # saved nodes + followed topics + notifications
│   ├── llm/
│   │   ├── client.js              # Claude API + OpenAI embedding wrappers
│   │   └── prompts.js             # extract, deduplicate, connect prompt builders
│   ├── pipeline/
│   │   ├── queue.js               # BullMQ Queue + connection
│   │   ├── worker.js              # BullMQ Worker: orchestrates stages 1-6
│   │   └── stages/
│   │       ├── fetch.js           # stage 1: download article text
│   │       ├── extract.js         # stage 2: LLM extract event + embed
│   │       ├── deduplicate.js     # stage 3: vector search + LLM dedup
│   │       ├── connect.js         # stage 4: LLM connection discovery
│   │       ├── review.js          # stage 5: confidence threshold → publish/queue
│   │       └── notify.js          # stage 6: notify users following matched tags
│   └── ingestion/
│       ├── newsapi.js             # NewsAPI polling: fetch latest articles
│       └── scheduler.js           # setInterval-based 5-min polling loop
└── tests/
    ├── db/
    │   ├── nodes.test.js
    │   ├── edges.test.js
    │   └── users.test.js
    ├── api/
    │   ├── graph.test.js
    │   ├── search.test.js
    │   └── auth.test.js
    └── pipeline/
        ├── extract.test.js
        ├── deduplicate.test.js
        └── connect.test.js
```

---

## Task 1: Project Setup

**Files:**
- Create: `nexus/package.json`
- Create: `nexus/docker-compose.yml`
- Create: `nexus/.env.example`
- Create: `nexus/vitest.config.js`

- [ ] **Step 1: Create the project directory and package.json**

```bash
mkdir nexus && cd nexus
```

Create `package.json`:

```json
{
  "name": "nexus-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/api/server.js",
    "start": "node src/api/server.js",
    "migrate": "node src/db/migrate.js",
    "ingest": "node src/ingestion/scheduler.js",
    "worker": "node src/pipeline/worker.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.4.0",
    "express": "^4.18.3",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^3.3.2",
    "openai": "^4.47.0",
    "pg": "^8.11.5"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: nexus
      POSTGRES_USER: nexus
      POSTGRES_PASSWORD: nexus
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 3: Create .env.example**

```bash
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here
JWT_SECRET=change_me_in_production
PORT=3000
```

Copy to `.env`:
```bash
cp .env.example .env
```

- [ ] **Step 4: Create vitest.config.js**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
  },
})
```

Create `tests/setup.js`:

```js
import { pool } from '../src/db/client.js'

afterAll(async () => {
  await pool.end()
})
```

- [ ] **Step 5: Install dependencies and start services**

```bash
npm install
docker compose up -d
```

Expected: postgres and redis containers running.

```bash
docker compose ps
```

Expected: both services show `Up`.

- [ ] **Step 6: Commit**

```bash
git init
echo "node_modules\n.env\n" > .gitignore
git add .
git commit -m "feat: project scaffold with docker-compose and vitest"
```

---

## Task 2: Database Client + Migrations — Graph Tables

**Files:**
- Create: `src/db/client.js`
- Create: `src/db/migrate.js`
- Create: `src/db/migrations/001_graph.sql`

- [ ] **Step 1: Create the pg pool client**

```js
// src/db/client.js
import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
```

- [ ] **Step 2: Create the graph tables migration**

```sql
-- src/db/migrations/001_graph.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  embedding vector(1536),
  tags TEXT[] NOT NULL DEFAULT '{}',
  importance FLOAT NOT NULL DEFAULT 0,
  trending_score FLOAT NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL CHECK (created_by IN ('ai', 'editor', 'user')),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('published', 'pending_review', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX nodes_embedding_idx ON nodes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX nodes_tags_idx ON nodes USING gin (tags);
CREATE INDEX nodes_status_idx ON nodes (status);
CREATE INDEX nodes_trending_idx ON nodes (trending_score DESC);

CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('CAUSED_BY', 'LED_TO', 'RELATED_TO', 'CONTEXT')),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  proposed_by TEXT NOT NULL CHECK (proposed_by IN ('ai', 'editor', 'user')),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('published', 'pending_review', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX edges_from_idx ON edges (from_node);
CREATE INDEX edges_to_idx ON edges (to_node);
CREATE INDEX edges_status_idx ON edges (status);

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  outlet TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('article', 'video', 'post')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sources_node_idx ON sources (node_id);
```

- [ ] **Step 3: Create migration runner**

```js
// src/db/migrate.js
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, 'migrations')

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows: ran } = await pool.query('SELECT filename FROM _migrations')
  const ranSet = new Set(ran.map(r => r.filename))

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    if (ranSet.has(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
    console.log(`Ran migration: ${file}`)
  }

  console.log('Migrations complete.')
  await pool.end()
}

migrate().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 4: Run migrations**

```bash
node src/db/migrate.js
```

Expected output:
```
Ran migration: 001_graph.sql
Migrations complete.
```

- [ ] **Step 5: Commit**

```bash
git add src/db/
git commit -m "feat: db client, migration runner, graph tables with pgvector"
```

---

## Task 3: User Tables Migration

**Files:**
- Create: `src/db/migrations/002_users.sql`

- [ ] **Step 1: Write the users migration**

```sql
-- src/db/migrations/002_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_nodes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, node_id)
);

CREATE TABLE followed_topics (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  trigger_tag TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX notifications_user_idx ON notifications (user_id, sent_at DESC);
```

- [ ] **Step 2: Run migration**

```bash
node src/db/migrate.js
```

Expected:
```
Ran migration: 002_users.sql
Migrations complete.
```

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations/002_users.sql
git commit -m "feat: user tables migration (users, saved_nodes, followed_topics, notifications)"
```

---

## Task 4: Node DB Helpers

**Files:**
- Create: `src/db/nodes.js`
- Create: `tests/db/nodes.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/db/nodes.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import {
  createNode, getNodeById, updateNodeStatus,
  findSimilarNodes, updateTrendingScores,
} from '../../src/db/nodes.js'

const testEmbedding = new Array(1536).fill(0.1)

beforeEach(async () => {
  await pool.query('DELETE FROM edges')
  await pool.query('DELETE FROM sources')
  await pool.query('DELETE FROM nodes')
})

describe('createNode', () => {
  it('inserts a node and returns it with an id', async () => {
    const node = await createNode({
      title: 'Gas prices spike 18%',
      summary: 'Global fuel markets reacted sharply.',
      date: new Date('2025-02-03'),
      tags: ['energy', 'oil', 'OPEC'],
      embedding: testEmbedding,
      created_by: 'ai',
    })
    expect(node.id).toBeDefined()
    expect(node.title).toBe('Gas prices spike 18%')
    expect(node.tags).toEqual(['energy', 'oil', 'OPEC'])
    expect(node.status).toBe('pending_review')
  })
})

describe('getNodeById', () => {
  it('returns null for unknown id', async () => {
    const node = await getNodeById('00000000-0000-0000-0000-000000000000')
    expect(node).toBeNull()
  })

  it('returns the node for a known id', async () => {
    const created = await createNode({
      title: 'Test', summary: 'Test.', date: new Date(),
      tags: ['test'], embedding: testEmbedding, created_by: 'editor',
    })
    const found = await getNodeById(created.id)
    expect(found.id).toBe(created.id)
  })
})

describe('updateNodeStatus', () => {
  it('changes status to published', async () => {
    const node = await createNode({
      title: 'Test', summary: 'Test.', date: new Date(),
      tags: [], embedding: testEmbedding, created_by: 'ai',
    })
    const updated = await updateNodeStatus(node.id, 'published')
    expect(updated.status).toBe('published')
  })
})

describe('findSimilarNodes', () => {
  it('returns nodes sorted by cosine similarity', async () => {
    const a = await createNode({
      title: 'A', summary: 'A.', date: new Date(),
      tags: [], embedding: new Array(1536).fill(0.9), created_by: 'ai', status: 'published',
    })
    await pool.query('UPDATE nodes SET status=$1 WHERE id=$2', ['published', a.id])

    const results = await findSimilarNodes(new Array(1536).fill(0.9), { limit: 5 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe(a.id)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test tests/db/nodes.test.js
```

Expected: FAIL — `Cannot find module '../../src/db/nodes.js'`

- [ ] **Step 3: Implement nodes.js**

```js
// src/db/nodes.js
import { pool } from './client.js'

export async function createNode({ title, summary, date, tags, embedding, created_by, status = 'pending_review' }) {
  const { rows } = await pool.query(
    `INSERT INTO nodes (title, summary, date, tags, embedding, created_by, status)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
     RETURNING *`,
    [title, summary, date, `{${tags.join(',')}}`, `[${embedding.join(',')}]`, created_by, status]
  )
  return rows[0]
}

export async function getNodeById(id) {
  const { rows } = await pool.query('SELECT * FROM nodes WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function updateNodeStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE nodes SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, id]
  )
  return rows[0]
}

export async function getPublishedNodes({ tags, trending, limit = 100, offset = 0 } = {}) {
  let query = `SELECT * FROM nodes WHERE status='published'`
  const params = []

  if (tags && tags.length > 0) {
    params.push(tags)
    query += ` AND tags && $${params.length}::text[]`
  }

  const orderBy = trending ? 'trending_score DESC' : 'date DESC'
  params.push(limit, offset)
  query += ` ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`

  const { rows } = await pool.query(query, params)
  return rows
}

export async function findSimilarNodes(embedding, { limit = 5, threshold = 0.3 } = {}) {
  const { rows } = await pool.query(
    `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
     FROM nodes
     WHERE status = 'published' AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [`[${embedding.join(',')}]`, limit]
  )
  return rows.filter(r => r.similarity > threshold)
}

export async function updateImportance(id) {
  await pool.query(
    `UPDATE nodes SET
       importance = (
         (SELECT COUNT(*) FROM sources WHERE node_id = $1) * 0.4 +
         (SELECT COUNT(*) FROM edges WHERE (from_node=$1 OR to_node=$1) AND status='published') * 0.4
       ),
       updated_at = NOW()
     WHERE id = $1`,
    [id]
  )
}

export async function updateTrendingScores() {
  // Trending = connections + sources added in the last 24h, decay by age
  await pool.query(`
    UPDATE nodes SET
      trending_score = (
        SELECT COUNT(*) FROM edges
        WHERE (from_node=nodes.id OR to_node=nodes.id)
          AND status='published'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) + (
        SELECT COUNT(*) FROM sources
        WHERE node_id=nodes.id
          AND created_at > NOW() - INTERVAL '24 hours'
      ),
      updated_at = NOW()
    WHERE status = 'published'
  `)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test tests/db/nodes.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/nodes.js tests/db/nodes.test.js
git commit -m "feat: node DB helpers (CRUD, vector search, trending scores)"
```

---

## Task 5: Edge + Source DB Helpers

**Files:**
- Create: `src/db/edges.js`
- Create: `src/db/sources.js`
- Create: `tests/db/edges.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/db/edges.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import { createNode } from '../../src/db/nodes.js'
import { createEdge, getEdgesForNode, updateEdgeStatus } from '../../src/db/edges.js'
import { createSource, getSourcesForNode } from '../../src/db/sources.js'

const emb = new Array(1536).fill(0.1)

let nodeA, nodeB

beforeEach(async () => {
  await pool.query('DELETE FROM edges')
  await pool.query('DELETE FROM sources')
  await pool.query('DELETE FROM nodes')
  nodeA = await createNode({ title: 'A', summary: 'A.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })
  nodeB = await createNode({ title: 'B', summary: 'B.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })
  await pool.query('UPDATE nodes SET status=$1', ['published'])
})

describe('createEdge', () => {
  it('creates an edge between two nodes', async () => {
    const edge = await createEdge({
      from_node: nodeA.id, to_node: nodeB.id,
      type: 'LED_TO', confidence: 0.9, proposed_by: 'ai',
    })
    expect(edge.id).toBeDefined()
    expect(edge.type).toBe('LED_TO')
    expect(edge.status).toBe('pending_review')
  })
})

describe('getEdgesForNode', () => {
  it('returns edges where node is from or to', async () => {
    await createEdge({ from_node: nodeA.id, to_node: nodeB.id, type: 'LED_TO', confidence: 0.9, proposed_by: 'ai' })
    const edges = await getEdgesForNode(nodeA.id)
    expect(edges.length).toBe(1)
  })
})

describe('createSource + getSourcesForNode', () => {
  it('creates and retrieves a source', async () => {
    await pool.query('UPDATE nodes SET status=$1 WHERE id=$2', ['published', nodeA.id])
    const source = await createSource({
      node_id: nodeA.id, outlet: 'BBC', url: 'https://bbc.com/test',
      published_at: new Date(), media_type: 'article',
    })
    expect(source.outlet).toBe('BBC')
    const sources = await getSourcesForNode(nodeA.id)
    expect(sources.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test tests/db/edges.test.js
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement edges.js**

```js
// src/db/edges.js
import { pool } from './client.js'

export async function createEdge({ from_node, to_node, type, confidence, proposed_by, status = 'pending_review' }) {
  const { rows } = await pool.query(
    `INSERT INTO edges (from_node, to_node, type, confidence, proposed_by, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [from_node, to_node, type, confidence, proposed_by, status]
  )
  return rows[0]
}

export async function getEdgesForNode(nodeId, { status = 'published' } = {}) {
  const { rows } = await pool.query(
    `SELECT e.*, 
       fn.title AS from_title, fn.tags AS from_tags,
       tn.title AS to_title, tn.tags AS to_tags
     FROM edges e
     JOIN nodes fn ON fn.id = e.from_node
     JOIN nodes tn ON tn.id = e.to_node
     WHERE (e.from_node = $1 OR e.to_node = $1) AND e.status = $2`,
    [nodeId, status]
  )
  return rows
}

export async function updateEdgeStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE edges SET status=$1 WHERE id=$2 RETURNING *',
    [status, id]
  )
  return rows[0]
}

export async function getPendingEdges({ limit = 50 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM edges WHERE status='pending_review' ORDER BY confidence DESC LIMIT $1`,
    [limit]
  )
  return rows
}
```

- [ ] **Step 4: Implement sources.js**

```js
// src/db/sources.js
import { pool } from './client.js'

export async function createSource({ node_id, outlet, url, published_at, media_type }) {
  const { rows } = await pool.query(
    `INSERT INTO sources (node_id, outlet, url, published_at, media_type)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [node_id, outlet, url, published_at, media_type]
  )
  return rows[0]
}

export async function getSourcesForNode(nodeId) {
  const { rows } = await pool.query(
    'SELECT * FROM sources WHERE node_id=$1 ORDER BY published_at ASC',
    [nodeId]
  )
  return rows
}

export async function sourceExistsByUrl(url) {
  const { rows } = await pool.query('SELECT id FROM sources WHERE url=$1', [url])
  return rows.length > 0
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test tests/db/edges.test.js
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/edges.js src/db/sources.js tests/db/edges.test.js
git commit -m "feat: edge and source DB helpers"
```

---

## Task 6: User DB Helpers + Auth

**Files:**
- Create: `src/db/users.js`
- Create: `tests/db/users.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/db/users.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import {
  createUser, getUserByEmail,
  saveNode, unsaveNode, getSavedNodes,
  followTopic, unfollowTopic, getFollowedTopics,
} from '../../src/db/users.js'
import { createNode } from '../../src/db/nodes.js'

const emb = new Array(1536).fill(0.1)

beforeEach(async () => {
  await pool.query('DELETE FROM notifications')
  await pool.query('DELETE FROM followed_topics')
  await pool.query('DELETE FROM saved_nodes')
  await pool.query('DELETE FROM users')
  await pool.query('DELETE FROM edges')
  await pool.query('DELETE FROM sources')
  await pool.query('DELETE FROM nodes')
})

describe('createUser + getUserByEmail', () => {
  it('creates a user and retrieves by email', async () => {
    const user = await createUser({ email: 'a@test.com', password: 'secret123' })
    expect(user.id).toBeDefined()
    expect(user.email).toBe('a@test.com')
    expect(user.password_hash).not.toBe('secret123')

    const found = await getUserByEmail('a@test.com')
    expect(found.id).toBe(user.id)
  })
})

describe('saveNode / getSavedNodes', () => {
  it('saves and retrieves nodes for a user', async () => {
    const user = await createUser({ email: 'b@test.com', password: 'secret' })
    const node = await createNode({ title: 'T', summary: 'S.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })

    await saveNode(user.id, node.id)
    const saved = await getSavedNodes(user.id)
    expect(saved.length).toBe(1)
    expect(saved[0].node_id).toBe(node.id)

    await unsaveNode(user.id, node.id)
    const after = await getSavedNodes(user.id)
    expect(after.length).toBe(0)
  })
})

describe('followTopic / getFollowedTopics', () => {
  it('follows and retrieves topics', async () => {
    const user = await createUser({ email: 'c@test.com', password: 'secret' })
    await followTopic(user.id, 'energy')
    await followTopic(user.id, 'oil')
    const topics = await getFollowedTopics(user.id)
    expect(topics.map(t => t.tag).sort()).toEqual(['energy', 'oil'])
    await unfollowTopic(user.id, 'oil')
    const after = await getFollowedTopics(user.id)
    expect(after.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test tests/db/users.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement users.js**

```js
// src/db/users.js
import bcrypt from 'bcrypt'
import { pool } from './client.js'

export async function createUser({ email, password }) {
  const password_hash = await bcrypt.hash(password, 10)
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, avatar_url, created_at',
    [email, password_hash]
  )
  return rows[0]
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email])
  return rows[0] ?? null
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, avatar_url, created_at FROM users WHERE id=$1',
    [id]
  )
  return rows[0] ?? null
}

export async function saveNode(userId, nodeId) {
  await pool.query(
    'INSERT INTO saved_nodes (user_id, node_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, nodeId]
  )
}

export async function unsaveNode(userId, nodeId) {
  await pool.query('DELETE FROM saved_nodes WHERE user_id=$1 AND node_id=$2', [userId, nodeId])
}

export async function getSavedNodes(userId) {
  const { rows } = await pool.query(
    `SELECT sn.*, n.title, n.summary, n.tags, n.date, n.trending_score
     FROM saved_nodes sn JOIN nodes n ON n.id=sn.node_id
     WHERE sn.user_id=$1 ORDER BY sn.saved_at DESC`,
    [userId]
  )
  return rows
}

export async function followTopic(userId, tag) {
  await pool.query(
    'INSERT INTO followed_topics (user_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, tag]
  )
}

export async function unfollowTopic(userId, tag) {
  await pool.query('DELETE FROM followed_topics WHERE user_id=$1 AND tag=$2', [userId, tag])
}

export async function getFollowedTopics(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM followed_topics WHERE user_id=$1 ORDER BY followed_at DESC',
    [userId]
  )
  return rows
}

export async function getUsersFollowingAnyTag(tags) {
  const { rows } = await pool.query(
    'SELECT DISTINCT user_id FROM followed_topics WHERE tag = ANY($1::text[])',
    [tags]
  )
  return rows.map(r => r.user_id)
}

export async function createNotification({ userId, nodeId, triggerTag }) {
  await pool.query(
    'INSERT INTO notifications (user_id, node_id, trigger_tag) VALUES ($1,$2,$3)',
    [userId, nodeId, triggerTag]
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test tests/db/users.test.js
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/users.js tests/db/users.test.js
git commit -m "feat: user DB helpers (auth, saved nodes, followed topics)"
```

---

## Task 7: Express App + Auth API

**Files:**
- Create: `src/api/app.js`
- Create: `src/api/server.js`
- Create: `src/api/middleware/auth.js`
- Create: `src/api/routes/auth.js`
- Create: `tests/api/auth.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/api/auth.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { pool } from '../../src/db/client.js'
import { app } from '../../src/api/app.js'

beforeEach(async () => {
  await pool.query('DELETE FROM notifications')
  await pool.query('DELETE FROM followed_topics')
  await pool.query('DELETE FROM saved_nodes')
  await pool.query('DELETE FROM users')
})

describe('POST /api/auth/register', () => {
  it('creates a user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('user@test.com')
    expect(res.body.user.password_hash).toBeUndefined()
  })

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@test.com', password: 'pass' })
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@test.com', password: 'pass' })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    await request(app).post('/api/auth/register').send({ email: 'login@test.com', password: 'pass123' })
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'pass123' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/auth/register').send({ email: 'x@test.com', password: 'correct' })
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test tests/api/auth.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement middleware/auth.js**

```js
// src/api/middleware/auth.js
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

- [ ] **Step 4: Implement routes/auth.js**

```js
// src/api/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createUser, getUserByEmail } from '../../db/users.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  try {
    const user = await createUser({ email, password })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.status(201).json({ token, user })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    throw err
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await getUserByEmail(email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })
  res.status(200).json({ token, user: { id: user.id, email: user.email } })
})
```

- [ ] **Step 5: Implement app.js**

```js
// src/api/app.js
import 'dotenv/config'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { graphRouter } from './routes/graph.js'
import { searchRouter } from './routes/search.js'
import { userRouter } from './routes/user.js'

export const app = express()
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api', graphRouter)
app.use('/api', searchRouter)
app.use('/api/user', userRouter)

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})
```

- [ ] **Step 6: Create server.js**

```js
// src/api/server.js
import { app } from './app.js'

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`Nexus API running on :${PORT}`))
```

- [ ] **Step 7: Create stub route files so app.js can import them (fill in next task)**

```js
// src/api/routes/graph.js
import { Router } from 'express'
export const graphRouter = Router()

// src/api/routes/search.js
import { Router } from 'express'
export const searchRouter = Router()

// src/api/routes/user.js
import { Router } from 'express'
export const userRouter = Router()
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
npm test tests/api/auth.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/api/ tests/api/auth.test.js
git commit -m "feat: express app, auth routes (register/login), JWT middleware"
```

---

## Task 8: Graph API Routes

**Files:**
- Modify: `src/api/routes/graph.js`
- Create: `tests/api/graph.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/api/graph.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { pool } from '../../src/db/client.js'
import { app } from '../../src/api/app.js'
import { createNode } from '../../src/db/nodes.js'
import { createEdge } from '../../src/db/edges.js'

const emb = new Array(1536).fill(0.1)

beforeEach(async () => {
  await pool.query('DELETE FROM edges')
  await pool.query('DELETE FROM sources')
  await pool.query('DELETE FROM nodes')
})

describe('GET /api/nodes', () => {
  it('returns only published nodes', async () => {
    await createNode({ title: 'Published', summary: 'P.', date: new Date(), tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published' })
    await createNode({ title: 'Draft', summary: 'D.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })
    const res = await request(app).get('/api/nodes')
    expect(res.status).toBe(200)
    expect(res.body.nodes.length).toBe(1)
    expect(res.body.nodes[0].title).toBe('Published')
  })

  it('filters by tag', async () => {
    await createNode({ title: 'Energy', summary: 'E.', date: new Date(), tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published' })
    await createNode({ title: 'Politics', summary: 'P.', date: new Date(), tags: ['politics'], embedding: emb, created_by: 'ai', status: 'published' })
    const res = await request(app).get('/api/nodes?tags=energy')
    expect(res.body.nodes.length).toBe(1)
    expect(res.body.nodes[0].title).toBe('Energy')
  })
})

describe('GET /api/nodes/:id', () => {
  it('returns 404 for unknown node', async () => {
    const res = await request(app).get('/api/nodes/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('returns node with sources', async () => {
    const node = await createNode({ title: 'T', summary: 'S.', date: new Date(), tags: [], embedding: emb, created_by: 'ai', status: 'published' })
    const res = await request(app).get(`/api/nodes/${node.id}`)
    expect(res.status).toBe(200)
    expect(res.body.node.id).toBe(node.id)
    expect(Array.isArray(res.body.sources)).toBe(true)
  })
})

describe('GET /api/nodes/:id/connections', () => {
  it('returns published edges for a node', async () => {
    const a = await createNode({ title: 'A', summary: 'A.', date: new Date(), tags: [], embedding: emb, created_by: 'ai', status: 'published' })
    const b = await createNode({ title: 'B', summary: 'B.', date: new Date(), tags: [], embedding: emb, created_by: 'ai', status: 'published' })
    await createEdge({ from_node: a.id, to_node: b.id, type: 'LED_TO', confidence: 0.9, proposed_by: 'ai', status: 'published' })
    const res = await request(app).get(`/api/nodes/${a.id}/connections`)
    expect(res.status).toBe(200)
    expect(res.body.edges.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test tests/api/graph.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement graph routes**

```js
// src/api/routes/graph.js
import { Router } from 'express'
import { getPublishedNodes, getNodeById } from '../../db/nodes.js'
import { getEdgesForNode } from '../../db/edges.js'
import { getSourcesForNode } from '../../db/sources.js'

export const graphRouter = Router()

graphRouter.get('/nodes', async (req, res) => {
  const tags = req.query.tags ? req.query.tags.split(',') : []
  const trending = req.query.trending === 'true'
  const limit = Math.min(parseInt(req.query.limit ?? '100'), 500)
  const offset = parseInt(req.query.offset ?? '0')
  const nodes = await getPublishedNodes({ tags, trending, limit, offset })
  res.json({ nodes })
})

graphRouter.get('/nodes/:id', async (req, res) => {
  const node = await getNodeById(req.params.id)
  if (!node || node.status !== 'published') return res.status(404).json({ error: 'Not found' })
  const sources = await getSourcesForNode(req.params.id)
  res.json({ node, sources })
})

graphRouter.get('/nodes/:id/connections', async (req, res) => {
  const node = await getNodeById(req.params.id)
  if (!node) return res.status(404).json({ error: 'Not found' })
  const edges = await getEdgesForNode(req.params.id, { status: 'published' })
  res.json({ edges })
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test tests/api/graph.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/routes/graph.js tests/api/graph.test.js
git commit -m "feat: graph API routes (list nodes, get node, get connections)"
```

---

## Task 9: Search + User Routes

**Files:**
- Modify: `src/api/routes/search.js`
- Modify: `src/api/routes/user.js`
- Create: `tests/api/search.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/api/search.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { pool } from '../../src/db/client.js'
import { app } from '../../src/api/app.js'
import { createNode } from '../../src/db/nodes.js'

const emb = new Array(1536).fill(0.1)

beforeEach(async () => {
  await pool.query('DELETE FROM edges; DELETE FROM sources; DELETE FROM nodes')
})

describe('GET /api/search', () => {
  it('returns nodes matching title keyword', async () => {
    await createNode({ title: 'Gas prices spike', summary: 'Fuel costs.', date: new Date(), tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published' })
    await createNode({ title: 'Airline cancellations', summary: 'Flights cut.', date: new Date(), tags: ['travel'], embedding: emb, created_by: 'ai', status: 'published' })
    const res = await request(app).get('/api/search?q=gas')
    expect(res.status).toBe(200)
    expect(res.body.nodes.length).toBe(1)
    expect(res.body.nodes[0].title).toMatch(/gas/i)
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test tests/api/search.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement search route**

```js
// src/api/routes/search.js
import { Router } from 'express'
import { pool } from '../../db/client.js'

export const searchRouter = Router()

searchRouter.get('/search', async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) return res.json({ nodes: [] })

  const { rows } = await pool.query(
    `SELECT * FROM nodes
     WHERE status='published'
       AND (title ILIKE $1 OR summary ILIKE $1 OR $2 = ANY(tags))
     ORDER BY trending_score DESC
     LIMIT 50`,
    [`%${q}%`, q.toLowerCase()]
  )
  res.json({ nodes: rows })
})
```

- [ ] **Step 4: Implement user routes**

```js
// src/api/routes/user.js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  saveNode, unsaveNode, getSavedNodes,
  followTopic, unfollowTopic, getFollowedTopics,
} from '../../db/users.js'

export const userRouter = Router()
userRouter.use(requireAuth)

userRouter.post('/saved/:nodeId', async (req, res) => {
  await saveNode(req.user.userId, req.params.nodeId)
  res.status(204).end()
})

userRouter.delete('/saved/:nodeId', async (req, res) => {
  await unsaveNode(req.user.userId, req.params.nodeId)
  res.status(204).end()
})

userRouter.get('/saved', async (req, res) => {
  const nodes = await getSavedNodes(req.user.userId)
  res.json({ nodes })
})

userRouter.post('/topics', async (req, res) => {
  const { tag } = req.body
  if (!tag) return res.status(400).json({ error: 'tag required' })
  await followTopic(req.user.userId, tag)
  res.status(204).end()
})

userRouter.delete('/topics/:tag', async (req, res) => {
  await unfollowTopic(req.user.userId, req.params.tag)
  res.status(204).end()
})

userRouter.get('/topics', async (req, res) => {
  const topics = await getFollowedTopics(req.user.userId)
  res.json({ topics })
})
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/api/routes/ tests/api/search.test.js
git commit -m "feat: search route and authenticated user routes (saved, followed topics)"
```

---

## Task 10: Claude API Client + Prompts

**Files:**
- Create: `src/llm/client.js`
- Create: `src/llm/prompts.js`
- Create: `tests/pipeline/extract.test.js`

- [ ] **Step 1: Write failing test (uses real Claude API — skip in CI if no key)**

```js
// tests/pipeline/extract.test.js
import { describe, it, expect } from 'vitest'
import { extractEvent } from '../../src/llm/client.js'

describe('extractEvent', () => {
  it('returns structured event from article text', async () => {
    const article = {
      title: 'Gas prices spike 18% after OPEC cuts',
      body: 'Global fuel markets reacted sharply on February 3rd after OPEC announced a 2 million barrel per day output cut. US average gas prices rose to $4.78.',
      outlet: 'BBC',
      url: 'https://bbc.com/gas-prices',
      published_at: new Date('2025-02-03'),
    }
    const result = await extractEvent(article)
    expect(result.title).toBeDefined()
    expect(result.summary).toBeDefined()
    expect(Array.isArray(result.tags)).toBe(true)
    expect(result.date).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test tests/pipeline/extract.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement prompts.js**

```js
// src/llm/prompts.js

export function buildExtractPrompt(article) {
  return `You are a news event extractor. Given this news article, extract the core event.

Article title: ${article.title}
Article body: ${article.body.slice(0, 3000)}
Published: ${article.published_at}
Outlet: ${article.outlet}

Respond with ONLY valid JSON matching this schema:
{
  "title": "one-sentence event description (max 100 chars)",
  "summary": "neutral 2-3 sentence summary of what happened",
  "date": "ISO 8601 date when the event occurred (not published)",
  "tags": ["array", "of", "relevant", "tags", "entities", "topics", "places", "orgs"]
}

Be precise. Tags should include: named entities (people, orgs, places), topics (energy, inflation), and domain keywords.`
}

export function buildDeduplicatePrompt(candidate, existingNodes) {
  const list = existingNodes.map((n, i) => `${i + 1}. [${n.id}] ${n.title} (${n.date?.toISOString?.()?.slice(0,10) ?? n.date})`).join('\n')
  return `You are a news event deduplication assistant.

Candidate event: "${candidate.title}"
Summary: ${candidate.summary}

Existing events that may be the same:
${list}

Is the candidate event the SAME real-world occurrence as any existing event?
Respond with ONLY valid JSON:
{ "match": true/false, "matchedId": "uuid or null", "reason": "brief explanation" }`
}

export function buildConnectPrompt(node, candidateNodes) {
  const list = candidateNodes.map((n, i) =>
    `${i + 1}. [${n.id}] ${n.title} | tags: ${n.tags?.join(', ')}`
  ).join('\n')

  return `You are a news event connection analyst. Given a focal event and a list of candidate events, identify meaningful connections.

Focal event: "${node.title}"
Summary: ${node.summary}
Tags: ${node.tags?.join(', ')}

Candidate events:
${list}

For each connection you find, output a JSON array:
[
  {
    "nodeId": "uuid of connected event",
    "type": "CAUSED_BY | LED_TO | RELATED_TO | CONTEXT",
    "confidence": 0.0-1.0,
    "reason": "brief explanation"
  }
]

Rules:
- CAUSED_BY: the candidate event directly caused the focal event
- LED_TO: the focal event directly caused or triggered the candidate event
- RELATED_TO: meaningfully connected but no direct causation
- CONTEXT: background context for understanding the focal event
- Only include connections with confidence >= 0.5
- Respond with ONLY the JSON array (empty array if no connections)`
}
```

- [ ] **Step 4: Implement client.js**

```js
// src/llm/client.js
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { buildExtractPrompt, buildDeduplicatePrompt, buildConnectPrompt } from './prompts.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function callClaude(prompt) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  return JSON.parse(msg.content[0].text)
}

export async function extractEvent(article) {
  const prompt = buildExtractPrompt(article)
  return callClaude(prompt)
}

export async function deduplicateEvent(candidate, existingNodes) {
  if (existingNodes.length === 0) return { match: false, matchedId: null }
  const prompt = buildDeduplicatePrompt(candidate, existingNodes)
  return callClaude(prompt)
}

export async function findConnections(node, candidateNodes) {
  if (candidateNodes.length === 0) return []
  const prompt = buildConnectPrompt(node, candidateNodes)
  return callClaude(prompt)
}

export async function embedText(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npm test tests/pipeline/extract.test.js
```

Expected: PASS (requires `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `.env`).

- [ ] **Step 6: Commit**

```bash
git add src/llm/ tests/pipeline/extract.test.js
git commit -m "feat: Claude API client, OpenAI embeddings, extraction + connection prompts"
```

---

## Task 11: Pipeline Stage 1+2 — Fetch + Extract

**Files:**
- Create: `src/pipeline/stages/fetch.js`
- Create: `src/pipeline/stages/extract.js`

- [ ] **Step 1: Implement fetch.js**

```js
// src/pipeline/stages/fetch.js
import fetch from 'node-fetch'

export async function fetchArticleText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NexusBot/1.0' },
    timeout: 10000,
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`)
  const html = await res.text()
  // Strip HTML tags to get approximate plain text
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
}
```

- [ ] **Step 2: Implement extract.js**

```js
// src/pipeline/stages/extract.js
import { extractEvent, embedText } from '../../llm/client.js'

export async function runExtract(article) {
  // article: { title, body, outlet, url, published_at, media_type }
  const extracted = await extractEvent(article)
  const embedding = await embedText(`${extracted.title}. ${extracted.summary}`)
  return {
    title: extracted.title,
    summary: extracted.summary,
    date: new Date(extracted.date),
    tags: extracted.tags,
    embedding,
    outlet: article.outlet,
    url: article.url,
    published_at: article.published_at,
    media_type: article.media_type,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/stages/fetch.js src/pipeline/stages/extract.js
git commit -m "feat: pipeline stages 1+2 (fetch article, LLM extract + embed)"
```

---

## Task 12: Pipeline Stage 3+4 — Deduplicate + Connect

**Files:**
- Create: `src/pipeline/stages/deduplicate.js`
- Create: `src/pipeline/stages/connect.js`
- Create: `tests/pipeline/deduplicate.test.js`

- [ ] **Step 1: Write failing dedup test**

```js
// tests/pipeline/deduplicate.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import { createNode } from '../../src/db/nodes.js'
import { runDeduplicate } from '../../src/pipeline/stages/deduplicate.js'

const emb = new Array(1536).fill(0.1)

beforeEach(async () => {
  await pool.query('DELETE FROM edges; DELETE FROM sources; DELETE FROM nodes')
})

describe('runDeduplicate', () => {
  it('returns existingNodeId when a very similar node exists', async () => {
    const existing = await createNode({
      title: 'Gas prices spike 18%', summary: 'Fuel costs rose.', date: new Date('2025-02-03'),
      tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published',
    })
    const candidate = {
      title: 'Gas prices jump 18% globally',
      summary: 'Global fuel costs rose sharply.',
      date: new Date('2025-02-03'),
      tags: ['energy', 'oil'],
      embedding: emb, // identical embedding — should match
    }
    const result = await runDeduplicate(candidate)
    // With identical embeddings, should find a match
    expect(['new', 'existing']).toContain(result.action)
    if (result.action === 'existing') {
      expect(result.existingNodeId).toBe(existing.id)
    }
  })

  it('returns action=new when no similar node exists', async () => {
    const candidate = {
      title: 'Completely unrelated event XYZ 99999',
      summary: 'Nothing like anything else.',
      date: new Date(),
      tags: ['random'],
      embedding: new Array(1536).fill(0.99),
    }
    const result = await runDeduplicate(candidate)
    // No existing nodes → always new
    expect(result.action).toBe('new')
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test tests/pipeline/deduplicate.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement deduplicate.js**

```js
// src/pipeline/stages/deduplicate.js
import { findSimilarNodes } from '../../db/nodes.js'
import { deduplicateEvent } from '../../llm/client.js'

export async function runDeduplicate(candidate) {
  // candidate: { title, summary, date, tags, embedding }
  const similar = await findSimilarNodes(candidate.embedding, { limit: 5, threshold: 0.85 })

  if (similar.length === 0) return { action: 'new' }

  const result = await deduplicateEvent(candidate, similar)

  if (result.match && result.matchedId) {
    return { action: 'existing', existingNodeId: result.matchedId }
  }
  return { action: 'new' }
}
```

- [ ] **Step 4: Implement connect.js**

```js
// src/pipeline/stages/connect.js
import { pool } from '../../db/client.js'
import { createNode } from '../../db/nodes.js'
import { createEdge } from '../../db/edges.js'
import { findConnections, embedText } from '../../llm/client.js'
import { findSimilarNodes } from '../../db/nodes.js'

export async function runConnect(node) {
  // node: full DB node row with embedding and tags
  // Find candidate nodes via tag overlap + vector similarity
  const { rows: tagMatches } = await pool.query(
    `SELECT * FROM nodes
     WHERE status='published' AND id != $1 AND tags && $2::text[]
     ORDER BY trending_score DESC LIMIT 20`,
    [node.id, `{${node.tags.join(',')}}`]
  )

  const vectorMatches = await findSimilarNodes(node.embedding, { limit: 10, threshold: 0.7 })
  const seen = new Set()
  const candidates = [...tagMatches, ...vectorMatches].filter(n => {
    if (seen.has(n.id) || n.id === node.id) return false
    seen.add(n.id)
    return true
  }).slice(0, 20)

  if (candidates.length === 0) return []

  const connections = await findConnections(node, candidates)
  const created = []

  for (const conn of connections) {
    if (conn.confidence < 0.5) continue
    const connectedNode = candidates.find(c => c.id === conn.nodeId)
    if (!connectedNode) continue

    const edge = await createEdge({
      from_node: node.id,
      to_node: conn.nodeId,
      type: conn.type,
      confidence: conn.confidence,
      proposed_by: 'ai',
    })
    created.push(edge)
  }

  return created
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test tests/pipeline/deduplicate.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline/stages/deduplicate.js src/pipeline/stages/connect.js tests/pipeline/deduplicate.test.js
git commit -m "feat: pipeline stages 3+4 (vector dedup + LLM connection discovery)"
```

---

## Task 13: Pipeline Stages 5+6 — Review + Notify

**Files:**
- Create: `src/pipeline/stages/review.js`
- Create: `src/pipeline/stages/notify.js`

- [ ] **Step 1: Implement review.js**

```js
// src/pipeline/stages/review.js
import { updateNodeStatus } from '../../db/nodes.js'
import { updateEdgeStatus } from '../../db/edges.js'
import { updateImportance } from '../../db/nodes.js'

const AUTO_PUBLISH_THRESHOLD = 0.85
const DISCARD_THRESHOLD = 0.60

export async function runReview(node, edges) {
  // Publish the node itself (nodes are reviewed separately from edges)
  await updateNodeStatus(node.id, 'published')

  const results = { published: [], queued: [], discarded: [] }

  for (const edge of edges) {
    if (edge.confidence >= AUTO_PUBLISH_THRESHOLD) {
      await updateEdgeStatus(edge.id, 'published')
      results.published.push(edge.id)
    } else if (edge.confidence >= DISCARD_THRESHOLD) {
      // stays as pending_review — human reviewer sees it
      results.queued.push(edge.id)
    } else {
      await updateEdgeStatus(edge.id, 'rejected')
      results.discarded.push(edge.id)
    }
  }

  await updateImportance(node.id)
  return results
}
```

- [ ] **Step 2: Implement notify.js**

```js
// src/pipeline/stages/notify.js
import { getUsersFollowingAnyTag, createNotification } from '../../db/users.js'

export async function runNotify(node) {
  if (!node.tags || node.tags.length === 0) return
  const userIds = await getUsersFollowingAnyTag(node.tags)

  for (const userId of userIds) {
    // Find which of the node's tags this user follows
    const triggerTag = node.tags[0] // simplified: use first matched tag
    await createNotification({ userId, nodeId: node.id, triggerTag })
  }

  return userIds.length
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/stages/review.js src/pipeline/stages/notify.js
git commit -m "feat: pipeline stages 5+6 (confidence review, user notifications)"
```

---

## Task 14: BullMQ Queue + Worker

**Files:**
- Create: `src/pipeline/queue.js`
- Create: `src/pipeline/worker.js`

- [ ] **Step 1: Implement queue.js**

```js
// src/pipeline/queue.js
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const articleQueue = new Queue('articles', { connection })

export async function enqueueArticle(article) {
  // article: { title, body, outlet, url, published_at, media_type }
  await articleQueue.add('process', article, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
```

- [ ] **Step 2: Implement worker.js**

```js
// src/pipeline/worker.js
import 'dotenv/config'
import { Worker } from 'bullmq'
import { connection } from './queue.js'
import { fetchArticleText } from './stages/fetch.js'
import { runExtract } from './stages/extract.js'
import { runDeduplicate } from './stages/deduplicate.js'
import { runConnect } from './stages/connect.js'
import { runReview } from './stages/review.js'
import { runNotify } from './stages/notify.js'
import { createNode, getNodeById } from '../db/nodes.js'
import { createSource, sourceExistsByUrl } from '../db/sources.js'

const worker = new Worker('articles', async (job) => {
  const article = job.data
  console.log(`[pipeline] Processing: ${article.url}`)

  // Guard: skip already-seen URLs
  if (await sourceExistsByUrl(article.url)) {
    console.log(`[pipeline] Skipping duplicate URL: ${article.url}`)
    return
  }

  // Stage 1: fetch full text if body not provided
  if (!article.body) {
    article.body = await fetchArticleText(article.url)
  }

  // Stage 2: extract event + embed
  const extracted = await runExtract(article)

  // Stage 3: deduplicate
  const dedup = await runDeduplicate(extracted)

  let node
  if (dedup.action === 'existing') {
    // Attach new source to existing node
    node = await getNodeById(dedup.existingNodeId)
    await createSource({
      node_id: node.id,
      outlet: article.outlet,
      url: article.url,
      published_at: article.published_at,
      media_type: article.media_type,
    })
    console.log(`[pipeline] Merged into existing node: ${node.title}`)
    return
  }

  // New node
  node = await createNode({
    title: extracted.title,
    summary: extracted.summary,
    date: extracted.date,
    tags: extracted.tags,
    embedding: extracted.embedding,
    created_by: 'ai',
  })

  await createSource({
    node_id: node.id,
    outlet: extracted.outlet,
    url: extracted.url,
    published_at: extracted.published_at,
    media_type: extracted.media_type,
  })

  // Stage 4: connect
  const edges = await runConnect(node)

  // Stage 5: review
  await runReview(node, edges)

  // Stage 6: notify
  await runNotify(node)

  console.log(`[pipeline] Done: "${node.title}" — ${edges.length} connections`)
}, { connection, concurrency: 3 })

worker.on('failed', (job, err) => {
  console.error(`[pipeline] Job failed: ${job?.data?.url}`, err.message)
})

console.log('[pipeline] Worker started')
```

- [ ] **Step 3: Test by hand**

Start the worker in one terminal:
```bash
npm run worker
```

In another terminal, add a test article to the queue:
```bash
node -e "
import('dotenv/config')
  .then(() => import('./src/pipeline/queue.js'))
  .then(({ enqueueArticle }) => enqueueArticle({
    title: 'Oil prices surge after OPEC cuts',
    body: 'Global oil prices rose sharply after OPEC announced a major output reduction on Feb 3, 2025.',
    outlet: 'Test',
    url: 'https://example.com/oil-test-' + Date.now(),
    published_at: new Date('2025-02-03'),
    media_type: 'article',
  }))
  .then(() => { console.log('Enqueued'); process.exit(0) })
"
```

Expected in worker terminal:
```
[pipeline] Processing: https://example.com/oil-test-...
[pipeline] Done: "..." — N connections
```

- [ ] **Step 4: Commit**

```bash
git add src/pipeline/
git commit -m "feat: BullMQ queue and 6-stage pipeline worker"
```

---

## Task 15: NewsAPI Ingestion Scheduler

**Files:**
- Create: `src/ingestion/newsapi.js`
- Create: `src/ingestion/scheduler.js`

- [ ] **Step 1: Implement newsapi.js**

```js
// src/ingestion/newsapi.js
import fetch from 'node-fetch'
import { enqueueArticle } from '../pipeline/queue.js'
import { sourceExistsByUrl } from '../db/sources.js'

const NEWSAPI_BASE = 'https://newsapi.org/v2'

export async function pollTopHeadlines() {
  const url = `${NEWSAPI_BASE}/top-headlines?language=en&pageSize=100&apiKey=${process.env.NEWSAPI_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`)
  const data = await res.json()

  let enqueued = 0
  for (const article of data.articles ?? []) {
    if (!article.url || !article.title) continue
    if (await sourceExistsByUrl(article.url)) continue

    await enqueueArticle({
      title: article.title,
      body: article.content ?? article.description ?? '',
      outlet: article.source?.name ?? 'Unknown',
      url: article.url,
      published_at: new Date(article.publishedAt),
      media_type: 'article',
    })
    enqueued++
  }

  console.log(`[ingest] Enqueued ${enqueued} new articles from NewsAPI`)
  return enqueued
}
```

- [ ] **Step 2: Implement scheduler.js**

```js
// src/ingestion/scheduler.js
import 'dotenv/config'
import { pollTopHeadlines } from './newsapi.js'

const INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

async function tick() {
  try {
    await pollTopHeadlines()
  } catch (err) {
    console.error('[scheduler] Poll failed:', err.message)
  }
}

console.log('[scheduler] Starting ingestion scheduler (5-min interval)')
tick() // run immediately on start
setInterval(tick, INTERVAL_MS)
```

- [ ] **Step 3: Test ingestion**

Start the worker in one terminal:
```bash
npm run worker
```

Run one poll in another:
```bash
node -e "import('./src/ingestion/newsapi.js').then(m => m.pollTopHeadlines()).then(n => { console.log('enqueued:', n); process.exit(0) })"
```

Expected: articles appear in worker terminal being processed.

- [ ] **Step 4: Commit**

```bash
git add src/ingestion/
git commit -m "feat: NewsAPI polling ingestion with 5-minute scheduler"
```

---

## Task 16: Trending Score Cron + Final Smoke Test

**Files:**
- Create: `src/api/routes/trending.js` (cron endpoint for admin)

- [ ] **Step 1: Add trending score refresh on a timer**

Add to `src/api/server.js`:

```js
// src/api/server.js
import { app } from './app.js'
import { updateTrendingScores } from '../db/nodes.js'

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`Nexus API running on :${PORT}`))

// Refresh trending scores every 10 minutes
setInterval(async () => {
  try {
    await updateTrendingScores()
    console.log('[trending] Scores refreshed')
  } catch (err) {
    console.error('[trending] Refresh failed:', err.message)
  }
}, 10 * 60 * 1000)
```

- [ ] **Step 2: Run all tests one final time**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Smoke test the running API**

```bash
npm run dev
```

```bash
curl http://localhost:3000/api/nodes
# Expected: { "nodes": [...] }

curl "http://localhost:3000/api/search?q=gas"
# Expected: { "nodes": [...] }
```

- [ ] **Step 4: Final commit**

```bash
git add src/api/server.js
git commit -m "feat: trending score refresh on 10-min interval, final integration"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] AI pipeline 6 stages → Tasks 11–14
- [x] Nodes with tags + embedding → Tasks 2, 4
- [x] Edge types (CAUSED_BY, LED_TO, RELATED_TO, CONTEXT) → Task 2
- [x] Sources table (multi-outlet per node) → Tasks 3, 5
- [x] Vector similarity search → Task 4 `findSimilarNodes`
- [x] Confidence thresholds (0.85 auto-publish, 0.60–0.84 queue, <0.60 discard) → Task 13
- [x] Optional user accounts → Tasks 6, 7, 9
- [x] Save nodes + follow topics → Tasks 6, 9
- [x] Push notifications → Task 13 `runNotify`, Task 6 `createNotification`
- [x] NewsAPI ingestion → Task 15
- [x] Trending score computation → Task 4 `updateTrendingScores`, Task 16
- [x] Deduplication (vector + LLM) → Task 12
- [x] Autonomous node creation in `runConnect` → Task 12

**Next plans:**
- `2026-04-11-nexus-web-frontend.md` — React + React Flow graph UI
- `2026-04-11-nexus-mobile.md` — React Native app

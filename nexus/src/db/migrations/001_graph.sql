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

-- HNSW works correctly on any data size (ivfflat degrades on empty tables)
CREATE INDEX nodes_embedding_idx ON nodes USING hnsw (embedding vector_cosine_ops);
CREATE INDEX nodes_tags_idx ON nodes USING gin (tags);
CREATE INDEX nodes_status_idx ON nodes (status);
CREATE INDEX nodes_trending_idx ON nodes (trending_score DESC);

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT edges_unique_directed UNIQUE (from_node, to_node, type)
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

CREATE UNIQUE INDEX sources_url_idx ON sources (url);
CREATE INDEX sources_node_idx ON sources (node_id);

-- Vector indexes for pgvector semantic search
-- Run AFTER initial data load (IVFFlat requires existing rows for training)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- IVFFlat indexes for cosine similarity search
CREATE INDEX IF NOT EXISTS candidate_embedding_ivfflat_idx
  ON candidates USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS job_embedding_ivfflat_idx
  ON jobs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search (tsvector) indexes
CREATE INDEX IF NOT EXISTS candidate_fts_idx
  ON candidates USING gin (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(raw_text, ''))
  );

CREATE INDEX IF NOT EXISTS job_fts_idx
  ON jobs USING gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(raw_text, ''))
  );

-- Visa rules text search
CREATE INDEX IF NOT EXISTS visa_rule_fts_idx
  ON visa_rules USING gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, ''))
  );

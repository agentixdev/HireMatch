/** Hybrid search combining pgvector cosine similarity and tsvector full-text ranking */

export interface HybridSearchParams {
  /** Query embedding vector */
  queryEmbedding: number[];
  /** Text query for tsvector search */
  textQuery: string;
  /** Weight for cosine similarity score (0-1) */
  vectorWeight?: number;
  /** Weight for tsvector rank (0-1) */
  textWeight?: number;
  /** Minimum combined score threshold (0-1) */
  minScore?: number;
  /** Maximum results to return */
  limit?: number;
  /** Additional SQL WHERE conditions */
  filters?: string;
  /** Filter parameters for the WHERE conditions */
  filterParams?: unknown[];
}

export interface HybridSearchResult {
  id: string;
  vectorScore: number;
  textScore: number;
  combinedScore: number;
}

/**
 * Build a hybrid search SQL query combining pgvector cosine similarity
 * with tsvector full-text search ranking.
 *
 * The combined score is a weighted average of both scores, each normalized to 0-1.
 */
export function buildHybridSearchQuery(
  params: HybridSearchParams,
  table: string,
  embeddingColumn = "embedding",
  tsvectorColumn = "search_vector"
): { sql: string; params: unknown[] } {
  const vectorWeight = params.vectorWeight ?? 0.7;
  const textWeight = params.textWeight ?? 0.3;
  const minScore = params.minScore ?? 0.3;
  const limit = params.limit ?? 25;

  // Start parameter index after any filter params
  const filterParamCount = params.filterParams?.length ?? 0;
  const embIdx = filterParamCount + 1;
  const queryIdx = filterParamCount + 2;
  const minScoreIdx = filterParamCount + 3;
  const limitIdx = filterParamCount + 4;

  const filterClause = params.filters ? `AND ${params.filters}` : "";

  // Convert embedding array to pgvector format
  const sql = `
    WITH vector_search AS (
      SELECT
        id,
        1 - (${embeddingColumn} <=> $${embIdx}::vector) AS vector_score
      FROM ${table}
      WHERE ${embeddingColumn} IS NOT NULL
      ${filterClause}
      ORDER BY ${embeddingColumn} <=> $${embIdx}::vector
      LIMIT ${limit * 3}
    ),
    text_search AS (
      SELECT
        id,
        ts_rank_cd(${tsvectorColumn}, plainto_tsquery('english', $${queryIdx})) AS text_score
      FROM ${table}
      WHERE ${tsvectorColumn} @@ plainto_tsquery('english', $${queryIdx})
      ${filterClause}
      LIMIT ${limit * 3}
    ),
    combined AS (
      SELECT
        COALESCE(v.id, t.id) AS id,
        COALESCE(v.vector_score, 0) AS vector_score,
        COALESCE(t.text_score, 0) AS text_score,
        (
          COALESCE(v.vector_score, 0) * ${vectorWeight} +
          COALESCE(
            CASE WHEN t.text_score > 0
              THEN t.text_score / GREATEST(MAX(t.text_score) OVER (), 0.001)
              ELSE 0
            END, 0
          ) * ${textWeight}
        ) AS combined_score
      FROM vector_search v
      FULL OUTER JOIN text_search t ON v.id = t.id
    )
    SELECT id, vector_score, text_score, combined_score
    FROM combined
    WHERE combined_score >= $${minScoreIdx}
    ORDER BY combined_score DESC
    LIMIT $${limitIdx}
  `;

  const embeddingStr = `[${params.queryEmbedding.join(",")}]`;
  const queryParams: unknown[] = [
    ...(params.filterParams ?? []),
    embeddingStr,
    params.textQuery,
    minScore,
    limit,
  ];

  return { sql: sql.trim(), params: queryParams };
}

/**
 * Build a vector-only search query (no tsvector).
 */
export function buildVectorSearchQuery(
  queryEmbedding: number[],
  table: string,
  embeddingColumn = "embedding",
  limit = 25,
  filters?: { clause: string; params: unknown[] }
): { sql: string; params: unknown[] } {
  const filterClause = filters ? `AND ${filters.clause}` : "";
  const filterParams = filters?.params ?? [];
  const embIdx = filterParams.length + 1;
  const limitIdx = filterParams.length + 2;

  const sql = `
    SELECT
      id,
      1 - (${embeddingColumn} <=> $${embIdx}::vector) AS score
    FROM ${table}
    WHERE ${embeddingColumn} IS NOT NULL
    ${filterClause}
    ORDER BY ${embeddingColumn} <=> $${embIdx}::vector
    LIMIT $${limitIdx}
  `;

  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  return {
    sql: sql.trim(),
    params: [...filterParams, embeddingStr, limit],
  };
}

/**
 * Build a text-only search query using tsvector.
 */
export function buildTextSearchQuery(
  textQuery: string,
  table: string,
  tsvectorColumn = "search_vector",
  limit = 25,
  filters?: { clause: string; params: unknown[] }
): { sql: string; params: unknown[] } {
  const filterClause = filters ? `AND ${filters.clause}` : "";
  const filterParams = filters?.params ?? [];
  const queryIdx = filterParams.length + 1;
  const limitIdx = filterParams.length + 2;

  const sql = `
    SELECT
      id,
      ts_rank_cd(${tsvectorColumn}, plainto_tsquery('english', $${queryIdx})) AS score
    FROM ${table}
    WHERE ${tsvectorColumn} @@ plainto_tsquery('english', $${queryIdx})
    ${filterClause}
    ORDER BY score DESC
    LIMIT $${limitIdx}
  `;

  return {
    sql: sql.trim(),
    params: [...filterParams, textQuery, limit],
  };
}

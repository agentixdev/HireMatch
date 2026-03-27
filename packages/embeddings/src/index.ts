// Client
export type { EmbeddingConfig, EmbeddingResult } from "./client.js";
export {
  embedText,
  embedQuery,
  cosineSimilarity,
  getModelName,
  getDefaultDimension,
  resetClient,
} from "./client.js";

// Chunker
export type { Chunk, ChunkStrategy, ChunkOptions } from "./chunker.js";
export {
  chunkCV,
  chunkJobDescription,
  chunkVisaRules,
  chunkByParagraphs,
  chunkFixedSize,
} from "./chunker.js";

// Hash
export {
  contentHash,
  bufferHash,
  hasContentChanged,
  compositeHash,
  fingerprint,
} from "./hash.js";

// Batch
export type { BatchEmbeddingResult } from "./batch.js";
export {
  batchEmbed,
  batchEmbedWithIds,
  getMaxBatchSize,
} from "./batch.js";

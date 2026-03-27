import { GoogleGenerativeAI, type EmbedContentResponse } from "@google/generative-ai";

const MODEL_NAME = "text-embedding-004";
const EMBEDDING_DIMENSION = 768;

let genAI: GoogleGenerativeAI | null = null;

export interface EmbeddingConfig {
  apiKey?: string;
  /** Output dimensionality (default: 768) */
  outputDimensionality?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
}

/**
 * Get or create the GoogleGenerativeAI client.
 */
function getClient(config?: EmbeddingConfig): GoogleGenerativeAI {
  if (genAI) return genAI;

  const apiKey = config?.apiKey ?? process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("Gemini API key is required. Set GEMINI_API_KEY or pass config.");
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**
 * Generate an embedding for a single text string.
 */
export async function embedText(
  text: string,
  config?: EmbeddingConfig
): Promise<EmbeddingResult> {
  const client = getClient(config);
  const model = client.getGenerativeModel({ model: MODEL_NAME });
  const dimension = config?.outputDimensionality ?? EMBEDDING_DIMENSION;

  const result: EmbedContentResponse = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: "RETRIEVAL_DOCUMENT" as any,
    outputDimensionality: dimension,
  } as any);

  return {
    embedding: result.embedding.values,
    dimension: result.embedding.values.length,
  };
}

/**
 * Generate embeddings for a query (uses RETRIEVAL_QUERY task type).
 */
export async function embedQuery(
  text: string,
  config?: EmbeddingConfig
): Promise<EmbeddingResult> {
  const client = getClient(config);
  const model = client.getGenerativeModel({ model: MODEL_NAME });
  const dimension = config?.outputDimensionality ?? EMBEDDING_DIMENSION;

  const result: EmbedContentResponse = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: "RETRIEVAL_QUERY" as any,
    outputDimensionality: dimension,
  } as any);

  return {
    embedding: result.embedding.values,
    dimension: result.embedding.values.length,
  };
}

/**
 * Compute cosine similarity between two embedding vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Get the embedding model name.
 */
export function getModelName(): string {
  return MODEL_NAME;
}

/**
 * Get the default embedding dimension.
 */
export function getDefaultDimension(): number {
  return EMBEDDING_DIMENSION;
}

/**
 * Reset the client singleton (for testing).
 */
export function resetClient(): void {
  genAI = null;
}

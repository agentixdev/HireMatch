import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EmbeddingConfig, EmbeddingResult } from "./client.js";

const MODEL_NAME = "text-embedding-004";
const DEFAULT_DIMENSION = 768;

/** Maximum chunks per batch call */
const MAX_BATCH_SIZE = 100;

/** Rate limit: max concurrent requests */
const MAX_CONCURRENT = 5;

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalChunks: number;
  batchCount: number;
  duration: number;
}

/**
 * Generate embeddings for a batch of texts.
 * Automatically splits into sub-batches of MAX_BATCH_SIZE.
 */
export async function batchEmbed(
  texts: string[],
  config?: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  const startTime = performance.now();
  const apiKey = config?.apiKey ?? process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: MODEL_NAME });
  const dimension = config?.outputDimensionality ?? DEFAULT_DIMENSION;

  // Split into batches
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
  }

  const allEmbeddings: EmbeddingResult[] = [];

  // Process batches with concurrency limit
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);

    const batchResults = await Promise.all(
      concurrentBatches.map(async (batch) => {
        const requests = batch.map((text) => ({
          content: { parts: [{ text }], role: "user" as const },
          taskType: "RETRIEVAL_DOCUMENT" as any,
          outputDimensionality: dimension,
        }));

        const result = await model.batchEmbedContents({
          requests,
        } as any);

        return result.embeddings.map((e: any) => ({
          embedding: e.values as number[],
          dimension: (e.values as number[]).length,
        }));
      })
    );

    for (const results of batchResults) {
      allEmbeddings.push(...results);
    }
  }

  return {
    embeddings: allEmbeddings,
    totalChunks: texts.length,
    batchCount: batches.length,
    duration: performance.now() - startTime,
  };
}

/**
 * Generate embeddings for chunks with their IDs preserved.
 */
export async function batchEmbedWithIds(
  items: { id: string; text: string }[],
  config?: EmbeddingConfig
): Promise<Map<string, number[]>> {
  const texts = items.map((i) => i.text);
  const result = await batchEmbed(texts, config);

  const map = new Map<string, number[]>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const embedding = result.embeddings[i];
    if (embedding) {
      map.set(item.id, embedding.embedding);
    }
  }

  return map;
}

/**
 * Get the maximum batch size.
 */
export function getMaxBatchSize(): number {
  return MAX_BATCH_SIZE;
}

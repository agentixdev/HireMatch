import type { Logger } from 'pino';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* ─── Types ─── */

export interface EmbedJobData {
  recordType: 'candidate' | 'job' | 'visa_rule';
  recordId: string;
  orgId: string;
}

interface EmbedResult {
  status: 'completed' | 'skipped' | 'failed';
  recordType: string;
  recordId: string;
  chunkCount?: number;
  error?: string;
}

/* ─── Gemini embedding client ─── */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const MAX_BATCH_SIZE = 100;
const MAX_CHUNK_LENGTH = 2048;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Generate embedding vectors for an array of text chunks.
 * Handles batching (up to 100 chunks per request).
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });

  const embeddings: number[][] = [];

  // Process in batches of MAX_BATCH_SIZE
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);

    const result = await model.batchEmbedContents({
      requests: batch.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT' as const,
      })),
    });

    for (const embedding of result.embeddings) {
      embeddings.push(embedding.values);
    }
  }

  return embeddings;
}

/**
 * Average multiple embedding vectors into a single vector.
 */
function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  if (vectors.length === 1) return vectors[0]!;

  const dims = vectors[0]!.length;
  const avg = new Array(dims).fill(0) as number[];

  for (const vec of vectors) {
    for (let i = 0; i < dims; i++) {
      avg[i]! += vec[i]!;
    }
  }

  // Normalize
  for (let i = 0; i < dims; i++) {
    avg[i]! /= vectors.length;
  }

  // L2 normalize the final vector
  const magnitude = Math.sqrt(avg.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dims; i++) {
      avg[i]! /= magnitude;
    }
  }

  return avg;
}

/* ─── Chunking strategies ─── */

/**
 * Chunk text for embedding. Uses different strategies per record type.
 */
function chunkContent(text: string, recordType: string): string[] {
  if (!text || text.trim().length === 0) return [];

  switch (recordType) {
    case 'candidate':
      return chunkCandidate(text);
    case 'job':
      return chunkJob(text);
    case 'visa_rule':
      return chunkVisaRule(text);
    default:
      return chunkGeneric(text);
  }
}

/**
 * Candidate chunking: splits by sections (skills, experience, education).
 */
function chunkCandidate(text: string): string[] {
  const chunks: string[] = [];
  const sections = text.split(/\s*\|\s*/);

  let currentChunk = '';
  for (const section of sections) {
    if ((currentChunk + ' ' + section).length > MAX_CHUNK_LENGTH) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk = currentChunk ? currentChunk + ' | ' + section : section;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  // Always include full text as first chunk if not too long
  if (text.length <= MAX_CHUNK_LENGTH) {
    return [text];
  }

  return chunks.length > 0 ? chunks : [text.substring(0, MAX_CHUNK_LENGTH)];
}

/**
 * Job chunking: title+company as header, then description paragraphs.
 */
function chunkJob(text: string): string[] {
  const chunks: string[] = [];
  const sections = text.split(/\s*\|\s*/);

  // First section is typically title | company | location — always include
  const header = sections.slice(0, 3).join(' | ');
  if (header.trim()) chunks.push(header.trim());

  // Description might be long — split into paragraph-sized chunks
  const description = sections.slice(3).join(' | ');
  if (description) {
    const paragraphs = description.split(/\n\n+/);
    let currentChunk = header; // prefix with header for context

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length > MAX_CHUNK_LENGTH) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = header + '\n\n' + para; // re-prefix
      } else {
        currentChunk = currentChunk + '\n\n' + para;
      }
    }
    if (currentChunk.trim() && currentChunk !== header) {
      chunks.push(currentChunk.trim());
    }
  }

  if (text.length <= MAX_CHUNK_LENGTH) return [text];
  return chunks.length > 0 ? chunks : [text.substring(0, MAX_CHUNK_LENGTH)];
}

/**
 * Visa rule chunking: split by process steps.
 */
function chunkVisaRule(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];

  const chunks: string[] = [];
  const sections = text.split(/(?=Step \d|Phase \d|\d+\.\s)/i);

  let currentChunk = '';
  for (const section of sections) {
    if ((currentChunk + '\n' + section).length > MAX_CHUNK_LENGTH) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk = currentChunk + '\n' + section;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks.length > 0 ? chunks : [text.substring(0, MAX_CHUNK_LENGTH)];
}

/**
 * Generic chunking: sentence-aware splitting.
 */
function chunkGeneric(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > MAX_CHUNK_LENGTH) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks.length > 0 ? chunks : [text.substring(0, MAX_CHUNK_LENGTH)];
}

/* ─── DB operations ─── */

async function getDb() {
  const { createDb } = await import('@recruitment/db');
  return createDb();
}

async function getRecordText(recordType: string, recordId: string): Promise<string | null> {
  const db = await getDb();
  const { eq } = await import('drizzle-orm');

  switch (recordType) {
    case 'candidate': {
      const { candidates } = await import('@recruitment/db');
      const result = await db
        .select({ raw_text: candidates.raw_text, name: candidates.name, headline: candidates.headline })
        .from(candidates)
        .where(eq(candidates.id, recordId))
        .limit(1);

      if (!result[0]) return null;
      const { raw_text, name, headline } = result[0];
      return raw_text ?? [name, headline].filter(Boolean).join(' | ');
    }

    case 'job': {
      const { jobs } = await import('@recruitment/db');
      const result = await db
        .select({ raw_text: jobs.raw_text, title: jobs.title, description: jobs.description })
        .from(jobs)
        .where(eq(jobs.id, recordId))
        .limit(1);

      if (!result[0]) return null;
      const { raw_text, title, description } = result[0];
      return raw_text ?? [title, description].filter(Boolean).join(' | ');
    }

    case 'visa_rule': {
      const { visaRules } = await import('@recruitment/db');
      const result = await db
        .select({
          title: visaRules.title,
          description: visaRules.description,
          visa_type: visaRules.visa_type,
          country: visaRules.country,
          notes: visaRules.notes,
        })
        .from(visaRules)
        .where(eq(visaRules.id, recordId))
        .limit(1);

      if (!result[0]) return null;
      const { title, description, visa_type, country, notes } = result[0];
      return [
        `${country} - ${visa_type}`,
        title,
        description,
        notes,
      ].filter(Boolean).join(' | ');
    }

    default:
      return null;
  }
}

async function writeEmbedding(recordType: string, recordId: string, embedding: number[]): Promise<void> {
  const db = await getDb();
  const { eq } = await import('drizzle-orm');

  switch (recordType) {
    case 'candidate': {
      const { candidates } = await import('@recruitment/db');
      await db
        .update(candidates)
        .set({ embedding, updated_at: new Date() })
        .where(eq(candidates.id, recordId));
      break;
    }
    case 'job': {
      const { jobs } = await import('@recruitment/db');
      await db
        .update(jobs)
        .set({ embedding, updated_at: new Date() })
        .where(eq(jobs.id, recordId));
      break;
    }
    // visa_rules doesn't have an embedding column in the schema,
    // but we still process them for future use
    default:
      break;
  }
}

async function updateEmbeddingQueueStatus(
  recordType: string,
  recordId: string,
  status: 'processing' | 'completed' | 'failed',
  error?: string,
): Promise<void> {
  const db = await getDb();
  const { embeddingQueue } = await import('@recruitment/db');
  const { eq, and } = await import('drizzle-orm');

  const updates: Record<string, unknown> = { status };
  if (status === 'completed' || status === 'failed') {
    updates.processed_at = new Date();
  }
  if (error) {
    updates.last_error = error;
  }
  if (status === 'processing' || status === 'failed') {
    updates.attempts = await db
      .select({ attempts: embeddingQueue.attempts })
      .from(embeddingQueue)
      .where(
        and(
          eq(embeddingQueue.record_type, recordType as 'candidate' | 'job' | 'visa_rule'),
          eq(embeddingQueue.record_id, recordId),
        ),
      )
      .limit(1)
      .then((rows) => (rows[0]?.attempts ?? 0) + 1);
  }

  await db
    .update(embeddingQueue)
    .set(updates)
    .where(
      and(
        eq(embeddingQueue.record_type, recordType as 'candidate' | 'job' | 'visa_rule'),
        eq(embeddingQueue.record_id, recordId),
      ),
    );
}

/* ─── Main processor ─── */

export async function processEmbedding(data: EmbedJobData, logger: Logger): Promise<EmbedResult> {
  const { recordType, recordId, orgId } = data;

  try {
    // Mark as processing
    await updateEmbeddingQueueStatus(recordType, recordId, 'processing');

    // Get record text
    const text = await getRecordText(recordType, recordId);
    if (!text || text.trim().length === 0) {
      logger.warn({ recordType, recordId }, 'No text content found for embedding');
      await updateEmbeddingQueueStatus(recordType, recordId, 'completed');
      return { status: 'skipped', recordType, recordId };
    }

    // Chunk the content
    const chunks = chunkContent(text, recordType);
    logger.info(
      { recordType, recordId, chunkCount: chunks.length, textLength: text.length },
      'Chunked content for embedding',
    );

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks);

    // Average chunks into a single embedding vector
    const finalEmbedding = averageVectors(embeddings);

    if (finalEmbedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${finalEmbedding.length}-dim`,
      );
    }

    // Write embedding to DB
    await writeEmbedding(recordType, recordId, finalEmbedding);

    // Mark as completed
    await updateEmbeddingQueueStatus(recordType, recordId, 'completed');

    return {
      status: 'completed',
      recordType,
      recordId,
      chunkCount: chunks.length,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ recordType, recordId, err: errorMessage }, 'Embedding processing failed');

    await updateEmbeddingQueueStatus(recordType, recordId, 'failed', errorMessage).catch(
      (logErr) => logger.error({ err: logErr }, 'Failed to update embedding queue status'),
    );

    return { status: 'failed', recordType, recordId, error: errorMessage };
  }
}

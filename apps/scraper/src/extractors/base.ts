import type { Page } from 'playwright';
import { createHash } from 'node:crypto';

/**
 * Extracted data from a scrape operation.
 */
export interface ExtractedData {
  /** What kind of record this represents */
  type: 'candidate' | 'job';

  /** Normalised data matching the corresponding Drizzle schema */
  data: Record<string, unknown>;

  /** SHA-256 hash of the canonical content (used for deduplication) */
  content_hash: string;

  /** Original source URL */
  source_url: string;

  /** Platform identifier (e.g., 'linkedin', 'github') */
  source_platform: string;

  /** Raw text content used for embedding generation */
  raw_text: string;

  /** Timestamp of extraction */
  extracted_at: string;
}

/**
 * Base interface that all extractors must implement.
 */
export interface Extractor {
  /** Human-readable name for logging */
  readonly name: string;

  /** Domain patterns this extractor handles (e.g., ['linkedin.com', 'www.linkedin.com']) */
  readonly domains: string[];

  /**
   * Extract structured data from a loaded page.
   * The page is already navigated to the target URL.
   */
  extract(page: Page, url: string): Promise<ExtractedData>;
}

/**
 * Compute a deterministic content hash for deduplication.
 * Strips whitespace variations to avoid false negatives.
 */
export function computeContentHash(content: string): string {
  const normalised = content
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return createHash('sha256').update(normalised, 'utf8').digest('hex');
}

/**
 * Safely extract text content from a selector, returning null if not found.
 */
export async function safeText(page: Page, selector: string): Promise<string | null> {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    const text = await element.textContent();
    return text?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Safely extract an attribute from a selector.
 */
export async function safeAttribute(
  page: Page,
  selector: string,
  attribute: string,
): Promise<string | null> {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    const value = await element.getAttribute(attribute);
    return value?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Safely extract all text from multiple matching elements.
 */
export async function safeTextAll(page: Page, selector: string): Promise<string[]> {
  try {
    const elements = await page.$$(selector);
    const texts: string[] = [];
    for (const el of elements) {
      const text = await el.textContent();
      if (text?.trim()) {
        texts.push(text.trim());
      }
    }
    return texts;
  } catch {
    return [];
  }
}

/**
 * Wait for at least one of the given selectors to appear.
 * Returns the selector that matched, or null on timeout.
 */
export async function waitForAny(
  page: Page,
  selectors: string[],
  timeout = 10000,
): Promise<string | null> {
  try {
    const result = await Promise.race([
      ...selectors.map(async (sel) => {
        await page.waitForSelector(sel, { timeout });
        return sel;
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
    ]);
    return result;
  } catch {
    return null;
  }
}

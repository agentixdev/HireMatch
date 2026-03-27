import Anthropic from '@anthropic-ai/sdk';
import { chromium, type Browser, type Page } from 'playwright';
import type { Logger } from 'pino';
import { Client as MinioClient } from 'minio';
import { navigateVisaPortal } from './domains/immigration.js';

/* ─── Types ─── */

export interface AgentJobData {
  scrapeJobId: string;
  orgId: string;
  sourceUrl: string;
  scrapeType: 'playwright' | 'crawl4ai' | 'computer_use';
  priority: 'high' | 'standard' | 'low';
  brightDataPool?: string;
  country?: string;
  instructions?: string;
  domain?: 'immigration' | 'general';
}

export interface AgentResult {
  status: 'completed' | 'failed' | 'skipped';
  data?: Record<string, unknown>;
  screenshots: string[];
  stepsCompleted: number;
  error?: string;
  reason?: string;
}

interface AgentStep {
  action: string;
  reasoning: string;
  screenshot?: string;
  timestamp: string;
}

/* ─── Configuration ─── */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514';
const MAX_STEPS = Number(process.env.AGENT_MAX_STEPS ?? '30');
const STEP_TIMEOUT_MS = Number(process.env.AGENT_STEP_TIMEOUT ?? '30000');

const MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: Number(process.env.MINIO_PORT ?? '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? '',
  secretKey: process.env.MINIO_SECRET_KEY ?? '',
};
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'recruitment-agent';

/* ─── MinIO ─── */

let minioClient: MinioClient | null = null;

function getMinio(): MinioClient {
  if (!minioClient) {
    minioClient = new MinioClient(MINIO_CONFIG);
  }
  return minioClient;
}

async function uploadScreenshot(buffer: Buffer, sessionId: string, step: number): Promise<string> {
  const key = `agent-sessions/${sessionId}/step-${String(step).padStart(3, '0')}.png`;

  try {
    const minio = getMinio();
    const bucketExists = await minio.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      await minio.makeBucket(MINIO_BUCKET);
    }
    await minio.putObject(MINIO_BUCKET, key, buffer, buffer.length, {
      'Content-Type': 'image/png',
    });
    return key;
  } catch {
    return `local://${key}`;
  }
}

/* ─── Claude Computer Use ─── */

function getAnthropicClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

/**
 * Build the system prompt for the computer use agent.
 */
function buildSystemPrompt(url: string, instructions?: string): string {
  const basePrompt = `You are a web automation agent navigating a browser to extract structured data from websites.

Your task is to navigate to ${url} and extract the relevant information.

RULES:
1. Navigate carefully — read the page before clicking.
2. If you encounter CAPTCHAs, cookie banners, or login walls, try to dismiss them.
3. If a page requires multiple steps (pagination, tabs, dropdowns), navigate through all of them.
4. Scroll through entire pages to find all content.
5. Extract data as structured JSON when possible.
6. Take screenshots at key decision points for debugging.
7. If you get stuck, try alternative navigation paths.
8. NEVER submit forms with real data — only read/extract.
9. Stop if you've extracted all available data or hit a dead end.

OUTPUT FORMAT:
When you have extracted all data, respond with a JSON block wrapped in <extracted_data> tags:
<extracted_data>
{
  "type": "visa_rule" | "job" | "candidate",
  "records": [...]
}
</extracted_data>`;

  if (instructions) {
    return `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${instructions}`;
  }

  return basePrompt;
}

/**
 * Execute a single action step via Playwright.
 */
async function executeAction(
  page: Page,
  action: string,
  logger: Logger,
): Promise<void> {
  const actionLower = action.toLowerCase();

  // Click action
  const clickMatch = action.match(/click\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*(?:button|link|element|tab)?$/i);
  if (clickMatch || actionLower.startsWith('click')) {
    const selector = clickMatch?.[1] ?? action.replace(/^click\s+/i, '').trim();
    try {
      // Try text-based click first
      await page.getByText(selector, { exact: false }).first().click({ timeout: 5000 });
    } catch {
      try {
        // Fall back to CSS selector
        await page.click(selector, { timeout: 5000 });
      } catch {
        logger.warn({ selector }, 'Click target not found, trying alternative');
        // Try role-based
        await page.getByRole('button', { name: selector }).or(
          page.getByRole('link', { name: selector })
        ).first().click({ timeout: 5000 }).catch(() => {
          logger.warn({ selector }, 'All click attempts failed');
        });
      }
    }
    return;
  }

  // Type / fill action
  const typeMatch = action.match(/type\s+["'](.+?)["']\s+(?:in|into)\s+["']?(.+?)["']?$/i);
  if (typeMatch) {
    const text = typeMatch[1]!;
    const selector = typeMatch[2]!;
    try {
      await page.fill(selector, text, { timeout: 5000 });
    } catch {
      await page.getByPlaceholder(selector).or(
        page.getByLabel(selector)
      ).first().fill(text, { timeout: 5000 });
    }
    return;
  }

  // Scroll action
  if (actionLower.includes('scroll')) {
    if (actionLower.includes('down')) {
      await page.evaluate(() => window.scrollBy(0, 500));
    } else if (actionLower.includes('up')) {
      await page.evaluate(() => window.scrollBy(0, -500));
    } else if (actionLower.includes('bottom')) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else if (actionLower.includes('top')) {
      await page.evaluate(() => window.scrollTo(0, 0));
    } else {
      await page.evaluate(() => window.scrollBy(0, 500));
    }
    return;
  }

  // Navigate / goto action
  const navMatch = action.match(/(?:navigate|goto|go\s+to|open)\s+["']?(.+?)["']?$/i);
  if (navMatch) {
    const url = navMatch[1]!;
    await page.goto(url.startsWith('http') ? url : `https://${url}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    return;
  }

  // Wait action
  const waitMatch = action.match(/wait\s+(\d+)/i);
  if (waitMatch) {
    const ms = Math.min(parseInt(waitMatch[1]!, 10), 10000);
    await new Promise((resolve) => setTimeout(resolve, ms));
    return;
  }

  // Select / dropdown action
  const selectMatch = action.match(/select\s+["'](.+?)["']\s+(?:from|in)\s+["']?(.+?)["']?$/i);
  if (selectMatch) {
    const value = selectMatch[1]!;
    const selector = selectMatch[2]!;
    await page.selectOption(selector, { label: value }).catch(() =>
      page.selectOption(selector, value),
    );
    return;
  }

  // Press key action
  const pressMatch = action.match(/press\s+(.+)/i);
  if (pressMatch) {
    await page.keyboard.press(pressMatch[1]!.trim());
    return;
  }

  logger.warn({ action }, 'Unknown action, skipping');
}

/* ─── Main entry point ─── */

/**
 * Use Claude Computer Use to navigate and extract data from complex pages.
 * Handles form filling, pagination, dynamic SPAs, and multi-step flows.
 */
export async function navigateAndExtract(
  data: AgentJobData,
  logger: Logger,
): Promise<AgentResult> {
  const { sourceUrl, instructions, domain, country } = data;
  const sessionId = `${data.scrapeJobId}-${Date.now()}`;
  const screenshots: string[] = [];
  const steps: AgentStep[] = [];
  let browser: Browser | null = null;

  try {
    // Handle domain-specific logic
    if (domain === 'immigration' || isImmigrationUrl(sourceUrl)) {
      return await navigateVisaPortal(data, logger);
    }

    const anthropic = getAnthropicClient();

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Navigate to target URL
    logger.info({ url: sourceUrl, sessionId }, 'Agent navigating to URL');
    await page.goto(sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Take initial screenshot
    const initialScreenshot = await page.screenshot({ fullPage: false });
    const initialKey = await uploadScreenshot(initialScreenshot, sessionId, 0);
    screenshots.push(initialKey);

    // Get page content for initial context
    const pageContent = await page.evaluate(() => {
      return document.body.innerText.substring(0, 5000);
    });

    const systemPrompt = buildSystemPrompt(sourceUrl, instructions);

    // Agent loop — iterate with Claude to navigate the page
    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content: `I've navigated to ${sourceUrl}. Here is the visible text on the page:\n\n${pageContent}\n\nWhat should I do to extract the data? Please give me one action at a time. When done extracting, output the data in <extracted_data> tags.`,
      },
    ];

    let extractedData: Record<string, unknown> | null = null;
    let stepCount = 0;

    while (stepCount < MAX_STEPS) {
      stepCount++;

      // Get Claude's response
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      });

      const assistantText = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      // Check for extracted data
      const dataMatch = assistantText.match(/<extracted_data>([\s\S]*?)<\/extracted_data>/);
      if (dataMatch) {
        try {
          extractedData = JSON.parse(dataMatch[1]!.trim());
          logger.info({ sessionId, steps: stepCount }, 'Data extracted by agent');
          break;
        } catch (parseErr) {
          logger.warn({ err: parseErr }, 'Failed to parse extracted data, continuing');
        }
      }

      // Check for stop signal
      if (response.stop_reason === 'end_turn' && !assistantText.includes('click') && !assistantText.includes('scroll') && !assistantText.includes('navigate')) {
        logger.info({ sessionId }, 'Agent completed without explicit extraction');
        break;
      }

      // Parse action from response
      const actionMatch = assistantText.match(/(?:ACTION|STEP|DO):\s*(.+)/i) ??
        assistantText.match(/^(?:1\.|[-*])\s*(.+)/m);
      const action = actionMatch?.[1]?.trim() ?? assistantText.split('\n')[0]?.trim() ?? '';

      if (!action) {
        logger.warn({ sessionId, stepCount }, 'No action found in response');
        break;
      }

      // Execute the action
      logger.info({ sessionId, step: stepCount, action }, 'Executing action');
      try {
        await executeAction(page, action, logger);
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for page update
      } catch (err) {
        logger.warn({ sessionId, step: stepCount, action, err }, 'Action execution failed');
      }

      // Take screenshot
      const screenshot = await page.screenshot({ fullPage: false });
      const screenshotKey = await uploadScreenshot(screenshot, sessionId, stepCount);
      screenshots.push(screenshotKey);

      // Get updated page content
      const updatedContent = await page.evaluate(() => {
        return document.body.innerText.substring(0, 5000);
      });

      steps.push({
        action,
        reasoning: assistantText.substring(0, 500),
        screenshot: screenshotKey,
        timestamp: new Date().toISOString(),
      });

      // Feed back to Claude
      messages.push(
        { role: 'assistant', content: assistantText },
        {
          role: 'user',
          content: `Action "${action}" has been executed. Here is the updated page content:\n\n${updatedContent}\n\nWhat should I do next? If data extraction is complete, output it in <extracted_data> tags.`,
        },
      );
    }

    await context.close();

    if (extractedData) {
      return {
        status: 'completed',
        data: extractedData,
        screenshots,
        stepsCompleted: stepCount,
      };
    }

    return {
      status: 'completed',
      data: { warning: 'Agent completed but no structured data extracted', steps },
      screenshots,
      stepsCompleted: stepCount,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ sessionId, err: errorMessage }, 'Agent navigation failed');

    return {
      status: 'failed',
      screenshots,
      stepsCompleted: steps.length,
      error: errorMessage,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/* ─── Helpers ─── */

function isImmigrationUrl(url: string): boolean {
  const immigrationDomains = [
    'uscis.gov',
    'travel.state.gov',
    'sem.admin.ch',
    'ircc',
    'canada.ca/en/immigration',
    'gov.uk/browse/visas-immigration',
    'bamf.de',
    'france-visas.gouv.fr',
    'extranjeros.inclusion.gob.es',
    'portaleimmigrazione.it',
    'ind.nl',
    'dofi.ibz.be',
    'oesterreich.gv.at',
    'sef.pt',
    'inis.gov.ie',
    'migrationsverket.se',
    'nyidanmark.dk',
    'udi.no',
    'migri.fi',
  ];

  const urlLower = url.toLowerCase();
  return immigrationDomains.some((d) => urlLower.includes(d));
}

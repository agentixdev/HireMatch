import Anthropic from '@anthropic-ai/sdk';
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import type { Logger } from 'pino';
import { Client as MinioClient } from 'minio';
import type { AgentJobData, AgentResult } from '../agent.js';

/* ─── Configuration ─── */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514';
const MAX_STEPS = 40;

const MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: Number(process.env.MINIO_PORT ?? '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? '',
  secretKey: process.env.MINIO_SECRET_KEY ?? '',
};
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'recruitment-agent';

/* ─── Portal-specific configurations ─── */

interface PortalConfig {
  name: string;
  /** URL patterns to identify this portal */
  urlPatterns: string[];
  /** Specific instructions for navigating this portal */
  instructions: string;
  /** CSS selectors to wait for after navigation */
  waitForSelectors: string[];
  /** Cookie consent button selectors to dismiss */
  cookieDismiss: string[];
  /** Known paths to visa information */
  visaPaths: string[];
}

const PORTAL_CONFIGS: PortalConfig[] = [
  {
    name: 'USCIS (United States)',
    urlPatterns: ['uscis.gov'],
    instructions: `You are navigating the USCIS website to extract visa information.

KEY NAVIGATION:
1. Look for "Working in the United States" or "Temporary Workers" sections
2. Navigate through visa categories: H-1B, L-1, O-1, E-2, TN, etc.
3. For each visa type, extract:
   - Eligibility requirements
   - Application process steps
   - Processing times
   - Required documents
   - Filing fees
   - Annual quotas if applicable
4. Check the "Filing Fees" page for current fee schedule
5. Look for "Processing Times" section

IMPORTANT: USCIS has a lot of nested pages. Follow links to individual visa category pages.
The main visa info is usually under "Working in the United States" > specific category.`,
    waitForSelectors: ['main', '#main-content', '.main-content'],
    cookieDismiss: ['.cookie-banner button', '#cookie-accept'],
    visaPaths: [
      '/working-in-the-united-states',
      '/working-in-the-united-states/temporary-nonimmigrant-workers',
      '/working-in-the-united-states/permanent-workers',
      '/h-1b-specialty-occupations',
      '/l-1a-intracompany-transferee-executive-or-manager',
      '/o-1-visa-individuals-with-extraordinary-ability-or-achievement',
    ],
  },
  {
    name: 'SEM (Switzerland)',
    urlPatterns: ['sem.admin.ch'],
    instructions: `You are navigating the Swiss State Secretariat for Migration (SEM) website.

KEY NAVIGATION:
1. Navigate to the "Entry and stay" or "Einreise und Aufenthalt" section
2. Look for work permit categories:
   - L Permit (short-stay, up to 1 year)
   - B Permit (residence, 1-5 years)
   - C Permit (permanent residence)
   - G Permit (cross-border commuters)
3. For each permit type, extract:
   - Requirements and eligibility
   - Application process
   - Processing time
   - Required documents
   - Fees
   - Quota information (especially for non-EU/EFTA nationals)
4. Check for information specific to EU/EFTA vs. third-country nationals

IMPORTANT: Switzerland differentiates heavily between EU/EFTA and non-EU/EFTA workers.
Look for both categories. The site may be in German, French, Italian, or English.`,
    waitForSelectors: ['main', '#content', '.mod-text'],
    cookieDismiss: ['.alert-banner .close', '#cookie-accept'],
    visaPaths: [
      '/en/entry-stay',
      '/en/entry-stay/work',
      '/en/entry-stay/residence-permits',
    ],
  },
  {
    name: 'IRCC (Canada)',
    urlPatterns: ['canada.ca/en/immigration', 'ircc'],
    instructions: `You are navigating Immigration, Refugees and Citizenship Canada (IRCC) website.

KEY NAVIGATION:
1. Navigate to "Work in Canada" section
2. Look for work permit categories:
   - Temporary work permits (employer-specific, open)
   - Express Entry (Federal Skilled Worker, Canadian Experience Class, Federal Skilled Trades)
   - Provincial Nominee Programs (PNP)
   - Global Talent Stream
   - LMIA-exempt categories
3. For each pathway, extract:
   - Eligibility criteria (including CRS points if applicable)
   - Processing steps
   - Processing times
   - Required documents
   - Application fees
   - Language requirements
4. Check for processing times at https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html

IMPORTANT: Canada's system is complex with multiple pathways. Focus on work-related permits first.`,
    waitForSelectors: ['main', '#wb-main', '.gc-stp-stp'],
    cookieDismiss: [],
    visaPaths: [
      '/en/immigration-refugees-citizenship/services/work-canada.html',
      '/en/immigration-refugees-citizenship/services/work-canada/permit.html',
      '/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
    ],
  },
];

/* ─── MinIO helper ─── */

let minioClient: MinioClient | null = null;

function getMinio(): MinioClient {
  if (!minioClient) {
    minioClient = new MinioClient(MINIO_CONFIG);
  }
  return minioClient;
}

async function uploadScreenshot(buffer: Buffer, sessionId: string, step: number): Promise<string> {
  const key = `immigration-sessions/${sessionId}/step-${String(step).padStart(3, '0')}.png`;
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

/* ─── Portal identification ─── */

function getPortalConfig(url: string): PortalConfig | null {
  const urlLower = url.toLowerCase();
  return PORTAL_CONFIGS.find((config) =>
    config.urlPatterns.some((pattern) => urlLower.includes(pattern)),
  ) ?? null;
}

/* ─── Cookie / popup dismissal ─── */

async function dismissOverlays(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click({ timeout: 3000 });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch {
      // Ignore — overlay may not be present
    }
  }

  // Generic cookie consent patterns
  const genericDismiss = [
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("OK")',
    'button:has-text("Close")',
    '[data-testid="cookie-accept"]',
    '#onetrust-accept-btn-handler',
    '.cc-btn.cc-dismiss',
  ];

  for (const selector of genericDismiss) {
    try {
      const el = await page.$(selector);
      if (el && await el.isVisible()) {
        await el.click({ timeout: 2000 });
        await new Promise((resolve) => setTimeout(resolve, 300));
        break;
      }
    } catch {
      // Continue
    }
  }
}

/* ─── Multi-page visa data accumulator ─── */

interface VisaPageData {
  url: string;
  title: string;
  content: string;
  visaTypes: string[];
}

async function crawlVisaPaths(
  context: BrowserContext,
  baseUrl: string,
  paths: string[],
  logger: Logger,
): Promise<VisaPageData[]> {
  const results: VisaPageData[] = [];
  const origin = new URL(baseUrl).origin;

  for (const path of paths) {
    const fullUrl = path.startsWith('http') ? path : `${origin}${path}`;
    logger.info({ url: fullUrl }, 'Crawling visa path');

    const page = await context.newPage();
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const title = await page.title();
      const content = await page.evaluate(() => document.body.innerText.substring(0, 15000));

      // Try to identify visa types mentioned
      const visaTypes = identifyVisaTypes(content);

      results.push({ url: fullUrl, title, content, visaTypes });
    } catch (err) {
      logger.warn({ url: fullUrl, err }, 'Failed to crawl visa path');
    } finally {
      await page.close();
    }
  }

  return results;
}

function identifyVisaTypes(text: string): string[] {
  const patterns = [
    // US
    /H-1B/gi, /H-2A/gi, /H-2B/gi, /L-1[AB]?/gi, /O-1[AB]?/gi, /E-[12]/gi,
    /TN(?:\s+visa)?/gi, /EB-[1-5]/gi, /J-1/gi,
    // Switzerland
    /[LBCG]\s*(?:permit|Bewilligung|autorisation)/gi,
    // Canada
    /Express\s*Entry/gi, /(?:Federal\s+)?Skilled\s+Worker/gi,
    /Global\s+Talent\s+Stream/gi, /LMIA/gi, /PNP/gi,
    // UK
    /Skilled\s+Worker\s+visa/gi, /Global\s+Talent\s+visa/gi, /Tier\s+[1-5]/gi,
    // EU
    /EU\s+Blue\s+Card/gi, /ICT\s+(?:permit|visa)/gi,
    // Generic
    /work\s+permit/gi, /work\s+visa/gi, /residence\s+permit/gi,
  ];

  const found = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => found.add(m.trim()));
    }
  }
  return [...found];
}

/* ─── Main entry point ─── */

/**
 * Navigate an immigration portal using Claude Computer Use to extract visa rules.
 * Handles USCIS, SEM (Switzerland), IRCC (Canada), and other portals.
 */
export async function navigateVisaPortal(
  data: AgentJobData,
  logger: Logger,
): Promise<AgentResult> {
  const { sourceUrl, country } = data;
  const sessionId = `immigration-${data.scrapeJobId}-${Date.now()}`;
  const screenshots: string[] = [];
  let browser: Browser | null = null;
  let stepCount = 0;

  try {
    const portalConfig = getPortalConfig(sourceUrl);
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
    });

    const page = await context.newPage();

    // Navigate to portal
    logger.info({ url: sourceUrl, portal: portalConfig?.name ?? 'unknown', sessionId }, 'Navigating to immigration portal');
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Dismiss cookie banners
    await dismissOverlays(page, portalConfig?.cookieDismiss ?? []);

    // Take initial screenshot
    const initialShot = await page.screenshot({ fullPage: false });
    const initialKey = await uploadScreenshot(initialShot, sessionId, 0);
    screenshots.push(initialKey);
    stepCount++;

    // Phase 1: Crawl known visa paths if available
    let preCollectedData: VisaPageData[] = [];
    if (portalConfig?.visaPaths && portalConfig.visaPaths.length > 0) {
      logger.info(
        { paths: portalConfig.visaPaths.length, portal: portalConfig.name },
        'Pre-crawling known visa paths',
      );
      preCollectedData = await crawlVisaPaths(context, sourceUrl, portalConfig.visaPaths, logger);
      stepCount += preCollectedData.length;
    }

    // Phase 2: Use Claude to extract structured data from collected content
    const mainContent = await page.evaluate(() => document.body.innerText.substring(0, 10000));

    const allContent = [
      `Main page (${sourceUrl}):\n${mainContent}`,
      ...preCollectedData.map(
        (d) => `Page: ${d.title} (${d.url})\nVisa types mentioned: ${d.visaTypes.join(', ')}\n\n${d.content}`,
      ),
    ].join('\n\n---\n\n');

    const extractionPrompt = `You are an immigration law expert. I have collected content from the ${portalConfig?.name ?? country ?? 'immigration'} portal.

${portalConfig?.instructions ?? `Extract all visa/work permit information for country: ${country}`}

Here is the collected content from multiple pages:

${allContent.substring(0, 40000)}

Please extract all visa types, work permits, and immigration pathways as structured JSON.
Return your response in <extracted_data> tags with this format:
<extracted_data>
{
  "type": "visa_rule",
  "country": "${country ?? 'unknown'}",
  "records": [
    {
      "visa_type": "string",
      "title": "string",
      "description": "string",
      "sponsorship_required": boolean,
      "process_steps": [
        {
          "order": number,
          "title": "string",
          "description": "string",
          "duration_days": number or null,
          "required_documents": ["string"],
          "notes": "string or null"
        }
      ],
      "timeline_days_min": number or null,
      "timeline_days_max": number or null,
      "cost_usd": number or null,
      "fee_currency": "string",
      "required_documents": ["string"],
      "eligible_occupations": ["string"],
      "min_salary": number or null,
      "min_experience_years": number or null,
      "education_requirements": "string or null",
      "quota_limited": boolean,
      "annual_quota": number or null,
      "notes": "string"
    }
  ]
}
</extracted_data>`;

    logger.info({ sessionId, contentLength: allContent.length }, 'Sending content to Claude for extraction');

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    const responseText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Parse extracted data
    const dataMatch = responseText.match(/<extracted_data>([\s\S]*?)<\/extracted_data>/);
    let extractedData: Record<string, unknown> | null = null;

    if (dataMatch) {
      try {
        extractedData = JSON.parse(dataMatch[1]!.trim());
      } catch (parseErr) {
        logger.warn({ err: parseErr }, 'Failed to parse extracted visa data');
      }
    }

    // If Claude didn't use tags, try to find JSON directly
    if (!extractedData) {
      const jsonMatch = responseText.match(/\{[\s\S]*"records"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch {
          // Last resort — return raw response
          extractedData = { raw_response: responseText, parse_error: true };
        }
      }
    }

    // Take final screenshot
    const finalShot = await page.screenshot({ fullPage: false });
    const finalKey = await uploadScreenshot(finalShot, sessionId, stepCount);
    screenshots.push(finalKey);

    await context.close();

    if (extractedData) {
      const recordCount = Array.isArray((extractedData as Record<string, unknown>).records)
        ? ((extractedData as Record<string, unknown>).records as unknown[]).length
        : 0;
      logger.info(
        { sessionId, recordCount, stepsCompleted: stepCount },
        'Immigration portal extraction completed',
      );

      return {
        status: 'completed',
        data: extractedData,
        screenshots,
        stepsCompleted: stepCount,
      };
    }

    return {
      status: 'completed',
      data: {
        warning: 'Extraction completed but no structured data could be parsed',
        preCollectedPages: preCollectedData.length,
        visaTypesFound: preCollectedData.flatMap((d) => d.visaTypes),
      },
      screenshots,
      stepsCompleted: stepCount,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ sessionId, err: errorMessage }, 'Immigration portal navigation failed');

    return {
      status: 'failed',
      screenshots,
      stepsCompleted: stepCount,
      error: errorMessage,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

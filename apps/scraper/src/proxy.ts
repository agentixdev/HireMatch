import { chromium, type Browser, type BrowserContext } from 'playwright';
import pino from 'pino';

const logger = pino({ name: 'proxy' });

/* ─── Configuration ─── */

const BRIGHT_DATA_HOST = process.env.BRIGHT_DATA_HOST ?? 'brd.superproxy.io';
const BRIGHT_DATA_PORT = Number(process.env.BRIGHT_DATA_PORT ?? '9222');
const BRIGHT_DATA_USERNAME = process.env.BRIGHT_DATA_USERNAME ?? '';
const BRIGHT_DATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD ?? '';
const BRIGHT_DATA_WS = process.env.BRIGHT_DATA_WS ?? '';

/* ─── Geo pool mapping: country → Bright Data zone/pool ─── */

const GEO_POOLS: Record<string, string> = {
  CH: 'zone-scraping_ch',
  DE: 'zone-scraping_de',
  FR: 'zone-scraping_fr',
  US: 'zone-scraping_us',
  GB: 'zone-scraping_gb',
  CA: 'zone-scraping_ca',
  ES: 'zone-scraping_es',
  IT: 'zone-scraping_it',
  NL: 'zone-scraping_nl',
  BE: 'zone-scraping_be',
  AT: 'zone-scraping_at',
  PT: 'zone-scraping_pt',
  IE: 'zone-scraping_ie',
  SE: 'zone-scraping_se',
  DK: 'zone-scraping_dk',
  NO: 'zone-scraping_no',
  FI: 'zone-scraping_fi',
  PL: 'zone-scraping_pl',
  CZ: 'zone-scraping_cz',
  RO: 'zone-scraping_ro',
  IN: 'zone-scraping_in',
  MX: 'zone-scraping_mx',
  BR: 'zone-scraping_br',
  AR: 'zone-scraping_ar',
  CN: 'zone-scraping_cn',
  JP: 'zone-scraping_jp',
  KR: 'zone-scraping_kr',
  VN: 'zone-scraping_vn',
  PH: 'zone-scraping_ph',
};

/* ─── Token-bucket rate limiter: 1 request per 3s per domain ─── */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const domainBuckets = new Map<string, TokenBucket>();
const RATE_LIMIT_INTERVAL_MS = 3000;
const MAX_TOKENS = 1;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function waitForRateLimit(url: string): Promise<void> {
  const domain = extractDomain(url);
  const now = Date.now();

  let bucket = domainBuckets.get(domain);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    domainBuckets.set(domain, bucket);
  }

  // Refill tokens based on time elapsed
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor(elapsed / RATE_LIMIT_INTERVAL_MS);
  if (refill > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  // Wait if no tokens available
  if (bucket.tokens <= 0) {
    const waitTime = RATE_LIMIT_INTERVAL_MS - (now - bucket.lastRefill);
    logger.debug({ domain, waitTime }, 'Rate limit: waiting');
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitTime)));
    bucket.tokens = MAX_TOKENS;
    bucket.lastRefill = Date.now();
  }

  bucket.tokens -= 1;
}

/**
 * Connect to Bright Data Scraping Browser via WebSocket.
 * Falls back to local chromium if no WS endpoint is configured.
 */
export async function connectBrowser(pool?: string): Promise<Browser> {
  const wsEndpoint = pool
    ? `${BRIGHT_DATA_WS}?zone=${pool}`
    : BRIGHT_DATA_WS;

  if (wsEndpoint) {
    logger.info({ pool, endpoint: wsEndpoint }, 'Connecting to Bright Data Scraping Browser');
    try {
      const browser = await chromium.connectOverCDP(wsEndpoint);
      logger.info('Connected to Bright Data');
      return browser;
    } catch (err) {
      logger.error({ err }, 'Failed to connect to Bright Data, falling back to local');
    }
  }

  // Fallback: local chromium with optional proxy
  const proxyServer =
    BRIGHT_DATA_USERNAME && BRIGHT_DATA_PASSWORD
      ? `http://${BRIGHT_DATA_HOST}:${BRIGHT_DATA_PORT}`
      : undefined;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(proxyServer && {
      proxy: {
        server: proxyServer,
        username: BRIGHT_DATA_USERNAME,
        password: BRIGHT_DATA_PASSWORD,
      },
    }),
  });

  logger.info({ proxyServer: proxyServer ?? 'none' }, 'Launched local Chromium');
  return browser;
}

/**
 * Create a browser context with stealth settings
 */
export async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const { randomViewport, randomUserAgent } = await import('./human-behavior.js');
  const viewport = randomViewport();
  const userAgent = randomUserAgent();

  const context = await browser.newContext({
    viewport,
    userAgent,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: undefined,
    permissions: [],
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  // Block unnecessary resources
  await context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}', (route) =>
    route.abort(),
  );
  await context.route('**/analytics**', (route) => route.abort());
  await context.route('**/tracking**', (route) => route.abort());

  return context;
}

/**
 * Rotate proxy IP by requesting a new session via Bright Data API
 */
export async function rotateProxy(): Promise<void> {
  if (!BRIGHT_DATA_USERNAME) {
    logger.warn('No Bright Data credentials, skipping proxy rotation');
    return;
  }

  try {
    const response = await fetch(
      `https://brightdata.com/api/zone/route_ips?zone=scraping_browser`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.BRIGHT_DATA_API_TOKEN ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rotate: true }),
      },
    );

    if (!response.ok) {
      logger.warn(
        { status: response.status, body: await response.text() },
        'Proxy rotation request failed',
      );
      return;
    }

    logger.info('Proxy IP rotated');
  } catch (err) {
    logger.error({ err }, 'Failed to rotate proxy');
  }
}

/**
 * Get the appropriate Bright Data geo pool for a given country
 */
export function getGeoPool(country: string): string {
  const pool = GEO_POOLS[country.toUpperCase()];
  if (!pool) {
    logger.warn({ country }, 'No geo pool for country, using default');
    return 'zone-scraping_us';
  }
  return pool;
}

#!/usr/bin/env node
/**
 * VPS Visa Scraper — standalone Node.js 22 script
 *
 * Scrapes government visa pages and POSTs raw HTML to HireMatch API
 * for server-side AI parsing.
 *
 * Environment variables:
 *   HIREMATCH_API_URL  — base URL (default: https://www.hirematch.com)
 *   VPS_SCRAPER_SECRET — Bearer token for API auth (required)
 *
 * Usage:
 *   node scraper.js
 *   # or with env file:
 *   env $(cat .env | xargs) node scraper.js
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Load .env file if present (no dotenv dependency) ─────────────────
function loadEnvFile(): void {
  try {
    const envPath = resolve(import.meta.dirname ?? ".", ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // No .env file — that's fine
  }
}

loadEnvFile();

// ── Config ───────────────────────────────────────────────────────────
const API_URL = (process.env.HIREMATCH_API_URL || "https://www.hirematch.com").replace(/\/+$/, "");
const SECRET = process.env.VPS_SCRAPER_SECRET || "";

if (!SECRET) {
  console.error("[FATAL] VPS_SCRAPER_SECRET is not set. Exiting.");
  process.exit(1);
}

const INGEST_ENDPOINT = `${API_URL}/api/visa/ingest`;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── VISA_SOURCES — mirrors src/lib/visa-scraper.ts ───────────────────
const VISA_SOURCES: Record<string, { name: string; urls: string[] }> = {
  us: {
    name: "United States",
    urls: [
      "https://travel.state.gov/content/travel/en/us-visas/employment.html",
      "https://www.uscis.gov/working-in-the-united-states",
    ],
  },
  ca: {
    name: "Canada",
    urls: [
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html",
    ],
  },
  gb: {
    name: "United Kingdom",
    urls: [
      "https://www.gov.uk/browse/visas-immigration/work-visas",
    ],
  },
  ch: {
    name: "Switzerland",
    urls: [
      "https://www.sem.admin.ch/sem/en/home/themen/arbeit.html",
    ],
  },
  de: {
    name: "Germany",
    urls: [
      "https://www.make-it-in-germany.com/en/visa-residence/types/work",
    ],
  },
  fr: {
    name: "France",
    urls: [
      "https://france-visas.gouv.fr/en/web/france-visas/long-stay-visa",
    ],
  },
  es: {
    name: "Spain",
    urls: [
      "https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Trabajo.aspx",
    ],
  },
  it: {
    name: "Italy",
    urls: [
      "https://vistoperitalia.esteri.it/home/en",
    ],
  },
  nl: {
    name: "Netherlands",
    urls: [
      "https://ind.nl/en/work",
    ],
  },
  be: {
    name: "Belgium",
    urls: [
      "https://www.belgium.be/en/work/coming_to_work_in_belgium",
    ],
  },
  at: {
    name: "Austria",
    urls: [
      "https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/",
    ],
  },
  pt: {
    name: "Portugal",
    urls: [
      "https://www.sef.pt/en/pages/conteudo-detalhe.aspx?nID=21",
    ],
  },
  ie: {
    name: "Ireland",
    urls: [
      "https://www.irishimmigration.ie/coming-to-work-in-ireland/",
    ],
  },
  se: {
    name: "Sweden",
    urls: [
      "https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden.html",
    ],
  },
  dk: {
    name: "Denmark",
    urls: [
      "https://www.nyidanmark.dk/en-GB/You-want-to-apply/Work",
    ],
  },
  no: {
    name: "Norway",
    urls: [
      "https://www.udi.no/en/want-to-apply/work-immigration/",
    ],
  },
  fi: {
    name: "Finland",
    urls: [
      "https://migri.fi/en/working-in-finland",
    ],
  },
  pl: {
    name: "Poland",
    urls: [
      "https://www.gov.pl/web/mswia-en/work-permits",
    ],
  },
  cz: {
    name: "Czech Republic",
    urls: [
      "https://www.mvcr.cz/mvcren/article/third-country-nationals-employment.aspx",
    ],
  },
  ro: {
    name: "Romania",
    urls: [
      "https://igi.mai.gov.ro/en/",
    ],
  },
  in: {
    name: "India",
    urls: [
      "https://www.mea.gov.in/visa-requirements.htm",
    ],
  },
  mx: {
    name: "Mexico",
    urls: [
      "https://www.gob.mx/inm",
    ],
  },
  br: {
    name: "Brazil",
    urls: [
      "https://www.gov.br/mre/en/subjects/visas",
    ],
  },
  ar: {
    name: "Argentina",
    urls: [
      "https://www.argentina.gob.ar/interior/migraciones",
    ],
  },
  cn: {
    name: "China",
    urls: [
      "https://www.visaforchina.cn/",
    ],
  },
  jp: {
    name: "Japan",
    urls: [
      "https://www.mofa.go.jp/j_info/visit/visa/index.html",
    ],
  },
  kr: {
    name: "South Korea",
    urls: [
      "https://www.hikorea.go.kr/Main.pt",
    ],
  },
  vn: {
    name: "Vietnam",
    urls: [
      "https://evisa.xuatnhapcanh.gov.vn/",
    ],
  },
  ph: {
    name: "Philippines",
    urls: [
      "https://immigration.gov.ph/",
    ],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────
function ts(): string {
  return new Date().toISOString();
}

function log(msg: string): void {
  console.log(`[${ts()}] ${msg}`);
}

function logError(msg: string): void {
  console.error(`[${ts()}] ERROR: ${msg}`);
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Fetch a single page's HTML ───────────────────────────────────────
async function fetchPageHTML(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      logError(`HTTP ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();
    if (!html || html.length < 100) {
      logError(`Empty or tiny response from ${url} (${html.length} bytes)`);
      return null;
    }

    log(`  Fetched ${url} — ${html.length} bytes`);
    return html;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Fetch failed for ${url}: ${msg}`);
    return null;
  }
}

// ── POST HTML to HireMatch ingest API ────────────────────────────────
async function postToIngest(countryCode: string, url: string, html: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const res = await fetch(INGEST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        country_code: countryCode,
        url,
        html,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logError(`Ingest API returned ${res.status} for ${countryCode} ${url}: ${body.slice(0, 200)}`);
      return false;
    }

    const data = await res.json().catch(() => ({}));
    log(`  Ingested ${countryCode} ${url} — API response: ${JSON.stringify(data)}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Ingest POST failed for ${countryCode} ${url}: ${msg}`);
    return false;
  }
}

// ── Process a single country ─────────────────────────────────────────
async function processCountry(countryCode: string): Promise<boolean> {
  const source = VISA_SOURCES[countryCode];
  if (!source) {
    logError(`Unknown country code: ${countryCode}`);
    return false;
  }

  log(`Processing ${countryCode.toUpperCase()} (${source.name}) — ${source.urls.length} URL(s)`);
  let anySuccess = false;

  for (const url of source.urls) {
    // Random delay between requests (2-5 seconds)
    await randomDelay(2000, 5000);

    const html = await fetchPageHTML(url);
    if (!html) {
      logError(`Skipping ${url} — no HTML retrieved`);
      continue;
    }

    const ok = await postToIngest(countryCode, url, html);
    if (ok) anySuccess = true;
  }

  return anySuccess;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  log("=== HireMatch VPS Visa Scraper started ===");
  log(`API endpoint: ${INGEST_ENDPOINT}`);

  const countryCodes = Object.keys(VISA_SOURCES);
  log(`Countries to scrape: ${countryCodes.length}`);

  const BATCH_SIZE = 3;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < countryCodes.length; i += BATCH_SIZE) {
    const batch = countryCodes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(countryCodes.length / BATCH_SIZE);

    log(`--- Batch ${batchNum}/${totalBatches}: ${batch.map((c) => c.toUpperCase()).join(", ")} ---`);

    // Process batch items concurrently (3 countries at a time)
    const promises = batch.map((code) => processCountry(code));
    const results = await Promise.all(promises);

    results.forEach((ok, idx) => {
      if (ok) {
        totalSuccess++;
        log(`  ${batch[idx].toUpperCase()}: OK`);
      } else {
        totalFailed++;
        logError(`  ${batch[idx].toUpperCase()}: FAILED`);
      }
    });

    // Pause between batches
    if (i + BATCH_SIZE < countryCodes.length) {
      log("Pausing between batches...");
      await randomDelay(3000, 6000);
    }
  }

  log("=== Scraper finished ===");
  log(`Results: ${totalSuccess} succeeded, ${totalFailed} failed out of ${countryCodes.length} countries`);

  if (totalSuccess === 0) {
    logError("All countries failed! Exiting with code 1.");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  logError(`Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

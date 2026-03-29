import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceClient } from '@/lib/supabase-server';
import { VISA_SOURCES } from '@/lib/visa-scraper';
import { publishEvent } from '@/lib/event-bus';
import { parseLLMJson } from '@/lib/parse-json';
import { rateLimit } from '@/lib/rate-limit';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});


/**
 * Use Gemini to structure scraped HTML content into visa rules.
 */
async function parseVisaDataWithAI(
  countryCode: string,
  countryName: string,
  htmlText: string
): Promise<Array<{
  visa_type: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  processing_time: string;
  cost: string;
  validity: string;
}>> {
  // Strip HTML tags from the content
  const scrapedText = htmlText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);

  const prompt = `You are an expert immigration consultant. Parse the following scraped text from the ${countryName} government immigration website and extract all work visa/permit types available for foreign workers.

For each visa type, extract:
- visa_type: short identifier (e.g. "H-1B", "Skilled Worker", "Blue Card")
- title: full official name
- description: 2-3 sentence overview
- requirements: object with keys like education, experience, salary, language, documents (array), sponsorship_required (boolean), quota_limited (boolean)
- processing_time: typical processing duration
- cost: fees in local currency
- validity: how long the visa is valid

Return ONLY valid JSON as an array of objects.

SCRAPED TEXT:
${scrapedText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseLLMJson(text);
}

/**
 * POST /api/visa/ingest
 * Endpoint for the VPS scraper to push scraped HTML content.
 * Auth: Bearer token via VPS_SCRAPER_SECRET env var.
 * Body: { country_code, url, html }
 */
export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.VPS_SCRAPER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 5 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const { success, remaining } = rateLimit(`visa-ingest:${ip}`, 5, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  try {
    const body = await request.json();
    const { country_code, url, html } = body;

    if (!country_code || !html) {
      return NextResponse.json(
        { error: 'country_code and html are required' },
        { status: 400 }
      );
    }

    // Reject oversized HTML payloads (> 500KB)
    const MAX_HTML_SIZE = 500 * 1024;
    if (typeof html === 'string' && html.length > MAX_HTML_SIZE) {
      return NextResponse.json(
        { error: `HTML payload too large (${(html.length / 1024).toFixed(0)}KB). Max allowed: 500KB.` },
        { status: 413 }
      );
    }

    const countryCode = country_code.toLowerCase();
    const source = VISA_SOURCES[countryCode];
    if (!source) {
      return NextResponse.json(
        { error: `Unknown country code: ${countryCode}` },
        { status: 404 }
      );
    }

    // Parse HTML with Gemini AI
    const visaData = await parseVisaDataWithAI(countryCode, source.name, html);

    // Upsert into visa_rules table
    const supabase = await createServiceClient();
    let upsertCount = 0;
    let failedCount = 0;
    const failedVisaTypes: string[] = [];

    for (const visa of visaData) {
      const { error } = await supabase
        .from('visa_rules')
        .upsert(
          {
            country_code: countryCode,
            visa_type: visa.visa_type,
            title: visa.title,
            description: visa.description,
            requirements: visa.requirements,
            processing_time: visa.processing_time,
            cost: visa.cost,
            validity: visa.validity,
            source_url: url || source.urls[0],
            last_scraped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'country_code,visa_type' }
        );

      if (error) {
        failedCount++;
        failedVisaTypes.push(visa.visa_type);
        console.error(`Failed to upsert visa rule ${visa.visa_type} for ${countryCode}:`, error);
      } else {
        upsertCount++;
      }
    }

    // Publish event bus events
    if (upsertCount > 0) {
      await publishEvent('system', 'visa_rule.updated', {
        country_code: countryCode,
        country_name: source.name,
        rules_updated: upsertCount,
        source: 'vps_scraper',
      });
    }

    return NextResponse.json({
      ok: true,
      country_code: countryCode,
      rules_parsed: visaData.length,
      rules_upserted: upsertCount,
      rules_failed: failedCount,
      ...(failedVisaTypes.length > 0 && { failed_visa_types: failedVisaTypes }),
    });
  } catch (error) {
    console.error('Visa ingest error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

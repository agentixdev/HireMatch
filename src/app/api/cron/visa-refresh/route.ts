import { NextResponse } from 'next/server';
import { seedVisaRules, scrapeAllCountries, VISA_SOURCES } from '@/lib/visa-scraper';
import { publishEvent } from '@/lib/event-bus';

export const maxDuration = 300;

/**
 * Daily cron: Refresh visa requirement data from scraped sources.
 * 1. Seeds initial data for key countries
 * 2. Scrapes all 29 countries in batches
 * 3. Publishes event bus events for updated countries
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Step 1: Seed initial data
    const seedResult = await seedVisaRules();

    // Step 2: Scrape all countries
    const scrapeResult = await scrapeAllCountries();

    // Step 3: Publish events for countries that had changes
    let eventsPublished = 0;
    for (const [countryCode, result] of Object.entries(scrapeResult.results)) {
      if (result.success && result.count > 0) {
        const countryName = VISA_SOURCES[countryCode]?.name ?? countryCode;
        await publishEvent('system', 'visa_rule.updated', {
          country_code: countryCode,
          country_name: countryName,
          rules_updated: result.count,
        });
        eventsPublished++;
      }
    }

    return NextResponse.json({
      ok: true,
      seed: {
        success: seedResult.success,
        total: seedResult.total,
      },
      scrape: {
        totalSuccess: scrapeResult.totalSuccess,
        totalFailed: scrapeResult.totalFailed,
        results: scrapeResult.results,
      },
      eventsPublished,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Visa refresh cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

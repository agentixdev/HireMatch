import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

/**
 * POST /api/recruiter/onboarding
 * Saves onboarding data + generates smart tags via Gemini AI.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      company_name,
      company_website,
      industry,
      company_size,
      country,
      city,
      bio,
      culture_tags,
      values_dna,
      work_style,
      hiring_needs,
    } = body;

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Generate smart tags + culture analysis via Gemini
    const prompt = `You are an expert recruitment consultant. Analyze this company's onboarding data and generate smart matching tags.

COMPANY DATA:
- Name: ${company_name}
- Industry: ${industry || 'Not specified'}
- Size: ${company_size || 'Not specified'}
- Country: ${country || 'Not specified'}
- Description: ${bio || 'Not provided'}
- Culture Tags: ${(culture_tags || []).join(', ') || 'None'}
- Values DNA: ${JSON.stringify(values_dna || {})}
- Work Style: ${JSON.stringify(work_style || {})}
- Hiring Needs: ${JSON.stringify(hiring_needs || {})}

Generate a JSON response with:
{
  "match_tags": ["tag1", "tag2", ...],
  "suggested_culture_tags": ["tag1", "tag2", ...],
  "company_archetype": "one of: innovator, builder, optimizer, guardian, connector, disruptor",
  "culture_temperature": "one of: cool-analytical, warm-creative, balanced, hot-startup, steady-enterprise",
  "culture_summary": "2-3 sentence summary of the company culture DNA"
}

Rules:
- match_tags: 10-20 lowercase tags for candidate matching (skills, culture, values, industry-specific)
- suggested_culture_tags: 5-8 additional culture tags beyond what they already selected
- company_archetype: best-fit archetype based on all data
- culture_temperature: determines UI color theme
- culture_summary: engaging, specific description`;

    let aiResult = {
      match_tags: [] as string[],
      suggested_culture_tags: [] as string[],
      company_archetype: 'builder',
      culture_temperature: 'balanced',
      culture_summary: '',
    };

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, ''));
      aiResult = { ...aiResult, ...parsed };
    } catch (aiErr) {
      console.error('Gemini onboarding analysis error:', aiErr);
      // Fallback: generate basic tags from available data
      const fallbackTags: string[] = [];
      if (industry) fallbackTags.push(industry.toLowerCase());
      if (culture_tags) fallbackTags.push(...culture_tags.map((t: string) => t.toLowerCase()));
      aiResult.match_tags = fallbackTags;
    }

    // Save to Supabase using service client for reliable writes
    const serviceClient = await createServiceClient();

    const { error: updateError } = await serviceClient
      .from('recruiters')
      .update({
        company_name,
        company_website: company_website || null,
        industry: industry || '',
        company_size: company_size || '',
        country: country || 'us',
        city: city || null,
        bio: bio || null,
        culture_tags: culture_tags || [],
        match_tags: aiResult.match_tags,
        values_dna: values_dna || null,
        work_style: work_style || null,
        hiring_needs: hiring_needs || null,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Recruiter update error:', updateError);
      return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      match_tags: aiResult.match_tags,
      suggested_culture_tags: aiResult.suggested_culture_tags,
      company_archetype: aiResult.company_archetype,
      culture_temperature: aiResult.culture_temperature,
      culture_summary: aiResult.culture_summary,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

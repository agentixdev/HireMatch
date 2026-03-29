import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * POST /api/candidate/apply-enhancement
 * Applies AI-generated enhancements directly to the candidate's profile.
 *
 * Body: {
 *   field: 'headline' | 'bio' | 'skills' | 'work_history' | 'all_resume',
 *   value: string | string[] | object,
 *   // For 'all_resume', value is { headline, bio, skills, work_history }
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { field, value } = await request.json();

    if (!field || value === undefined) {
      return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
    }

    // Build the update object based on field type
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    switch (field) {
      case 'headline':
        if (typeof value !== 'string') return NextResponse.json({ error: 'headline must be a string' }, { status: 400 });
        update.headline = value;
        break;

      case 'bio':
        if (typeof value !== 'string') return NextResponse.json({ error: 'bio must be a string' }, { status: 400 });
        update.bio = value;
        break;

      case 'skills':
        if (!Array.isArray(value)) return NextResponse.json({ error: 'skills must be an array' }, { status: 400 });
        // Merge with existing skills (no duplicates)
        {
          const { data: candidate } = await supabase
            .from('candidates')
            .select('skills')
            .eq('user_id', user.id)
            .single();
          const existing = candidate?.skills || [];
          const merged = [...new Set([...existing, ...value])];
          update.skills = merged;
        }
        break;

      case 'work_history':
        if (!Array.isArray(value)) return NextResponse.json({ error: 'work_history must be an array' }, { status: 400 });
        update.work_history = value;
        break;

      case 'all_resume': {
        // Apply all resume improvements at once
        const v = value as {
          headline?: string;
          bio?: string;
          skills?: string[];
          added_skills?: string[];
          work_history?: Array<{ company: string; improved_description: string }>;
        };

        if (v.headline) update.headline = v.headline;
        if (v.bio) update.bio = v.bio;

        // Merge skills
        if (v.skills || v.added_skills) {
          const { data: candidate } = await supabase
            .from('candidates')
            .select('skills')
            .eq('user_id', user.id)
            .single();
          const existing = candidate?.skills || [];
          const newSkills = [...(v.skills || []), ...(v.added_skills || [])];
          update.skills = [...new Set([...existing, ...newSkills])];
        }

        // Update work history descriptions (merge improved descriptions into existing)
        if (v.work_history && v.work_history.length > 0) {
          const { data: candidate } = await supabase
            .from('candidates')
            .select('work_history')
            .eq('user_id', user.id)
            .single();
          const existingHistory = (candidate?.work_history || []) as Array<Record<string, unknown>>;

          const updatedHistory = existingHistory.map((entry) => {
            const improvement = v.work_history!.find(
              (imp) => imp.company && entry.company &&
                String(imp.company).toLowerCase() === String(entry.company).toLowerCase()
            );
            if (improvement) {
              return { ...entry, description: improvement.improved_description };
            }
            return entry;
          });
          update.work_history = updatedHistory;
        }
        break;
      }

      case 'visa_status': {
        const allowed = ['citizen', 'permanent_resident', 'work_visa', 'needs_sponsorship'];
        if (typeof value !== 'string' || !allowed.includes(value)) {
          return NextResponse.json({ error: 'visa_status must be one of: citizen, permanent_resident, work_visa, needs_sponsorship' }, { status: 400 });
        }
        update.visa_status = value;
        break;
      }

      case 'is_public':
        if (typeof value !== 'boolean') return NextResponse.json({ error: 'is_public must be a boolean' }, { status: 400 });
        update.is_public = value;
        break;

      case 'photo_url':
        if (typeof value !== 'string') return NextResponse.json({ error: 'photo_url must be a string' }, { status: 400 });
        update.photo_url = value;
        break;

      case 'certifications':
        if (!Array.isArray(value)) return NextResponse.json({ error: 'certifications must be an array' }, { status: 400 });
        // Merge with existing certifications (no duplicates)
        {
          const { data: candidate } = await supabase
            .from('candidates')
            .select('certifications')
            .eq('user_id', user.id)
            .single();
          const existing = candidate?.certifications || [];
          const merged = [...new Set([...existing, ...value])];
          update.certifications = merged;
        }
        break;

      case 'languages':
        if (!Array.isArray(value)) return NextResponse.json({ error: 'languages must be an array' }, { status: 400 });
        // Merge with existing languages (no duplicates)
        {
          const { data: candidate } = await supabase
            .from('candidates')
            .select('languages')
            .eq('user_id', user.id)
            .single();
          const existing = candidate?.languages || [];
          const merged = [...new Set([...existing, ...value])];
          update.languages = merged;
        }
        break;

      default:
        return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('candidates')
      .update(update)
      .eq('user_id', user.id);

    if (dbError) {
      console.error('[apply-enhancement] DB error:', dbError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: Object.keys(update).filter(k => k !== 'updated_at') });
  } catch (err) {
    console.error('[apply-enhancement] Error:', err);
    return NextResponse.json({ error: 'Failed to apply enhancement' }, { status: 500 });
  }
}

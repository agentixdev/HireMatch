import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseCVWithAI } from '@/lib/gemini';

export const maxDuration = 60;

/**
 * POST /api/parse-cv
 * Upload a CV file, extract text, and parse with Gemini AI.
 * Returns structured candidate data.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('cv') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Upload PDF, DOCX, or TXT.' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'pdf';
    const storagePath = `cvs/${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Extract text from file
    const buffer = Buffer.from(await file.arrayBuffer());
    let cvText = '';

    if (file.type === 'text/plain') {
      cvText = buffer.toString('utf-8');
    } else if (file.type === 'application/pdf') {
      // For PDF, we send the raw text content
      // In production, use pdf-parse or similar
      cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      // If the text is mostly garbage (binary PDF), use the filename as hint
      if (cvText.length < 100 || cvText.split(/\s+/).length < 20) {
        cvText = `[PDF file: ${file.name}] Unable to extract text directly. The file has been uploaded for processing.`;
      }
    } else {
      // DOCX — extract raw text
      cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }

    // Parse with Gemini AI
    const parsed = await parseCVWithAI(cvText);

    // Update candidate record
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        full_name: parsed.full_name,
        headline: parsed.headline,
        skills: parsed.skills,
        experience_years: parsed.experience_years,
        education: parsed.education,
        work_history: parsed.work_history,
        certifications: parsed.certifications,
        languages: parsed.languages,
        bio: parsed.bio,
        cv_url: urlData.publicUrl,
        cv_parsed_at: new Date().toISOString(),
        match_tags: [...new Set([...parsed.skills.map(s => s.toLowerCase())])],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Candidate update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      parsed,
      cv_url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('CV parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CV parsing failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { parseCVWithAI, parseCVFromPDF } from '@/lib/gemini';
import { extractPhotoFromPDF, extractPhotoFromDOCX, type ImageResult } from '@/lib/photo-extraction';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(request: Request) {
  // Auth check via cookie-based client
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 requests per minute per user
  const { success, remaining } = rateLimit(`parse-cv:${user.id}`, 10, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  // Use service role client for storage + DB (bypasses RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const formData = await request.formData();
    const file = formData.get('cv') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Upload PDF, DOCX, or TXT.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload CV file to storage
    const fileExt = file.name.split('.').pop() || 'pdf';
    const storagePath = `cvs/${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed: ' + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('documents').getPublicUrl(storagePath);

    // Parse with Gemini AI — use native PDF support for PDFs, text extraction for others
    let parsed;
    try {
      let raw;
      if (file.type === 'application/pdf') {
        // Send PDF directly to Gemini — bypasses broken pdf-parse on serverless
        console.log(`[parse-cv] Using Gemini native PDF parsing for ${file.name} (${(buffer.length / 1024).toFixed(1)}KB)`);
        raw = await parseCVFromPDF(buffer);
      } else {
        // Extract text for DOCX and TXT files
        let cvText = '';
        if (file.type === 'text/plain') {
          cvText = buffer.toString('utf-8');
        } else {
          // DOCX: extract text from XML inside the ZIP
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(buffer);
            const docEntry = zip.getEntry('word/document.xml');
            if (docEntry) {
              const xml = docEntry.getData().toString('utf-8');
              cvText = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
            } else {
              cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
            }
          } catch {
            cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
          }
        }
        if (cvText.trim().length < 20) {
          cvText = `[File: ${file.name}] Unable to extract text. Please try a different format.`;
        }
        raw = await parseCVWithAI(cvText);
      }
      // Normalize field names — Gemini sometimes returns alternate keys
      const r = raw as Record<string, unknown>;
      parsed = {
        full_name: String(r.full_name || r.fullName || r.name || ''),
        headline: String(r.headline || r.title || r.professional_headline || r.job_title || ''),
        skills: (r.skills as string[]) || [],
        experience_years: Number(r.experience_years || r.experienceYears || r.years_of_experience || 0),
        education: (r.education as unknown[]) || [],
        work_history: (r.work_history || r.workHistory || r.work_experience || r.experience) as unknown[] || [],
        certifications: (r.certifications || r.certificates) as string[] || [],
        languages: (r.languages as string[]) || [],
        bio: String(r.bio || r.summary || r.professional_summary || r.about || r.profile || r.objective || ''),
      };
      console.log('[parse-cv] Normalized parsed fields:', {
        full_name: parsed.full_name ? `"${parsed.full_name}"` : '(empty)',
        headline: parsed.headline ? `"${parsed.headline}"` : '(empty)',
        bio: parsed.bio ? `"${parsed.bio.slice(0, 60)}..."` : '(empty)',
        skills: parsed.skills.length,
        education: parsed.education.length,
        work_history: parsed.work_history.length,
      });
    } catch (aiError) {
      console.error('Gemini AI parse error:', aiError);
      return NextResponse.json(
        { error: aiError instanceof Error ? aiError.message : 'AI CV parsing failed' },
        { status: 500 }
      );
    }

    // Extract photo from PDF or DOCX and upload as avatar
    let photoUrl: string | null = null;
    let photo: ImageResult | null = null;

    if (file.type === 'application/pdf') {
      photo = extractPhotoFromPDF(buffer);
    } else if (
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      photo = extractPhotoFromDOCX(buffer);
    }

    if (photo) {
      console.log(`[parse-cv] Extracted ${photo.mimeType} photo (${(photo.data.length / 1024).toFixed(1)}KB) from ${file.type}`);
      const ext = photo.mimeType === 'image/png' ? 'png' : 'jpg';
      const photoPath = `${user.id}/cv-photo-${Date.now()}.${ext}`;
      const { error: photoUploadErr } = await admin.storage
        .from('avatars')
        .upload(photoPath, photo.data, {
          upsert: true,
          contentType: photo.mimeType,
        });
      if (!photoUploadErr) {
        const { data: photoUrlData } = admin.storage.from('avatars').getPublicUrl(photoPath);
        photoUrl = photoUrlData.publicUrl;
      } else {
        console.error('Photo upload error:', photoUploadErr);
      }
    } else {
      console.log(`[parse-cv] No photo found in ${file.type} document`);
    }

    // Update candidate record with service role
    const updateData: Record<string, unknown> = {
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
      match_tags: [...new Set(parsed.skills.map((s: string) => s.toLowerCase()))],
      updated_at: new Date().toISOString(),
    };

    // Always update photo when extracted from new CV upload
    if (photoUrl) {
      updateData.photo_url = photoUrl;
    }

    const { error: updateError } = await admin
      .from('candidates')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Candidate update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      parsed,
      cv_url: urlData.publicUrl,
      photo_url: photoUrl,
    });
  } catch (error) {
    console.error('CV parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CV parsing failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { parseCVWithAI } from '@/lib/gemini';

export const maxDuration = 60;

/**
 * Extract the first embedded JPEG or PNG image from a PDF buffer.
 * Scans for JPEG (FFD8) and PNG (89504E47) signatures in the binary data.
 */
function extractPhotoFromPDF(buffer: Buffer): { data: Buffer; mimeType: string } | null {
  // Look for JPEG signature (FF D8 FF)
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) {
      // Found JPEG start, find end (FF D9)
      for (let j = i + 3; j < buffer.length - 1; j++) {
        if (buffer[j] === 0xFF && buffer[j + 1] === 0xD9) {
          const imgData = buffer.subarray(i, j + 2);
          // Only accept images > 2KB (skip tiny thumbnails) and < 5MB
          if (imgData.length > 2048 && imgData.length < 5 * 1024 * 1024) {
            return { data: Buffer.from(imgData), mimeType: 'image/jpeg' };
          }
        }
      }
    }
  }

  // Look for PNG signature (89 50 4E 47)
  for (let i = 0; i < buffer.length - 8; i++) {
    if (buffer[i] === 0x89 && buffer[i + 1] === 0x50 && buffer[i + 2] === 0x4E && buffer[i + 3] === 0x47) {
      // Found PNG start, find IEND chunk
      for (let j = i + 8; j < buffer.length - 8; j++) {
        if (buffer[j] === 0x49 && buffer[j + 1] === 0x45 && buffer[j + 2] === 0x4E && buffer[j + 3] === 0x44) {
          const imgData = buffer.subarray(i, j + 8); // include IEND + CRC
          if (imgData.length > 2048 && imgData.length < 5 * 1024 * 1024) {
            return { data: Buffer.from(imgData), mimeType: 'image/png' };
          }
        }
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  // Auth check via cookie-based client
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Extract text from file
    let cvText = '';
    if (file.type === 'text/plain') {
      cvText = buffer.toString('utf-8');
    } else if (file.type === 'application/pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        cvText = pdfData.text;
      } catch (pdfErr) {
        console.error('PDF parse fallback:', pdfErr);
        // Fallback: strip binary
        cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
      }
    } else {
      // DOCX: strip binary, keep ASCII text
      cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
    }

    if (cvText.trim().length < 20) {
      cvText = `[File: ${file.name}] Unable to extract text. Please try a different format.`;
    }

    // Parse with Gemini AI
    const parsed = await parseCVWithAI(cvText);

    // Extract photo from PDF and upload as avatar
    let photoUrl: string | null = null;
    if (file.type === 'application/pdf') {
      const photo = extractPhotoFromPDF(buffer);
      if (photo) {
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
      }
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

    // Only set photo if we extracted one and candidate doesn't already have one
    if (photoUrl) {
      const { data: existing } = await admin
        .from('candidates')
        .select('photo_url')
        .eq('user_id', user.id)
        .single();

      if (!existing?.photo_url) {
        updateData.photo_url = photoUrl;
      }
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

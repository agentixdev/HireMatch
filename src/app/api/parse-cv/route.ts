import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { parseCVWithAI } from '@/lib/gemini';
import zlib from 'zlib';

export const maxDuration = 60;

type ImageResult = { data: Buffer; mimeType: string };

/**
 * Scan a buffer for all JPEG and PNG images by binary signatures.
 * Returns all found images sorted by size (largest first).
 */
function scanForImages(buf: Buffer): ImageResult[] {
  const images: ImageResult[] = [];

  // Scan for JPEG (FF D8 FF ... FF D9)
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0xFF && buf[i + 1] === 0xD8 && buf[i + 2] === 0xFF) {
      // Find the LAST FF D9 (some JPEGs have embedded thumbnails with their own FF D9)
      let lastEnd = -1;
      for (let j = i + 3; j < buf.length - 1; j++) {
        if (buf[j] === 0xFF && buf[j + 1] === 0xD9) {
          lastEnd = j + 2;
        }
      }
      if (lastEnd > i) {
        const imgData = buf.subarray(i, lastEnd);
        // Accept images > 5KB (skip tiny icons/logos) and < 5MB
        if (imgData.length > 5120 && imgData.length < 5 * 1024 * 1024) {
          images.push({ data: Buffer.from(imgData), mimeType: 'image/jpeg' });
        }
        i = lastEnd - 1; // Skip past this image
      }
    }
  }

  // Scan for PNG (89 50 4E 47 ... IEND)
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4E && buf[i + 3] === 0x47) {
      for (let j = i + 8; j < buf.length - 8; j++) {
        if (buf[j] === 0x49 && buf[j + 1] === 0x45 && buf[j + 2] === 0x4E && buf[j + 3] === 0x44) {
          const imgData = buf.subarray(i, j + 8);
          if (imgData.length > 5120 && imgData.length < 5 * 1024 * 1024) {
            images.push({ data: Buffer.from(imgData), mimeType: 'image/png' });
          }
          i = j + 7;
          break;
        }
      }
    }
  }

  // Sort largest first — profile photos are usually the biggest image in a CV
  images.sort((a, b) => b.data.length - a.data.length);
  return images;
}

/**
 * Extract the best profile photo from a PDF.
 * Strategy 1: Direct binary scan (works for uncompressed/DCTDecode images)
 * Strategy 2: Decompress FlateDecode streams, then scan (compressed images)
 */
function extractPhotoFromPDF(buffer: Buffer): ImageResult | null {
  // Strategy 1: Direct scan on raw buffer
  const directImages = scanForImages(buffer);
  if (directImages.length > 0) return directImages[0];

  // Strategy 2: Find PDF streams, decompress with zlib, scan inside
  const allDecompressed: Buffer[] = [];
  const streamMarker = Buffer.from('stream');
  const endMarker = Buffer.from('endstream');
  let searchFrom = 0;

  while (searchFrom < buffer.length) {
    const streamIdx = buffer.indexOf(streamMarker, searchFrom);
    if (streamIdx === -1) break;

    // Stream data starts after 'stream\r\n' or 'stream\n'
    let dataStart = streamIdx + streamMarker.length;
    if (buffer[dataStart] === 0x0D) dataStart++; // skip \r
    if (buffer[dataStart] === 0x0A) dataStart++; // skip \n

    const endIdx = buffer.indexOf(endMarker, dataStart);
    if (endIdx === -1) break;

    const streamData = buffer.subarray(dataStart, endIdx);
    searchFrom = endIdx + endMarker.length;

    if (streamData.length < 100) continue;

    // Try zlib inflate (FlateDecode)
    try {
      const decompressed = zlib.inflateSync(streamData);
      if (decompressed.length > 5120) {
        allDecompressed.push(decompressed);
      }
    } catch {
      // Not zlib compressed — might be raw DCTDecode, already found in Strategy 1
    }
  }

  // Scan decompressed streams for images
  for (const dec of allDecompressed) {
    const imgs = scanForImages(dec);
    if (imgs.length > 0) return imgs[0];
  }

  return null;
}

/**
 * Extract the best profile photo from a DOCX file.
 * DOCX is a ZIP archive with images in word/media/ directory.
 */
function extractPhotoFromDOCX(buffer: Buffer): ImageResult | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    const images: ImageResult[] = [];

    for (const entry of entries) {
      const name = entry.entryName.toLowerCase();
      // DOCX stores images in word/media/
      if (!name.startsWith('word/media/')) continue;

      const ext = name.split('.').pop();
      let mimeType = '';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else continue; // skip EMF, WMF, etc.

      const data = entry.getData();
      // Skip tiny images (logos, icons)
      if (data.length > 5120 && data.length < 5 * 1024 * 1024) {
        images.push({ data: Buffer.from(data), mimeType });
      }
    }

    // Return largest image (most likely the profile photo)
    images.sort((a, b) => b.data.length - a.data.length);
    return images.length > 0 ? images[0] : null;
  } catch (err) {
    console.error('DOCX image extraction error:', err);
    return null;
  }
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
      // DOCX: extract text from XML inside the ZIP
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(buffer);
        const docEntry = zip.getEntry('word/document.xml');
        if (docEntry) {
          const xml = docEntry.getData().toString('utf-8');
          // Strip XML tags, keep text content
          cvText = xml.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
        } else {
          cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
        }
      } catch {
        // Fallback: strip binary, keep ASCII text
        cvText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
      }
    }

    if (cvText.trim().length < 20) {
      cvText = `[File: ${file.name}] Unable to extract text. Please try a different format.`;
    }

    // Parse with Gemini AI
    let parsed;
    try {
      parsed = await parseCVWithAI(cvText);
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

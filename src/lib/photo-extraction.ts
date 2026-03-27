import zlib from 'zlib';

export type ImageResult = { data: Buffer; mimeType: string };

/**
 * Validate that a buffer actually starts with a valid image header.
 * Prevents false positives from coincidental byte patterns.
 */
function isValidJPEG(buf: Buffer): boolean {
  if (buf.length < 20) return false;
  // JPEG must start with FF D8 FF (SOI + first marker)
  if (buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[2] !== 0xFF) return false;
  // The marker after SOI should be a valid JPEG marker (E0=JFIF, E1=EXIF, DB=DQT, C0-C2=SOF, etc.)
  const marker = buf[3];
  return (marker >= 0xC0 && marker <= 0xFE);
}

function isValidPNG(buf: Buffer): boolean {
  if (buf.length < 24) return false;
  // Full 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
  return (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
    buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
  );
}

/**
 * Scan a buffer for all JPEG and PNG images by binary signatures.
 * Returns all found images sorted by size (largest first).
 *
 * minSize: minimum bytes to accept (filters out icons/logos)
 * maxSize: maximum bytes to accept
 */
export function scanForImages(
  buf: Buffer,
  minSize: number = 3072,  // 3KB — lowered from 5KB to catch smaller profile photos
  maxSize: number = 5 * 1024 * 1024
): ImageResult[] {
  const images: ImageResult[] = [];

  // Scan for JPEG (FF D8 FF ... FF D9)
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0xFF && buf[i + 1] === 0xD8 && buf[i + 2] === 0xFF) {
      // Find the end of this JPEG: scan for FF D9, but stop if we hit another FF D8 FF (next JPEG start)
      let endIdx = -1;
      for (let j = i + 3; j < buf.length - 1; j++) {
        if (buf[j] === 0xFF && buf[j + 1] === 0xD9) {
          endIdx = j + 2;
          // Check if there's another JPEG starting after this — if so, this is the correct end
          // for the current image. Keep scanning only within this image's boundary.
          const nextStart = buf.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), j + 2);
          if (nextStart !== -1 && nextStart < buf.length) {
            // There's another JPEG ahead — use this FF D9 as the end of the current one
            break;
          }
          // No more JPEGs ahead — use the last FF D9 to handle embedded thumbnails
          // Continue scanning for a later FF D9
        }
      }
      if (endIdx > i) {
        const imgData = buf.subarray(i, endIdx);
        if (imgData.length >= minSize && imgData.length < maxSize && isValidJPEG(imgData)) {
          images.push({ data: Buffer.from(imgData), mimeType: 'image/jpeg' });
        }
        i = endIdx - 1; // Skip past this image
      }
    }
  }

  // Scan for PNG (89 50 4E 47 ... IEND + CRC)
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4E && buf[i + 3] === 0x47) {
      // Find IEND chunk marker (49 45 4E 44)
      for (let j = i + 8; j < buf.length - 7; j++) {
        if (buf[j] === 0x49 && buf[j + 1] === 0x45 && buf[j + 2] === 0x4E && buf[j + 3] === 0x44) {
          // IEND chunk: 4 bytes length + "IEND" + 4 bytes CRC = include up to j + 8
          const imgData = buf.subarray(i, j + 8);
          if (imgData.length >= minSize && imgData.length < maxSize && isValidPNG(imgData)) {
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
 * Strategy 3: Try raw inflate on streams that fail standard inflate
 */
export function extractPhotoFromPDF(buffer: Buffer): ImageResult | null {
  // Strategy 1: Direct scan on raw buffer
  const directImages = scanForImages(buffer);
  if (directImages.length > 0) return directImages[0];

  // Strategy 2 & 3: Find PDF streams, decompress with zlib, scan inside
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

    // Trim trailing CR/LF before endstream (per PDF spec)
    let dataEnd = endIdx;
    while (dataEnd > dataStart && (buffer[dataEnd - 1] === 0x0A || buffer[dataEnd - 1] === 0x0D)) {
      dataEnd--;
    }
    const streamData = buffer.subarray(dataStart, dataEnd);
    searchFrom = endIdx + endMarker.length;

    if (streamData.length < 20) continue;

    // Try zlib inflate (FlateDecode)
    try {
      const decompressed = zlib.inflateSync(streamData);
      if (decompressed.length > 1024) {
        allDecompressed.push(decompressed);
      }
    } catch {
      // Strategy 3: Try raw inflate (some PDFs use raw deflate without zlib header)
      try {
        const decompressed = zlib.inflateRawSync(streamData);
        if (decompressed.length > 1024) {
          allDecompressed.push(decompressed);
        }
      } catch {
        // Not deflate compressed at all — already handled by Strategy 1
      }
    }
  }

  // Scan decompressed streams for images
  const allFound: ImageResult[] = [];
  for (const dec of allDecompressed) {
    const imgs = scanForImages(dec);
    allFound.push(...imgs);
  }

  if (allFound.length > 0) {
    allFound.sort((a, b) => b.data.length - a.data.length);
    return allFound[0];
  }

  return null;
}

/**
 * Extract the best profile photo from a DOCX file.
 * DOCX is a ZIP archive with images in word/media/ directory.
 */
export function extractPhotoFromDOCX(buffer: Buffer): ImageResult | null {
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
      // Lower threshold to 3KB to catch smaller profile photos
      if (data.length > 3072 && data.length < 5 * 1024 * 1024) {
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

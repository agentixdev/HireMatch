/**
 * Tests for photo extraction from PDF and DOCX files.
 * Tests the binary scanning, image validation, and extraction logic.
 *
 * @jest-environment node
 */

import { scanForImages, extractPhotoFromPDF, extractPhotoFromDOCX } from '@/lib/photo-extraction';
import zlib from 'zlib';

/* ─── Helpers to build synthetic image buffers ─── */

/** Build a minimal valid JPEG buffer of specified size */
function makeJPEG(contentSize: number): Buffer {
  // FF D8 FF E0 (SOI + JFIF marker) ... padding ... FF D9 (EOI)
  const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const footer = Buffer.from([0xFF, 0xD9]);
  // Use 0x42 as padding (no FF bytes to avoid false JPEG markers)
  const padding = Buffer.alloc(Math.max(contentSize - header.length - footer.length, 0), 0x42);
  return Buffer.concat([header, padding, footer]);
}

/** Build a minimal valid PNG buffer of specified size */
function makePNG(contentSize: number): Buffer {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  // IEND chunk: 00 00 00 00 (length=0) + 49 45 4E 44 (IEND) + AE 42 60 82 (CRC)
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  const padding = Buffer.alloc(Math.max(contentSize - header.length - iend.length, 0), 0x00);
  return Buffer.concat([header, padding, iend]);
}

/* ─── scanForImages ─── */

describe('scanForImages', () => {
  it('finds a JPEG embedded in a buffer', () => {
    const jpeg = makeJPEG(8000);
    const before = Buffer.alloc(100, 0x00);
    const after = Buffer.alloc(200, 0x00);
    const buf = Buffer.concat([before, jpeg, after]);

    const results = scanForImages(buf);
    expect(results.length).toBe(1);
    expect(results[0].mimeType).toBe('image/jpeg');
    expect(results[0].data.length).toBe(jpeg.length);
  });

  it('finds a PNG embedded in a buffer', () => {
    const png = makePNG(8000);
    const before = Buffer.alloc(50, 0x00);
    const after = Buffer.alloc(50, 0x00);
    const buf = Buffer.concat([before, png, after]);

    const results = scanForImages(buf);
    expect(results.length).toBe(1);
    expect(results[0].mimeType).toBe('image/png');
  });

  it('finds both JPEG and PNG in the same buffer', () => {
    const jpeg = makeJPEG(6000);
    const png = makePNG(10000);
    const spacer = Buffer.alloc(50, 0x00);
    const buf = Buffer.concat([jpeg, spacer, png]);

    const results = scanForImages(buf);
    expect(results.length).toBe(2);
    // Sorted by size: PNG (10000) first, JPEG (6000) second
    expect(results[0].mimeType).toBe('image/png');
    expect(results[1].mimeType).toBe('image/jpeg');
  });

  it('skips images smaller than minSize', () => {
    const tinyJpeg = makeJPEG(500);
    const results = scanForImages(Buffer.from(tinyJpeg));
    expect(results.length).toBe(0);
  });

  it('respects custom minSize parameter', () => {
    const jpeg = makeJPEG(2000);
    expect(scanForImages(Buffer.from(jpeg)).length).toBe(0);
    expect(scanForImages(Buffer.from(jpeg), 1000).length).toBe(1);
  });

  it('skips images larger than maxSize', () => {
    const bigJpeg = makeJPEG(100);
    const results = scanForImages(Buffer.from(bigJpeg), 10, 50);
    expect(results.length).toBe(0);
  });

  it('returns largest image first when sizes differ', () => {
    // Use a JPEG and PNG so the scanner doesn't merge them
    const smallJpeg = makeJPEG(4000);
    const largePng = makePNG(15000);
    const spacer = Buffer.alloc(100, 0x00);
    const buf = Buffer.concat([smallJpeg, spacer, largePng]);

    const results = scanForImages(buf);
    expect(results.length).toBe(2);
    expect(results[0].data.length).toBeGreaterThan(results[1].data.length);
    expect(results[0].mimeType).toBe('image/png');
  });

  it('rejects invalid JPEG (wrong marker after SOI)', () => {
    const badJpeg = Buffer.concat([
      Buffer.from([0xFF, 0xD8, 0xFF, 0x00]),
      Buffer.alloc(5000, 0x42),
      Buffer.from([0xFF, 0xD9]),
    ]);
    const results = scanForImages(Buffer.from(badJpeg));
    expect(results.length).toBe(0);
  });

  it('handles empty buffer gracefully', () => {
    expect(scanForImages(Buffer.alloc(0)).length).toBe(0);
  });

  it('handles buffer with no images', () => {
    const noise = Buffer.alloc(10000, 0x42);
    expect(scanForImages(noise).length).toBe(0);
  });

  it('finds JPEG with embedded thumbnail (multiple FF D9)', () => {
    const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    const thumbEoi = Buffer.from([0xFF, 0xD9]);
    const mainContent = Buffer.alloc(8000, 0x42);
    const mainEoi = Buffer.from([0xFF, 0xD9]);
    const buf = Buffer.concat([header, Buffer.alloc(500, 0x33), thumbEoi, mainContent, mainEoi]);

    const results = scanForImages(buf);
    expect(results.length).toBe(1);
    // Should capture up to the LAST FF D9
    expect(results[0].data.length).toBe(buf.length);
  });

  it('validates PNG has correct full signature', () => {
    // Only first 4 bytes match, rest of signature wrong
    const badPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x00]), // wrong signature bytes 4-7
      Buffer.alloc(8000, 0x00),
      Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]),
    ]);
    const results = scanForImages(badPng);
    expect(results.length).toBe(0);
  });
});

/* ─── extractPhotoFromPDF ─── */

describe('extractPhotoFromPDF', () => {
  it('extracts a JPEG directly embedded in PDF bytes', () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n');
    const jpeg = makeJPEG(10000);
    const pdfFooter = Buffer.from('\n%%EOF');
    const buf = Buffer.concat([pdfHeader, jpeg, pdfFooter]);

    const result = extractPhotoFromPDF(buf);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/jpeg');
    expect(result!.data.length).toBe(jpeg.length);
  });

  it('extracts a PNG directly embedded in PDF bytes', () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n');
    const png = makePNG(10000);
    const pdfFooter = Buffer.from('\n%%EOF');
    const buf = Buffer.concat([pdfHeader, png, pdfFooter]);

    const result = extractPhotoFromPDF(buf);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/png');
  });

  it('prefers the largest image when JPEG and PNG are both present', () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n');
    const smallJpeg = makeJPEG(4000);
    const largePng = makePNG(20000);
    const spacer = Buffer.alloc(200, 0x20);
    const buf = Buffer.concat([pdfHeader, smallJpeg, spacer, largePng, Buffer.from('\n%%EOF')]);

    const result = extractPhotoFromPDF(buf);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/png');
    expect(result!.data.length).toBe(largePng.length);
  });

  it('returns null when PDF has no images', () => {
    const pdfText = Buffer.from('%PDF-1.4\nSome text content\n%%EOF');
    expect(extractPhotoFromPDF(pdfText)).toBeNull();
  });

  it('extracts image from zlib-compressed PDF stream', () => {
    const jpeg = makeJPEG(8000);
    const compressed = zlib.deflateSync(jpeg);

    // Build a fake PDF with a FlateDecode stream containing the JPEG
    // No trailing newline before endstream to match trimming behavior
    const pdfContent = Buffer.concat([
      Buffer.from('%PDF-1.4\n/FlateDecode\nstream\n'),
      compressed,
      Buffer.from('\nendstream\n%%EOF'),
    ]);

    const result = extractPhotoFromPDF(pdfContent);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/jpeg');
    expect(result!.data.length).toBe(jpeg.length);
  });

  it('extracts image from raw-deflate compressed PDF stream', () => {
    const jpeg = makeJPEG(8000);
    const compressed = zlib.deflateRawSync(jpeg);

    const pdfContent = Buffer.concat([
      Buffer.from('%PDF-1.4\nstream\n'),
      compressed,
      Buffer.from('\nendstream\n%%EOF'),
    ]);

    const result = extractPhotoFromPDF(pdfContent);
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/jpeg');
  });

  it('handles corrupted streams without crashing', () => {
    const pdfContent = Buffer.concat([
      Buffer.from('%PDF-1.4\nstream\n'),
      Buffer.alloc(500, 0x42), // garbage data (not FF which could be JPEG marker)
      Buffer.from('\nendstream\n%%EOF'),
    ]);

    expect(extractPhotoFromPDF(pdfContent)).toBeNull();
  });

  it('handles empty buffer', () => {
    expect(extractPhotoFromPDF(Buffer.alloc(0))).toBeNull();
  });
});

/* ─── extractPhotoFromDOCX ─── */

describe('extractPhotoFromDOCX', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require('adm-zip');

  it('extracts JPEG from word/media/ in DOCX', () => {
    const zip = new AdmZip();
    const jpeg = makeJPEG(10000);
    zip.addFile('word/media/image1.jpg', jpeg);
    zip.addFile('word/document.xml', Buffer.from('<w:document>Test</w:document>'));

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/jpeg');
    expect(result!.data.length).toBe(jpeg.length);
  });

  it('extracts PNG from word/media/ in DOCX', () => {
    const zip = new AdmZip();
    const png = makePNG(10000);
    zip.addFile('word/media/image1.png', png);
    zip.addFile('word/document.xml', Buffer.from('<w:document>Test</w:document>'));

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe('image/png');
  });

  it('prefers largest image in DOCX', () => {
    const zip = new AdmZip();
    const small = makeJPEG(4000);
    const large = makeJPEG(20000);
    zip.addFile('word/media/small.jpg', small);
    zip.addFile('word/media/large.jpg', large);

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).not.toBeNull();
    expect(result!.data.length).toBe(large.length);
  });

  it('skips EMF/WMF files in DOCX media', () => {
    const zip = new AdmZip();
    zip.addFile('word/media/image1.emf', Buffer.alloc(10000, 0x42));
    zip.addFile('word/media/image2.wmf', Buffer.alloc(10000, 0x42));

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).toBeNull();
  });

  it('skips tiny images (icons/logos) in DOCX', () => {
    const zip = new AdmZip();
    const tiny = makeJPEG(500);
    zip.addFile('word/media/icon.jpg', tiny);

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).toBeNull();
  });

  it('returns null for non-ZIP buffer', () => {
    const result = extractPhotoFromDOCX(Buffer.from('not a zip file'));
    expect(result).toBeNull();
  });

  it('returns null for DOCX with no media directory', () => {
    const zip = new AdmZip();
    zip.addFile('word/document.xml', Buffer.from('<w:document>Hello</w:document>'));

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).toBeNull();
  });

  it('handles JPEG and PNG mixed in DOCX', () => {
    const zip = new AdmZip();
    const jpeg = makeJPEG(5000);
    const png = makePNG(15000);
    zip.addFile('word/media/photo.jpg', jpeg);
    zip.addFile('word/media/banner.png', png);

    const result = extractPhotoFromDOCX(zip.toBuffer());
    expect(result).not.toBeNull();
    // Largest wins
    expect(result!.mimeType).toBe('image/png');
    expect(result!.data.length).toBe(png.length);
  });
});

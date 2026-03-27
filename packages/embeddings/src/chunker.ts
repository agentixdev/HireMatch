export interface Chunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    section?: string;
    index: number;
    totalChunks: number;
    charCount: number;
  };
}

export type ChunkStrategy = "sections" | "paragraphs" | "fixed_size";

export interface ChunkOptions {
  /** Max characters per chunk (default: 2000) */
  maxChunkSize?: number;
  /** Overlap in characters between chunks (default: 200) */
  overlap?: number;
  /** Minimum chunk size to keep (default: 50) */
  minChunkSize?: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 2000;
const DEFAULT_OVERLAP = 200;
const DEFAULT_MIN_CHUNK_SIZE = 50;

/**
 * Chunk a CV into sections based on common resume headers.
 */
export function chunkCV(text: string, documentId: string, options?: ChunkOptions): Chunk[] {
  const sectionHeaders = [
    /^(?:summary|profile|objective|about\s*me)/im,
    /^(?:experience|work\s*experience|employment|professional\s*experience)/im,
    /^(?:education|academic|qualifications)/im,
    /^(?:skills|technical\s*skills|competencies|technologies)/im,
    /^(?:certifications?|licenses?|certificates?)/im,
    /^(?:projects?|portfolio)/im,
    /^(?:languages?)/im,
    /^(?:interests?|hobbies|activities)/im,
    /^(?:references?)/im,
    /^(?:publications?|papers?)/im,
    /^(?:awards?|honors?|achievements?)/im,
    /^(?:volunteer|community)/im,
  ];

  const lines = text.split("\n");
  const sections: { header: string; content: string }[] = [];
  let currentHeader = "header";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = sectionHeaders.some((rx) => rx.test(trimmed));

    if (isHeader && currentContent.length > 0) {
      sections.push({
        header: currentHeader,
        content: currentContent.join("\n").trim(),
      });
      currentHeader = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      header: currentHeader,
      content: currentContent.join("\n").trim(),
    });
  }

  // Further split large sections
  const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const minSize = options?.minChunkSize ?? DEFAULT_MIN_CHUNK_SIZE;
  const allChunks: Chunk[] = [];

  for (const section of sections) {
    if (section.content.length <= minSize) continue;

    if (section.content.length <= maxSize) {
      allChunks.push({
        id: `${documentId}:${section.header}:${allChunks.length}`,
        text: section.content,
        metadata: {
          source: documentId,
          section: section.header,
          index: allChunks.length,
          totalChunks: 0, // filled later
          charCount: section.content.length,
        },
      });
    } else {
      const subChunks = chunkFixedSize(section.content, documentId, options);
      for (const sub of subChunks) {
        sub.metadata.section = section.header;
        sub.id = `${documentId}:${section.header}:${allChunks.length}`;
        sub.metadata.index = allChunks.length;
        allChunks.push(sub);
      }
    }
  }

  // Update total counts
  for (const chunk of allChunks) {
    chunk.metadata.totalChunks = allChunks.length;
  }

  return allChunks;
}

/**
 * Chunk a job description into sections.
 */
export function chunkJobDescription(text: string, documentId: string, options?: ChunkOptions): Chunk[] {
  const sectionHeaders = [
    /^(?:about|company|who\s*we\s*are)/im,
    /^(?:role|position|job\s*title|the\s*role)/im,
    /^(?:responsibilities|duties|what\s*you.*do)/im,
    /^(?:requirements?|qualifications?|what\s*we.*looking)/im,
    /^(?:benefits?|perks|what\s*we\s*offer|compensation)/im,
    /^(?:nice\s*to\s*have|preferred|bonus)/im,
    /^(?:how\s*to\s*apply|application|next\s*steps)/im,
  ];

  const lines = text.split("\n");
  const sections: { header: string; content: string }[] = [];
  let currentHeader = "overview";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = sectionHeaders.some((rx) => rx.test(trimmed));

    if (isHeader && currentContent.length > 0) {
      sections.push({
        header: currentHeader,
        content: currentContent.join("\n").trim(),
      });
      currentHeader = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      header: currentHeader,
      content: currentContent.join("\n").trim(),
    });
  }

  const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const minSize = options?.minChunkSize ?? DEFAULT_MIN_CHUNK_SIZE;
  const allChunks: Chunk[] = [];

  for (const section of sections) {
    if (section.content.length <= minSize) continue;

    allChunks.push({
      id: `${documentId}:${section.header}:${allChunks.length}`,
      text: section.content.slice(0, maxSize),
      metadata: {
        source: documentId,
        section: section.header,
        index: allChunks.length,
        totalChunks: 0,
        charCount: Math.min(section.content.length, maxSize),
      },
    });
  }

  for (const chunk of allChunks) {
    chunk.metadata.totalChunks = allChunks.length;
  }

  return allChunks;
}

/**
 * Chunk visa rules text by paragraphs.
 */
export function chunkVisaRules(text: string, documentId: string, options?: ChunkOptions): Chunk[] {
  return chunkByParagraphs(text, documentId, options);
}

/**
 * Chunk text by paragraphs (double newline delimited).
 */
export function chunkByParagraphs(text: string, documentId: string, options?: ChunkOptions): Chunk[] {
  const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const minSize = options?.minChunkSize ?? DEFAULT_MIN_CHUNK_SIZE;
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length >= minSize);

  const chunks: Chunk[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if (buffer.length + para.length + 2 > maxSize && buffer.length > 0) {
      chunks.push({
        id: `${documentId}:para:${chunks.length}`,
        text: buffer.trim(),
        metadata: {
          source: documentId,
          index: chunks.length,
          totalChunks: 0,
          charCount: buffer.trim().length,
        },
      });
      buffer = "";
    }
    buffer += (buffer ? "\n\n" : "") + para;
  }

  if (buffer.trim().length >= minSize) {
    chunks.push({
      id: `${documentId}:para:${chunks.length}`,
      text: buffer.trim(),
      metadata: {
        source: documentId,
        index: chunks.length,
        totalChunks: 0,
        charCount: buffer.trim().length,
      },
    });
  }

  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }

  return chunks;
}

/**
 * Chunk text into fixed-size windows with overlap.
 */
export function chunkFixedSize(text: string, documentId: string, options?: ChunkOptions): Chunk[] {
  const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;
  const minSize = options?.minChunkSize ?? DEFAULT_MIN_CHUNK_SIZE;

  if (text.length <= maxSize) {
    return [{
      id: `${documentId}:fixed:0`,
      text,
      metadata: { source: documentId, index: 0, totalChunks: 1, charCount: text.length },
    }];
  }

  const chunks: Chunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // Try to break at a sentence or word boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf(". ", end);
      if (lastSentence > start + maxSize * 0.5) {
        end = lastSentence + 2;
      } else {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > start + maxSize * 0.5) {
          end = lastSpace + 1;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= minSize) {
      chunks.push({
        id: `${documentId}:fixed:${chunks.length}`,
        text: chunk,
        metadata: {
          source: documentId,
          index: chunks.length,
          totalChunks: 0,
          charCount: chunk.length,
        },
      });
    }

    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end; // Prevent backward/stalled progress
    if (start >= text.length - minSize) break;
  }

  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }

  return chunks;
}

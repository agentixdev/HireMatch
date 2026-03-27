import {
  chunkCV,
  chunkJobDescription,
  chunkVisaRules,
  chunkFixedSize,
  chunkByParagraphs,
} from '../chunker';

const sampleCV = ['John Doe', 'Senior Software Engineer', '', 'Summary', 'Experienced full-stack developer with 10+ years building scalable web applications.', 'Passionate about clean code and test-driven development.', '', 'Experience', 'Lead Engineer at TechCorp (2020-present)', 'Led a team of 8 developers building a microservices platform.', 'Implemented CI/CD pipelines reducing deployment time by 70%.', '', 'Senior Developer at StartupXYZ (2017-2020)', 'Built the core e-commerce platform from scratch using Node.js and React.', 'Scaled the system to handle 100K concurrent users.', '', 'Education', 'MS Computer Science, MIT (2015)', 'BS Computer Science, Stanford (2013)', '', 'Skills', 'JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Redis, AWS, Docker, Kubernetes', '', 'Certifications', 'AWS Solutions Architect Professional', 'Google Cloud Professional Data Engineer'].join('\n');

const sampleJD = ['About Us', 'TechCorp is a leading SaaS company serving 10,000+ businesses worldwide.', '', 'The Role', 'We are looking for a Senior Backend Engineer to join our platform team.', '', 'Requirements', '5+ years of backend development experience with strong proficiency in TypeScript and Node.js and experience with PostgreSQL and Redis.', '', 'Nice to Have', 'Experience with Kubernetes and familiarity with GraphQL and open source contributions.', '', 'Benefits', 'Competitive salary, equity, unlimited PTO, remote-first culture.'].join('\n');

describe('chunkCV()', () => {
  it('splits CV into multiple sections', () => {
    const chunks = chunkCV(sampleCV, 'cv-1');
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk has correct metadata', () => {
    const chunks = chunkCV(sampleCV, 'cv-1');
    for (const chunk of chunks) {
      expect(chunk.metadata.source).toBe('cv-1');
      expect(chunk.metadata.totalChunks).toBe(chunks.length);
      expect(chunk.metadata.charCount).toBe(chunk.text.length);
    }
  });

  it('returns empty array for empty input', () => {
    expect(chunkCV('', 'cv-empty')).toEqual([]);
  });

  it('returns empty array for very short content', () => {
    expect(chunkCV('Hi', 'cv-short', { minChunkSize: 50 })).toEqual([]);
  });

  it('each chunk is under max size', () => {
    const chunks = chunkCV(sampleCV, 'cv-1', { maxChunkSize: 500 });
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(500);
    }
  });
});

describe('chunkJobDescription()', () => {
  it('splits JD into sections', () => {
    const chunks = chunkJobDescription(sampleJD, 'jd-1');
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('each chunk has source metadata', () => {
    const chunks = chunkJobDescription(sampleJD, 'jd-1');
    for (const chunk of chunks) {
      expect(chunk.metadata.source).toBe('jd-1');
      expect(chunk.metadata.totalChunks).toBe(chunks.length);
    }
  });

  it('returns empty array for empty input', () => {
    expect(chunkJobDescription('', 'jd-empty')).toEqual([]);
  });
});

describe('chunkVisaRules()', () => {
  const visaText = 'H-1B Visa Overview - The H-1B visa is a non-immigrant visa that allows US employers to employ foreign workers in specialty occupations. The annual cap is 65,000 visas.\n\nApplication Process - Step 1: Employer files Labor Condition Application with the DOL. The employer must attest to paying the prevailing wage for the position.\n\nRequired Documents - Valid passport, degree certificates, employment letter, LCA approval, I-797 approval notice, and supporting documentation.';

  it('chunks visa rules text', () => {
    const chunks = chunkVisaRules(visaText, 'visa-1', { minChunkSize: 20 });
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('each chunk has correct source', () => {
    const chunks = chunkVisaRules(visaText, 'visa-1', { minChunkSize: 20 });
    for (const chunk of chunks) {
      expect(chunk.metadata.source).toBe('visa-1');
    }
  });

  it('returns empty array for empty content', () => {
    expect(chunkVisaRules('', 'visa-empty')).toEqual([]);
  });
});

describe('chunkFixedSize()', () => {
  it('returns single chunk for short text', () => {
    const text = 'Short text content here that is long enough to pass minimum size check for chunking.';
    const chunks = chunkFixedSize(text, 'doc-1', { maxChunkSize: 2000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.totalChunks).toBe(1);
  });

  it('splits text exceeding max size into multiple chunks', () => {
    const text = 'Sentence contains meaningful content for testing the chunking algorithm. '.repeat(20);
    const chunks = chunkFixedSize(text, 'doc-2', { maxChunkSize: 500, overlap: 50, minChunkSize: 20 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('chunk IDs are unique', () => {
    const text = 'Paragraph with enough content to make chunking work properly. '.repeat(10);
    const chunks = chunkFixedSize(text, 'doc-3', { maxChunkSize: 300, overlap: 50, minChunkSize: 20 });
    const ids = chunks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('chunkByParagraphs()', () => {
  it('splits text by double newlines', () => {
    const text = 'Paragraph one about visas and work permits for international employees.\n\nParagraph two about work permits and residency requirements for foreign nationals.\n\nParagraph three about residency paths for skilled workers.';
    const chunks = chunkByParagraphs(text, 'doc-para', { minChunkSize: 10 });
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('returns empty for empty input', () => {
    expect(chunkByParagraphs('', 'doc-empty')).toEqual([]);
  });
});

import { QUEUE_NAMES } from '../types';
import type {
  ScrapeJobPayload,
  EmbedJobPayload,
  WebhookDeliverPayload,
  QueuePayloadMap,
} from '../types';

// Since the actual producer functions depend on BullMQ + Redis,
// we test the payload structures and queue name mapping.

describe('ScrapeJobPayload', () => {
  const payload: ScrapeJobPayload = {
    sourceId: 'src-1',
    url: 'https://example.com/jobs',
    country: 'US',
    category: 'tech',
    orgId: 'org-1',
    retryCount: 0,
    metadata: { priority: 'high' },
  };

  it('has required fields', () => {
    expect(payload.sourceId).toBe('src-1');
    expect(payload.url).toBe('https://example.com/jobs');
    expect(payload.country).toBe('US');
    expect(payload.category).toBe('tech');
  });

  it('maps to correct queue based on priority', () => {
    // High priority -> scrape:high
    expect(QUEUE_NAMES.SCRAPE_HIGH).toBe('scrape:high');
    // Standard priority -> scrape:standard
    expect(QUEUE_NAMES.SCRAPE_STANDARD).toBe('scrape:standard');
    // Low priority -> scrape:low
    expect(QUEUE_NAMES.SCRAPE_LOW).toBe('scrape:low');
  });

  it('includes optional metadata', () => {
    expect(payload.metadata).toEqual({ priority: 'high' });
    expect(payload.orgId).toBe('org-1');
  });
});

describe('EmbedJobPayload', () => {
  const payload: EmbedJobPayload = {
    documentId: 'doc-1',
    documentType: 'cv',
    content: 'Senior software engineer with 10 years experience...',
    chunkStrategy: 'sections',
    metadata: { country: 'US', locale: 'en', orgId: 'org-1' },
  };

  it('has required fields', () => {
    expect(payload.documentId).toBe('doc-1');
    expect(payload.documentType).toBe('cv');
    expect(payload.content).toBeDefined();
    expect(payload.chunkStrategy).toBe('sections');
  });

  it('maps to embed:process queue', () => {
    expect(QUEUE_NAMES.EMBED_PROCESS).toBe('embed:process');
  });

  it('supports all document types', () => {
    const types: EmbedJobPayload['documentType'][] = ['cv', 'job', 'visa_rule', 'scrape_result'];
    for (const t of types) {
      const p: EmbedJobPayload = { ...payload, documentType: t };
      expect(p.documentType).toBe(t);
    }
  });

  it('supports all chunk strategies', () => {
    const strategies: EmbedJobPayload['chunkStrategy'][] = ['sections', 'paragraphs', 'fixed_size'];
    for (const s of strategies) {
      const p: EmbedJobPayload = { ...payload, chunkStrategy: s };
      expect(p.chunkStrategy).toBe(s);
    }
  });
});

describe('WebhookDeliverPayload', () => {
  const payload: WebhookDeliverPayload = {
    webhookId: 'wh-1',
    endpointUrl: 'https://example.com/webhook',
    eventType: 'candidate.created',
    payload: { candidateId: 'c-1', name: 'Alice' },
    secret: 'whsec_test123',
    attempt: 1,
    maxAttempts: 5,
    deliveryId: 'del-1',
    orgId: 'org-1',
  };

  it('has required fields', () => {
    expect(payload.webhookId).toBe('wh-1');
    expect(payload.endpointUrl).toBe('https://example.com/webhook');
    expect(payload.eventType).toBe('candidate.created');
    expect(payload.secret).toBeDefined();
    expect(payload.deliveryId).toBe('del-1');
  });

  it('maps to webhook:deliver queue', () => {
    expect(QUEUE_NAMES.WEBHOOK_DELIVER).toBe('webhook:deliver');
  });

  it('tracks attempt and max attempts', () => {
    expect(payload.attempt).toBe(1);
    expect(payload.maxAttempts).toBe(5);
    expect(payload.attempt).toBeLessThanOrEqual(payload.maxAttempts);
  });

  it('payload contains event data', () => {
    expect(payload.payload).toEqual({ candidateId: 'c-1', name: 'Alice' });
  });
});

describe('QueuePayloadMap type consistency', () => {
  it('scrape queues use ScrapeJobPayload', () => {
    const scrapePayload: QueuePayloadMap['scrape:high'] = {
      sourceId: 's1', url: 'https://x.com', country: 'US', category: 'tech',
    };
    const stdPayload: QueuePayloadMap['scrape:standard'] = {
      sourceId: 's2', url: 'https://y.com', country: 'GB', category: 'finance',
    };
    const lowPayload: QueuePayloadMap['scrape:low'] = {
      sourceId: 's3', url: 'https://z.com', country: 'DE', category: 'health',
    };

    expect(scrapePayload.sourceId).toBe('s1');
    expect(stdPayload.sourceId).toBe('s2');
    expect(lowPayload.sourceId).toBe('s3');
  });

  it('embed queue uses EmbedJobPayload', () => {
    const payload: QueuePayloadMap['embed:process'] = {
      documentId: 'd1', documentType: 'job', content: 'test', chunkStrategy: 'paragraphs',
    };
    expect(payload.documentType).toBe('job');
  });

  it('webhook queue uses WebhookDeliverPayload', () => {
    const payload: QueuePayloadMap['webhook:deliver'] = {
      webhookId: 'w1', endpointUrl: 'https://hook.com', eventType: 'job.created',
      payload: {}, secret: 's', attempt: 1, maxAttempts: 5, deliveryId: 'd1', orgId: 'o1',
    };
    expect(payload.eventType).toBe('job.created');
  });
});

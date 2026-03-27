/** Queue names */
export const QUEUE_NAMES = {
  SCRAPE_HIGH: "scrape:high",
  SCRAPE_STANDARD: "scrape:standard",
  SCRAPE_LOW: "scrape:low",
  EMBED_PROCESS: "embed:process",
  WEBHOOK_DELIVER: "webhook:deliver",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Scrape job payload */
export interface ScrapeJobPayload {
  sourceId: string;
  url: string;
  country: string;
  category: string;
  orgId?: string;
  retryCount?: number;
  parentJobId?: string;
  metadata?: Record<string, unknown>;
}

/** Embedding job payload */
export interface EmbedJobPayload {
  documentId: string;
  documentType: "cv" | "job" | "visa_rule" | "scrape_result";
  content: string;
  chunkStrategy: "sections" | "paragraphs" | "fixed_size";
  metadata?: {
    country?: string;
    locale?: string;
    orgId?: string;
    [key: string]: unknown;
  };
}

/** Webhook delivery job payload */
export interface WebhookDeliverPayload {
  webhookId: string;
  endpointUrl: string;
  eventType: string;
  payload: Record<string, unknown>;
  secret: string;
  attempt: number;
  maxAttempts: number;
  deliveryId: string;
  orgId: string;
}

/** Map queue names to their payload types */
export interface QueuePayloadMap {
  "scrape:high": ScrapeJobPayload;
  "scrape:standard": ScrapeJobPayload;
  "scrape:low": ScrapeJobPayload;
  "embed:process": EmbedJobPayload;
  "webhook:deliver": WebhookDeliverPayload;
}

/** Job result types */
export interface ScrapeJobResult {
  sourceId: string;
  url: string;
  success: boolean;
  htmlSize?: number;
  screenshotPath?: string;
  error?: string;
  duration: number;
}

export interface EmbedJobResult {
  documentId: string;
  chunkCount: number;
  embeddingDimension: number;
  duration: number;
}

export interface WebhookDeliverResult {
  deliveryId: string;
  statusCode: number;
  success: boolean;
  responseTime: number;
  attempt: number;
}

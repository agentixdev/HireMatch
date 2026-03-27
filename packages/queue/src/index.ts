// Connection
export {
  createRedisConnection,
  getDefaultConnection,
  toBullMQConnection,
  closeDefaultConnection,
} from "./connection.js";
export type { RedisConfig } from "./connection.js";

// Queue & worker factories
export {
  getQueue,
  createWorker,
  closeAllQueues,
  getQueueMetrics,
} from "./queues.js";

// Types
export {
  QUEUE_NAMES,
} from "./types.js";
export type {
  QueueName,
  QueuePayloadMap,
  ScrapeJobPayload,
  EmbedJobPayload,
  WebhookDeliverPayload,
  ScrapeJobResult,
  EmbedJobResult,
  WebhookDeliverResult,
} from "./types.js";

// Producers
export {
  enqueueScrape,
  enqueueScrapesBatch,
  enqueueEmbedding,
  enqueueWebhookDelivery,
  enqueueDelayed,
} from "./producers.js";

// Dead letter queue
export type { DlqEntry, AlertHandler } from "./dlq.js";
export {
  onDlqAlert,
  handleDeadLetter,
  getFailedJobs,
  retryFailedJob,
  retryAllFailed,
  purgeFailedJobs,
} from "./dlq.js";

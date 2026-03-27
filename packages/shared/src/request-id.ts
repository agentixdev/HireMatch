import crypto from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function getRequestId(headers: Headers): string {
  return headers.get(REQUEST_ID_HEADER) || generateRequestId();
}

export function setRequestIdHeader(headers: Headers, requestId: string): void {
  headers.set(REQUEST_ID_HEADER, requestId);
}

export { REQUEST_ID_HEADER };

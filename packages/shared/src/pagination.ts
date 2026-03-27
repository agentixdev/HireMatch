import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants.js";

/** Cursor pagination input */
export interface CursorInput {
  cursor?: string | null;
  pageSize?: number;
  direction?: "forward" | "backward";
}

/** Cursor pagination result */
export interface CursorResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

/**
 * Encode a cursor from an ID and a timestamp.
 * Format: base64(JSON({ id, ts }))
 */
export function encodeCursor(id: string, timestamp: string | Date): string {
  const ts = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  const payload = JSON.stringify({ id, ts });
  return Buffer.from(payload, "utf-8").toString("base64url");
}

/**
 * Decode a cursor string back to { id, ts }.
 * Returns null if the cursor is invalid.
 */
export function decodeCursor(
  cursor: string
): { id: string; ts: string } | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as { id?: string; ts?: string };
    if (typeof parsed.id !== "string" || typeof parsed.ts !== "string") {
      return null;
    }
    return { id: parsed.id, ts: parsed.ts };
  } catch {
    return null;
  }
}

/**
 * Clamp pageSize to a valid range.
 */
export function clampPageSize(pageSize?: number): number {
  if (!pageSize || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

/**
 * Build a cursor result from a list of items.
 * Expects items to be sorted by (timestamp, id) in the given direction.
 * Pass `requestedSize + 1` items to detect `hasMore`.
 */
export function buildCursorResult<T extends { id: string; createdAt: string }>(
  items: T[],
  requestedSize: number,
  direction: "forward" | "backward" = "forward"
): CursorResult<T> {
  const hasMore = items.length > requestedSize;
  const trimmed = hasMore ? items.slice(0, requestedSize) : items;

  if (direction === "backward") {
    trimmed.reverse();
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  return {
    items: trimmed,
    nextCursor:
      hasMore && last ? encodeCursor(last.id, last.createdAt) : null,
    prevCursor: first ? encodeCursor(first.id, first.createdAt) : null,
    hasMore,
  };
}

/**
 * Build SQL-compatible WHERE clause parts for cursor-based pagination.
 * Returns an object with the condition string and parameter values.
 */
export function cursorWhereClause(
  cursor: string | null | undefined,
  direction: "forward" | "backward" = "forward",
  timestampColumn = "created_at",
  idColumn = "id"
): {
  condition: string | null;
  params: unknown[];
  orderBy: string;
} {
  const order = direction === "forward" ? "DESC" : "ASC";
  const op = direction === "forward" ? "<" : ">";

  if (!cursor) {
    return {
      condition: null,
      params: [],
      orderBy: `${timestampColumn} ${order}, ${idColumn} ${order}`,
    };
  }

  const decoded = decodeCursor(cursor);
  if (!decoded) {
    return {
      condition: null,
      params: [],
      orderBy: `${timestampColumn} ${order}, ${idColumn} ${order}`,
    };
  }

  return {
    condition: `(${timestampColumn}, ${idColumn}) ${op} ($1, $2)`,
    params: [decoded.ts, decoded.id],
    orderBy: `${timestampColumn} ${order}, ${idColumn} ${order}`,
  };
}

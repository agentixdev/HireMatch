/**
 * Lightweight cron expression parser.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 * Also supports common shortcuts: @hourly, @daily, @weekly, @monthly
 */

interface CronFields {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
}

const SHORTCUTS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
  '@every_15m': '*/15 * * * *',
  '@every_30m': '*/30 * * * *',
  '@every_6h': '0 */6 * * *',
  '@every_12h': '0 */12 * * *',
};

/**
 * Parse a single cron field expression into an array of matching values.
 */
function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const trimmed = part.trim();

    // Wildcard
    if (trimmed === '*') {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }

    // Step value: */n or start-end/n
    const stepMatch = trimmed.match(/^(\*|(\d+)-(\d+))\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[4]!, 10);
      const rangeStart = stepMatch[2] ? parseInt(stepMatch[2]!, 10) : min;
      const rangeEnd = stepMatch[3] ? parseInt(stepMatch[3]!, 10) : max;
      for (let i = rangeStart; i <= rangeEnd; i += step) {
        if (i >= min && i <= max) values.add(i);
      }
      continue;
    }

    // Range: start-end
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]!, 10);
      const end = parseInt(rangeMatch[2]!, 10);
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.add(i);
      }
      continue;
    }

    // Single value
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      values.add(num);
    }
  }

  return [...values].sort((a, b) => a - b);
}

/**
 * Parse a cron expression into its component fields.
 */
export function parseCron(expression: string): CronFields {
  const resolved = SHORTCUTS[expression.trim().toLowerCase()] ?? expression.trim();
  const parts = resolved.split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: "${expression}" — expected 5 fields, got ${parts.length}`);
  }

  return {
    minutes: parseField(parts[0]!, 0, 59),
    hours: parseField(parts[1]!, 0, 23),
    daysOfMonth: parseField(parts[2]!, 1, 31),
    months: parseField(parts[3]!, 1, 12),
    daysOfWeek: parseField(parts[4]!, 0, 6),
  };
}

/**
 * Compute the next run time from a given reference date.
 * Returns a Date object for the next matching cron time.
 */
export function computeNextRun(expression: string, fromDate: Date = new Date()): Date {
  const fields = parseCron(expression);
  const next = new Date(fromDate.getTime());

  // Move forward by at least 1 minute
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Iterate through time to find the next match
  // Safety limit: check up to 366 days ahead
  const maxIterations = 366 * 24 * 60;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const month = next.getMonth() + 1; // 1-12
    const dayOfMonth = next.getDate();
    const dayOfWeek = next.getDay(); // 0-6, Sunday = 0
    const hour = next.getHours();
    const minute = next.getMinutes();

    // Check month
    if (!fields.months.includes(month)) {
      // Advance to next valid month
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Check day of month AND day of week
    const domMatch = fields.daysOfMonth.includes(dayOfMonth);
    const dowMatch = fields.daysOfWeek.includes(dayOfWeek);

    // In standard cron, if both DOM and DOW are restricted (not *),
    // either match counts. If only one is restricted, it must match.
    const domIsWild = fields.daysOfMonth.length === 31;
    const dowIsWild = fields.daysOfWeek.length === 7;

    let dayMatch: boolean;
    if (domIsWild && dowIsWild) {
      dayMatch = true;
    } else if (domIsWild) {
      dayMatch = dowMatch;
    } else if (dowIsWild) {
      dayMatch = domMatch;
    } else {
      // Both restricted: OR logic (standard cron behavior)
      dayMatch = domMatch || dowMatch;
    }

    if (!dayMatch) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Check hour
    if (!fields.hours.includes(hour)) {
      // Advance to next valid hour
      const nextHour = fields.hours.find((h) => h > hour);
      if (nextHour !== undefined) {
        next.setHours(nextHour, fields.minutes[0] ?? 0, 0, 0);
      } else {
        // No valid hour left today, go to next day
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
      }
      continue;
    }

    // Check minute
    if (!fields.minutes.includes(minute)) {
      const nextMinute = fields.minutes.find((m) => m > minute);
      if (nextMinute !== undefined) {
        next.setMinutes(nextMinute, 0, 0);
      } else {
        // No valid minute left this hour, go to next hour
        next.setHours(next.getHours() + 1, 0, 0, 0);
      }
      continue;
    }

    // All fields match
    return next;
  }

  // Fallback: shouldn't normally reach here
  throw new Error(`Could not compute next run for "${expression}" within 366 days`);
}

/**
 * Validate a cron expression.
 * Returns true if valid, false otherwise.
 */
export function isValidCron(expression: string): boolean {
  try {
    parseCron(expression);
    return true;
  } catch {
    return false;
  }
}

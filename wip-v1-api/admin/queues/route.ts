import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg } from '../../_lib/auth-helpers';

const QUEUE_NAMES = [
  'scrape:high',
  'scrape:standard',
  'scrape:low',
  'embed:process',
  'webhook:deliver',
  'match:bulk',
  'cv:parse',
];

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (auth.role !== 'admin') {
    return errorResponse(ErrorCode.FORBIDDEN, 'Superadmin access required', 403);
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return successResponse({
      queues: QUEUE_NAMES.map((name) => ({
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        status: 'unknown' as const,
      })),
      message: 'Redis not configured — queue stats unavailable',
    });
  }

  // BullMQ stores queue data in Redis keys: bull:{queueName}:{state}
  const queues = await Promise.all(
    QUEUE_NAMES.map(async (name) => {
      try {
        const headers = { Authorization: `Bearer ${redisToken}` };

        const [waitRes, activeRes, failedRes, delayedRes, completedRes] =
          await Promise.all([
            fetch(`${redisUrl}/llen/bull:${name}:wait`, { headers }),
            fetch(`${redisUrl}/llen/bull:${name}:active`, { headers }),
            fetch(`${redisUrl}/zcard/bull:${name}:failed`, { headers }),
            fetch(`${redisUrl}/zcard/bull:${name}:delayed`, { headers }),
            fetch(`${redisUrl}/get/bull:${name}:completed`, { headers }),
          ]);

        const waiting = waitRes.ok
          ? ((await waitRes.json()) as { result: number }).result || 0
          : 0;
        const active = activeRes.ok
          ? ((await activeRes.json()) as { result: number }).result || 0
          : 0;
        const failed = failedRes.ok
          ? ((await failedRes.json()) as { result: number }).result || 0
          : 0;
        const delayed = delayedRes.ok
          ? ((await delayedRes.json()) as { result: number }).result || 0
          : 0;
        const completed = completedRes.ok
          ? parseInt(String(((await completedRes.json()) as { result: string | null }).result || '0'), 10)
          : 0;

        return {
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          status: 'ok' as const,
        };
      } catch {
        return {
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          status: 'error' as const,
        };
      }
    })
  );

  // Summary
  const totalPending = queues.reduce((sum, q) => sum + q.waiting, 0);
  const totalActive = queues.reduce((sum, q) => sum + q.active, 0);
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);

  return successResponse({
    queues,
    summary: {
      total_pending: totalPending,
      total_active: totalActive,
      total_failed: totalFailed,
      queue_count: queues.length,
    },
  });
}

export const GET = pipeline(handler);

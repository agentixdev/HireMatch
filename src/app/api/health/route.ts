import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {};

  // Check Supabase
  const dbStart = Date.now();
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from('countries').select('code').limit(1);
    checks.database = error
      ? { status: 'error', error: error.message }
      : { status: 'ok', latency: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'error', error: String(err), latency: Date.now() - dbStart };
  }

  // Check env vars
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'STRIPE_SECRET_KEY'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  checks.environment = missingVars.length === 0
    ? { status: 'ok' }
    : { status: 'error', error: `Missing: ${missingVars.join(', ')}` };

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allHealthy ? 200 : 503 });
}

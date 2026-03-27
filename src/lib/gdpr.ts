/**
 * GDPR compliance utilities for HireMatch.
 * Provides tenant data export, soft-delete (anonymization), and hard purge.
 */

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key);
}

// Tables that hold org-scoped data
const ORG_TABLES = [
  'candidates',
  'jobs',
  'matches',
  'webhook_endpoints',
  'webhook_deliveries',
  'api_keys',
  'api_usage',
  'organizations',
] as const;

export interface TenantDataExport {
  org_id: string;
  exported_at: string;
  tables: Record<string, unknown[]>;
}

/**
 * Export all data belonging to an organization as a JSON structure.
 * Suitable for GDPR data portability (Article 20).
 */
export async function exportTenantData(orgId: string): Promise<TenantDataExport> {
  const db = getServiceClient();
  const tables: Record<string, unknown[]> = {};

  for (const table of ORG_TABLES) {
    try {
      const { data, error } = await db
        .from(table)
        .select('*')
        .eq('org_id', orgId);

      if (!error && data) {
        tables[table] = data;
      } else {
        tables[table] = [];
      }
    } catch {
      tables[table] = [];
    }
  }

  return {
    org_id: orgId,
    exported_at: new Date().toISOString(),
    tables,
  };
}

/**
 * Soft-delete all org data: set deleted_at and anonymize PII fields.
 * Suitable for GDPR right to erasure (Article 17) with retention period.
 */
export async function deleteTenantData(orgId: string): Promise<{ affected: Record<string, number> }> {
  const db = getServiceClient();
  const now = new Date().toISOString();
  const affected: Record<string, number> = {};

  // Anonymize candidates (PII-heavy)
  try {
    const { data } = await db
      .from('candidates')
      .update({
        full_name: '[REDACTED]',
        email: `redacted-${orgId.slice(0, 8)}@deleted.hirematch.app`,
        phone: null,
        photo_url: null,
        cv_url: null,
        address: null,
        deleted_at: now,
      })
      .eq('org_id', orgId)
      .select('id');
    affected.candidates = data?.length ?? 0;
  } catch {
    affected.candidates = 0;
  }

  // Soft-delete remaining tables
  const softDeleteTables = ['jobs', 'matches', 'webhook_endpoints', 'webhook_deliveries', 'api_keys'] as const;
  for (const table of softDeleteTables) {
    try {
      const { data } = await db
        .from(table)
        .update({ deleted_at: now })
        .eq('org_id', orgId)
        .select('id');
      affected[table] = data?.length ?? 0;
    } catch {
      affected[table] = 0;
    }
  }

  // Mark the organization itself as deleted
  try {
    const { data } = await db
      .from('organizations')
      .update({
        name: '[DELETED ORG]',
        deleted_at: now,
      })
      .eq('id', orgId)
      .select('id');
    affected.organizations = data?.length ?? 0;
  } catch {
    affected.organizations = 0;
  }

  return { affected };
}

/**
 * Hard-delete records that have been soft-deleted longer than the retention period.
 * Typically run as a scheduled job (e.g., 30 or 90 days after soft-delete).
 */
export async function purgeSoftDeleted(retentionDays: number = 30): Promise<{ purged: Record<string, number> }> {
  const db = getServiceClient();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const purged: Record<string, number> = {};

  // Purge in reverse-dependency order (children first)
  const purgeTables = [
    'webhook_deliveries',
    'webhook_endpoints',
    'api_usage',
    'api_keys',
    'matches',
    'candidates',
    'jobs',
    'organizations',
  ] as const;

  for (const table of purgeTables) {
    try {
      const { data } = await db
        .from(table)
        .delete()
        .lt('deleted_at', cutoff)
        .select('id');
      purged[table] = data?.length ?? 0;
    } catch {
      purged[table] = 0;
    }
  }

  return { purged };
}

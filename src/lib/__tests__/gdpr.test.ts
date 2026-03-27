/**
 * @jest-environment node
 *
 * Unit tests for GDPR utilities:
 * - exportTenantData
 * - deleteTenantData
 * - purgeSoftDeleted
 */

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

interface MockCallLog {
  from: string[];
  updates: Array<{ table: string; data: Record<string, unknown> }>;
  deletes: Array<{ table: string; ltField: string; ltValue: string }>;
}

function createMockSupabase(
  dataByTable: Record<string, unknown[]> = {},
  callLog: MockCallLog = { from: [], updates: [], deletes: [] },
) {
  const mockClient = {
    from: jest.fn((table: string) => {
      callLog.from.push(table);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: dataByTable[table] ?? [],
              error: null,
            }),
          ),
          limit: jest.fn(() =>
            Promise.resolve({
              data: dataByTable[table] ?? [],
              error: null,
            }),
          ),
        })),
        update: jest.fn((updateData: Record<string, unknown>) => {
          callLog.updates.push({ table, data: updateData });
          return {
            eq: jest.fn(() => ({
              select: jest.fn(() =>
                Promise.resolve({
                  data: (dataByTable[table] ?? []).map((r) => ({
                    ...(r as Record<string, unknown>),
                    ...updateData,
                  })),
                  error: null,
                }),
              ),
            })),
          };
        }),
        delete: jest.fn(() => ({
          lt: jest.fn((field: string, value: string) => {
            callLog.deletes.push({ table, ltField: field, ltValue: value });
            return {
              select: jest.fn(() =>
                Promise.resolve({
                  data: dataByTable[table] ?? [],
                  error: null,
                }),
              ),
            };
          }),
        })),
      };
    }),
  };

  return mockClient;
}

// ---------------------------------------------------------------------------
// Module loader with mocked Supabase
// ---------------------------------------------------------------------------

function loadGdpr(
  dataByTable: Record<string, unknown[]> = {},
  callLog: MockCallLog = { from: [], updates: [], deletes: [] },
) {
  const mockClient = createMockSupabase(dataByTable, callLog);

  jest.resetModules();
  jest.doMock('@supabase/supabase-js', () => ({
    createClient: () => mockClient,
  }));

  // Ensure required env vars are set
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/lib/gdpr') as typeof import('@/lib/gdpr');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GDPR — exportTenantData', () => {
  it('queries all 8 tables and returns structured data', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr(
      {
        candidates: [{ id: 'c1', full_name: 'Alice' }],
        jobs: [{ id: 'j1', title: 'Engineer' }],
        matches: [{ id: 'm1' }],
        webhook_endpoints: [],
        webhook_deliveries: [],
        api_keys: [{ id: 'ak1' }],
        api_usage: [],
        organizations: [{ id: 'org-1', name: 'TestCo' }],
      },
      callLog,
    );

    const result = await gdpr.exportTenantData('org-1');

    expect(result.org_id).toBe('org-1');
    expect(result.exported_at).toBeDefined();
    expect(typeof result.exported_at).toBe('string');

    // All 8 tables should be present
    const expectedTables = [
      'candidates',
      'jobs',
      'matches',
      'webhook_endpoints',
      'webhook_deliveries',
      'api_keys',
      'api_usage',
      'organizations',
    ];
    for (const table of expectedTables) {
      expect(result.tables).toHaveProperty(table);
    }

    expect(result.tables.candidates).toHaveLength(1);
    expect(result.tables.jobs).toHaveLength(1);
    expect(result.tables.api_keys).toHaveLength(1);

    // Verify all 8 tables were queried
    expect(callLog.from).toHaveLength(8);
  });

  it('handles empty org (no data in any table)', async () => {
    const gdpr = loadGdpr({});

    const result = await gdpr.exportTenantData('org-empty');

    expect(result.org_id).toBe('org-empty');
    for (const table of Object.values(result.tables)) {
      expect(table).toEqual([]);
    }
  });

  it('handles table query errors gracefully (returns empty array)', async () => {
    jest.resetModules();

    // Create a mock where some tables throw
    const throwingClient = {
      from: jest.fn((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => {
            if (table === 'matches') {
              return Promise.resolve({ data: null, error: { message: 'table not found' } });
            }
            return Promise.resolve({ data: [{ id: '1' }], error: null });
          }),
        })),
      })),
    };

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: () => throwingClient,
    }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const gdpr = require('@/lib/gdpr');
    const result = await gdpr.exportTenantData('org-err');

    // matches should be empty array due to error
    expect(result.tables.matches).toEqual([]);
    // Other tables should have data
    expect(result.tables.candidates).toHaveLength(1);
  });
});

describe('GDPR — deleteTenantData', () => {
  it('soft-deletes and anonymizes PII in candidates', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr(
      {
        candidates: [
          { id: 'c1', full_name: 'Alice Smith', email: 'alice@example.com' },
          { id: 'c2', full_name: 'Bob Jones', email: 'bob@example.com' },
        ],
        jobs: [{ id: 'j1' }],
        matches: [],
        webhook_endpoints: [],
        webhook_deliveries: [],
        api_keys: [],
        organizations: [{ id: 'org-1' }],
      },
      callLog,
    );

    const result = await gdpr.deleteTenantData('org-1');

    expect(result.affected).toBeDefined();
    expect(result.affected.candidates).toBe(2);

    // Check that candidates update included anonymization fields
    const candidateUpdate = callLog.updates.find((u) => u.table === 'candidates');
    expect(candidateUpdate).toBeDefined();
    expect(candidateUpdate!.data.full_name).toBe('[REDACTED]');
    expect(candidateUpdate!.data.email).toContain('redacted-');
    expect(candidateUpdate!.data.email).toContain('@deleted.hirematch.app');
    expect(candidateUpdate!.data.phone).toBeNull();
    expect(candidateUpdate!.data.photo_url).toBeNull();
    expect(candidateUpdate!.data.cv_url).toBeNull();
    expect(candidateUpdate!.data.deleted_at).toBeDefined();
  });

  it('soft-deletes jobs, matches, webhooks, and api_keys', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr(
      {
        candidates: [],
        jobs: [{ id: 'j1' }],
        matches: [{ id: 'm1' }],
        webhook_endpoints: [{ id: 'we1' }],
        webhook_deliveries: [{ id: 'wd1' }],
        api_keys: [{ id: 'ak1' }],
        organizations: [{ id: 'org-1' }],
      },
      callLog,
    );

    const result = await gdpr.deleteTenantData('org-1');

    // All tables should have been updated
    expect(result.affected.jobs).toBe(1);
    expect(result.affected.matches).toBe(1);
    expect(result.affected.webhook_endpoints).toBe(1);
    expect(result.affected.webhook_deliveries).toBe(1);
    expect(result.affected.api_keys).toBe(1);

    // Check soft-delete tables got deleted_at
    const softDeleteTables = ['jobs', 'matches', 'webhook_endpoints', 'webhook_deliveries', 'api_keys'];
    for (const table of softDeleteTables) {
      const upd = callLog.updates.find((u) => u.table === table);
      expect(upd).toBeDefined();
      expect(upd!.data.deleted_at).toBeDefined();
    }
  });

  it('marks the organization itself as deleted with name [DELETED ORG]', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr(
      {
        candidates: [],
        jobs: [],
        matches: [],
        webhook_endpoints: [],
        webhook_deliveries: [],
        api_keys: [],
        organizations: [{ id: 'org-1', name: 'TestCo' }],
      },
      callLog,
    );

    const result = await gdpr.deleteTenantData('org-1');
    expect(result.affected.organizations).toBe(1);

    const orgUpdate = callLog.updates.find((u) => u.table === 'organizations');
    expect(orgUpdate).toBeDefined();
    expect(orgUpdate!.data.name).toBe('[DELETED ORG]');
    expect(orgUpdate!.data.deleted_at).toBeDefined();
  });
});

describe('GDPR — purgeSoftDeleted', () => {
  it('deletes in correct dependency order (children first)', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr(
      {
        webhook_deliveries: [{ id: 'wd1' }],
        webhook_endpoints: [{ id: 'we1' }],
        api_usage: [{ id: 'au1' }],
        api_keys: [{ id: 'ak1' }],
        matches: [{ id: 'm1' }],
        candidates: [{ id: 'c1' }],
        jobs: [{ id: 'j1' }],
        organizations: [{ id: 'org-1' }],
      },
      callLog,
    );

    const result = await gdpr.purgeSoftDeleted(30);
    expect(result.purged).toBeDefined();

    // Verify deletion order: children before parents
    const deleteOrder = callLog.deletes.map((d) => d.table);
    expect(deleteOrder).toEqual([
      'webhook_deliveries',
      'webhook_endpoints',
      'api_usage',
      'api_keys',
      'matches',
      'candidates',
      'jobs',
      'organizations',
    ]);
  });

  it('respects retention period (uses cutoff date)', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr({}, callLog);

    const beforeCall = Date.now();
    await gdpr.purgeSoftDeleted(90);

    // Each delete should use deleted_at < cutoff
    for (const del of callLog.deletes) {
      expect(del.ltField).toBe('deleted_at');
      // Cutoff should be approximately now - 90 days
      const cutoffDate = new Date(del.ltValue).getTime();
      const expectedCutoff = beforeCall - 90 * 24 * 60 * 60 * 1000;
      // Allow 5 second tolerance
      expect(Math.abs(cutoffDate - expectedCutoff)).toBeLessThan(5000);
    }
  });

  it('defaults to 30-day retention when no argument given', async () => {
    const callLog: MockCallLog = { from: [], updates: [], deletes: [] };
    const gdpr = loadGdpr({}, callLog);

    const beforeCall = Date.now();
    await gdpr.purgeSoftDeleted();

    for (const del of callLog.deletes) {
      const cutoffDate = new Date(del.ltValue).getTime();
      const expectedCutoff = beforeCall - 30 * 24 * 60 * 60 * 1000;
      expect(Math.abs(cutoffDate - expectedCutoff)).toBeLessThan(5000);
    }
  });
});

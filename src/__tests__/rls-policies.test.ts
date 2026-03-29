/**
 * @jest-environment node
 *
 * Integration-Style Tests: RLS Policies Migration
 *
 * Verifies the 008_indexes_and_rls.sql migration file:
 * - Contains expected SQL statements
 * - RLS is enabled on webhook_configs, webhook_deliveries, webhook_events
 * - Policies exist for each table with correct access patterns
 * - Indexes are created with IF NOT EXISTS
 * - Documents expected RLS behavior
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('RLS Policies Migration (008_indexes_and_rls.sql)', () => {
  let migrationSql: string;

  beforeAll(() => {
    migrationSql = readFileSync(
      join(__dirname, '../../supabase/migrations/008_indexes_and_rls.sql'),
      'utf-8'
    );
  });

  // =========================================================================
  // Migration file exists and is valid
  // =========================================================================

  describe('Migration file', () => {
    it('exists and is non-empty', () => {
      expect(migrationSql).toBeDefined();
      expect(migrationSql.length).toBeGreaterThan(0);
    });

    it('contains SQL comments documenting its purpose', () => {
      expect(migrationSql).toContain('indexes');
      expect(migrationSql).toContain('RLS');
    });
  });

  // =========================================================================
  // Row Level Security is enabled
  // =========================================================================

  describe('Row Level Security', () => {
    it('enables RLS on webhook_configs', () => {
      expect(migrationSql).toContain(
        'ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY'
      );
    });

    it('enables RLS on webhook_deliveries', () => {
      expect(migrationSql).toContain(
        'ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY'
      );
    });

    it('enables RLS on webhook_events', () => {
      expect(migrationSql).toContain(
        'ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY'
      );
    });

    it('enables RLS on all three webhook tables and no others', () => {
      const rlsStatements = migrationSql
        .split('\n')
        .filter((line) => line.includes('ENABLE ROW LEVEL SECURITY'));

      expect(rlsStatements).toHaveLength(3);
    });
  });

  // =========================================================================
  // Policies exist for each table
  // =========================================================================

  describe('Policies', () => {
    describe('webhook_configs policy', () => {
      it('creates a policy named webhook_configs_recruiter_manage', () => {
        expect(migrationSql).toContain(
          'CREATE POLICY webhook_configs_recruiter_manage ON webhook_configs'
        );
      });

      it('applies to ALL operations (SELECT, INSERT, UPDATE, DELETE)', () => {
        expect(migrationSql).toMatch(
          /CREATE POLICY webhook_configs_recruiter_manage ON webhook_configs\s+FOR ALL/
        );
      });

      it('restricts access via recruiter_id linked to auth.uid()', () => {
        expect(migrationSql).toContain('auth.uid()');
        expect(migrationSql).toMatch(
          /webhook_configs_recruiter_manage[\s\S]*?recruiter_id\s+IN\s*\(\s*SELECT\s+id\s+FROM\s+recruiters\s+WHERE\s+user_id\s*=\s*auth\.uid\(\)\s*\)/
        );
      });

      /**
       * Expected RLS behavior for webhook_configs:
       * - A recruiter can only CRUD their own webhook configurations
       * - The policy checks that the webhook_config recruiter_id matches a recruiter
       *   whose user_id equals the authenticated Supabase user
       * - Service role (used by backend) bypasses RLS entirely
       */
      it('documents: recruiters can only manage their own webhook configs', () => {
        const policyMatch = migrationSql.match(
          /CREATE POLICY webhook_configs_recruiter_manage[\s\S]*?;/
        );
        expect(policyMatch).not.toBeNull();
        expect(policyMatch![0]).toContain('FOR ALL');
        expect(policyMatch![0]).toContain('USING');
      });
    });

    describe('webhook_deliveries policy', () => {
      it('creates a policy named webhook_deliveries_recruiter_view', () => {
        expect(migrationSql).toContain(
          'CREATE POLICY webhook_deliveries_recruiter_view ON webhook_deliveries'
        );
      });

      it('applies to SELECT only (read-only access for recruiters)', () => {
        expect(migrationSql).toMatch(
          /CREATE POLICY webhook_deliveries_recruiter_view ON webhook_deliveries\s+FOR SELECT/
        );
      });

      it('uses a nested subquery through webhook_configs to recruiters', () => {
        expect(migrationSql).toMatch(
          /webhook_deliveries_recruiter_view[\s\S]*?webhook_config_id\s+IN\s*\(/
        );
        expect(migrationSql).toMatch(
          /webhook_deliveries_recruiter_view[\s\S]*?SELECT\s+id\s+FROM\s+webhook_configs\s+WHERE\s+recruiter_id\s+IN/
        );
      });

      /**
       * Expected RLS behavior for webhook_deliveries:
       * - Recruiters can only VIEW delivery logs for their own webhook configs
       * - They cannot INSERT/UPDATE/DELETE delivery records (only the service role can)
       * - Access is validated through: delivery -> config -> recruiter -> auth.uid()
       */
      it('documents: recruiters can only view deliveries for their own configs', () => {
        const policyMatch = migrationSql.match(
          /CREATE POLICY webhook_deliveries_recruiter_view[\s\S]*?;/
        );
        expect(policyMatch).not.toBeNull();
        expect(policyMatch![0]).toContain('FOR SELECT');
        expect(policyMatch![0]).toContain('USING');
        // No INSERT/UPDATE/DELETE policy should exist for deliveries
        expect(migrationSql).not.toContain(
          'webhook_deliveries_recruiter_insert'
        );
        expect(migrationSql).not.toContain(
          'webhook_deliveries_recruiter_update'
        );
        expect(migrationSql).not.toContain(
          'webhook_deliveries_recruiter_delete'
        );
      });
    });

    describe('webhook_events policy', () => {
      it('creates a policy named webhook_events_recruiter_view', () => {
        expect(migrationSql).toContain(
          'CREATE POLICY webhook_events_recruiter_view ON webhook_events'
        );
      });

      it('applies to SELECT only', () => {
        expect(migrationSql).toMatch(
          /CREATE POLICY webhook_events_recruiter_view ON webhook_events\s+FOR SELECT/
        );
      });

      it('restricts access via org_id linked to recruiter user_id', () => {
        expect(migrationSql).toMatch(
          /webhook_events_recruiter_view[\s\S]*?org_id\s+IN\s*\(\s*SELECT\s+id\s+FROM\s+recruiters\s+WHERE\s+user_id\s*=\s*auth\.uid\(\)\s*\)/
        );
      });

      /**
       * Expected RLS behavior for webhook_events:
       * - Recruiters can only VIEW events belonging to their organization
       * - org_id maps to the recruiter id, verified through auth.uid()
       * - No write access for recruiters (events are system-generated)
       */
      it('documents: recruiters can only view events for their own org', () => {
        const policyMatch = migrationSql.match(
          /CREATE POLICY webhook_events_recruiter_view[\s\S]*?;/
        );
        expect(policyMatch).not.toBeNull();
        expect(policyMatch![0]).toContain('FOR SELECT');
      });
    });

    describe('Policy count', () => {
      it('creates exactly 3 policies', () => {
        const policyStatements = migrationSql
          .split('\n')
          .filter((line) => line.trim().startsWith('CREATE POLICY'));

        expect(policyStatements).toHaveLength(3);
      });

      it('all policies use auth.uid() for user verification', () => {
        const authUidCount = (migrationSql.match(/auth\.uid\(\)/g) || []).length;
        expect(authUidCount).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // =========================================================================
  // Indexes
  // =========================================================================

  describe('Indexes', () => {
    it('creates index on recruiters.stripe_customer_id', () => {
      expect(migrationSql).toContain('idx_recruiters_stripe_customer_id');
      expect(migrationSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_recruiters_stripe_customer_id ON recruiters\(stripe_customer_id\)/
      );
    });

    it('creates index on recruiters.stripe_subscription_id', () => {
      expect(migrationSql).toContain('idx_recruiters_stripe_subscription_id');
      expect(migrationSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_recruiters_stripe_subscription_id ON recruiters\(stripe_subscription_id\)/
      );
    });

    it('creates index on webhook_configs.is_active', () => {
      expect(migrationSql).toContain('idx_webhook_configs_is_active');
      expect(migrationSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_webhook_configs_is_active ON webhook_configs\(is_active\)/
      );
    });

    it('creates index on webhook_deliveries(webhook_config_id, status)', () => {
      expect(migrationSql).toContain('idx_webhook_deliveries_config_status');
      expect(migrationSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config_status ON webhook_deliveries\(webhook_config_id,\s*status\)/
      );
    });

    it('creates index on candidates(user_id, is_public)', () => {
      expect(migrationSql).toContain('idx_candidates_user_id_public');
      expect(migrationSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_candidates_user_id_public ON candidates\(user_id,\s*is_public\)/
      );
    });

    it('creates index on visa_rules.country_code', () => {
      expect(migrationSql).toContain('idx_visa_rules_country_code');
      expect(migrationSql).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_visa_rules_country_code ON visa_rules\(country_code\)/
      );
    });

    it('all indexes use IF NOT EXISTS for idempotent migrations', () => {
      const indexLines = migrationSql
        .split('\n')
        .filter((line) => line.trim().startsWith('CREATE INDEX'));

      expect(indexLines.length).toBeGreaterThan(0);
      for (const line of indexLines) {
        expect(line).toContain('IF NOT EXISTS');
      }
    });

    it('creates exactly 6 indexes', () => {
      const indexLines = migrationSql
        .split('\n')
        .filter((line) => line.trim().startsWith('CREATE INDEX'));

      expect(indexLines).toHaveLength(6);
    });
  });

  // =========================================================================
  // Security model documentation
  // =========================================================================

  describe('Security model documentation', () => {
    /**
     * The webhook RLS model follows a hierarchical ownership pattern:
     *
     * auth.uid() -> recruiters.user_id -> recruiters.id -> webhook_configs.recruiter_id
     *                                                    -> webhook_events.org_id
     *                                                    -> webhook_configs.id -> webhook_deliveries.webhook_config_id
     *
     * This ensures:
     * 1. No cross-tenant data access
     * 2. Deliveries are only readable through config ownership
     * 3. Events are only readable through org membership
     * 4. Only service role can write deliveries and events
     */
    it('webhook_configs uses FOR ALL -- recruiters have full CRUD on their own configs', () => {
      expect(migrationSql).toMatch(/webhook_configs_recruiter_manage[\s\S]*?FOR ALL/);
    });

    it('webhook_deliveries uses FOR SELECT -- recruiters can only read delivery logs', () => {
      expect(migrationSql).toMatch(/webhook_deliveries_recruiter_view[\s\S]*?FOR SELECT/);
    });

    it('webhook_events uses FOR SELECT -- recruiters can only read events', () => {
      expect(migrationSql).toMatch(/webhook_events_recruiter_view[\s\S]*?FOR SELECT/);
    });

    it('no policies grant public/anon access to webhook tables', () => {
      expect(migrationSql).not.toMatch(/USING\s*\(\s*true\s*\)/);
      expect(migrationSql).not.toContain('anon');
    });
  });
});

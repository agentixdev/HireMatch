/**
 * @jest-environment node
 *
 * Integration tests verifying database tables exist and have correct schema.
 * Uses real Supabase connection via service role.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const skip = !SUPABASE_URL || !SUPABASE_SERVICE_KEY;
const supabase = skip ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const test = skip ? it.skip : it;

describe('Database schema (integration)', () => {
  describe('Core tables', () => {
    test('candidates table exists with expected columns', async () => {
      const { data, error } = await supabase!
        .from('candidates')
        .select('id, full_name, email, skills, match_tags, is_public, experience_years')
        .limit(1);

      expect(error).toBeNull();
    }, 10000);

    test('recruiters table exists with matchmaker columns', async () => {
      const { data, error } = await supabase!
        .from('recruiters')
        .select('id, company_name, match_tags, values_dna, work_style, hiring_needs, onboarding_completed_at')
        .limit(1);

      // match_tags, values_dna, work_style, hiring_needs from migration 003
      expect(error).toBeNull();
    }, 10000);

    test('jobs table exists with expected columns', async () => {
      const { data, error } = await supabase!
        .from('jobs')
        .select('id, title, recruiter_id, is_active, skills_required')
        .limit(1);

      expect(error).toBeNull();
    }, 10000);
  });

  describe('Migration 003: Recruiter matchmaker', () => {
    test('recruiter_match_results table exists', async () => {
      const { error } = await supabase!
        .from('recruiter_match_results')
        .select('id, recruiter_id, quiz_answers, candidates, total_scanned, created_at')
        .limit(1);

      expect(error).toBeNull();
    }, 10000);

    test('can insert and read a match result', async () => {
      // Get any recruiter ID for FK
      const { data: recruiters } = await supabase!
        .from('recruiters')
        .select('id')
        .limit(1);

      if (!recruiters?.length) {
        console.warn('No recruiters found — skipping insert test');
        return;
      }

      const testResult = {
        recruiter_id: recruiters[0].id,
        quiz_answers: { job_title: 'Test', must_have_skills: ['TypeScript'] },
        candidates: [{ candidate_id: 'test', score: 85, explanation: 'Good match' }],
        total_scanned: 50,
      };

      const { data: inserted, error: insertError } = await supabase!
        .from('recruiter_match_results')
        .insert(testResult)
        .select('id')
        .single();

      expect(insertError).toBeNull();
      expect(inserted?.id).toBeTruthy();

      // Clean up
      if (inserted?.id) {
        await supabase!.from('recruiter_match_results').delete().eq('id', inserted.id);
      }
    }, 15000);
  });

  describe('Migration 004: Visa rules', () => {
    test('visa_rules table exists with expected columns', async () => {
      const { error } = await supabase!
        .from('visa_rules')
        .select('id, country_code, visa_type, title, description, requirements, processing_time, cost, validity, source_url, last_scraped_at')
        .limit(1);

      expect(error).toBeNull();
    }, 10000);

    test('can upsert a visa rule', async () => {
      const testRule = {
        country_code: 'us',
        visa_type: 'TEST-VISA',
        title: 'Test Visa Type',
        description: 'Integration test visa rule',
        requirements: { test: true },
        processing_time: '1-2 weeks',
        cost: '$0',
        validity: '1 day',
        source_url: 'https://example.com',
        last_scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase!
        .from('visa_rules')
        .upsert(testRule, { onConflict: 'country_code,visa_type' });

      expect(upsertError).toBeNull();

      // Verify it's readable
      const { data, error: readError } = await supabase!
        .from('visa_rules')
        .select('*')
        .eq('country_code', 'us')
        .eq('visa_type', 'TEST-VISA')
        .single();

      expect(readError).toBeNull();
      expect(data?.title).toBe('Test Visa Type');

      // Clean up
      await supabase!.from('visa_rules').delete()
        .eq('country_code', 'us')
        .eq('visa_type', 'TEST-VISA');
    }, 15000);
  });

  describe('Migration 005: Blog posts', () => {
    test('blog_posts table exists with expected columns', async () => {
      const { error } = await supabase!
        .from('blog_posts')
        .select('id, slug, title, excerpt, content, author, tags, locale, country_code, published_at, meta_title, meta_description')
        .limit(1);

      expect(error).toBeNull();
    }, 10000);

    test('can insert and read a blog post', async () => {
      const testPost = {
        slug: 'test-integration-post-' + Date.now(),
        title: 'Integration Test Post',
        excerpt: 'This is a test post from integration tests',
        content: '# Test\n\nContent here.',
        author: 'Test Runner',
        tags: ['test', 'integration'],
        locale: 'en',
        published_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase!
        .from('blog_posts')
        .insert(testPost)
        .select('id, slug')
        .single();

      expect(insertError).toBeNull();
      expect(inserted?.slug).toContain('test-integration-post-');

      // Clean up
      if (inserted?.id) {
        await supabase!.from('blog_posts').delete().eq('id', inserted.id);
      }
    }, 15000);

    test('enforces unique slug constraint', async () => {
      const slug = 'unique-test-slug-' + Date.now();
      const post = {
        slug,
        title: 'First Post',
        excerpt: 'First',
        content: 'Content',
      };

      // Insert first
      const { data: first } = await supabase!.from('blog_posts').insert(post).select('id').single();

      // Try duplicate
      const { error: dupError } = await supabase!.from('blog_posts').insert({ ...post, title: 'Duplicate' });
      expect(dupError).toBeTruthy();
      expect(dupError?.message).toContain('duplicate');

      // Clean up
      if (first?.id) {
        await supabase!.from('blog_posts').delete().eq('id', first.id);
      }
    }, 15000);
  });
});

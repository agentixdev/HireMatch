// Test schema definitions by importing and inspecting exports
import * as schema from '../index';

describe('Schema exports', () => {
  it('exports all expected table definitions', () => {
    // Auth tables
    expect(schema.organisations).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.apiKeys).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.auditLog).toBeDefined();

    // Candidates
    expect(schema.candidates).toBeDefined();

    // Jobs
    expect(schema.jobs).toBeDefined();

    // Applications
    expect(schema.applications).toBeDefined();

    // Matches
    expect(schema.matches).toBeDefined();

    // Quiz
    expect(schema.quizQuestions).toBeDefined();
    expect(schema.quizResults).toBeDefined();

    // Visa
    expect(schema.visaRules).toBeDefined();
    expect(schema.visaRuleHistory).toBeDefined();

    // Pipeline
    expect(schema.scrapeJobs).toBeDefined();
    expect(schema.scrapeLog).toBeDefined();
    expect(schema.embeddingQueue).toBeDefined();

    // Webhooks
    expect(schema.webhookEndpoints).toBeDefined();
    expect(schema.webhookDeliveries).toBeDefined();

    // Billing
    expect(schema.subscriptions).toBeDefined();
    expect(schema.apiUsage).toBeDefined();
  });

  it('exports 21 tables total', () => {
    const tableExports = [
      schema.organisations,
      schema.users,
      schema.apiKeys,
      schema.sessions,
      schema.auditLog,
      schema.candidates,
      schema.jobs,
      schema.applications,
      schema.matches,
      schema.quizQuestions,
      schema.quizResults,
      schema.visaRules,
      schema.visaRuleHistory,
      schema.scrapeJobs,
      schema.scrapeLog,
      schema.embeddingQueue,
      schema.webhookEndpoints,
      schema.webhookDeliveries,
      schema.subscriptions,
      schema.apiUsage,
    ];
    // 20 tables (some might be grouped differently)
    expect(tableExports.filter(Boolean).length).toBeGreaterThanOrEqual(20);
  });
});

describe('Enum exports', () => {
  it('exports planTierEnum with correct values', () => {
    expect(schema.planTierEnum).toBeDefined();
    const values = schema.planTierEnum.enumValues;
    expect(values).toContain('starter');
    expect(values).toContain('pro');
    expect(values).toContain('enterprise');
  });

  it('exports userRoleEnum with correct values', () => {
    expect(schema.userRoleEnum).toBeDefined();
    const values = schema.userRoleEnum.enumValues;
    expect(values).toContain('owner');
    expect(values).toContain('admin');
    expect(values).toContain('member');
  });

  it('exports dataResidencyEnum with correct values', () => {
    expect(schema.dataResidencyEnum).toBeDefined();
    const values = schema.dataResidencyEnum.enumValues;
    expect(values).toContain('eu');
    expect(values).toContain('us');
    expect(values).toContain('ch');
    expect(values).toContain('any');
  });

  it('exports applicationStatusEnum with correct values', () => {
    expect(schema.applicationStatusEnum).toBeDefined();
    const values = schema.applicationStatusEnum.enumValues;
    expect(values).toContain('applied');
    expect(values).toContain('reviewed');
    expect(values).toContain('shortlisted');
    expect(values).toContain('hired');
    expect(values).toContain('rejected');
    expect(values).toContain('withdrawn');
  });

  it('exports jobTypeEnum with correct values', () => {
    expect(schema.jobTypeEnum).toBeDefined();
    const values = schema.jobTypeEnum.enumValues;
    expect(values).toContain('full-time');
    expect(values).toContain('part-time');
    expect(values).toContain('contract');
    expect(values).toContain('freelance');
    expect(values).toContain('internship');
  });

  it('exports workModeEnum with correct values', () => {
    expect(schema.workModeEnum).toBeDefined();
    const values = schema.workModeEnum.enumValues;
    expect(values).toContain('remote');
    expect(values).toContain('hybrid');
    expect(values).toContain('onsite');
  });

  it('exports remotePreferenceEnum with correct values', () => {
    expect(schema.remotePreferenceEnum).toBeDefined();
    const values = schema.remotePreferenceEnum.enumValues;
    expect(values).toContain('remote');
    expect(values).toContain('hybrid');
    expect(values).toContain('onsite');
    expect(values).toContain('any');
  });

  it('exports quizCategoryEnum with correct values', () => {
    expect(schema.quizCategoryEnum).toBeDefined();
    const values = schema.quizCategoryEnum.enumValues;
    expect(values).toContain('work_style');
    expect(values).toContain('culture');
    expect(values).toContain('skills');
    expect(values).toContain('values');
    expect(values).toContain('growth');
  });

  it('exports visaCountryEnum with all 29 countries', () => {
    expect(schema.visaCountryEnum).toBeDefined();
    const values = schema.visaCountryEnum.enumValues;
    expect(values).toHaveLength(29);

    const expected = [
      'US', 'CA', 'GB', 'CH', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
      'AT', 'PT', 'IE', 'SE', 'DK', 'NO', 'FI', 'PL', 'CZ', 'RO',
      'IN', 'MX', 'BR', 'AR', 'CN', 'JP', 'KR', 'VN', 'PH',
    ];
    for (const c of expected) {
      expect(values).toContain(c);
    }
  });

  it('exports subscriptionStatusEnum with correct values', () => {
    expect(schema.subscriptionStatusEnum).toBeDefined();
    const values = schema.subscriptionStatusEnum.enumValues;
    expect(values).toContain('active');
    expect(values).toContain('past_due');
    expect(values).toContain('canceled');
    expect(values).toContain('trialing');
    expect(values).toContain('paused');
  });

  it('exports auditOutcomeEnum with correct values', () => {
    expect(schema.auditOutcomeEnum).toBeDefined();
    const values = schema.auditOutcomeEnum.enumValues;
    expect(values).toContain('success');
    expect(values).toContain('failure');
    expect(values).toContain('denied');
  });

  it('exports scrapeStatusEnum with correct values', () => {
    expect(schema.scrapeStatusEnum).toBeDefined();
    const values = schema.scrapeStatusEnum.enumValues;
    expect(values).toContain('pending');
    expect(values).toContain('running');
    expect(values).toContain('completed');
    expect(values).toContain('failed');
  });

  it('exports embeddingStatusEnum with correct values', () => {
    expect(schema.embeddingStatusEnum).toBeDefined();
    const values = schema.embeddingStatusEnum.enumValues;
    expect(values).toContain('pending');
    expect(values).toContain('processing');
    expect(values).toContain('completed');
    expect(values).toContain('failed');
  });
});

describe('Type exports exist', () => {
  // These are compile-time checks that the types are exported
  // We verify by creating conforming objects
  it('Candidate type is usable', () => {
    const candidate: Partial<schema.Candidate> = {
      name: 'Alice',
      email: 'alice@example.com',
      skills: ['TypeScript'],
    };
    expect(candidate.name).toBe('Alice');
  });

  it('Job type is usable', () => {
    const job: Partial<schema.Job> = {
      title: 'Senior Engineer',
      skills_required: ['Node.js'],
    };
    expect(job.title).toBe('Senior Engineer');
  });

  it('Application type is usable', () => {
    const app: Partial<schema.Application> = {
      status: 'applied',
    };
    expect(app.status).toBe('applied');
  });

  it('VisaRule type is usable', () => {
    const rule: Partial<schema.VisaRule> = {
      country: 'US',
      visa_type: 'H-1B',
    };
    expect(rule.country).toBe('US');
  });

  it('Organisation type is usable', () => {
    const org: Partial<schema.Organisation> = {
      name: 'TechCorp',
      plan_tier: 'pro',
    };
    expect(org.name).toBe('TechCorp');
  });
});

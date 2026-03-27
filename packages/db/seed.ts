import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  organisations, users, visaRules, quizQuestions,
} from './schema';
import 'dotenv/config';
import crypto from 'crypto';

const VISA_SEED_DATA = [
  { country: 'US' as const, visa_type: 'H-1B', title: 'H-1B Specialty Occupation', sponsorship_required: true, timeline_days_min: 90, timeline_days_max: 180, cost_usd: 2500, quota_limited: true, annual_quota: 85000, min_salary: 60000, education_requirements: "Bachelor's degree or equivalent", source_url: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations' },
  { country: 'US' as const, visa_type: 'L-1A', title: 'L-1A Intracompany Transferee Manager', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 90, cost_usd: 1800, source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1a-intracompany-transferee-executive-or-manager' },
  { country: 'US' as const, visa_type: 'O-1A', title: 'O-1A Extraordinary Ability', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 90, cost_usd: 2000, source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/o-1-visa-individuals-with-extraordinary-ability-or-achievement' },
  { country: 'US' as const, visa_type: 'TN', title: 'TN NAFTA Professional', sponsorship_required: false, timeline_days_min: 1, timeline_days_max: 30, cost_usd: 160, source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/tn-nafta-professionals' },
  { country: 'US' as const, visa_type: 'EB-2 NIW', title: 'EB-2 National Interest Waiver', sponsorship_required: false, timeline_days_min: 365, timeline_days_max: 730, cost_usd: 3500, education_requirements: 'Advanced degree or exceptional ability', source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-second-preference-eb-2' },
  { country: 'CA' as const, visa_type: 'Express Entry', title: 'Express Entry (FSW/CEC/FST)', sponsorship_required: false, timeline_days_min: 180, timeline_days_max: 365, cost_usd: 1200, source_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html' },
  { country: 'CA' as const, visa_type: 'LMIA', title: 'Labour Market Impact Assessment', sponsorship_required: true, timeline_days_min: 60, timeline_days_max: 180, cost_usd: 1000, source_url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers.html' },
  { country: 'CA' as const, visa_type: 'Global Talent', title: 'Global Talent Stream', sponsorship_required: true, timeline_days_min: 14, timeline_days_max: 30, cost_usd: 1000, source_url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers/global-talent.html' },
  { country: 'GB' as const, visa_type: 'Skilled Worker', title: 'Skilled Worker Visa', sponsorship_required: true, timeline_days_min: 21, timeline_days_max: 56, cost_usd: 1500, min_salary: 38700, source_url: 'https://www.gov.uk/skilled-worker-visa' },
  { country: 'GB' as const, visa_type: 'Global Talent', title: 'Global Talent Visa', sponsorship_required: false, timeline_days_min: 21, timeline_days_max: 56, cost_usd: 700, source_url: 'https://www.gov.uk/global-talent' },
  { country: 'GB' as const, visa_type: 'Scale-up', title: 'Scale-up Worker Visa', sponsorship_required: true, timeline_days_min: 21, timeline_days_max: 56, cost_usd: 900, min_salary: 36300, source_url: 'https://www.gov.uk/scale-up-worker-visa' },
  { country: 'CH' as const, visa_type: 'L Permit', title: 'Short-term Residence Permit', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 90, cost_usd: 200, source_url: 'https://www.sem.admin.ch/sem/en/home/themen/arbeit.html' },
  { country: 'CH' as const, visa_type: 'B Permit', title: 'Residence Permit (work)', sponsorship_required: true, timeline_days_min: 60, timeline_days_max: 120, cost_usd: 300, source_url: 'https://www.sem.admin.ch/sem/en/home/themen/arbeit.html' },
  { country: 'DE' as const, visa_type: 'EU Blue Card', title: 'EU Blue Card Germany', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 90, cost_usd: 150, min_salary: 45300, education_requirements: 'University degree', source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card' },
  { country: 'DE' as const, visa_type: 'Skilled Worker', title: 'Skilled Immigration Act Visa', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 120, cost_usd: 150, source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/work-qualified-professionals' },
  { country: 'DE' as const, visa_type: 'IT Specialist', title: 'IT Specialist Visa (no degree)', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 90, cost_usd: 150, min_salary: 51120, source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/it-specialists' },
  { country: 'FR' as const, visa_type: 'Talent Passport', title: 'Passeport Talent', sponsorship_required: false, timeline_days_min: 30, timeline_days_max: 90, cost_usd: 250, source_url: 'https://www.service-public.fr/particuliers/vosdroits/F16922' },
  { country: 'FR' as const, visa_type: 'French Tech', title: 'French Tech Visa', sponsorship_required: false, timeline_days_min: 15, timeline_days_max: 45, cost_usd: 250, source_url: 'https://lafrenchtech.com/en/how-france-helps-startups/french-tech-visa/' },
  { country: 'NL' as const, visa_type: 'HSM', title: 'Highly Skilled Migrant', sponsorship_required: true, timeline_days_min: 14, timeline_days_max: 42, cost_usd: 350, min_salary: 41954, source_url: 'https://ind.nl/en/work/working_in_the_Netherlands/Pages/Highly-skilled-migrant.aspx' },
  { country: 'IE' as const, visa_type: 'Critical Skills', title: 'Critical Skills Employment Permit', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 60, cost_usd: 1200, min_salary: 38000, source_url: 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/' },
  { country: 'ES' as const, visa_type: 'Digital Nomad', title: 'Spain Digital Nomad Visa', sponsorship_required: false, timeline_days_min: 30, timeline_days_max: 60, cost_usd: 100, source_url: 'https://www.exteriores.gob.es/' },
  { country: 'PT' as const, visa_type: 'Tech Visa', title: 'Portugal Tech Visa', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 60, cost_usd: 150, source_url: 'https://www.iapmei.pt/PRODUTOS-E-SERVICOS/Empreendedorismo-Inovacao/Tech-Visa.aspx' },
  { country: 'SE' as const, visa_type: 'Work Permit', title: 'Sweden Work Permit', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 180, cost_usd: 250, source_url: 'https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden/Employed/Work-permit-requirements.html' },
  { country: 'DK' as const, visa_type: 'Fast Track', title: 'Denmark Fast-track Scheme', sponsorship_required: true, timeline_days_min: 14, timeline_days_max: 30, cost_usd: 450, source_url: 'https://www.nyidanmark.dk/en-GB/You-want-to-apply/Work/Fast-track' },
  { country: 'JP' as const, visa_type: 'HSP', title: 'Highly Skilled Professional', sponsorship_required: true, timeline_days_min: 14, timeline_days_max: 30, cost_usd: 200, source_url: 'https://www.moj.go.jp/isa/publications/materials/newimmiact_3_index.html' },
  { country: 'KR' as const, visa_type: 'E-7', title: 'E-7 Special Occupation Visa', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 60, cost_usd: 130, source_url: 'https://www.immigration.go.kr/' },
  { country: 'IN' as const, visa_type: 'Employment', title: 'Employment Visa', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 60, cost_usd: 200, min_salary: 25000, source_url: 'https://indianvisaonline.gov.in/' },
  { country: 'BR' as const, visa_type: 'Work', title: 'Brazil Work Visa (VITEM V)', sponsorship_required: true, timeline_days_min: 45, timeline_days_max: 90, cost_usd: 300, source_url: 'https://www.gov.br/mre/en' },
  { country: 'MX' as const, visa_type: 'Temporary Resident', title: 'Mexico Temporary Resident Work', sponsorship_required: true, timeline_days_min: 30, timeline_days_max: 60, cost_usd: 250, source_url: 'https://www.gob.mx/inm' },
] as const;

const QUIZ_SEED = [
  { category: 'work_style' as const, question: 'How do you prefer to organize your workday?', options: [{ value: 'structured', label: 'Highly structured with clear routines', tags: ['organized', 'methodical'] }, { value: 'flexible', label: 'Flexible and adaptable', tags: ['agile', 'creative'] }, { value: 'mixed', label: 'Mix of both depending on the task', tags: ['balanced', 'versatile'] }], weight: 2, sort_order: 1 },
  { category: 'culture' as const, question: 'What type of team environment do you thrive in?', options: [{ value: 'collaborative', label: 'Highly collaborative with frequent meetings', tags: ['team-player', 'social'] }, { value: 'independent', label: 'Independent with occasional check-ins', tags: ['autonomous', 'self-starter'] }, { value: 'hybrid', label: 'A blend of team and solo work', tags: ['adaptable', 'balanced'] }], weight: 2, sort_order: 2 },
  { category: 'values' as const, question: 'What matters most in a job?', options: [{ value: 'growth', label: 'Career growth and learning', tags: ['ambitious', 'growth-minded'] }, { value: 'impact', label: 'Making a meaningful impact', tags: ['purpose-driven', 'mission-focused'] }, { value: 'stability', label: 'Stability and work-life balance', tags: ['balanced', 'reliable'] }, { value: 'compensation', label: 'Competitive compensation', tags: ['results-driven', 'performance-oriented'] }], weight: 3, sort_order: 3 },
  { category: 'skills' as const, question: 'What is your primary technical strength?', options: [{ value: 'frontend', label: 'Frontend / UI development', tags: ['frontend', 'ui', 'react'] }, { value: 'backend', label: 'Backend / API development', tags: ['backend', 'api', 'systems'] }, { value: 'fullstack', label: 'Full-stack development', tags: ['fullstack', 'versatile'] }, { value: 'data', label: 'Data / ML / AI', tags: ['data', 'ml', 'analytics'] }, { value: 'devops', label: 'DevOps / Infrastructure', tags: ['devops', 'cloud', 'infrastructure'] }], weight: 2, sort_order: 4 },
  { category: 'growth' as const, question: 'Where do you see yourself in 3 years?', options: [{ value: 'ic', label: 'Senior individual contributor', tags: ['deep-expertise', 'specialist'] }, { value: 'lead', label: 'Tech lead or architect', tags: ['leadership', 'architecture'] }, { value: 'management', label: 'Engineering manager', tags: ['management', 'people-leader'] }, { value: 'founder', label: 'Starting my own company', tags: ['entrepreneurial', 'founder'] }], weight: 1, sort_order: 5 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql);

  console.log('Seeding database...\n');

  // 1. Create superadmin organisation
  console.log('1. Creating superadmin organisation...');
  const [org] = await db
    .insert(organisations)
    .values({
      name: 'HireMatch Platform',
      plan_tier: 'enterprise',
      data_residency: 'any',
    })
    .returning();
  console.log(`   Created org: ${org.id} (${org.name})`);

  // 2. Create superadmin user
  console.log('2. Creating superadmin user...');
  const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
  const [user] = await db
    .insert(users)
    .values({
      org_id: org.id,
      email: 'admin@hirematch.io',
      role: 'owner',
      hashed_password: hashedPassword,
    })
    .returning();
  console.log(`   Created user: ${user.id} (${user.email})`);

  // 3. Seed visa rules
  console.log('3. Seeding visa rules...');
  const visaValues = VISA_SEED_DATA.map((v) => ({
    org_id: org.id,
    country: v.country,
    visa_type: v.visa_type,
    title: v.title,
    sponsorship_required: v.sponsorship_required,
    timeline_days_min: v.timeline_days_min,
    timeline_days_max: v.timeline_days_max,
    cost_usd: v.cost_usd,
    quota_limited: v.quota_limited ?? false,
    annual_quota: v.annual_quota ?? null,
    min_salary: v.min_salary ?? null,
    education_requirements: v.education_requirements ?? null,
    source_url: v.source_url,
  }));

  const insertedVisa = await db.insert(visaRules).values(visaValues).returning();
  console.log(`   Seeded ${insertedVisa.length} visa rules`);

  // 4. Seed quiz questions
  console.log('4. Seeding quiz questions...');
  const quizValues = QUIZ_SEED.map((q) => ({
    org_id: org.id,
    category: q.category,
    question: q.question,
    options: q.options,
    weight: q.weight,
    sort_order: q.sort_order,
  }));

  const insertedQuiz = await db.insert(quizQuestions).values(quizValues).returning();
  console.log(`   Seeded ${insertedQuiz.length} quiz questions`);

  console.log('\nSeed complete!');
  console.log('WARNING: Change the admin password before deploying to production!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

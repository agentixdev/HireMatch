import type { Page } from 'playwright';
import type { Extractor, ExtractedData } from './base.js';
import {
  computeContentHash,
  safeText,
  safeTextAll,
  safeAttribute,
  waitForAny,
} from './base.js';
import { randomDelay, simulateScroll } from '../human-behavior.js';

/**
 * LinkedIn profile and job extractor.
 * Handles public profiles and job postings.
 */
export const linkedinExtractor: Extractor = {
  name: 'linkedin',
  domains: ['linkedin.com', 'www.linkedin.com'],

  async extract(page: Page, url: string): Promise<ExtractedData> {
    if (url.includes('/jobs/') || url.includes('/job/')) {
      return extractJob(page, url);
    }
    return extractProfile(page, url);
  },
};

/**
 * Extract candidate data from a LinkedIn profile page.
 */
export async function extractProfile(page: Page, url: string): Promise<ExtractedData> {
  // Wait for profile content to load
  await waitForAny(page, [
    '.pv-top-card',
    '.profile-section-card',
    '[data-section="summary"]',
    'section.top-card-layout',
    'h1',
  ]);

  await randomDelay(1000, 2000);
  await simulateScroll(page);
  await randomDelay(500, 1000);

  // Extract name — try multiple selectors for public/logged-in views
  const name =
    (await safeText(page, '.pv-top-card--list li:first-child')) ??
    (await safeText(page, 'h1.top-card-layout__title')) ??
    (await safeText(page, 'h1.text-heading-xlarge')) ??
    (await safeText(page, 'h1')) ??
    'Unknown';

  // Headline
  const headline =
    (await safeText(page, '.pv-top-card .text-body-medium')) ??
    (await safeText(page, '.top-card-layout__headline')) ??
    (await safeText(page, 'h2.top-card-layout__headline')) ??
    null;

  // Location
  const location =
    (await safeText(page, '.pv-top-card--list.pv-top-card--list-bullet li:first-child')) ??
    (await safeText(page, '.top-card__subline-item')) ??
    (await safeText(page, '.profile-info-subheader span')) ??
    null;

  // Photo URL
  const photoUrl =
    (await safeAttribute(page, '.pv-top-card-profile-picture__image', 'src')) ??
    (await safeAttribute(page, '.top-card-layout__entity-image img', 'src')) ??
    (await safeAttribute(page, 'img.profile-photo-edit__preview', 'src')) ??
    null;

  // Summary / About
  const bio =
    (await safeText(page, '#about ~ div .pv-shared-text-with-see-more span.visually-hidden')) ??
    (await safeText(page, '.pv-about-section .pv-about__summary-text')) ??
    (await safeText(page, 'section.summary .core-section-container__content')) ??
    null;

  // Skills
  const skills = await extractSkills(page);

  // Experience
  const workHistory = await extractExperience(page);

  // Education
  const education = await extractEducation(page);

  // Languages
  const languages = await extractLanguages(page);

  // Build raw text for embedding
  const rawParts = [name, headline, bio, ...skills, location].filter(Boolean);
  for (const exp of workHistory) {
    rawParts.push(`${exp.title} at ${exp.company}`);
    if (exp.description) rawParts.push(exp.description);
  }
  for (const edu of education) {
    rawParts.push(`${edu.degree} in ${edu.field} at ${edu.institution}`);
  }
  const rawText = rawParts.join(' | ');

  const data: Record<string, unknown> = {
    name: name.trim(),
    headline,
    bio,
    photo_url: photoUrl,
    location,
    skills,
    work_history: workHistory,
    education,
    languages,
    source_url: url,
    source_platform: 'linkedin',
    gdpr_public_source: true,
    raw_text: rawText,
  };

  // Infer experience years from work history
  if (workHistory.length > 0) {
    const earliest = workHistory
      .map((w) => new Date(w.start_date).getTime())
      .filter((t) => !isNaN(t));
    if (earliest.length > 0) {
      const years = Math.round(
        (Date.now() - Math.min(...earliest)) / (365.25 * 24 * 60 * 60 * 1000),
      );
      data.experience_years = years;
    }
  }

  return {
    type: 'candidate',
    data,
    content_hash: computeContentHash(rawText),
    source_url: url,
    source_platform: 'linkedin',
    raw_text: rawText,
    extracted_at: new Date().toISOString(),
  };
}

/**
 * Extract job data from a LinkedIn job posting page.
 */
export async function extractJob(page: Page, url: string): Promise<ExtractedData> {
  await waitForAny(page, [
    '.jobs-unified-top-card',
    '.top-card-layout',
    '.job-view-layout',
    'h1',
  ]);

  await randomDelay(1000, 2000);

  // Title
  const title =
    (await safeText(page, '.jobs-unified-top-card__job-title')) ??
    (await safeText(page, '.top-card-layout__title')) ??
    (await safeText(page, 'h1.t-24')) ??
    (await safeText(page, 'h1')) ??
    'Unknown Position';

  // Company
  const company =
    (await safeText(page, '.jobs-unified-top-card__company-name a')) ??
    (await safeText(page, '.topcard__org-name-link')) ??
    (await safeText(page, '.top-card-layout__second-subline a')) ??
    null;

  // Location
  const location =
    (await safeText(page, '.jobs-unified-top-card__bullet')) ??
    (await safeText(page, '.topcard__flavor--bullet')) ??
    (await safeText(page, '.top-card-layout__second-subline span:nth-child(2)')) ??
    null;

  // Description
  const description =
    (await safeText(page, '.jobs-description__content')) ??
    (await safeText(page, '.description__text')) ??
    (await safeText(page, '.show-more-less-html__markup')) ??
    null;

  // Job details (employment type, seniority, industry)
  const criteria = await page.$$('.description__job-criteria-item');
  let jobType: string | null = null;
  let seniority: string | null = null;
  let industry: string | null = null;

  for (const item of criteria) {
    const label = (await (await item.$('.description__job-criteria-subheader'))?.textContent())?.trim();
    const value = (await (await item.$('.description__job-criteria-text'))?.textContent())?.trim();
    if (!label || !value) continue;

    const labelLower = label.toLowerCase();
    if (labelLower.includes('employment type') || labelLower.includes('job type')) {
      jobType = value.toLowerCase().replace(/\s+/g, '-') as string;
    } else if (labelLower.includes('seniority')) {
      seniority = value;
    } else if (labelLower.includes('industry') || labelLower.includes('industries')) {
      industry = value;
    }
  }

  // Extract skills from description
  const skillsFromDesc = extractSkillsFromText(description ?? '');

  // Check for visa sponsorship keywords
  const descLower = (description ?? '').toLowerCase();
  const visaSponsorship =
    descLower.includes('visa sponsorship') ||
    descLower.includes('sponsor visa') ||
    descLower.includes('work authorization') ||
    descLower.includes('relocation support');

  // Check for remote
  const remoteOk =
    (location?.toLowerCase().includes('remote') ?? false) ||
    descLower.includes('fully remote') ||
    descLower.includes('work from home') ||
    descLower.includes('work from anywhere');

  const rawText = [title, company, location, description].filter(Boolean).join(' | ');

  const normalizedJobType = normalizeJobType(jobType);

  const data: Record<string, unknown> = {
    title: title.trim(),
    company,
    description,
    skills_required: skillsFromDesc,
    job_type: normalizedJobType,
    seniority,
    industry,
    city: location,
    visa_sponsorship: visaSponsorship,
    remote_ok: remoteOk,
    is_active: true,
    source_url: url,
    raw_text: rawText,
  };

  return {
    type: 'job',
    data,
    content_hash: computeContentHash(rawText),
    source_url: url,
    source_platform: 'linkedin',
    raw_text: rawText,
    extracted_at: new Date().toISOString(),
  };
}

/* ─── Helpers ─── */

async function extractSkills(page: Page): Promise<string[]> {
  // Try multiple skill selectors
  let skills = await safeTextAll(page, '.pv-skill-category-entity__name-text');
  if (skills.length === 0) {
    skills = await safeTextAll(page, '[data-field="skill_card_skill_topic"] span');
  }
  if (skills.length === 0) {
    skills = await safeTextAll(page, '.skill-card-featured-skill__name');
  }
  if (skills.length === 0) {
    skills = await safeTextAll(page, '.pv-skill-categories-section .pv-skill-entity__skill-name');
  }
  return [...new Set(skills.map((s) => s.trim()).filter(Boolean))];
}

interface WorkEntry {
  company: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  skills: string[];
}

async function extractExperience(page: Page): Promise<WorkEntry[]> {
  const entries: WorkEntry[] = [];

  const experienceItems = await page.$$(
    '#experience ~ div ul > li, section.experience .experience-item, .pv-experience-section__list-item',
  );

  for (const item of experienceItems.slice(0, 15)) {
    const title =
      (await safeText(item as unknown as Page, '.pv-entity__summary-info h3'))?.trim() ??
      (await item.textContent())
        ?.split('\n')
        .map((l) => l.trim())
        .find((l) => l.length > 0) ??
      null;

    if (!title) continue;

    const companyEl = await item.$('.pv-entity__secondary-title, .experience-item__subtitle, span[aria-hidden="true"]');
    const companyText = (await companyEl?.textContent())?.trim() ?? 'Unknown';

    const dateRange = await item.$('.pv-entity__date-range span:nth-child(2), .date-range time');
    const dateText = (await dateRange?.textContent())?.trim() ?? '';

    const descriptionEl = await item.$('.pv-entity__description, .show-more-less-html__markup');
    const description = (await descriptionEl?.textContent())?.trim() ?? null;

    const isCurrent =
      dateText.toLowerCase().includes('present') ||
      dateText.toLowerCase().includes('current');

    const { startDate, endDate } = parseDateRange(dateText);

    entries.push({
      company: companyText,
      title: title.substring(0, 200),
      description: description?.substring(0, 1000) ?? null,
      start_date: startDate,
      end_date: isCurrent ? null : endDate,
      is_current: isCurrent,
      skills: [],
    });
  }

  return entries;
}

interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number;
}

async function extractEducation(page: Page): Promise<EducationEntry[]> {
  const entries: EducationEntry[] = [];

  const educationItems = await page.$$(
    '#education ~ div ul > li, section.education .education__list-item, .pv-education-entity',
  );

  for (const item of educationItems.slice(0, 10)) {
    const institution = (
      await (await item.$('.pv-entity__school-name, .education__item--school-name, h3'))?.textContent()
    )?.trim();

    if (!institution) continue;

    const degree = (
      await (await item.$('.pv-entity__degree-name span:nth-child(2), .education__item--degree-name'))?.textContent()
    )?.trim() ?? '';

    const field = (
      await (await item.$('.pv-entity__fos span:nth-child(2), .education__item--field-of-study'))?.textContent()
    )?.trim() ?? '';

    const datesEl = await item.$('.pv-entity__dates span:nth-child(2), .education__item--duration');
    const datesText = (await datesEl?.textContent())?.trim() ?? '';
    const years = datesText.match(/(\d{4})/g);

    entries.push({
      institution,
      degree,
      field,
      start_year: years?.[0] ? parseInt(years[0], 10) : new Date().getFullYear(),
      end_year: years?.[1] ? parseInt(years[1], 10) : undefined,
    });
  }

  return entries;
}

async function extractLanguages(page: Page): Promise<string[]> {
  const langs = await safeTextAll(
    page,
    '#languages ~ div .pv-accomplishment-entity__title, .language-name',
  );
  return [...new Set(langs.map((l) => l.trim()).filter(Boolean))];
}

function parseDateRange(text: string): { startDate: string; endDate: string | null } {
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Match patterns like "Jan 2020 – Present" or "2018 – 2022"
  const parts = text.split(/[–\-—]/);

  function parseDate(part: string): string | null {
    const trimmed = part.trim().toLowerCase();
    if (trimmed.includes('present') || trimmed.includes('current')) return null;

    const monthYear = trimmed.match(/([a-z]{3})\w*\s+(\d{4})/);
    if (monthYear) {
      const month = monthNames[monthYear[1]!] ?? '01';
      return `${monthYear[2]}-${month}-01`;
    }

    const yearOnly = trimmed.match(/(\d{4})/);
    if (yearOnly) {
      return `${yearOnly[1]}-01-01`;
    }

    return null;
  }

  const startDate = parseDate(parts[0] ?? '') ?? new Date().toISOString().split('T')[0]!;
  const endDate = parts.length > 1 ? parseDate(parts[1] ?? '') : null;

  return { startDate, endDate };
}

function normalizeJobType(raw: string | null): string {
  if (!raw) return 'full-time';
  const lower = raw.toLowerCase().replace(/[\s_]+/g, '-');
  const mapping: Record<string, string> = {
    'full-time': 'full-time',
    'fulltime': 'full-time',
    'part-time': 'part-time',
    'parttime': 'part-time',
    'contract': 'contract',
    'temporary': 'contract',
    'freelance': 'freelance',
    'internship': 'internship',
    'intern': 'internship',
  };
  return mapping[lower] ?? 'full-time';
}

const COMMON_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab',
  'react', 'angular', 'vue', 'next.js', 'nextjs', 'node.js', 'nodejs', 'express',
  'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'terraform',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'ai',
  'data science', 'data engineering', 'etl', 'spark', 'hadoop',
  'figma', 'sketch', 'adobe xd', 'ui/ux', 'product management',
  'agile', 'scrum', 'devops', 'ci/cd', 'microservices', 'graphql', 'rest api',
  'sql', 'nosql', 'git', 'linux', 'bash',
];

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return COMMON_SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });
}

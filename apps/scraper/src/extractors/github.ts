import type { Page } from 'playwright';
import type { Extractor, ExtractedData } from './base.js';
import { computeContentHash, safeText, safeTextAll, safeAttribute, waitForAny } from './base.js';
import { randomDelay } from '../human-behavior.js';

/**
 * GitHub profile extractor.
 * Extracts developer data from GitHub user profiles.
 */
export const githubExtractor: Extractor = {
  name: 'github',
  domains: ['github.com', 'www.github.com'],

  async extract(page: Page, url: string): Promise<ExtractedData> {
    return extractProfile(page, url);
  },
};

/**
 * Extract developer profile data from a GitHub profile page.
 */
export async function extractProfile(page: Page, url: string): Promise<ExtractedData> {
  await waitForAny(page, [
    '.vcard-fullname',
    '[itemprop="name"]',
    '.p-name',
    '.h-card',
    'h1.vcard-names',
  ]);

  await randomDelay(800, 1500);

  // Full name
  const fullName =
    (await safeText(page, '.vcard-fullname, [itemprop="name"], .p-name')) ??
    (await safeText(page, '.p-nickname')) ??
    'Unknown';

  // Username
  const username =
    (await safeText(page, '.p-nickname, [itemprop="additionalName"]')) ??
    url.split('/').filter(Boolean).pop() ??
    '';

  // Bio
  const bio =
    (await safeText(page, '.p-note .user-profile-bio div, [data-bio-text]')) ??
    (await safeText(page, '.user-profile-bio')) ??
    null;

  // Location
  const location =
    (await safeText(page, '[itemprop="homeLocation"], .p-label')) ??
    null;

  // Company
  const company =
    (await safeText(page, '[itemprop="worksFor"], .p-org')) ??
    null;

  // Website
  const website =
    (await safeAttribute(page, '[itemprop="url"] a, .vcard-detail [data-test-selector="profile-website-url"]', 'href')) ??
    null;

  // Email (public)
  const email =
    (await safeText(page, '[itemprop="email"] a')) ??
    null;

  // Profile picture
  const photoUrl =
    (await safeAttribute(page, '.avatar-user, [itemprop="image"]', 'src')) ??
    null;

  // Follower / following counts
  const followersText = await safeText(page, 'a[href$="?tab=followers"] span, .js-profile-editable-area .text-bold');
  const followers = followersText ? parseCount(followersText) : 0;

  // Repository count
  const repoCountText = await safeText(page, '.UnderlineNav-item:first-child .Counter, nav a[data-tab="repositories"] span.Counter');
  const publicRepos = repoCountText ? parseCount(repoCountText) : 0;

  // Contribution stats
  const contributionText = await safeText(page, '.js-yearly-contributions h2, .contribution-activity-listing h2');
  const yearlyContributions = contributionText ? parseCount(contributionText) : 0;

  // Pinned repositories
  const pinnedRepos = await extractPinnedRepos(page);

  // Infer skills from pinned repos and popular repos
  const repoLanguages = pinnedRepos
    .map((r) => r.language)
    .filter((l): l is string => l !== null);

  // Navigate to repositories tab to get full language breakdown
  const repoTabUrl = `${url.replace(/\/$/, '')}?tab=repositories&sort=stargazers`;
  await page.goto(repoTabUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await randomDelay(1000, 2000);

  const topRepos = await extractTopRepos(page);
  const allRepoLanguages = [
    ...repoLanguages,
    ...topRepos.map((r) => r.language).filter((l): l is string => l !== null),
  ];

  const skills = inferSkills(allRepoLanguages, topRepos, bio);

  // Build raw text for embedding
  const rawParts = [
    fullName,
    username,
    bio,
    location,
    company,
    `${publicRepos} public repos`,
    `${yearlyContributions} contributions/year`,
    ...skills,
  ].filter(Boolean);

  for (const repo of [...pinnedRepos, ...topRepos].slice(0, 10)) {
    rawParts.push(`${repo.name}: ${repo.description ?? ''} [${repo.language ?? ''}]`);
  }

  const rawText = rawParts.join(' | ');

  const data: Record<string, unknown> = {
    name: fullName.trim(),
    headline: `${username}${company ? ` @ ${company}` : ''} - GitHub Developer`,
    bio,
    photo_url: photoUrl,
    location,
    skills,
    source_url: url,
    source_platform: 'github',
    gdpr_public_source: true,
    raw_text: rawText,
    // GitHub-specific metadata stored as part of the record
    work_history: company
      ? [
          {
            company,
            title: 'Software Developer',
            description: `Active GitHub contributor with ${publicRepos} public repositories and ${yearlyContributions} contributions in the past year.`,
            start_date: new Date().toISOString().split('T')[0],
            end_date: null,
            is_current: true,
            skills,
          },
        ]
      : [],
    education: [],
    languages: [],
  };

  return {
    type: 'candidate',
    data,
    content_hash: computeContentHash(rawText),
    source_url: url,
    source_platform: 'github',
    raw_text: rawText,
    extracted_at: new Date().toISOString(),
  };
}

/* ─── Repository extraction ─── */

interface RepoInfo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
}

async function extractPinnedRepos(page: Page): Promise<RepoInfo[]> {
  const repos: RepoInfo[] = [];
  const pinnedItems = await page.$$('.pinned-item-list-item-content, .js-pinned-item-list-item');

  for (const item of pinnedItems.slice(0, 6)) {
    const name = (await (await item.$('.repo, a[data-hydro-click]'))?.textContent())?.trim() ?? '';
    const description = (await (await item.$('.pinned-item-desc, p'))?.textContent())?.trim() ?? null;
    const language = (await (await item.$('[itemprop="programmingLanguage"], span[class*="language-color"] + span'))?.textContent())?.trim() ?? null;

    const starsText = (await (await item.$('a[href*="stargazers"] span, svg.octicon-star ~ span'))?.textContent())?.trim();
    const forksText = (await (await item.$('a[href*="forks"] span, svg.octicon-repo-forked ~ span'))?.textContent())?.trim();

    repos.push({
      name,
      description,
      language,
      stars: starsText ? parseCount(starsText) : 0,
      forks: forksText ? parseCount(forksText) : 0,
      topics: [],
    });
  }

  return repos;
}

async function extractTopRepos(page: Page): Promise<RepoInfo[]> {
  const repos: RepoInfo[] = [];
  const repoItems = await page.$$('#user-repositories-list li, div[data-filterable-for="your-repos-filter"] li');

  for (const item of repoItems.slice(0, 20)) {
    const name = (await (await item.$('h3 a, a[itemprop="name codeRepository"]'))?.textContent())?.trim() ?? '';
    const description = (await (await item.$('p[itemprop="description"], p.col-9'))?.textContent())?.trim() ?? null;
    const language = (await (await item.$('[itemprop="programmingLanguage"]'))?.textContent())?.trim() ?? null;

    const starsText = (await (await item.$('a[href*="stargazers"]'))?.textContent())?.trim();

    const topicElements = await item.$$('a.topic-tag');
    const topics: string[] = [];
    for (const el of topicElements) {
      const text = (await el.textContent())?.trim();
      if (text) topics.push(text);
    }

    repos.push({
      name,
      description,
      language,
      stars: starsText ? parseCount(starsText) : 0,
      forks: 0,
      topics,
    });
  }

  return repos;
}

/**
 * Infer technical skills from repository languages, topics, and bio.
 */
export function inferSkills(
  repoLanguages: string[],
  repos: RepoInfo[],
  bio: string | null,
): string[] {
  const skills = new Set<string>();

  // Language mapping → skill names
  const languageSkillMap: Record<string, string[]> = {
    JavaScript: ['JavaScript', 'Node.js'],
    TypeScript: ['TypeScript', 'JavaScript'],
    Python: ['Python'],
    Java: ['Java'],
    'C++': ['C++'],
    'C#': ['C#', '.NET'],
    Go: ['Go'],
    Rust: ['Rust'],
    Ruby: ['Ruby'],
    PHP: ['PHP'],
    Swift: ['Swift', 'iOS'],
    Kotlin: ['Kotlin', 'Android'],
    Scala: ['Scala'],
    R: ['R', 'Data Science'],
    Dart: ['Dart', 'Flutter'],
    Shell: ['Bash', 'Linux'],
    Dockerfile: ['Docker'],
    HCL: ['Terraform', 'Infrastructure as Code'],
    Jupyter: ['Python', 'Data Science', 'Machine Learning'],
    Vue: ['Vue.js', 'JavaScript'],
    SCSS: ['CSS', 'Frontend'],
    HTML: ['HTML', 'Frontend'],
    CSS: ['CSS', 'Frontend'],
  };

  // Add skills from languages
  for (const lang of repoLanguages) {
    const mapped = languageSkillMap[lang];
    if (mapped) {
      mapped.forEach((s) => skills.add(s));
    } else if (lang) {
      skills.add(lang);
    }
  }

  // Add skills from repo topics
  const topicSkillMap: Record<string, string> = {
    react: 'React',
    angular: 'Angular',
    vue: 'Vue.js',
    nextjs: 'Next.js',
    'next-js': 'Next.js',
    nodejs: 'Node.js',
    'node-js': 'Node.js',
    express: 'Express',
    django: 'Django',
    flask: 'Flask',
    fastapi: 'FastAPI',
    spring: 'Spring',
    rails: 'Ruby on Rails',
    laravel: 'Laravel',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    aws: 'AWS',
    gcp: 'GCP',
    azure: 'Azure',
    terraform: 'Terraform',
    graphql: 'GraphQL',
    postgresql: 'PostgreSQL',
    mongodb: 'MongoDB',
    redis: 'Redis',
    elasticsearch: 'Elasticsearch',
    'machine-learning': 'Machine Learning',
    'deep-learning': 'Deep Learning',
    'data-science': 'Data Science',
    nlp: 'NLP',
    'computer-vision': 'Computer Vision',
    devops: 'DevOps',
    'ci-cd': 'CI/CD',
    microservices: 'Microservices',
  };

  for (const repo of repos) {
    for (const topic of repo.topics) {
      const skill = topicSkillMap[topic.toLowerCase()];
      if (skill) skills.add(skill);
    }
  }

  // Infer from repo names and descriptions
  const allText = [
    bio ?? '',
    ...repos.map((r) => `${r.name} ${r.description ?? ''}`),
  ]
    .join(' ')
    .toLowerCase();

  const frameworkPatterns: Array<[RegExp, string]> = [
    [/\breact\b/, 'React'],
    [/\bangular\b/, 'Angular'],
    [/\bvue\.?js?\b/, 'Vue.js'],
    [/\bnext\.?js\b/, 'Next.js'],
    [/\bexpress\b/, 'Express'],
    [/\bdjango\b/, 'Django'],
    [/\bflask\b/, 'Flask'],
    [/\bfastapi\b/, 'FastAPI'],
    [/\bspring\sboot\b/, 'Spring Boot'],
    [/\brails\b/, 'Ruby on Rails'],
    [/\blaravel\b/, 'Laravel'],
    [/\bdocker\b/, 'Docker'],
    [/\bkubernetes\b|\bk8s\b/, 'Kubernetes'],
    [/\bterraform\b/, 'Terraform'],
    [/\bgraphql\b/, 'GraphQL'],
    [/\bpostgres(?:ql)?\b/, 'PostgreSQL'],
    [/\bmongo(?:db)?\b/, 'MongoDB'],
    [/\bredis\b/, 'Redis'],
    [/\belasticsearch\b/, 'Elasticsearch'],
    [/\bmachine\s*learning\b|\bml\b/, 'Machine Learning'],
    [/\bdeep\s*learning\b/, 'Deep Learning'],
    [/\btensorflow\b/, 'TensorFlow'],
    [/\bpytorch\b/, 'PyTorch'],
    [/\baws\b/, 'AWS'],
    [/\bgcp\b|\bgoogle\s*cloud\b/, 'GCP'],
    [/\bazure\b/, 'Azure'],
  ];

  for (const [pattern, skill] of frameworkPatterns) {
    if (pattern.test(allText)) {
      skills.add(skill);
    }
  }

  // Add Git as a skill for any GitHub user
  skills.add('Git');

  return [...skills].sort();
}

/* ─── Utility ─── */

function parseCount(text: string): number {
  const cleaned = text.trim().toLowerCase().replace(/,/g, '');
  if (cleaned.endsWith('k')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  if (cleaned.endsWith('m')) {
    return Math.round(parseFloat(cleaned) * 1_000_000);
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

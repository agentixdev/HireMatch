import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceClient } from '@/lib/supabase-server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

// ── Country visa source URLs ─────────────────────────────────────────
export const VISA_SOURCES: Record<string, { name: string; urls: string[] }> = {
  us: {
    name: 'United States',
    urls: [
      'https://travel.state.gov/content/travel/en/us-visas/employment.html',
      'https://www.uscis.gov/working-in-the-united-states',
    ],
  },
  ca: {
    name: 'Canada',
    urls: [
      'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html',
    ],
  },
  gb: {
    name: 'United Kingdom',
    urls: [
      'https://www.gov.uk/browse/visas-immigration/work-visas',
    ],
  },
  ch: {
    name: 'Switzerland',
    urls: [
      'https://www.sem.admin.ch/sem/en/home/themen/arbeit.html',
    ],
  },
  de: {
    name: 'Germany',
    urls: [
      'https://www.make-it-in-germany.com/en/visa-residence/types/work',
    ],
  },
  fr: {
    name: 'France',
    urls: [
      'https://france-visas.gouv.fr/en/web/france-visas/long-stay-visa',
    ],
  },
  es: {
    name: 'Spain',
    urls: [
      'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Trabajo.aspx',
    ],
  },
  it: {
    name: 'Italy',
    urls: [
      'https://vistoperitalia.esteri.it/home/en',
    ],
  },
  nl: {
    name: 'Netherlands',
    urls: [
      'https://ind.nl/en/work',
    ],
  },
  be: {
    name: 'Belgium',
    urls: [
      'https://www.belgium.be/en/work/coming_to_work_in_belgium',
    ],
  },
  at: {
    name: 'Austria',
    urls: [
      'https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/',
    ],
  },
  pt: {
    name: 'Portugal',
    urls: [
      'https://www.sef.pt/en/pages/conteudo-detalhe.aspx?nID=21',
    ],
  },
  ie: {
    name: 'Ireland',
    urls: [
      'https://www.irishimmigration.ie/coming-to-work-in-ireland/',
    ],
  },
  se: {
    name: 'Sweden',
    urls: [
      'https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden.html',
    ],
  },
  dk: {
    name: 'Denmark',
    urls: [
      'https://www.nyidanmark.dk/en-GB/You-want-to-apply/Work',
    ],
  },
  no: {
    name: 'Norway',
    urls: [
      'https://www.udi.no/en/want-to-apply/work-immigration/',
    ],
  },
  fi: {
    name: 'Finland',
    urls: [
      'https://migri.fi/en/working-in-finland',
    ],
  },
  pl: {
    name: 'Poland',
    urls: [
      'https://www.gov.pl/web/mswia-en/work-permits',
    ],
  },
  cz: {
    name: 'Czech Republic',
    urls: [
      'https://www.mvcr.cz/mvcren/article/third-country-nationals-employment.aspx',
    ],
  },
  ro: {
    name: 'Romania',
    urls: [
      'https://igi.mai.gov.ro/en/',
    ],
  },
  in: {
    name: 'India',
    urls: [
      'https://www.mea.gov.in/visa-requirements.htm',
    ],
  },
  mx: {
    name: 'Mexico',
    urls: [
      'https://www.gob.mx/inm',
    ],
  },
  br: {
    name: 'Brazil',
    urls: [
      'https://www.gov.br/mre/en/subjects/visas',
    ],
  },
  ar: {
    name: 'Argentina',
    urls: [
      'https://www.argentina.gob.ar/interior/migraciones',
    ],
  },
  cn: {
    name: 'China',
    urls: [
      'https://www.visaforchina.cn/',
    ],
  },
  jp: {
    name: 'Japan',
    urls: [
      'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    ],
  },
  kr: {
    name: 'South Korea',
    urls: [
      'https://www.hikorea.go.kr/Main.pt',
    ],
  },
  vn: {
    name: 'Vietnam',
    urls: [
      'https://evisa.xuatnhapcanh.gov.vn/',
    ],
  },
  ph: {
    name: 'Philippines',
    urls: [
      'https://immigration.gov.ph/',
    ],
  },
};

// ── Known visa types per country (seed data) ─────────────────────────
export interface VisaRuleSeed {
  country_code: string;
  visa_type: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  processing_time: string;
  cost: string;
  validity: string;
  source_url: string;
}

const SEED_DATA: VisaRuleSeed[] = [
  // ── United States ──
  {
    country_code: 'us',
    visa_type: 'H-1B',
    title: 'H-1B Specialty Occupation Visa',
    description: 'For professionals in specialty occupations requiring at least a bachelor\'s degree. Subject to annual lottery with 65,000 regular cap plus 20,000 master\'s cap.',
    requirements: {
      education: 'Bachelor\'s degree or equivalent in a specialty field',
      job_offer: 'Required from a US employer',
      salary: 'Must meet prevailing wage for the position',
      documents: ['Passport', 'Degree transcripts', 'Labor Condition Application (LCA)', 'Form I-129', 'Resume/CV'],
      sponsorship_required: true,
      quota_limited: true,
      annual_quota: 85000,
    },
    processing_time: '3-6 months (premium processing: 15 business days)',
    cost: '$1,710 base + $500 anti-fraud fee + $750/$1,500 ACWIA fee',
    validity: '3 years, renewable once for 3 more years (6 years total)',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations',
  },
  {
    country_code: 'us',
    visa_type: 'L-1A',
    title: 'L-1A Intra-Company Transfer (Manager/Executive)',
    description: 'For managers and executives transferring from a foreign office to a US branch, subsidiary, or affiliate of the same employer.',
    requirements: {
      employment: 'At least 1 year of continuous employment with the company abroad in the last 3 years',
      role: 'Manager or executive position',
      documents: ['Passport', 'Form I-129', 'Proof of qualifying relationship between companies', 'Employment verification'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-7 months (premium processing: 15 business days)',
    cost: '$1,710 base + $500 anti-fraud fee',
    validity: '1-3 years initial, renewable up to 7 years total',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1a-intracompany-transferee-executive-or-manager',
  },
  {
    country_code: 'us',
    visa_type: 'L-1B',
    title: 'L-1B Intra-Company Transfer (Specialized Knowledge)',
    description: 'For employees with specialized knowledge transferring within the same multinational company to a US office.',
    requirements: {
      employment: 'At least 1 year of continuous employment with the company abroad in the last 3 years',
      knowledge: 'Specialized knowledge of company products, services, or procedures',
      documents: ['Passport', 'Form I-129', 'Proof of specialized knowledge', 'Employment records'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-7 months (premium processing: 15 business days)',
    cost: '$1,710 base + $500 anti-fraud fee',
    validity: '1-3 years initial, renewable up to 5 years total',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1b-intracompany-transferee-specialized-knowledge',
  },
  {
    country_code: 'us',
    visa_type: 'O-1A',
    title: 'O-1A Extraordinary Ability (Sciences, Education, Business, Athletics)',
    description: 'For individuals with extraordinary ability demonstrated by sustained national or international acclaim.',
    requirements: {
      evidence: 'Must demonstrate extraordinary ability through at least 3 of 8 criteria (awards, publications, high salary, etc.)',
      documents: ['Passport', 'Form I-129', 'Evidence of extraordinary ability', 'Advisory opinion from peer group'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-6 months (premium processing: 15 business days)',
    cost: '$1,710 base',
    validity: 'Up to 3 years, renewable in 1-year increments',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/o-1-visa-individuals-with-extraordinary-ability-or-achievement',
  },
  {
    country_code: 'us',
    visa_type: 'TN',
    title: 'TN USMCA Professional Visa',
    description: 'For Canadian and Mexican citizens in specific professional occupations under the USMCA (formerly NAFTA) agreement.',
    requirements: {
      citizenship: 'Canadian or Mexican citizen',
      occupation: 'Must be in a USMCA-designated profession (e.g., engineer, accountant, scientist)',
      education: 'Relevant degree or credentials for the profession',
      documents: ['Passport', 'Job offer letter', 'Degree/credential proof', 'TN application (Form I-129 for Mexicans)'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: 'At port of entry for Canadians; 3-4 months for Mexicans',
    cost: '$50 (at border) or $1,710 (Form I-129)',
    validity: '3 years, renewable indefinitely',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/tn-nafta-professionals',
  },
  {
    country_code: 'us',
    visa_type: 'EB-2 NIW',
    title: 'EB-2 National Interest Waiver (Green Card)',
    description: 'Permanent residency pathway for professionals with advanced degrees or exceptional ability whose work benefits the US national interest. No employer sponsorship needed.',
    requirements: {
      education: 'Advanced degree (master\'s+) or bachelor\'s + 5 years progressive experience',
      merit: 'Must demonstrate substantial merit, national scope, and that waiving labor certification benefits the US',
      documents: ['Passport', 'Form I-140', 'Degree transcripts', 'Evidence of national interest', 'Letters of recommendation'],
      sponsorship_required: false,
      quota_limited: true,
    },
    processing_time: '12-18 months (premium processing available for I-140)',
    cost: '$700 (I-140) + $1,225 (adjustment of status)',
    validity: 'Permanent',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-second-preference-eb-2',
  },

  // ── Canada ──
  {
    country_code: 'ca',
    visa_type: 'Express Entry',
    title: 'Express Entry (Federal Skilled Worker)',
    description: 'Points-based immigration system for skilled workers. Candidates are ranked by Comprehensive Ranking System (CRS) score based on age, education, language, and work experience.',
    requirements: {
      experience: 'At least 1 year of continuous skilled work experience in the last 10 years',
      language: 'CLB 7+ in English or French (IELTS/CELPIP/TEF)',
      education: 'Post-secondary education (foreign credentials must be assessed by ECA)',
      points: 'Must score 67+ on the Federal Skilled Worker points grid',
      documents: ['Passport', 'Language test results', 'Educational Credential Assessment', 'Work reference letters', 'Police certificates'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '6 months (after ITA)',
    cost: 'CAD $1,365 (processing + RPRF)',
    validity: 'Permanent residency',
    source_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
  },
  {
    country_code: 'ca',
    visa_type: 'LMIA Work Permit',
    title: 'Employer-Specific Work Permit (LMIA)',
    description: 'Requires a Canadian employer to obtain a Labour Market Impact Assessment proving no Canadian worker is available for the role.',
    requirements: {
      job_offer: 'Valid job offer from a Canadian employer with approved LMIA',
      documents: ['Passport', 'LMIA approval letter', 'Job offer letter', 'Proof of qualifications', 'Police certificates'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months (LMIA) + 2-4 months (work permit)',
    cost: 'CAD $155 (work permit) + $1,000 LMIA fee (employer)',
    validity: 'Duration of job offer, typically 1-3 years',
    source_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html',
  },
  {
    country_code: 'ca',
    visa_type: 'Global Talent Stream',
    title: 'Global Talent Stream',
    description: 'Fast-tracked work permit for highly skilled tech workers. Employers must be referred by a designated partner and commit to creating jobs for Canadians.',
    requirements: {
      employer: 'Must be referred by a designated referral partner',
      skills: 'Unique, specialized talent in tech or other high-demand fields',
      documents: ['Passport', 'Job offer letter', 'Proof of specialized skills', 'Labour Market Benefits Plan'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2 weeks (expedited processing)',
    cost: 'CAD $155 (work permit) + $1,000 LMIA fee (employer)',
    validity: 'Up to 3 years',
    source_url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers/global-talent.html',
  },
  {
    country_code: 'ca',
    visa_type: 'Startup Visa',
    title: 'Canada Startup Visa',
    description: 'Permanent residency for entrepreneurs with a qualifying business supported by a designated Canadian angel investor, venture capital fund, or business incubator.',
    requirements: {
      business: 'Qualifying business with letter of support from a designated organization',
      language: 'CLB 5 in English or French',
      funds: 'Proof of settlement funds',
      documents: ['Passport', 'Letter of support', 'Language test', 'Proof of funds', 'Business plan'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '12-16 months',
    cost: 'CAD $2,140 (processing + RPRF)',
    validity: 'Permanent residency',
    source_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/start-visa.html',
  },

  // ── United Kingdom ──
  {
    country_code: 'gb',
    visa_type: 'Skilled Worker',
    title: 'Skilled Worker Visa',
    description: 'Main work visa for skilled professionals with a job offer from an approved UK employer (sponsor). Replaced the Tier 2 General visa.',
    requirements: {
      job_offer: 'From an approved UK sponsor at RQF level 3 or above',
      salary: 'Minimum £26,200/year or the going rate for the role (whichever is higher)',
      english: 'B1 English level (IELTS or equivalent)',
      documents: ['Passport', 'Certificate of Sponsorship', 'Proof of English', 'Financial evidence', 'TB test (if applicable)'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-8 weeks',
    cost: '£719-£1,420 (visa) + £1,035/year Immigration Health Surcharge',
    validity: 'Up to 5 years, renewable; can lead to settlement after 5 years',
    source_url: 'https://www.gov.uk/skilled-worker-visa',
  },
  {
    country_code: 'gb',
    visa_type: 'Global Talent',
    title: 'Global Talent Visa',
    description: 'For leaders and emerging leaders in academia, research, digital technology, arts, and culture. No job offer required.',
    requirements: {
      endorsement: 'Endorsement from a recognized UK body (Tech Nation, UK Research & Innovation, etc.)',
      evidence: 'Proof of being a leader or emerging leader in your field',
      documents: ['Passport', 'Endorsement letter', 'Evidence of achievements', 'Financial evidence'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-8 weeks (endorsement) + 3-8 weeks (visa)',
    cost: '£716 (visa) + £1,035/year IHS',
    validity: 'Up to 5 years, renewable; can lead to settlement after 3-5 years',
    source_url: 'https://www.gov.uk/global-talent',
  },
  {
    country_code: 'gb',
    visa_type: 'Scale-up',
    title: 'Scale-up Worker Visa',
    description: 'For skilled workers hired by a qualifying UK scale-up company. After 6 months, the visa becomes unsponsored and you can work for any employer.',
    requirements: {
      job_offer: 'From a UK scale-up sponsor at RQF 6+ level',
      salary: 'Minimum £36,300/year',
      english: 'B1 English level',
      documents: ['Passport', 'Certificate of Sponsorship', 'Proof of English', 'Financial evidence'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-8 weeks',
    cost: '£822 (visa) + £1,035/year IHS',
    validity: '2 years, renewable; can lead to settlement after 5 years',
    source_url: 'https://www.gov.uk/scale-up-worker-visa',
  },
  {
    country_code: 'gb',
    visa_type: 'Innovator Founder',
    title: 'Innovator Founder Visa',
    description: 'For experienced entrepreneurs starting an innovative business in the UK. Requires endorsement from an approved body.',
    requirements: {
      business: 'Innovative, viable, and scalable business idea',
      endorsement: 'From an approved endorsing body',
      funds: '£1,270 in personal savings',
      documents: ['Passport', 'Endorsement letter', 'Business plan', 'Proof of funds', 'English proficiency'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-8 weeks',
    cost: '£1,191 (visa) + £1,035/year IHS',
    validity: '3 years, renewable; can lead to settlement after 3 years',
    source_url: 'https://www.gov.uk/innovator-founder-visa',
  },

  // ── Switzerland ──
  {
    country_code: 'ch',
    visa_type: 'L Permit',
    title: 'L Permit (Short-Term Residence)',
    description: 'Short-term residence permit for non-EU/EFTA nationals with a Swiss employment contract of less than 1 year.',
    requirements: {
      job_offer: 'Employment contract in Switzerland for less than 12 months',
      qualification: 'Must demonstrate required qualifications for the role',
      documents: ['Passport', 'Employment contract', 'Qualification certificates', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '6-10 weeks',
    cost: 'CHF 150-250',
    validity: 'Duration of contract, up to 12 months',
    source_url: 'https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/nicht_eu_efta.html',
  },
  {
    country_code: 'ch',
    visa_type: 'B Permit',
    title: 'B Permit (Residence Permit)',
    description: 'Annual residence permit for non-EU/EFTA nationals with a Swiss employment contract of 1 year or more. Subject to annual quotas.',
    requirements: {
      job_offer: 'Employment contract in Switzerland for 12+ months',
      qualification: 'Must be a qualified specialist; employer must prove no local candidate available',
      documents: ['Passport', 'Employment contract', 'Degree certificates', 'Proof of accommodation', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '8-14 weeks',
    cost: 'CHF 150-250',
    validity: '1 year, renewable annually; can lead to C permit after 5-10 years',
    source_url: 'https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/nicht_eu_efta.html',
  },

  // ── Germany ──
  {
    country_code: 'de',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Germany',
    description: 'Work permit for highly qualified non-EU workers with a university degree and a job offer meeting the minimum salary threshold. Fastest path to permanent residence.',
    requirements: {
      education: 'Recognized university degree',
      salary: 'Minimum €45,300/year (€41,042 for shortage occupations like IT, engineering)',
      job_offer: 'Binding job offer or employment contract in Germany',
      documents: ['Passport', 'Employment contract', 'Recognized degree certificate', 'CV', 'Health insurance proof'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-12 weeks',
    cost: '€100 (visa) + €100 (residence permit)',
    validity: '4 years or contract duration + 3 months; permanent residence after 27 months (21 with B1 German)',
    source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card',
  },
  {
    country_code: 'de',
    visa_type: 'Skilled Worker',
    title: 'Skilled Immigration Act Work Visa',
    description: 'For skilled workers with recognized qualifications (vocational or academic) and a job offer in Germany. Broadened under the 2024 Skilled Immigration Act reforms.',
    requirements: {
      qualification: 'Recognized professional or academic qualification',
      job_offer: 'Employment contract related to qualification',
      documents: ['Passport', 'Employment contract', 'Qualification recognition certificate', 'CV', 'German or English proficiency proof'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-12 weeks',
    cost: '€75-100 (visa) + €100 (residence permit)',
    validity: 'Up to 4 years, renewable; permanent residence after 4 years',
    source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/work',
  },
  {
    country_code: 'de',
    visa_type: 'IT Specialist',
    title: 'IT Specialist Visa (No Degree Required)',
    description: 'Work visa for IT professionals without a formal degree. Requires at least 3 years of relevant IT work experience and a minimum salary.',
    requirements: {
      experience: '3+ years of relevant IT work experience in the last 7 years',
      salary: 'Minimum €41,042/year',
      skills: 'Demonstrated IT expertise (programming, systems admin, cybersecurity, etc.)',
      documents: ['Passport', 'Employment contract', 'Proof of IT experience', 'CV', 'Reference letters'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-12 weeks',
    cost: '€75-100 (visa) + €100 (residence permit)',
    validity: 'Up to 4 years, renewable',
    source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/it-specialists',
  },
  {
    country_code: 'de',
    visa_type: 'Freelance Visa',
    title: 'Freelance / Self-Employment Visa',
    description: 'Residence permit for freelancers and self-employed professionals. Must demonstrate that the activity will benefit the German economy.',
    requirements: {
      business_plan: 'Detailed business plan with financial projections',
      experience: 'Relevant professional experience',
      funds: 'Proof of sustainable income or funding',
      documents: ['Passport', 'Business plan', 'Client contracts or letters of intent', 'Financial statements', 'Professional portfolio'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-16 weeks',
    cost: '€75-100 (visa) + €100 (residence permit)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/self-employment',
  },

  // ── France ──
  {
    country_code: 'fr',
    visa_type: 'Talent Passport',
    title: 'Passeport Talent (Talent Passport)',
    description: 'Multi-year residence permit for highly skilled workers, researchers, entrepreneurs, investors, and artists. Includes the former "skills and talents" visa.',
    requirements: {
      salary: 'Minimum 1.5x French minimum wage (about €2,700/month gross)',
      qualification: 'Master\'s degree or 5+ years professional experience',
      job_offer: 'Employment contract for eligible position',
      documents: ['Passport', 'Employment contract', 'Degree certificates', 'Proof of qualifications'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-8 weeks',
    cost: '€99 (visa) + €225 (residence permit tax)',
    validity: 'Up to 4 years, renewable',
    source_url: 'https://france-visas.gouv.fr/en/web/france-visas/long-stay-visa',
  },
  {
    country_code: 'fr',
    visa_type: 'Salaried Worker',
    title: 'Salaried Worker Visa (Salarié)',
    description: 'Standard work visa requiring a French employer to obtain a work authorization from DIRECCTE. For positions not eligible for the Talent Passport.',
    requirements: {
      job_offer: 'Employment contract with a French employer',
      labor_test: 'Employer must prove no suitable local candidate was found',
      documents: ['Passport', 'Employment contract', 'Work authorization', 'Degree/qualification proof'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-12 weeks',
    cost: '€99 (visa) + €225 (residence permit)',
    validity: '1 year, renewable',
    source_url: 'https://france-visas.gouv.fr/en/web/france-visas/long-stay-visa',
  },
  {
    country_code: 'fr',
    visa_type: 'French Tech Visa',
    title: 'French Tech Visa',
    description: 'Simplified Talent Passport for employees of French Tech-certified startups, founders, and investors. Streamlined application process.',
    requirements: {
      company: 'Must be hired by or founding a French Tech-certified company',
      salary: 'Minimum 1.5x French minimum wage',
      documents: ['Passport', 'Employment contract or business plan', 'French Tech certification proof'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '2-4 weeks (fast-tracked)',
    cost: '€99 (visa) + €225 (residence permit)',
    validity: 'Up to 4 years',
    source_url: 'https://lafrenchtech.com/en/how-france-helps-startups/french-tech-visa/',
  },
];

// ── Parse Gemini response safely ─────────────────────────────────────
function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const match = stripped.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    return JSON.parse(match[0]);
  }
}

// ── Scrape a URL and extract text ────────────────────────────────────
async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HireMatchBot/1.0; +https://hirematch.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Strip HTML tags, keep text content
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit for Gemini context
  } catch {
    return '';
  }
}

// ── Use Gemini to structure scraped content ──────────────────────────
async function parseVisaDataWithAI(
  countryCode: string,
  countryName: string,
  scrapedText: string
): Promise<Array<{
  visa_type: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  processing_time: string;
  cost: string;
  validity: string;
}>> {
  const prompt = `You are an expert immigration consultant. Parse the following scraped text from the ${countryName} government immigration website and extract all work visa/permit types available for foreign workers.

For each visa type, extract:
- visa_type: short identifier (e.g. "H-1B", "Skilled Worker", "Blue Card")
- title: full official name
- description: 2-3 sentence overview
- requirements: object with keys like education, experience, salary, language, documents (array), sponsorship_required (boolean), quota_limited (boolean)
- processing_time: typical processing duration
- cost: fees in local currency
- validity: how long the visa is valid

Return ONLY valid JSON as an array of objects.

If the text doesn't contain enough information about a specific field, use reasonable estimates based on your knowledge of ${countryName}'s immigration system.

SCRAPED TEXT:
${scrapedText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJSON(text);
}

// ── Main scrape function for a country ───────────────────────────────
export async function scrapeVisaRules(countryCode: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const source = VISA_SOURCES[countryCode];
  if (!source) {
    return { success: false, count: 0, error: `Unknown country: ${countryCode}` };
  }

  const supabase = await createServiceClient();

  try {
    // Step 1: Fetch page text from all source URLs
    const pageTexts = await Promise.all(
      source.urls.map((url) => fetchPageText(url))
    );
    const combinedText = pageTexts.filter(Boolean).join('\n\n---\n\n');

    let visaData: Array<{
      visa_type: string;
      title: string;
      description: string;
      requirements: Record<string, unknown>;
      processing_time: string;
      cost: string;
      validity: string;
    }>;

    if (combinedText.length > 200) {
      // Step 2: Use Gemini to parse scraped content
      visaData = await parseVisaDataWithAI(countryCode, source.name, combinedText);
    } else {
      // Fallback: Use seed data if scraping didn't yield enough content
      const seeds = SEED_DATA.filter((s) => s.country_code === countryCode);
      if (seeds.length === 0) {
        // Generate visa data from Gemini's knowledge
        const prompt = `You are an expert immigration consultant. List all major work visa and permit types available for foreign workers wanting to work in ${source.name}.

For each visa type, provide:
- visa_type: short identifier
- title: full official name
- description: 2-3 sentence overview
- requirements: object with education, experience, salary, language, documents (array), sponsorship_required (boolean), quota_limited (boolean)
- processing_time: typical processing duration
- cost: fees in local currency
- validity: how long the visa is valid

Return ONLY valid JSON as an array of at least 3 visa types.`;

        const result = await model.generateContent(prompt);
        visaData = parseJSON(result.response.text());
      } else {
        visaData = seeds.map((s) => ({
          visa_type: s.visa_type,
          title: s.title,
          description: s.description,
          requirements: s.requirements,
          processing_time: s.processing_time,
          cost: s.cost,
          validity: s.validity,
        }));
      }
    }

    // Step 3: Upsert into visa_rules table
    let upsertCount = 0;
    for (const visa of visaData) {
      const { error } = await supabase
        .from('visa_rules')
        .upsert(
          {
            country_code: countryCode,
            visa_type: visa.visa_type,
            title: visa.title,
            description: visa.description,
            requirements: visa.requirements,
            processing_time: visa.processing_time,
            cost: visa.cost,
            validity: visa.validity,
            source_url: source.urls[0],
            last_scraped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'country_code,visa_type' }
        );

      if (!error) upsertCount++;
    }

    return { success: true, count: upsertCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Visa scrape error for ${countryCode}:`, message);
    return { success: false, count: 0, error: message };
  }
}

// ── Seed initial data for key countries ──────────────────────────────
export async function seedVisaRules(): Promise<{
  success: boolean;
  total: number;
  error?: string;
}> {
  const supabase = await createServiceClient();
  let total = 0;

  try {
    for (const seed of SEED_DATA) {
      const { error } = await supabase
        .from('visa_rules')
        .upsert(
          {
            country_code: seed.country_code,
            visa_type: seed.visa_type,
            title: seed.title,
            description: seed.description,
            requirements: seed.requirements,
            processing_time: seed.processing_time,
            cost: seed.cost,
            validity: seed.validity,
            source_url: seed.source_url,
            last_scraped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'country_code,visa_type' }
        );

      if (!error) total++;
    }

    return { success: true, total };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Visa seed error:', message);
    return { success: false, total, error: message };
  }
}

// ── Scrape all countries ─────────────────────────────────────────────
export async function scrapeAllCountries(): Promise<{
  results: Record<string, { success: boolean; count: number; error?: string }>;
  totalSuccess: number;
  totalFailed: number;
}> {
  const countryCodes = Object.keys(VISA_SOURCES);
  const results: Record<string, { success: boolean; count: number; error?: string }> = {};
  let totalSuccess = 0;
  let totalFailed = 0;

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < countryCodes.length; i += 5) {
    const batch = countryCodes.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((code) => scrapeVisaRules(code))
    );

    batch.forEach((code, idx) => {
      results[code] = batchResults[idx];
      if (batchResults[idx].success) totalSuccess++;
      else totalFailed++;
    });

    // Brief pause between batches
    if (i + 5 < countryCodes.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { results, totalSuccess, totalFailed };
}

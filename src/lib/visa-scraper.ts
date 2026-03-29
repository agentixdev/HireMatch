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
      'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/all-visa-categories.html',
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
  {
    country_code: 'us',
    visa_type: 'H-2B',
    title: 'H-2B Temporary Non-Agricultural Worker Visa',
    description: 'For temporary workers in non-agricultural industries (hospitality, landscaping, construction, etc.) when US workers are unavailable. Employer must obtain a temporary labor certification from the Department of Labor before petitioning USCIS.',
    requirements: {
      job_offer: 'Valid temporary job offer from a US employer with DOL temporary labor certification',
      temporariness: 'Position must be temporary in nature (one-time occurrence, seasonal, peak-load, or intermittent need)',
      documents: ['Passport', 'Form I-129', 'DOL Temporary Labor Certification', 'Job offer letter', 'Evidence of temporary need'],
      sponsorship_required: true,
      quota_limited: true,
      annual_quota: 66000,
    },
    processing_time: '2-4 months (premium processing: 15 business days)',
    cost: '$460 (I-129 filing fee) + $190 (consular visa fee)',
    validity: 'Up to 1 year; extendable in 1-year increments up to 3 years total',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-2b-non-agricultural-workers',
  },
  {
    country_code: 'us',
    visa_type: 'E-1',
    title: 'E-1 Treaty Trader Visa',
    description: 'For nationals of countries with qualifying US commerce treaties who come to the US to carry on substantial trade (goods, services, technology) principally between the US and their treaty country. At least 50% of trade volume must be between the US and the treaty country.',
    requirements: {
      nationality: 'Must be a national of a country with a qualifying US bilateral commerce treaty',
      trade: 'Substantial, ongoing trade principally between the US and the treaty country (50%+ of total trade volume)',
      role: 'Must be employed in a supervisory/executive capacity or possess essential skills',
      documents: ['Passport', 'DS-160 visa application', 'Proof of treaty country nationality', 'Trade evidence (invoices, contracts, shipping records)', 'Employment offer or ownership documents'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '2-8 weeks (at US consulate abroad)',
    cost: '$205 (MRV visa application fee)',
    validity: 'Up to 5 years (varies by country reciprocity); admitted for 2-year periods, extensions available indefinitely',
    source_url: 'https://travel.state.gov/content/travel/en/us-visas/employment/treaty-trader-investor-visas.html',
  },
  {
    country_code: 'us',
    visa_type: 'E-2',
    title: 'E-2 Treaty Investor Visa',
    description: 'For nationals of treaty countries who invest a substantial amount of capital in a US enterprise and come to develop and direct that investment. The investment must be at risk and the business must be a real, operating enterprise.',
    requirements: {
      nationality: 'Must be a national of a country with a qualifying US bilateral investment treaty',
      investment: 'Substantial investment of capital (typically $100,000+ for most businesses; no absolute minimum, but must be proportional to total business cost)',
      control: 'Must own at least 50% of the enterprise or have operational control',
      viability: 'Business must be more than a marginal enterprise (must generate more than enough income to support investor and family)',
      documents: ['Passport', 'DS-160 visa application', 'Investment evidence (bank records, contracts, financial statements)', 'Business plan', 'Proof of treaty nationality'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '2-8 weeks (at US consulate abroad); extensions filed with USCIS via Form I-129',
    cost: '$205 (MRV visa application fee)',
    validity: 'Up to 5 years (varies by country reciprocity); admitted for 2-year periods, indefinitely renewable',
    source_url: 'https://travel.state.gov/content/travel/en/us-visas/employment/treaty-trader-investor-visas.html',
  },
  {
    country_code: 'us',
    visa_type: 'E-3',
    title: 'E-3 Australian Specialty Occupation Visa',
    description: 'Exclusively for Australian nationals working in specialty occupations requiring at least a bachelor\'s degree. Functionally similar to the H-1B but with a separate annual cap and no lottery.',
    requirements: {
      nationality: 'Must be an Australian citizen',
      education: 'Bachelor\'s degree or equivalent in a relevant specialty field',
      job_offer: 'Valid job offer in a specialty occupation from a US employer',
      salary: 'Must meet prevailing wage for the position (supported by Labor Condition Application)',
      documents: ['Passport (Australian)', 'DS-160 visa application', 'Labor Condition Application (LCA)', 'Degree transcripts', 'Employer job offer letter'],
      sponsorship_required: true,
      quota_limited: true,
      annual_quota: 10500,
    },
    processing_time: '2-6 weeks (consular processing); no premium processing available',
    cost: '$205 (MRV visa application fee) + LCA filing (no fee)',
    validity: '2 years per admission, renewable indefinitely in 2-year increments',
    source_url: 'https://travel.state.gov/content/travel/en/us-visas/employment/e3-visa.html',
  },
  {
    country_code: 'us',
    visa_type: 'O-1B',
    title: 'O-1B Extraordinary Ability Visa (Arts / Film / TV)',
    description: 'For individuals with extraordinary ability in the arts, or extraordinary achievement in the motion picture or television industry, demonstrated by a level of distinction far above the ordinary.',
    requirements: {
      evidence: 'Must demonstrate extraordinary ability through evidence such as critical roles, high salary, commercial success, reviews from distinguished critics, or leading/starring roles',
      arts_distinction: 'For arts: must be renowned, leading, or well-known in the field; for film/TV: must demonstrate a high level of achievement',
      documents: ['Passport', 'Form I-129', 'Evidence of extraordinary ability/achievement', 'Consultation letter from an appropriate peer group or union', 'Itinerary of events/engagements'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-6 months (premium processing: 15 business days)',
    cost: '$1,710 base filing fee',
    validity: 'Up to 3 years for the initial event/activity; 1-year extensions thereafter',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/o-1-visa-individuals-with-extraordinary-ability-or-achievement',
  },
  {
    country_code: 'us',
    visa_type: 'P-1A',
    title: 'P-1A Internationally Recognized Athlete Visa',
    description: 'For individual athletes or athletic teams recognized internationally who come to the US to compete at an internationally recognized level of performance. Covers professional and amateur athletes.',
    requirements: {
      recognition: 'Must be internationally recognized with a high level of achievement evidenced by a degree of skill and recognition substantially above that ordinarily encountered',
      competition: 'Must be coming to perform at a specific athletic competition or event',
      documents: ['Passport', 'Form I-129', 'Evidence of international recognition (rankings, awards, media coverage)', 'Consultation letter from an appropriate labor organization', 'Itinerary of competitions'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-5 months (premium processing: 15 business days)',
    cost: '$1,710 base filing fee',
    validity: 'Up to 5 years for team members; 1-year increments for essential support personnel; extensions up to 10 years total',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/p-1a-internationally-recognized-athlete',
  },
  {
    country_code: 'us',
    visa_type: 'P-1B',
    title: 'P-1B Internationally Recognized Entertainment Group Visa',
    description: 'For members of internationally recognized entertainment groups (bands, dance troupes, orchestras, etc.) coming to perform in the US. At least 75% of the members must have been with the group for at least one year.',
    requirements: {
      recognition: 'Group must be internationally recognized with a sustained and substantial reputation',
      membership: '75%+ of current members must have been with the group for at least 1 year',
      performance: 'Must be coming to perform for a specific engagement',
      documents: ['Passport', 'Form I-129', 'Evidence of international recognition', 'Consultation letter from an appropriate labor organization', 'Performance itinerary and contracts'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-5 months (premium processing: 15 business days)',
    cost: '$1,710 base filing fee',
    validity: 'Up to 1 year per engagement; 1-year extensions; no maximum cap',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/p-1b-member-of-internationally-recognized-entertainment-group',
  },
  {
    country_code: 'us',
    visa_type: 'R-1',
    title: 'R-1 Temporary Religious Worker Visa',
    description: 'For foreign nationals coming to the US temporarily to work as a minister or in a religious vocation or occupation for a bona fide, non-profit religious organization. The organization must be a US tax-exempt religious organization.',
    requirements: {
      religion: 'Must be a member of the religious denomination for at least 2 years immediately preceding the petition',
      role: 'Must be performing work as a minister, in a professional religious capacity, or in a religious vocation/occupation',
      organization: 'Petitioning organization must be a bona fide non-profit religious organization recognized as tax-exempt under IRS 501(c)(3)',
      documents: ['Passport', 'Form I-129', 'Evidence of religious membership (2+ years)', 'IRS tax-exemption letter', 'Employer attestation', 'Evidence of compensation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-6 months (premium processing: 15 business days)',
    cost: '$460 (I-129 filing fee) + $190 (consular visa fee)',
    validity: 'Up to 30 months initially; extendable up to 5 years total',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/r-1-temporary-religious-workers',
  },
  {
    country_code: 'us',
    visa_type: 'EB-1A',
    title: 'EB-1A Extraordinary Ability (Employment-Based Green Card)',
    description: 'First-preference employment-based green card for individuals with extraordinary ability in sciences, arts, education, business, or athletics. No employer sponsorship required — you can self-petition via Form I-140.',
    requirements: {
      evidence: 'Must meet at least 3 of 10 criteria: major awards, membership in elite associations, press coverage, judging others\' work, original contributions, scholarly articles, exhibitions, leading role in distinguished organizations, high salary, commercial success',
      continued_work: 'Must intend to continue working in the area of extraordinary ability',
      documents: ['Passport', 'Form I-140 (self-petition)', 'Extensive evidence of extraordinary ability', 'Letters of recommendation from experts'],
      sponsorship_required: false,
      quota_limited: true,
    },
    processing_time: '12-24 months (I-140 premium processing: 15 business days; priority dates subject to visa bulletin)',
    cost: '$700 (I-140) + $1,440 (I-485 adjustment of status, if in US)',
    validity: 'Permanent (green card)',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-first-preference-eb-1',
  },
  {
    country_code: 'us',
    visa_type: 'EB-1B',
    title: 'EB-1B Outstanding Researcher or Professor (Employment-Based Green Card)',
    description: 'First-preference employment-based green card for outstanding professors and researchers with international recognition in their academic field. Requires employer sponsorship from a university, research institution, or private employer with a qualifying research department.',
    requirements: {
      recognition: 'Must be internationally recognized as outstanding in a specific academic field',
      experience: 'At least 3 years of research or teaching experience in the field',
      evidence: 'Must meet at least 2 of 6 criteria: major awards, membership in elite associations, published material about the researcher, judging others\' work, original scientific contributions, scholarly articles',
      job_offer: 'Permanent, tenure-track, or long-term research position at a qualifying institution',
      documents: ['Passport', 'Form I-140', 'Evidence of international recognition', 'Proof of 3+ years experience', 'Employer offer letter'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '12-24 months (I-140 premium processing: 15 business days; priority dates subject to visa bulletin)',
    cost: '$700 (I-140) + $1,440 (I-485 adjustment of status, if in US)',
    validity: 'Permanent (green card)',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-first-preference-eb-1',
  },
  {
    country_code: 'us',
    visa_type: 'EB-1C',
    title: 'EB-1C Multinational Manager or Executive (Employment-Based Green Card)',
    description: 'First-preference employment-based green card for managers and executives transferring to a US company from a qualifying related foreign company. The US employer must have been doing business for at least 1 year.',
    requirements: {
      employment_abroad: 'Must have been employed by the related foreign company for at least 1 of the past 3 years in a managerial or executive capacity',
      role_in_us: 'Must be coming to work in a managerial or executive capacity at the US company',
      corporate_relationship: 'US employer must be a subsidiary, parent, affiliate, or branch of the foreign employer',
      documents: ['Passport', 'Form I-140', 'Proof of qualifying corporate relationship', 'Employment verification (abroad and US)', 'Evidence of managerial/executive duties'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '12-24 months (I-140 premium processing: 15 business days; priority dates subject to visa bulletin)',
    cost: '$700 (I-140) + $1,440 (I-485 adjustment of status, if in US)',
    validity: 'Permanent (green card)',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-first-preference-eb-1',
  },
  {
    country_code: 'us',
    visa_type: 'EB-3',
    title: 'EB-3 Skilled Worker / Professional (Employment-Based Green Card)',
    description: 'Third-preference employment-based green card for skilled workers (2+ years training/experience), professionals (US bachelor\'s degree equivalent), and unskilled workers (less than 2 years training). Employer must obtain a PERM Labor Certification from the DOL.',
    requirements: {
      education: 'Skilled workers: 2+ years job experience or training; Professionals: US bachelor\'s degree or foreign equivalent; Other workers: less than 2 years training',
      job_offer: 'Permanent, full-time job offer from a US employer',
      perm: 'Employer must obtain approved PERM Labor Certification from DOL',
      documents: ['Passport', 'Form I-140', 'Approved PERM Labor Certification (ETA Form 9089)', 'Degree transcripts or experience letters', 'Job offer letter'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '2-5 years or more depending on country of birth and priority date (PERM: 6-18 months; I-140 premium: 15 business days)',
    cost: '$700 (I-140) + $1,440 (I-485 adjustment of status, if in US)',
    validity: 'Permanent (green card)',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-third-preference-eb-3',
  },
  {
    country_code: 'us',
    visa_type: 'EB-5',
    title: 'EB-5 Immigrant Investor Program (Employment-Based Green Card)',
    description: 'Fifth-preference employment-based green card for investors who invest substantial capital into a new commercial enterprise that creates at least 10 full-time jobs for qualifying US workers. Can invest directly or through an SEC-designated Regional Center.',
    requirements: {
      investment: 'Minimum $1,050,000 (standard) or $800,000 (in a Targeted Employment Area — rural or high unemployment)',
      job_creation: 'Must create or preserve at least 10 full-time jobs for qualifying US workers',
      source_of_funds: 'Must demonstrate that investment funds were lawfully obtained',
      documents: ['Passport', 'Form I-526E (Regional Center) or I-526 (direct)', 'Evidence of investment (bank records, corporate documents)', 'Source of funds documentation', 'Business plan with economic impact study'],
      sponsorship_required: false,
      quota_limited: true,
    },
    processing_time: '29-48 months for I-526/I-526E; additional 1-3 years for visa/adjustment (priority dates subject to visa bulletin)',
    cost: '$11,160 (I-526E) or $3,675 (I-526) + $1,440 (I-485 adjustment of status, if in US)',
    validity: 'Permanent (green card); conditional 2-year green card issued first, then conditions removed via I-829',
    source_url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-fifth-preference-eb-5-immigrant-investor',
  },
  {
    country_code: 'us',
    visa_type: 'H-1B1',
    title: 'H-1B1 Free Trade Agreement Professional Visa (Chile / Singapore)',
    description: 'Specialty occupation work visa exclusively for nationals of Chile and Singapore under their respective Free Trade Agreements with the US. Functionally similar to the H-1B but with separate annual caps, no lottery, and no premium processing.',
    requirements: {
      nationality: 'Must be a national of Chile or Singapore',
      education: 'Bachelor\'s degree or equivalent in a specialty occupation field',
      job_offer: 'Job offer in a specialty occupation from a US employer',
      salary: 'Must meet prevailing wage for the position (supported by Labor Condition Application)',
      documents: ['Passport (Chilean or Singaporean)', 'DS-160 visa application', 'Labor Condition Application (LCA)', 'Degree transcripts', 'Employer job offer letter'],
      sponsorship_required: true,
      quota_limited: true,
      annual_quota: 6800,
      notes: '1,400 reserved for Chilean nationals; 5,400 for Singaporean nationals per fiscal year',
    },
    processing_time: '2-8 weeks (consular processing only; no premium processing available)',
    cost: '$205 (MRV visa application fee) + LCA filing (no fee)',
    validity: '1 year per admission, renewable indefinitely in 1-year increments; no 6-year cap',
    source_url: 'https://travel.state.gov/content/travel/en/us-visas/employment/h1b1-free-trade.html',
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

  // ── Spain ──
  {
    country_code: 'es',
    visa_type: 'Highly Qualified Professional',
    title: 'Highly Qualified Professional Visa',
    description: 'Work visa for non-EU professionals with a university degree and a job offer in Spain. Requires the employer to prove the position could not be filled by an EU/EEA national.',
    requirements: {
      education: 'University degree or equivalent professional qualification',
      job_offer: 'Signed employment contract with a Spanish company',
      labor_test: 'Employer must pass a national labor market test (situación nacional de empleo)',
      documents: ['Passport', 'Employment contract', 'Degree certificate (apostilled)', 'Criminal background check', 'Medical certificate', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months',
    cost: '€80 (visa fee)',
    validity: '1 year, renewable; leads to long-term residence after 5 years',
    source_url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Trabajo.aspx',
  },
  {
    country_code: 'es',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card (Tarjeta Azul UE)',
    description: 'Work and residence permit for highly skilled non-EU workers with a university degree and a high-salary job offer in Spain. Provides an accelerated path to long-term residence.',
    requirements: {
      education: 'Recognized university degree (minimum 3 years of study)',
      salary: 'Minimum 1.5x the average gross annual salary in Spain (approx. €35,000+/year)',
      job_offer: 'Employment contract of at least 1 year',
      documents: ['Passport', 'Employment contract', 'Recognized degree certificate', 'Health insurance', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months',
    cost: '€80 (visa) + €16 (residence card)',
    validity: '2 years, renewable; long-term residence after 5 years (18 months EU mobility)',
    source_url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Trabajo.aspx',
  },
  {
    country_code: 'es',
    visa_type: 'Startup Entrepreneur',
    title: 'Startup Act Entrepreneur Visa (Ley de Startups)',
    description: 'Introduced by the 2022 Startup Act, this visa allows entrepreneurs and remote workers to live in Spain. Includes a special tax regime (Beckham Law) reducing income tax to a flat 24%.',
    requirements: {
      business_plan: 'Innovative business project with a positive evaluation from ENISA (national innovation agency)',
      funds: 'Proof of sufficient economic means (at least €27,792/year)',
      documents: ['Passport', 'Business plan', 'ENISA authorization', 'Health insurance', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '20 business days (guaranteed by law)',
    cost: '€80 (visa fee)',
    validity: '1 year initial; renewable for 2-year periods up to 5 years total',
    source_url: 'https://www.startupspain.gob.es/',
  },
  {
    country_code: 'es',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Permit (Traslado Intraempresarial)',
    description: 'Permit for employees of multinational companies transferred to a Spanish branch, subsidiary, or affiliate. No labor market test required.',
    requirements: {
      employment: 'At least 3 months of employment with the company abroad',
      role: 'Manager, specialist, or trainee employee',
      documents: ['Passport', 'Employment contract or letter of transfer', 'Proof of company relationship', 'Degree/qualification certificates', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '20 business days',
    cost: '€80 (visa fee)',
    validity: '1 year, renewable up to 3 years (managers/specialists) or 1 year (trainees)',
    source_url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Trabajo.aspx',
  },
  {
    country_code: 'es',
    visa_type: 'Golden Visa',
    title: 'Spain Investor Visa (Golden Visa)',
    description: 'Residence visa for significant investors in Spain. Grants immediate legal residency and the right to work without a labor market test. The real estate investment route was abolished in April 2024.',
    requirements: {
      investment: 'Minimum €1,000,000 in Spanish company shares/bank deposits, or €2,000,000 in Spanish public debt',
      documents: ['Passport', 'Proof of investment', 'Criminal background check', 'Health insurance', 'Proof of accommodation'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '20 business days',
    cost: '€80 (visa fee)',
    validity: '1 year (visa), renewable as 2-year residence permits; permanent residence after 5 years',
    source_url: 'https://www.exteriores.gob.es/es/EmbajadasConsulados/Paginas/EmbajadasConsulados.aspx',
  },

  // ── Italy ──
  {
    country_code: 'it',
    visa_type: 'Nulla Osta',
    title: 'Work Visa with Nulla Osta (Decreto Flussi)',
    description: 'The primary work visa for non-EU nationals, tied to the annual Flows Decree (Decreto Flussi) which sets quotas for non-EU workers. The employer must obtain a Nulla Osta (authorization to work) from the immigration desk.',
    requirements: {
      job_offer: 'Employment contract with an Italian employer',
      quota: 'Position must fall within the annual Flows Decree quota allocation',
      documents: ['Passport', 'Nulla Osta authorization', 'Employment contract', 'Degree/qualification certificates', 'Criminal background check', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '2-6 months',
    cost: '€116 (visa fee) + €30-200 (permit card)',
    validity: 'Up to 2 years (subordinate work); renewable',
    source_url: 'https://vistoperitalia.esteri.it/home/en',
  },
  {
    country_code: 'it',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Italy (Carta Blu UE)',
    description: 'Work and residence permit for highly qualified non-EU professionals. Exempt from Flows Decree quotas, making it significantly easier to obtain than standard work visas.',
    requirements: {
      education: 'Higher education qualification (at least 3 years of study) recognized in Italy',
      salary: 'Annual gross salary of at least €26,000 (or 1.5x the average Italian salary)',
      job_offer: 'Employment contract of at least 1 year in a qualified occupation',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Health insurance', 'Criminal background check', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: '€116 (visa) + €30-200 (permit card)',
    validity: '2 years, renewable; permanent residence after 5 years',
    source_url: 'https://www.lavoro.gov.it/en/immigration/Pages/EU-Blue-Card.aspx',
  },
  {
    country_code: 'it',
    visa_type: 'Self-Employment Visa',
    title: 'Self-Employment Visa (Visto per Lavoro Autonomo)',
    description: 'For freelancers, entrepreneurs, artists, and professionals who intend to carry out self-employed activities in Italy. Subject to quota limits under the Flows Decree for most categories.',
    requirements: {
      business_plan: 'Detailed description of the self-employed activity',
      funds: 'Proof of sufficient income or financial resources',
      authorization: 'Pre-authorization from relevant Italian authority (e.g., professional order, chamber of commerce)',
      documents: ['Passport', 'Authorization letter', 'Business plan or client contracts', 'Proof of funds', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: true,
    },
    processing_time: '2-4 months',
    cost: '€116 (visa fee)',
    validity: '2 years, renewable',
    source_url: 'https://vistoperitalia.esteri.it/home/en',
  },
  {
    country_code: 'it',
    visa_type: 'Startup Visa',
    title: 'Italy Startup Visa',
    description: 'Visa for non-EU entrepreneurs wishing to establish an innovative startup in Italy. Applications are processed through the certified incubator network and receive a fast-track response within 30 days.',
    requirements: {
      business_plan: 'Innovative startup project assessed by a certified Italian incubator',
      funds: 'Minimum €50,000 in committed capital',
      language: 'English or Italian proficiency',
      documents: ['Passport', 'Business plan', 'Incubator letter of commitment', 'Proof of funds', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '30 days',
    cost: '€116 (visa fee)',
    validity: '1 year, renewable up to 2 years if startup conditions are met',
    source_url: 'https://italiastartupvisa.mise.gov.it/',
  },
  {
    country_code: 'it',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Permit (Trasferimento Intra-Societario)',
    description: 'For managers, specialists, and graduate trainees transferred from a foreign entity to an Italian branch, subsidiary, or affiliate of the same multinational group.',
    requirements: {
      employment: 'At least 3 months of continuous employment with the company abroad',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Letter of assignment', 'Proof of corporate relationship', 'Employment contract', 'Degree certificates'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: '€116 (visa) + €30-200 (permit card)',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://vistoperitalia.esteri.it/home/en',
  },

  // ── Netherlands ──
  {
    country_code: 'nl',
    visa_type: 'Highly Skilled Migrant',
    title: 'Highly Skilled Migrant Permit (Kennismigrant)',
    description: 'The primary work permit for non-EU skilled professionals in the Netherlands. No labor market test required; processing is fast when filed through a recognized IND sponsor.',
    requirements: {
      salary: 'Minimum gross monthly salary of €5,688 (age 30+) or €4,171 (under 30); €2,989 for graduates (2024)',
      job_offer: 'Employment with a recognized IND-registered sponsor (employer)',
      documents: ['Passport', 'Employment contract', 'Employer\'s sponsor declaration', 'Degree certificates (apostilled)', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€350 (IND fee)',
    validity: 'Duration of employment contract, up to 5 years; renewable',
    source_url: 'https://ind.nl/en/residence-permits/work/highly-skilled-migrant',
  },
  {
    country_code: 'nl',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Netherlands',
    description: 'Work and residence permit for highly qualified non-EU nationals, offering EU-wide mobility after 18 months. Requires a higher salary threshold than the standard Highly Skilled Migrant permit.',
    requirements: {
      education: 'Higher education diploma (at least 3 years)',
      salary: 'Minimum €5,688 gross/month (2024)',
      job_offer: 'Employment contract of at least 1 year with an IND-recognized sponsor',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Sponsor declaration', 'Health insurance'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€350 (IND fee)',
    validity: 'Up to 4 years; permanent residence after 5 years',
    source_url: 'https://ind.nl/en/residence-permits/work/eu-blue-card',
  },
  {
    country_code: 'nl',
    visa_type: 'Startup Visa',
    title: 'Startup Visa Netherlands',
    description: 'One-year permit for innovative entrepreneurs to launch a startup in the Netherlands. Requires guidance from a recognized Dutch facilitator (incubator, accelerator, or innovation hub).',
    requirements: {
      facilitator: 'Letter of support from a government-recognized Dutch facilitator',
      business_plan: 'Innovative product or service with a viable business plan',
      funds: 'Sufficient financial resources to live and work in the Netherlands',
      documents: ['Passport', 'Facilitator letter', 'Business plan', 'Proof of funds', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€210 (IND fee)',
    validity: '1 year (non-renewable); can transition to self-employment permit thereafter',
    source_url: 'https://ind.nl/en/residence-permits/work/startup',
  },
  {
    country_code: 'nl',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Permit (ICT)',
    description: 'For managers, specialists, and trainees transferred within a multinational group to a Dutch entity. No labor market test required.',
    requirements: {
      employment: 'Minimum 3 months of employment with the sending company',
      salary: 'Meets the IND salary threshold for the relevant role',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Assignment letter', 'Proof of corporate relationship', 'Employment contract', 'Qualification documents'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€350 (IND fee)',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://ind.nl/en/residence-permits/work/intra-corporate-transfer-ict',
  },
  {
    country_code: 'nl',
    visa_type: 'Orientation Year',
    title: 'Orientation Year for Highly Educated Persons',
    description: 'Allows recent graduates from top-ranked universities (Times Higher Education top 200) or Dutch higher education to search for work or start a business in the Netherlands for one year.',
    requirements: {
      education: 'Degree from a Dutch institution or a top-200 ranked global university (within 3 years of graduation)',
      funds: 'Minimum monthly income or savings of €899',
      documents: ['Passport', 'Degree certificate', 'Proof of university ranking', 'Proof of funds'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€210 (IND fee)',
    validity: '1 year (non-renewable)',
    source_url: 'https://ind.nl/en/residence-permits/work/orientation-year-highly-educated-persons',
  },

  // ── Belgium ──
  {
    country_code: 'be',
    visa_type: 'Single Permit',
    title: 'Single Permit (Gecombineerde Vergunning / Permis Unique)',
    description: 'The main work and residence permit for non-EU nationals in Belgium, combining the work permit and residence authorization into a single document issued by the regional employment authorities.',
    requirements: {
      job_offer: 'Employment contract with a Belgian employer',
      labor_test: 'Employer must demonstrate the vacancy was published and no suitable local/EU candidate found (for most roles)',
      documents: ['Passport', 'Employment contract', 'Degree certificates', 'Criminal background check', 'Medical certificate', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-5 months',
    cost: '€215 (residence card fee)',
    validity: 'Duration of employment contract, up to 3 years; renewable',
    source_url: 'https://www.belgium.be/en/work/coming_to_work_in_belgium/single_permit',
  },
  {
    country_code: 'be',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Belgium (Europese Blauwe Kaart)',
    description: 'Work and residence permit for highly qualified non-EU professionals with a university degree. Exempt from the labor market test and subject to faster processing.',
    requirements: {
      education: 'Bachelor\'s degree or higher (at least 3 years of study)',
      salary: 'Minimum gross annual salary of €64,332 (2024 threshold)',
      job_offer: 'Employment contract of at least 1 year in a position requiring the degree',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Criminal background check', 'Medical certificate'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€215 (residence card fee)',
    validity: '3 years (or contract duration + 3 months), renewable',
    source_url: 'https://www.belgium.be/en/work/coming_to_work_in_belgium/eu_blue_card',
  },
  {
    country_code: 'be',
    visa_type: 'Highly Qualified Worker',
    title: 'Single Permit – Highly Qualified Worker',
    description: 'Simplified single permit track for highly qualified workers in Belgium, requiring a minimum salary threshold and a relevant degree. The labor market test is waived for qualifying applicants.',
    requirements: {
      education: 'Higher education degree or equivalent experience',
      salary: 'Minimum gross annual salary of €46,632 (2024 threshold; lower for young graduates)',
      job_offer: 'Employment contract with a Belgian employer',
      documents: ['Passport', 'Employment contract', 'Degree certificate', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€215 (residence card fee)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.vdab.be/partners/werkgevers/buitenlandse-werkkrachten',
  },
  {
    country_code: 'be',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Permit (ICT)',
    description: 'For managers, specialists, and graduate trainees transferred within a multinational group to a Belgian entity. No labor market test required.',
    requirements: {
      employment: 'Minimum 3 months of prior employment with the transferring company',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Assignment letter', 'Proof of corporate relationship', 'Employment contract', 'Qualification documents'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€215 (residence card fee)',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://www.belgium.be/en/work/coming_to_work_in_belgium/intra_corporate_transfer',
  },

  // ── Austria ──
  {
    country_code: 'at',
    visa_type: 'Red-White-Red Card',
    title: 'Red-White-Red Card (Rot-Weiß-Rot-Karte)',
    description: 'Austria\'s main points-based immigration permit for highly qualified non-EU workers. Grants employer-tied residence and work authorization; the partner receives unlimited work access.',
    requirements: {
      points: 'Minimum 70 points on the RWR scoring system (education, experience, salary, language, age)',
      salary: 'Minimum gross monthly salary of €4,119 (2024)',
      job_offer: 'Concrete employment offer from an Austrian employer',
      documents: ['Passport', 'Employment contract', 'Degree certificates', 'Language proof', 'CV', 'Criminal background check', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€160 (card issuance)',
    validity: '24 months, renewable; leads to Red-White-Red Card Plus after 2 years',
    source_url: 'https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/highly-qualified-workers/',
  },
  {
    country_code: 'at',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Austria (Blaue Karte EU)',
    description: 'Work and residence permit for highly qualified non-EU nationals in Austria. Requires a recognized university degree and a salary at least 1.5x the average Austrian salary.',
    requirements: {
      education: 'Recognized higher education degree (minimum 3 years)',
      salary: 'Minimum gross monthly salary of €4,119 (2024)',
      job_offer: 'Employment contract of at least 1 year',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Criminal background check', 'Health insurance', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€160 (card issuance)',
    validity: '24 months, renewable; permanent residence after 5 years',
    source_url: 'https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/eu-blue-card/',
  },
  {
    country_code: 'at',
    visa_type: 'Self-Employed Key Worker',
    title: 'Self-Employed Key Worker (RWR Card – Selbständige Schlüsselkraft)',
    description: 'Points-based permit for self-employed non-EU nationals who can demonstrate a significant positive economic impact on Austria, such as investors or entrepreneurs.',
    requirements: {
      points: 'Minimum 70 points on the RWR scoring system',
      investment: 'Planned investment or business activity with demonstrable benefit to Austria',
      documents: ['Passport', 'Business plan', 'Proof of qualifications', 'Financial documents', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€160 (card issuance)',
    validity: '24 months, renewable',
    source_url: 'https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/self-employed-key-workers/',
  },
  {
    country_code: 'at',
    visa_type: 'RWR Card Plus',
    title: 'Red-White-Red Card Plus',
    description: 'Follow-on permit granting unrestricted labour market access in Austria. Available to RWR Card holders after 2 years, family members of Austrian citizens, and certain other groups.',
    requirements: {
      residence: 'At least 2 years of valid RWR Card or prior qualifying residence in Austria',
      income: 'Minimum income to support self and dependants',
      documents: ['Passport', 'Existing residence permit', 'Proof of income', 'Proof of accommodation'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€160 (card issuance)',
    validity: '3 years, renewable indefinitely; permanent residence after 5 years',
    source_url: 'https://www.migration.gv.at/en/types-of-immigration/permanent-immigration/red-white-red-card-plus/',
  },

  // ── Portugal ──
  {
    country_code: 'pt',
    visa_type: 'Job Seeker Visa',
    title: 'Job Seeker Visa (Visto de Procura de Trabalho)',
    description: 'Allows non-EU nationals to enter Portugal for up to 120 days to look for employment or entrepreneurial opportunities. Can be converted into a residence permit upon finding work.',
    requirements: {
      funds: 'Proof of sufficient financial means (minimum €820/month)',
      accommodation: 'Proof of accommodation in Portugal',
      documents: ['Passport', 'Proof of funds', 'Travel/health insurance', 'Criminal background check', 'Accommodation proof'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€90 (visa fee)',
    validity: '120 days (extendable)',
    source_url: 'https://www.sef.pt/en/pages/conteudo-detalhe.aspx?nID=21',
  },
  {
    country_code: 'pt',
    visa_type: 'Work Visa',
    title: 'Portuguese Work Visa (Visto de Trabalho)',
    description: 'Long-stay visa for non-EU nationals who have a job offer or employment contract in Portugal. Leads to a residence permit for the purpose of subordinate work.',
    requirements: {
      job_offer: 'Employment contract or binding job offer from a Portuguese employer',
      iefp_authorization: 'Work authorization from IEFP (Instituto do Emprego e Formação Profissional)',
      documents: ['Passport', 'Employment contract', 'IEFP authorization', 'Degree certificates', 'Criminal background check', 'Proof of accommodation', 'Health insurance'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€90 (visa) + €72 (residence permit)',
    validity: '4 months (visa), then renewable 2-year residence permit',
    source_url: 'https://www.sef.pt/en/pages/conteudo-detalhe.aspx?nID=21',
  },
  {
    country_code: 'pt',
    visa_type: 'Tech Visa',
    title: 'Tech Visa (Visto Tech)',
    description: 'Simplified work visa for professionals hired by certified Portuguese technology companies. Designed to attract international tech talent with a streamlined application process.',
    requirements: {
      employer: 'Employment with a company certified by AICEP under the Tech Visa program',
      salary: 'Remuneration at least equal to the national average gross salary',
      documents: ['Passport', 'Employment contract', 'Employer Tech Visa certification', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€90 (visa fee)',
    validity: '1 year (initial); renewable residence permit thereafter',
    source_url: 'https://www.iapmei.pt/PRODUTOS-E-SERVICOS/Empreendedorismo-Inovacao/Empreendedorismo-(1)/Tech-Visa.aspx',
  },
  {
    country_code: 'pt',
    visa_type: 'Golden Visa',
    title: 'Portugal Golden Visa (ARI – Autorização de Residência para Investimento)',
    description: 'Residency-by-investment program granting a 2-year renewable residence permit in exchange for qualifying investments in Portugal. The real estate route was closed in October 2023; qualifying routes include investment funds and cultural projects.',
    requirements: {
      investment: 'Minimum €500,000 in qualifying investment funds, or €250,000+ in cultural/artistic activities',
      documents: ['Passport', 'Proof of investment', 'Criminal background check', 'Health insurance', 'Tax compliance certificate'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-6 months',
    cost: '€5,336 (initial) + €2,668 (renewal) government fees',
    validity: '2 years, renewable; citizenship eligible after 5 years',
    source_url: 'https://www.sef.pt/en/pages/conteudo-detalhe.aspx?nID=1694',
  },

  // ── Ireland ──
  {
    country_code: 'ie',
    visa_type: 'Critical Skills Employment Permit',
    title: 'Critical Skills Employment Permit (CSEP)',
    description: 'Ireland\'s primary employment permit for highly skilled workers in critical occupations. No labor market needs test required; permits immediate family reunification rights.',
    requirements: {
      occupation: 'Job must be on the Critical Skills Occupations List or earn over €64,000/year',
      salary: 'Minimum €38,000/year for listed occupations; €64,000 for non-listed',
      job_offer: 'Employment contract of at least 2 years with an Irish employer',
      education: 'Relevant degree or professional qualification',
      documents: ['Passport', 'Employment contract', 'Degree certificate', 'Professional registration (if applicable)'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€1,000 (permit fee)',
    validity: '2 years, renewable; can apply for permanent residence (Stamp 4) after 21 months',
    source_url: 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/',
  },
  {
    country_code: 'ie',
    visa_type: 'General Employment Permit',
    title: 'General Employment Permit',
    description: 'Broad employment permit for non-EEA nationals in roles not covered by the Critical Skills permit. Requires a labor market needs test and a minimum salary of €34,000.',
    requirements: {
      salary: 'Minimum €34,000/year (higher for some occupations)',
      labor_test: 'Employer must advertise vacancy for 4 weeks and prove no suitable EEA candidate available',
      job_offer: 'Employment contract with an Irish employer',
      documents: ['Passport', 'Employment contract', 'Evidence of labor market test', 'Degree/qualification certificates'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€500-€1,000 (permit fee depending on duration)',
    validity: 'Up to 2 years, renewable',
    source_url: 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/general-employment-permit/',
  },
  {
    country_code: 'ie',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Employment Permit',
    description: 'For managers, executives, and specialists with specialized knowledge being transferred to an Irish branch within the same multinational group. No labor market test required.',
    requirements: {
      employment: 'Minimum 6 months of prior employment with the sending entity',
      salary: 'Minimum €40,000/year for specialists; €46,000 for executives',
      role: 'Senior management, executive, or specialized knowledge employee',
      documents: ['Passport', 'Assignment letter', 'Proof of prior employment', 'Proof of corporate relationship', 'Employment contract'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: '€500-€1,000 (permit fee)',
    validity: 'Up to 2 years for specialists; up to 5 years for executives',
    source_url: 'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/intra-company-transfer-employment-permit/',
  },
  {
    country_code: 'ie',
    visa_type: 'Start-Up Entrepreneur Programme',
    title: 'Start-Up Entrepreneur Programme (STEP)',
    description: 'Allows non-EEA entrepreneurs with an innovative high-potential startup business idea to come to Ireland. Requires minimum funding and a detailed business plan approved by Enterprise Ireland.',
    requirements: {
      business_plan: 'Innovative business proposal reviewed and supported by Enterprise Ireland',
      funds: 'Minimum €75,000 in funding secured',
      education: 'Relevant experience or qualification',
      documents: ['Passport', 'Business plan', 'Proof of funding', 'CV', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '6-12 weeks',
    cost: 'No government fee (STEP application); €300 (IRP registration)',
    validity: '2 years initial permission, renewable',
    source_url: 'https://www.irishimmigration.ie/coming-to-set-up-a-business-in-ireland/start-up-entrepreneur-programme-step/',
  },

  // ── Sweden ──
  {
    country_code: 'se',
    visa_type: 'Work Permit',
    title: 'Swedish Work Permit (Arbetstillstånd)',
    description: 'Sweden\'s main work permit for non-EU/EEA nationals. No fixed salary minimum by law, but the employer must offer terms at least equivalent to Swedish collective agreements. No labor market test required.',
    requirements: {
      job_offer: 'Job offer meeting or exceeding collective agreement conditions (minimum ~SEK 13,000/month)',
      union_approval: 'The relevant trade union must have been given the opportunity to express an opinion on terms',
      insurance: 'The employer must offer health and life insurance coverage',
      documents: ['Passport', 'Employment contract', 'Union consultation proof', 'Employer declaration', 'Insurance documentation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: 'SEK 2,000',
    validity: 'Duration of employment, up to 2 years; renewable up to 4 years total; permanent residence eligible thereafter',
    source_url: 'https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden/Employed/Applying-for-a-work-permit.html',
  },
  {
    country_code: 'se',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Sweden',
    description: 'Work and residence permit for highly qualified non-EU professionals in Sweden. Requires a higher salary threshold than the standard work permit, with benefits including EU mobility rights.',
    requirements: {
      education: 'Higher education qualification of at least 3 years',
      salary: 'Minimum gross monthly salary of SEK 49,875 (1.5x average; 2024)',
      job_offer: 'Employment contract of at least 1 year',
      documents: ['Passport', 'Employment contract', 'Degree certificate', 'Employer declaration'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: 'SEK 2,000',
    validity: 'Up to 4 years; permanent residence after 5 years',
    source_url: 'https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden/Employed/EU-Blue-Card.html',
  },
  {
    country_code: 'se',
    visa_type: 'Self-Employment Permit',
    title: 'Self-Employment Work Permit',
    description: 'For non-EU/EEA nationals who wish to run their own business or work as a freelancer in Sweden. Requires proof of viable business and sufficient income.',
    requirements: {
      business: 'Proven business experience and a viable, profitable business plan',
      funds: 'Proof of sufficient own capital to support the business initially',
      income: 'Demonstrated ability to support self without social assistance',
      documents: ['Passport', 'Business plan', 'Financial statements or projections', 'Proof of qualifications', 'Bank statements'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-6 months',
    cost: 'SEK 2,000',
    validity: '2 years, renewable; permanent residence after 4-5 years',
    source_url: 'https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden/Self-employed.html',
  },
  {
    country_code: 'se',
    visa_type: 'ICT Permit',
    title: 'Intra-Company Transfer Permit (ICT)',
    description: 'For managers, specialists, and graduate trainees transferred within a multinational group to a Swedish entity. Provides EU mobility rights after 12 months.',
    requirements: {
      employment: 'Minimum 3 months prior employment with the sending company',
      salary: 'Meets Swedish collective agreement standards for the role',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Assignment letter', 'Proof of employment history', 'Proof of corporate relationship'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: 'SEK 2,000',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://www.migrationsverket.se/English/Private-individuals/Working-in-Sweden/Employed/Intra-corporate-transfer.html',
  },

  // ── Denmark ──
  {
    country_code: 'dk',
    visa_type: 'Pay Limit Scheme',
    title: 'Pay Limit Scheme (Beløbsordningen)',
    description: 'Fast-track work permit for non-EU nationals with a high salary offer in Denmark. No labor market test or specific education requirements — salary alone qualifies the applicant.',
    requirements: {
      salary: 'Minimum annual salary of DKK 448,000 (2024)',
      job_offer: 'Employment contract with a Danish employer',
      documents: ['Passport', 'Employment contract', 'Payslips or salary documentation', 'Tax registration'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-2 months',
    cost: 'DKK 4,445 (permit fee)',
    validity: 'Up to 4 years, renewable; permanent residence after 4 years',
    source_url: 'https://www.nyidanmark.dk/en-GB/You-want-to-apply/Work/Pay-limit-scheme',
  },
  {
    country_code: 'dk',
    visa_type: 'Positive List',
    title: 'Positive List for Highly Educated',
    description: 'Work permit for non-EU nationals with a specific higher education degree in a field listed on Denmark\'s Positive List for highly educated persons. No salary threshold required.',
    requirements: {
      education: 'Degree corresponding to a job on the Positive List for Highly Educated',
      job_offer: 'Employment contract in a relevant field',
      documents: ['Passport', 'Degree certificate', 'Employment contract', 'Proof of qualifications'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-2 months',
    cost: 'DKK 4,445 (permit fee)',
    validity: 'Up to 4 years, renewable',
    source_url: 'https://www.nyidanmark.dk/en-GB/You-want-to-apply/Work/Positive-list-for-persons-with-a-higher-education',
  },
  {
    country_code: 'dk',
    visa_type: 'Fast-Track Scheme',
    title: 'Fast-Track Scheme (Certified Sponsors)',
    description: 'Expedited permit process for employees of companies certified by the Danish Agency for International Recruitment and Integration (SIRI). Combines salary and education criteria.',
    requirements: {
      employer: 'Employment with a SIRI-certified Danish company',
      salary: 'Minimum DKK 448,000/year OR relevant degree with relevant job offer',
      documents: ['Passport', 'Employment contract', 'Employer certification proof'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: 'DKK 4,445 (permit fee)',
    validity: 'Up to 4 years, renewable',
    source_url: 'https://www.nyidanmark.dk/en-GB/You-want-to-apply/Work/Fast-track-scheme',
  },
  {
    country_code: 'dk',
    visa_type: 'Startup Denmark',
    title: 'Startup Denmark Visa',
    description: 'For non-EU entrepreneurs with an innovative startup concept. Applications are evaluated by a panel of Danish startup experts; approved startups receive a 2-year residence and work permit.',
    requirements: {
      business_plan: 'Innovative startup business plan with scalability potential',
      evaluation: 'Positive assessment from the Startup Denmark expert panel',
      funds: 'Sufficient personal funds to cover living expenses',
      documents: ['Passport', 'Business plan', 'CV', 'Proof of funds', 'Expert panel approval letter'],
      sponsorship_required: false,
      quota_limited: true,
      annual_quota: 75,
    },
    processing_time: '2-4 months',
    cost: 'DKK 4,445 (permit fee)',
    validity: '2 years, renewable once for 2 more years',
    source_url: 'https://startupdenmark.info/',
  },

  // ── Norway ──
  {
    country_code: 'no',
    visa_type: 'Skilled Worker Permit',
    title: 'Skilled Worker Residence Permit',
    description: 'Primary work permit for non-EU/EEA nationals with relevant vocational or university qualifications and a concrete job offer in Norway. No annual quota.',
    requirements: {
      qualification: 'Completed vocational training, trade certificate, or university degree relevant to the job',
      job_offer: 'Full-time employment contract (or offer) with a Norwegian employer',
      salary: 'Must match the collective agreement wage for the industry',
      documents: ['Passport', 'Employment contract', 'Qualification certificates', 'Employer confirmation form', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: 'NOK 6,300 (permit fee)',
    validity: 'Up to 3 years (initial), renewable; permanent residence after 3 years',
    source_url: 'https://www.udi.no/en/want-to-apply/work-immigration/skilled-workers-from-countries-outside-the-eu-eea/',
  },
  {
    country_code: 'no',
    visa_type: 'Specialist Permit',
    title: 'Specialist Permit (Spesialistillatelse)',
    description: 'For non-EU/EEA nationals with specialized expertise such as IT professionals, engineers, or scientists who may not have formal qualifications but have extensive documented expertise.',
    requirements: {
      expertise: 'Documented specialist expertise through work experience or equivalent',
      job_offer: 'Full-time employment offer in the specialist field',
      salary: 'Must match the collective agreement wage for the industry',
      documents: ['Passport', 'Employment contract', 'Portfolio or evidence of expertise', 'Employer confirmation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: 'NOK 6,300 (permit fee)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.udi.no/en/want-to-apply/work-immigration/skilled-workers-from-countries-outside-the-eu-eea/',
  },
  {
    country_code: 'no',
    visa_type: 'Self-Employment Permit',
    title: 'Self-Employment Permit (Selvstendig næringsdrivende)',
    description: 'Permits non-EU/EEA nationals to establish and run their own business in Norway. Requires a viable business plan and proof of sufficient funds.',
    requirements: {
      business_plan: 'Detailed and viable business plan',
      funds: 'Documented sufficient capital to establish and run the business',
      qualifications: 'Relevant professional qualifications or experience',
      documents: ['Passport', 'Business plan', 'Financial documentation', 'Proof of qualifications', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-6 months',
    cost: 'NOK 6,300 (permit fee)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.udi.no/en/want-to-apply/work-immigration/self-employment/',
  },

  // ── Finland ──
  {
    country_code: 'fi',
    visa_type: 'Specialist Residence Permit',
    title: 'Residence Permit for a Specialist (Erityisasiantuntija)',
    description: 'Finland\'s main work permit for non-EU specialists with a university degree and a salary above the threshold. Processing time is accelerated under the Finland Talent Boost program.',
    requirements: {
      education: 'Bachelor\'s degree or higher in a relevant field',
      salary: 'Minimum gross monthly salary of €3,000',
      job_offer: 'Employment contract with a Finnish employer',
      documents: ['Passport', 'Employment contract', 'Degree certificate', 'Criminal background check (for some nationalities)'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks (fast-track)',
    cost: '€690 (online application fee)',
    validity: 'Duration of employment, up to 2 years; renewable',
    source_url: 'https://migri.fi/en/specialist',
  },
  {
    country_code: 'fi',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Finland',
    description: 'Work and residence permit for highly qualified non-EU professionals with a higher education degree and a high salary. Offers EU mobility rights and a path to permanent residence.',
    requirements: {
      education: 'Higher education degree (at least 3 years)',
      salary: 'Minimum gross monthly salary of €4,500',
      job_offer: 'Employment contract of at least 1 year',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Health insurance'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: '€690 (permit fee)',
    validity: 'Up to 4 years; permanent residence after 5 years',
    source_url: 'https://migri.fi/en/eu-blue-card',
  },
  {
    country_code: 'fi',
    visa_type: 'Startup Entrepreneur Permit',
    title: 'Startup Entrepreneur Residence Permit',
    description: 'For non-EU entrepreneurs with an innovative business idea assessed by Business Finland. Provides a 2-year permit to establish and develop a startup in Finland.',
    requirements: {
      assessment: 'Positive assessment from Business Finland confirming the startup\'s growth and internationalization potential',
      business_plan: 'Detailed business plan with scalability focus',
      funds: 'Sufficient capital to cover living expenses',
      documents: ['Passport', 'Business Finland assessment letter', 'Business plan', 'Proof of funds'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '2-4 months',
    cost: '€690 (permit fee)',
    validity: '2 years, renewable',
    source_url: 'https://migri.fi/en/startup-entrepreneur',
  },
  {
    country_code: 'fi',
    visa_type: 'Self-Employment Permit',
    title: 'Self-Employment Residence Permit (Elinkeinonharjoittaja)',
    description: 'For non-EU nationals who wish to conduct self-employed trade or business in Finland. Requires demonstration of viable business activity and sufficient income.',
    requirements: {
      trade_permit: 'Finnish Trade Register registration (YTJ)',
      income: 'Demonstrated ability to generate sufficient income through self-employment',
      documents: ['Passport', 'Trade register extract', 'Business plan', 'Financial projections', 'Proof of qualifications (if regulated profession)'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-5 months',
    cost: '€690 (permit fee)',
    validity: 'Up to 2 years, renewable',
    source_url: 'https://migri.fi/en/self-employed-persons',
  },

  // ── Poland ──
  {
    country_code: 'pl',
    visa_type: 'Work Permit Type A',
    title: 'Work Permit Type A (Zezwolenie na Pracę Typ A)',
    description: 'The most common work permit in Poland, required for non-EU nationals employed by a Polish employer. The employer applies on behalf of the worker at the Voivodeship Office.',
    requirements: {
      job_offer: 'Employment contract or civil law contract with a Polish employer',
      salary: 'At least the minimum wage (PLN 4,300/month gross in 2024)',
      labor_test: 'Employer may need to prove no Polish/EU candidate was available (staroste test)',
      documents: ['Passport', 'Employment contract', 'Application form', 'Employer\'s documents (KRS, NIP)', 'Degree certificates (if relevant)'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months',
    cost: 'PLN 100 (employer application fee)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.gov.pl/web/mswia-en/work-permits',
  },
  {
    country_code: 'pl',
    visa_type: 'Temporary Residence & Work Permit',
    title: 'Temporary Residence and Work Permit (Zezwolenie na Pobyt Czasowy i Pracę)',
    description: 'Combined permit allowing non-EU nationals to both reside and work in Poland. Replaces the need for a separate work permit and residence card.',
    requirements: {
      job_offer: 'Stable employment with a Polish employer',
      salary: 'At least the minimum wage level',
      accommodation: 'Proof of accommodation in Poland',
      documents: ['Passport', 'Employment contract', 'Application form', 'Proof of accommodation', 'Photos', 'Proof of health insurance'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-6 months',
    cost: 'PLN 440 (permit fee)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.gov.pl/web/mswia-en/work-permits',
  },
  {
    country_code: 'pl',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Poland (Niebieska Karta UE)',
    description: 'Work and residence permit for highly qualified non-EU workers in Poland. Offers EU mobility rights and a path to long-term residence.',
    requirements: {
      education: 'Higher education degree (at least 3 years)',
      salary: 'Minimum gross monthly salary of PLN 9,676 (150% of average; 2024)',
      job_offer: 'Employment contract of at least 1 year',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Proof of accommodation', 'Health insurance'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months',
    cost: 'PLN 440 (permit fee)',
    validity: 'Up to 3 years; permanent residence after 5 years',
    source_url: 'https://www.gov.pl/web/mswia-en/eu-blue-card',
  },
  {
    country_code: 'pl',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Work Permit (ICT)',
    description: 'For managers, specialists, and trainees transferred from a foreign entity to a Polish branch within the same multinational group. No labor market test required.',
    requirements: {
      employment: 'Minimum 12 months (managers/specialists) or 6 months (trainees) of prior employment with the group',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Assignment letter', 'Proof of corporate relationship', 'Employment contract', 'Qualifications'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months',
    cost: 'PLN 440 (permit fee)',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://www.gov.pl/web/mswia-en/work-permits',
  },

  // ── Czech Republic ──
  {
    country_code: 'cz',
    visa_type: 'Employee Card',
    title: 'Employee Card (Zaměstnanecká karta)',
    description: 'Czech Republic\'s main work and residence permit for non-EU nationals. Combines work and residence authorization in a single biometric card and requires a specific vacancy registered in the job vacancy database.',
    requirements: {
      job_offer: 'Vacant position registered in the Central Register of Vacancies for Foreigners',
      salary: 'At least the statutory minimum wage (CZK 18,900/month in 2024)',
      documents: ['Passport', 'Employment contract or job offer', 'Proof of accommodation', 'Criminal background check', 'Degree certificates (apostilled)'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '60 days (standard); 30 days (for government-approved employers)',
    cost: 'CZK 3,500 (permit fee)',
    validity: 'Up to 2 years, renewable; permanent residence after 5 years',
    source_url: 'https://www.mvcr.cz/mvcren/article/third-country-nationals-employment.aspx',
  },
  {
    country_code: 'cz',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Czech Republic (Modrá karta EU)',
    description: 'Work and residence permit for highly qualified non-EU professionals in the Czech Republic. Exempt from the vacancy database requirement and subject to faster processing.',
    requirements: {
      education: 'Higher education degree (at least 3 years)',
      salary: 'Minimum gross monthly salary of approx. CZK 57,000 (1.5x average; 2024)',
      job_offer: 'Employment contract of at least 1 year for a highly qualified position',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Proof of accommodation', 'Health insurance'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '90 days',
    cost: 'CZK 3,500 (permit fee)',
    validity: 'Up to 2 years, renewable; permanent residence after 5 years',
    source_url: 'https://www.mvcr.cz/mvcren/article/third-country-nationals-employment.aspx',
  },
  {
    country_code: 'cz',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Card (ICT karta)',
    description: 'For managers, specialists, and graduate trainees transferred within a multinational group to a Czech entity. Does not require registration in the vacancy database.',
    requirements: {
      employment: 'Minimum 12 months of prior employment (3 months for trainees) with the sending company',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Assignment letter', 'Proof of prior employment', 'Proof of corporate relationship', 'Qualifications'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '90 days',
    cost: 'CZK 3,500 (permit fee)',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://www.mvcr.cz/mvcren/article/third-country-nationals-employment.aspx',
  },

  // ── Romania ──
  {
    country_code: 'ro',
    visa_type: 'Work Visa',
    title: 'Romanian Long-Stay Work Visa (Viză de lungă ședere pentru muncă)',
    description: 'Long-stay visa for non-EU nationals with a work authorization issued by the General Inspectorate for Immigration. The employer must first obtain a work permit quota allocation.',
    requirements: {
      work_permit: 'Work authorization issued by the General Inspectorate for Immigration (IGI)',
      job_offer: 'Employment contract with a Romanian employer',
      quota: 'Position must be within the annual work permit quota (approx. 100,000/year)',
      documents: ['Passport', 'Work authorization letter', 'Employment contract', 'Degree certificates', 'Criminal background check', 'Medical certificate', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '60 days (work authorization) + 30 days (visa)',
    cost: 'RON 225 (visa fee)',
    validity: '1 year (visa), then renewable residence permit for up to 2 years',
    source_url: 'https://igi.mai.gov.ro/en/',
  },
  {
    country_code: 'ro',
    visa_type: 'EU Blue Card',
    title: 'EU Blue Card Romania (Carte Albastră UE)',
    description: 'Work and residence permit for highly qualified non-EU professionals. Exempt from the annual quota system and offers a faster, simplified application process.',
    requirements: {
      education: 'Higher education degree (at least 3 years)',
      salary: 'Minimum gross monthly salary of RON 8,630 (4x the national minimum wage; 2024)',
      job_offer: 'Employment contract of at least 1 year',
      documents: ['Passport', 'Employment contract', 'Recognized degree', 'Criminal background check', 'Medical certificate', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '30-60 days',
    cost: 'RON 225 (visa) + RON 155 (residence permit)',
    validity: 'Up to 2 years, renewable; permanent residence after 5 years',
    source_url: 'https://igi.mai.gov.ro/en/',
  },
  {
    country_code: 'ro',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Permit',
    description: 'For managers, specialists, and graduate trainees transferred within a multinational group to a Romanian entity. Not subject to the annual quota.',
    requirements: {
      employment: 'Minimum 12 months of prior employment with the sending company (3 months for trainees)',
      role: 'Manager, specialist, or graduate trainee',
      documents: ['Passport', 'Assignment letter', 'Proof of prior employment', 'Proof of corporate relationship', 'Qualifications'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '30-60 days',
    cost: 'RON 225 (visa) + RON 155 (residence permit)',
    validity: 'Up to 3 years (managers/specialists); 1 year (trainees)',
    source_url: 'https://igi.mai.gov.ro/en/',
  },

  // ── India ──
  {
    country_code: 'in',
    visa_type: 'Employment Visa',
    title: 'India Employment Visa (E Visa)',
    description: 'Long-stay visa for foreign nationals employed by an Indian company or organization. Requires a minimum annual salary threshold and proof of specialized skills not readily available in India.',
    requirements: {
      salary: 'Minimum USD 25,000/year (exemptions for ethnic cooks, language teachers, and certain other categories)',
      job_offer: 'Employment contract with a registered Indian company',
      skills: 'Specialized skills or expertise not easily found in India',
      documents: ['Passport', 'Employment contract', 'Company registration certificate', 'Educational and professional certificates', 'Criminal background check', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-5 weeks',
    cost: 'USD 80 (single entry) to USD 160 (5-year multiple entry) depending on nationality',
    validity: '1 year, renewable; up to 5 years for senior positions',
    source_url: 'https://indianvisaonline.gov.in/visa/info.html',
  },
  {
    country_code: 'in',
    visa_type: 'Business Visa',
    title: 'India Business Visa',
    description: 'For foreign nationals conducting business activities in India including establishing industrial/business ventures, purchase/sale of goods, or attending technical/business meetings.',
    requirements: {
      purpose: 'Legitimate business activities in India',
      invitation: 'Letter of invitation from an Indian business entity or self-declaration of business purpose',
      funds: 'Proof of sufficient financial resources',
      documents: ['Passport', 'Business invitation letter', 'Company registration documents', 'Bank statements', 'Proof of business activities'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-5 weeks',
    cost: 'USD 80-160 depending on nationality and duration',
    validity: 'Up to 5 years (multiple entry)',
    source_url: 'https://indianvisaonline.gov.in/visa/info.html',
  },
  {
    country_code: 'in',
    visa_type: 'Project Visa',
    title: 'India Project Visa',
    description: 'For foreign nationals engaged in specific projects in the power and steel sectors in India. Issued to workers for the duration of the project.',
    requirements: {
      project: 'Employment in a designated power or steel sector project in India',
      employer: 'Letter from the project authority and the Indian company',
      documents: ['Passport', 'Project details letter', 'Employment contract', 'Professional certificates', 'Criminal background check'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-5 weeks',
    cost: 'USD 80 per entry',
    validity: 'Duration of the project, up to 1 year; renewable',
    source_url: 'https://www.mea.gov.in/visa-requirements.htm',
  },
  {
    country_code: 'in',
    visa_type: 'Intern Visa',
    title: 'India Intern Visa',
    description: 'For students and recent graduates undertaking paid or unpaid internships with Indian companies. Requires a letter of appointment from the host company.',
    requirements: {
      enrollment: 'Enrolled in or recently graduated from a recognized foreign university',
      internship_offer: 'Confirmed internship offer from a registered Indian company',
      documents: ['Passport', 'Internship offer letter', 'University enrollment certificate', 'Academic transcripts', 'Bank statements'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-5 weeks',
    cost: 'USD 80',
    validity: 'Duration of internship, up to 1 year',
    source_url: 'https://indianvisaonline.gov.in/visa/info.html',
  },

  // ── Mexico ──
  {
    country_code: 'mx',
    visa_type: 'Temporary Resident Worker',
    title: 'Temporary Resident Visa with Work Authorization (Residente Temporal con Permiso de Trabajo)',
    description: 'The primary work authorization for non-Mexican nationals employed in Mexico. The employer must obtain an immigration offer letter (oferta de empleo) from INM before the employee applies for the visa.',
    requirements: {
      job_offer: 'Employment contract with a Mexican employer',
      inm_offer: 'Immigration offer letter (carta de oferta de trabajo autorizada por INM)',
      salary: 'Minimum salary equivalent to the sector average',
      documents: ['Passport', 'INM authorization letter', 'Employment contract', 'Degree certificates', 'Criminal background check (apostilled)', 'Proof of accommodation'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'MXN 1,434 (visa) + MXN 2,780 (resident card)',
    validity: '1 year, renewable up to 4 years total',
    source_url: 'https://www.gob.mx/inm/acciones-y-programas/residencia-temporal',
  },
  {
    country_code: 'mx',
    visa_type: 'Permanent Resident',
    title: 'Permanent Resident Visa (Residente Permanente)',
    description: 'Grants indefinite legal residence and work authorization in Mexico without restriction. Available through economic solvency, family ties, or after 4 years as temporary resident.',
    requirements: {
      eligibility: 'Qualifies via retirement income/pension, sufficient economic solvency, family ties to a Mexican national, or 4 years of prior temporary residence',
      income: 'Proof of monthly income equivalent to 500 times the daily minimum wage (~MXN 130,000/month for independent applicants)',
      documents: ['Passport', 'Proof of income/pension', 'Criminal background check', 'Proof of prior residence (if applicable)', 'Photos'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'MXN 5,625 (resident card fee)',
    validity: 'Permanent',
    source_url: 'https://www.gob.mx/inm/acciones-y-programas/residencia-permanente',
  },
  {
    country_code: 'mx',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer (Transferencia Intraempresarial)',
    description: 'For executives, managers, and specialists transferred to a Mexican office of a multinational company. The Mexican entity must be registered with the National Registry of Foreign Investment.',
    requirements: {
      employment: 'At least 1 year of prior employment with the company',
      role: 'Executive, manager, or technical specialist',
      inm_registration: 'Mexican company must be registered in the National Registry of Foreign Investment',
      documents: ['Passport', 'Transfer letter', 'Proof of corporate relationship', 'Employment history', 'Degree/qualification certificates'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'MXN 1,434 (visa) + MXN 2,780 (resident card)',
    validity: '1 year, renewable; up to 4 years',
    source_url: 'https://www.gob.mx/inm',
  },

  // ── Brazil ──
  {
    country_code: 'br',
    visa_type: 'VITEM V',
    title: 'Work Visa – Paid Employment (VITEM V)',
    description: 'Brazil\'s primary visa category for foreign workers with a formal employment contract with a Brazilian company. The employer must have prior approval from the Ministry of Labour (MTE).',
    requirements: {
      mte_authorization: 'Authorization from the Ministry of Labour (MTE) for the foreign worker\'s employment',
      job_offer: 'Signed employment contract with a Brazilian employer (CLT or equivalent)',
      salary: 'Must meet sector average or applicable collective agreement minimum',
      documents: ['Passport', 'MTE authorization', 'Employment contract', 'Degree certificates (apostilled)', 'Criminal background check (apostilled)', 'Medical certificate'],
      sponsorship_required: true,
      quota_limited: true,
      quota_note: '1 foreign worker per 3 Brazilian employees (or up to 1/5 of payroll)',
    },
    processing_time: '4-8 weeks',
    cost: 'BRL 255 (visa fee; varies by nationality)',
    validity: '2 years, renewable; permanent residence after 4 years',
    source_url: 'https://www.gov.br/mre/en/subjects/visas/types-of-visas',
  },
  {
    country_code: 'br',
    visa_type: 'Highly Qualified Specialist',
    title: 'Highly Qualified Specialist Work Authorization',
    description: 'Streamlined work authorization for highly qualified professionals in technical and specialized fields. Requires a higher salary than the standard work visa and offers faster processing.',
    requirements: {
      education: 'University degree or demonstrated specialization in the field',
      salary: 'Minimum BRL 12,202/month (approximately USD 2,400; 2024)',
      job_offer: 'Employment contract with a Brazilian company',
      documents: ['Passport', 'Employment contract', 'Degree certificates (apostilled)', 'Criminal background check', 'Professional portfolio if applicable'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: 'BRL 255 (visa fee)',
    validity: 'Up to 2 years, renewable',
    source_url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/trabalhadores-estrangeiros',
  },
  {
    country_code: 'br',
    visa_type: 'Investor Visa',
    title: 'Investor Visa (VIPER) / Immigrant Investor',
    description: 'Allows foreign nationals who make a qualifying investment in Brazil to obtain a permanent or temporary residence visa. Managed by the National Immigration Council (CNIg).',
    requirements: {
      investment: 'Minimum BRL 500,000 in a new or existing Brazilian business, or BRL 150,000 for businesses creating at least 10 Brazilian jobs',
      business_plan: 'Viable business plan demonstrating economic benefit to Brazil',
      documents: ['Passport', 'Proof of investment', 'Business plan', 'Criminal background check (apostilled)', 'Financial statements'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-6 months',
    cost: 'BRL 255 (visa fee)',
    validity: '2 years (temporary) or permanent depending on investment size',
    source_url: 'https://www.gov.br/mre/en/subjects/visas/types-of-visas',
  },

  // ── Argentina ──
  {
    country_code: 'ar',
    visa_type: 'Temporary Residence – Work',
    title: 'Temporary Residence Visa for Employment (Residencia Temporaria – Trabajo)',
    description: 'Allows non-Mercosur nationals to reside and work in Argentina for up to 3 years. Requires an employment contract with an Argentine employer and authorization from the National Directorate of Migration.',
    requirements: {
      job_offer: 'Employment contract with an Argentine employer registered with AFIP',
      dnm_authorization: 'Authorization from the National Directorate of Migration (DNM)',
      documents: ['Passport', 'Employment contract', 'DNM authorization', 'Criminal background check (apostilled)', 'Proof of accommodation', 'Medical certificate'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'ARS 20,000 (approximate; fees change frequently)',
    validity: '1-3 years, renewable; leads to permanent residence after 3 years',
    source_url: 'https://www.argentina.gob.ar/interior/migraciones/trabajar',
  },
  {
    country_code: 'ar',
    visa_type: 'Rentista Visa',
    title: 'Rentista / Passive Income Visa (Residencia Temporaria Rentista)',
    description: 'For foreign nationals who can demonstrate regular income from abroad (pensions, investments, dividends, or remote work). Allows residence and work in Argentina without a local employer.',
    requirements: {
      income: 'Proof of regular monthly income from abroad (minimum approx. USD 1,500/month)',
      documents: ['Passport', 'Proof of income (bank statements, pension certificates)', 'Criminal background check (apostilled)', 'Medical certificate', 'Proof of accommodation'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'ARS 20,000 (approximate)',
    validity: '1-3 years, renewable',
    source_url: 'https://www.argentina.gob.ar/interior/migraciones/ingresar',
  },
  {
    country_code: 'ar',
    visa_type: 'Investor Visa',
    title: 'Investor Residence Visa (Residencia por Inversión)',
    description: 'For foreign nationals who invest in productive activities, real estate, or financial assets in Argentina. Grants temporary residence and the right to work as self-employed.',
    requirements: {
      investment: 'Proof of significant investment in Argentina (no fixed minimum; assessed by DNM)',
      business_plan: 'Documentation of investment activity and economic benefit',
      documents: ['Passport', 'Proof of investment', 'Criminal background check (apostilled)', 'Medical certificate', 'Proof of accommodation'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'ARS 20,000 (approximate)',
    validity: '1-3 years, renewable; permanent residence after 3 years',
    source_url: 'https://www.argentina.gob.ar/interior/migraciones',
  },

  // ── China ──
  {
    country_code: 'cn',
    visa_type: 'Work Visa (Z)',
    title: 'Work Visa Category Z',
    description: 'The primary visa for foreigners taking up employment in China. Required before arrival; must be converted to a Residence Permit for Work within 30 days of entry.',
    requirements: {
      job_offer: 'Employment contract with a Chinese employer',
      work_permit: 'Foreigner\'s Work Permit issued by the Ministry of Human Resources and Social Security (MHRSS)',
      category: 'Foreign employees are categorized A (top talent), B (professionals), or C (non-skilled); requirements vary by category',
      documents: ['Passport', 'Foreigner Work Permit notification letter', 'Employment contract', 'Degree certificates', 'Criminal background check (apostilled)', 'Medical examination report'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '5-10 business days (after work permit approval, which takes 4-8 weeks)',
    cost: 'USD 140 (single entry; varies by nationality)',
    validity: 'Visa valid 3 months; then Residence Permit for up to 5 years',
    source_url: 'https://www.visaforchina.cn/',
  },
  {
    country_code: 'cn',
    visa_type: 'High-End Talent (A Category)',
    title: 'Category A Foreigner Work Permit (高端人才)',
    description: 'Top-tier classification for foreign experts of exceptional ability including Nobel laureates, Fortune 500 executives, and holders of globally recognized awards. Provides maximum work authorization benefits.',
    requirements: {
      achievement: 'Internationally recognized academic, professional, or scientific achievement (Nobel Prize, Fortune 500 C-suite, national-level awards, etc.)',
      employer: 'Contract or appointment with a Chinese employer or institution',
      documents: ['Passport', 'Evidence of exceptional achievement', 'Employment contract', 'Application form'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '5-10 business days',
    cost: 'USD 140 (visa; varies by nationality)',
    validity: 'Residence Permit up to 5 years, renewable',
    source_url: 'https://fwzx.mohrss.gov.cn/',
  },
  {
    country_code: 'cn',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Work Permit',
    description: 'For managers, executives, and specialists transferred from a foreign parent company to a Chinese subsidiary or representative office. Classified as Category B under China\'s points-based system.',
    requirements: {
      employment: 'At least 1 year of prior employment with the multinational company abroad',
      role: 'Manager, executive, or specialist',
      qualification: 'Bachelor\'s degree and relevant professional experience',
      documents: ['Passport', 'Assignment letter', 'Proof of prior employment', 'Degree certificate', 'Chinese company registration documents'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks (work permit) + 10 days (visa)',
    cost: 'USD 140 (visa; varies by nationality)',
    validity: 'Residence Permit up to 3 years, renewable',
    source_url: 'https://www.visaforchina.cn/',
  },
  {
    country_code: 'cn',
    visa_type: 'Talent Visa (R)',
    title: 'Talent Visa Category R',
    description: 'Special visa for high-end foreign talents urgently needed in China. Provides a 180-day multi-entry visa allowing exploration and negotiation before formal employment setup.',
    requirements: {
      talent: 'Recognized high-level talent in science, technology, or key industries needed in China',
      invitation: 'Invitation letter from a Chinese government authority, research institution, or company',
      documents: ['Passport', 'Invitation letter', 'Evidence of talent/achievements', 'CV'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '5-10 business days',
    cost: 'USD 140 (varies by nationality)',
    validity: '180 days per visit, multiple entry; up to 5-year visa validity',
    source_url: 'https://www.visaforchina.cn/',
  },

  // ── Japan ──
  {
    country_code: 'jp',
    visa_type: 'Engineer/Specialist',
    title: 'Engineer / Specialist in Humanities / International Services',
    description: 'Japan\'s most common work visa for professionals in technical fields (engineering, IT) or humanities fields (marketing, finance, teaching). Requires a university degree or 10 years of relevant experience.',
    requirements: {
      education: 'Bachelor\'s degree or equivalent professional experience (10+ years)',
      job_offer: 'Employment contract with a Japanese company',
      relevance: 'The job must be directly related to the applicant\'s degree or experience',
      documents: ['Passport', 'Certificate of Eligibility (CoE)', 'Employment contract', 'Degree certificate', 'Company registration documents'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months (CoE) + 1-2 weeks (visa)',
    cost: 'JPY 3,000 (single entry) to JPY 6,000 (multiple entry)',
    validity: '1, 3, or 5 years; renewable indefinitely',
    source_url: 'https://www.moj.go.jp/isa/applications/status/engineer.html',
  },
  {
    country_code: 'jp',
    visa_type: 'Highly Skilled Professional',
    title: 'Highly Skilled Foreign Professional Visa (高度専門職)',
    description: 'Japan\'s points-based visa for highly skilled professionals offering significantly faster paths to permanent residence and preferential immigration treatment. Points are scored on academic background, career history, salary, and age.',
    requirements: {
      points: 'Minimum 70 points on the Highly Skilled Professional scoring system (80+ points for accelerated permanent residence)',
      job_offer: 'Employment with a Japanese employer or approved academic/research institution',
      documents: ['Passport', 'Certificate of Eligibility', 'Points calculation supporting documents', 'Employment contract', 'Degree certificates', 'Income evidence'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-2 months (expedited)',
    cost: 'JPY 3,000-6,000 (visa fee)',
    validity: '5 years (Type 1); permanent residence after 1-3 years depending on points',
    source_url: 'https://www.moj.go.jp/isa/applications/status/koudo_jinzai.html',
  },
  {
    country_code: 'jp',
    visa_type: 'Intra-Company Transferee',
    title: 'Intra-Company Transferee Visa (企業内転勤)',
    description: 'For employees of multinational companies transferred from a foreign office to a Japanese branch, subsidiary, or affiliated company. No labor market test required.',
    requirements: {
      employment: 'Continuous employment with the company for at least 1 year prior to transfer',
      role: 'Managerial, supervisory, or specialist position',
      documents: ['Passport', 'Certificate of Eligibility', 'Transfer letter', 'Proof of prior employment', 'Company registration documents'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '1-3 months (CoE) + 1-2 weeks (visa)',
    cost: 'JPY 3,000-6,000 (visa fee)',
    validity: '1, 3, or 5 years; renewable',
    source_url: 'https://www.moj.go.jp/isa/applications/status/kigyonai.html',
  },
  {
    country_code: 'jp',
    visa_type: 'Business Manager',
    title: 'Business Manager Visa',
    description: 'For foreign entrepreneurs who intend to establish or manage a business in Japan. Requires a physical business office and a minimum capital of JPY 5 million, or employment of two or more full-time staff.',
    requirements: {
      office: 'Confirmed business office in Japan',
      capital: 'Minimum JPY 5,000,000 capital or employment of 2+ full-time Japanese employees',
      business_plan: 'Viable business plan demonstrating sustainable operations',
      documents: ['Passport', 'Certificate of Eligibility', 'Business plan', 'Company registration documents', 'Proof of capital/funding', 'Office lease agreement'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '1-3 months (CoE) + 1-2 weeks (visa)',
    cost: 'JPY 3,000-6,000 (visa fee)',
    validity: '1, 3, or 5 years; renewable',
    source_url: 'https://www.moj.go.jp/isa/applications/status/manager.html',
  },
  {
    country_code: 'jp',
    visa_type: 'Specified Skilled Worker',
    title: 'Specified Skilled Worker (特定技能)',
    description: 'Work visa for sectors with critical labor shortages in Japan (construction, hospitality, agriculture, care, etc.). Type 1 allows 5 years total; Type 2 (in 11 sectors) allows renewal and family reunification.',
    requirements: {
      skills_test: 'Pass the Japan-specific skills test and Japanese Language Proficiency Test (JLPT N4 or equivalent for Type 1)',
      sector: 'Must work in one of the 16 designated shortage sectors',
      job_offer: 'Employment offer from a Japanese employer in the relevant sector',
      documents: ['Passport', 'Certificate of Eligibility', 'Skills test result', 'Japanese language test result', 'Employment contract'],
      sponsorship_required: true,
      quota_limited: true,
    },
    processing_time: '1-3 months',
    cost: 'JPY 3,000-6,000 (visa fee)',
    validity: 'Up to 1 year per renewal (Type 1, max 5 years total); Type 2 renewable indefinitely',
    source_url: 'https://www.moj.go.jp/isa/applications/status/tokutei.html',
  },

  // ── South Korea ──
  {
    country_code: 'kr',
    visa_type: 'E-7',
    title: 'Special Occupation Visa E-7',
    description: 'South Korea\'s primary work visa for professionals in designated "special occupations" including engineers, IT specialists, researchers, and other skilled workers. Requires employer sponsorship.',
    requirements: {
      occupation: 'Job must fall within one of the designated E-7 occupation categories',
      education: 'Bachelor\'s degree or 5 years of relevant work experience',
      salary: 'Must meet the occupation-specific minimum salary (generally at least 80% of the national average)',
      job_offer: 'Employment contract with a Korean employer who applies for a confirmation of visa issuance',
      documents: ['Passport', 'Visa issuance confirmation', 'Employment contract', 'Degree certificate', 'Criminal background check', 'Medical examination'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'KRW 60,000 (single entry) to KRW 90,000 (multiple entry)',
    validity: '1-3 years, renewable; permanent residence (F-5) eligible after 3+ years',
    source_url: 'https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=2&PARENT_ID=126',
  },
  {
    country_code: 'kr',
    visa_type: 'D-8',
    title: 'Corporate Investment Visa D-8',
    description: 'For foreign investors and entrepreneur-executives managing a Korean company. Requires a minimum investment in a Korean corporation and an active business management role.',
    requirements: {
      investment: 'Minimum KRW 100,000,000 (approx. USD 75,000) investment in a Korean company',
      role: 'Must be a representative director or senior executive of the Korean company',
      documents: ['Passport', 'Business registration certificate', 'Investment proof', 'Corporate registration', 'Criminal background check'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'KRW 60,000-90,000 (visa fee)',
    validity: '2 years, renewable; permanent residence eligible after 5 years',
    source_url: 'https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=2&PARENT_ID=126',
  },
  {
    country_code: 'kr',
    visa_type: 'D-7',
    title: 'Intra-Company Transfer Visa D-7',
    description: 'For employees of multinational companies transferred from a foreign office to a Korean branch or affiliate. Covers managers, executives, and specialized knowledge workers.',
    requirements: {
      employment: 'Minimum 1 year of continuous employment with the company abroad',
      role: 'Manager, executive, or specialist',
      documents: ['Passport', 'Transfer letter', 'Proof of prior employment', 'Proof of corporate relationship', 'Degree certificate'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'KRW 60,000-90,000 (visa fee)',
    validity: '1-3 years, renewable',
    source_url: 'https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=2&PARENT_ID=126',
  },
  {
    country_code: 'kr',
    visa_type: 'F-2 Point System',
    title: 'Residency Visa F-2 (Points-Based)',
    description: 'Points-based long-term residency visa for skilled professionals in Korea. Evaluated on education, career, income, age, and Korean language ability. Permits unrestricted employment.',
    requirements: {
      points: 'Minimum 80 points on the F-2 scoring system (education, income, Korean language, etc.)',
      residence: 'At least 1 year of legal stay in Korea on a qualifying visa',
      documents: ['Passport', 'Current visa/ARC', 'Degree certificates', 'Income documentation', 'TOPIK score (if applicable)'],
      sponsorship_required: false,
      quota_limited: true,
      annual_quota: 10000,
    },
    processing_time: '4-8 weeks',
    cost: 'KRW 60,000-130,000 (visa/ARC fee)',
    validity: '1-3 years; permanent residence (F-5) eligible after 3 years of F-2',
    source_url: 'https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=2&PARENT_ID=126',
  },

  // ── Vietnam ──
  {
    country_code: 'vn',
    visa_type: 'Work Permit',
    title: 'Vietnam Work Permit (Giấy phép lao động)',
    description: 'Required for foreign nationals working in Vietnam for more than 3 months. The employer must apply for the work permit at the Department of Labour, Invalids and Social Affairs (DOLISA) before the employee can enter or work legally.',
    requirements: {
      job_offer: 'Employment contract with a Vietnamese company or foreign-invested enterprise',
      health: 'Clean health certificate from an authorized medical facility',
      education: 'Degree certificate relevant to the role (manager, director, or specialist category)',
      experience: 'At least 3 years of experience in the relevant field',
      documents: ['Passport', 'Employment contract', 'Degree certificate (apostilled)', 'Criminal background check (apostilled)', 'Medical certificate', 'CV', 'Passport photos'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '5-7 business days (work permit) + 3-5 days (visa)',
    cost: 'VND 400,000 (work permit fee)',
    validity: 'Up to 2 years, renewable',
    source_url: 'https://www.molisa.gov.vn/',
  },
  {
    country_code: 'vn',
    visa_type: 'Business Visa (DN)',
    title: 'Business Visa DN (Thị thực kinh doanh DN)',
    description: 'For foreign nationals entering Vietnam for business activities including market exploration, contract negotiations, or establishing a company. Multiple-entry versions available for frequent business travelers.',
    requirements: {
      invitation: 'Invitation letter from a Vietnamese company or government authority, or sponsorship by a licensed visa agent',
      purpose: 'Legitimate business purpose in Vietnam',
      documents: ['Passport', 'Visa invitation/approval letter', 'Business purpose documentation'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '3-5 business days (e-visa); 1 business day (visa on arrival with pre-approval)',
    cost: 'USD 25 (e-visa); USD 50-80 (visa on arrival stamp fee)',
    validity: '1-3 months, single or multiple entry',
    source_url: 'https://evisa.xuatnhapcanh.gov.vn/',
  },
  {
    country_code: 'vn',
    visa_type: 'Investor Visa (ĐT)',
    title: 'Vietnam Investor Visa ĐT',
    description: 'For foreign investors with a registered capital contribution in a Vietnamese enterprise. Grants 1-5 year stay periods and can be issued for the duration of the investment project.',
    requirements: {
      investment: 'Registered capital contribution in a Vietnamese enterprise (minimum VND 3 billion for 5-year visa)',
      irc: 'Investment Registration Certificate (IRC) from the relevant Vietnamese authority',
      documents: ['Passport', 'Investment Registration Certificate', 'Business registration certificate of Vietnamese company', 'Evidence of capital contribution'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '5-7 business days',
    cost: 'VND 500,000-1,000,000 (visa fee)',
    validity: '1-5 years, single or multiple entry; renewable for duration of project',
    source_url: 'https://xuatnhapcanh.gov.vn/',
  },
  {
    country_code: 'vn',
    visa_type: 'Intra-Company Transfer',
    title: 'Intra-Company Transfer Work Permit Exemption',
    description: 'Foreign managers, executives, and specialists sent to Vietnam by a company that has established a commercial presence there may be exempt from the standard work permit requirement, subject to notification to DOLISA.',
    requirements: {
      employment: 'Senior employee of the parent company sent to manage or lead a commercial presence in Vietnam',
      role: 'Chief Representative, General Director, or equivalent senior management role',
      documents: ['Passport', 'Letter of appointment', 'Proof of parent company\'s commercial presence in Vietnam', 'Work permit exemption notification to DOLISA'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '3-5 business days (DOLISA notification)',
    cost: 'No work permit fee (exemption); standard visa fees apply',
    validity: 'Up to 5 years (tied to the commercial presence registration)',
    source_url: 'https://www.molisa.gov.vn/',
  },

  // ── Philippines ──
  {
    country_code: 'ph',
    visa_type: 'AEP',
    title: 'Alien Employment Permit (AEP)',
    description: 'Required for all non-resident foreign nationals seeking employment in the Philippines. Issued by the Department of Labor and Employment (DOLE) after confirming no qualified Filipino is available for the position.',
    requirements: {
      job_offer: 'Employment contract with a Philippine employer',
      labor_test: 'DOLE must confirm no qualified Filipino national is available for the position',
      documents: ['Passport', 'Employment contract', 'Company registration documents', 'Proof of qualifications', 'Passport photos', 'Application form'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '2-4 weeks',
    cost: 'PHP 8,000 (AEP fee) + PHP 3,000 (legal research fund)',
    validity: 'Up to 3 years, renewable',
    source_url: 'https://www.dole.gov.ph/alien-employment-permit-aep/',
  },
  {
    country_code: 'ph',
    visa_type: '9(g) Visa',
    title: 'Pre-Arranged Employment Visa 9(g)',
    description: 'Non-immigrant visa for foreign nationals who have secured employment with a Philippine company. Applied for at a Philippine embassy abroad; requires a prior Alien Employment Permit (AEP).',
    requirements: {
      aep: 'Valid Alien Employment Permit (AEP) issued by DOLE',
      job_offer: 'Employment contract with a Philippine employer',
      documents: ['Passport', 'AEP', 'Employment contract', 'Company incorporation documents', 'Board resolution authorizing employment', 'Photos'],
      sponsorship_required: true,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'USD 30-60 (visa fee; varies by Philippine embassy)',
    validity: 'Up to 1 year (initial); renewable annually',
    source_url: 'https://immigration.gov.ph/visas/non-immigrant-visa/working-visas',
  },
  {
    country_code: 'ph',
    visa_type: 'SRRV',
    title: 'Special Resident Retiree\'s Visa (SRRV)',
    description: 'Administered by the Philippine Retirement Authority (PRA). Offers permanent, multiple-entry residency in exchange for a bank deposit. Allows the holder to work or engage in business.',
    requirements: {
      deposit: 'USD 10,000-50,000 bank deposit depending on age and pension status',
      age: 'Minimum 35 years old',
      health: 'Clean health and character certificate',
      documents: ['Passport', 'PRA application', 'Bank deposit certificate', 'Medical certificate', 'Criminal background check', 'Photos'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'USD 1,400 (PRA membership fee)',
    validity: 'Permanent (as long as deposit is maintained)',
    source_url: 'https://pra.gov.ph/srrv/',
  },
  {
    country_code: 'ph',
    visa_type: 'SIRV',
    title: 'Special Investor\'s Resident Visa (SIRV)',
    description: 'Grants permanent resident status to foreign nationals making a qualifying equity investment in a Philippine company registered with the Board of Investments (BOI) or Philippine Economic Zone Authority (PEZA).',
    requirements: {
      investment: 'Minimum USD 75,000 investment in a BOI or PEZA-registered enterprise, or USD 250,000 in Philippine government securities',
      business: 'Qualifying investment in an industry listed in the BOI Investment Priority Plan',
      documents: ['Passport', 'BOI/PEZA certification', 'Proof of investment', 'Criminal background check', 'Medical certificate', 'Photos'],
      sponsorship_required: false,
      quota_limited: false,
    },
    processing_time: '4-8 weeks',
    cost: 'USD 300 (SIRV application fee)',
    validity: 'Permanent (as long as investment is maintained)',
    source_url: 'https://immigration.gov.ph/visas/special-visas/special-investors-resident-visa-sirv',
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

// ============================================================
// HireMatch — Core Types
// ============================================================

// ---- Countries & Locales ----
export type CountryCode =
  | 'us' | 'ca' | 'gb' | 'ch' | 'de' | 'fr' | 'es' | 'it' | 'nl' | 'be'
  | 'at' | 'pt' | 'ie' | 'se' | 'dk' | 'no' | 'fi' | 'pl' | 'cz' | 'ro'
  | 'in' | 'mx' | 'br' | 'ar' | 'cn' | 'jp' | 'kr' | 'vn' | 'ph';

export type Locale =
  | 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'nl' | 'sv' | 'da' | 'no'
  | 'fi' | 'pl' | 'cs' | 'ro' | 'hi' | 'ja' | 'ko' | 'zh' | 'vi' | 'tl';

// ---- User Roles ----
export type UserRole = 'candidate' | 'recruiter' | 'admin';

export type RecruiterTier = 'free' | 'pro' | 'enterprise' | 'agency';

// ---- Candidate (Job Seeker) ----
export interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  headline?: string;          // "Senior React Developer | 8 years experience"
  bio?: string;
  country: CountryCode;
  city?: string;
  remote_preference: 'remote' | 'hybrid' | 'onsite' | 'any';
  skills: string[];
  experience_years: number;
  education: Education[];
  work_history: WorkExperience[];
  certifications: string[];
  languages: string[];
  visa_status?: string;       // "citizen", "permanent_resident", "work_visa", "needs_sponsorship"
  salary_expectation_min?: number;
  salary_expectation_max?: number;
  salary_currency?: string;
  quiz_answers?: Record<string, string>;
  match_tags: string[];       // derived from quiz + CV parsing
  cv_url?: string;            // uploaded CV file in Supabase Storage
  cv_parsed_at?: string;
  is_public: boolean;         // opt-in to public profile
  available_now?: boolean;
  notice_period?: string;     // "immediate", "2 weeks", "1 month", etc.
  available_from?: string;    // ISO date
  open_to_relocation?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number;
  country?: CountryCode;
}

export interface WorkExperience {
  company: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  country?: CountryCode;
  skills: string[];
}

// ---- Recruiter / Employer ----
export interface Recruiter {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_url?: string;
  company_website?: string;
  industry: string;
  company_size: string;       // "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
  country: CountryCode;
  city?: string;
  bio?: string;
  culture_tags: string[];
  tier: RecruiterTier;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  jobs_posted_count: number;
  candidate_views_remaining: number;
  created_at: string;
  updated_at: string;
}

// ---- Job Listing ----
export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  description: string;
  requirements: string[];
  nice_to_haves: string[];
  skills_required: string[];
  job_type: JobType;
  work_mode: WorkMode;
  country: CountryCode;
  city?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  visa_sponsorship: boolean;
  experience_min?: number;
  experience_max?: number;
  education_level?: string;
  industry: string;
  match_tags: string[];       // derived from AI JD parsing
  is_active: boolean;
  is_featured: boolean;
  views_count: number;
  applications_count: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// ---- Application Lifecycle ----
export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_extended'
  | 'offer_accepted'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  recruiter_id: string;
  status: ApplicationStatus;
  cover_letter?: string;
  match_score?: number;       // AI-computed 0-100
  match_explanation?: string; // AI-generated "why this is a good match"
  notes?: string;             // recruiter notes
  status_history: StatusChange[];
  created_at: string;
  updated_at: string;
}

export interface StatusChange {
  status: ApplicationStatus;
  changed_at: string;
  changed_by: string;         // user_id
  note?: string;
}

// ---- Matchmaker Quiz ----
export interface QuizQuestion {
  id: string;
  category: 'work_style' | 'culture' | 'skills' | 'values' | 'growth';
  question: string;
  options: QuizOption[];
  weight: number;
  order: number;
}

export interface QuizOption {
  value: string;
  label: string;
  tags: string[];             // tags this answer maps to
}

// ---- Match ----
export interface Match {
  id: string;
  candidate_id: string;
  job_id: string;
  score: number;              // 0-100
  breakdown: MatchBreakdown;
  explanation: string;        // AI-generated
  created_at: string;
}

export interface MatchBreakdown {
  skills_score: number;
  experience_score: number;
  culture_score: number;
  location_score: number;
  salary_score: number;
}

// ---- Visa & Compliance ----
export interface VisaRequirement {
  id: string;
  origin_country: CountryCode;
  destination_country: CountryCode;
  visa_type: string;          // "H-1B", "Skilled Worker", "Blue Card", etc.
  name: string;
  description: string;
  eligible_occupations?: string[];
  processing_time_days?: number;
  fee_amount?: number;
  fee_currency?: string;
  sponsorship_required: boolean;
  required_documents: string[];
  min_salary?: number;
  min_experience_years?: number;
  education_requirements?: string;
  quota_limited: boolean;
  annual_quota?: number;
  notes?: string;
  source_url: string;
  last_scraped_at: string;
  last_changed_at: string;
  is_active: boolean;
}

// ---- Webhooks (ATS integration) ----
export interface WebhookConfig {
  id: string;
  recruiter_id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  is_active: boolean;
  created_at: string;
}

export type WebhookEvent =
  | 'application.created'
  | 'application.status_changed'
  | 'candidate.matched'
  | 'job.created'
  | 'job.updated'
  | 'job.closed'
  | 'match.found';

export interface QuizQuestion {
  id: number;
  q: string;
  icon: string;
  topic: string;
  color: string;
  colorHex: string;
  opts: string[];
  tagWeights: Record<string, number>[];
}

export interface CompanyMatch {
  name: string;
  industry: string;
  logo: string;
  brandColor: string;
  score: number;
  cultureTags: string[];
  whyMatch: string[];
}

export interface ProcessingStage {
  icon: string;
  label: string;
  sublabel: string;
}

export interface Competitor {
  name: string;
  score: number;
  avatar: string;
}

export interface RealJob {
  id: string;
  title: string;
  company: string;
  industry: string;
  work_mode: string;
  country: string;
  city?: string;
  job_type: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  visa_sponsorship: boolean;
  skills_required: string[];
  match_tags: string[];
  matchScore: number;
  matchReasons: string[];
}

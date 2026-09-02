export type ResumeSource = "created" | "uploaded";
export type ReferencesMode = "available_upon_request";

export interface LinkEntry {
  label: string;
  url: string;
}

export interface PersonalDetails {
  full_name: string;
  professional_title?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: LinkEntry[];
}

export interface ExperienceEntry {
  id: string;
  company_name: string;
  job_title: string;
  location?: string;
  start_date: string;
  end_date: string;
  description_bullets?: string[];
  order_index: number;
}

export interface EducationEntry {
  id: string;
  institution_name: string;
  degree: string;
  start_date?: string;
  end_date?: string;
  details?: string;
  order_index: number;
}

export interface ProjectEntry {
  id: string;
  project_name: string;
  link?: string;
  timeframe?: string;
  description_bullets?: string[];
  order_index: number;
}

export interface SkillGroup {
  category_label?: string;
  skills: string[];
}

export interface CertificationEntry {
  id: string;
  certification_name: string;
  issuing_organization?: string;
  date_obtained?: string;
  expiration_date?: string;
}

export interface AchievementEntry {
  id: string;
  statement: string;
  order_index: number;
}

export interface ReferenceEntry {
  id: string;
  name: string;
  relationship?: string;
  contact_info?: string;
}

export interface ResumeMeta {
  source: ResumeSource;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  personal_details: PersonalDetails;
  professional_summary?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  projects?: ProjectEntry[];
  skills?: SkillGroup[];
  certifications?: CertificationEntry[];
  achievements?: AchievementEntry[];
  references?: ReferenceEntry[] | ReferencesMode;
  meta: ResumeMeta;
}

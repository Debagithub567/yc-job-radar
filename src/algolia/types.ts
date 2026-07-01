// Shape confirmed by manual curl testing against
// WaaSPublicCompanyJob_company_most_active_production.
// Fields are optional/nullable defensively — YC can add/remove fields without
// warning, and we don't want ingestion to crash on a missing field.
export interface AlgoliaJobHit {
  objectID: string;
  company_id?: number;
  company_name?: string;
  company_website?: string;
  company_description?: string;
  company_waas_stage?: string;
  company_waas_activity_score?: number;
  title: string;
  description?: string; // markdown body
  role?: string; // eng | design | data | ...
  eng_type?: string[]; // fs | be | fe | android | devops | data_sci | ...
  job_type?: string; // fulltime | contract | internship | ...
  remote?: string;
  min_experience?: number;
  has_salary?: boolean;
  has_equity?: boolean;
  has_interview_process?: boolean;
  skills?: string[];
  locations_for_search?: string[];
  us_visa_required?: string;
  [key: string]: unknown; // tolerate unknown fields rather than dropping them
}

export interface AlgoliaSearchResponse {
  results: Array<{
    hits: AlgoliaJobHit[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
  }>;
}

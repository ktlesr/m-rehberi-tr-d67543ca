// Types for Support Program Summary feature

export interface SupportProgramSummary {
  id: string;
  support_program_id: string;
  who_can_apply: string | null;
  supported_areas: string | null;
  application_period: string | null;
  application_location: string | null;
  application_url: string | null;
  summary_pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SummaryData {
  who_can_apply: string | null;
  supported_areas: string | null;
  application_period: string | null;
  application_location: string | null;
  application_url: string | null;
}

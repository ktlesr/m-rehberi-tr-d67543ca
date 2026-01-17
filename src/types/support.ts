
export interface Institution {
  id: number;
  name: string;
  created_at: string;
}

export interface TagCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  category_id: number;
  category?: TagCategory;
  created_at: string;
}

export interface SupportProgramSummary {
  who_can_apply: string | null;
  supported_areas: string | null;
  application_period: string | null;
  application_location: string | null;
  application_url: string | null;
  summary_pdf_url: string | null;
}

export interface SupportProgram {
  id: string;
  institution_id: number;
  title: string;
  description: string;
  application_deadline?: string;
  eligibility_criteria?: string;
  contact_info?: string;
  created_at: string;
  updated_at: string;
  institution?: Institution;
  tags: Tag[];
  files: FileAttachment[];
  summary?: SupportProgramSummary | null;
}

export interface SupportProgramTag {
  id: string;
  support_program_id: string;
  tag_id: number;
  created_at: string;
}

export interface FileAttachment {
  id: string;
  support_program_id: string;
  filename: string;
  file_url: string;
  uploaded_at: string;
  display_order?: number;
}

export interface SearchFilters {
  keyword?: string;
  tags?: number[];
  institution?: string;
  institutionId?: number;
  status?: 'all' | 'open' | 'closed';
}

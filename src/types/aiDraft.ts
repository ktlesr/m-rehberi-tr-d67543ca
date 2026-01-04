// Types for AI Draft Generator feature

export interface EvidenceRef {
  source: string;
  page_or_article?: string | null;
  url?: string | null;
}

export interface FieldEvidence {
  field_key: string;
  value: string;
  confidence: 'low' | 'medium' | 'high';
  quotes: string[];
  refs: EvidenceRef[];
}

export interface FieldIssue {
  type: 'missing' | 'conflict' | 'format';
  field_key: string;
  message: string;
}

export interface MissingTag {
  category: string;
  labels: string[];
}

export interface AIDraftFilledFields {
  institution_id: number | null;
  application_deadline: string | null;
  title: string;
  description: string;
  eligibility_criteria: string;
  contact_info: string;
}

export interface AIDraftRequest {
  uploaded_files: Array<{ id?: string; name: string; path: string }>;
  source_url: string | null;
  hint: string | null;
}

export interface AIDraftResponse {
  filled_fields: AIDraftFilledFields;
  selected_tag_ids: number[];
  missing_tags: MissingTag[];
  evidence: FieldEvidence[];
  issues: FieldIssue[];
}

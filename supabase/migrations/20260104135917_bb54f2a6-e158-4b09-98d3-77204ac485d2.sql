-- Table for storing AI-generated evidence for each field in a support program
CREATE TABLE public.support_program_field_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_program_id UUID REFERENCES public.support_programs(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value_text TEXT,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  evidence_quotes JSONB DEFAULT '[]',
  evidence_refs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups by program
CREATE INDEX idx_evidence_program ON public.support_program_field_evidence(support_program_id);

-- Table for tracking tags that AI suggested but couldn't map to existing tags
CREATE TABLE public.ai_draft_missing_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_program_id UUID REFERENCES public.support_programs(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  suggested_labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_missing_tags_program ON public.ai_draft_missing_tags(support_program_id);

-- Enable RLS
ALTER TABLE public.support_program_field_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_draft_missing_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow authenticated users to manage evidence
CREATE POLICY "Authenticated users can view evidence" 
ON public.support_program_field_evidence 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert evidence" 
ON public.support_program_field_evidence 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update evidence" 
ON public.support_program_field_evidence 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete evidence" 
ON public.support_program_field_evidence 
FOR DELETE 
TO authenticated
USING (true);

-- RLS policies for missing tags
CREATE POLICY "Authenticated users can view missing tags" 
ON public.ai_draft_missing_tags 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert missing tags" 
ON public.ai_draft_missing_tags 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete missing tags" 
ON public.ai_draft_missing_tags 
FOR DELETE 
TO authenticated
USING (true);
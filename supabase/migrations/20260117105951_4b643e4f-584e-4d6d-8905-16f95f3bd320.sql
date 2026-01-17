-- Create table for storing support program summary data
CREATE TABLE public.support_program_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_program_id UUID REFERENCES public.support_programs(id) ON DELETE CASCADE UNIQUE,
  
  -- 4 main summary sections
  who_can_apply TEXT,
  supported_areas TEXT,
  application_period TEXT,
  application_location TEXT,
  application_url TEXT,
  
  -- Generated PDF URL
  summary_pdf_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_program_summaries ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public can read support program summaries"
  ON public.support_program_summaries
  FOR SELECT
  USING (true);

-- Admin write policy (users with admin role)
CREATE POLICY "Admins can manage support program summaries"
  ON public.support_program_summaries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_support_program_summaries_program_id 
  ON public.support_program_summaries(support_program_id);
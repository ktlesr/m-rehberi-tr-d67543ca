-- Create investment_thresholds table for YDO (Yeniden Değerleme Oranı) management
CREATE TABLE public.investment_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  revaluation_rate DECIMAL(6,2),
  
  -- Regional minimum investments
  min_investment_region_1_2 BIGINT NOT NULL,
  min_investment_region_3_6 BIGINT NOT NULL,
  
  -- Priority investment thresholds
  min_high_tech_priority BIGINT NOT NULL,
  min_mid_high_tech_priority BIGINT NOT NULL,
  
  -- Strategic program thresholds
  min_strategic_high_tech BIGINT,
  min_strategic_other BIGINT,
  min_strategic_green_digital BIGINT,
  min_priority_high_tech BIGINT,
  min_priority_mid_high_tech BIGINT,
  min_priority_cloud BIGINT,
  
  -- Other amounts
  min_financial_leasing BIGINT,
  min_machinery_support BIGINT,
  completion_expert_fee BIGINT,
  
  is_active BOOLEAN DEFAULT FALSE,
  effective_from DATE NOT NULL,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(year)
);

-- Enable RLS
ALTER TABLE public.investment_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policies - using 'admin' role only (valid enum value)
CREATE POLICY "Anyone can read investment thresholds"
ON public.investment_thresholds
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert investment thresholds"
ON public.investment_thresholds
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can update investment thresholds"
ON public.investment_thresholds
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete investment thresholds"
ON public.investment_thresholds
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_investment_thresholds_updated_at
BEFORE UPDATE ON public.investment_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 2025 data (base year - before YDO applied)
INSERT INTO public.investment_thresholds (
  year,
  revaluation_rate,
  min_investment_region_1_2,
  min_investment_region_3_6,
  min_high_tech_priority,
  min_mid_high_tech_priority,
  min_strategic_high_tech,
  min_strategic_other,
  min_strategic_green_digital,
  min_priority_high_tech,
  min_priority_mid_high_tech,
  min_priority_cloud,
  min_financial_leasing,
  min_machinery_support,
  completion_expert_fee,
  is_active,
  effective_from,
  notes
) VALUES (
  2025,
  NULL,
  12000000,
  6000000,
  500000000,
  1000000000,
  100000000,
  200000000,
  50000000,
  500000000,
  1000000000,
  200000000,
  3000000,
  2000000,
  1000,
  FALSE,
  '2025-01-01',
  '2025 yılı baz değerleri'
);

-- Insert 2026 data (with YDO %25.49 applied)
INSERT INTO public.investment_thresholds (
  year,
  revaluation_rate,
  min_investment_region_1_2,
  min_investment_region_3_6,
  min_high_tech_priority,
  min_mid_high_tech_priority,
  min_strategic_high_tech,
  min_strategic_other,
  min_strategic_green_digital,
  min_priority_high_tech,
  min_priority_mid_high_tech,
  min_priority_cloud,
  min_financial_leasing,
  min_machinery_support,
  completion_expert_fee,
  is_active,
  effective_from,
  notes
) VALUES (
  2026,
  25.49,
  15100000,
  7500000,
  627000000,
  1255000000,
  125000000,
  251000000,
  62700000,
  627000000,
  1255000000,
  251000000,
  3800000,
  2500000,
  1300,
  TRUE,
  '2026-01-01',
  '2026 yılı değerleri - YDO %25.49 uygulanmış'
);
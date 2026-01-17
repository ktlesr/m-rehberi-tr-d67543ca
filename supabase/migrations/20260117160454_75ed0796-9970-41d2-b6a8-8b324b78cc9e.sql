-- Faiz/Kâr Payı Desteği Üst Limitleri
ALTER TABLE investment_thresholds 
  ADD COLUMN IF NOT EXISTS max_interest_support_tech_local BIGINT,
  ADD COLUMN IF NOT EXISTS max_interest_support_strategic BIGINT,
  ADD COLUMN IF NOT EXISTS max_interest_support_priority BIGINT,
  ADD COLUMN IF NOT EXISTS max_interest_support_target BIGINT;

-- Makine Desteği Üst Limitleri
ALTER TABLE investment_thresholds 
  ADD COLUMN IF NOT EXISTS max_machinery_support_tech_local BIGINT,
  ADD COLUMN IF NOT EXISTS max_machinery_support_strategic BIGINT;

-- Ek Faiz Desteği Üst Limitleri (Yeni Firmalar)
ALTER TABLE investment_thresholds 
  ADD COLUMN IF NOT EXISTS max_extra_interest_turkey_century BIGINT,
  ADD COLUMN IF NOT EXISTS max_extra_interest_priority BIGINT,
  ADD COLUMN IF NOT EXISTS max_extra_interest_target BIGINT;

-- 2025 yılı değerlerini güncelle
UPDATE investment_thresholds 
SET 
  max_interest_support_tech_local = 240000000,
  max_interest_support_strategic = 180000000,
  max_interest_support_priority = 24000000,
  max_interest_support_target = 12000000,
  max_machinery_support_tech_local = 240000000,
  max_machinery_support_strategic = 180000000,
  max_extra_interest_turkey_century = 60000000,
  max_extra_interest_priority = 6000000,
  max_extra_interest_target = 2400000
WHERE year = 2025;

-- 2026 yılı değerlerini güncelle
UPDATE investment_thresholds 
SET 
  max_interest_support_tech_local = 301000000,
  max_interest_support_strategic = 226000000,
  max_interest_support_priority = 30100000,
  max_interest_support_target = 15100000,
  max_machinery_support_tech_local = 301000000,
  max_machinery_support_strategic = 226000000,
  max_extra_interest_turkey_century = 75300000,
  max_extra_interest_priority = 7500000,
  max_extra_interest_target = 3000000
WHERE year = 2026;
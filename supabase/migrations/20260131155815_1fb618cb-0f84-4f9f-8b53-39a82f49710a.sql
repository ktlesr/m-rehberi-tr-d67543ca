-- year sütunu ekle (varsayılan 2025)
ALTER TABLE public.investments_by_province 
ADD COLUMN year INTEGER NOT NULL DEFAULT 2025;

-- Performans için index ekle
CREATE INDEX idx_investments_province_year 
ON public.investments_by_province (province, year);
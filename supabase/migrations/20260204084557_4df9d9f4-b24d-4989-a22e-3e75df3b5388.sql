-- 1. Yeni sütunları ekle
ALTER TABLE public.sector_search 
ADD COLUMN IF NOT EXISTS is_hamle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gtip TEXT,
ADD COLUMN IF NOT EXISTS gtip_aciklamasi TEXT;

-- 2. Mevcut verilerden is_hamle değerini çıkar (EVET ile başlayanlar)
UPDATE public.sector_search 
SET is_hamle = TRUE 
WHERE teknoloji_hamlesi IS NOT NULL 
  AND UPPER(teknoloji_hamlesi) LIKE 'EVET%';

-- 3. Index ekle
CREATE INDEX IF NOT EXISTS idx_sector_search_is_hamle ON public.sector_search (is_hamle);
CREATE INDEX IF NOT EXISTS idx_sector_search_gtip ON public.sector_search (gtip);
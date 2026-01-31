

# Yerel Kalkınma Hamlesi Yıl Bazlı Güncelleme Planı (Revize)

## Yapılacaklar

| Adım | Açıklama | Kim Yapacak |
|------|----------|-------------|
| 1. Migration | `year` sütunu ekleme | Lovable |
| 2. Frontend Güncelleme | Yıl filtresi ekleme | Lovable |
| 3. 2026 Verileri | Manuel veri girişi | Kullanıcı (Supabase) |

---

## Teknik Uygulama

### 1. Veritabanı Migration

```sql
-- year sütunu ekle (varsayılan 2025)
ALTER TABLE public.investments_by_province 
ADD COLUMN year INTEGER NOT NULL DEFAULT 2025;

-- Performans için index ekle
CREATE INDEX idx_investments_province_year 
ON public.investments_by_province (province, year);
```

Mevcut 324 kayıt otomatik olarak `year = 2025` değerini alacak.

### 2. Frontend Değişiklikleri

#### `src/components/IncentiveCalculatorForm.tsx`

- Interface'e `year: number` ekleme
- Supabase sorgusuna `.eq('year', new Date().getFullYear())` filtresi ekleme

#### `src/components/EnhancedIncentiveCalculatorForm.tsx`

- Aynı değişiklikler bu dosyaya da uygulanacak

---

## Sonrasında Sizin Yapacağınız

Migration tamamlandıktan sonra Supabase'den:

```sql
INSERT INTO investments_by_province (province, investment_name, year) 
VALUES 
  ('İstanbul', 'Atık Elektrikli ve Elektronik Eşya...', 2026),
  ('İstanbul', 'Havuçtan Beta Karoten...', 2026),
  -- diğer kayıtlar
```

şeklinde 2026 verilerini ekleyebilirsiniz.

---

## Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| SQL Migration | `year` sütunu ve index ekleme |
| `src/components/IncentiveCalculatorForm.tsx` | Yıl filtresi ekleme |
| `src/components/EnhancedIncentiveCalculatorForm.tsx` | Yıl filtresi ekleme |


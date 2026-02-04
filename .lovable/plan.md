

# `teknoloji_hamlesi` Sütununu Silme Planı

## Mevcut Durum

Şu an veritabanında HEM `teknoloji_hamlesi` (TEXT) HEM de `is_hamle` (BOOLEAN) sütunları bulunuyor. Planda "geriye uyumluluk" için tutmuştuk ama artık silmemiz gerekiyor.

## Etkilenen Dosyalar

Arama sonuçlarına göre `teknoloji_hamlesi` referansı olan 8 dosya var:

| Dosya | Kullanım |
|-------|----------|
| `src/types/database.ts` | Interface tanımı |
| `src/integrations/supabase/types.ts` | Otomatik generate (migration sonrası otomatik güncellenir) |
| `src/utils/investmentStatusHelper.ts` | Fallback kontrolü |
| `src/hooks/useSectorSuggestions.ts` | Interface tanımı |
| `src/components/steps/SectorSearchStep.tsx` | determineInvestmentStatus çağrısı |
| `src/components/steps/IncentiveResultsStep.tsx` | sectorDataForStatus objesi |
| `supabase/functions/lookup-nace/index.ts` | Interface + fallback |
| `supabase/functions/chat-gemini/index.ts` | SELECT sorgusu + format |

---

## Uygulama Adımları

### Adım 1: Veritabanı Migrasyonu

```sql
-- teknoloji_hamlesi sütununu sil
ALTER TABLE public.sector_search 
DROP COLUMN IF EXISTS teknoloji_hamlesi;
```

### Adım 2: Type Tanımlarını Güncelleme

**`src/types/database.ts`** - `teknoloji_hamlesi` satırını kaldır:

```typescript
export interface SectorSearchData {
  id: number;
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  is_hamle: boolean;              // Teknoloji Hamlesi için tek alan
  gtip: string | null;
  gtip_aciklamasi: string | null;
  sartlar: string | null;
  // ... diğer alanlar
}
```

**`src/hooks/useSectorSuggestions.ts`** - Interface'den kaldır

### Adım 3: Business Logic Güncelleme

**`src/utils/investmentStatusHelper.ts`**:

Mevcut:
```typescript
const isTeknolojHamlesi = 
  sectorData.is_hamle === true || 
  sectorData.teknoloji_hamlesi?.toUpperCase().startsWith("EVET");
```

Yeni:
```typescript
const isTeknolojHamlesi = sectorData.is_hamle === true;
```

Interface'den `teknoloji_hamlesi` kaldırılacak.

### Adım 4: Component Güncellemeleri

**`src/components/steps/SectorSearchStep.tsx`**:
- `determineInvestmentStatus` çağrısından `teknoloji_hamlesi` parametresini kaldır

**`src/components/steps/IncentiveResultsStep.tsx`**:
- `sectorDataForStatus` objesinden `teknoloji_hamlesi` satırını kaldır
- `is_hamle` ekle

### Adım 5: Edge Function Güncellemeleri

**`supabase/functions/lookup-nace/index.ts`**:
- Interface'den `teknoloji_hamlesi` kaldır
- Fallback logic'i kaldır: sadece `row.is_hamle` kontrol et

**`supabase/functions/chat-gemini/index.ts`**:
- SELECT sorgusundan `teknoloji_hamlesi` kaldır, yerine `is_hamle` ekle
- Format fonksiyonunda `is_hamle` kullan

---

## Değişiklik Özeti

| Dosya | İşlem |
|-------|-------|
| SQL Migration | `DROP COLUMN teknoloji_hamlesi` |
| `src/types/database.ts` | `teknoloji_hamlesi` satırını sil |
| `src/integrations/supabase/types.ts` | Otomatik regenerate |
| `src/utils/investmentStatusHelper.ts` | Fallback kaldır, interface güncelle |
| `src/hooks/useSectorSuggestions.ts` | Interface'den kaldır |
| `src/components/steps/SectorSearchStep.tsx` | Parametre kaldır |
| `src/components/steps/IncentiveResultsStep.tsx` | `is_hamle` ekle, `teknoloji_hamlesi` kaldır |
| `supabase/functions/lookup-nace/index.ts` | Interface + logic güncelle |
| `supabase/functions/chat-gemini/index.ts` | SELECT + format güncelle |

---

## Dikkat Edilecekler

- Migration sonrası `is_hamle` değerleri mevcut verilerden zaten migrate edildi
- Kod değişiklikleri migration ile senkron yapılmalı
- Edge function'lar yeniden deploy edilecek


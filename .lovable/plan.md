

# Teknoloji Hamlesi - GTİP Bazlı Yeniden Yapılandırma Planı

## Mevcut Durum Analizi

Mevcut `sector_search` tablosunda `teknoloji_hamlesi` sütunu TEXT formatında ve içinde tüm bilgiler birleşik tutuluyor:

```
"EVET. GTİP No. 850440551000 ile Elektrikli Teçhizat Sektörü Öncelikli Ürün Listesi Çağrısı kapsamındadır"
```

Bu yapının sorunları:
- Bir NACE koduna birden fazla GTİP bağlanamıyor
- GTİP kodu ve açıklaması ayrıştırılamıyor
- Filtreleme ve arama zorlaşıyor

---

## Yeni Veri Modeli

### Seçenek 1: Mevcut Tabloya Sütun Ekleme (Basit)

```text
┌─────────────────────────────────────────────────────────────────┐
│                        sector_search                            │
├─────────────────────────────────────────────────────────────────┤
│ id                    │ INTEGER (PK)                            │
│ nace_kodu             │ TEXT                                    │
│ sektor                │ TEXT                                    │
│ hedef_yatirim         │ BOOLEAN                                 │
│ oncelikli_yatirim     │ BOOLEAN                                 │
│ yuksek_teknoloji      │ BOOLEAN                                 │
│ orta_yuksek_teknoloji │ BOOLEAN                                 │
│ is_hamle              │ BOOLEAN (YENİ - eski teknoloji_hamlesi) │
│ gtip                  │ TEXT (YENİ)                             │
│ gtip_aciklamasi       │ TEXT (YENİ)                             │
│ sartlar               │ TEXT                                    │
│ bolge_1-6             │ BIGINT                                  │
└─────────────────────────────────────────────────────────────────┘
```

Bu yaklaşımda bir NACE-GTİP kombinasyonu için birden fazla satır olabilir.

### Seçenek 2: Ayrı İlişkisel Tablo (Normalize)

```text
┌──────────────────────┐         ┌──────────────────────────────┐
│    sector_search     │         │    teknoloji_hamlesi_gtip    │
├──────────────────────┤         ├──────────────────────────────┤
│ id (PK)              │◄───────┐│ id (PK)                      │
│ nace_kodu            │        ││ sector_search_id (FK)        │
│ sektor               │        │└─► nace_kodu (denormalize)    │
│ ...                  │         │ gtip                         │
│ is_hamle  (BOOLEAN)  │         │ gtip_aciklamasi              │
│ (teknoloji_hamlesi   │         │ created_at                   │
│  kaldırılacak)       │         └──────────────────────────────┘
└──────────────────────┘
```

**Öneri**: Sizin açıklamanıza göre **Seçenek 1** (mevcut tabloya sütun ekleme) daha uygun. Çünkü:
- Mevcut fonksiyonellik minimal değişiklikle korunur
- Manuel veri yükleme daha kolay
- Bir NACE altında birden fazla GTİP varsa, her biri ayrı satır olarak kaydedilir

---

## Uygulama Adımları

### Adım 1: Veritabanı Migrasyonu

```sql
-- 1. Yeni sütunları ekle
ALTER TABLE public.sector_search 
ADD COLUMN is_hamle BOOLEAN DEFAULT FALSE,
ADD COLUMN gtip TEXT,
ADD COLUMN gtip_aciklamasi TEXT;

-- 2. Mevcut verilerden is_hamle değerini çıkar
UPDATE public.sector_search 
SET is_hamle = TRUE 
WHERE teknoloji_hamlesi IS NOT NULL 
  AND UPPER(teknoloji_hamlesi) LIKE 'EVET%';

-- 3. Mevcut verilerden GTİP kodunu parse et (regex ile)
-- Not: Bu opsiyonel, manuel yükleme yapılacaksa gerek yok

-- 4. Index ekle
CREATE INDEX idx_sector_search_is_hamle ON public.sector_search (is_hamle);
CREATE INDEX idx_sector_search_gtip ON public.sector_search (gtip);
```

### Adım 2: Type Tanımları Güncelleme

**Dosya: `src/types/database.ts`**

```typescript
export interface SectorSearchData {
  id: number;
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  is_hamle: boolean;              // YENİ
  gtip: string | null;            // YENİ
  gtip_aciklamasi: string | null; // YENİ
  teknoloji_hamlesi: string | null; // Geriye uyumluluk için tutulacak
  sartlar: string | null;
  bolge_1: number;
  // ... diğer alanlar
}
```

### Adım 3: investmentStatusHelper.ts Güncelleme

**Dosya: `src/utils/investmentStatusHelper.ts`**

`SectorDataForStatus` interface'i ve `determineInvestmentStatus` fonksiyonu güncellenir:

```typescript
export interface SectorDataForStatus {
  is_hamle?: boolean;  // YENİ - öncelikli kontrol
  teknoloji_hamlesi?: string | null; // Geriye uyumluluk
  gtip?: string | null;
  gtip_aciklamasi?: string | null;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
}

// DURUM 1 kontrolü güncellenir:
const isTeknolojHamlesi = 
  sectorData.is_hamle === true ||  // Yeni alan
  sectorData.teknoloji_hamlesi?.toUpperCase().startsWith("EVET"); // Fallback
```

### Adım 4: SectorSearchStep.tsx - GTİP Badge Gösterimi

Seçili sektörde `is_hamle = TRUE` ve GTİP bilgisi varsa, bu bilgiyi badge olarak göster:

```typescript
// renderBadges fonksiyonuna ek:
{badges.showTechInitiative && result.gtip && (
  <Badge className="bg-indigo-100 text-indigo-800 text-xs">
    GTİP: {result.gtip}
  </Badge>
)}
```

### Adım 5: GTİP Alt Listesi Gösterimi

Bir NACE kodu seçildiğinde, bu NACE'ye bağlı tüm GTİP kodlarını sorgula ve göster:

```typescript
// Yeni fonksiyon: fetchGtipsByNace
const fetchGtipsByNace = async (naceKodu: string) => {
  const { data } = await supabase
    .from('sector_search')
    .select('gtip, gtip_aciklamasi')
    .eq('nace_kodu', naceKodu)
    .eq('is_hamle', true)
    .not('gtip', 'is', null);
  return data;
};
```

### Adım 6: lookup-nace Edge Function Güncelleme

**Dosya: `supabase/functions/lookup-nace/index.ts`**

Interface ve format fonksiyonu güncellenir:

```typescript
interface SectorRow {
  // ... mevcut alanlar
  is_hamle: boolean;
  gtip: string | null;
  gtip_aciklamasi: string | null;
}

// formatTurkishOutput güncellenir
if (row.is_hamle) {
  lines.push("🚀 Teknoloji Hamlesi Programı kapsamındadır");
  if (row.gtip) {
    lines.push(`📦 GTİP: ${row.gtip}`);
    if (row.gtip_aciklamasi) {
      lines.push(`📝 ${row.gtip_aciklamasi}`);
    }
  }
}
```

---

## Dosya Değişiklikleri Özeti

| Dosya | İşlem |
|-------|-------|
| SQL Migration | `is_hamle`, `gtip`, `gtip_aciklamasi` sütunları + index |
| `src/types/database.ts` | Interface güncelleme |
| `src/integrations/supabase/types.ts` | Otomatik regenerate |
| `src/utils/investmentStatusHelper.ts` | `is_hamle` kontrolü ekleme |
| `src/components/steps/SectorSearchStep.tsx` | GTİP badge gösterimi |
| `src/hooks/useSectorSuggestions.ts` | Yeni alanları dahil etme |
| `supabase/functions/lookup-nace/index.ts` | GTİP bilgisi gösterimi |

---

## Migrasyon Sonrası Sizin Yapacaklarınız

Tablo güncellendiğinde Supabase üzerinden:

```sql
-- Örnek GTİP verisi yükleme
INSERT INTO sector_search (nace_kodu, sektor, is_hamle, gtip, gtip_aciklamasi, ...)
VALUES 
  ('10.89.05', 'Bitki özsu ve ekstreleri...', TRUE, '130220101000', 'Diğer Sektörler Öncelikli Ürün Listesi', ...);
```

veya mevcut kayıtları güncelleyerek:

```sql
UPDATE sector_search 
SET 
  is_hamle = TRUE,
  gtip = '130220101000',
  gtip_aciklamasi = 'Diğer Sektörler Öncelikli Ürün Listesi'
WHERE id = ?;
```

---

## Korunan Özellikler

- Mevcut tüm teşvik sorgulama fonksiyonelliği korunur
- `hedef_yatirim`, `oncelikli_yatirim`, `yuksek_teknoloji`, `orta_yuksek_teknoloji` kontrolleri değişmez
- Sadece Teknoloji Hamlesi kontrolü `is_hamle` boolean alanına taşınır
- Geriye uyumluluk için eski `teknoloji_hamlesi` sütunu silinmez




# Asgari Yatırım Tutarı Düzeltme - Genişletilmiş Pattern Planı

## Problem

API'den gelen asgari yatırım tutarları bazen yanlış bölge değerleriyle döndürülebiliyor:
- **1-2. Bölge illeri** için 7.500.000 TL (3-6. bölge değeri) gelebilir
- **3-6. Bölge illeri** için 15.100.000 TL (1-2. bölge değeri) gelebilir
- Eski değerler (6.000.000 TL, 12.000.000 TL) de hala dönebilir

## Çözüm: Çift Yönlü Değer Düzeltmesi

### Dosya: `supabase/functions/chat-gemini/index.ts`

**Yanlış Değer Pattern'lerini Genişlet:**

```typescript
// Bölgeye göre yanlış değerleri belirle ve düzelt
const wrongValuePatterns = [
  /6\.000\.000\s*TL/g,
  /6,000,000\s*TL/g,
  /12\.000\.000\s*TL/g,
  /12,000,000\s*TL/g,
];

// Eğer 1-2. bölge ise, 7.500.000 TL de yanlış
if (sgkVerifiedInfo?.bolge && sgkVerifiedInfo.bolge <= 2) {
  wrongValuePatterns.push(/7\.500\.000\s*TL/g, /7,500,000\s*TL/g);
}

// Eğer 3-6. bölge ise, 15.100.000 TL de yanlış
if (sgkVerifiedInfo?.bolge && sgkVerifiedInfo.bolge >= 3) {
  wrongValuePatterns.push(/15\.100\.000\s*TL/g, /15,100,000\s*TL/g);
}

// Tüm yanlış değerleri doğru değerle değiştir
const correctMin = sgkVerifiedInfo.bolge <= 2 
  ? thresholds.min_investment_region_1_2  // 15.100.000 TL
  : thresholds.min_investment_region_3_6; // 7.500.000 TL

for (const section of updatedResponse.content?.sections || []) {
  if (section.note) {
    for (const pattern of wrongValuePatterns) {
      section.note = section.note.replace(pattern, formatCurrency(correctMin));
    }
  }
}
```

## Uygulama Kapsamı

1. **Province extraction güçlendirme** (önceki plan)
   - Header title'dan il çıkarma
   - User message fallback
   - Türkçe karakter normalize

2. **Çift yönlü değer düzeltme** (bu güncelleme)
   - 1-2. bölge için: 6M, 7.5M, 12M → 15.1M
   - 3-6. bölge için: 6M, 12M, 15.1M → 7.5M

3. **SGK verification bölge bilgisini kullan**
   - `sgkVerifiedInfo.bolge` değerini asgari yatırım hesabında kaynak al

## Test Senaryoları

| İl | Bölge | API Döndürürse | Düzeltilmeli |
|----|-------|----------------|--------------|
| Denizli | 2 | 7.500.000 TL | 15.100.000 TL |
| Erzurum | 4 | 15.100.000 TL | 7.500.000 TL |
| Şanlıurfa | 6 | 12.000.000 TL | 7.500.000 TL |
| İstanbul | 1 | 6.000.000 TL | 15.100.000 TL |


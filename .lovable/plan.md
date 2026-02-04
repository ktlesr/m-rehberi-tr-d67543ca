
# Teknoloji Hamlesi - Tam Destek Paketi Güncellemesi

## Özet

Sektör Sorgulama (Wizard) modülünde Teknoloji Hamlesi seçildiğinde özel kurallar uygulanacak:
1. SGK destek süreleri ve işveren payı oranları
2. Vergi desteği (sabit YKO %50, Vergi İndirim %60)
3. Faiz/Kar Payı veya Makine Desteği seçenekleri

---

## Teknoloji Hamlesi İş Kuralları

### 1. SGK Destek Süreleri

| Bölge | OSB Durumu | SGK Süresi | İşveren Payı |
|-------|------------|------------|--------------|
| 1-5. Bölge | İÇİ/DIŞI | 8 yıl | %50 |
| 4. Bölge İlçe Alt Bölge | OSB Dışı | 8 Yıl | %50 |
| 4. Bölge İlçe Alt Bölge | OSB İÇİ | 12 Yıl | %100 |
| 5. Bölge | OSB İÇİ | 12 Yıl | %100 |
| 6. Bölge | DIŞI | 12 yıl | %100 |
| 6. Bölge | İÇİ | 14 yıl | %100 |

### 2. Vergi Desteği (SABİT)

| Destek | Oran |
|--------|------|
| Yatırıma Katkı Oranı (YKO) | %50 |
| Vergi İndirim Oranı | %60 |

### 3. Faiz/Kar Payı VEYA Makine Desteği (biri tercih edilmeli)

| Destek Türü | Sabit Yatırım Limiti | Üst Limit |
|-------------|----------------------|-----------|
| Faiz/Kar Payı Desteği | TSY'nin **%20**'si | 301.000.000 TL |
| Makine Desteği | TSY'nin **%15**'i | 301.000.000 TL |

---

## Teknik Değişiklikler

### 1. `src/types/incentive.ts` - Interface Güncellemesi

```typescript
export interface IncentiveResult {
  sector: {
    // ... mevcut alanlar
    techInitiativeSupports?: {
      sgk: {
        duration: string;           // "8 yıl", "12 yıl", "14 yıl"
        employerShareRate: number;  // 50 veya 100 (%)
      };
      taxSupport: {
        investmentContributionRate: number;  // 50 (YKO)
        taxReductionRate: number;            // 60 (Vergi İndirim)
      };
      interestSupport: {
        investmentCapPercentage: number;  // 20
        upperLimit: number;               // 301.000.000
      };
      machinerySupport: {
        investmentCapPercentage: number;  // 15 (DÜZELTİLDİ)
        upperLimit: number;               // 301.000.000
      };
    };
  };
  // ...
}
```

### 2. `src/components/steps/IncentiveResultsStep.tsx` - Hesaplama Mantığı

#### SGK Hesaplama Fonksiyonu

```typescript
const calculateTechInitiativeSgk = (
  region: number, 
  altBolge: number | null, 
  osbStatus: "İÇİ" | "DIŞI",
  specialProgram: SpecialProgramEligibility | null
): { duration: string; employerShareRate: number } => {
  const isOsbInside = osbStatus === "İÇİ";
  
  // 6. Bölge veya special program (deprem/cazibe)
  if (region === 6 || specialProgram?.isEligible) {
    return {
      duration: isOsbInside ? "14 yıl" : "12 yıl",
      employerShareRate: 100
    };
  }
  
  // 5. Bölge OSB İÇİ
  if (region === 5 && isOsbInside) {
    return { duration: "12 yıl", employerShareRate: 100 };
  }
  
  // 4. Bölge İlçe Alt Bölge OSB İÇİ
  if (region === 4 && altBolge && altBolge >= 6 && isOsbInside) {
    return { duration: "12 yıl", employerShareRate: 100 };
  }
  
  // 1-5. Bölge (varsayılan)
  return { duration: "8 yıl", employerShareRate: 50 };
};
```

#### calculateIncentives fonksiyonunda güncelleme

```typescript
if (investmentStatus.isTechInitiative) {
  const altBolgeNum = altBolge ? parseInt(altBolge.replace(/\D/g, '')) : null;
  const techSgk = calculateTechInitiativeSgk(effectiveRegion, altBolgeNum, queryData.osbStatus, specialProgram);
  
  // SGK süresini override et
  sgkDuration = techSgk.duration;
  
  // Tüm Teknoloji Hamlesi desteklerini ekle
  result.sector.techInitiativeSupports = {
    sgk: techSgk,
    taxSupport: {
      investmentContributionRate: 50,  // SABİT YKO
      taxReductionRate: 60,            // SABİT Vergi İndirim
    },
    interestSupport: {
      investmentCapPercentage: 20,     // Faiz: %20
      upperLimit: 301000000,
    },
    machinerySupport: {
      investmentCapPercentage: 15,     // Makine: %15 (DÜZELTİLDİ)
      upperLimit: 301000000,
    },
  };
}
```

### 3. UI Gösterimi - Yeni Teknoloji Hamlesi Kartı

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🚀 Teknoloji Hamlesi Destekleri                                 │
├─────────────────────────────────────────────────────────────────┤
│ SGK Destek Süresi        8 yıl (İşveren Payı %50)               │
│ Yatırıma Katkı Oranı     %50                                    │
│ Vergi İndirim Oranı      %60                                    │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ Aşağıdaki desteklerden SADECE BİRİ tercih edilebilir:        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 💰 Faiz/Kar Payı Desteği    │ │ ⚙️ Makine Desteği           │ │
│ │ TSY Limiti: %20             │ │ TSY Limiti: %15             │ │
│ │ Üst Limit: 301.000.000 TL   │ │ Üst Limit: 301.000.000 TL   │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4. `src/components/IncentiveReportPDF.tsx` - PDF Rapor

```text
┌─────────────────────────────────────────────────────────────────┐
│ TEKNOLOJİ HAMLESİ DESTEKLERİ                                    │
├─────────────────────────────────────────────────────────────────┤
│ SGK Destek Süresi             8 yıl (İşveren Payı %50)          │
│ Yatırıma Katkı Oranı          %50                               │
│ Vergi İndirim Oranı           %60                               │
│                                                                 │
│ ▸ Faiz/Kar Payı Desteği                                         │
│   Sabit Yatırım Limiti        TSY'nin %20'si                    │
│   Üst Limit                   301.000.000 TL                    │
│                                                                 │
│ ▸ Makine Desteği                                                │
│   Sabit Yatırım Limiti        TSY'nin %15'i                     │
│   Üst Limit                   301.000.000 TL                    │
│                                                                 │
│ ⚠️ Not: Bu desteklerden yalnızca biri tercih edilebilir.        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|------------|
| `src/types/incentive.ts` | `techInitiativeSupports` interface (SGK + Vergi + Faiz/Makine) |
| `src/components/steps/IncentiveResultsStep.tsx` | `calculateTechInitiativeSgk` + sabit vergi değerleri + yeni UI kartı |
| `src/components/IncentiveReportPDF.tsx` | Teknoloji Hamlesi destekleri bölümü |

---

## Önemli Notlar

1. **Mevcut işlevsellik korunacak**: Teknoloji Hamlesi olmayan yatırımlar için mevcut mantık değişmeyecek

2. **Sabit değerler**: 
   - YKO %50, Vergi İndirim %60 (tüm bölgeler için aynı)
   - Faiz Desteği: TSY'nin %20'si, max 301M TL
   - Makine Desteği: TSY'nin %15'i, max 301M TL

3. **Koşullu gösterim**: Teknoloji Hamlesi kartı sadece `isTechInitiative === true` olduğunda gösterilecek

4. **Üst limit değerleri**: `investment_thresholds` tablosundan dinamik olarak çekilecek

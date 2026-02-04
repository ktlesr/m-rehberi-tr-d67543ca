
# Dropdown'da Çift Satır (NACE + GTİP) Gösterimi Planı

## İstenen Davranış

Referans görsele göre, `is_hamle = true` ve `gtip` bulunan sektörler için dropdown'da **iki ayrı satır** gösterilecek:

| Satır Tipi | Gösterim | Seçim Sonucu |
|------------|----------|--------------|
| **Sektör Satırı** | Sektör adı + NACE kodu | Diğer badge'ler (Hedef, Öncelikli, vs.) |
| **GTİP Satırı** | GTİP açıklaması + GTİP badge (turuncu) + NACE kodu | Teknoloji Hamlesi badge'i |

---

## Veri Dönüşümü Mantığı

Veritabanından gelen her satır için:

```text
is_hamle = true VE gtip != null ise:
  → 2 satır oluştur:
     1. { ...orijinal, displayType: 'sector', showAsHamle: false }
     2. { ...orijinal, displayType: 'gtip', showAsHamle: true }
     
Aksi halde:
  → 1 satır: { ...orijinal, displayType: 'sector', showAsHamle: false }
```

---

## Dosya Değişiklikleri

### 1. `src/hooks/useSectorSuggestions.ts`

Yeni interface ekle:
```typescript
export interface DisplayableSuggestion extends SectorSearchData {
  displayType: 'sector' | 'gtip';  // Satır tipi
  showAsHamle: boolean;             // Seçildiğinde Tek.Hamlesi badge'i göster
  displayText: string;              // Gösterilecek metin
}
```

`fetchSuggestions` fonksiyonunda veriyi dönüştür:
```typescript
// Veritabanından gelen data'yı genişlet
const expandedSuggestions: DisplayableSuggestion[] = [];

data.forEach(item => {
  // Her zaman sektör satırı ekle
  expandedSuggestions.push({
    ...item,
    displayType: 'sector',
    showAsHamle: false,
    displayText: item.sektor
  });
  
  // is_hamle ve gtip varsa GTİP satırı da ekle
  if (item.is_hamle && item.gtip && item.gtip_aciklamasi) {
    expandedSuggestions.push({
      ...item,
      displayType: 'gtip',
      showAsHamle: true,
      displayText: item.gtip_aciklamasi
    });
  }
});
```

---

### 2. `src/components/steps/SectorSearchStep.tsx`

#### Dropdown Render Güncelleme

GTİP satırları için farklı UI:

```text
Sektör Satırı:
┌─────────────────────────────────────────────────┬─────────┐
│ Bilgisayar ve bilgisayar çevre birimleri imalatı│  26.20  │
└─────────────────────────────────────────────────┴─────────┘

GTİP Satırı:
┌─────────────────────────────────────────────────┬──────────────────┬─────────┐
│ Baskı, kopyalama veya faks fonksiyonlarının...  │ 844331000000 🟠 │  26.20  │
└─────────────────────────────────────────────────┴──────────────────┴─────────┘
```

GTİP badge'i turuncu renkte (`bg-orange-100 text-orange-700 border-orange-300`)

#### Seçim Sonrası State

`handleSuggestionSelect` fonksiyonunda `showAsHamle` bilgisini kaydet:

```typescript
const handleSuggestionSelect = (suggestion: DisplayableSuggestion) => {
  // showAsHamle true ise -> Teknoloji Hamlesi olarak işaretle
  // showAsHamle false ise -> Diğer badge'ler
  onSectorSelect({
    ...suggestion,
    // Seçim tipine göre is_hamle override
    _selectedAsHamle: suggestion.showAsHamle
  });
};
```

---

### 3. `src/types/database.ts`

`SectorSearchData` interface'ine opsiyonel alan ekle:

```typescript
export interface SectorSearchData {
  // ... mevcut alanlar
  _selectedAsHamle?: boolean;  // UI seçim flag'i (veritabanında yok)
}
```

---

### 4. `src/utils/investmentStatusHelper.ts`

`determineInvestmentStatus` fonksiyonunda `_selectedAsHamle` kontrol et:

```typescript
export const determineInvestmentStatus = (sectorData: SectorDataForStatus) => {
  // Öncelik 1: Kullanıcı GTİP satırını seçtiyse Teknoloji Hamlesi
  if (sectorData._selectedAsHamle === true) {
    return 'teknoloji_hamlesi';
  }
  
  // Öncelik 2: Kullanıcı normal satırı seçtiyse -> is_hamle'yi ignore et
  if (sectorData._selectedAsHamle === false && sectorData.is_hamle) {
    // Teknoloji Hamlesi'ni atla, diğer badge'lere bak
    // ... mevcut hiyerarşi devam eder (yuksek_tek, orta_yuksek, oncelikli, hedef)
  }
  
  // ... mevcut mantık
};
```

---

## Görsel Özet

```text
Arama: "26.20"

Dropdown:
┌────────────────────────────────────────────────────────────────────────────┐
│ Sektörler (4 sonuç)                                                        │
├────────────────────────────────────────────────────────────────────────────┤
│ Bilgisayar ve bilgisayar çevre birimleri imalatı              │   26.20   ││
├────────────────────────────────────────────────────────────────────────────┤
│ Baskı, kopyalama veya faks fonksiyonlarının iki...  │844331000000│  26.20  ││
│                                                      (turuncu)             │
├────────────────────────────────────────────────────────────────────────────┤
│ Bilgisayar ve bilgisayar çevre birimleri imalatı              │  26.20.01 ││
├────────────────────────────────────────────────────────────────────────────┤
│ Baskı, kopyalama veya faks fonksiyonlarının iki...  │844331000000│ 26.20.01││
│                                                      (turuncu)             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Değişiklik Listesi

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/useSectorSuggestions.ts` | Yeni interface + veri dönüşümü |
| `src/components/steps/SectorSearchStep.tsx` | Dropdown UI + seçim mantığı |
| `src/types/database.ts` | `_selectedAsHamle` opsiyonel alan |
| `src/utils/investmentStatusHelper.ts` | `_selectedAsHamle` kontrolü |
| `src/components/steps/IncentiveResultsStep.tsx` | `_selectedAsHamle` prop geçişi |

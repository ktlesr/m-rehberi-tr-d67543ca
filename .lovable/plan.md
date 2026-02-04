
# GTİP Bilgisini PDF Raporuna Ekleme Planı

## Mevcut Durum

Kullanıcı dropdown'dan GTİP satırını seçtiğinde:
- UI'da GTİP açıklaması ve "Teknoloji Hamlesi" badge'i doğru gösteriliyor
- Ancak PDF raporu hâlâ NACE sektör adını kullanıyor
- GTİP kodu PDF'te hiç gösterilmiyor

## Yapılacak Değişiklikler

### 1. `src/types/incentive.ts` - IncentiveResult Interface'i Güncelleme

`sector` objesine yeni alanlar eklenmeli:

```typescript
sector: {
  nace_code: string;
  name: string;           // Sektör veya GTİP açıklaması
  gtip?: string;          // YENİ: GTİP kodu (varsa)
  gtip_aciklamasi?: string; // YENİ: GTİP açıklaması (varsa)
  selectedAsHamle?: boolean; // YENİ: GTİP satırı mı seçildi?
  // ... mevcut alanlar
}
```

### 2. `src/components/steps/IncentiveResultsStep.tsx` - Veri Aktarımı

`calculateIncentives` fonksiyonunda `IncentiveResult` oluşturulurken:

```typescript
const result: IncentiveResult = {
  sector: {
    nace_code: queryData.selectedSector.nace_kodu,
    // GTİP seçildiyse GTİP açıklaması, değilse sektör adı
    name: queryData.selectedSector._selectedAsHamle && queryData.selectedSector.gtip_aciklamasi
      ? queryData.selectedSector.gtip_aciklamasi
      : queryData.selectedSector.sektor,
    gtip: queryData.selectedSector.gtip || undefined,
    gtip_aciklamasi: queryData.selectedSector.gtip_aciklamasi || undefined,
    selectedAsHamle: queryData.selectedSector._selectedAsHamle,
    // ... mevcut alanlar
  },
  // ...
};
```

### 3. `src/components/IncentiveReportPDF.tsx` - PDF Render Güncelleme

#### Yatırım Künyesi bölümünde (satır 418 civarı):

Sektör adı gösterimi:
```tsx
<Text style={styles.sectorName}>
  {incentiveResult.sector.name}
</Text>
```

GTİP kodu badge'i eklenmeli (NACE kodu yanına):
```tsx
<View style={styles.kunyeRow}>
  <Text style={styles.kunyeLabel}>NACE Kodu</Text>
  <View style={{ flexDirection: 'row', gap: 4 }}>
    <Text style={[styles.badge, { backgroundColor: colors.badgeBlue }]}>
      {incentiveResult.sector.nace_code}
    </Text>
    {incentiveResult.sector.gtip && incentiveResult.sector.selectedAsHamle && (
      <Text style={[styles.badge, { backgroundColor: colors.badgeOrange }]}>
        GTİP: {incentiveResult.sector.gtip}
      </Text>
    )}
  </View>
</View>
```

#### Teknoloji Hamlesi bilgi kutusunda (satır 578-589 civarı):

GTİP bilgisi badge olarak eklenmeli:
```tsx
{isTechInitiative && (
  <View style={styles.infoBoxBadgeRow}>
    <View style={[styles.infoBoxBadge, { backgroundColor: "#ffebee", borderColor: "#f44336" }]}>
      <Text style={[styles.infoBoxBadgeText, { color: "#f44336" }]}>Teknoloji Hamlesi</Text>
      <Text style={[styles.infoBoxBadgeValue, { color: "#f44336" }]}>EVET</Text>
    </View>
    {incentiveResult.sector.gtip && (
      <View style={[styles.infoBoxBadge, { backgroundColor: "#fff3e0", borderColor: "#ff9800" }]}>
        <Text style={[styles.infoBoxBadgeText, { color: "#f57c00" }]}>GTİP Kodu</Text>
        <Text style={[styles.infoBoxBadgeValue, { color: "#f57c00" }]}>
          {incentiveResult.sector.gtip}
        </Text>
      </View>
    )}
    {/* ... mevcut Yatırım Statüsü badge'i */}
  </View>
)}
```

---

## PDF Görsel Önizleme

### GTİP Seçilmeden (Hedef Yatırım):

```text
┌────────────────────────────────────────────────────────────┐
│ YATIRIM KÜNYESİ                                            │
├────────────────────────────────────────────────────────────┤
│ İğne, çengelli iğne, çuvaldız, tığ, nakış iğnesi, şiş...   │
│                                                            │
│ NACE Kodu    [25.73]                                       │
│ Lokasyon     Denizli / Merkezefendi                        │
└────────────────────────────────────────────────────────────┘
```

### GTİP Seçildiğinde (Teknoloji Hamlesi):

```text
┌────────────────────────────────────────────────────────────┐
│ YATIRIM KÜNYESİ                                            │
├────────────────────────────────────────────────────────────┤
│ Baskı, kopyalama veya faks fonksiyonlarının iki veya...    │
│                                                            │
│ NACE Kodu    [26.20] [GTİP: 844331000000] (turuncu)        │
│ Lokasyon     Denizli / Merkezefendi                        │
├────────────────────────────────────────────────────────────┤
│ [Teknoloji Hamlesi: EVET] [GTİP: 844331000000] [ÖNCELİKLİ] │
└────────────────────────────────────────────────────────────┘
```

---

## Teknik Özet

| Dosya | Değişiklik |
|-------|------------|
| `src/types/incentive.ts` | `sector` objesine `gtip`, `gtip_aciklamasi`, `selectedAsHamle` ekleme |
| `src/components/steps/IncentiveResultsStep.tsx` | `calculateIncentives`'da GTİP verilerini `IncentiveResult`'a aktarma |
| `src/components/IncentiveReportPDF.tsx` | GTİP badge'i ve koşullu sektör adı gösterimi |

## Önemli Not

Bu değişiklik mevcut PDF tasarımını bozmaz:
- GTİP seçilmediyse → Mevcut davranış (sektör adı + NACE kodu)
- GTİP seçildiyse → GTİP açıklaması + hem NACE hem GTİP kodu badge'leri

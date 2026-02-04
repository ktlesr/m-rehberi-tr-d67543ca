
# PDF Raporu Kompaktlaştırma ve Karakter Sorunu Düzeltme

## Sorunlar

### 1. İkinci Sayfaya Taşma
Teknoloji Hamlesi bölümü eklendikten sonra PDF içeriği bir sayfaya sığmıyor.

### 2. Başlık Karakter Sorunu
"TEKNOLOJİ HAMLESİ DESTEKLERİ" başlığındaki "T" harfi garip görünüyor - bunun sebebi emoji (🚀) karakterinin Roboto fontu ile uyumsuzluğu.

---

## Çözüm

### 1. Emoji Kaldırma
Roboto fontu emoji karakterlerini düzgün render edemiyor. Emoji yerine metin kullanacağız:
- `🚀 TEKNOLOJİ HAMLESİ DESTEKLERİ` → `TEKNOLOJİ HAMLESİ DESTEKLERİ`
- `💰 Faiz/Kar Payı Desteği` → `Faiz/Kar Payı Desteği`  
- `⚙️ Makine Desteği` → `Makine Desteği`
- `⚠️ Aşağıdaki desteklerden...` → Emoji'siz metin

### 2. Satır Yüksekliği ve Padding Azaltma
Kompaktlaştırma için:

| Stil | Mevcut | Yeni |
|------|--------|------|
| `kunyeRow.marginBottom` | 8 | 5 |
| `kunyeRow.paddingBottom` | 6 | 4 |
| `sectionTitle.paddingVertical` | 6 | 4 |
| `sectionTitle.marginTop` | 16 | 10 |
| `sectionTitle.marginBottom` | 10 | 6 |
| `destekCard.padding` | 12 | 8 |
| `destekRow.marginBottom` | 6 | 4 |
| `techHamleContainer.marginTop` | 16 | 10 |
| `techHamleContainer.padding` | 12 | 8 |
| `techHamleGrid.marginBottom` | 10 | 6 |
| `techHamleWarning.padding` | 8 | 5 |
| `techHamleWarning.marginTop/marginBottom` | 10 | 6 |
| `techHamleSupportCard.padding` | 10 | 6 |
| `infoBox.marginTop` | 16 | 10 |
| `infoBox.padding` | 12 | 8 |

### 3. Font Boyutları (Hafif Azaltma)
| Stil | Mevcut | Yeni |
|------|--------|------|
| `sectorName.fontSize` | 11 | 10 |
| `sectorName.marginBottom` | 10 | 6 |
| `destekCardTitle.marginBottom` | 10 | 6 |
| `techHamleTitle.marginBottom` | 10 | 6 |

---

## Değişiklik Yapılacak Dosya

**`src/components/IncentiveReportPDF.tsx`**

1. **Satır 658**: Emoji kaldır
2. **Satır 684-686**: Uyarı emoji kaldır
3. **Satır 693**: Faiz emoji kaldır
4. **Satır 710**: Makine emoji kaldır
5. **Stiller**: Yukarıdaki tabloya göre padding/margin değerlerini azalt

---

## Beklenen Sonuç

- PDF tek sayfaya sığacak
- "Teknoloji Hamlesi" başlığı düzgün görünecek (garip karakter sorunu çözülecek)
- Mevcut okunabilirlik korunacak

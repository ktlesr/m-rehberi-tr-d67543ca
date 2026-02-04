
# Teknoloji Hamlesi Renk Değişikliği

## Mevcut Durum
Teknoloji Hamlesi bölümü pembe/mor renk şemasıyla görüntüleniyor:
- Arka plan: `#f3e5f5` (lavanta)
- Kenarlık: `#9c27b0` (mor)
- Metin rengi: `#7b1fa2` (koyu mor)

## Hedef
Raporun genel bütünlüğüyle uyumlu açık mavi renk şemasına geçiş.

## Yeni Renk Şeması

| Öğe | Mevcut (Mor) | Yeni (Mavi) |
|-----|--------------|-------------|
| Container arka plan | `#f3e5f5` | `#e3f2fd` |
| Container kenarlık | `#9c27b0` | `#1976d2` |
| Başlık/değer rengi | `#7b1fa2` | `#0011B3` (primary) |
| Alt kart kenarlığı | `#e1bee7` | `#90caf9` |

## Değişiklik Yapılacak Stiller

```typescript
// src/components/IncentiveReportPDF.tsx

techHamleContainer: {
  backgroundColor: "#e3f2fd",    // Açık mavi (önceden #f3e5f5)
  borderColor: "#1976d2",         // Mavi kenarlık (önceden #9c27b0)
},
techHamleTitle: {
  color: "#0011B3",               // Primary mavi (önceden #7b1fa2)
},
techHamleValue: {
  color: "#0011B3",               // Primary mavi (önceden #7b1fa2)
},
techHamleSupportCard: {
  borderColor: "#90caf9",         // Açık mavi kenarlık (önceden #e1bee7)
},
techHamleSupportTitle: {
  color: "#1976d2",               // Mavi başlık (önceden #7b1fa2)
},
```

## Beklenen Sonuç

Teknoloji Hamlesi kartı rapordaki diğer bölümlerle (Destekler, Yatırım Künyesi) aynı mavi tonlarında görünecek, görsel bütünlük sağlanacak.

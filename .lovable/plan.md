
# GTİP Seçiminde Açıklama Düzeltmesi

## Sorun

Dropdown'dan GTİP satırı seçildiğinde, seçilen sektör kartında hâlâ NACE sektör adı gösteriliyor:

| Mevcut Durum | Beklenen Durum |
|--------------|----------------|
| "İğne, çengelli iğne, çuvaldız..." (NACE açıklaması) | GTİP açıklaması gösterilmeli |

## Çözüm

`SectorSearchStep.tsx` dosyasındaki seçili sektör kartı, `_selectedAsHamle` flag'ine göre farklı başlık gösterecek şekilde güncellenecek.

## Teknik Değişiklik

**Dosya**: `src/components/steps/SectorSearchStep.tsx`

**Satır 471** değişecek:

```text
// MEVCUT:
<h4 className="...">{selectedSector.sektor}</h4>

// YENİ:
<h4 className="...">
  {selectedSector._selectedAsHamle && selectedSector.gtip_aciklamasi 
    ? selectedSector.gtip_aciklamasi 
    : selectedSector.sektor}
</h4>
```

## Beklenen Sonuç

| Seçim Tipi | Kart Başlığı | Badge'ler |
|------------|--------------|-----------|
| **Sektör satırı** | NACE sektör adı | Hedef/Öncelikli/Yüksek Tek. vb. |
| **GTİP satırı** | GTİP açıklaması | Teknoloji Hamlesi + GTİP kodu |

## Etkilenen Dosya

| Dosya | Değişiklik |
|-------|------------|
| `src/components/steps/SectorSearchStep.tsx` | Satır 471'de koşullu başlık render'ı |

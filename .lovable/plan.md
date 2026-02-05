
# GTİP Açıklaması Üzerinden Arama Desteği

## Mevcut Durum

Şu an sektör arama mantığı:
1. **Sayı içeriyorsa** → `nace_kodu` alanında arama
2. **Sayı içermiyorsa** → `sektor` alanında arama

GTİP açıklaması (örn: "Pektik maddeler", "Eldivenler, tek parmaklı eldivenler") şu an arama kapsamında değil.

## Hedef

"Pektin" veya "eldiven" gibi arama yapıldığında hem `sektor` hem de `gtip_aciklamasi` alanlarında eşleşen sonuçları getirmek.

---

## Teknik Değişiklikler

### 1. `src/hooks/useSectorSuggestions.ts` - Suggestions Hook

**Mevcut sorgu (metin araması):**
```typescript
.ilike("sektor", `%${rawInput.toLowerCase()}%`)
```

**Yeni sorgu (metin araması):**
```typescript
.or(`sektor.ilike.%${rawInput.toLowerCase()}%,gtip_aciklamasi.ilike.%${rawInput.toLowerCase()}%`)
```

### 2. `src/components/steps/SectorSearchStep.tsx` - Manual Search

**Mevcut sorgu (metin araması):**
```typescript
.ilike("sektor", `%${rawInput.toLowerCase()}%`)
```

**Yeni sorgu (metin araması):**
```typescript
.or(`sektor.ilike.%${rawInput.toLowerCase()}%,gtip_aciklamasi.ilike.%${rawInput.toLowerCase()}%`)
```

---

## Değişiklik Özeti

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/useSectorSuggestions.ts` | Metin aramasında `gtip_aciklamasi` alanını `.or()` ile dahil et |
| `src/components/steps/SectorSearchStep.tsx` | Manuel aramada `gtip_aciklamasi` alanını `.or()` ile dahil et |

---

## Beklenen Davranış

| Arama Terimi | Mevcut Sonuç | Yeni Sonuç |
|--------------|--------------|------------|
| "pektin" | Sonuç yok | Maya ve kabartma tozu imalatı, Bitki özsu ve ekstreleri... |
| "eldiven" | Sonuç yok | Giyim eşyası imalatı, Bebek giyim eşyası imalatı... |
| "10.89" | NACE ile eşleşenler | Aynı (değişiklik yok) |
| "tekstil" | Sektor ile eşleşenler | Aynı + GTİP açıklamasında "tekstil" geçenler |

---

## Önemli Notlar

1. **NACE kodu araması değişmeyecek**: Sayı içeren aramalar yalnızca `nace_kodu` alanında aranmaya devam edecek
2. **Mevcut işlevsellik korunacak**: Sektör adı araması hâlâ çalışacak, ek olarak GTİP açıklaması da taranacak
3. **Performans**: `.or()` ile tek sorgu kullanıldığı için ek veritabanı çağrısı yok

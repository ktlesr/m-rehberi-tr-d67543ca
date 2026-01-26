
# İŞKUR Destekleri - Site İçi Program Kartlarıyla Entegre Yanıt Planı

## Problem Analizi

Ekran görüntüsünden görülen sorun:
1. Kullanıcı "İşkur destekleri" soruyor
2. AI yanıtı: "Sağlanan kaynaklarda İŞKUR destekleri hakkında bilgi bulunmamaktadır..." (uzun bir açıklama)
3. **Ama hemen altında İŞKUR destek kartı gösteriliyor!**

Bu tutarsız bir kullanıcı deneyimi. AI "bilgi yok" diyor ama aslında site içinde (support_programs tablosunda) İŞKUR destek programı mevcut.

---

## Teknik Sorunun Kökeni

`chat-gemini/index.ts` satır 3232'de:

```typescript
if (!noResultsInVertex && vertexText.length > 100) {
  // Case 1: Vertex has good content
  ...
}
```

**Problem**: Vertex RAG'dan gelen "kaynaklarda bulunmamaktadır" açıklaması 100 karakterden uzun olduğu için `isNoResultsFoundResponse` TRUE döndürse bile, metin zaten "no results" pattern'ine uyuyor ama uzunluk koşulu nedeniyle Case 1'e girmiyor olabilir - veya pattern tam uymuyor.

Ayrıca, mevcut `isNoResultsFoundResponse` pattern'lerinden biri:
```typescript
/destekleri hakkında bilgi bulunmamaktadır/i
```
Bu "İŞKUR destekleri hakkında bilgi bulunmamaktadır" metnini yakalamalı.

**Asıl çözüm**: Support cards bulunduğunda VE Vertex RAG "bulunamadı" mesajı döndürdüğünde, AI yanıtını tamamen değiştirmeli:
> "yatirimadestek.gov.tr'de yayımda olan İŞKUR destekleri aşağıdaki gibidir"

---

## Çözüm Planı

### Adım 1: chat-gemini/index.ts - Yeni Kontrol Mantığı

Satır 3178-3232 arasına, Case 1'den ÖNCE yeni bir kontrol ekleyeceğiz:

```typescript
// ============= NEW: SUPPORT PROGRAMS OVERRIDE FOR "NO RAG RESULTS" =============
// Eğer Vertex RAG "bulunamadı" yanıtı döndürdüyse AMA support_programs'dan kartlar bulunduysa,
// Vertex yanıtını GÖSTERMEYİP sadece site içi destekleri göster
if (noResultsInVertex && rerankedResult.supportCards.length > 0) {
  console.log("🔄 [Enhanced Hybrid] RAG has no results but support cards found - overriding response");
  
  // Kurum adını tespit et (varsa)
  const institutionName = rerankedResult.supportCards[0]?.kurum || null;
  const institutionText = institutionName 
    ? `**${institutionName}** tarafından sağlanan` 
    : '';
  
  const overrideText = institutionName
    ? `📋 **yatirimadestek.gov.tr'de yayımda olan ${institutionText} destekler aşağıdaki gibidir:**`
    : `📋 **yatirimadestek.gov.tr'de yayımda olan ilgili destekler aşağıdaki gibidir:**`;
  
  // Cache ve analytics kaydet
  finishWithCacheAndAnalytics(
    overrideText,
    "support_override_no_rag",
    rerankedResult.supportCards,
    []
  );
  
  return new Response(
    JSON.stringify({
      text: overrideText,
      supportCards: rerankedResult.supportCards,
      supportOnly: true,
      sources: [],
      groundingChunks: [],
      hybridSearch: {
        ragNoResults: true,
        supportOverride: true,
        supportPrograms: rerankedResult.supportCards.length,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
```

### Adım 2: Mevcut Case 3 Güncelleme (Satır 3297-3315)

Case 3'teki mesajı da güncelle:

```typescript
// Case 3: Both Vertex and QV have no content, but support cards exist
if (rerankedResult.supportCards.length > 0) {
  console.log("📋 [Enhanced Hybrid] No RAG content, showing support programs");
  
  // Kurum adını tespit et
  const institutionName = rerankedResult.supportCards[0]?.kurum || null;
  const displayText = institutionName
    ? `📋 **yatirimadestek.gov.tr'de yayımda olan ${institutionName} destekleri aşağıdaki gibidir:**`
    : `📋 **yatirimadestek.gov.tr'de yayımda olan ilgili destek programları aşağıdaki gibidir:**`;
  
  return new Response(
    JSON.stringify({
      text: displayText,
      supportCards: rerankedResult.supportCards,
      supportOnly: true,
      sources: [],
      groundingChunks: [],
      ...
    }),
    ...
  );
}
```

### Adım 3: isSupportProgramQuery'ye İŞKUR Ekle (Zaten Var Olabilir)

Kontrol edelim - eğer yoksa ekleyelim:

```typescript
const keywords = [
  // ... mevcut keywords
  "işkur",
  "iskur",
  "iş kurumu",
  "is kurumu",
  // ... diğer kurumlar
];
```

---

## Özet Değişiklikler

| Dosya | Satır | Değişiklik |
|-------|-------|------------|
| `supabase/functions/chat-gemini/index.ts` | ~3178 | Yeni "Support Override" kontrolü ekle (Case 1'den önce) |
| `supabase/functions/chat-gemini/index.ts` | ~3302 | Case 3 mesajını güncelle |
| `supabase/functions/chat-gemini/index.ts` | ~977-1027 | `isSupportProgramQuery` keywords'e kurum adları ekle (gerekirse) |

---

## Beklenen Sonuç

### Önce (Şu An)
- AI: "Sağlanan kaynaklarda İŞKUR destekleri hakkında bilgi bulunmamaktadır..."
- [İŞKUR destek kartı gösteriliyor]

### Sonra (Düzeltme İle)
- AI: "📋 **yatirimadestek.gov.tr'de yayımda olan İŞKUR (TÜRKİYE İŞ KURUMU) destekleri aşağıdaki gibidir:**"
- [İŞKUR destek kartı gösteriliyor]

Bu değişiklik:
- Kullanıcıya tutarlı bir deneyim sunar
- Site içindeki desteklerin varlığını vurgular
- "Bulunamadı" mesajı göstermez (aslında bulunduğunda)
- yatirimadestek.gov.tr markasını öne çıkarır

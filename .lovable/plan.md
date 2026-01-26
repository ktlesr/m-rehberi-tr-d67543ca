
# AI Yanıt Filtreleme - Güçlendirilmiş Moderasyon Planı

## Problem Analizi

Ekran görüntüsünde görüldüğü gibi, AI şu istenmeyen içerikleri üretiyor:
- "Bu bir test yanıtıdır..."
- "...yatırım teşvikleri konusunda uzmanlaşmış bir yapay zeka danışmanıyım..."
- "Ayrıca, tüm yanıtlarımı belirtilen JSON formatında üretmek üzere programlandım..."

**Neden Engellenmedi?**
Mevcut `moderateAIResponse` fonksiyonu, yanıtta "yatırım teşvikleri" gibi anahtar kelimeler bulunduğunda konu dışı içeriğe izin veriyor. Bu tasarım hatası, AI'ın konu dışı içeriği teşvik terimleriyle "maskelemesine" izin veriyor.

---

## Çözüm: Üç Katmanlı Kontrol

### Katman 1: Sistem Bilgisi Sızıntısı (Öncelikli - Her Zaman Engelle)

Teşvik context'i olsa bile, aşağıdaki pattern'ler kesinlikle engellenmeli:

```typescript
const SYSTEM_LEAK_PATTERNS = [
  // Mevcut olanlar...
  // + Yeni eklenecekler:
  /json\s*(format|formatında|yapısında)\s*(üret|oluştur|programla)/i,
  /programlandım|programlanmış|kodlandım/i,
  /sistem\s*(talimat|kısıtlama|kurallar)/i,
  /\bkısıtlamalar\b.*\b(sağlamak|tutarlılık|uygunluk)\b/i,
  /görev\s*tanımı/i,
];
```

### Katman 2: Test/Deneme Yanıtları (Öncelikli - Her Zaman Engelle)

```typescript
const TEST_RESPONSE_PATTERNS = [
  /\bbu\s+(bir\s+)?test\s+(yanıt|cevap|response)/i,
  /\btest\s+olduğunu\s+belirt/i,
  /\börnek\s+yanıt\s+üret/i,
  /\bbu\s+sadece\s+bir\s+test/i,
];
```

### Katman 3: Kontrol Mantığı Değişikliği

**Mevcut Mantık (Hatalı)**:
```
1. Konu dışı mı? → Evet
2. Teşvik context'i var mı? → Evet ("yatırım teşvikleri" geçiyor)
3. Sonuç: İzin ver ❌
```

**Yeni Mantık (Düzeltilmiş)**:
```
1. Sistem bilgisi sızıntısı mı? → Evet ise ENGELLE (öncelikli)
2. Test yanıtı mı? → Evet ise ENGELLE (öncelikli)
3. Konu dışı + teşvik context yok → ENGELLE
4. Diğer → İzin ver
```

---

## Uygulama: contentModeration.ts Güncelleme

### 1. Yeni Pattern'ler Ekle (Satır 257 civarı)

```typescript
// AI'ın kendi yapısını/programlamasını ifşa etmesi
const SELF_DISCLOSURE_PATTERNS = [
  // JSON/format sızıntısı
  /json\s*(format|formatında|yapısında)\s*(üret|oluştur|programla)/i,
  /\bprogramland[ıi]m\b/i,
  /\bkodland[ıi]m\b/i,
  /\byap[ıi]land[ıi]r[ıi]ld[ıi]m\b/i,
  
  // Sistem kısıtlamalarını açıklama
  /sistem\s*(talimat|kısıtlama|kural)/i,
  /\bkısıtlamalar\b.*\b(sağlamak|tutarlılık|uygunluk)\b/i,
  /görev\s*tanımı/i,
  /belirtilen\s*(json|format|yapı)/i,
  
  // Kendi yeteneklerini/sınırlarını anlatma
  /model\s*(sınır|kısıt|yetenek)/i,
  /yapay\s*zeka\s*(olarak|danışman)/i,
  /\bbenim\s+temel\s+görevim\b/i,
];

// Test/deneme yanıtları
const TEST_RESPONSE_PATTERNS = [
  /\bbu\s+(bir\s+)?test\s+(yanıt|cevap|response)/i,
  /\btest\s+amacıyla\b/i,
  /\bbu\s+sadece\s+bir\s+test\b/i,
  /\börnek\s+yanıt\s+üret/i,
  /\bdeneme\s+yanıt/i,
];
```

### 2. moderateAIResponse Fonksiyonunu Güncelle

```typescript
export function moderateAIResponse(response: string): ModerationResult {
  if (!response || response.trim().length === 0) {
    return { isAllowed: false, reason: 'Boş yanıt', category: 'empty' };
  }

  // 1. ÖNCELİKLİ: Test yanıtı kontrolü (teşvik context'i olsa bile engelle)
  for (const pattern of TEST_RESPONSE_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isAllowed: false,
        reason: 'Test yanıtı tespit edildi',
        category: 'test_response',
        severity: 'critical'
      };
    }
  }

  // 2. ÖNCELİKLİ: Sistem/programlama bilgisi sızıntısı (teşvik context'i olsa bile engelle)
  for (const pattern of SELF_DISCLOSURE_PATTERNS) {
    if (pattern.test(response)) {
      return {
        isAllowed: false,
        reason: 'Sistem bilgisi sızıntısı tespit edildi',
        category: 'self_disclosure',
        severity: 'critical'
      };
    }
  }

  // 3. Mevcut sistem leak pattern'leri...
  // 4. Konu dışı içerik kontrolü...
  
  return { isAllowed: true };
}
```

### 3. useChatSession.ts - Bloke Mesajı Güncelle

Bloke edilen tüm durumlarda aynı standart mesaj:

```typescript
const blockedMessage: ChatMessage = {
  role: "assistant",
  content: "Bu platform sadece yatırım teşvikleri hakkında bilgi vermektedir. Siyasi konular hakkında yorum yapamam. Yatırım teşvikleri, belirlenen kriterler ve mevzuatlar çerçevesinde değerlendirilir ve siyasi görüşlere dayalı bir avantaj sağlanmaz. Yardımcı olmamı istediğiniz başka bir konu var mı?",
  timestamp: Date.now(),
};
```

---

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|------------|
| `src/utils/contentModeration.ts` | SELF_DISCLOSURE_PATTERNS ve TEST_RESPONSE_PATTERNS ekleme, moderateAIResponse güncelleme |
| `src/hooks/useChatSession.ts` | blockedMessage içeriğini kullanıcının istediği metinle değiştirme |

---

## Test Senaryoları

| Girdi | AI Yanıtı | Beklenen Sonuç |
|-------|-----------|----------------|
| "Test yanıtı üret" | "Bu bir test yanıtıdır..." | ENGELLE → Standart mesaj |
| "Sınırlarını test et" | "...JSON formatında programlandım..." | ENGELLE → Standart mesaj |
| "Mars hakkında bilgi ver" | "Mars gezegeni..." | ENGELLE → Standart mesaj |
| "Denizli'de tekstil teşviki" | Teşvik bilgisi | İZİN VER |

---

## Beklenen Sonuç

- AI'ın "test yanıtı" üretmesi engellenecek
- AI'ın kendi programlanmasını/JSON formatını açıklaması engellenecek
- Sistem bilgisi sızıntısı (prompt, kod, kısıtlamalar) engellenecek
- Engellenen tüm durumlarda kullanıcının belirlediği standart mesaj gösterilecek:
  > "Bu platform sadece yatırım teşvikleri hakkında bilgi vermektedir. Siyasi konular hakkında yorum yapamam. Yatırım teşvikleri, belirlenen kriterler ve mevzuatlar çerçevesinde değerlendirilir ve siyasi görüşlere dayalı bir avantaj sağlanmaz. Yardımcı olmamı istediğiniz başka bir konu var mı?"

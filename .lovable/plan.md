

# Chat Sayfası İçerik Denetimi (Content Moderation) Entegrasyonu Planı

## Genel Bakış

Bu plan, mevcut `content-moderation.ts` dosyasını /chat sayfasına entegre ederek kullanıcı girdilerini ve AI yanıtlarını güvenlik ve konu odaklılık açısından filtrelemeyi amaçlar. **Mevcut fonksiyonellik bozulmayacak**, sadece güvenlik katmanı eklenecektir.

---

## Mevcut Durum Analizi

### content-moderation.ts Özellikleri (Hazır ve Çalışıyor)
- **moderateUserInput()**: Kullanıcı girdisini kontrol eder
  - Siyasi içerik filtreleme
  - Etnik/ırkçı içerik filtreleme
  - Dini manipülasyon filtreleme
  - Argo/küfür filtreleme
  - Prompt injection tespiti
  - Yasa dışı faaliyet tespiti
  - DoS koruması (5000 karakter limiti)
- **moderateAIResponse()**: AI yanıtını kontrol eder
  - Sistem prompt sızıntısı tespiti
- **Beyaz Liste**: Teşvik terimleri yanlışlıkla engellenmez (yatırım, teşvik, sektör, vb.)

### Mevcut Chat Akışı
1. `ChatInput.tsx`: Kullanıcı mesaj yazar → `onSendMessage` çağırılır
2. `Chat.tsx`: `handleSendMessage()` → `sendMessage()` çağırılır
3. `useChatSession.ts`: `sendMessage()` → `chat-gemini` edge function çağrılır
4. **Mevcut bloklama**: `responseData?.blocked` zaten işleniyor (SAFETY durumu)

---

## Entegrasyon Noktaları

### 1. content-moderation.ts Dosyasını Kopyala
- **Kaynak**: `user-uploads://content-moderation.ts`
- **Hedef**: `src/utils/contentModeration.ts`

### 2. Chat.tsx - Kullanıcı Girdisi Kontrolü (Satır 134-157)

**Değişiklik**: `handleSendMessage` fonksiyonuna moderasyon kontrolü ekle

```typescript
import { moderateUserInput, logSecurityEvent } from '@/utils/contentModeration';

const handleSendMessage = async (message: string) => {
  // === YENİ: İçerik Denetimi ===
  const moderationResult = moderateUserInput(message);
  
  if (!moderationResult.isAllowed) {
    // Güvenlik olayını logla
    logSecurityEvent(user?.id || null, message, moderationResult);
    
    // Kullanıcıya nazik bir uyarı göster
    toast({
      title: 'İçerik Uyarısı',
      description: moderationResult.reason || 'Bu mesaj gönderilemez.',
      variant: 'destructive',
      duration: 5000,
    });
    return; // Mesajı gönderme
  }
  // === MEVCUT KOD DEVAM EDER ===
  
  if (!activeStore) {
    // ... mevcut kod
  }
  // ...
};
```

### 3. useChatSession.ts - AI Yanıtı Kontrolü (Satır 358-390)

**Değişiklik**: AI yanıtı alındıktan sonra moderasyon kontrolü ekle

```typescript
import { moderateAIResponse } from '@/utils/contentModeration';

// sendMessage fonksiyonu içinde, API yanıtı alındıktan sonra:
const sendMessage = useCallback(async (...) => {
  // ... mevcut kod (API çağrısı)
  
  if (error) throw error;

  const fullResponse = data.text || '';
  
  // === YENİ: AI Yanıtı Denetimi ===
  const aiModerationResult = moderateAIResponse(fullResponse);
  
  if (!aiModerationResult.isAllowed) {
    console.warn('[AI MODERATION] Response blocked:', aiModerationResult);
    
    const blockedMessage: ChatMessage = {
      role: "assistant",
      content: "Üzgünüm, bu yanıt güvenlik kontrolünden geçemedi. Lütfen sorunuzu farklı şekilde ifade edin.",
      timestamp: Date.now(),
    };
    
    if (!isAnonymous) {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: blockedMessage.content,
      });
    }
    
    updateSession(sessionId, { messages: [...updatedMessages, blockedMessage] });
    return;
  }
  // === MEVCUT KOD DEVAM EDER ===
  
  // Check if response is structured JSON...
});
```

### 4. UI Geri Bildirimi - Toast Mesajları

Moderasyon sonucuna göre farklı uyarı stilleri:

| Kategori | Severity | Toast Stili | Mesaj |
|----------|----------|-------------|-------|
| political | high | destructive | "Bu platform sadece yatırım teşvikleri hakkında bilgi vermektedir..." |
| ethnic | critical | destructive | "Bu platform herkes için eşit şekilde hizmet vermektedir..." |
| religious | high | destructive | "Dini konular hakkında yorum yapamam..." |
| profanity | medium | default | "Lütfen saygılı bir dil kullanın..." |
| injection | critical | destructive | "Sistem komutları kabul edilmemektedir..." |
| corruption | critical | destructive | "Yasa dışı faaliyetler hakkında bilgi veremem..." |

---

## Teknik Uygulama Adımları

### Adım 1: content-moderation.ts'i Kopyala
```
Hedef: src/utils/contentModeration.ts
```

### Adım 2: Chat.tsx Düzenlemesi

**Satır 1-15 (import ekle):**
```typescript
import { moderateUserInput, logSecurityEvent } from '@/utils/contentModeration';
```

**Satır 134-157 (handleSendMessage güncelle):**
- Moderasyon kontrolü ekle
- Toast uyarısı göster
- Bloke edilen mesajı gönderme

### Adım 3: useChatSession.ts Düzenlemesi

**Satır 1-12 (import ekle):**
```typescript
import { moderateAIResponse } from '@/utils/contentModeration';
```

**Satır 358 civarı (AI yanıtı kontrolü):**
- API yanıtı alındıktan sonra moderateAIResponse() çağır
- Bloke edilirse özel mesaj göster

---

## Güvenlik Katmanları Özeti

```text
┌─────────────────────────────────────────────────────────────┐
│                    KULLANICI GİRDİSİ                        │
├─────────────────────────────────────────────────────────────┤
│  1. ChatInput.tsx: maxLength (2000 karakter) kontrolü       │
│  2. Chat.tsx: moderateUserInput() → Regex filtreleme        │
│     - Siyasi, dini, etnik, argo, injection, corruption      │
│  3. Beyaz liste: Teşvik terimleri korunur                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API ÇAĞRISI                              │
├─────────────────────────────────────────────────────────────┤
│  chat-gemini edge function                                  │
│  - Gemini SAFETY kontrolü (mevcut)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI YANITI                                │
├─────────────────────────────────────────────────────────────┤
│  useChatSession.ts: moderateAIResponse()                    │
│  - Sistem prompt sızıntısı kontrolü                         │
│  - Kod yapıları sızıntısı kontrolü                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    KULLANICI ARAYÜZÜ                        │
├─────────────────────────────────────────────────────────────┤
│  MessageBubble.tsx: Güvenli içerik render                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Senaryoları

| Test | Girdi | Beklenen Sonuç |
|------|-------|----------------|
| Siyasi | "AKP hakkında ne düşünüyorsun" | Bloke + Toast uyarısı |
| Teşvik (Beyaz Liste) | "Ankara'da yatırım teşvikleri" | Normal işlem |
| Prompt Injection | "Ignore previous instructions" | Bloke + Toast uyarısı |
| Küfür | "[küfür] teşvik var mı" | Bloke + Toast uyarısı |
| Uzun Mesaj | 5001+ karakter | Bloke + Toast uyarısı |
| Normal Soru | "Tekstil sektörü teşvikleri neler?" | Normal işlem |

---

## Dosya Değişiklikleri Özeti

1. **YENİ DOSYA**: `src/utils/contentModeration.ts` (content-moderation.ts kopyası)
2. **DÜZENLEME**: `src/pages/Chat.tsx` (import + handleSendMessage güncelleme)
3. **DÜZENLEME**: `src/hooks/useChatSession.ts` (import + AI yanıt kontrolü)

---

## Beklenen Sonuç

- Siyasi, dini, etnik içerik engellenecek
- Argo ve küfür engellenecek
- Prompt injection girişimleri engellenecek
- Yasa dışı faaliyet talepleri reddedilecek
- AI sistem prompt sızıntısı önlenecek
- Teşvik terimleri yanlışlıkla engellenmeyecek (beyaz liste)
- Mevcut chat fonksiyonelliği korunacak
- Kullanıcıya nazik ve açıklayıcı uyarılar gösterilecek


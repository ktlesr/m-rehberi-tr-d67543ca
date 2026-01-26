/**
 * Content Moderation & Security Layer
 * 
 * Bu modül, kullanıcı girdilerini ve AI yanıtlarını güvenlik ve etik açıdan kontrol eder.
 * Siyasi, ırkçı, etnik, dini manipülasyon, argo ve saldırgan içerikleri tespit eder.
 */

export interface ModerationResult {
    isAllowed: boolean;
    reason?: string;
    category?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Tehlikeli anahtar kelimeler ve desenler
 */
const DANGEROUS_PATTERNS = {
    // Siyasi manipülasyon
    political: [
        /\b(akp|chp|mhp|hdp|iyi parti|deva|gelecek partisi)\b/i,
        /\b(erdoğan|kılıçdaroğlu|bahçeli|ince|babacan|davutoğlu)\b/i,
        /\b(hükümet|muhalefet|iktidar|seçim|oy|propaganda)\b/i,
        /\b(siyasi|politik|parti|lider|başkan)\s+(görüş|yorum|eleştiri)/i,
    ],

    // Etnik ve ırkçı içerik
    ethnic: [
        /\b(kürt|türk|arap|ermeni|rum|yahudi|çingene|roman)\s+(sorun|problem|tehlike|tehdit)/i,
        /\b(ırk|etnik|köken|soy)\s+(üstün|aşağı|kötü|iyi)/i,
        /\b(ayrımcılık|ırkçılık|nefret|düşmanlık)\b/i,
    ],

    // Dini manipülasyon
    religious: [
        /\b(müslüman|hristiyan|yahudi|ateist|alevi|sünni)\s+(kötü|iyi|doğru|yanlış)/i,
        /\b(din|mezhep|inanç|şeriat|laiklik)\s+(üstün|aşağı|tehlike|sorun)/i,
        /\b(dini|mezhebi|inançsal)\s+(ayrımcılık|nefret|düşmanlık)/i,
    ],

    // Argo ve küfür
    profanity: [
        /\b(amk|aq|mk|oç|piç|göt|sik|yarrak|am|amcık|taşak|siktir|pezevenk)\b/i,
        /\b(aptal|salak|gerizekalı|mal|ahmak|dangalak)\b/i,
    ],

    // Saldırgan ve tehdit içerikli
    aggressive: [
        /\b(öldür|vur|kes|yak|yıkıl|geberet|kahret|cehennem)\b/i,
        /\b(tehdit|şiddet|saldırı|bomba|silah|terör)\b/i,
        /\b(nefret ediyorum|tiksiniyorum|iğrenç|pis)\b/i,
    ],

    // Prompt injection ve sistem manipülasyonu
    injection: [
        /ignore\s+(previous|all|above)\s+(instructions|prompts|rules)/i,
        /you\s+are\s+(now|a)\s+(different|new)\s+(ai|assistant|bot)/i,
        /forget\s+(everything|all|your)\s+(instructions|rules|prompts)/i,
        /act\s+as\s+(if|a|an)\s+(?!yatırım|danışman|uzman)/i,
        /system\s*:\s*you/i,
        /\[system\]/i,
        /reveal\s+(your|the)\s+(prompt|instructions|rules)/i,
        /what\s+(are|is)\s+your\s+(instructions|system\s+prompt|rules)/i,
    ],

    // Çıkar ilişkisi ve rüşvet
    corruption: [
        /\b(rüşvet|komisyon|yasa dışı|kaçak|hile|dolandırıcılık)\b/i,
        /\b(adam kayır|torpil|kayırma|usulsüz|yolsuzluk)\b/i,
        /\b(kara para|vergi kaçır|sahte|evrak)\b/i,
    ],
};

/**
 * Beyaz liste - İzin verilen terimler (yanlış pozitif önleme)
 */
const WHITELIST_PATTERNS = [
    /\b(yatırım teşvik|devlet destek|sanayi hamle|teknoloji hamle)\b/i,
    /\b(bölge|il|ilçe|organize sanayi|osb)\b/i,
    /\b(nace|gtip|madde|karar|tebliğ)\b/i,
    /\b(vergi|kdv|gümrük|faiz|sigorta)\b/i,
];

/**
 * Kullanıcı girdisini kontrol eder
 */
export function moderateUserInput(input: string): ModerationResult {
    if (!input || input.trim().length === 0) {
        return { isAllowed: false, reason: 'Boş mesaj gönderilemez.', category: 'empty' };
    }

    // Çok uzun mesajları engelle (DoS koruması)
    if (input.length > 5000) {
        return {
            isAllowed: false,
            reason: 'Mesajınız çok uzun. Lütfen daha kısa ve öz bir şekilde sorunuzu sorun.',
            category: 'length',
            severity: 'low'
        };
    }

    // Beyaz listedeyse direkt geçir
    const isWhitelisted = WHITELIST_PATTERNS.some(pattern => pattern.test(input));
    if (isWhitelisted) {
        return { isAllowed: true };
    }

    // Prompt injection kontrolü (en yüksek öncelik)
    for (const pattern of DANGEROUS_PATTERNS.injection) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Lütfen yatırım teşvikleri ile ilgili sorularınızı sorun. Sistem komutları kabul edilmemektedir.',
                category: 'injection',
                severity: 'critical'
            };
        }
    }

    // Siyasi içerik kontrolü
    for (const pattern of DANGEROUS_PATTERNS.political) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Bu platform sadece yatırım teşvikleri hakkında bilgi vermektedir. Siyasi konular hakkında yorum yapamam.',
                category: 'political',
                severity: 'high'
            };
        }
    }

    // Etnik/ırkçı içerik kontrolü
    for (const pattern of DANGEROUS_PATTERNS.ethnic) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Bu platform herkes için eşit şekilde hizmet vermektedir. Etnik köken veya ırk temelli sorular kabul edilmemektedir.',
                category: 'ethnic',
                severity: 'critical'
            };
        }
    }

    // Dini içerik kontrolü
    for (const pattern of DANGEROUS_PATTERNS.religious) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Bu platform sadece yatırım teşvikleri hakkında bilgi vermektedir. Dini konular hakkında yorum yapamam.',
                category: 'religious',
                severity: 'high'
            };
        }
    }

    // Argo ve küfür kontrolü
    for (const pattern of DANGEROUS_PATTERNS.profanity) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Lütfen saygılı bir dil kullanın. Argo ve küfür içeren mesajlar kabul edilmemektedir.',
                category: 'profanity',
                severity: 'medium'
            };
        }
    }

    // Saldırgan içerik kontrolü
    for (const pattern of DANGEROUS_PATTERNS.aggressive) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Tehdit veya saldırgan içerik tespit edildi. Lütfen saygılı bir dil kullanın.',
                category: 'aggressive',
                severity: 'critical'
            };
        }
    }

    // Çıkar ilişkisi ve rüşvet kontrolü
    for (const pattern of DANGEROUS_PATTERNS.corruption) {
        if (pattern.test(input)) {
            return {
                isAllowed: false,
                reason: 'Bu platform sadece yasal yatırım teşvikleri hakkında bilgi vermektedir. Yasa dışı faaliyetler hakkında bilgi veremem.',
                category: 'corruption',
                severity: 'critical'
            };
        }
    }

    return { isAllowed: true };
}

/**
 * AI'ın kendi yapısını/programlamasını ifşa etmesi - ÖNCELİKLİ ENGELLEME
 */
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
    /yapay\s*zeka\s*(olarak|danışman[ıi]y[ıi]m)/i,
    /\bbenim\s+temel\s+görevim\b/i,
    /\bteşvik\s+danışman[ıi]\b/i,
    /\büzerinde\s+uzmanlaşmış\b/i,
    /\byatırım\s+teşvikleri\s+konusunda\s+uzmanlaşmış\b/i,
    
    // Metin oluşturma kabiliyeti
    /\bmetin\s+oluştur(abil|ma\s+yeteneğ)/i,
    /\bbilgi\s+üret(ebil|me\s+yeteneğ)/i,
];

/**
 * Test/deneme yanıtları - ÖNCELİKLİ ENGELLEME
 */
const TEST_RESPONSE_PATTERNS = [
    /\bbu\s+(bir\s+)?test\s+(yanıt|cevap|response)/i,
    /\btest\s+amacıyla\b/i,
    /\bbu\s+sadece\s+bir\s+test\b/i,
    /\börnek\s+yanıt\s+üret/i,
    /\bdeneme\s+yanıt/i,
    /\btest\s+olduğunu\s+belirt/i,
    /\bbu\s+bir\s+test\s+yanıtıdır\b/i,
    /\btest\s+response\b/i,
];

/**
 * Konu dışı içerik desenleri - AI'ın teşvik dışında bilgi ürettiğini tespit eder
 */
const OFF_TOPIC_PATTERNS = [
    // Genel bilgi içerikleri (gezegen, hayvan, tarih vb.)
    /\b(merkür|venüs|mars|jüpiter|satürn|uranüs|neptün|plüton)\b.*\b(gezegen|yüzey|atmosfer|güneş)\b/i,
    /\b(gezegen|yıldız|galaksi|uzay|astronot|nasa|esa)\s+(hakkında|bilgi|nedir)/i,
    /\b(aslan|kaplan|fil|balina|köpekbalığı|dinozor)\s+(hakkında|habitat|yaşam|beslen)/i,
    
    // Tarih ve coğrafya (teşvik dışı)
    /\b(dünya savaşı|osmanlı|roma imparatorluğu|antik|ortaçağ)\b/i,
    /\b(amazon|nil|everest|sahara)\s+(nehir|dağ|orman|çöl)/i,
    
    // Yemek tarifleri ve günlük konular
    /\b(tarif|pişir|malzeme|karıştır|kızart|fırın)\b.*\b(dakika|derece|kaşık|bardak)\b/i,
    /\b(film|dizi|müzik|şarkı|albüm|konser)\s+(öneri|tavsiye|izle)/i,
    
    // Matematik ve bilim (teşvik dışı)
    /\b(einstein|newton|darwin|freud)\b/i,
    /\b(formül|teorem|denklem|integral|türev)\s+(nedir|çöz|hesapla)/i,
    
    // Sağlık tavsiyeleri
    /\b(hastalık|tedavi|ilaç|ameliyat|doktor)\s+(öner|tavsiye|yapmalı)/i,
    
    // Spor ve eğlence
    /\b(futbol|basketbol|voleybol|maç|şampiyon|gol)\s+(sonuç|tahmin|analiz)/i,
    
    // AI'ın kendi yeteneklerini gösterme girişimi
    /\b(yapay zeka|ai|chatgpt|gpt|gemini)\s+(yetenek|özellik|başar|yapabil)/i,
    /\bteşvik\s+(dışında|haricinde|konularından\s+bağımsız)\b.*\bbilgi\b/i,
];

/**
 * Teşvik ile ilgili anahtar kelimeler - yanıtta bunlar varsa muhtemelen konu içidir
 */
const TESVIK_CONTEXT_PATTERNS = [
    /\b(teşvik|destek|hibe|kredi|yatırım)\b/i,
    /\b(kdv|vergi|gümrük|sgk|sigorta)\s*(muafiyet|indirim|istisnası)/i,
    /\b(bölge|il|ilçe|osb|organize sanayi)\b/i,
    /\b(nace|gtip|sektör|kapasite)\b/i,
    /\b(başvuru|belge|koşul|şart|kriter)\b/i,
    /\b(bakanlık|ajans|kosgeb|tübitak|tkdk)\b/i,
    /\b(proje|fizibilite|iş planı|yatırım belgesi)\b/i,
];

/**
 * AI yanıtını kontrol eder (çıktı filtreleme)
 */
export function moderateAIResponse(response: string): ModerationResult {
    if (!response || response.trim().length === 0) {
        return { isAllowed: false, reason: 'Boş yanıt', category: 'empty' };
    }

    // 1. ÖNCELİKLİ: Test yanıtı kontrolü (teşvik context'i olsa bile MUTLAKA engelle)
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

    // 2. ÖNCELİKLİ: AI'ın kendini ifşa etmesi (teşvik context'i olsa bile MUTLAKA engelle)
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

    // 3. Sistem prompt sızıntısı kontrolü
    const systemLeakPatterns = [
        /\[BÖLÜM:|DURUM \d+:|KRİTİK:|ZORUNLU\]/i,
        /constructSystemPrompt|findRelevantContext|getChatResponse/i,
        /DANGEROUS_PATTERNS|WHITELIST_PATTERNS/i,
    ];

    for (const pattern of systemLeakPatterns) {
        if (pattern.test(response)) {
            return {
                isAllowed: false,
                reason: 'Sistem bilgisi sızıntısı tespit edildi',
                category: 'system_leak',
                severity: 'critical'
            };
        }
    }

    // 4. Konu dışı içerik kontrolü
    const hasOffTopicContent = OFF_TOPIC_PATTERNS.some(pattern => pattern.test(response));
    
    if (hasOffTopicContent) {
        // Teşvik bağlamı var mı kontrol et - varsa izin ver
        const hasTesvikContext = TESVIK_CONTEXT_PATTERNS.some(pattern => pattern.test(response));
        
        if (!hasTesvikContext) {
            return {
                isAllowed: false,
                reason: 'Bu platform sadece yatırım teşvikleri hakkında bilgi vermektedir. Konu dışı içerik tespit edildi.',
                category: 'off_topic',
                severity: 'high'
            };
        }
    }

    return { isAllowed: true };
}

/**
 * Güvenlik olayını logla (opsiyonel - veritabanına kaydedilebilir)
 */
export async function logSecurityEvent(
    userId: string | null,
    input: string,
    moderationResult: ModerationResult,
    ipAddress?: string
) {
    // Bu fonksiyon gelecekte veritabanına kayıt için kullanılabilir
    console.warn('[SECURITY EVENT]', {
        timestamp: new Date().toISOString(),
        userId,
        category: moderationResult.category,
        severity: moderationResult.severity,
        reason: moderationResult.reason,
        ipAddress,
        inputLength: input.length,
        inputPreview: input.substring(0, 100) + '...'
    });
}

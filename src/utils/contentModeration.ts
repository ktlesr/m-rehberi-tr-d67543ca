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
 * AI yanıtını kontrol eder (çıktı filtreleme)
 */
export function moderateAIResponse(response: string): ModerationResult {
    if (!response || response.trim().length === 0) {
        return { isAllowed: false, reason: 'Boş yanıt', category: 'empty' };
    }

    // AI'ın sistem prompt'unu sızdırıp sızdırmadığını kontrol et
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

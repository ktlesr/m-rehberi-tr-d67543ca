/**
 * Markdown İçerik Normalleştirici
 * 
 * API'lerden gelen ham markdown içeriklerini temizler ve standardize eder.
 * Özellikle bozuk bold tag'leri, satır kırılmaları ve liste formatlarını düzeltir.
 */

/**
 * Satır kırılmalarıyla bölünmüş bold tag'leri birleştirir
 * Örnek: "**Teknoloji Hamlesi\n\nProgramı:**" → "**Teknoloji Hamlesi Programı:**"
 */
const fixSplitBoldTags = (content: string): string => {
  let result = content;
  
  // Pattern 1: "**Text\n\nDevam:**" (çift satır kırılması ile bölünmüş, sonda :)
  result = result.replace(/\*\*([^*\n]+)\n\n+([^*\n]+):\*\*/g, (match, p1, p2) => {
    return `**${p1.trim()} ${p2.trim()}:**`;
  });
  
  // Pattern 2: "**Text\nDevam:**" (tek satır kırılması ile bölünmüş, sonda :)
  result = result.replace(/\*\*([^*\n]+)\n([^*\n]+):\*\*/g, (match, p1, p2) => {
    return `**${p1.trim()} ${p2.trim()}:**`;
  });
  
  // Pattern 3: "**Text\n\nDevam\n\nSon:**" (çoklu satır kırılması)
  result = result.replace(/\*\*([^*]+?):\*\*/g, (match) => {
    // İçerideki satır kırılmalarını boşluğa çevir
    const cleaned = match.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    return cleaned;
  });
  
  // Pattern 4: "**\nText:**" (başında satır kırılması)
  result = result.replace(/\*\*\n+([^*]+):\*\*/g, '**$1:**');
  
  // Pattern 5: "**Text\n\n**" (kapatma öncesi satır kırılması, : yok)
  result = result.replace(/\*\*([^*\n]+)\n\n+\*\*/g, '**$1**');
  
  return result;
};

/**
 * Orphan (açık kalmış veya yalnız) bold işaretlerini temizler
 */
const cleanOrphanBoldMarkers = (content: string): string => {
  let result = content;
  
  // Satır başındaki yalnız "**" (sonrasında harf/kelime yok veya sadece boşluk)
  result = result.replace(/^\*\*\s*$/gm, '');
  
  // Satır sonundaki yalnız "**" 
  result = result.replace(/\s+\*\*\s*$/gm, '');
  
  // "**" ile başlayıp "**" ile kapanmayan satırlar (kısa olanlar)
  // Örnek: "**Başlık" (kapatma yok) - sadece 3-30 karakterlik olanlar
  result = result.replace(/^\*\*([^*:\n]{3,30})$/gm, (match, text) => {
    // Eğer sonraki satırda devam ediyorsa dokunma
    return text.trim();
  });
  
  // Satırın ortasında yalnız "**" (etrafında boşluk var)
  result = result.replace(/\s\*\*\s(?!\S)/g, ' ');
  
  // "text:**" sonundaki orphan ** (kapatılmamış)
  result = result.replace(/([^*]):\*\*(?!\s*\S)/g, '$1:');
  
  return result;
};

/**
 * Liste formatlarını normalize eder
 */
const normalizeListFormats = (content: string): string => {
  return content
    // Gemini'nin "*   " formatını düzelt (asterisk + 2+ boşluk)
    .replace(/^\*\s{2,}/gm, '* ')
    .replace(/\n\*\s{2,}/g, '\n* ')
    
    // Ham bullet karakterlerini (•, ◦, ▪, ●) temizle → standart markdown
    .replace(/^[•◦▪●]\s*/gm, '* ')
    .replace(/\n[•◦▪●]\s*/g, '\n* ')
    
    // Çift bullet kalıplarını temizle (* • veya • *)
    .replace(/^\*\s*[•◦▪●]\s*/gm, '* ')
    .replace(/^[•◦▪●]\s*\*\s*/gm, '* ')
    .replace(/\n\*\s*[•◦▪●]\s*/g, '\n* ')
    .replace(/\n[•◦▪●]\s*\*\s*/g, '\n* ')
    
    // Tire formatını da normalize et (- + 2+ boşluk)
    .replace(/^-\s{2,}/gm, '- ')
    .replace(/\n-\s{2,}/g, '\n- ')
    
    // Satır başındaki "* *" veya "- -" çift işaret kalıplarını temizle
    .replace(/^[\*\-]\s*[\*\-]\s+/gm, '* ')
    .replace(/\n[\*\-]\s*[\*\-]\s+/g, '\n* ');
};

/**
 * Boşlukları ve satır kırılmalarını temizler
 */
const cleanWhitespace = (content: string): string => {
  return content
    // 3+ ardışık satır kırılmasını 2'ye indir
    .replace(/\n{3,}/g, '\n\n')
    // Satır başı/sonu boşluklarını temizle
    .trim();
};

/**
 * Bold başlıkları düzeltir (: işareti içerenler)
 */
const fixBoldHeaders = (content: string): string => {
  return content
    // "**text: **" → "**text:** " (boşluk kapatmadan önce)
    .replace(/\*\*([^*]+?):\s*\*\*/g, '**$1:** ')
    
    // "**text:**value" → "**text:** value" (iki nokta sonrası boşluk yok)
    .replace(/\*\*([^*]+):\*\*(\S)/g, '**$1:** $2');
};

/**
 * Ana normalleştirme fonksiyonu
 * Tüm temizleme işlemlerini sırayla uygular
 */
export const normalizeMarkdownContent = (content: string): string => {
  if (!content) return '';
  
  let result = content;
  
  // ADIM 1: Bozuk bold tag'leri düzelt (en kritik)
  result = fixSplitBoldTags(result);
  
  // ADIM 2: Bold başlık formatlarını düzelt
  result = fixBoldHeaders(result);
  
  // ADIM 3: Orphan bold işaretlerini temizle
  result = cleanOrphanBoldMarkers(result);
  
  // ADIM 4: Liste formatlarını normalize et
  result = normalizeListFormats(result);
  
  // ADIM 5: Boşlukları temizle
  result = cleanWhitespace(result);
  
  return result;
};

/**
 * Debug için: Hangi düzeltmelerin uygulandığını loglar
 */
export const normalizeMarkdownContentDebug = (content: string): { result: string; changes: string[] } => {
  const changes: string[] = [];
  let result = content;
  
  const step1 = fixSplitBoldTags(result);
  if (step1 !== result) changes.push('fixSplitBoldTags');
  result = step1;
  
  const step2 = fixBoldHeaders(result);
  if (step2 !== result) changes.push('fixBoldHeaders');
  result = step2;
  
  const step3 = cleanOrphanBoldMarkers(result);
  if (step3 !== result) changes.push('cleanOrphanBoldMarkers');
  result = step3;
  
  const step4 = normalizeListFormats(result);
  if (step4 !== result) changes.push('normalizeListFormats');
  result = step4;
  
  const step5 = cleanWhitespace(result);
  if (step5 !== result) changes.push('cleanWhitespace');
  result = step5;
  
  return { result, changes };
};

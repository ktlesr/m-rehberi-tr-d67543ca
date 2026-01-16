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
// =================== SPLIT BOLD TAG FIXES ===================
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

// =================== CLOSING-ONLY BOLD REPAIR ===================
// Örnek: "Makine Desteği:** Birim fiyatı" -> "**Makine Desteği:** Birim fiyatı"
const repairClosingOnlyBold = (content: string): string => {
  // Liste öğesi başındaki "* Text:**" veya "- Text:**" kalıbını yakala
  let result = content.replace(/^([\*\-]\s+)([^*\n:]{2,60}):\*\*/gm, '$1**$2:**');
  
  // Satır başındaki "Text:**" (açılış olmadan kapanış var)
  result = result.replace(/^([^*\n:]{2,60}):\*\*\s/gm, '**$1:** ');
  
  // Satır ortasındaki kapanış-only: " Text:**" -> " **Text:**"
  result = result.replace(/\s([^*\n\s:]{2,40}):\*\*\s/g, ' **$1:** ');
  
  return result;
};

// =================== OPENING-ONLY BOLD CLEANUP ===================
// Örnek: "**faiz oranının 20 puanı" (kapanış yok) -> "faiz oranının 20 puanı"
const cleanOpeningOnlyBold = (content: string): string => {
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    // Satırda "**" sayısını say
    const matches = line.match(/\*\*/g);
    if (!matches) return line;
    
    // Tek ** varsa (orphan), kaldır
    if (matches.length === 1) {
      // Satır başındaki orphan açılış
      if (line.match(/^\*\*[^*]/)) {
        return line.replace(/^\*\*\s*/, '');
      }
      // Satır ortasındaki orphan (boşluk + **)
      if (line.match(/\s\*\*[^*]/)) {
        return line.replace(/\s\*\*([^*])/, ' $1');
      }
      // Satır sonundaki orphan kapanış (:** sonrası değilse)
      if (line.match(/[^:]\*\*$/)) {
        return line.replace(/\*\*$/, '');
      }
    }
    
    return line;
  });
  
  return fixedLines.join('\n');
};

// =================== LIST CONTINUATION FIXER ===================
// Liste öğesinden sonra gelen "devam" satırlarını düzgün bağla
const fixListContinuation = (content: string): string => {
  const lines = content.split('\n');
  const result: string[] = [];
  let lastWasListItem = false;
  let lastWasEmpty = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Bu satır list item mi?
    const isListItem = /^[\*\-]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
    // Bu satır heading mi?
    const isHeading = /^#{1,6}\s/.test(trimmed) || /^\*\*[^*]+:\*\*/.test(trimmed);
    // Boş satır mı?
    const isEmpty = trimmed === '';
    
    if (isEmpty) {
      lastWasEmpty = true;
      result.push(line);
      continue;
    }
    
    // Önceki satır list item idi ve şimdi continuation satırı var
    if (lastWasListItem && lastWasEmpty && !isListItem && !isHeading && trimmed.length > 0) {
      // Boş satırı kaldır (son eklenen boş satır)
      if (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop();
      }
      // Continuation satırını indent et
      result.push(`  ${trimmed}`);
    } else {
      result.push(line);
    }
    
    lastWasListItem = isListItem;
    lastWasEmpty = isEmpty;
  }
  
  return result.join('\n');
};

// =================== BOLD HEADER FIXES ===================
const fixBoldHeaders = (content: string): string => {
  return content
    // "**Text :** value" → "**Text:** value" (: öncesi boşluk)
    .replace(/\*\*([^*]+)\s+:\*\*/g, '**$1:**')
    // "**Text: **value" → "**Text:** value" (kapanıştan önce boşluk)
    .replace(/\*\*([^*]+):\s+\*\*/g, '**$1:** ');
};

// =================== ORPHAN BOLD MARKER CLEANUP ===================
const cleanOrphanBoldMarkers = (content: string): string => {
  return content
    // Satır başındaki yalnız "**" (sonrasında kelime yok veya : ile bitmez)
    .replace(/^\*\*\s*$/gm, '')
    // Satır sonundaki yalnız "**" 
    .replace(/\s+\*\*\s*$/gm, '')
    // Çift ** ** arasındaki boşluk
    .replace(/\*\*\s+\*\*/g, '');
};

// =================== LIST FORMAT NORMALIZATION ===================
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

// =================== WHITESPACE CLEANUP ===================
const cleanWhitespace = (content: string): string => {
  return content
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// =================== MAIN NORMALIZER ===================
export const normalizeMarkdownContent = (content: string): string => {
  if (!content) return '';
  
  let result = content;
  
  // ADIM 1: Bozuk bold tag'leri düzelt (en kritik)
  result = fixSplitBoldTags(result);
  
  // ADIM 2: Sadece kapanış olan bold'ları onar ("Text:**" -> "**Text:**")
  result = repairClosingOnlyBold(result);
  
  // ADIM 3: Sadece açılış olan bold'ları temizle ("**text" -> "text")
  result = cleanOpeningOnlyBold(result);
  
  // ADIM 4: Bold başlık formatlarını düzelt
  result = fixBoldHeaders(result);
  
  // ADIM 5: Orphan bold işaretlerini temizle
  result = cleanOrphanBoldMarkers(result);
  
  // ADIM 6: Liste formatlarını normalize et
  result = normalizeListFormats(result);
  
  // ADIM 7: Liste continuation'ları düzelt
  result = fixListContinuation(result);
  
  // ADIM 8: Boşlukları temizle
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

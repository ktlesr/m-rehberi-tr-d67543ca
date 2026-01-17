/**
 * Markdown İçerik Normalleştirici
 * 
 * API'lerden gelen ham markdown içeriklerini temizler ve standardize eder.
 * Özellikle bozuk bold tag'leri, satır kırılmaları ve liste formatlarını düzeltir.
 */

// =================== MULTI-LINE LIST BOLD REPAIR ===================
// Pattern: "• Text:\n**continuation" → "• **Text:** continuation"
const fixMultilineListBold = (content: string): string => {
  let result = content;
  
  // Pattern 1: Liste öğesi "Text:\n**devam" → "**Text:** devam"
  result = result.replace(/^([•\*\-]\s+)([^*\n:]{2,60}):\s*\n+\*\*([^*\n]+)/gm, 
    (match, listMarker, title, continuation) => {
      return `${listMarker}**${title.trim()}:** ${continuation.trim()}`;
    });
  
  // Pattern 2: "Başlık:\n**içerik**" → "**Başlık:** içerik"
  result = result.replace(/^([^•\*\-\n][^:\n]{2,50}):\s*\n+\*\*([^*\n]+)\*\*\s*/gm,
    (match, title, content) => {
      return `**${title.trim()}:** ${content.trim()} `;
    });
  
  // Pattern 3: Liste sonrası satır başı "**devam" (orphan opening)
  result = result.replace(/^([•\*\-]\s+[^\n]+)\n+\*\*([^*:\n]+)(?!\*\*)/gm,
    (match, listItem, orphanContent) => {
      // Eğer liste item : ile bitiyorsa, bold'u kaldır
      if (listItem.trim().endsWith(':')) {
        return `${listItem}\n${orphanContent.trim()}`;
      }
      return match;
    });
  
  return result;
};

// =================== INLINE SPLIT BOLD HEADER FIXES ===================
// Pattern: "**Vergi **İndirimi:" → "**Vergi İndirimi:**"
// Pattern: "**Sigorta Primi İşveren **Hissesi:" → "**Sigorta Primi İşveren Hissesi:**"
const fixInlineSplitBoldHeaders = (content: string): string => {
  let result = content;

  // Satır başında (opsiyonel boşluk) + bozuk iki açılış bold: "**A **B:" -> "**A B:**"
  result = result.replace(
    /^(\s*(?:[•\*\-]\s+)?)\*\*([^*\n]{2,80}?)\s+\*\*([^*\n]{2,80}?):/gm,
    (match, prefix, a, b) => `${prefix}**${a.trim()} ${b.trim()}:**`
  );

  return result;
};

// =================== SPLIT BOLD TAG FIXES ===================
const fixSplitBoldTags = (content: string): string => {
  let result = content;
  
  // Pattern 1: "**Text\n\nDevam:**" (çift satır kırılması ile bölünmüş, sonda :)
  result = result.replace(/\*\*([^*\n]+)\n\n+([^*\n]+):\*\*/g, (match, p1, p2) => {
    return `**${p1.trim()} ${p2.trim()}:**`;
  });
  
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
  let result = content;
  
  // Liste öğesi başındaki "* Text:**" veya "- Text:**" kalıbını yakala
  result = result.replace(/^([\*\-•]\s+)([^*\n:]{2,60}):\*\*/gm, '$1**$2:**');
  
  // Satır başındaki "Text:**" (açılış olmadan kapanış var)
  result = result.replace(/^([^*\n:]{2,60}):\*\*\s/gm, '**$1:** ');
  
  // Satır ortasındaki kapanış-only: " Text:**" -> " **Text:**"
  result = result.replace(/\s([^*\n\s:]{2,40}):\*\*\s/g, ' **$1:** ');
  
  // Pattern: "Desteği:** " gibi Türkçe karakterli başlıklar
  result = result.replace(/([A-ZİÜÖŞÇĞa-zıüöşçğ]{2,}):\*\*\s+/g, '**$1:** ');
  
  return result;
};

// =================== OPENING-ONLY BOLD CLEANUP ===================
// Örnek: "**faiz oranının 20 puanı" (kapanış yok) -> "faiz oranının 20 puanı"
const cleanOpeningOnlyBold = (content: string): string => {
  const lines = content.split('\n');
  const fixedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const matches = line.match(/\*\*/g);
    
    if (!matches) {
      fixedLines.push(line);
      continue;
    }
    
    // Tek ** varsa (orphan)
    if (matches.length === 1) {
      // Bir önceki satıra bak - liste item + : ile mi bitiyor?
      const prevLine = i > 0 ? fixedLines[fixedLines.length - 1] : '';
      const prevEndsWithColon = prevLine.trim().endsWith(':');
      
      // Satır başındaki orphan açılış
      if (line.match(/^\*\*[^*]/)) {
        // Önceki satır : ile bitiyorsa, bu devam satırı - ** kaldır
        if (prevEndsWithColon) {
          line = line.replace(/^\*\*\s*/, '');
        } else {
          line = line.replace(/^\*\*\s*/, '');
        }
      }
      // Satır ortasındaki orphan (boşluk + **)
      else if (line.match(/\s\*\*[^*]/)) {
        line = line.replace(/\s\*\*([^*])/, ' $1');
      }
      // Satır sonundaki orphan kapanış (:** sonrası değilse)
      else if (line.match(/[^:]\*\*$/)) {
        line = line.replace(/\*\*$/, '');
      }
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
};

// =================== LIST CONTINUATION FIXER ===================
// Liste öğesinden sonra gelen "devam" satırlarını düzgün bağla
const fixListContinuation = (content: string): string => {
  const lines = content.split('\n');
  const result: string[] = [];
  let lastListItemIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Bu satır list item mi?
    const isListItem = /^[\*\-•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
    // Bu satır heading mi?
    const isHeading = /^#{1,6}\s/.test(trimmed) || /^\*\*[^*]+:\*\*/.test(trimmed);
    // Boş satır mı?
    const isEmpty = trimmed === '';
    
    if (isListItem) {
      lastListItemIndex = result.length;
      result.push(line);
      continue;
    }
    
    if (isEmpty) {
      result.push(line);
      continue;
    }
    
    // Bu satır bir önceki liste öğesinin devamı olabilir mi?
    // Koşullar: önceki satır boş, ondan önceki list item, bu satır heading değil
    if (lastListItemIndex >= 0 && !isHeading && trimmed.length > 0) {
      // Son boş olmayan satırdan bu yana kaç boş satır var?
      let emptyCount = 0;
      for (let j = result.length - 1; j >= 0 && result[j].trim() === ''; j--) {
        emptyCount++;
      }
      
      // 1 boş satır varsa ve son list item : ile bitiyorsa → continuation
      if (emptyCount === 1 && lastListItemIndex === result.length - 2) {
        const lastListItem = result[lastListItemIndex];
        if (lastListItem.trim().endsWith(':')) {
          // Boş satırı kaldır
          result.pop();
          // Continuation satırını indent et
          result.push(`  ${trimmed}`);
          continue;
        }
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
};

// =================== CONTEXT-AWARE BOLD REPAIR ===================
// 2-3 satırlık pencere ile bozuk bold'ları tespit et
const contextAwareBoldRepair = (content: string): string => {
  const lines = content.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const prevLine = i > 0 ? result[result.length - 1] : '';
    
    // Pattern: Önceki satır "Text:" ile bitiyor, bu satır "**devam" ile başlıyor
    if (prevLine.trim().match(/[^*]:\s*$/) && line.match(/^\s*\*\*[^*]/)) {
      // Önceki satıra bold ekle ve bu satırdaki ** kaldır
      const cleanedPrev = prevLine.replace(/([^*\s]+):\s*$/, '**$1:**');
      result[result.length - 1] = cleanedPrev;
      line = line.replace(/^\s*\*\*/, '');
    }
    
    result.push(line);
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

// =================== FIX BROKEN BOLD PATTERNS ===================
// API bazen bozuk bold döndürüyor: "Kütahya:**" veya "**Bilecik:" gibi
const fixBrokenBoldPatterns = (content: string): string => {
  let result = content;
  
  // PATTERN 0 (KRİTİK): "**Konusu:" → "**Konusu:**" (tek kelime, eksik kapanış)
  // Bu pattern "**Yatırım **Konusu:" gibi bozuk yapıların düzeltilmesi için
  result = result.replace(/\*\*([A-ZÇĞİÖŞÜa-zçğıöşü][A-ZÇĞİÖŞÜa-zçğıöşüı]+):\s+/g, (match, word, offset, str) => {
    // Öncesinde "**" var mı kontrol et (nested bold durumu)
    const before = str.substring(Math.max(0, offset - 3), offset);
    if (before.includes('**')) {
      // Önceki bold'u kapat ve yenisini aç
      return `**${word}:** `;
    }
    return `**${word}:** `;
  });
  
  // PATTERN 0.5: "**Text **Label:" → "**Text Label:**" (boşluklu split)
  result = result.replace(/\*\*([^*\n:]+?)\s+\*\*([^*\n:]+?):/g, '**$1 $2:**');
  
  // Pattern 1: "Kütahya:**" → "**Kütahya:**" (eksik açılış)
  // Liste item içinde bold olmayan kelime + :** 
  result = result.replace(/^(\*\s+)([A-ZÇĞİÖŞÜa-zçğıöşü][^*\n]+?):\*\*/gm, '$1**$2:**');
  
  // Pattern 2: "**Bilecik:" → "**Bilecik:**" (eksik kapanış)
  result = result.replace(/\*\*([A-ZÇĞİÖŞÜ][^*\n:]+):\s+(?!\*\*)/g, '**$1:** ');
  
  // Pattern 3: Satır başında yalnız "**Yatırımı" → kaldır veya düzelt
  result = result.replace(/^\*\*([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s*$/gm, '**$1**');
  
  // Pattern 4: "• Kütahya:** Text" → "• **Kütahya:** Text"
  result = result.replace(/([•\-\*]\s+)([A-ZÇĞİÖŞÜa-zçğıöşü][^*\n:]+?):\*\*\s*/g, '$1**$2:** ');
  
  // Pattern 5: "• **Bilecik: Text" → "• **Bilecik:** Text" 
  result = result.replace(/([•\-\*]\s+)\*\*([A-ZÇĞİÖŞÜ][^*\n:]+):\s+([^*])/g, '$1**$2:** $3');
  
  // Pattern 6: Liste dışında "**Text:" → "**Text:**"
  result = result.replace(/\*\*([A-ZÇĞİÖŞÜ][^*\n:]{2,20}):\s+(?!\*)/g, '**$1:** ');
  
  // Pattern 7: Satır ortasındaki "**Label:" kalıplarını düzelt (kapanış eksik)
  result = result.replace(/\*\*([A-ZÇĞİÖŞÜa-zçğıöşü][^*\n:]{2,30}):\s+(?=[A-ZÇĞİÖŞÜa-zçğıöşü0-9%])/g, '**$1:** ');
  
  return result;
};

// =================== FIX INLINE ASTERISKS IN LIST ===================
// "için öne çıkan iller şunlardır: * **Kütahya:" → düzgün liste formatına çevir
const fixInlineAsterisksInText = (content: string): string => {
  let result = content;
  
  // Pattern 1: ": * **Text:" → "\n\n* **Text:"
  result = result.replace(/:\s*\*\s+\*\*([^*\n:]+):/g, ':\n\n* **$1:**');
  
  // Pattern 2: ". * **Text:" → "\n\n* **Text:"
  result = result.replace(/\.\s*\*\s+\*\*([^*\n:]+):/g, '.\n\n* **$1:**');
  
  // Pattern 3: "şunlardır: * **Text" → "şunlardır:\n\n* **Text"
  result = result.replace(/(şunlardır|aşağıdadır|şöyledir|bunlardır):\s*\*\s+/gi, '$1:\n\n* ');
  
  // Pattern 4: Satır ortasındaki "* " → yeni satır
  result = result.replace(/([.!?:])\s+\*\s+\*\*/g, '$1\n\n* **');
  
  // Pattern 5: Ham asterisk inline kullanımı
  result = result.replace(/([.!?:])\s+\*\s+([A-ZÇĞİÖŞÜ])/g, '$1\n\n* $2');
  
  return result;
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
  
  // ADIM 0: Satır içi asteriskleri ayır (en kritik - diğerlerinden önce)
  result = fixInlineAsterisksInText(result);
  
  // ADIM 0.5: Bozuk bold pattern'leri düzelt
  result = fixBrokenBoldPatterns(result);
  
  // ADIM 1: Çok satırlı liste bold'larını düzelt (en kritik)
  result = fixMultilineListBold(result);

  // ADIM 2: Satır içi bozuk başlık bold'larını düzelt ("**Vergi **İndirimi:" gibi)
  result = fixInlineSplitBoldHeaders(result);

  // ADIM 3: Bozuk split bold tag'leri düzelt
  result = fixSplitBoldTags(result);

  // ADIM 4: Context-aware bold onarımı (2 satırlık pencere)
  result = contextAwareBoldRepair(result);
  
  // ADIM 5: Sadece kapanış olan bold'ları onar ("Text:**" -> "**Text:**")
  result = repairClosingOnlyBold(result);

  // ADIM 6: Sadece açılış olan bold'ları temizle ("**text" -> "text")
  result = cleanOpeningOnlyBold(result);

  // ADIM 7: Bold başlık formatlarını düzelt
  result = fixBoldHeaders(result);

  // ADIM 8: Orphan bold işaretlerini temizle
  result = cleanOrphanBoldMarkers(result);

  // ADIM 9: Liste formatlarını normalize et
  result = normalizeListFormats(result);

  // ADIM 10: Liste continuation'ları düzelt
  result = fixListContinuation(result);

  // ADIM 11: Boşlukları temizle
  result = cleanWhitespace(result);
  
  return result;
};

/**
 * Debug için: Hangi düzeltmelerin uygulandığını loglar
 */
export const normalizeMarkdownContentDebug = (content: string): { result: string; changes: string[] } => {
  const changes: string[] = [];
  let result = content;
  
  const stepInline = fixInlineAsterisksInText(result);
  if (stepInline !== result) changes.push('fixInlineAsterisksInText');
  result = stepInline;
  
  const stepBroken = fixBrokenBoldPatterns(result);
  if (stepBroken !== result) changes.push('fixBrokenBoldPatterns');
  result = stepBroken;
  
  const step0 = fixMultilineListBold(result);
  if (step0 !== result) changes.push('fixMultilineListBold');
  result = step0;

  const step0b = fixInlineSplitBoldHeaders(result);
  if (step0b !== result) changes.push('fixInlineSplitBoldHeaders');
  result = step0b;

  const step1 = fixSplitBoldTags(result);
  if (step1 !== result) changes.push('fixSplitBoldTags');
  result = step1;

  const step1b = contextAwareBoldRepair(result);
  if (step1b !== result) changes.push('contextAwareBoldRepair');
  result = step1b;
  
  const step2 = repairClosingOnlyBold(result);
  if (step2 !== result) changes.push('repairClosingOnlyBold');
  result = step2;
  
  const step3 = cleanOpeningOnlyBold(result);
  if (step3 !== result) changes.push('cleanOpeningOnlyBold');
  result = step3;
  
  const step4 = fixBoldHeaders(result);
  if (step4 !== result) changes.push('fixBoldHeaders');
  result = step4;
  
  const step5 = cleanOrphanBoldMarkers(result);
  if (step5 !== result) changes.push('cleanOrphanBoldMarkers');
  result = step5;
  
  const step6 = normalizeListFormats(result);
  if (step6 !== result) changes.push('normalizeListFormats');
  result = step6;
  
  const step7 = fixListContinuation(result);
  if (step7 !== result) changes.push('fixListContinuation');
  result = step7;
  
  const step8 = cleanWhitespace(result);
  if (step8 !== result) changes.push('cleanWhitespace');
  result = step8;
  
  return { result, changes };
};

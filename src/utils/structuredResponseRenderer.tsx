/**
 * Structured Response Renderer
 * 
 * API'den gelen structured JSON yanıtlarını parse eder ve render eder.
 * Markdown parsing sorunlarını tamamen ortadan kaldırır.
 * Framer Motion animasyonları ile zenginleştirilmiştir.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =================== ANIMATION VARIANTS ===================

// Staggered reveal için parent container variant
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // Her çocuk 100ms arayla
      delayChildren: 0.05
    }
  }
};

// Her section için giriş animasyonu (slide up + fade)
const sectionVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};

// Warning/Info/Success kutuları için scale animasyonu
const alertVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 20
    }
  }
};

// =================== TYPE DEFINITIONS ===================

export type SectionType = 'paragraph' | 'list' | 'key-value' | 'table' | 'warning' | 'info' | 'success';

export interface KeyValueItem {
  label?: string;
  key?: string; // Alternative to label (API flexibility)
  value: string;
}

export interface StructuredSection {
  title?: string;
  type: SectionType;
  content?: string;
  items?: string[] | KeyValueItem[];
  columns?: string[]; // Table tipi için sütun başlıkları
}

export interface ComparisonTable {
  columns: string[];
  items: Record<string, string>[];
}

export interface StructuredContent {
  summary: string;
  sections: StructuredSection[];
  winner?: string; // Comparative mod için kazanan
  comparison_table?: ComparisonTable; // Comparative mod için karşılaştırma tablosu
}

export interface InteractionConfig {
  field: 'sector' | 'province' | 'district' | 'osb_status';
  questionText: string;
  inputType: 'text' | 'select' | 'radio' | 'search';
  options?: Array<{
    value: string;
    label: string;
    icon?: string;
    region?: number;
  }>;
  allowSearch?: boolean;
  placeholder?: string;
  validation?: { required: boolean };
}

export interface FollowUpConfig {
  question: string;
  field?: string;
}

export interface ProgressConfig {
  sector: string | null;
  sector_nace?: string | null;
  province: string | null;
  district: string | null;
  osb_status: string | null;
  currentStep: number; // 1-4 (doc) or 1-5 (extended)
  totalSteps?: number;
  completed?: boolean;
}

export interface SourceItem {
  index?: number;
  title: string;
  uri?: string;
  snippet?: string;
}

export interface SupportProgramItem {
  id: string;
  title: string;
  institution?: string;
  deadline?: string;
}

export interface StructuredAPIResponse {
  type: 'structured' | 'markdown';
  mode?: 'informative' | 'interactive' | 'result' | 'comparative';
  content: StructuredContent | string;
  interaction?: InteractionConfig;
  followUp?: FollowUpConfig;
  progress?: ProgressConfig;
  sources?: SourceItem[] | string[];
  supportPrograms?: SupportProgramItem[];
}

// =================== MARKDOWN CONVERTER ===================

/**
 * Structured response'u düz markdown metnine dönüştür
 * Informative modda kullanılır - tasarımlı kartlar yerine sade metin
 */
export function convertStructuredToMarkdown(response: StructuredAPIResponse): string {
  // Zaten string ise direkt döndür
  if (typeof response.content === 'string') {
    return response.content;
  }
  
  const content = response.content as StructuredContent;
  const parts: string[] = [];
  
  // Summary
  if (content.summary) {
    parts.push(content.summary);
  }
  
  // Sections
  content.sections?.forEach(section => {
    // Section başlığı
    if (section.title) {
      parts.push(`\n**${section.title}**\n`);
    }
    
    // Section içeriği (paragraph, info, warning, success)
    if (section.content) {
      if (section.type === 'warning') {
        parts.push(`⚠️ ${section.content}`);
      } else if (section.type === 'info') {
        parts.push(`ℹ️ ${section.content}`);
      } else if (section.type === 'success') {
        parts.push(`✅ ${section.content}`);
      } else {
        parts.push(section.content);
      }
    }
    
    // Liste/key-value items
    if (section.items && section.items.length > 0) {
      parts.push(''); // Boş satır
      section.items.forEach(item => {
        if (typeof item === 'string') {
          parts.push(`• ${item}`);
        } else {
          const kv = item as KeyValueItem;
          if (kv.value) {
            parts.push(`**${kv.label}:** ${kv.value}`);
          } else {
            parts.push(`• ${kv.label}`);
          }
        }
      });
    }
  });
  
  return parts.join('\n');
}

// =================== PARSER FUNCTIONS ===================

/**
 * API yanıtını parse et - structured veya markdown olabilir
 */
/**
 * Nested JSON string'leri recursive olarak parse et
 * Örn: content: "{\"summary\":...}" → content: {summary:...}
 * NOT: Leaf string değerleri (summary, section.content gibi) parse etme - bunlar text olarak kalmalı
 */
function deepParseJsonStrings(obj: any, isLeafValue = false): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Leaf değerler (summary, content text gibi) parse edilmemeli
    if (isLeafValue) return obj;
    
    const trimmed = obj.trim();
    // JSON object/array gibi görünüyor mu?
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return deepParseJsonStrings(parsed, false); // Recursive parse
      } catch {
        return obj; // Parse başarısız, string olarak bırak
      }
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepParseJsonStrings(item, false));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};

    // Leaf string alanları: bunlar text içerik olup parse edilmemeli
    // Not: top-level "content" alanı (StructuredContent) JSON string gelebilir, parse edilmelidir.
    const leafKeys = ['summary', 'text', 'label', 'value', 'question', 'questionText', 'placeholder'];
    const sectionTypes = new Set<SectionType>([
      'paragraph',
      'list',
      'key-value',
      'table',
      'warning',
      'info',
      'success',
    ]);

    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      const isLeafTextKey = leafKeys.includes(key) && typeof val === 'string';
      const isSectionContent = key === 'content' && typeof val === 'string' && typeof (obj as any).type === 'string' && sectionTypes.has((obj as any).type);
      const isLeaf = isLeafTextKey || isSectionContent;
      result[key] = deepParseJsonStrings(val, isLeaf);
    }

    return result;
  }
  
  return obj;
}

export function parseAPIResponse(data: any): StructuredAPIResponse {
  // Eğer data string ise, önce parse etmeyi dene
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseAPIResponse(parsed); // Recursive call
      } catch {
        // Parse başarısız, markdown olarak devam
      }
    }
    return {
      type: 'markdown',
      content: data,
    };
  }

  // Nested JSON string'leri çöz (content: "{...}" durumu)
  const normalized: any = deepParseJsonStrings(data);

  // type=structured olup content JSON string geldiyse (en sık sorun), özellikle parse et
  if (normalized?.type === 'structured' && typeof normalized.content === 'string') {
    const trimmed = normalized.content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedContent = JSON.parse(trimmed);
        normalized.content = deepParseJsonStrings(parsedContent, false);
      } catch {
        // ignore
      }
    }
  }

  // Eğer data.type === 'structured' ve content.sections varsa
  if (normalized?.type === 'structured' && normalized?.content?.sections) {
    // supportCards → supportPrograms alias desteği
    if (!normalized.supportPrograms && normalized.supportCards) {
      normalized.supportPrograms = normalized.supportCards;
    }
    return normalized as StructuredAPIResponse;
  }

  // Eğer doğrudan content.sections varsa (type belirtilmemiş)
  if (normalized?.content?.sections && Array.isArray(normalized.content.sections)) {
    return {
      type: 'structured',
      mode: normalized.mode || 'informative',
      content: normalized.content,
      interaction: normalized.interaction,
      followUp: normalized.followUp,
      progress: normalized.progress,
      sources: normalized.sources,
      supportPrograms: normalized.supportPrograms || normalized.supportCards, // alias desteği
    };
  }

  // Fallback: text varsa markdown olarak işle
  if (normalized?.text) {
    return {
      type: 'markdown',
      content: normalized.text,
      sources: normalized.sources,
    };
  }

  // Son çare: doğrudan content string olarak al
  return {
    type: 'markdown',
    content: typeof normalized?.content === 'string' ? normalized.content : '',
    sources: normalized?.sources,
  };
}

/**
 * Message content'ini structured response olarak parse etmeye çalış
 * Hem çıplak JSON hem de ```json ... ``` kod bloğu içindeki JSON'u destekler
 */
export function tryParseStructuredContent(content: string): StructuredAPIResponse | null {
  if (!content || typeof content !== 'string') return null;
  
  try {
    let jsonString = content.trim();
    
    // ```json ... ``` kod bloğu içinde mi kontrol et
    const codeBlockMatch = jsonString.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }
    
    // JSON gibi görünüyor mu?
    if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
      const parsed = JSON.parse(jsonString);
      
      // Nested JSON string'leri çöz
      const normalized = deepParseJsonStrings(parsed);
      
      // Structured format mı kontrol et
      if (normalized.type === 'structured' || normalized.content?.sections) {
        return parseAPIResponse(normalized);
      }
    }
  } catch {
    // JSON değil, markdown olarak devam et
  }

  return null;
}

// =================== RENDERER COMPONENTS ===================

interface SectionRendererProps {
  section: StructuredSection;
  index: number;
}

function SectionRenderer({ section, index }: SectionRendererProps) {
  // Helper: Ensure value is string for ReactMarkdown
  const ensureString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    return JSON.stringify(val);
  };

  // Markdown components for inline rendering
  const inlineMarkdownComponents = {
    p: ({ children }: any) => <span>{children}</span>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    a: ({ href, children }: any) => (
      <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  };

  const renderContent = () => {
    // Ensure section.content is always a string
    const contentText = ensureString(section.content);
    
    switch (section.type) {
      case 'paragraph':
        return (
          <div className="text-sm text-muted-foreground leading-relaxed">
            <ReactMarkdown components={inlineMarkdownComponents}>
              {contentText}
            </ReactMarkdown>
          </div>
        );

      case 'list':
        return (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
            {section.items?.map((item, i) => {
              // Handle both string[] and KeyValueItem[] formats
              // Support both label and key fields (API flexibility)
              const displayText = typeof item === 'string' 
                ? item 
                : ((item as KeyValueItem).label || (item as KeyValueItem).key)
                  ? ((item as KeyValueItem).value 
                      ? `${(item as KeyValueItem).label || (item as KeyValueItem).key}: ${(item as KeyValueItem).value}` 
                      : ((item as KeyValueItem).label || (item as KeyValueItem).key))
                  : String(item);
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                  <span className="text-foreground">{displayText}</span>
                </li>
              );
            })}
          </ul>
        );

      case 'key-value':
        const kvItems = section.items as KeyValueItem[];
        return (
          <dl className="space-y-2">
            {kvItems?.map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:gap-2 py-1 border-b border-border/30 last:border-0">
                <dt className="font-medium text-sm text-foreground min-w-[160px] flex-shrink-0">
                  {item.label || item.key}:
                </dt>
                <dd className="text-sm text-muted-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        );

      case 'table':
        // Support both columns-based tables and key-value item tables
        if (section.columns && section.columns.length > 0) {
          // Full table with column headers (dokümantasyondaki format)
          const tableData = section.items as unknown as Record<string, string>[];
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {section.columns.map((col, ci) => (
                      <th key={ci} className="py-2 px-2 text-left font-semibold text-foreground bg-muted/50">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData?.map((row, ri) => (
                    <tr key={ri} className="border-b border-border/30 last:border-0">
                      {section.columns!.map((col, ci) => (
                        <td key={ci} className="py-2 px-2 text-muted-foreground">
                          {row[col] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        
        // Fallback: key-value style table items
        const tableItems = section.items as KeyValueItem[];
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {tableItems?.map((item, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">
                      {item.label || item.key}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {item.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'warning':
        return (
          <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {contentText}
            </p>
          </div>
        );

      case 'info':
        return (
          <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {contentText}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">
              {contentText}
            </p>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            {contentText}
          </p>
        );
    }
  };

  // Warning/Info/Success için farklı variant kullan
  const isAlertType = ['warning', 'info', 'success'].includes(section.type);

  return (
    <motion.div 
      className="space-y-2"
      variants={isAlertType ? alertVariants : sectionVariants}
    >
      {section.title && (
        <h4 className="font-semibold text-primary text-sm border-b border-primary/20 pb-1">
          {section.title}
        </h4>
      )}
      {renderContent()}
    </motion.div>
  );
}

interface StructuredResponseRendererProps {
  response: StructuredAPIResponse;
  className?: string;
}

export function StructuredResponseRenderer({ response, className }: StructuredResponseRendererProps) {
  // Helper: Ensure value is string for ReactMarkdown
  const ensureString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    return JSON.stringify(val);
  };

  // Markdown components for summary rendering
  const summaryMarkdownComponents = {
    p: ({ children }: any) => <span>{children}</span>,
    strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    a: ({ href, children }: any) => (
      <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc ml-4 my-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-4 my-2">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
  };

  // Handle string content - render with markdown
  if (typeof response.content === 'string') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="text-sm font-medium text-foreground leading-relaxed">
          <ReactMarkdown components={summaryMarkdownComponents}>
            {response.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // Handle markdown type - should be handled elsewhere
  if (response.type === 'markdown') {
    return null;
  }

  const content = response.content as StructuredContent;

  // Handle case where content is null/undefined
  if (!content) {
    return null;
  }

  // Ensure summary is a string
  const summaryText = ensureString(content.summary);

  // Comparative mod için özel render
  const isComparative = response.mode === 'comparative';

  return (
    <motion.div 
      className={cn('space-y-4', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Summary - fade in */}
      {summaryText && (
        <motion.div 
          variants={sectionVariants}
          className="text-sm font-medium text-foreground leading-relaxed"
        >
          <ReactMarkdown components={summaryMarkdownComponents}>
            {summaryText}
          </ReactMarkdown>
        </motion.div>
      )}

      {/* Winner Badge - comparative mod */}
      {isComparative && content.winner && (
        <motion.div 
          variants={alertVariants}
          className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30"
        >
          <span className="text-lg">🏆</span>
          <span className="text-sm font-semibold text-primary">
            Önerilen: {content.winner}
          </span>
        </motion.div>
      )}

      {/* Comparison Table - comparative mod */}
      {isComparative && content.comparison_table && (
        <motion.div 
          variants={sectionVariants}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {content.comparison_table.columns.map((col, ci) => (
                  <th 
                    key={ci} 
                    className="py-2 px-3 text-left font-semibold text-foreground bg-muted/50"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.comparison_table.items.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30 last:border-0">
                  {content.comparison_table!.columns.map((col, ci) => (
                    <td 
                      key={ci} 
                      className={cn(
                        "py-2 px-3",
                        ci === 0 ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {row[col] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Sections - staggered reveal */}
      {content.sections?.map((section, idx) => (
        <SectionRenderer key={idx} section={section} index={idx} />
      ))}
    </motion.div>
  );
}

// =================== FOLLOW-UP QUESTION RENDERER ===================

interface FollowUpRendererProps {
  followUp: FollowUpConfig;
}

export function FollowUpRenderer({ followUp }: FollowUpRendererProps) {
  return (
    <motion.div 
      className="mt-3 pt-3 border-t border-border/40"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: 0.3,  // Diğer içeriklerden sonra
        type: 'spring',
        stiffness: 120,
        damping: 15
      }}
    >
      <div className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 
                      border-2 border-primary/40 p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 
                          flex items-center justify-center ring-2 ring-primary/30">
            <Info className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">
              Devam Etmek İçin
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {followUp.question}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =================== PROGRESS RENDERER ===================

interface ProgressRendererProps {
  progress: ProgressConfig;
}

export function ProgressRenderer({ progress }: ProgressRendererProps) {
  const steps = [
    { key: 'sector', label: 'Sektör', icon: '🏭', value: progress.sector },
    { key: 'province', label: 'İl', icon: '🗺️', value: progress.province },
    { key: 'district', label: 'İlçe', icon: '📍', value: progress.district },
    { key: 'osb_status', label: 'OSB', icon: '🏗️', value: progress.osb_status },
  ];

  return (
    <motion.div 
      className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg mb-4 border border-primary/10"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium w-full sm:w-auto">
        <span>Teşvik Hesaplama:</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {steps.map((step, i) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: i * 0.08,  // Her step 80ms arayla
              type: 'spring',
              stiffness: 200,
              damping: 15
            }}
            layout  // Layout değişikliklerinde smooth geçiş
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-all',
              step.value
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground border border-border'
            )}
          >
            <span>{step.icon}</span>
            <span className="font-medium">{step.label}</span>
            {step.value && (
              <motion.span 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] opacity-80 max-w-[80px] truncate"
              >
                ({step.value})
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
      {progress.completed && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-700 border border-green-500/30"
        >
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-medium">Tamamlandı</span>
        </motion.div>
      )}
    </motion.div>
  );
}

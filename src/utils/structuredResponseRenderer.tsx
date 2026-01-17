/**
 * Structured Response Renderer
 * 
 * API'den gelen structured JSON yanıtlarını parse eder ve render eder.
 * Markdown parsing sorunlarını tamamen ortadan kaldırır.
 */

import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =================== TYPE DEFINITIONS ===================

export type SectionType = 'paragraph' | 'list' | 'key-value' | 'table' | 'warning' | 'info' | 'success';

export interface KeyValueItem {
  label: string;
  value: string;
}

export interface StructuredSection {
  title?: string;
  type: SectionType;
  content?: string;
  items?: string[] | KeyValueItem[];
}

export interface StructuredContent {
  summary: string;
  sections: StructuredSection[];
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
}

export interface FollowUpConfig {
  question: string;
  field?: string;
}

export interface ProgressConfig {
  sector: string | null;
  province: string | null;
  district: string | null;
  osb_status: string | null;
  currentStep: number;
  totalSteps: number;
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
  mode?: 'informative' | 'interactive' | 'result';
  content: StructuredContent | string;
  interaction?: InteractionConfig;
  followUp?: FollowUpConfig;
  progress?: ProgressConfig;
  sources?: SourceItem[];
  supportPrograms?: SupportProgramItem[];
}

// =================== PARSER FUNCTIONS ===================

/**
 * API yanıtını parse et - structured veya markdown olabilir
 */
export function parseAPIResponse(data: any): StructuredAPIResponse {
  // Eğer data string ise, eski format (raw text)
  if (typeof data === 'string') {
    return {
      type: 'markdown',
      content: data,
    };
  }

  // Eğer data.type === 'structured' ve content.sections varsa
  if (data?.type === 'structured' && data?.content?.sections) {
    return data as StructuredAPIResponse;
  }

  // Eğer doğrudan content.sections varsa (type belirtilmemiş)
  if (data?.content?.sections && Array.isArray(data.content.sections)) {
    return {
      type: 'structured',
      mode: data.mode || 'informative',
      content: data.content,
      interaction: data.interaction,
      followUp: data.followUp,
      progress: data.progress,
      sources: data.sources,
      supportPrograms: data.supportPrograms,
    };
  }

  // Fallback: text varsa markdown olarak işle
  if (data?.text) {
    return {
      type: 'markdown',
      content: data.text,
      sources: data.sources,
    };
  }

  // Son çare: doğrudan content string olarak al
  return {
    type: 'markdown',
    content: typeof data?.content === 'string' ? data.content : '',
    sources: data?.sources,
  };
}

/**
 * Message content'ini structured response olarak parse etmeye çalış
 * Hem çıplak JSON hem de ```json ... ``` kod bloğu içindeki JSON'u destekler
 */
export function tryParseStructuredContent(content: string): StructuredAPIResponse | null {
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
      
      // Structured format mı kontrol et
      if (parsed.type === 'structured' || parsed.content?.sections) {
        return parseAPIResponse(parsed);
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
  const renderContent = () => {
    switch (section.type) {
      case 'paragraph':
        return (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {section.content}
          </p>
        );

      case 'list':
        return (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
            {section.items?.map((item, i) => {
              // Handle both string[] and KeyValueItem[] formats
              const displayText = typeof item === 'string' 
                ? item 
                : (item as KeyValueItem).label 
                  ? `${(item as KeyValueItem).label}: ${(item as KeyValueItem).value}`
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
                  {item.label}:
                </dt>
                <dd className="text-sm text-muted-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        );

      case 'table':
        const tableItems = section.items as KeyValueItem[];
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {tableItems?.map((item, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">
                      {item.label}
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
              {section.content}
            </p>
          </div>
        );

      case 'info':
        return (
          <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {section.content}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">
              {section.content}
            </p>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            {section.content}
          </p>
        );
    }
  };

  return (
    <div className="space-y-2">
      {section.title && (
        <h4 className="font-semibold text-primary text-sm border-b border-primary/20 pb-1">
          {section.title}
        </h4>
      )}
      {renderContent()}
    </div>
  );
}

interface StructuredResponseRendererProps {
  response: StructuredAPIResponse;
  className?: string;
}

export function StructuredResponseRenderer({ response, className }: StructuredResponseRendererProps) {
  // Handle string content - render as simple text
  if (typeof response.content === 'string') {
    return (
      <div className={cn('space-y-4', className)}>
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {response.content}
        </p>
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      {content.summary && (
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {content.summary}
        </p>
      )}

      {/* Sections */}
      {content.sections?.map((section, idx) => (
        <SectionRenderer key={idx} section={section} index={idx} />
      ))}
    </div>
  );
}

// =================== FOLLOW-UP QUESTION RENDERER ===================

interface FollowUpRendererProps {
  followUp: FollowUpConfig;
}

export function FollowUpRenderer({ followUp }: FollowUpRendererProps) {
  return (
    <div className="mt-3 pt-3 border-t border-border/40">
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
    </div>
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
    <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg mb-4 border border-primary/10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium w-full sm:w-auto">
        <span>Teşvik Hesaplama:</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {steps.map((step) => (
          <div
            key={step.key}
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
              <span className="text-[10px] opacity-80 max-w-[80px] truncate">
                ({step.value})
              </span>
            )}
          </div>
        ))}
      </div>
      {progress.completed && (
        <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-700 border border-green-500/30">
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-medium">Tamamlandı</span>
        </div>
      )}
    </div>
  );
}

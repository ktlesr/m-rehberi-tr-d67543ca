/**
 * Utility functions to normalize message history for LLM API calls
 * Prevents token overflow by converting structured JSON to concise summaries
 */

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StructuredContent {
  type?: string;
  mode?: string;
  content?: {
    summary?: string;
    header?: {
      sector?: string;
      province?: string;
      district?: string;
      osb_status?: string;
      nace_code?: string;
    };
    interaction?: {
      question?: string;
      options?: Array<{ label: string; value: string }>;
    };
    progress?: {
      steps?: Array<{ label: string; status: string }>;
    };
    sections?: Array<{ title?: string; content?: string }>;
  };
  sources?: unknown[];
  groundingChunks?: unknown[];
  supportCards?: unknown[];
}

/**
 * Try to parse content as structured JSON
 */
function tryParseStructured(content: string): StructuredContent | null {
  if (!content || typeof content !== 'string') return null;
  
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && (parsed.type || parsed.content)) {
      return parsed as StructuredContent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert structured content to a concise text summary for LLM context
 */
function structuredToSummary(structured: StructuredContent): string {
  const parts: string[] = [];
  
  // Add summary if available
  if (structured.content?.summary) {
    parts.push(structured.content.summary);
  }
  
  // Add header info (sector, province, district, OSB)
  const header = structured.content?.header;
  if (header) {
    const headerParts: string[] = [];
    if (header.sector) headerParts.push(`Sektör: ${header.sector}`);
    if (header.province) headerParts.push(`İl: ${header.province}`);
    if (header.district) headerParts.push(`İlçe: ${header.district}`);
    if (header.osb_status) headerParts.push(`OSB: ${header.osb_status}`);
    if (header.nace_code) headerParts.push(`NACE: ${header.nace_code}`);
    if (headerParts.length > 0) {
      parts.push(headerParts.join(', '));
    }
  }
  
  // Add interaction question if available
  if (structured.content?.interaction?.question) {
    parts.push(`Soru: ${structured.content.interaction.question}`);
  }
  
  // Add progress info if available
  const progress = structured.content?.progress?.steps;
  if (progress && Array.isArray(progress)) {
    const completed = progress.filter(s => s.status === 'completed').map(s => s.label);
    if (completed.length > 0) {
      parts.push(`Tamamlanan: ${completed.join(', ')}`);
    }
  }
  
  // If we have sections, add a brief note
  if (structured.content?.sections && Array.isArray(structured.content.sections)) {
    const sectionTitles = structured.content.sections
      .slice(0, 3)
      .map(s => s.title)
      .filter(Boolean);
    if (sectionTitles.length > 0) {
      parts.push(`Bölümler: ${sectionTitles.join(', ')}`);
    }
  }
  
  // Return summary or a default
  return parts.length > 0 ? parts.join('. ') : '[Asistan yanıtı]';
}

/**
 * Normalize a single message content for LLM
 */
function normalizeMessageContent(content: string, maxLength: number = 1500): string {
  if (!content) return '';
  
  const structured = tryParseStructured(content);
  if (structured) {
    return structuredToSummary(structured);
  }
  
  // For plain text, just truncate if too long
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '...';
  }
  
  return content;
}

/**
 * Build normalized message array for LLM API calls
 * - Limits history to last N messages
 * - Converts structured JSON to concise summaries
 * - Removes sources, groundingChunks, supportCards
 */
export function buildLLMMessages(
  messages: Message[],
  maxMessages: number = 12,
  maxContentLength: number = 1500
): Message[] {
  if (!messages || !Array.isArray(messages)) return [];
  
  // Take last N messages
  const recentMessages = messages.slice(-maxMessages);
  
  return recentMessages.map(msg => ({
    role: msg.role,
    content: msg.role === 'assistant' 
      ? normalizeMessageContent(msg.content, maxContentLength)
      : (msg.content?.length > maxContentLength 
          ? msg.content.substring(0, maxContentLength) + '...' 
          : msg.content || '')
  }));
}

/**
 * Build messages specifically for Vertex RAG API (more aggressive truncation)
 */
export function buildVertexMessages(
  messages: Message[],
  maxMessages: number = 8,
  maxContentLength: number = 2000
): Message[] {
  return buildLLMMessages(messages, maxMessages, maxContentLength);
}

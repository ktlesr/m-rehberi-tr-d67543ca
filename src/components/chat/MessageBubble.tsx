import { Bot, User } from "lucide-react";
import { MessageActions } from "./MessageActions";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SupportProgramCard, SupportProgramCardData } from "./SupportProgramCard";
import { FollowUpQuestionCard } from "./FollowUpQuestionCard";
import { extractFollowUpQuestion } from "@/utils/followUpQuestionParser";
import { preprocessMarkdown, markdownComponents } from "@/utils/markdownProcessor";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | number;
  onRegenerate?: () => void;
  children?: React.ReactNode;
  sources?: Array<{
    title: string;
    uri?: string;
    snippet?: string;
    text?: string;
    index?: number;
  }>;
  supportCards?: SupportProgramCardData[];
}

export function MessageBubble({
  role,
  content,
  timestamp,
  onRegenerate,
  children,
  sources,
  supportCards,
}: MessageBubbleProps) {
  const isUser = role === "user";

  // Takip sorusunu ve destek programı bildirimini ana içerikten ayır
  const { mainContent, followUpQuestion, supportCardsNotice } = isUser
    ? { mainContent: content, followUpQuestion: null, supportCardsNotice: null }
    : extractFollowUpQuestion(content);

  if (role === "assistant") {
    console.log("SOURCES FOR MESSAGE:", { content: content.slice(0, 60), sources });
  }
  const formatTime = (date: string | number) => {
    const ts = typeof date === "number" ? date : date;
    return new Date(ts).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- İçerik + Atıf Baloncukları ---
  const renderContentWithCitations = () => {
    const processedContent = preprocessMarkdown(mainContent);

    if (!sources || sources.length === 0 || isUser) {
      return <ReactMarkdown components={markdownComponents}>{processedContent}</ReactMarkdown>;
    }

    const citationMap = new Map<string, JSX.Element[]>();
    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    let match: RegExpExecArray | null;
    let citationKey = 0;

    while ((match = citationRegex.exec(content)) !== null) {
      const [fullMatch, indexStr] = match;
      const indices = indexStr.split(/,\s*/).map((s) => parseInt(s.trim(), 10));

      const badges = indices
        .map((index) => {
          const source = sources.find((s) => s.index === index);
          if (!source) return null;

          return (
            <HoverCard key={`citation-${citationKey++}`}>
              <HoverCardTrigger asChild>
                <sup className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold cursor-help mx-0.5 shadow-sm border border-primary/60">
                  {index}
                </sup>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="center" className="w-full max-w-[90vw] sm:w-80 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground line-clamp-2">{source.title}</p>
                  {source.uri && (
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline whitespace-nowrap"
                    >
                      Aç
                    </a>
                  )}
                </div>
                {(source.snippet || source.text) && (
                  <p className="text-muted-foreground leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {source.snippet || source.text}
                  </p>
                )}
              </HoverCardContent>
            </HoverCard>
          );
        })
        .filter(Boolean) as JSX.Element[];

      if (badges.length > 0) {
        citationMap.set(fullMatch, badges);
      }
    }

    const components = {
      ...markdownComponents,
      p: ({ children, ...props }: any) => {
        const processed = processTextWithCitations(children, citationMap);
        return (
          <p className="mb-2 last:mb-0" {...props}>
            {processed}
          </p>
        );
      },
      li: ({ children, ...props }: any) => {
        const processed = processTextWithCitations(children, citationMap);
        return (
          <li className="mb-1" {...props}>
            {processed}
          </li>
        );
      },
    };

    return <ReactMarkdown components={components}>{processedContent}</ReactMarkdown>;
  };

  // --- Alt kısım: Kullanılan Kaynaklar (chip'ler) ---
  const renderSourceSummary = () => {
    if (!sources || sources.length === 0 || isUser) return null;

    // Kaynakları index'e göre sırala (index yoksa dizideki sırayı kullan)
    const sorted = [...sources].sort((a, b) => {
      const ai = a.index ?? 0;
      const bi = b.index ?? 0;
      return ai - bi;
    });

    // Aynı başlık + uri olanları grupla
    type Group = { title: string; uri?: string; indices: number[] };
    const grouped = new Map<string, Group>();

    sorted.forEach((s, i) => {
      const key = `${s.title}__${s.uri ?? ""}`;
      const g = grouped.get(key) ?? { title: s.title, uri: s.uri, indices: [] };
      if (typeof s.index === "number") g.indices.push(s.index);
      grouped.set(key, g);
    });

    const groups = Array.from(grouped.values());
    const total = groups.length;

    return (
      <div className="mt-2 rounded-xl bg-muted/40 border border-border/40 px-2.5 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            KULLANILAN KAYNAKLAR ({total})
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g, i) => {
            const chip = (
              <div className="inline-flex items-center gap-1 rounded-full bg-background/80 border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-background cursor-pointer max-w-full">
                {/* Numara */}
                <span className="inline-flex justify-center items-center w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground">
                  {i + 1}
                </span>
                {/* Dosya adı */}
                <span className="font-medium truncate max-w-[150px]">{g.title}</span>
              </div>
            );

            return g.uri ? (
              <a key={i} href={g.uri} target="_blank" rel="noopener noreferrer" className="no-underline">
                {chip}
              </a>
            ) : (
              <div key={i}>{chip}</div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex gap-2 md:gap-3 group px-2 md:px-0", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="hidden md:flex flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 items-center justify-center shadow-sm">
          <Bot className="h-5 w-5 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1.5 md:gap-2 max-w-[92%] sm:max-w-[80%] md:max-w-[75%]",
          isUser && "items-end",
        )}
      >
        {/* Balon */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2.5 md:px-4 md:py-3 shadow-sm border backdrop-blur",
            isUser ? "bg-primary/5 text-primary border-primary/8" : "bg-card/95 text-card-foreground border-border/60",
          )}
        >
          {/* Başlık (Asistan / Siz) + Saat */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
              {isUser ? "Siz" : "Asistan"}
            </span>
            {timestamp && <span className="text-[11px] text-muted-foreground">{formatTime(timestamp)}</span>}
          </div>

          {/* Metin */}
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm break-words">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert break-words">
              {renderContentWithCitations()}
            </div>
          )}

          {/* Ek içerik (progress, ekstra info vs.) */}
          {children}

          {/* Takip Sorusu Kartı (soru veya bildirim varsa göster) */}
          {!isUser && (followUpQuestion || supportCardsNotice) && (
            <FollowUpQuestionCard 
              question={followUpQuestion}
              supportCardsNotice={supportCardsNotice}
            />
          )}

          {/* Kullanılan Kaynaklar chip'leri */}
          {renderSourceSummary()}

          {/* Alt bar: aksiyonlar */}
          <div className="mt-2 pt-1 border-t border-border/40 flex justify-end">
            <MessageActions content={content} isAssistant={!isUser} onRegenerate={onRegenerate} />
          </div>
        </div>

        {/* Support Program Cards - dışarıda göster */}
        {!isUser && supportCards && supportCards.length > 0 && (
          <div className="grid gap-3 mt-2 w-full">
            {supportCards.map((card) => (
              <SupportProgramCard key={card.id} data={card} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <User className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}


function processTextWithCitations(children: any, citationMap: Map<string, JSX.Element[]>): any {
  if (typeof children === "string") {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    const regex = /\[(\d+(?:,\s*\d+)*)\]/g;
    let textMatch: RegExpExecArray | null;

    while ((textMatch = regex.exec(children)) !== null) {
      if (textMatch.index > lastIndex) {
        parts.push(children.slice(lastIndex, textMatch.index));
      }

      const badges = citationMap.get(textMatch[0]);
      if (badges && badges.length > 0) {
        parts.push(...badges);
      } else {
        parts.push(textMatch[0]);
      }

      lastIndex = textMatch.index + textMatch[0].length;
    }

    if (lastIndex < children.length) {
      parts.push(children.slice(lastIndex));
    }

    return parts.length > 0 ? parts : children;
  } else if (Array.isArray(children)) {
    return children.map((child) => (typeof child === "string" ? processTextWithCitations(child, citationMap) : child));
  }
  return children;
}

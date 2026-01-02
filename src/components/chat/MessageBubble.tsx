import { Bot, User } from "lucide-react";
import { MessageActions } from "./MessageActions";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SupportProgramCard, SupportProgramCardData } from "./SupportProgramCard";
import { FollowUpQuestionCard } from "./FollowUpQuestionCard";
import { extractFollowUpQuestion } from "@/utils/followUpQuestionParser";

// Markdown içeriğini düzgün formatlama için ön işleme
const preprocessMarkdown = (content: string): string => {
  return (
    content
      // ========== BOZUK BOLD TAG DÜZELTMELERİ (ÖNCELİKLİ) ==========
      // A1. "**text: **" → "**text:** " (boşluk kapatmadan önce)
      .replace(/\*\*([^*]+?):\s*\*\*/g, "**$1:** ")

      // A2. "**text:**value" → "**text:** value" (iki nokta sonrası boşluk yok)
      .replace(/\*\*([^*]+):\*\*(\S)/g, "**$1:** $2")

      // A3. Tek başına açık "**" işaretlerini kaldır (kapatılmamış)
      .replace(/\*\*([^*\n]{3,50}[^*\s])(?!\*\*)/g, (match, p1) => {
        // Eğer satırda başka ** yoksa, bu orphan bir açılış
        if (!p1.includes("**")) return p1;
        return match;
      })

      // A4. Satır sonundaki yalnız "**" kaldır
      .replace(/\*\*\s*$/gm, "")

      // A5. Satır başındaki yalnız "**" kaldır
      .replace(/^\*\*\s+(?!\S+:)/gm, "")

      // A6. "text:**" → "text:" (sonundaki orphan **)
      .replace(/([^*]):\*\*(?!\s*\S)/g, "$1:")

      // ========== BAŞLIKLARI AYRI SATIRA AL ==========
      // B1. "**Başlık:** değer **Başlık2:**" → araya paragraf kır
      .replace(/(\*\*[^*]+:\*\*)\s*([^:\n]{2,120})\s+(\*\*[^*]+:\*\*)/g, "$1 $2\n\n$3")

      // B2. "**Başlık:** değer Başlık2:" → araya paragraf kır + ikinci başlığı kalınlaştır
      .replace(
        /(\*\*[^*]+:\*\*)\s*([^:\n]{2,120})\s+((?:NACE Kodu|Ana Sektör Tanımı|Alt Sektör Tanımı|Sektör Tanımı|Teşvik Statüsü|Yatırım Konusu|Lokasyon|Uygulanan Program|Yerel Kalkınma Hamlesi|Teknoloji Hamlesi Programı|Özel Şartlar):)/gim,
        "$1 $2\n\n**$3** ",
      )

      // 0. Satır sonundaki "**soru?** ---?" formatını temizle (takip sorusu kalıntısı)
      .replace(/\*\*([^*]+\?)\*\*\s*(?:---\?)?\s*$/g, "\n\n$1")

      // 1. TEK SATIR SONU + BOLD BAŞLIK -> ÇİFT SATIR SONU (EN KRİTİK)
      .replace(/\n(\*\*[^*:]+:\*\*)/g, "\n\n$1")

      // 2. SATIR İÇİ BOLD BAŞLIKLARDAN ÖNCE ÇİFT SATIR SONU (karakter + bold)
      .replace(/([^\n\s])(\s*)(\*\*[^*:]+:\*\*)/g, "$1\n\n$3")

      // 3. "Sektör Analizi:" gibi düz başlıklardan sonra çift satır sonu
      .replace(/(Sektör Analizi:|Yatırım Teşvik Analiz Raporu)(\s*)/g, "$1\n\n")

      // 4. Bold başlık içeren liste öğelerinden bullet'ı kaldır (* **Label:** veya - **Label:**)
      .replace(/^[\*\-]\s+(\*\*[^*]+:\*\*)/gm, "$1")
      .replace(/\n[\*\-]\s+(\*\*[^*]+:\*\*)/g, "\n\n$1")

      // 5. ### başlıklarından önce çift satır sonu
      .replace(/([^\n])(###)/g, "$1\n\n$2")

      // 6. Numaralı liste öğeleri öncesinde satır sonu
      .replace(/([.!?])\s+(\d+)\.\s+/g, "$1\n\n$2. ")

      // ========== DÜZ METİN BAŞLIKLARINI FORMAT ===============
      // 7. Satır içi ardışık "Başlık: değer Başlık2: değer2" kalıplarını ayır
      .replace(
        /(:)\s*([^:\n]{2,50})\s+((?:NACE|Sektör|Teşvik|Yatırım|Lokasyon|Program|Bölge|KDV|Gümrük|Vergi|Sigorta|Faiz|Makine|Asgari|OSB|İl|Ana|Alt|Hedef|Öncelikli|Uygulanan|İşletme|Sabit|Minimum|Yerel|Teknoloji|Özel)[^:]*:)/gi,
        "$1 $2\n\n**$3**",
      )

      // 8. Satır başındaki düz metin başlıkları bold yap (eğer bold değilse)
      .replace(
        /^((?:NACE Kodu|Ana Sektör Tanımı|Alt Sektör Tanımı|Sektör Tanımı|Teşvik Statüsü|Yatırım Konusu|Lokasyon|Uygulanan Program|Bölge|İl|KDV İstisnası|Gümrük Muafiyeti|Vergi İndirimi|Sigorta Primi|Faiz Desteği|Makine Teçhizat|Asgari Yatırım|OSB Durumu|Hedef Yatırım|Öncelikli Yatırım|İşletme Büyüklüğü|Sabit Yatırım Tutarı|Minimum Yatırım|Yerel Kalkınma Hamlesi|Teknoloji Hamlesi Programı|Özel Şartlar):)(\s)/gim,
        "**$1**$2",
      )

      // 9. Paragraf içi düz başlıkların önüne satır sonu ekle
      .replace(
        /([.!?)\]0-9])\s+((?:NACE Kodu|Ana Sektör|Alt Sektör|Sektör Tanımı|Teşvik Statüsü|Yatırım Konusu|Lokasyon|Uygulanan Program|Bölge|İl|KDV|Gümrük|Vergi|Sigorta|Faiz|Makine|Asgari|OSB|Hedef|Öncelikli|Yerel|Teknoloji|Özel)[^:]*:)/gi,
        "$1\n\n**$2**",
      )

      // 10. Inline asterisk'leri yeni satıra taşı (": * item" veya ". * item")
      .replace(/:\s*\*\s+([^\n*])/g, ":\n\n* $1")
      .replace(/\.\s*\*\s+([^\n*])/g, ".\n\n* $1")

      // 11. Çift boşlukları temizle (3+ -> 2)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
};

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
      return <ReactMarkdown components={markdownComponentsBase}>{processedContent}</ReactMarkdown>;
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
      ...markdownComponentsBase,
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

/* Ortak markdown renderer ayarları */
const markdownComponentsBase = {
  a: ({ node, ...props }: any) => (
    <a {...props} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" />
  ),
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <code className={cn("block bg-muted p-3 rounded-lg my-2 text-xs overflow-x-auto", className)} {...props}>
        {children}
      </code>
    ) : (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
        {children}
      </code>
    );
  },
  p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="mb-3 space-y-1" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="mb-3 space-y-1" {...props} />,
  li: ({ node, children, ...props }: any) => {
    // Check if this li contains a strong/bold element as the first child (header-like item)
    const childArray = Array.isArray(children) ? children : [children];
    const firstChild = childArray[0];
    const hasBoldHeader =
      firstChild?.type === "strong" ||
      (typeof firstChild === "object" && firstChild?.props?.children?.[0]?.type === "strong");

    // If it has a bold header, render without bullet (cleaner look)
    if (hasBoldHeader) {
      return (
        <li className="mb-2 list-none" {...props}>
          {children}
        </li>
      );
    }

    // Regular list item with bullet
    return (
      <li className="mb-1 ml-4 list-disc" {...props}>
        {children}
      </li>
    );
  },
  strong: ({ node, children, ...props }: any) => {
    // Extract text content from children
    const getText = (child: any): string => {
      if (typeof child === "string") return child;
      if (Array.isArray(child)) return child.map(getText).join("");
      if (child?.props?.children) return getText(child.props.children);
      return "";
    };

    const text = getText(children);

    // If content has colon, only bold the label part (before colon)
    if (text.includes(":")) {
      const colonIndex = text.indexOf(":");
      const label = text.substring(0, colonIndex + 1);
      const rest = text.substring(colonIndex + 1);

      return (
        <>
          <strong className="font-semibold text-foreground">{label}</strong>
          <span className="font-normal">{rest}</span>
        </>
      );
    }

    return <strong className="font-semibold text-foreground" {...props} />;
  },
};

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

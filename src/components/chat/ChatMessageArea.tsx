import React, { useState, useEffect, useRef } from "react";
import { ArrowDown, Bot } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChatSession";
import { Button } from "@/components/ui/button";
import { IncentiveProgressBadge } from "./IncentiveProgressBadge";
import { MessageBubble } from "./MessageBubble";
import { supabase } from "@/integrations/supabase/client";
import { useChatbotSettings } from "@/hooks/useChatbotSettings";

interface ChatMessageAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  currentSuggestion?: string;
  onSuggestionClick?: (suggestion: string) => void;
  isGeneratingQuestions?: boolean;
  activeSessionId?: string | null;
  onRegenerateMessage?: (index: number) => void;
  onInteractiveSubmit?: (value: string) => void;
}

// Typing dots animation
const TypingDots = () => (
  <div className="flex gap-1 p-3">
    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
  </div>
);

export function ChatMessageArea({
  messages,
  isLoading,
  currentSuggestion,
  onSuggestionClick,
  isGeneratingQuestions,
  activeSessionId,
  onRegenerateMessage,
  onInteractiveSubmit,
}: ChatMessageAreaProps) {
  const { showSources } = useChatbotSettings();
  const [incentiveProgress, setIncentiveProgress] = useState<any>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Helper to strip citation markers from content
  const cleanCitations = (text: string): string => {
    return text
      .replace(/\[(\d+(?:,\s*\d+)*)\]/g, '') // Remove [1], [2, 3] etc.
      .replace(/\s{2,}/g, ' ') // Clean up extra spaces
      .trim();
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages]);

  // Load incentive query progress
  useEffect(() => {
    if (!activeSessionId) {
      setIncentiveProgress(null);
      return;
    }

    const loadProgress = async () => {
      try {
        const { data, error } = await supabase
          .from("incentive_queries")
          .select("*")
          .eq("session_id", activeSessionId)
          .eq("status", "collecting")
          .maybeSingle();

        if (!error) setIncentiveProgress(data);
        else setIncentiveProgress(null);
      } catch (error) {
        console.error("Error loading incentive progress:", error);
      }
    };

    loadProgress();

    const channel = supabase
      .channel(`incentive-progress-${activeSessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incentive_queries", filter: `session_id=eq.${activeSessionId}` },
        (payload) => {
          if (payload.new && (payload.new as any).status === "collecting") {
            setIncentiveProgress(payload.new);
          } else if (payload.eventType === "DELETE") {
            setIncentiveProgress(null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      role="log"
      aria-live="polite"
      aria-label="Sohbet mesajları"
    >
      <div className="p-4 pb-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Show incentive progress if active */}
          {incentiveProgress && <IncentiveProgressBadge progress={incentiveProgress} />}

          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
              <div className="max-w-2xl w-full text-center space-y-8">
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold">Nasıl yardımcı olabilirim?</h2>
                  <p className="text-muted-foreground text-lg">
                    Yatırım teşvikleri, destek programları ve mevzuat hakkında sorularınızı cevaplayabilirim.
                  </p>
                </div>

                {/* Rotating Suggestion */}
                <div className="min-h-[4rem] flex items-center justify-center">
                  {isGeneratingQuestions ? (
                    <div className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" aria-hidden="true" />
                      <span className="text-sm">Örnek sorular hazırlanıyor...</span>
                    </div>
                  ) : currentSuggestion && !isLoading ? (
                    <button
                      onClick={() => onSuggestionClick?.(currentSuggestion)}
                      className="group relative px-6 py-3 rounded-full border border-primary/20 
                                 bg-primary/5 hover:bg-primary/10 hover:border-primary/40
                                 transition-all duration-200 shadow-sm hover:shadow-md
                                 max-w-xl w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label={`Örnek soru: ${currentSuggestion}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Örnek soru:</span>
                        <span className="text-sm font-medium text-foreground">"{currentSuggestion}"</span>
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* MESAJ LİSTESİ */}
          {messages.map((message, index) => {
            // 1. API'den gelen veriyi parçala (Metin + Metadata)
            const parts = message.content.split("__METADATA__");
            const cleanContent = parts[0];
            let extractedSources: any[] = [];

            // 2. Metadata varsa JSON'a çevir
            if (parts.length > 1) {
              try {
                extractedSources = JSON.parse(parts[1]);
              } catch (e) {
                console.error("Metadata parse error", e);
              }
            }

            // 3. Öncelik sırası: Mesajın kendi source'u > Çıkarılan source
            const finalSources = message.sources && message.sources.length > 0 ? message.sources : extractedSources;

            // 4. If showSources is disabled, clean citations from content and don't pass sources
            const displayContent = showSources ? cleanContent : cleanCitations(cleanContent);
            const displaySources = showSources ? finalSources : [];

            return (
              <MessageBubble
                key={`msg-${index}-${message.timestamp || ""}`}
                role={message.role}
                content={displayContent}
                timestamp={message.timestamp}
                sources={displaySources}
                supportCards={isLoading && index === messages.length - 1 ? undefined : message.supportCards}
                structuredResponse={message.structuredResponse}
                onInteractiveSubmit={onInteractiveSubmit}
                interactiveDisabled={isLoading || index !== messages.length - 1}
                onRegenerate={
                  message.role === "assistant" && index === messages.length - 1
                    ? () => onRegenerateMessage?.(index)
                    : undefined
                }
              />
            );
          })}

          {isLoading && (
            <div className="flex gap-3" role="status" aria-live="polite" aria-label="Yanıt hazırlanıyor">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="bg-muted/50 border border-border/50 rounded-2xl">
                <TypingDots />
              </div>
              <span className="sr-only">Yanıt hazırlanıyor, lütfen bekleyin...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="fixed bottom-24 right-8">
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="rounded-full shadow-lg h-10 w-10"
              aria-label="Sohbetin sonuna git"
            >
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

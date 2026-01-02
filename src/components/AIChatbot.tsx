import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { generateUUID } from "@/lib/uuid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  Send,
  X,
  Loader2,
  Sparkles,
  RotateCcw,
  Square,
  Trash2,
  Download,
  PlusCircle,
  History,
  Search,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  MessageSquare,
  FlaskConical,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getActiveStore, generateExampleQuestions } from "@/services/geminiRagService";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useChatbotStats } from "@/hooks/useChatbotStats";
import { useChatbotSettings } from "@/hooks/useChatbotSettings";
import { SupportProgramCard, type SupportProgramCardData } from "@/components/chat/SupportProgramCard";
import { extractFollowUpQuestion } from "@/utils/followUpQuestionParser";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
  supportCards?: SupportProgramCardData[];
}

interface ChatSession {
  session_id: string;
  title: string;
}

const BADGE_RE = /\[badge:\s*([^\|\]]+)\|([^\]]+)\]/gi;

function TypingDots() {
  return (
    <div className="flex gap-1 p-3">
      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
    </div>
  );
}

function renderContentWithBadges(content: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = BADGE_RE.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Rozetten önceki düz metin
    if (start > lastIndex) {
      const text = content.slice(lastIndex, start);
      nodes.push(
        <span key={`t-${lastIndex}`} className="whitespace-pre-wrap">
          {text}
        </span>,
      );
    }

    const label = match[1].trim();
    const hrefRaw = match[2].trim();
    const href = /^https?:\/\//i.test(hrefRaw) ? hrefRaw : "#";

    nodes.push(
      <a
        key={`b-${start}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block align-middle ml-2"
        aria-label={label}
      >
        <Badge className="cursor-pointer select-none">{label}</Badge>
      </a>,
    );

    lastIndex = end;
  }

  // Son rozetten sonra kalan metin
  if (lastIndex < content.length) {
    nodes.push(
      <span key={`t-${lastIndex}`} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>,
    );
  }

  return nodes;
}

// Markdown bileşenleri - asistan mesajları için formatlama
const markdownComponents = {
  p: ({ children, ...props }: any) => (
    <p className="mb-2 last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-2 space-y-1 pl-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-2 space-y-1 pl-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-sm leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: any) => {
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
          <strong className="font-semibold text-primary">{label}</strong>
          <span className="font-normal">{rest}</span>
        </>
      );
    }

    return (
      <strong className="font-semibold text-primary" {...props}>
        {children}
      </strong>
    );
  },
  a: ({ href, children, ...props }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props}>
      {children}
    </a>
  ),
  code: ({ children, ...props }: any) => (
    <code className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono" {...props}>
      {children}
    </code>
  ),
  h1: ({ children, ...props }: any) => (
    <h1 className="text-base font-bold mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-sm font-bold mb-2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-sm font-semibold mb-1" {...props}>
      {children}
    </h3>
  ),
};

// Markdown içeriğini düzgün formatlama için ön işleme
const preprocessMarkdown = (content: string): string => {
  return content
    // Bold başlık içeren liste öğelerinden bullet'ı kaldır (* **Label:** veya - **Label:**)
    .replace(/^[\*\-]\s+(\*\*[^*]+:\*\*)/gm, '$1')
    .replace(/\n[\*\-]\s+(\*\*[^*]+:\*\*)/g, '\n\n$1')
    // Liste işaretçileri öncesinde satır sonu ekle (* veya -)
    .replace(/([.!?:,])\s*(\*|\-)\s+(\*\*)/g, '$1\n\n$2 $3')
    // Numaralı liste öğeleri öncesinde satır sonu
    .replace(/([.!?:,])\s+(\d+)\.\s+(\*\*)/g, '$1\n\n$2. $3')
    // "Özel Durum:" gibi inline bold başlıklar için satır sonu
    .replace(/([.!?])\s+(\*\*[^*]+:\*\*)/g, '$1\n\n$2')
    // İç içe bold başlık + açıklama paterni (liste içinde)
    .replace(/(\*\*[^*:]+:\*\*[^.!?*]+[.!?])\s+(\*\*[^*]+:\*\*)/g, '$1\n\n$2')
    // Çift boşlukları temizle
    .replace(/\n{3,}/g, '\n\n');
};

function MessageBubble({ message, showSources }: { message: Message; showSources: boolean }) {
  const isUser = message.role === "user";
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({ lang: "tr-TR", rate: 0.9 });

  // Clean citations from content if showSources is disabled
  const cleanCitations = (text: string): string => {
    return text
      .replace(/\[(\d+(?:,\s*\d+)*)\]/g, "") // Remove [1], [2, 3] etc.
      .replace(/\s{2,}/g, " ") // Clean up extra spaces
      .trim();
  };

  const rawContent = showSources ? message.content : cleanCitations(message.content);

  // Takip sorusunu ayır (sadece asistan mesajları için)
  const { mainContent, followUpQuestion } = isUser
    ? { mainContent: rawContent, followUpQuestion: null }
    : extractFollowUpQuestion(rawContent);

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      const cleanText = mainContent
        .replace(/\[badge:[^\]]+\]/gi, "")
        .replace(/\[(\d+)\]/g, "")
        .replace(/[#*_`]/g, "")
        .replace(/\n+/g, ". ")
        .trim();
      speak(cleanText);
    }
  };

  // Takip Sorusu Kartı (floating widget için)
  const FollowUpCard = ({ question }: { question: string }) => (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div
        className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 
                      border-2 border-primary/40 p-3 shadow-sm"
      >
        <div className="flex items-start gap-2">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 
                          flex items-center justify-center ring-2 ring-primary/30"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Devam Etmek İçin</p>
            <p className="text-sm font-medium text-foreground leading-relaxed">{question}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-lg p-3 ${
            isUser ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted"
          }`}
        >
          <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
            {isUser ? (
              <span className="whitespace-pre-wrap">{mainContent}</span>
            ) : (
              <ReactMarkdown components={markdownComponents}>{preprocessMarkdown(mainContent)}</ReactMarkdown>
            )}
          </div>

          {/* Takip Sorusu Kartı */}
          {!isUser && followUpQuestion && <FollowUpCard question={followUpQuestion} />}

          {!isUser && isSupported && (
            <div className="mt-2 pt-1.5 border-t border-border/30 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs gap-1 ${isSpeaking ? "text-primary" : "text-muted-foreground"}`}
                onClick={handleSpeak}
              >
                {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isSpeaking ? "Durdur" : "Sesli Oku"}
              </Button>
            </div>
          )}
        </div>

        {!isUser && message.supportCards && message.supportCards.length > 0 && (
          <div className="grid gap-3 mt-2">
            {message.supportCards.map((card) => (
              <SupportProgramCard key={card.id} data={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIChatbot() {
  const location = useLocation();

  // Hide chatbot on the /chat page
  if (location.pathname === "/chat") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => generateUUID());
  const [activeStoreCache, setActiveStoreCache] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Merhaba! Size nasıl yardımcı olabilirim? Sorularınızı yanıtlamak için buradayım.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { trackUserMessage, trackAssistantMessage, trackNewSession, trackUniqueSession } = useChatbotStats();
  const { showSources } = useChatbotSettings();

  // Track widget open and unique session
  useEffect(() => {
    if (isOpen) {
      trackUniqueSession("floating_widget");
    }
  }, [isOpen, trackUniqueSession]);

  // Voice input handler
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Desteklenmiyor",
        description: "Tarayıcınız sesli giriş özelliğini desteklemiyor.",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === "not-allowed") {
        toast({
          variant: "destructive",
          title: "Mikrofon Erişimi Reddedildi",
          description: "Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.",
        });
      }
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };

    recognition.start();
  };
  useEffect(() => {
    getActiveStore().then(setActiveStoreCache);
  }, []);

  // Load example questions when store is loaded
  useEffect(() => {
    const loadExampleQuestions = async () => {
      if (!activeStoreCache) {
        setExampleQuestions([]);
        return;
      }

      setIsGeneratingQuestions(true);
      try {
        const questions = await generateExampleQuestions(activeStoreCache);
        setExampleQuestions(questions);
      } catch (error) {
        console.error("Failed to load example questions:", error);
        setExampleQuestions([]);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    loadExampleQuestions();
  }, [activeStoreCache]);

  // Rotate through example questions
  useEffect(() => {
    if (exampleQuestions.length === 0) {
      setCurrentSuggestion("");
      return;
    }

    setCurrentSuggestion(exampleQuestions[0]);
    let suggestionIndex = 0;

    const intervalId = setInterval(() => {
      suggestionIndex = (suggestionIndex + 1) % exampleQuestions.length;
      setCurrentSuggestion(exampleQuestions[suggestionIndex]);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [exampleQuestions]);

  // Load chat sessions when opened
  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen]);

  // Auto-scroll logic with user scroll detection
  useEffect(() => {
    if (!scrollRef.current || !shouldAutoScroll) return;

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, shouldAutoScroll, isLoading]);

  const loadChatSessions = async () => {
    try {
      const { data, error } = await supabase.rpc("get_chat_sessions");
      if (error) throw error;
      setChatSessions(data || []);
    } catch (error) {
      console.error("Error loading chat sessions:", error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("cb_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          supportCards: msg.support_cards,
        }));
        setMessages(loadedMessages);
        setCurrentSessionId(sessionId);
        setShowHistory(false);
      }
    } catch (error) {
      console.error("Error loading session messages:", error);
      toast({
        title: "Hata",
        description: "Sohbet geçmişi yüklenemedi",
        variant: "destructive",
      });
    }
  };

  const createSessionIfNeeded = async (sessionId: string) => {
    try {
      // Check if session exists
      const { data: existingSession } = await supabase
        .from("cb_sessions")
        .select("session_id")
        .eq("session_id", sessionId)
        .single();

      // If session doesn't exist, create it
      if (!existingSession) {
        await supabase.from("cb_sessions").insert({
          session_id: sessionId,
          user_id: null, // Anonymous user
          title: "Yeni Sohbet",
        });
      }
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const saveMessage = async (message: Message, sessionId: string) => {
    try {
      // Ensure session exists before saving message
      await createSessionIfNeeded(sessionId);

      const insertData: any = {
        id: message.id,
        session_id: sessionId,
        role: message.role,
        content: message.content,
      };

      if (message.supportCards && message.supportCards.length > 0) {
        insertData.support_cards = message.supportCards;
      }

      await supabase.from("cb_messages").insert(insertData);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Pause auto-scroll if user scrolled up more than 120px
    setShouldAutoScroll(distanceFromBottom < 120);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    const userMsgId = generateUUID();
    const newUserMsg: Message = { id: userMsgId, role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMsg]);

    // Save user message to database
    await saveMessage(newUserMsg, currentSessionId);

    // Track user message for statistics
    trackUserMessage("floating_widget");

    setIsLoading(true);
    setShouldAutoScroll(true);

    // Create abort controller for stop functionality
    abortControllerRef.current = new AbortController();

    try {
      // Use cached active store
      if (!activeStoreCache) {
        throw new Error("Lütfen önce admin panelinden bir bilgi bankası seçin");
      }

      const { data, error } = await supabase.functions.invoke("chat-gemini", {
        body: {
          storeName: activeStoreCache,
          messages: [...messages, { role: "user", content: userMessage }],
          sessionId: currentSessionId,
        },
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      // Check if response was blocked
      if (data?.blocked === true) {
        const blockedMessage =
          data.error ||
          "Üzgünüm, bu soruya güvenli bir şekilde cevap veremiyorum. Lütfen sorunuzu farklı şekilde ifade etmeyi deneyin.";

        toast({
          title: "Yanıt Engellenmiş",
          description: blockedMessage,
          variant: "default",
        });

        const assistantId = generateUUID();
        const blockedMsg: Message = {
          id: assistantId,
          role: "assistant",
          content: `⚠️ ${blockedMessage}`,
        };

        setMessages((prev) => [...prev, blockedMsg]);
        await saveMessage(blockedMsg, currentSessionId);
        loadChatSessions();

        setIsLoading(false);
        return;
      }

      if (!data || !data.text || data.text.trim().length === 0) {
        console.error("Invalid or empty response data:", data);

        let fallbackMessage = "Yanıt alınamadı. Lütfen tekrar deneyin.";

        if (data?.emptyResponse) {
          fallbackMessage =
            "Üzgünüm, belgelerimde bu konuyla ilgili bilgi bulamadım. Sorunuzu farklı kelimelerle ifade ederek tekrar deneyin.";
        } else if (data?.retriedWithDynamicSearch) {
          fallbackMessage =
            "Kapsamlı arama yapıldı ancak sonuç bulunamadı. İlgili Yatırım Destek Ofisi ile iletişime geçmenizi öneririz.";
        }

        const errorMsg: Message = {
          id: generateUUID(),
          role: "assistant",
          content: fallbackMessage,
        };

        setMessages((prev) => [...prev, errorMsg]);
        await saveMessage(errorMsg, currentSessionId);
        loadChatSessions();

        toast({
          title: "Arama Tamamlandı",
          description: data?.retriedWithDynamicSearch
            ? "Detaylı arama yapıldı, ancak sonuç bulunamadı."
            : "Sonuç bulunamadı.",
          variant: "default",
        });

        setIsLoading(false);
        return;
      }

      if (data.enhancedViaFeedbackLoop) {
        console.log("✅ Response enhanced via feedback loop");
        toast({
          title: "Genişletilmiş Arama",
          description: "Daha kapsamlı sonuçlar için ek arama yapıldı.",
          variant: "default",
        });
      }

      // Add assistant response
      const assistantId = generateUUID();

      // Simulate typing effect
      setIsStreaming(true);
      const fullResponse = data.text;
      const words = fullResponse.split(" ");
      let currentText = "";

      // Add empty message first (preserve support cards while streaming)
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", supportCards: data.supportCards || [] },
      ]);

      // Stream words
      for (let i = 0; i < words.length; i++) {
        if (abortControllerRef.current?.signal.aborted) break;

        currentText += (i > 0 ? " " : "") + words[i];
        setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, content: currentText } : msg)));

        // Variable delay for natural cadence
        await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 20));
      }

      // Ensure full response is shown
      const finalAssistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: fullResponse,
        supportCards: data.supportCards || [],
      };
      setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? finalAssistantMsg : msg)));

      // Save assistant message to database
      await saveMessage(finalAssistantMsg, currentSessionId);

      // Track assistant message for statistics
      trackAssistantMessage("floating_widget");

      // Reload sessions to update list
      loadChatSessions();

      setIsStreaming(false);
    } catch (error: any) {
      console.error("Chat error:", error);
      console.error("Chat error details:", {
        message: error.message,
        status: error.status,
        context: error.context,
      });

      let errorMessage = "Bir hata oluştu. Lütfen tekrar deneyin.";

      if (error.message?.includes("429")) {
        errorMessage = "Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyin.";
      } else if (error.message?.includes("402")) {
        errorMessage = "Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
      } else if (error.message?.includes("Invalid message format")) {
        errorMessage = "Mesaj formatı geçersiz. Lütfen sayfayı yenileyin.";
      } else if (error.message) {
        // Show more specific error if available
        errorMessage = `Hata: ${error.message}`;
      }

      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });

      const errorId = (Date.now() + 2).toString();
      setMessages((prev) => [...prev, { id: errorId, role: "assistant", content: errorMessage }]);
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setIsLoading(false);
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;

    // Find the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) return;

    // Remove last assistant message
    setMessages((prev) => prev.slice(0, -1));

    // Resend last user message
    setInput(lastUserMessage.content);
    setTimeout(() => handleSend(), 100);
  };

  const handleNewChat = () => {
    const newSessionId = generateUUID();
    setCurrentSessionId(newSessionId);
    setMessages([
      {
        id: generateUUID(),
        role: "assistant",
        content: "Merhaba! Size nasıl yardımcı olabilirim? Sorularınızı yanıtlamak için buradayım.",
      },
    ]);
    setInput("");
    setShowHistory(false);
    // Track new session
    trackNewSession("floating_widget");
  };

  const handleClear = () => {
    setMessages([]);
    setInput("");
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Başarılı",
      description: "Sohbet dışa aktarıldı",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  const filteredSessions = chatSessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayedSessions = showAllHistory ? filteredSessions : filteredSessions.slice(0, 10);

  return (
    <>
      {/* Sticky AI Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-16 w-16 md:h-18 md:w-18 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 z-[100] animate-chatbot-pulse"
          aria-label="AI Asistan'ı Aç"
        >
          <Bot className="h-12 w-12 md:h-18 md:w-18" />
        </Button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <Card
          className={`fixed ${isMobile ? "top-16 left-0 right-0 bottom-0" : "bottom-6 right-6 w-[480px] max-h-[90vh] h-[768px]"} shadow-2xl z-[100] flex ${showHistory ? "flex-row" : "flex-col"} border-2 animate-in slide-in-from-bottom-5 duration-300`}
        >
          {/* Chat History Sidebar */}
          {showHistory && (
            <div className={`${isMobile ? "absolute inset-0 bg-background z-[110]" : "w-64"} border-r flex flex-col`}>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Sohbet Geçmişi
                  </h3>
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {displayedSessions.map((session) => (
                    <button
                      key={session.session_id}
                      onClick={() => loadSessionMessages(session.session_id)}
                      className={`w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm ${
                        currentSessionId === session.session_id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="truncate">{session.title}</div>
                    </button>
                  ))}
                  {filteredSessions.length === 0 && (
                    <p className="text-center text-muted-foreground text-xs py-4">
                      {searchQuery ? "Sonuç bulunamadı" : "Henüz sohbet yok"}
                    </p>
                  )}
                </div>
              </ScrollArea>
              {filteredSessions.length > 10 && (
                <div className="p-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="w-full text-xs"
                  >
                    {showAllHistory ? "Daha Az Göster" : `${filteredSessions.length - 10} Daha Fazla`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 absolute -top-1 -right-1 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">AI Asistan</h3>
                  <p className="text-xs opacity-90 hidden sm:block">Yatırım Teşvikleri ve Destekleri</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="bg-white/20 text-white border-white/30 text-[10px] px-1.5 py-0 gap-0.5 flex items-center"
                >
                  <FlaskConical className="h-2.5 w-2.5" />
                  Beta
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 h-8 w-8"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1 sm:gap-2 p-2 border-b bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex-1 text-xs sm:text-sm h-8"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Geçmiş</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="flex-1 text-xs sm:text-sm h-8"
                disabled={isLoading}
              >
                <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Yeni</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="flex-1 text-xs sm:text-sm h-8"
                disabled={isLoading || messages.length === 0}
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Temizle</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="flex-1 text-xs sm:text-sm h-8"
                disabled={messages.length === 0}
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Dışa Aktar</span>
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={scrollRef} onScroll={handleScroll}>
              <div className="space-y-4 p-3 sm:p-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} showSources={showSources} />
                ))}

                {isLoading && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg">
                      <TypingDots />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stop/Regenerate Button */}
            {(isStreaming ||
              (!isLoading && messages.length > 1 && messages[messages.length - 1].role === "assistant")) && (
              <div className="px-3 sm:px-4 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isStreaming ? handleStop : handleRegenerate}
                  className="w-full text-xs sm:text-sm h-8"
                >
                  {isStreaming ? (
                    <>
                      <Square className="h-3 w-3 sm:h-4 sm:w-4" />
                      Durdur
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                      Yeniden Oluştur
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Example Questions Loading State */}
            {isGeneratingQuestions && messages.length <= 2 && (
              <div className="px-3 sm:px-4 py-2 border-t border-b bg-muted/20">
                <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              </div>
            )}

            {/* Example Questions Section - Single Rotating Question */}
            {!isLoading && messages.length <= 2 && currentSuggestion && (
              <div className="px-3 sm:px-4 py-2 border-t border-b bg-muted/20">
                <button
                  onClick={() => handleQuestionClick(currentSuggestion)}
                  className="w-full text-left px-4 py-3 rounded-lg
                             bg-gradient-to-r from-purple-50 to-blue-50
                             dark:from-purple-900/20 dark:to-blue-900/20
                             hover:from-purple-100 hover:to-blue-100
                             dark:hover:from-purple-900/40 dark:hover:to-blue-900/40
                             border border-purple-200 dark:border-purple-800
                             transition-all duration-300 hover:shadow-sm
                             group animate-fade-in"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 text-sm shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Örnek soru:</p>
                      <p className="text-sm text-foreground line-clamp-2">{currentSuggestion}</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 sm:p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Sorunuzu yazın..."
                  className="resize-none text-sm"
                  rows={2}
                  disabled={isLoading}
                  aria-label="Soru girin"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                    size="icon"
                    variant={isRecording ? "destructive" : "outline"}
                    className={`h-[22px] min-w-[44px] ${isRecording ? "animate-pulse" : ""}`}
                    aria-label={isRecording ? "Kaydı durdur" : "Sesli giriş"}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-1 min-w-[44px]"
                    aria-label="Gönder"
                  >
                    {isLoading && !isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

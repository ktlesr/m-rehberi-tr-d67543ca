import { useState, useEffect, useRef } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessageArea } from '@/components/chat/ChatMessageArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatSession, ChatMessage } from '@/hooks/useChatSession';
import { geminiRagService } from '@/services/geminiRagService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Menu, LogIn, Cloud, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useChatbotStats } from '@/hooks/useChatbotStats';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

// Örnek sorgular - gerçek API ile çalışacak
const EXAMPLE_QUERIES = [
  'Ankara\'da tekstil sektöründe yatırım teşviklerini hesaplamak istiyorum',
  'Manisa\'da gıda üretimi için hangi teşviklerden yararlanabilirim?',
  'Kütahya\'da makine imalatı için teşvik oranları nelerdir?',
  'Afyonkarahisar\'da tarım işleme tesisi kurmak istiyorum, teşvikler neler?',
  'Yozgat\'ta lojistik depo yatırımı için destek var mı?',
  'Şanlıurfa\'da tekstil fabrikası kurmak için teşvik hesaplama',
];

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  
  const {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    isAnonymous,
    loadSessions,
    createSession,
    deleteSession,
    sendMessage,
    setActiveSessionId,
    updateSession,
    stopGeneration,
  } = useChatSession(user);

  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { trackUserMessage, trackAssistantMessage, trackNewSession, trackUniqueSession } = useChatbotStats();

  // Track page visit and unique session
  useEffect(() => {
    trackUniqueSession('chat_page');
  }, [trackUniqueSession]);

  // Track initialization to prevent duplicate calls
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading before initializing
    if (authLoading) return;
    
    // Prevent re-initialization on same session
    if (hasInitialized.current) return;
    
    const initialize = async () => {
      const store = await geminiRagService.getActiveStore();
      setActiveStore(store);
      
      await loadSessions();
      // Don't auto-create session - let user create via button or first message
      hasInitialized.current = true;
    };
    initialize();
  }, [authLoading, user]);

  // Reset initialization flag when user changes (logout/login)
  useEffect(() => {
    hasInitialized.current = false;
  }, [user?.id]);

  // Load example questions when active store changes
  useEffect(() => {
    const loadExampleQuestions = async () => {
      if (!activeStore) {
        setExampleQuestions([]);
        return;
      }

      setIsGeneratingQuestions(true);
      try {
        const questions = await geminiRagService.generateExampleQuestions(activeStore);
        setExampleQuestions(questions);
      } catch (error) {
        console.error('Failed to load example questions:', error);
        setExampleQuestions([]);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    loadExampleQuestions();
  }, [activeStore]);

  // Rotate through example questions
  useEffect(() => {
    if (exampleQuestions.length === 0) {
      setCurrentSuggestion('');
      return;
    }

    setCurrentSuggestion(exampleQuestions[0]);
    let suggestionIndex = 0;
    
    const intervalId = setInterval(() => {
      suggestionIndex = (suggestionIndex + 1) % exampleQuestions.length;
      setCurrentSuggestion(exampleQuestions[suggestionIndex]);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [exampleQuestions]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages]);

  const handleSendMessage = async (message: string) => {
    if (!activeStore) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen önce bir bilgi tabanı seçin.',
        variant: 'destructive',
      });
      return;
    }

    // Track user message
    trackUserMessage('chat_page');

    if (!activeSessionId) {
      const newSession = await createSession();
      trackNewSession('chat_page');
      await sendMessage(newSession.id, message, activeStore);
    } else {
      await sendMessage(activeSessionId, message, activeStore);
    }
    
    // Track assistant message (will be tracked after response)
    trackAssistantMessage('chat_page');
  };

  const handleCreateSession = async () => {
    await createSession();
    trackNewSession('chat_page');
    setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleClearChat = () => {
    if (confirm("Sohbeti temizlemek istediğinizden emin misiniz?")) {
      createSession();
    }
  };

  const handleExportChat = () => {
    if (!activeSession) return;
    
    const exportData = {
      title: activeSession.title,
      messages: activeSession.messages,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${activeSession.title.replace(/\s+/g, "-")}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRenameSession = async (newTitle: string) => {
    if (activeSessionId) {
      await updateSession(activeSessionId, { title: newTitle });
    }
  };

  const handleRegenerateMessage = async (messageIndex: number) => {
    if (!activeSessionId || !activeStore) return;
    
    // Find the last user message before this assistant message
    const userMessage = activeSession?.messages
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === "user");
    
    if (userMessage) {
      await sendMessage(activeSessionId, userMessage.content, activeStore);
    }
  };

  // Start example query with real API
  const handleStartExampleQuery = async () => {
    if (!activeStore) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen sistem hazır olana kadar bekleyin.',
        variant: 'destructive',
      });
      return;
    }

    // Pick a random example query
    const randomQuery = EXAMPLE_QUERIES[Math.floor(Math.random() * EXAMPLE_QUERIES.length)];
    
    // Send as a real message
    await handleSendMessage(randomQuery);
    
    toast({
      title: 'Örnek Sorgu Başlatıldı',
      description: 'Gerçek API ile teşvik hesaplama akışı başlatılıyor...',
    });
  };

  // Handle interactive submissions (real API)
  const handleInteractiveSubmit = async (value: string) => {
    if (!activeStore || !activeSessionId) return;
    
    // Send the selected value as a user message
    await sendMessage(activeSessionId, value, activeStore);
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:block transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-72'}`} 
        role="complementary" 
        aria-label="Sohbet geçmişi"
      >
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={deleteSession}
          isCollapsed={isSidebarCollapsed}
        />
      </aside>

      {/* Main Chat Area */}
      <main id="main-content" className="flex-1 flex flex-col" role="main" aria-label="Sohbet alanı">
        {/* Mobile Sidebar */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <div className="lg:hidden border-b px-2 h-14 flex items-center">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menüyü aç</span>
              </Button>
            </SheetTrigger>
          </div>
          
          <SheetContent side="left" className="w-[85vw] max-w-72 p-0">
            <ChatSidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onCreateSession={handleCreateSession}
              onDeleteSession={deleteSession}
            />
          </SheetContent>
        </Sheet>

        {/* Anonymous User Banner with Example Query Button */}
        {isAnonymous && (
          <div className="bg-muted/50 border-b px-3 py-2 sm:px-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Cloud className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-2 sm:line-clamp-1">
                  Sohbet geçmişiniz bu cihazda geçici olarak saklanıyor.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleStartExampleQuery} 
                  className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
                  disabled={isLoading || !activeStore}
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">Örnek Sorgu</span>
                </Button>
                <Link to="/admin/login" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="gap-1 sm:gap-2 w-full text-xs sm:text-sm">
                    <LogIn className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Giriş</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <ChatHeader 
          sessionTitle={activeSession?.title || 'Yeni Sohbet'}
          onClearChat={handleClearChat}
          onExportChat={handleExportChat}
          onRenameSession={handleRenameSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <ChatMessageArea
            messages={activeSession?.messages || []}
            isLoading={isLoading}
            currentSuggestion={currentSuggestion}
            onSuggestionClick={handleSuggestionClick}
            isGeneratingQuestions={isGeneratingQuestions}
            activeSessionId={activeSessionId}
            onRegenerateMessage={handleRegenerateMessage}
            onInteractiveSubmit={handleInteractiveSubmit}
          />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || !activeStore}
          isGenerating={isLoading}
          value={inputValue}
          onValueChange={setInputValue}
          onStop={() => {
            stopGeneration();
            toast({
              title: 'Durduruldu',
              description: 'Yanıt oluşturma işlemi durduruldu.',
            });
          }}
        />
      </main>
    </div>
  );
}
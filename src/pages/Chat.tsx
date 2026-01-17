import { useState, useEffect, useRef } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessageArea } from '@/components/chat/ChatMessageArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatSession, ChatMessage } from '@/hooks/useChatSession';
import { geminiRagService } from '@/services/geminiRagService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Menu, LogIn, Cloud, TestTube2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useChatbotStats } from '@/hooks/useChatbotStats';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import type { StructuredAPIResponse } from '@/utils/structuredResponseRenderer';

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
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [showTestMode, setShowTestMode] = useState(false);
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

  // Demo Interactive Response for testing
  const createDemoInteractiveMessage = (): ChatMessage => {
    const demoResponse: StructuredAPIResponse = {
      type: 'structured',
      mode: 'interactive',
      content: {
        summary: 'Teşvik hesaplaması için yatırım yapılacak ili öğrenmem gerekiyor.',
        sections: [
          {
            type: 'info',
            content: 'Seçeceğiniz il, teşvik bölgesini ve uygulanacak destek oranlarını belirler.'
          }
        ]
      },
      interaction: {
        field: 'province',
        questionText: 'Yatırımı hangi ilde yapmayı planlıyorsunuz?',
        inputType: 'select',
        options: [
          { value: 'istanbul', label: 'İstanbul', region: 1 },
          { value: 'ankara', label: 'Ankara', region: 2 },
          { value: 'izmir', label: 'İzmir', region: 1 },
          { value: 'bursa', label: 'Bursa', region: 2 },
          { value: 'antalya', label: 'Antalya', region: 2 },
          { value: 'adana', label: 'Adana', region: 3 },
          { value: 'konya', label: 'Konya', region: 3 },
          { value: 'gaziantep', label: 'Gaziantep', region: 4 },
          { value: 'sanliurfa', label: 'Şanlıurfa', region: 5 },
          { value: 'diyarbakir', label: 'Diyarbakır', region: 6 },
          { value: 'van', label: 'Van', region: 6 },
          { value: 'agri', label: 'Ağrı', region: 6 },
        ],
        allowSearch: true,
        placeholder: 'İl seçin veya yazın...'
      },
      progress: {
        sector: 'Tekstil Ürünleri İmalatı',
        province: null,
        district: null,
        osb_status: null,
        currentStep: 2,
        totalSteps: 5,
        completed: false
      }
    };

    return {
      role: 'assistant',
      content: JSON.stringify(demoResponse),
      timestamp: Date.now(),
      structuredResponse: demoResponse
    };
  };

  const handleStartTestMode = () => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: 'Tekstil sektöründe teşvik hesaplama yapmak istiyorum',
      timestamp: Date.now() - 5000
    };
    
    setTestMessages([userMessage, createDemoInteractiveMessage()]);
    setShowTestMode(true);
  };

  const handleTestInteractiveSubmit = (value: string) => {
    toast({
      title: 'Seçim Yapıldı',
      description: `Seçilen değer: ${value}`,
    });
    
    // Add user selection as a message
    const selectionMessage: ChatMessage = {
      role: 'user',
      content: `İl: ${value}`,
      timestamp: Date.now()
    };
    
    // Create next step response (district selection)
    const districtResponse: StructuredAPIResponse = {
      type: 'structured',
      mode: 'interactive',
      content: {
        summary: `${value.charAt(0).toUpperCase() + value.slice(1)} ili seçildi. Şimdi ilçe bilgisine ihtiyacım var.`,
        sections: []
      },
      interaction: {
        field: 'district',
        questionText: 'Yatırımı hangi ilçede yapmayı planlıyorsunuz?',
        inputType: 'select',
        options: [
          { value: 'merkez', label: 'Merkez' },
          { value: 'osb', label: 'OSB Bölgesi' },
          { value: 'serbest-bolge', label: 'Serbest Bölge' },
        ],
        allowSearch: false,
        placeholder: 'İlçe seçin...'
      },
      progress: {
        sector: 'Tekstil Ürünleri İmalatı',
        province: value,
        district: null,
        osb_status: null,
        currentStep: 3,
        totalSteps: 5,
        completed: false
      }
    };

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: JSON.stringify(districtResponse),
      timestamp: Date.now(),
      structuredResponse: districtResponse
    };

    setTestMessages(prev => [...prev, selectionMessage, assistantMessage]);
  };

  const handleExitTestMode = () => {
    setShowTestMode(false);
    setTestMessages([]);
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
          <div className="lg:hidden border-b p-2">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </div>
          
          <SheetContent side="left" className="w-72 p-0">
            <ChatSidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onCreateSession={handleCreateSession}
              onDeleteSession={deleteSession}
            />
          </SheetContent>
        </Sheet>

        {/* Test Mode Banner */}
        {showTestMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <TestTube2 className="h-4 w-4" />
              <span>Demo Mod - Interactive JSON Response Testi</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleExitTestMode} className="gap-2 border-amber-500/50 text-amber-700">
              Testi Bitir
            </Button>
          </div>
        )}

        {/* Anonymous User Banner */}
        {!showTestMode && isAnonymous && (
          <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cloud className="h-4 w-4" />
              <span>Sohbet geçmişiniz bu cihazda geçici olarak saklanıyor.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleStartTestMode} className="gap-2">
                <TestTube2 className="h-4 w-4" />
                Demo Test
              </Button>
              <Link to="/admin/login">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Giriş Yap
                </Button>
              </Link>
            </div>
          </div>
        )}

        <ChatHeader 
          sessionTitle={showTestMode ? 'Demo: Interactive Response Test' : (activeSession?.title || 'Yeni Sohbet')}
          onClearChat={handleClearChat}
          onExportChat={handleExportChat}
          onRenameSession={handleRenameSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <ChatMessageArea
            messages={showTestMode ? testMessages : (activeSession?.messages || [])}
            isLoading={isLoading}
            currentSuggestion={showTestMode ? '' : currentSuggestion}
            onSuggestionClick={handleSuggestionClick}
            isGeneratingQuestions={isGeneratingQuestions}
            activeSessionId={activeSessionId}
            onRegenerateMessage={handleRegenerateMessage}
            onInteractiveSubmit={showTestMode ? handleTestInteractiveSubmit : undefined}
          />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || !activeStore || showTestMode}
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

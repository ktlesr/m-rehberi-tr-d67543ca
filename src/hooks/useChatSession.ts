import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateUUID } from "@/lib/uuid";
import { User } from "@supabase/supabase-js";
import type { 
  StructuredAPIResponse, 
  InteractionConfig, 
  ProgressConfig,
  FollowUpConfig 
} from "@/utils/structuredResponseRenderer";
import { buildLLMMessages } from "@/utils/llmMessageNormalizer";

const LOCAL_STORAGE_KEY = "tesviksor_chat_sessions";

export interface SupportProgramCardData {
  id: string;
  title: string;
  kurum: string;
  kurum_logo?: string;
  son_tarih?: string;
  ozet: string;
  uygunluk?: string;
  iletisim?: string;
  belgeler: Array<{ id: string; filename: string; file_url: string }>;
  tags: Array<{ id: number; name: string; category?: { id: number; name: string } }>;
  detay_link: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Array<{
    title: string;
    uri: string;
    snippet?: string;
    text?: string;
    index?: number;
  }>;
  groundingChunks?: Array<{
    retrievedContext?: {
      uri?: string;
      title?: string;
      text?: string;
      customMetadata?: Array<{ key: string; stringValue?: string; value?: string }>;
    };
    web?: { uri: string; title: string };
    enrichedFileName?: string | null;
  }>;
  supportCards?: SupportProgramCardData[];
  // Structured response fields
  structuredResponse?: StructuredAPIResponse;
  interaction?: InteractionConfig;
  progress?: ProgressConfig;
  followUp?: FollowUpConfig;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// localStorage helper functions for anonymous users
const loadSessionsFromLocalStorage = (): ChatSession[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveSessionsToLocalStorage = (sessions: ChatSession[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

export function useChatSession(user: User | null) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnonymous = !user;

  // Load sessions based on user authentication status
  const loadSessions = useCallback(async () => {
    if (isAnonymous) {
      // Anonymous user: load from localStorage
      const localSessions = loadSessionsFromLocalStorage();
      setSessions(localSessions);
      
      if (!activeSessionId && localSessions.length > 0) {
        setActiveSessionId(localSessions[0].id);
      }
      return localSessions;
    }

    // Authenticated user: load from Supabase
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("chat_sessions")
        .select("id, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionsWithMessages = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: messagesData, error: messagesError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("session_id", session.id)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;

          const { tryParseStructuredContent } = await import("@/utils/structuredResponseRenderer");
          
          const messages: ChatMessage[] = (messagesData || []).map((msg: any) => {
            // Try to parse structured response from content for assistant messages
            const parsedStructured = msg.role === 'assistant' 
              ? tryParseStructuredContent(msg.content) 
              : null;
            
            return {
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at).getTime(),
              sources: msg.sources,
              groundingChunks: msg.grounding_chunks,
              supportCards: msg.support_cards,
              structuredResponse: parsedStructured || undefined,
            };
          });

          const title =
            messages.length > 0 && messages[0]?.content
              ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "")
              : "Yeni Sohbet";

          return {
            id: session.id,
            title,
            messages,
            createdAt: new Date(session.created_at).getTime(),
            updatedAt: new Date(session.created_at).getTime(),
          };
        }),
      );

      setSessions(sessionsWithMessages);

      if (!activeSessionId && sessionsWithMessages.length > 0) {
        setActiveSessionId(sessionsWithMessages[0].id);
      }

      return sessionsWithMessages;
    } catch (error) {
      console.error("Error loading sessions:", error);
      return [];
    }
  }, [user, isAnonymous, activeSessionId]);

  const createSession = useCallback(async (title: string = "Yeni Sohbet") => {
    const sessionId = generateUUID();

    if (isAnonymous) {
      // Anonymous user: create in localStorage
      const newSession: ChatSession = {
        id: sessionId,
        title,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setSessions((prev) => {
        const updated = [newSession, ...prev];
        saveSessionsToLocalStorage(updated);
        return updated;
      });
      setActiveSessionId(sessionId);

      return newSession;
    }

    // Authenticated user: create in Supabase
    try {
      const { error } = await supabase.from("chat_sessions").insert({ 
        id: sessionId,
        user_id: user!.id 
      });

      if (error) throw error;

      const newSession: ChatSession = {
        id: sessionId,
        title,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(sessionId);

      return newSession;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }, [user, isAnonymous]);

  const updateSession = useCallback((sessionId: string, updates: Partial<ChatSession>) => {
    setSessions((prev) => {
      const updated = prev.map((session) => 
        session.id === sessionId ? { ...session, ...updates, updatedAt: Date.now() } : session
      );
      
      if (isAnonymous) {
        saveSessionsToLocalStorage(updated);
      }
      
      return updated;
    });
  }, [isAnonymous]);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (isAnonymous) {
        // Anonymous user: delete from localStorage
        setSessions((prev) => {
          const updated = prev.filter((s) => s.id !== sessionId);
          saveSessionsToLocalStorage(updated);
          return updated;
        });

        if (activeSessionId === sessionId) {
          const remainingSessions = sessions.filter((s) => s.id !== sessionId);
          setActiveSessionId(remainingSessions[0]?.id || null);
        }
        return;
      }

      // Authenticated user: delete from Supabase
      try {
        await supabase.from("chat_messages").delete().eq("session_id", sessionId);
        const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);

        if (error) throw error;

        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (activeSessionId === sessionId) {
          const remainingSessions = sessions.filter((s) => s.id !== sessionId);
          setActiveSessionId(remainingSessions[0]?.id || null);
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        throw error;
      }
    },
    [sessions, activeSessionId, isAnonymous],
  );

  const sendMessage = useCallback(
    async (sessionId: string, message: string, storeName: string) => {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        let session = sessions.find((s) => s.id === sessionId);
        if (!session) {
          session = {
            id: sessionId,
            title: "Yeni Sohbet",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }

        const userMessage: ChatMessage = {
          role: "user",
          content: message,
          timestamp: Date.now(),
        };

        // Save user message
        if (!isAnonymous) {
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            role: "user",
            content: message,
          });
        }

        const updatedMessages = [...session.messages, userMessage];
        updateSession(sessionId, { messages: updatedMessages });

        abortControllerRef.current = new AbortController();

        // Normalize messages for LLM (convert structured JSON to summaries, limit history)
        const normalizedMessages = buildLLMMessages(
          updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          12, // max 12 messages
          1500 // max 1500 chars per message
        );

        const { data, error } = await supabase.functions.invoke("chat-gemini", {
          body: {
            storeName,
            messages: normalizedMessages,
            sessionId,
          },
        });

        let responseData: any = data;

        if (!responseData && error && (error as any).context?.json) {
          try {
            const errorJson = await (error as any).context.json();
            responseData = errorJson;
          } catch (parseErr) {
            console.error("Failed to parse chat-gemini error JSON:", parseErr);
          }
        }

        if (responseData?.blocked) {
          const errorMessage: ChatMessage = {
            role: "assistant",
            content:
              responseData.error ||
              "Üzgünüm, bu soruya güvenli bir şekilde cevap veremiyorum. Lütfen sorunuzu farklı şekilde ifade etmeyi deneyin.",
            timestamp: Date.now(),
          };

          if (!isAnonymous) {
            await supabase.from("chat_messages").insert({
              session_id: sessionId,
              role: "assistant",
              content: errorMessage.content,
            });
          }

          updateSession(sessionId, { messages: [...updatedMessages, errorMessage] });
          return;
        }

        if (error) throw error;

        const fullResponse = data.text || '';
        
        // Check if response is structured JSON - skip streaming for structured responses
        // Also check if text contains ```json block with structured content
        let isStructuredResponse = data.type === 'structured' || 
          (typeof data.content === 'object' && data.content !== null && data.mode);
        
        let parsedStructuredResponse: StructuredAPIResponse | undefined;
        
        // If not already structured, try to parse from text (handles ```json blocks)
        if (!isStructuredResponse && fullResponse) {
          const { tryParseStructuredContent } = await import("@/utils/structuredResponseRenderer");
          const parsed = tryParseStructuredContent(fullResponse);
          if (parsed && parsed.type === 'structured') {
            isStructuredResponse = true;
            parsedStructuredResponse = parsed;
          }
        }
        
        if (isStructuredResponse && !parsedStructuredResponse) {
          // Parse structured response from API direct fields
          parsedStructuredResponse = {
            type: data.type || 'structured',
            mode: data.mode || 'informative',
            content: data.content,
            interaction: data.interaction,
            progress: data.progress,
            followUp: data.followUp,
            sources: data.sources,
          } as StructuredAPIResponse;
        }

        // For structured responses: render immediately without streaming
        if (isStructuredResponse && parsedStructuredResponse) {
          // Save full structured JSON as content for persistence
          const structuredJsonString = JSON.stringify({
            type: parsedStructuredResponse.type,
            mode: parsedStructuredResponse.mode,
            content: parsedStructuredResponse.content,
            interaction: parsedStructuredResponse.interaction,
            progress: parsedStructuredResponse.progress,
            followUp: parsedStructuredResponse.followUp,
            sources: parsedStructuredResponse.sources,
          });
          
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: structuredJsonString, // Store full JSON for reload parsing
            timestamp: Date.now(),
            sources: data.sources,
            groundingChunks: data.groundingChunks,
            supportCards: data.supportCards,
            structuredResponse: parsedStructuredResponse,
            interaction: data.interaction,
            progress: data.progress,
            followUp: data.followUp,
          };

          // Save assistant message to database (only for authenticated users)
          if (!isAnonymous) {
            await supabase.from("chat_messages").insert({
              session_id: sessionId,
              role: "assistant",
              content: structuredJsonString, // Save full structured JSON
              sources: data.sources,
              grounding_chunks: data.groundingChunks,
              support_cards: data.supportCards,
            });
          }

          updateSession(sessionId, { messages: [...updatedMessages, assistantMessage] });

          if (session.messages.length === 0 && message.length > 0) {
            const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
            updateSession(sessionId, { title });
          }

          return { success: true, data };
        }

        // For regular markdown responses: use streaming effect
        const words = fullResponse.split(" ");

        const emptyAssistantMessage: ChatMessage = {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          sources: data.sources,
          groundingChunks: data.groundingChunks,
          supportCards: data.supportCards,
        };

        let streamingMessages = [...updatedMessages, emptyAssistantMessage];
        updateSession(sessionId, { messages: streamingMessages });

        let currentText = "";
        let wasAborted = false;

        for (let i = 0; i < words.length; i++) {
          if (abortControllerRef.current?.signal.aborted) {
            wasAborted = true;
            currentText += " [yanıt durduruldu]";
            break;
          }

          currentText += (i > 0 ? " " : "") + words[i];

          const updatedAssistantMessage: ChatMessage = {
            ...emptyAssistantMessage,
            content: currentText,
          };

          streamingMessages = [...updatedMessages, updatedAssistantMessage];
          updateSession(sessionId, { messages: streamingMessages });

          await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 20));
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: wasAborted ? currentText : fullResponse,
          timestamp: Date.now(),
          sources: wasAborted ? null : data.sources,
          groundingChunks: wasAborted ? null : data.groundingChunks,
          supportCards: wasAborted ? null : data.supportCards,
        };

        // Save assistant message to database (only for authenticated users)
        if (!isAnonymous) {
          const insertData: any = {
            session_id: sessionId,
            role: "assistant",
            content: assistantMessage.content,
          };

          if (!wasAborted && data.sources) {
            insertData.sources = data.sources;
          }

          if (!wasAborted && data.groundingChunks) {
            insertData.grounding_chunks = data.groundingChunks;
          }

          if (!wasAborted && data.supportCards && data.supportCards.length > 0) {
            insertData.support_cards = data.supportCards;
          }

          await supabase.from("chat_messages").insert(insertData);
        }

        updateSession(sessionId, { messages: [...updatedMessages, assistantMessage] });

        if (wasAborted) {
          return { success: false, interrupted: true };
        }

        if (session.messages.length === 0 && message.length > 0) {
          const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
          updateSession(sessionId, { title });
        }

        return { success: true, data };
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("Request was aborted");
          return { success: false, aborted: true };
        }
        console.error("Error sending message:", error);
        return { success: false, error };
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessions, updateSession, isAnonymous],
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    isAnonymous,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    sendMessage,
    setActiveSessionId,
    stopGeneration,
  };
}

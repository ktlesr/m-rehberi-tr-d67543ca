import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { Send, Square, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
}

export function ChatInput({ 
  onSendMessage, 
  disabled, 
  value, 
  onValueChange,
  onStop,
  isGenerating = false
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const maxLength = 2000;
  const { toast } = useToast();
  
  // Use external value if provided, otherwise internal
  const currentValue = value !== undefined ? value : internalValue;
  const setValue = onValueChange || setInternalValue;

  // Refs to keep current values accessible in speech recognition handlers
  const currentValueRef = useRef(currentValue);
  const setValueRef = useRef(setValue);

  // Update refs on each render
  useEffect(() => {
    currentValueRef.current = currentValue;
    setValueRef.current = setValue;
  }, [currentValue, setValue]);

  // Auto-resize textarea with stable minimum height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const minHeight = 52;
      textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, 200))}px`;
    }
  }, [currentValue]);

  const handleSend = () => {
    if (!currentValue.trim() || disabled) return;

    onSendMessage(currentValue.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  // Initialize speech recognition (only once)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const newValue = currentValueRef.current + (currentValueRef.current ? ' ' : '') + transcript;
      setValueRef.current(newValue);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      
      // Only show error for actual failures, not for normal abort
      if (event.error === 'aborted') {
        return;
      }
      
      let errorMessage = 'Ses tanıma hatası oluştu.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Ses algılanamadı. Lütfen tekrar deneyin.';
          break;
        case 'audio-capture':
          errorMessage = 'Mikrofon erişimi engellendi. Lütfen izin verin.';
          break;
        case 'not-allowed':
          errorMessage = 'Mikrofon izni reddedildi.';
          break;
        case 'network':
          errorMessage = 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
          break;
      }
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);

  const handleVoiceInput = () => {
    if (disabled || isGenerating) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Desteklenmiyor',
        description: 'Sesli giriş bu tarayıcıda desteklenmiyor. Lütfen Chrome, Edge veya Safari kullanın.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
        toast({
          title: 'Hata',
          description: 'Sesli giriş başlatılamadı.',
          variant: 'destructive',
        });
      }
    }
  };

  const charCount = currentValue.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 sm:gap-3 items-center" role="group" aria-label="Mesaj giriş alanı">
          {/* Voice input button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVoiceInput}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex-shrink-0 transition-all ${
              isRecording 
                ? 'text-red-500 bg-red-500/10 animate-pulse' 
                : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
            }`}
            disabled={disabled || isGenerating}
            aria-label={isRecording ? "Dinleniyor, durdurmak için tıklayın" : "Sesli giriş başlat"}
            aria-pressed={isRecording}
          >
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </Button>

          {/* Input container */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={currentValue}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  setValue(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın..."
              disabled={disabled}
              className="min-h-[44px] max-h-[200px] resize-none py-3 px-4 text-sm rounded-2xl border-2 border-muted focus:border-primary transition-colors"
              rows={1}
              aria-label="Mesaj metni"
              aria-describedby={isNearLimit ? "char-limit-hint" : undefined}
              aria-invalid={isOverLimit}
            />
            
            {/* Character counter - only show when near/over limit */}
            {isNearLimit && (
              <div 
                id="char-limit-hint"
                className={`absolute -bottom-5 right-1 text-[10px] ${
                  isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
                }`}
                aria-live="polite"
              >
                {charCount}/{maxLength}
              </div>
            )}
          </div>

          {/* Stop or Send button */}
          {isGenerating ? (
            <Button 
              onClick={handleStop}
              size="icon"
              variant="destructive"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex-shrink-0 shadow-md hover:shadow-lg transition-all"
              aria-label="Yanıt oluşturmayı durdur"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </Button>
          ) : (
            <Button 
              onClick={handleSend} 
              disabled={disabled || !currentValue.trim() || isOverLimit} 
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex-shrink-0 shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90"
              aria-label="Mesajı gönder"
            >
              {disabled && !isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

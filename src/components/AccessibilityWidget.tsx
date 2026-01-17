import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Plus,
  Minus,
  Eye,
  Link2,
  Pause,
  AlignJustify,
  MousePointer2,
  RotateCcw,
  BookOpen,
  Space,
  ScanLine,
  Volume2,
  ImageOff,
  AlignLeft,
  Glasses,
  Sun,
  Palette,
  Focus,
  Type,
  MousePointerClick,
  Play,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";
import AccessibilityIcon from "@/components/icons/AccessibilityIcon";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  isActive,
  onClick,
  disabled = false,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 min-h-[90px] text-center",
      "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      isActive
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-card hover:border-muted-foreground/30",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <div className={cn("mb-1.5", isActive ? "text-primary" : "text-muted-foreground")}>
      {icon}
    </div>
    <span className={cn("text-xs font-medium leading-tight", isActive ? "text-primary" : "text-foreground")}>
      {title}
    </span>
    {children}
  </button>
);

const AccessibilityWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, resetSettings } = useAccessibility();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useTextToSpeech();

  // Hide on admin routes
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  if (isAdminRoute) {
    return null;
  }

  // Ekran okuyucu - tüm sayfa içeriğini oku
  const handleScreenReader = useCallback(() => {
    if (isSpeaking) {
      stop();
      return;
    }
    
    const mainContent = document.querySelector('main') || document.body;
    const textContent = mainContent.innerText || mainContent.textContent || '';
    speak(textContent.slice(0, 5000));
  }, [isSpeaking, speak, stop]);

  // Seçili metin okuma
  useEffect(() => {
    if (!settings.readSelectedText || !ttsSupported) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const text = selection.toString().trim();
        if (text.length > 2) {
          speak(text);
        }
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    return () => document.removeEventListener('mouseup', handleSelectionChange);
  }, [settings.readSelectedText, ttsSupported, speak]);

  // Üzerine gelince okuma
  useEffect(() => {
    if (!settings.readOnHover || !ttsSupported) return;

    let debounceTimer: NodeJS.Timeout;
    let lastElement: HTMLElement | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target === lastElement) return;
      lastElement = target;

      document.querySelectorAll('.tts-hover-highlight').forEach(el => {
        el.classList.remove('tts-hover-highlight');
      });

      clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(() => {
        const text = target.innerText || target.textContent || '';
        if (text.trim().length > 2 && text.trim().length < 500) {
          target.classList.add('tts-hover-highlight');
          speak(text.trim());
        }
      }, 300);
    };

    const handleMouseOut = () => {
      clearTimeout(debounceTimer);
      document.querySelectorAll('.tts-hover-highlight').forEach(el => {
        el.classList.remove('tts-hover-highlight');
      });
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    
    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.querySelectorAll('.tts-hover-highlight').forEach(el => {
        el.classList.remove('tts-hover-highlight');
      });
    };
  }, [settings.readOnHover, ttsSupported, speak]);

  // Filter çakışmasını önle
  const handleFilterChange = (filterName: 'blueLightFilter' | 'desaturation' | 'lowSaturation' | 'highSaturation', value: boolean) => {
    if (value) {
      if (filterName !== 'blueLightFilter') updateSetting('blueLightFilter', false);
      if (filterName !== 'desaturation') updateSetting('desaturation', false);
      if (filterName !== 'lowSaturation') updateSetting('lowSaturation', false);
      if (filterName !== 'highSaturation') updateSetting('highSaturation', false);
    }
    updateSetting(filterName, value);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut Alt+0
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "0") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, []);

  const increaseFontSize = () => {
    if (settings.fontSize < 150) {
      updateSetting("fontSize", Math.min(150, settings.fontSize + 25) as 100 | 125 | 150);
    }
  };

  const decreaseFontSize = () => {
    if (settings.fontSize > 100) {
      updateSetting("fontSize", Math.max(100, settings.fontSize - 25) as 100 | 125 | 150);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[190] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Erişilebilirlik ayarlarını aç (Alt+0)"
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
      >
        <AccessibilityIcon size={40} className="text-primary-foreground" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[195] transition-opacity duration-300" 
          onClick={() => setIsOpen(false)} 
          aria-hidden="true" 
        />
      )}

      {/* Sidebar Panel */}
      <div
        ref={panelRef}
        id="accessibility-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-title"
        className={cn(
          "fixed top-0 right-0 z-[200] h-full w-full sm:w-[420px] bg-background border-l border-border shadow-2xl",
          "transform transition-transform duration-300 ease-out overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <AccessibilityIcon size={24} className="text-primary-foreground" />
            </div>
            <h2 id="accessibility-title" className="font-semibold text-lg text-foreground">
              Erişilebilirlik Menüsü
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Paneli kapat"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* ========== SESLİ OKUMA ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
              <Volume2 className="w-4 h-4" />
              Sesli Okuma
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <FeatureCard
                icon={isSpeaking ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                title={isSpeaking ? "Durdur" : "Sayfayı Oku"}
                isActive={isSpeaking}
                onClick={handleScreenReader}
                disabled={!ttsSupported}
              />
              <FeatureCard
                icon={<Type className="w-5 h-5" />}
                title="Seçili Metni Oku"
                isActive={settings.readSelectedText}
                onClick={() => updateSetting("readSelectedText", !settings.readSelectedText)}
                disabled={!ttsSupported}
              />
              <FeatureCard
                icon={<MousePointerClick className="w-5 h-5" />}
                title="Üzerine Gelince Oku"
                isActive={settings.readOnHover}
                onClick={() => updateSetting("readOnHover", !settings.readOnHover)}
                disabled={!ttsSupported}
              />
            </div>
          </div>

          {/* ========== YAZI AYARLARI ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
              <BookOpen className="w-4 h-4" />
              Yazı Ayarları
            </h3>
            
            {/* Font Size Control */}
            <div className="bg-muted/30 rounded-xl p-3 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Yazı Boyutu</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={decreaseFontSize}
                    disabled={settings.fontSize <= 100}
                    aria-label="Yazı boyutunu küçült"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-medium tabular-nums text-sm">
                    {settings.fontSize}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={increaseFontSize}
                    disabled={settings.fontSize >= 150}
                    aria-label="Yazı boyutunu büyüt"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FeatureCard
                icon={<AlignJustify className="w-5 h-5" />}
                title="Satır Aralığı"
                isActive={settings.lineSpacing !== "normal"}
                onClick={() => {
                  const next = settings.lineSpacing === "normal" ? "wide" : 
                               settings.lineSpacing === "wide" ? "wider" : "normal";
                  updateSetting("lineSpacing", next);
                }}
              />
              <FeatureCard
                icon={<Space className="w-5 h-5" />}
                title="Kelime Aralığı"
                isActive={settings.wordSpacing !== "normal"}
                onClick={() => {
                  const next = settings.wordSpacing === "normal" ? "wide" : 
                               settings.wordSpacing === "wide" ? "wider" : "normal";
                  updateSetting("wordSpacing", next);
                }}
              />
              <FeatureCard
                icon={<Glasses className="w-5 h-5" />}
                title="Disleksi Dostu"
                isActive={settings.dyslexiaFriendly}
                onClick={() => updateSetting("dyslexiaFriendly", !settings.dyslexiaFriendly)}
              />
              <FeatureCard
                icon={<AlignLeft className="w-5 h-5" />}
                title="Sola Hizala"
                isActive={settings.alignTextLeft}
                onClick={() => updateSetting("alignTextLeft", !settings.alignTextLeft)}
              />
            </div>
          </div>

          {/* ========== GÖRSEL AYARLAR ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
              <Eye className="w-4 h-4" />
              Görsel Ayarlar
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <FeatureCard
                icon={<Eye className="w-5 h-5" />}
                title="Yüksek Kontrast"
                isActive={settings.highContrast}
                onClick={() => updateSetting("highContrast", !settings.highContrast)}
              />
              <FeatureCard
                icon={<Link2 className="w-5 h-5" />}
                title="Bağlantıları Vurgula"
                isActive={settings.highlightLinks}
                onClick={() => updateSetting("highlightLinks", !settings.highlightLinks)}
              />
              <FeatureCard
                icon={<ImageOff className="w-5 h-5" />}
                title="Resimleri Gizle"
                isActive={settings.hideImages}
                onClick={() => updateSetting("hideImages", !settings.hideImages)}
              />
              <FeatureCard
                icon={<MousePointer2 className="w-5 h-5" />}
                title="Büyük İmleç"
                isActive={settings.largeCursor}
                onClick={() => updateSetting("largeCursor", !settings.largeCursor)}
              />
            </div>
          </div>

          {/* ========== RENK FİLTRELERİ ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
              <Palette className="w-4 h-4" />
              Renk Filtreleri
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <FeatureCard
                icon={<Sun className="w-5 h-5" />}
                title="Mavi Işık Filtresi"
                isActive={settings.blueLightFilter}
                onClick={() => handleFilterChange("blueLightFilter", !settings.blueLightFilter)}
              />
              <FeatureCard
                icon={<Palette className="w-5 h-5" />}
                title="Gri Tonlama"
                isActive={settings.desaturation}
                onClick={() => handleFilterChange("desaturation", !settings.desaturation)}
              />
              <FeatureCard
                icon={<Palette className="w-5 h-5 opacity-50" />}
                title="Düşük Doygunluk"
                isActive={settings.lowSaturation}
                onClick={() => handleFilterChange("lowSaturation", !settings.lowSaturation)}
              />
              <FeatureCard
                icon={<Palette className="w-5 h-5" />}
                title="Yüksek Doygunluk"
                isActive={settings.highSaturation}
                onClick={() => handleFilterChange("highSaturation", !settings.highSaturation)}
              />
            </div>
          </div>

          {/* ========== ODAKLANMA ARAÇLARI ========== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
              <Focus className="w-4 h-4" />
              Odaklanma Araçları
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <FeatureCard
                icon={<Pause className="w-5 h-5" />}
                title="Animasyonları Durdur"
                isActive={settings.reduceMotion}
                onClick={() => updateSetting("reduceMotion", !settings.reduceMotion)}
              />
              <FeatureCard
                icon={<ScanLine className="w-5 h-5" />}
                title="Okuma Kılavuzu"
                isActive={settings.readingGuide}
                onClick={() => updateSetting("readingGuide", !settings.readingGuide)}
              />
              <FeatureCard
                icon={<Focus className="w-5 h-5" />}
                title="Okuma Maskesi"
                isActive={settings.readingMask}
                onClick={() => updateSetting("readingMask", !settings.readingMask)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-4 bg-background space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={resetSettings}
            aria-label="Tüm erişilebilirlik ayarlarını varsayılana sıfırla"
          >
            <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Ayarları Sıfırla
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Kısayol: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Alt + 0</kbd>
          </p>
        </div>
      </div>
    </>
  );
};

export default AccessibilityWidget;

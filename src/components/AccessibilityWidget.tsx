import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Accessibility,
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
  VolumeX,
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
import { Label } from "@/components/ui/label";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Separator } from "@/components/ui/separator";

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
    speak(textContent.slice(0, 5000)); // İlk 5000 karakter
  }, [isSpeaking, speak, stop]);

  // Seçili metin okuma
  useEffect(() => {
    if (!settings.readSelectedText || !ttsSupported) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        // Debounce ile oku
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
      
      // Aynı element ise atla
      if (target === lastElement) return;
      lastElement = target;

      // Eski highlight'ı kaldır
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
      // Diğer filtreleri kapat
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
        className="fixed bottom-24 right-4 z-[190] w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Erişilebilirlik ayarlarını aç (Alt+0)"
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
      >
        <Accessibility className="w-6 h-6 accessibility-icon" aria-hidden="true" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[195]" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          id="accessibility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-title"
          className="fixed bottom-4 right-4 z-[2000] w-96 max-h-[85vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl animate-scale-in"
        >
          {/* Header */}
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-primary accessibility-icon" aria-hidden="true" />
              <h2 id="accessibility-title" className="font-semibold text-foreground">
                Erişilebilirlik
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Paneli kapat"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            
            {/* ========== SESLİ OKUMA ========== */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Sesli Okuma
              </h3>
              
              {/* Ekran Okuyucu */}
              {ttsSupported && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    Sayfayı Sesli Oku
                  </Label>
                  <Button
                    variant={isSpeaking ? "destructive" : "outline"}
                    size="sm"
                    onClick={handleScreenReader}
                    className="gap-1"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-3 h-3" /> Durdur
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Oku
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Seçili Alan Okuyucu */}
              <div className="flex items-center justify-between">
                <Label htmlFor="read-selected" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Type className="w-4 h-4" aria-hidden="true" />
                  Seçili Metni Oku
                </Label>
                <Switch
                  id="read-selected"
                  checked={settings.readSelectedText}
                  onCheckedChange={(checked) => updateSetting("readSelectedText", checked)}
                  disabled={!ttsSupported}
                />
              </div>

              {/* Üzerine Gelince Oku */}
              <div className="flex items-center justify-between">
                <Label htmlFor="read-hover" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <MousePointerClick className="w-4 h-4" aria-hidden="true" />
                  Üzerine Gelince Oku
                </Label>
                <Switch
                  id="read-hover"
                  checked={settings.readOnHover}
                  onCheckedChange={(checked) => updateSetting("readOnHover", checked)}
                  disabled={!ttsSupported}
                />
              </div>
            </div>

            <Separator />

            {/* ========== YAZI AYARLARI ========== */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Type className="w-4 h-4" />
                Yazı Ayarları
              </h3>

              {/* Font Size */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  Yazı Boyutu
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decreaseFontSize}
                    disabled={settings.fontSize <= 100}
                    aria-label="Yazı boyutunu küçült"
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <span className="flex-1 text-center font-medium tabular-nums" aria-live="polite">
                    {settings.fontSize}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={increaseFontSize}
                    disabled={settings.fontSize >= 150}
                    aria-label="Yazı boyutunu büyüt"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Line Spacing */}
              <div className="space-y-2">
                <Label htmlFor="line-spacing" className="text-sm font-medium flex items-center gap-2">
                  <AlignJustify className="w-4 h-4" aria-hidden="true" />
                  Satır Aralığı
                </Label>
                <Select
                  value={settings.lineSpacing}
                  onValueChange={(value: "normal" | "wide" | "wider") => updateSetting("lineSpacing", value)}
                >
                  <SelectTrigger id="line-spacing" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Geniş</SelectItem>
                    <SelectItem value="wider">Çok Geniş</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Word Spacing */}
              <div className="space-y-2">
                <Label htmlFor="word-spacing" className="text-sm font-medium flex items-center gap-2">
                  <Space className="w-4 h-4" aria-hidden="true" />
                  Kelime Aralığı
                </Label>
                <Select
                  value={settings.wordSpacing}
                  onValueChange={(value: "normal" | "wide" | "wider") => updateSetting("wordSpacing", value)}
                >
                  <SelectTrigger id="word-spacing" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Geniş</SelectItem>
                    <SelectItem value="wider">Çok Geniş</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dyslexia Friendly */}
              <div className="flex items-center justify-between">
                <Label htmlFor="dyslexia" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Glasses className="w-4 h-4" aria-hidden="true" />
                  Disleksi Dostu
                </Label>
                <Switch
                  id="dyslexia"
                  checked={settings.dyslexiaFriendly}
                  onCheckedChange={(checked) => updateSetting("dyslexiaFriendly", checked)}
                />
              </div>

              {/* Align Text Left */}
              <div className="flex items-center justify-between">
                <Label htmlFor="align-left" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <AlignLeft className="w-4 h-4" aria-hidden="true" />
                  Metni Sola Hizala
                </Label>
                <Switch
                  id="align-left"
                  checked={settings.alignTextLeft}
                  onCheckedChange={(checked) => updateSetting("alignTextLeft", checked)}
                />
              </div>
            </div>

            <Separator />

            {/* ========== GÖRSEL AYARLAR ========== */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Görsel Ayarlar
              </h3>

              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  Yüksek Kontrast
                </Label>
                <Switch
                  id="high-contrast"
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => updateSetting("highContrast", checked)}
                />
              </div>

              {/* Highlight Links */}
              <div className="flex items-center justify-between">
                <Label htmlFor="highlight-links" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Link2 className="w-4 h-4" aria-hidden="true" />
                  Bağlantıları Vurgula
                </Label>
                <Switch
                  id="highlight-links"
                  checked={settings.highlightLinks}
                  onCheckedChange={(checked) => updateSetting("highlightLinks", checked)}
                />
              </div>

              {/* Hide Images */}
              <div className="flex items-center justify-between">
                <Label htmlFor="hide-images" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <ImageOff className="w-4 h-4" aria-hidden="true" />
                  Resimleri Gizle
                </Label>
                <Switch
                  id="hide-images"
                  checked={settings.hideImages}
                  onCheckedChange={(checked) => updateSetting("hideImages", checked)}
                />
              </div>

              {/* Large Cursor */}
              <div className="flex items-center justify-between">
                <Label htmlFor="large-cursor" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <MousePointer2 className="w-4 h-4" aria-hidden="true" />
                  Büyük İmleç
                </Label>
                <Switch
                  id="large-cursor"
                  checked={settings.largeCursor}
                  onCheckedChange={(checked) => updateSetting("largeCursor", checked)}
                />
              </div>
            </div>

            <Separator />

            {/* ========== RENK FİLTRELERİ ========== */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Renk Filtreleri
              </h3>

              {/* Blue Light Filter */}
              <div className="flex items-center justify-between">
                <Label htmlFor="blue-light" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Sun className="w-4 h-4" aria-hidden="true" />
                  Mavi Işık Filtresi
                </Label>
                <Switch
                  id="blue-light"
                  checked={settings.blueLightFilter}
                  onCheckedChange={(checked) => handleFilterChange("blueLightFilter", checked)}
                />
              </div>

              {/* Desaturation */}
              <div className="flex items-center justify-between">
                <Label htmlFor="desaturation" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Palette className="w-4 h-4" aria-hidden="true" />
                  Gri Tonlama
                </Label>
                <Switch
                  id="desaturation"
                  checked={settings.desaturation}
                  onCheckedChange={(checked) => handleFilterChange("desaturation", checked)}
                />
              </div>

              {/* Low Saturation */}
              <div className="flex items-center justify-between">
                <Label htmlFor="low-saturation" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Palette className="w-4 h-4 opacity-50" aria-hidden="true" />
                  Düşük Doygunluk
                </Label>
                <Switch
                  id="low-saturation"
                  checked={settings.lowSaturation}
                  onCheckedChange={(checked) => handleFilterChange("lowSaturation", checked)}
                />
              </div>

              {/* High Saturation */}
              <div className="flex items-center justify-between">
                <Label htmlFor="high-saturation" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Palette className="w-4 h-4" aria-hidden="true" />
                  Yüksek Doygunluk
                </Label>
                <Switch
                  id="high-saturation"
                  checked={settings.highSaturation}
                  onCheckedChange={(checked) => handleFilterChange("highSaturation", checked)}
                />
              </div>
            </div>

            <Separator />

            {/* ========== ODAKLANMA ARAÇLARI ========== */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Focus className="w-4 h-4" />
                Odaklanma Araçları
              </h3>

              {/* Reduce Motion */}
              <div className="flex items-center justify-between">
                <Label htmlFor="reduce-motion" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  Animasyonları Durdur
                </Label>
                <Switch
                  id="reduce-motion"
                  checked={settings.reduceMotion}
                  onCheckedChange={(checked) => updateSetting("reduceMotion", checked)}
                />
              </div>

              {/* Reading Guide */}
              <div className="flex items-center justify-between">
                <Label htmlFor="reading-guide" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <ScanLine className="w-4 h-4" aria-hidden="true" />
                  Okuma Kılavuzu
                </Label>
                <Switch
                  id="reading-guide"
                  checked={settings.readingGuide}
                  onCheckedChange={(checked) => updateSetting("readingGuide", checked)}
                />
              </div>

              {/* Reading Mask */}
              <div className="flex items-center justify-between">
                <Label htmlFor="reading-mask" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Focus className="w-4 h-4" aria-hidden="true" />
                  Okuma Maskesi
                </Label>
                <Switch
                  id="reading-mask"
                  checked={settings.readingMask}
                  onCheckedChange={(checked) => updateSetting("readingMask", checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Fare imleci etrafında karanlık alan oluşturur
              </p>
            </div>

            <Separator />

            {/* Reset Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={resetSettings}
              aria-label="Tüm erişilebilirlik ayarlarını varsayılana sıfırla"
            >
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              Ayarları Sıfırla
            </Button>

            {/* Keyboard Shortcut Hint */}
            <p className="text-xs text-muted-foreground text-center">
              Kısayol: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Alt + 0</kbd>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AccessibilityWidget;

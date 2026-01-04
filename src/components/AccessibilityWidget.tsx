import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AccessibilityWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, resetSettings } = useAccessibility();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Hide on admin routes
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  if (isAdminRoute) {
    return null;
  }

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
        <Accessibility className="w-6 h-6" aria-hidden="true" />
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
          className="fixed bottom-4 right-4 z-[2000] w-80 max-h-[80vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl animate-scale-in"
        >
          {/* Header */}
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-primary" aria-hidden="true" />
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
          <div className="p-4 space-y-5">
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
                aria-describedby="high-contrast-desc"
              />
            </div>
            <p id="high-contrast-desc" className="sr-only">
              Yüksek kontrast modu metin okunabilirliğini artırır
            </p>

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
                aria-describedby="reading-guide-desc"
              />
            </div>
            <p id="reading-guide-desc" className="sr-only">
              Fare imlecini takip eden yatay çizgi okuma odağını korur
            </p>

            {/* Reset Button */}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={resetSettings}
              aria-label="Tüm erişilebilirlik ayarlarını varsayılana sıfırla"
            >
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              Ayarları Sıfırla
            </Button>

            {/* Keyboard Shortcut Hint */}
            <p className="text-xs text-muted-foreground text-center mt-2">
              Kısayol: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Alt + 0</kbd>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AccessibilityWidget;

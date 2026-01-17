import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilitySettings {
  fontSize: number; // 100, 125, 150
  highContrast: boolean;
  highlightLinks: boolean;
  reduceMotion: boolean;
  lineSpacing: 'normal' | 'wide' | 'wider';
  wordSpacing: 'normal' | 'wide' | 'wider';
  largeCursor: boolean;
  readingGuide: boolean;
  // Yeni özellikler
  screenReader: boolean;
  readSelectedText: boolean;
  readOnHover: boolean;
  hideImages: boolean;
  alignTextLeft: boolean;
  readingMask: boolean;
  dyslexiaFriendly: boolean;
  blueLightFilter: boolean;
  desaturation: boolean;
  lowSaturation: boolean;
  highSaturation: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  highlightLinks: false,
  reduceMotion: false,
  lineSpacing: 'normal',
  wordSpacing: 'normal',
  largeCursor: false,
  readingGuide: false,
  // Yeni özellikler - varsayılan kapalı
  screenReader: false,
  readSelectedText: false,
  readOnHover: false,
  hideImages: false,
  alignTextLeft: false,
  readingMask: false,
  dyslexiaFriendly: false,
  blueLightFilter: false,
  desaturation: false,
  lowSaturation: false,
  highSaturation: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    root.style.fontSize = `${settings.fontSize}%`;
    
    // High contrast
    root.classList.toggle('high-contrast', settings.highContrast);
    
    // Highlight links
    root.classList.toggle('highlight-links', settings.highlightLinks);
    
    // Reduce motion
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    
    // Line spacing
    root.classList.remove('line-spacing-normal', 'line-spacing-wide', 'line-spacing-wider');
    root.classList.add(`line-spacing-${settings.lineSpacing}`);
    
    // Word spacing
    root.classList.remove('word-spacing-normal', 'word-spacing-wide', 'word-spacing-wider');
    root.classList.add(`word-spacing-${settings.wordSpacing}`);
    
    // Large cursor
    root.classList.toggle('large-cursor', settings.largeCursor);
    
    // Reading guide
    root.classList.toggle('reading-guide-active', settings.readingGuide);
    
    // Yeni özellikler
    root.classList.toggle('hide-images', settings.hideImages);
    root.classList.toggle('align-text-left', settings.alignTextLeft);
    root.classList.toggle('dyslexia-friendly', settings.dyslexiaFriendly);
    root.classList.toggle('blue-light-filter', settings.blueLightFilter);
    root.classList.toggle('desaturation', settings.desaturation);
    root.classList.toggle('low-saturation', settings.lowSaturation);
    root.classList.toggle('high-saturation', settings.highSaturation);
    
    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

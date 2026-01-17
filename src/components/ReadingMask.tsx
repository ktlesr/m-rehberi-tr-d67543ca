import React, { useState, useEffect, useCallback } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

const ReadingMask: React.FC = () => {
  const { settings } = useAccessibility();
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Yüzde olarak pozisyon hesapla
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setMousePosition({ x, y });
  }, []);

  useEffect(() => {
    if (!settings.readingMask) return;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [settings.readingMask, handleMouseMove]);

  if (!settings.readingMask) return null;

  return (
    <div
      className="reading-mask-overlay"
      style={{
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`,
      } as React.CSSProperties}
      aria-hidden="true"
    />
  );
};

export default ReadingMask;

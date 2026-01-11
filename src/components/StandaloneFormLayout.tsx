import React from 'react';
import { Calendar, Building2 } from 'lucide-react';
import type { FormBranding } from '@/types/formBuilder';

interface StandaloneFormLayoutProps {
  branding: FormBranding;
  formName: string;
  children: React.ReactNode;
}

// Strict hex color validation to prevent CSS injection
const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

// Sanitize color value - returns default if invalid
const sanitizeColor = (color: string | undefined, defaultColor: string): string => {
  if (!color) return defaultColor;
  return isValidHexColor(color) ? color : defaultColor;
};

const StandaloneFormLayout: React.FC<StandaloneFormLayoutProps> = ({
  branding,
  formName,
  children,
}) => {
  // Sanitize colors with strict hex validation
  const accentColor = sanitizeColor(branding.accent_color, '#0d9488'); // teal-600
  const bgColor = sanitizeColor(branding.background_color, '#f3f4f6'); // gray-100
  const title = branding.header_title || formName;
  const subtitle = branding.header_subtitle || 'TEMPLATE';
  const companyName = branding.company_name || 'COMPANY NAME';
  const showCornerDecorations = branding.show_corner_decorations !== false;
  const showDateBadge = branding.show_date_badge !== false;

  const currentDate = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Convert hex to RGB for gradient (input already validated)
  const hexToRgb = (hex: string) => {
    const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 13, g: 148, b: 136 };
  };

  const rgb = hexToRgb(accentColor);
  const accentRgba = (opacity: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

  return (
    <div 
      className="min-h-screen font-sans text-gray-800 relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Geometric Background Shapes */}
      {showCornerDecorations && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          {/* Top Left Triangle */}
          <div 
            className="absolute top-0 left-0 w-0 h-0 opacity-90"
            style={{
              borderTop: `300px solid ${accentColor}`,
              borderRight: '300px solid transparent',
            }}
          />
          <div 
            className="absolute top-0 left-0 w-0 h-0 -z-10"
            style={{
              borderTop: `400px solid ${accentRgba(0.3)}`,
              borderRight: '400px solid transparent',
            }}
          />
          
          {/* Bottom Right Triangle */}
          <div 
            className="absolute bottom-0 right-0 w-0 h-0 opacity-90"
            style={{
              borderBottom: `300px solid ${accentRgba(0.8)}`,
              borderLeft: '300px solid transparent',
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-0 h-0 -z-10"
            style={{
              borderBottom: `500px solid ${accentRgba(0.2)}`,
              borderLeft: '500px solid transparent',
            }}
          />
          
          {/* Abstract Blur Shapes */}
          <div 
            className="absolute top-1/4 right-0 w-64 h-64 rounded-full blur-3xl opacity-50"
            style={{ backgroundColor: accentRgba(0.2) }}
          />
          <div 
            className="absolute bottom-1/4 left-0 w-96 h-96 rounded-full blur-3xl opacity-50"
            style={{ backgroundColor: accentRgba(0.15) }}
          />
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
        {/* Paper Document Container */}
        <div className="bg-white shadow-2xl min-h-[800px] w-full max-w-4xl mx-auto relative flex flex-col">
          
          {/* Top Decorative Bar */}
          <div 
            className="h-3 w-full"
            style={{
              background: `linear-gradient(to right, ${accentColor}, ${accentRgba(0.6)}, ${accentRgba(0.9)})`,
            }}
          />

          {/* Document Header */}
          {branding.show_header && (
            <div className="px-8 pt-10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-double border-gray-100">
              <div>
                <h1 
                  className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2"
                  style={{ color: accentRgba(0.9) }}
                >
                  {title}
                </h1>
                <h2 className="text-xl md:text-2xl font-light text-gray-400 uppercase tracking-[0.2em]">
                  {subtitle}
                </h2>
              </div>
              
              <div className="mt-6 md:mt-0 flex flex-col items-end">
                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-4">
                  {branding.logo_url ? (
                    <img 
                      src={branding.logo_url} 
                      alt="Logo" 
                      className="h-12 w-auto object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-800 flex items-center justify-center text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-400 uppercase">Logo</div>
                    <div className="font-bold text-gray-800">{companyName}</div>
                  </div>
                </div>
                
                {/* Date Badge */}
                {showDateBadge && (
                  <div 
                    className="px-4 py-2 flex items-center gap-3"
                    style={{ 
                      backgroundColor: accentRgba(0.1),
                      borderLeft: `4px solid ${accentColor}`,
                    }}
                  >
                    <Calendar className="w-4 h-4" style={{ color: accentColor }} />
                    <div>
                      <span 
                        className="block text-[10px] font-bold uppercase"
                        style={{ color: accentColor }}
                      >
                        Tarih
                      </span>
                      <span className="block text-sm font-medium text-gray-800">{currentDate}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Header Image (if provided) */}
          {branding.header_image_url && (
            <div className="px-8 pt-6">
              <img 
                src={branding.header_image_url} 
                alt="Header" 
                className="w-full max-h-48 object-cover rounded-lg grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-grow px-8 py-10 md:px-16">
            {/* Custom styles for form fields */}
            <style dangerouslySetInnerHTML={{
              __html: `
                .standalone-form-content .form-section-header {
                  position: relative;
                  margin-bottom: 1.5rem;
                  margin-top: 2rem;
                }
                .standalone-form-content .form-section-header h3 {
                  font-size: 1.25rem;
                  font-weight: 800;
                  color: #1f2937;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  position: relative;
                  z-index: 10;
                  display: inline-block;
                  background: white;
                  padding-right: 1rem;
                }
                .standalone-form-content .form-section-header::after {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 0;
                  width: 100%;
                  height: 4px;
                  background: ${accentRgba(0.15)};
                  z-index: 0;
                }
                .standalone-form-content .form-section-header::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 0;
                  width: 6rem;
                  height: 4px;
                  background: ${accentColor};
                  z-index: 1;
                }
                .standalone-form-content input:not([type="checkbox"]):not([type="radio"]),
                .standalone-form-content textarea,
                .standalone-form-content select {
                  border-radius: 0 !important;
                  border-top: none !important;
                  border-left: none !important;
                  border-right: none !important;
                  border-bottom: 2px solid #e5e7eb !important;
                  background: transparent !important;
                  transition: border-color 0.2s !important;
                }
                .standalone-form-content input:focus,
                .standalone-form-content textarea:focus,
                .standalone-form-content select:focus {
                  border-color: ${accentColor} !important;
                  box-shadow: none !important;
                  outline: none !important;
                }
                .standalone-form-content label {
                  font-size: 0.75rem;
                  font-weight: 700;
                  color: #6b7280;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                }
                .standalone-form-content button[type="submit"] {
                  background-color: ${accentColor} !important;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  transition: all 0.2s;
                }
                .standalone-form-content button[type="submit"]:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 10px 20px ${accentRgba(0.3)};
                }
              `
            }} />
            <div className="standalone-form-content">
              {children}
            </div>
          </div>
          
          {/* Bottom Edge Decoration */}
          <div className="h-2 w-full bg-gray-800" />
        </div>
        
        {/* Footer Text */}
        <p 
          className="text-center mt-8 text-sm font-medium"
          style={{ color: accentRgba(0.6) }}
        >
          Dijital Form Sistemi © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default StandaloneFormLayout;

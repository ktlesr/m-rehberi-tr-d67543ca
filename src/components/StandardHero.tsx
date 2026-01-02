import React from "react";
import { LucideIcon } from "lucide-react";

interface StandardHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: {
    text: string;
    icon?: LucideIcon;
  };
  children?: React.ReactNode;
  compact?: boolean;
}

const StandardHero: React.FC<StandardHeroProps> = ({
  title,
  subtitle,
  description,
  badge,
  children,
  compact = false,
}) => {
  const paddingClass = compact ? "py-8 sm:py-12" : "py-12 sm:py-16";

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-r from-primary/80 via-primary to-primary/90 text-white ${paddingClass}`}
    >
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute -left-4 top-0 h-full w-1/3 bg-gradient-to-r from-white/5 to-transparent blur-3xl"></div>
        <div className="absolute -right-4 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent blur-3xl"></div>
      </div>

      {/* Geometric decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-white/30 rounded-full"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white/30 rounded-full"></div>
        <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-white/20 rounded-full"></div>
        <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 bg-white/20 rounded-full"></div>
      </div>

      <div className="max-w-7xl relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          {badge && (
            <div className="mb-6 animate-fade-in">
              <span className="inline-flex items-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white border border-white/30 shadow-lg backdrop-blur-md">
                {badge.icon && <badge.icon className="mr-3 h-4 w-4" />}
                <span className="mr-3 h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></span>
                {badge.text}
              </span>
            </div>
          )}

          {/* Title */}
          <h1
            className={`font-bold tracking-tight text-white mb-6 animate-fade-in ${
              compact ? "text-3xl sm:text-4xl lg:text-5xl" : "text-4xl sm:text-5xl lg:text-6xl"
            }`}
          >
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <h2 className="text-xl sm:text-2xl font-medium text-white/90 mb-6 animate-fade-in">{subtitle}</h2>
          )}

          {/* Description */}
          {description && (
            <p
              className={`text-lg sm:text-xl leading-8 text-white/80 max-w-3xl mx-auto animate-fade-in font-medium ${
                children ? "mb-4" : "mb-8"
              }`}
            >
              {description}
            </p>
          )}

          {/* Children (CTAs, buttons, etc.) */}
          {children && <div className="animate-fade-in">{children}</div>}
        </div>
      </div>
    </section>
  );
};

export default StandardHero;

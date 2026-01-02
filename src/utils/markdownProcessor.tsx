import React from "react";
import { cn } from "@/lib/utils";

/**
 * Ortak markdown içerik ön işleme fonksiyonu
 * Hem floating widget hem de /chat sayfası için tutarlı formatlama sağlar
 */
export const preprocessMarkdown = (content: string): string => {
  return content
    // ========== BOZUK BOLD TAG DÜZELTMELERİ ==========
    // "**text: **" → "**text:** "
    .replace(/\*\*([^*]+?):\s*\*\*/g, "**$1:** ")
    // "**text:**value" → "**text:** value"
    .replace(/\*\*([^*]+):\*\*(\S)/g, "**$1:** $2")
    // Satır sonundaki yalnız "**" kaldır
    .replace(/\*\*\s*$/gm, "")
    // Satır başındaki yalnız "**" kaldır
    .replace(/^\*\*\s+(?!\S+:)/gm, "")

    // ========== BAŞLIKLARI AYRI SATIRA AL ==========
    // Inline ardışık başlıkları ayır: **A:** val **B:** → ayrı satırlara
    .replace(/(\*\*[^*]+:\*\*)\s*([^:\n]{2,120})\s+(\*\*[^*]+:\*\*)/g, "$1 $2\n\n$3")
    
    // TEK SATIR SONU + BOLD BAŞLIK -> ÇİFT SATIR SONU
    .replace(/\n(\*\*[^*:]+:\*\*)/g, "\n\n$1")
    
    // SATIR İÇİ BOLD BAŞLIKLARDAN ÖNCE ÇİFT SATIR SONU
    .replace(/([^\n\s])(\s*)(\*\*[^*:]+:\*\*)/g, "$1\n\n$3")

    // Bold başlık içeren liste öğelerinden bullet'ı kaldır
    .replace(/^[\*\-]\s+(\*\*[^*]+:\*\*)/gm, "$1")
    .replace(/\n[\*\-]\s+(\*\*[^*]+:\*\*)/g, "\n\n$1")

    // ### başlıklarından önce çift satır sonu
    .replace(/([^\n])(###)/g, "$1\n\n$2")

    // Numaralı liste öğeleri öncesinde satır sonu
    .replace(/([.!?])\s+(\d+)\.\s+/g, "$1\n\n$2. ")

    // Satır sonundaki soru kalıntısını temizle
    .replace(/\*\*([^*]+\?)\*\*\s*(?:---\?)?\s*$/g, "\n\n$1")

    // Çift boşlukları temizle (3+ -> 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/**
 * Ortak markdown bileşenleri
 * Tutarlı tipografi ve spacing için
 */
export const markdownComponents = {
  p: ({ children, ...props }: any) => (
    <p className="mb-3 last:mb-0 leading-relaxed text-sm" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="mb-3 space-y-1.5 pl-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="mb-3 space-y-1.5 pl-1 list-decimal list-inside" {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, ...props }: any) => {
    // Bold başlık içeren liste öğeleri için özel stil
    const childArray = Array.isArray(children) ? children : [children];
    const firstChild = childArray[0];
    const hasBoldHeader =
      firstChild?.type === "strong" ||
      (typeof firstChild === "object" && firstChild?.props?.children?.[0]?.type === "strong");

    if (hasBoldHeader) {
      return (
        <li className="mb-2 list-none text-sm leading-relaxed" {...props}>
          {children}
        </li>
      );
    }

    return (
      <li className="mb-1 ml-4 list-disc text-sm leading-relaxed" {...props}>
        {children}
      </li>
    );
  },
  strong: ({ children, ...props }: any) => {
    // Text içeriğini çıkar
    const getText = (child: any): string => {
      if (typeof child === "string") return child;
      if (Array.isArray(child)) return child.map(getText).join("");
      if (child?.props?.children) return getText(child.props.children);
      return "";
    };

    const text = getText(children);

    // İki nokta içeriyorsa, sadece etiket kısmını bold yap
    if (text.includes(":")) {
      const colonIndex = text.indexOf(":");
      const label = text.substring(0, colonIndex + 1);
      const rest = text.substring(colonIndex + 1);

      return (
        <>
          <strong className="font-semibold text-foreground">{label}</strong>
          <span className="font-normal">{rest}</span>
        </>
      );
    }

    return (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    );
  },
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline font-medium"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <code className="block bg-muted p-3 rounded-lg my-2 text-xs overflow-x-auto" {...props}>
        {children}
      </code>
    ) : (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
        {children}
      </code>
    );
  },
  h1: ({ children }: any) => (
    <h2 className="text-base font-bold mb-2 mt-3 text-foreground">{children}</h2>
  ),
  h2: ({ children }: any) => (
    <h3 className="text-sm font-bold mb-2 mt-3 text-foreground">{children}</h3>
  ),
  h3: ({ children }: any) => (
    <h4 className="text-sm font-semibold mb-1.5 mt-2 text-foreground">{children}</h4>
  ),
};

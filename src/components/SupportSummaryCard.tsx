import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface SupportSummaryCardProps {
  number: number;
  title: string;
  content: string | null;
  link?: string | null;
}

// Helper function to parse content into bullet points
const parseContent = (content: string | null): string[] => {
  if (!content) return [];
  
  // Split by newlines and filter empty lines
  const lines = content.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    // Remove bullet characters at start
    return line.replace(/^[•\-\*]\s*/, '').trim();
  });
};

const SupportSummaryCard: React.FC<SupportSummaryCardProps> = ({
  number,
  title,
  content,
  link,
}) => {
  const lines = parseContent(content);

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground py-3 px-4">
        <CardTitle className="text-base font-semibold">
          {number}) {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4">
        {lines.length > 0 ? (
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Bilgi bulunamadı.</p>
        )}
        
        {link && (
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            {link}
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default SupportSummaryCard;

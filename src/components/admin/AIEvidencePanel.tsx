import React, { useState, useRef, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, FileText, Link as LinkIcon, Quote, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FieldEvidence, FieldIssue, MissingTag } from '@/types/aiDraft';

interface AIEvidencePanelProps {
  evidence: FieldEvidence[];
  issues: FieldIssue[];
  missingTags: MissingTag[];
  onClose: () => void;
}

const fieldLabels: Record<string, string> = {
  institution_id: 'Kurum',
  application_deadline: 'Son Başvuru Tarihi',
  title: 'Program Adı',
  description: 'Açıklama',
  eligibility_criteria: 'Kimler Başvurabilir',
  contact_info: 'İletişim Bilgileri',
};

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-red-100 text-red-800 border-red-200',
};

const confidenceLabels: Record<string, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

export function AIEvidencePanel({ evidence, issues, missingTags, onClose }: AIEvidencePanelProps) {
  // Position state
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // Size state (resizable)
  const [size, setSize] = useState({ width: 384, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; initialW: number; initialH: number } | null>(null);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  }, [position]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialW: size.width,
      initialH: size.height,
    };
  }, [size]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragRef.current) {
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.initialX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.initialY + deltaY));
      
      setPosition({ x: newX, y: newY });
    }
    
    if (isResizing && resizeRef.current) {
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      
      const newWidth = Math.max(320, Math.min(800, resizeRef.current.initialW + deltaX));
      const newHeight = Math.max(300, Math.min(window.innerHeight - 100, resizeRef.current.initialH + deltaY));
      
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, size.width]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  return (
    <>
      {/* Overlay only active during drag/resize - allows background interaction otherwise */}
      {(isDragging || isResizing) && (
        <div 
          className="fixed inset-0 z-40"
          style={{ cursor: isDragging ? 'move' : 'se-resize' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}
      
      {/* Draggable & Resizable Panel */}
      <div 
        className="fixed bg-white shadow-2xl border rounded-lg flex flex-col z-50"
        style={{ 
          left: position.x, 
          top: position.y,
          width: size.width,
          height: size.height,
        }}
      >
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg cursor-move select-none flex-shrink-0"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-gray-400" />
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-800">AI Analiz Sonuçları</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Issues Section */}
            {issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Uyarılar ({issues.length})
                </h4>
                <div className="space-y-2">
                  {issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-amber-800">
                          {fieldLabels[issue.field_key] || issue.field_key}:
                        </span>
                        <span className="text-amber-700">{issue.message}</span>
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {issue.type === 'missing' ? 'Eksik' : issue.type === 'conflict' ? 'Çakışma' : 'Format'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Tags Section */}
            {missingTags.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Eşleştirilemeyen Etiketler
                </h4>
                <div className="space-y-2">
                  {missingTags.map((mt, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                      <div className="font-medium text-blue-800 mb-1">{mt.category}</div>
                      <div className="flex flex-wrap gap-1">
                        {mt.labels.map((label, lidx) => (
                          <Badge key={lidx} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Alan Kanıtları
              </h4>
              <div className="space-y-3">
                {evidence.map((ev, idx) => (
                  <Collapsible key={idx}>
                    <div className="p-3 rounded-lg bg-gray-50 border">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800 text-sm">
                            {fieldLabels[ev.field_key] || ev.field_key}
                          </span>
                          <Badge className={`text-xs ${confidenceColors[ev.confidence]}`}>
                            {confidenceLabels[ev.confidence]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 text-left line-clamp-2">
                          {ev.value}
                        </p>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {/* Quotes */}
                          {ev.quotes.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <Quote className="w-3 h-3" />
                                Alıntılar
                              </div>
                              {ev.quotes.map((quote, qidx) => (
                                <div
                                  key={qidx}
                                  className="text-xs italic text-gray-600 bg-white p-2 rounded border-l-2 border-purple-300 mb-1"
                                >
                                  "{quote}"
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Refs */}
                          {ev.refs.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <LinkIcon className="w-3 h-3" />
                                Kaynaklar
                              </div>
                              {ev.refs.map((ref, ridx) => (
                                <div key={ridx} className="text-xs text-gray-600 flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  <span>{ref.source}</span>
                                  {ref.page_or_article && (
                                    <span className="text-gray-400">(Sayfa {ref.page_or_article})</span>
                                  )}
                                  {ref.url && (
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline"
                                    >
                                      Aç
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
          <p className="text-xs text-gray-500 text-center">
            AI tarafından oluşturulmuştur. Lütfen bilgileri kontrol edin.
          </p>
        </div>

        {/* Resize Handle - Bottom Right Corner */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
          onMouseDown={handleResizeStart}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="w-full h-full text-gray-300 group-hover:text-gray-500 transition-colors"
          >
            <path 
              fill="currentColor" 
              d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"
            />
          </svg>
        </div>
      </div>
    </>
  );
}
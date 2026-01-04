import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, FileText, Link as LinkIcon, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">AI Analiz Sonuçları</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
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
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          AI tarafından oluşturulmuştur. Lütfen bilgileri kontrol edin.
        </p>
      </div>
    </div>
  );
}

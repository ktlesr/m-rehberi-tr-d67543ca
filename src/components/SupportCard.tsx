
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarDays, Building2, ChevronDown, FileText, Download, Share2, MessageSquare, Tag, BookOpen } from 'lucide-react';
import { SupportProgram } from '@/types/support';
import { toast } from 'sonner';
import { getFileIcon, getFileIconColor } from '@/utils/fileIcons';
import { isProgramOpen } from '@/utils/dateUtils';

interface SupportCardProps {
  program: SupportProgram;
}

export const SupportCard = ({ program }: SupportCardProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const isOpenProgram = isProgramOpen(program?.application_deadline);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/searchsupport`;
    const shareText = `${program?.title}\n\n${program?.description?.slice(0, 200)}...`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: program?.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to clipboard
        if ((error as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(`${program?.title}\n${shareUrl}`);
          toast.success('Link kopyalandı!');
        }
      }
    } else {
      navigator.clipboard.writeText(`${program?.title}\n${shareUrl}`);
      toast.success('Link kopyalandı!');
    }
  };

  const handleFeedback = () => {
    const subject = encodeURIComponent(`Geri Bildirim: ${program?.title}`);
    const body = encodeURIComponent(`Program: ${program?.title}\n\nGeri Bildiriminiz:\n\n`);
    window.open(`mailto:destek@tesviksor.com?subject=${subject}&body=${body}`, '_blank');
  };

  

  // Filter tags to show only "Applicant Type" tags
  const applicantTypeTags = program.tags?.filter(tag => 
    tag.category?.name === 'Applicant Type'
  ) || [];

  // Check if program has summary data
  const hasSummary = program.summary && (
    program.summary.who_can_apply || 
    program.summary.supported_areas || 
    program.summary.application_period || 
    program.summary.application_location
  );
  const summaryPdfUrl = program.summary?.summary_pdf_url;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                {program.title}
              </CardTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${isOpenProgram ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${isOpenProgram ? 'text-green-600' : 'text-red-600'}`}>
                  {isOpenProgram ? 'Açık' : 'Kapalı'}
                </span>
              </div>
            </div>
          </div>
          {program.application_deadline && (
            <Badge className="ml-2 flex-shrink-0 bg-yellow-100 text-yellow-800 border-yellow-300">
              <CalendarDays className="w-3 h-3 mr-1" />
              {formatDate(program.application_deadline)}
            </Badge>
          )}
        </div>
        
        {program.institution && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-4 h-4 mr-1" />
            <span>{program.institution.name}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full text-sm flex items-center justify-between">
              Detayları Görüntüle
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="border-t pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500 mb-4 gap-3">
                <span>Oluşturma: {formatDate(program.created_at)} | Güncellenme: {formatDate(program.updated_at)}</span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {/* Özet Bilgi'ye Git Button */}
                  {hasSummary && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => navigate(`/program/${program.id}/ozet`)}
                      className="w-full sm:w-auto"
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      Özet Bilgi'ye Git
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleFeedback} className="w-full sm:w-auto">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Geri Bildirim
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare} className="w-full sm:w-auto">
                    <Share2 className="w-4 h-4 mr-1" />
                    Paylaş
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isOpenProgram ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={isOpenProgram ? 'text-green-600' : 'text-red-600'}>
                    {isOpenProgram ? 'Açık' : 'Kapalı'}
                  </span>
                  {program.application_deadline && (
                    <span>- Son Başvuru: {formatDate(program.application_deadline)}</span>
                  )}
                </div>
              </div>

              {applicantTypeTags.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Tag className="w-4 h-4 mr-2" />
                    Kimler Başvurabilir?
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {applicantTypeTags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {((program.files && program.files.length > 0) || summaryPdfUrl) && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    İlgili Belgeler ({(program.files?.length || 0) + (summaryPdfUrl ? 1 : 0)})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Özet Bilgi Formu PDF - shown first */}
                    {summaryPdfUrl && (
                      <div className="flex items-center justify-between p-2 bg-primary/10 rounded-md hover:bg-primary/20 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
                          <span className="text-xs font-medium text-primary truncate">
                            Özet Bilgi Formu (PDF)
                          </span>
                        </div>
                        <a
                          href={summaryPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary hover:text-primary/80 text-xs ml-2 flex-shrink-0"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    
                    {/* Regular file attachments */}
                    {program.files?.map((file) => {
                      const FileIcon = getFileIcon(file.filename);
                      const iconColor = getFileIconColor(file.filename);
                      
                      return (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                            <span className="text-xs text-gray-700 truncate" title={file.filename}>
                              {file.filename}
                            </span>
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800 text-xs ml-2 flex-shrink-0"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

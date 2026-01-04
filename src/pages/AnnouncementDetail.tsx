import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import MainNavbar from '@/components/MainNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { markdownComponents } from '@/utils/markdownComponents';

const AnnouncementDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: announcement, isLoading, error } = useQuery({
    queryKey: ['announcement', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <MainNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-12 w-32" />
            <Card>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-24 h-24 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <MainNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-4xl font-bold">Duyuru Bulunamadı</h1>
            <p className="text-muted-foreground">Aradığınız duyuru bulunamadı veya artık aktif değil.</p>
            <Button onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <MainNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Duyurulara Dön
          </Button>

          <Card className="overflow-hidden">
            <CardContent className="p-8 space-y-6">
              {/* Header Section */}
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 bg-white rounded-xl shadow-md flex items-center justify-center p-4 flex-shrink-0">
                  <img
                    src={announcement.institution_logo}
                    alt={announcement.institution_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold text-primary">
                    {announcement.institution_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(announcement.announcement_date), 'd MMMM yyyy', { locale: tr })}
                  </p>
                </div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-3xl font-bold text-foreground leading-tight">
                  {announcement.title}
                </h1>
              </div>

              {/* Content */}
              <div className="prose prose-slate max-w-none text-base leading-relaxed text-foreground">
                <ReactMarkdown components={markdownComponents}>
                  {announcement.detail}
                </ReactMarkdown>
              </div>

              {/* External Link */}
              {announcement.external_link && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => window.open(announcement.external_link, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Detaylı Bilgi
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;

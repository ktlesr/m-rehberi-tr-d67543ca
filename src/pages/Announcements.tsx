import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MainNavbar from '@/components/MainNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Megaphone, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 9;

const Announcements = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['all-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('announcement_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const visibleAnnouncements = announcements.slice(0, visibleCount);
  const hasMore = visibleCount < announcements.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <MainNavbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Duyurular
                </h1>
                <p className="text-muted-foreground mt-1">
                  Tüm güncel destek ve teşvik duyurularını buradan takip edin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-72">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="w-20 h-20 mx-auto rounded-lg" />
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-16">
              <Megaphone className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Henüz Duyuru Yok
              </h2>
              <p className="text-muted-foreground">
                Şu anda aktif duyuru bulunmamaktadır.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleAnnouncements.map((announcement) => (
                  <Card
                    key={announcement.id}
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    onClick={() => navigate(`/duyuru/${announcement.id}`)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      {/* Institution Logo */}
                      <div className="mb-4 flex justify-center">
                        <div className="w-20 h-20 bg-white rounded-xl shadow-sm flex items-center justify-center p-3 group-hover:shadow-md transition-shadow">
                          <img
                            src={announcement.institution_logo}
                            alt={announcement.institution_name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Institution Name */}
                      <p className="text-sm font-medium text-primary text-center mb-2">
                        {announcement.institution_name}
                      </p>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-foreground mb-4 line-clamp-3 flex-grow text-center">
                        {announcement.title}
                      </h3>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                        <span>
                          {format(new Date(announcement.announcement_date), 'd MMMM yyyy', { locale: tr })}
                        </span>
                        <div className="flex items-center gap-2">
                          {announcement.external_link && (
                            <ExternalLink className="h-4 w-4" />
                          )}
                          <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin hidden" />
                    Daha Fazla Yükle ({announcements.length - visibleCount} duyuru daha)
                  </Button>
                </div>
              )}

              {/* Count Info */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                Toplam {announcements.length} duyuru gösteriliyor
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Announcements;

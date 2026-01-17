import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MainNavbar from '@/components/MainNavbar';
import StandardHero from '@/components/StandardHero';
import SupportSummaryCard from '@/components/SupportSummaryCard';
import { SupportProgram } from '@/types/support';
import { SupportProgramSummary } from '@/types/supportSummary';
import SupportSummaryPDF from '@/components/SupportSummaryPDF';

// Lazy load only PDFDownloadLink
const PDFDownloadLink = lazy(() => 
  import('@react-pdf/renderer').then(module => ({ default: module.PDFDownloadLink }))
);

const SupportSummary = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<SupportProgram | null>(null);
  const [summary, setSummary] = useState<SupportProgramSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch program
      const { data: programData, error: programError } = await supabase
        .from('support_programs')
        .select(`
          *,
          institution:institutions(*)
        `)
        .eq('id', id)
        .single();

      if (programError) throw programError;

      if (programData) {
        setProgram({
          ...programData,
          tags: [],
          files: []
        });
      }

      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('support_program_summaries')
        .select('*')
        .eq('support_program_id', id)
        .maybeSingle();

      if (summaryError) throw summaryError;
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Program bulunamadı</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavbar />
        <StandardHero 
          title={program.title}
          subtitle="Özet Bilgi Formu"
        />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Bu program için henüz özet bilgi oluşturulmamış.</p>
            <Button onClick={() => navigate(`/program/${id}`)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Program Detayına Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get institution logo if available
  const institutionLogo = program.institution?.name 
    ? `/img/instlogo/${program.institution.name.toLowerCase().replace(/\s+/g, '')}.png`
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <MainNavbar />
      <StandardHero 
        title={program.title}
        subtitle="Özet Bilgi Formu"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button and actions */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => navigate(`/program/${id}`)} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Program Detayına Dön
          </Button>
          
          <Suspense fallback={
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              PDF Hazırlanıyor...
            </Button>
          }>
            <PDFDownloadLink
              document={
                <SupportSummaryPDF
                  programTitle={program.title}
                  institutionName={program.institution?.name}
                  institutionLogo={institutionLogo}
                  whoCanApply={summary.who_can_apply}
                  supportedAreas={summary.supported_areas}
                  applicationPeriod={summary.application_period}
                  applicationLocation={summary.application_location}
                  applicationUrl={summary.application_url}
                  updatedAt={program.updated_at}
                />
              }
              fileName={`${program.title.replace(/\s+/g, '_')}_Ozet_Bilgi_Formu.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button disabled={pdfLoading}>
                  {pdfLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  PDF İndir
                </Button>
              )}
            </PDFDownloadLink>
          </Suspense>
        </div>

        {/* Institution info */}
        {program.institution && (
          <div className="flex items-center gap-2 text-muted-foreground mb-6">
            <Building2 className="w-5 h-5" />
            <span>{program.institution.name}</span>
          </div>
        )}

        {/* Summary Cards */}
        <SupportSummaryCard
          number={1}
          title="Kimler Yararlanabilir?"
          content={summary.who_can_apply}
        />
        
        <SupportSummaryCard
          number={2}
          title="Desteklenen Alanlar ve Destek Unsurları Nelerdir?"
          content={summary.supported_areas}
        />
        
        <SupportSummaryCard
          number={3}
          title="Başvuru Dönemi Ne Zamandır?"
          content={summary.application_period}
        />
        
        <SupportSummaryCard
          number={4}
          title="Başvuru Yeri Neresidir?"
          content={summary.application_location}
          link={summary.application_url}
        />

        {/* Bottom PDF Download */}
        <div className="mt-8 text-center">
          <Suspense fallback={
            <Button size="lg" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              PDF Hazırlanıyor...
            </Button>
          }>
            <PDFDownloadLink
              document={
                <SupportSummaryPDF
                  programTitle={program.title}
                  institutionName={program.institution?.name}
                  institutionLogo={institutionLogo}
                  whoCanApply={summary.who_can_apply}
                  supportedAreas={summary.supported_areas}
                  applicationPeriod={summary.application_period}
                  applicationLocation={summary.application_location}
                  applicationUrl={summary.application_url}
                  updatedAt={program.updated_at}
                />
              }
              fileName={`${program.title.replace(/\s+/g, '_')}_Ozet_Bilgi_Formu.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button size="lg" disabled={pdfLoading}>
                  {pdfLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  PDF Olarak İndir
                </Button>
              )}
            </PDFDownloadLink>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default SupportSummary;

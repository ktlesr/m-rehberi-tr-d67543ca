import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Target, Star, Zap, Cpu, CheckCircle, XCircle, AlertTriangle, Rocket } from 'lucide-react';
import { Download } from 'lucide-react';
import { UnifiedQueryData } from '@/components/UnifiedIncentiveQuery';
import { IncentiveResult } from '@/types/incentive';
import { LocationSupport } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { pdf } from '@react-pdf/renderer';
import IncentiveReportPDF from '@/components/IncentiveReportPDF';
import { isIstanbulMiningInvestment, isResGesInvestment, getGesResOverrideValues, isIstanbulTargetInvestment } from '@/utils/investmentValidation';
import { isRegion6Province, checkSpecialProgramEligibility, SpecialProgramEligibility } from '@/utils/regionUtils';
import { determineInvestmentStatus, getStatusBadges } from '@/utils/investmentStatusHelper';

interface IncentiveResultsStepProps {
  queryData: UnifiedQueryData;
  incentiveResult: IncentiveResult | null;
  setIncentiveResult: (result: IncentiveResult | null) => void;
  isCalculating: boolean;
  setIsCalculating: (calculating: boolean) => void;
  onSuccessfulQuery?: () => Promise<void>;
}

const IncentiveResultsStep: React.FC<IncentiveResultsStepProps> = ({
  queryData,
  incentiveResult,
  setIncentiveResult,
  isCalculating,
  setIsCalculating,
  onSuccessfulQuery,
}) => {
  // Helper function to format percentage - fixed to not multiply by 100
  const formatPercentage = (value: string): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return `%${numValue.toFixed(0)}`;
  };

  // Helper function to format currency
  const formatCurrency = (value: string): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return `${numValue.toLocaleString('tr-TR')} TL`;
  };

  // Helper function to get support values based on business rules
  const getSupportValues = (incentiveResult: IncentiveResult) => {
    const region = incentiveResult.location.region;
    const isTarget = incentiveResult.sector.isTarget;
    const isPriority = incentiveResult.sector.isPriority;
    const isHighTech = incentiveResult.sector.isHighTech;
    const isMidHighTech = incentiveResult.sector.isMidHighTech;
    
    // Check if it's a combination (hedef + any other type)
    const isCombination = isTarget && (isPriority || isHighTech || isMidHighTech);
    
    let targetSupports = {
      taxDiscount: "20", // Always 20% for target investments
      interestSupport: "N/A",
      cap: "N/A"
    };
    
    // Check for Istanbul target investment - no tax reduction support
    if (isIstanbulTargetInvestment(incentiveResult.location.province, isTarget)) {
      targetSupports.taxDiscount = "Uygulanmaz (İstanbul'da hedef yatırımlarda)";
    }
    
    let prioritySupports = {
      taxDiscount: "30", // Always 20%
      interestSupport: "25", // Always 25%
      cap: "24000000" // Always 24M TL
    };

    // Apply business rules for target supports
    if (isTarget) {
      if ([1, 2, 3].includes(region)) {
        // Regions 1, 2, 3: No interest/profit share support for target
        targetSupports.interestSupport = "N/A";
        targetSupports.cap = "N/A";
      } else if ([4, 5, 6].includes(region)) {
        // Regions 4, 5, 6: Interest/profit share support available
        targetSupports.interestSupport = "25";
        targetSupports.cap = "12000000";
      }
    }

    // Check for GES/RES special case
    if (queryData.selectedSector && isResGesInvestment({
      nace_kodu: queryData.selectedSector.nace_kodu,
      sektor: queryData.selectedSector.sektor
    })) {
      const gesResOverrides = getGesResOverrideValues();
      
      // Override interest support values for both target and priority
      if (targetSupports.interestSupport !== "N/A") {
        targetSupports.interestSupport = gesResOverrides.interestSupport;
        targetSupports.cap = gesResOverrides.interestSupportCap;
      }
      
      prioritySupports.interestSupport = gesResOverrides.interestSupport;
      prioritySupports.cap = gesResOverrides.interestSupportCap;
    }

    return {
      target: targetSupports,
      priority: prioritySupports,
      isCombination
    };
  };

  // Check if we should show Istanbul mining warning
  const shouldShowIstanbulMiningWarning = () => {
    if (!queryData.selectedSector || !queryData.selectedProvince) return false;
    
    return isIstanbulMiningInvestment(
      queryData.selectedProvince,
      queryData.selectedSector.nace_kodu
    );
  };

  // Enhanced PDF generation function using @react-pdf/renderer
  const generatePDF = async () => {
    if (!incentiveResult) return;

    try {
      const pdfBlob = await pdf(
        <IncentiveReportPDF 
          incentiveResult={incentiveResult} 
        />
      ).toBlob();
      
      const fileName = `tesvik-raporu-${incentiveResult.sector.nace_code}-${new Date().toISOString().split("T")[0]}.pdf`;
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF İndirildi",
        description: "Teşvik raporu başarıyla indirildi.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Hata",
        description: "PDF oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const getProvinceRegion = async (provinceName: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('province_region_map')
        .select('region_number')
        .eq('province_name', provinceName)
        .single();

      if (error) {
        console.error('Error fetching province region:', error);
        return 1;
      }

      return data?.region_number || 1;
    } catch (error) {
      console.error('Error fetching province region:', error);
      return 1;
    }
  };

  const getLocationSupport = async (province: string, district: string): Promise<LocationSupport | null> => {
    try {
      const { data, error } = await supabase
        .from('location_support')
        .select('*')
        .eq('il', province)
        .eq('ilce', district)
        .single();

      if (error) {
        console.error('Error fetching location support:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching location support:', error);
      return null;
    }
  };

  const getSgkDuration = async (province: string, district: string, osbStatus: "İÇİ" | "DIŞI"): Promise<string> => {
    try {
      const osbBoolean = osbStatus === "İÇİ";
      
      const { data, error } = await supabase
        .from('sgk_durations')
        .select('sgk_duration')
        .eq('province', province)
        .eq('district', district)
        .eq('osb_status', osbBoolean)
        .maybeSingle();

      if (error) {
        console.error('Error fetching SGK duration:', error);
        return "1. Bölgede OSB/EB Dışı yatırımlarda SGK desteği uygulanmamaktadır";
      }

      if (data?.sgk_duration) {
        return `${data.sgk_duration} yıl`;
      }

      return "1. Bölgede OSB/EB Dışı yatırımlarda SGK desteği uygulanmamaktadır";
    } catch (error) {
      console.error('Error fetching SGK duration:', error);
      return "1. Bölgede OSB/EB Dışı yatırımlarda SGK desteği uygulanmamaktadır";
    }
  };

  const getAltBolge = async (province: string, district: string, osbStatus: "İÇİ" | "DIŞI"): Promise<string> => {
    try {
      const osbBoolean = osbStatus === "İÇİ";
      
      const { data, error } = await supabase
        .from('sgk_durations')
        .select('alt_bolge')
        .eq('province', province)
        .eq('district', district)
        .eq('osb_status', osbBoolean)
        .maybeSingle();

      if (error) {
        console.error('Error fetching alt bolge:', error);
        return "";
      }

      if (data && data.alt_bolge) {
        return `${data.alt_bolge}. Alt Bölge`;
      }

      return "";
    } catch (error) {
      console.error('Error fetching alt bolge:', error);
      return "";
    }
  };

  const calculateIncentives = async () => {
    if (!queryData.selectedSector || !queryData.selectedProvince || !queryData.selectedDistrict || !queryData.osbStatus) {
      return;
    }

    setIsCalculating(true);
    
    try {
      const region = await getProvinceRegion(queryData.selectedProvince);
      
      // Check for special program eligibility (Cazibe Merkezleri / Deprem Bölgesi)
      const specialProgram = checkSpecialProgramEligibility(
        queryData.selectedProvince,
        queryData.selectedDistrict,
        queryData.osbStatus,
        queryData.selectedSector.nace_kodu,
        region
      );
      
      // Determine effective region (6 if special program applies)
      const effectiveRegion = specialProgram.isEligible ? 6 : region;
      
      const regionKey = `bolge_${effectiveRegion}` as keyof typeof queryData.selectedSector;
      const minInvestment = queryData.selectedSector[regionKey] as number || 0;
      
      const locationSupportData = await getLocationSupport(queryData.selectedProvince, queryData.selectedDistrict);
      
      // Get SGK duration - if special program applies, use 6th region values
      let sgkDuration: string;
      let altBolge: string;
      
      if (specialProgram.isEligible) {
        // 6th region SGK durations: OSB inside 14 years, OSB outside 12 years
        sgkDuration = queryData.osbStatus === "İÇİ" ? "14 yıl" : "12 yıl";
        altBolge = ""; // No subregion concept in special programs
      } else {
        sgkDuration = await getSgkDuration(queryData.selectedProvince, queryData.selectedDistrict, queryData.osbStatus);
        altBolge = await getAltBolge(queryData.selectedProvince, queryData.selectedDistrict, queryData.osbStatus);
      }
      
      // Check if current province is in Region 6 or special program applies
      const isProvince6 = isRegion6Province(queryData.selectedProvince);
      const applyRegion6Benefits = isProvince6 || specialProgram.isEligible;
      
      // Apply hierarchical investment status logic
      const investmentStatus = determineInvestmentStatus(
        {
          teknoloji_hamlesi: queryData.selectedSector.teknoloji_hamlesi,
          yuksek_teknoloji: queryData.selectedSector.yuksek_teknoloji || false,
          orta_yuksek_teknoloji: queryData.selectedSector.orta_yuksek_teknoloji || false,
          hedef_yatirim: queryData.selectedSector.hedef_yatirim || false,
          oncelikli_yatirim: queryData.selectedSector.oncelikli_yatirim || false
        },
        undefined, // investmentAmount not known yet
        queryData.selectedProvince
      );
      
      const result: IncentiveResult = {
        sector: {
          nace_code: queryData.selectedSector.nace_kodu,
          name: queryData.selectedSector.sektor,
          // For Region 6 provinces or special programs, always priority
          // Otherwise use hierarchical status
          isTarget: applyRegion6Benefits ? false : investmentStatus.isTarget,
          isPriority: applyRegion6Benefits ? true : investmentStatus.isPriority,
          isHighTech: investmentStatus.isHighTech,
          isMidHighTech: investmentStatus.isMidHighTech,
          isTechInitiative: investmentStatus.isTechInitiative,
          investmentStatusExplanation: investmentStatus.explanation,
          conditions: queryData.selectedSector.sartlar || "",
          minInvestment: minInvestment
        },
        location: {
          province: queryData.selectedProvince,
          district: queryData.selectedDistrict,
          osb_status: queryData.osbStatus,
          region: effectiveRegion,
          originalRegion: specialProgram.isEligible ? region : undefined,
          subregion: altBolge,
          sgk_duration: sgkDuration,
          specialProgram: specialProgram.isEligible ? specialProgram : undefined
        },
        supports: {
          vat_exemption: locationSupportData?.kdv_istisnasi || false,
          customs_exemption: locationSupportData?.gumruk_muafiyeti || false,
          target_tax_discount: locationSupportData?.hedef_vergi_indirimi_yko || "N/A",
          target_interest_support: locationSupportData?.hedef_faiz_karpayi_do || "N/A",
          target_cap: locationSupportData?.hedef_faiz_karpayi_ust_limit_tutari || "N/A",
          target_cap_ratio: locationSupportData?.hedef_faiz_karpayi_syt_orani || "N/A",
          priority_tax_discount: locationSupportData?.oncelikli_vergi_indirimi_yko || "N/A",
          priority_interest_support: locationSupportData?.oncelikli_faiz_karpayi_do || "N/A",
          priority_cap: locationSupportData?.oncelikli_faiz_karpayi_ust_limit_tutari || "N/A",
          priority_cap_ratio: locationSupportData?.oncelikli_faiz_karpayi_syt_orani || "N/A"
        }
      };

      setIncentiveResult(result);
      
      // Call onSuccessfulQuery callback to increment counter
      if (onSuccessfulQuery) {
        await onSuccessfulQuery();
      }
      
      toast({
        title: "Hesaplama Tamamlandı",
        description: `Sektör: ${queryData.selectedSector.sektor} - Teşvik hesaplaması başarıyla tamamlandı.`,
      });
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: "Hata",
        description: "Hesaplama sırasında bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const refreshSearch = () => {
    // Clear all search data and reset to initial state
    setIncentiveResult(null);
    window.location.reload();
  };

  useEffect(() => {
    if (queryData.selectedSector && queryData.selectedProvince && queryData.selectedDistrict && queryData.osbStatus && !incentiveResult) {
      calculateIncentives();
    }
  }, [queryData.selectedSector, queryData.selectedProvince, queryData.selectedDistrict, queryData.osbStatus]);

  if (isCalculating) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Calculator className="h-5 w-5 animate-spin" />
            <span>Teşvikler hesaplanıyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!incentiveResult) {
    return null;
  }

  // Get support values based on business rules
  const supportValues = getSupportValues(incentiveResult);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Teşvik Sonuçları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sector Summary */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">{incentiveResult.sector.name}</h4>
                <Badge variant="outline">{incentiveResult.sector.nace_code}</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                {incentiveResult.sector.isTechInitiative && (
                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-1">
                    <Rocket className="h-3 w-3" />
                    Teknoloji Hamlesi
                  </Badge>
                )}
                {incentiveResult.sector.isPriority && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Öncelikli Yatırım
                  </Badge>
                )}
                {incentiveResult.sector.isTarget && !incentiveResult.sector.isPriority && (
                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Hedef Yatırım
                  </Badge>
                )}
                {incentiveResult.sector.isHighTech && (
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Yüksek Teknoloji
                  </Badge>
                )}
                {incentiveResult.sector.isMidHighTech && (
                  <Badge className="bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    Orta-Yüksek Teknoloji
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Lokasyon:</span>
                  <div className="font-medium">{incentiveResult.location.province} / {incentiveResult.location.district}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Minimum Yatırım Tutarı:</span>
                  {(incentiveResult.sector.isMidHighTech || incentiveResult.sector.isHighTech) ? (
                    <div className="space-y-1 mt-1">
                      <div className="font-medium flex items-center gap-2">
                        <Target className="h-3 w-3 text-blue-500" />
                        <span>Hedef İçin: {incentiveResult.sector.minInvestment?.toLocaleString('tr-TR')} TL</span>
                      </div>
                      <div className="font-medium flex items-center gap-2">
                        <Star className="h-3 w-3 text-green-500" />
                        <span>Öncelikli İçin: {incentiveResult.sector.isMidHighTech 
                          ? "1.254.900.000 TL" 
                          : "627.450.000 TL"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="font-medium">{incentiveResult.sector.minInvestment?.toLocaleString('tr-TR')} TL</div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Bölge:</span>
                  <div className="font-medium">{incentiveResult.location.region}. Bölge</div>
                </div>
                <div>
                  <span className="text-muted-foreground">SGK Destek Süresi:</span>
                  <div className="font-medium">{incentiveResult.location.sgk_duration}</div>
                </div>
              </div>
              {incentiveResult.location.subregion && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Alt Bölge:</span>
                  <Badge variant="outline" className="ml-2">{incentiveResult.location.subregion}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Special Program Alert (Cazibe Merkezleri / Deprem Bölgesi) */}
          {incentiveResult.location.specialProgram?.isEligible && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                <strong>
                  {incentiveResult.location.specialProgram.programType === 'earthquake_zone' 
                    ? '🏗️ Deprem Bölgesi Teşviki Uygulandı' 
                    : '🎯 Cazibe Merkezleri Programı Uygulandı'}
                </strong>
                <br />
                {incentiveResult.location.specialProgram.description}
                {incentiveResult.location.originalRegion && (
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      Orijinal: {incentiveResult.location.originalRegion}. Bölge
                    </Badge>
                    <Badge className="bg-emerald-500 text-white text-xs">
                      Uygulanan: 6. Bölge
                    </Badge>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Istanbul Target Investment Tax Reduction Warning */}
          {incentiveResult.sector.isTarget && incentiveResult.location.province === "İstanbul" && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Önemli Bilgi:</strong> İstanbul ilinde hedef yatırımlar için Vergi İndirimi Desteği uygulanmamaktadır.
              </AlertDescription>
            </Alert>
          )}

          {/* Target Sector Interest/Profit Share Support Warning */}
          {incentiveResult.sector.isTarget && [1, 2, 3].includes(incentiveResult.location.region) && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Önemli Bilgi:</strong> Hedef sektörler için Faiz/Kar Payı Desteği 1., 2. ve 3. bölgelerde uygulanmamaktadır.
              </AlertDescription>
            </Alert>
          )}

          {/* Orta-Yüksek/Yüksek Teknoloji Öncelikli Yatırım Şartları Uyarısı */}
          {(incentiveResult.sector.isMidHighTech || incentiveResult.sector.isHighTech) && !incentiveResult.sector.isPriority && (
            <Alert className="border-purple-200 bg-purple-50">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>Önemli Bilgi:</strong>{' '}
                {incentiveResult.sector.isMidHighTech ? (
                  <>
                    Bu yatırım orta-yüksek teknoloji yatırımı niteliğindedir. 
                    <strong> Öncelikli yatırım</strong> statüsü kazanabilmesi için:
                    <ul className="list-disc ml-5 mt-1">
                      <li>İstanbul ili dışında gerçekleştirilmesi</li>
                      <li>Yatırım tutarının en az <strong>1.254.900.000 TL</strong> olması</li>
                    </ul>
                    şartlarını sağlaması gerekmektedir. Bu şartlar sağlanmadığı takdirde <strong>Hedef yatırım</strong> olarak değerlendirilir.
                  </>
                ) : (
                  <>
                    Bu yatırım yüksek teknoloji yatırımı niteliğindedir. 
                    <strong> Öncelikli yatırım</strong> statüsü kazanabilmesi için yatırım tutarının en az <strong>627.450.000 TL</strong> olması gerekmektedir. 
                    Bu şartı sağlamadığı takdirde <strong>Hedef yatırım</strong> olarak değerlendirilir.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Support Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Supports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Genel Destekler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">KDV İstisnası</span>
                  {incentiveResult.supports.vat_exemption ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gümrük Muafiyeti</span>
                  {incentiveResult.supports.customs_exemption ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Investment Type Supports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yatırım Türü Destekleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show Istanbul Mining Warning instead of support details */}
                {shouldShowIstanbulMiningWarning() ? (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Önemli Uyarı:</strong> Seçilen sektör İstanbul ilinde desteklenmemektedir.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {incentiveResult.sector.isTarget && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-blue-600">Hedef Yatırım Destekleri</h5>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span>Vergi İndirim Desteği Yatırıma Katkı Oranı:</span>
                            {supportValues.target.taxDiscount.includes("Uygulanmaz") ? (
                              <span className="text-orange-600 font-medium flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {supportValues.target.taxDiscount}
                              </span>
                            ) : (
                              <span>{formatPercentage(supportValues.target.taxDiscount)}</span>
                            )}
                          </div>
                          <div>
                            Faiz/Kar Payı Desteği Oranı: {
                              supportValues.target.interestSupport === "N/A" 
                                ? <span className="text-red-600 font-medium">Uygulanmaz (1., 2., 3. Bölge)</span>
                                : supportValues.target.interestSupport.includes("Uygulanmaz") 
                                  ? <span className="text-orange-600 font-medium">{supportValues.target.interestSupport}</span>
                                  : formatPercentage(supportValues.target.interestSupport)
                            }
                          </div>
                          <div>
                            Faiz/Kar Payı Desteği Üst Limit Tutarı: {
                              supportValues.target.cap === "N/A" 
                                ? <span className="text-red-600 font-medium">Uygulanmaz (1., 2., 3. Bölge)</span>
                                : supportValues.target.cap.includes("Uygulanmaz") 
                                  ? <span className="text-orange-600 font-medium">{supportValues.target.cap}</span>
                                  : formatCurrency(supportValues.target.cap)
                            }
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(incentiveResult.sector.isPriority || incentiveResult.sector.isHighTech || incentiveResult.sector.isMidHighTech) && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-green-600">
                          {incentiveResult.sector.isHighTech || incentiveResult.sector.isMidHighTech 
                            ? "Öncelikli ve Yüksek/Orta-Yüksek Teknoloji Yatırım Destekleri"
                            : "Öncelikli Yatırım Destekleri"
                          }
                        </h5>
                        <div className="text-xs space-y-1">
                          <div>Vergi İndirim Desteği Yatırıma Katkı Oranı: {formatPercentage(supportValues.priority.taxDiscount)}</div>
                          <div>
                            Faiz/Kar Payı Desteği Oranı: {
                              supportValues.priority.interestSupport.includes("Uygulanmaz") 
                                ? <span className="text-orange-600 font-medium">{supportValues.priority.interestSupport}</span>
                                : formatPercentage(supportValues.priority.interestSupport)
                            }
                          </div>
                          <div>
                            Faiz/Kar Payı Desteği Üst Limit Tutarı: {
                              supportValues.priority.cap.includes("Uygulanmaz") 
                                ? <span className="text-orange-600 font-medium">{supportValues.priority.cap}</span>
                                : formatCurrency(supportValues.priority.cap)
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Warning about Faiz/Kar Payı limit with yellow background - only for target sectors in regions 4,5,6 and not Istanbul mining */}
          {incentiveResult.sector.isTarget && [4, 5, 6].includes(incentiveResult.location.region) && !shouldShowIstanbulMiningWarning() && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    <strong>Önemli Uyarı:</strong> Faiz/Kar Payı Desteği toplam sabit yatırım tutarının %10'unu geçemez.
                  </p>
                </div>
              </div>
            </div>
          )}

          {incentiveResult.sector.conditions && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h5 className="font-medium text-amber-800 mb-2">Özel Şartlar ve Koşullar:</h5>
              <p className="text-sm text-amber-700">{incentiveResult.sector.conditions}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button onClick={refreshSearch} variant="outline" className="flex-1 sm:flex-none text-xs px-2 py-1.5 h-8">
              <Calculator className="h-4 w-4 mr-2" />
              Yeni Sorgulama
            </Button>
            <Button onClick={generatePDF} className="flex-1 sm:flex-none text-xs px-2 py-1.5 h-8">
              <Download className="h-4 w-4 mr-2" />
              PDF İndir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncentiveResultsStep;

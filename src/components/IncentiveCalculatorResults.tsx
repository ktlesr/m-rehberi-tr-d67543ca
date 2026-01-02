
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Calculator, Download } from 'lucide-react';
import { PaymentPlanPopover } from './PaymentPlanPopover';
import { IncentiveCalculatorResults as IIncentiveCalculatorResults, IncentiveCalculatorInputs } from '@/types/incentiveCalculator';
import { pdf } from '@react-pdf/renderer';
import IncentiveCalculatorReportPDF from './IncentiveCalculatorReportPDF';

interface IncentiveCalculatorResultsProps {
  results: IIncentiveCalculatorResults;
  inputs: IncentiveCalculatorInputs;
  onReset: () => void;
}

export const IncentiveCalculatorResults: React.FC<IncentiveCalculatorResultsProps> = ({
  results,
  inputs,
  onReset
}) => {
  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('tr-TR')} TL`;
  };

  const getSupportPreferenceText = (preference: string): string => {
    return preference === 'Interest/Profit Share Support' ? 'Faiz/Kar Payı Desteği' : 'Makine Desteği';
  };

  const getIncentiveTypeText = (type: string): string => {
    switch (type) {
      case 'Technology Initiative':
        return 'Teknoloji Hamlesi';
      case 'Local Development Initiative':
        return 'Yerel Kalkınma Hamlesi';
      case 'Strategic Initiative':
        return 'Stratejik Hamle';
      default:
        return type;
    }
  };

  const getTaxReductionText = (preference: string): string => {
    return preference === 'Yes' ? 'Evet' : 'Hayır';
  };

  const generatePDF = async () => {
    try {
      const blob = await pdf(<IncentiveCalculatorReportPDF results={results} inputs={inputs} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tesvikler-hesaplama-raporu-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  // Calculate total machinery cost
  const totalMachineryCost = inputs.importedMachineryCost + inputs.domesticMachineryCost;

  if (!results.isEligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Uygunluk Şartları Sağlanmıyor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.validationErrors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
          
          <div className="flex justify-center">
            <Button onClick={onReset}>
              <Calculator className="h-4 w-4 mr-2" />
              Yeni Hesaplama
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          Hesaplama Sonuçları
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Messages */}
        {results.warningMessages && results.warningMessages.length > 0 && (
          <div className="space-y-2">
            {results.warningMessages.map((warning, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Toplam Sabit Yatırım Tutarı:</span>
              <div className="font-semibold text-lg">{formatCurrency(results.totalFixedInvestment)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Toplam Makine Maliyeti:</span>
              <div className="font-semibold text-lg">{formatCurrency(totalMachineryCost)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">KDV ve Gümrük Muafiyeti:</span>
              <Badge className="ml-2 bg-green-500 text-white">{results.vatCustomsExemption}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">KDV Muafiyeti Tutarı:</span>
              <div className="font-semibold text-lg">{formatCurrency(results.vatExemptionAmount)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Gümrük Vergisi Muafiyeti:</span>
              <div className="font-semibold text-lg">{formatCurrency(results.customsExemptionAmount)}</div>
            </div>
          </div>
        </div>

        {/* Input Summary */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-3">Seçilen Bilgiler</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Teşvik Türü:</span>
              <div className="font-medium">{getIncentiveTypeText(inputs.incentiveType)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Yatırım İli:</span>
              <div className="font-medium">{inputs.province}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Çalışan Sayısı:</span>
              <div className="font-medium">{inputs.numberOfEmployees} kişi</div>
            </div>
            <div>
              <span className="text-muted-foreground">Destek Tercihi:</span>
              <div className="font-medium">{getSupportPreferenceText(inputs.supportPreference)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Vergi İndirimi Desteği:</span>
              <div className="font-medium">{getTaxReductionText(inputs.taxReductionSupport)}</div>
            </div>
          </div>
        </div>

        {/* Tax Reduction Preference Info */}
        {inputs.taxReductionSupport === 'No' && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Bilgi:</strong> Vergi İndirimi Desteği tercih edilmediği için diğer desteklerin (Faiz/Kar Payı ve Makine) üst limitlerinde artış uygulanmıştır.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Support Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">SGK Destekleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              <div>
                <span className="text-sm text-muted-foreground">İşveren Primi Desteği</span>
                <div className="font-medium">{formatCurrency(results.sgkEmployerPremiumSupport)}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">İşçi Primi Desteği</span>
                <div className="font-medium">{formatCurrency(results.sgkEmployeePremiumSupport)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Yatırım Destekleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              <div>
                <span className="text-sm text-muted-foreground">Vergi İndirimi / Yatırıma Katkı</span>
                <div className="font-medium">{formatCurrency(results.taxReductionInvestmentContribution)}</div>
              </div>
              {results.machinerySupportAmount > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Makine Desteği</span>
                  <div className="font-medium">{formatCurrency(results.machinerySupportAmount)}</div>
                </div>
              )}
              {results.interestProfitShareSupportAmount > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Faiz/Kar Payı Desteği</span>
                  <div className="font-medium">{formatCurrency(results.interestProfitShareSupportAmount)}</div>
                  {results.paymentPlan && (
                    <div className="mt-2">
                      <PaymentPlanPopover paymentPlan={results.paymentPlan} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">KDV ve Gümrük Muafiyetleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              <div>
                <span className="text-sm text-muted-foreground">KDV Muafiyeti</span>
                <div className="font-medium">{formatCurrency(results.vatExemptionAmount)}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Gümrük Vergisi Muafiyeti</span>
                <div className="font-medium">{formatCurrency(results.customsExemptionAmount)}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                * Makine yatırımları için hesaplanan muafiyet tutarları
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Support Summary */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-3">Toplam Destek Özeti</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>SGK İşveren Primi Desteği:</span>
              <span className="font-medium">{formatCurrency(results.sgkEmployerPremiumSupport)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGK İşçi Primi Desteği:</span>
              <span className="font-medium">{formatCurrency(results.sgkEmployeePremiumSupport)}</span>
            </div>
            <div className="flex justify-between">
              <span>Vergi İndirimi / Yatırıma Katkı:</span>
              <span className="font-medium">{formatCurrency(results.taxReductionInvestmentContribution)}</span>
            </div>
            {results.machinerySupportAmount > 0 && (
              <div className="flex justify-between">
                <span>Makine Desteği:</span>
                <span className="font-medium">{formatCurrency(results.machinerySupportAmount)}</span>
              </div>
            )}
            {results.interestProfitShareSupportAmount > 0 && (
              <div className="flex justify-between">
                <span>Faiz/Kar Payı Desteği:</span>
                <span className="font-medium">{formatCurrency(results.interestProfitShareSupportAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>KDV Muafiyeti:</span>
              <span className="font-medium">{formatCurrency(results.vatExemptionAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gümrük Vergisi Muafiyeti:</span>
              <span className="font-medium">{formatCurrency(results.customsExemptionAmount)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>Toplam Parasal Destek:</span>
              <span>{formatCurrency(
                results.sgkEmployerPremiumSupport + 
                results.sgkEmployeePremiumSupport + 
                results.taxReductionInvestmentContribution + 
                results.machinerySupportAmount + 
                results.interestProfitShareSupportAmount +
                results.customsExemptionAmount +
                results.vatExemptionAmount
              )}</span>
            </div>
            
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={onReset}>
            <Calculator className="h-4 w-4 mr-2" />
            Yeni Hesaplama
          </Button>
          <Button variant="outline" onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF İndir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

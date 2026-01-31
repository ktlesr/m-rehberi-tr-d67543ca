import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormattedCurrencyInput } from '@/components/ui/formatted-currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { IncentiveCalculatorInputs } from '@/types/incentiveCalculator';
import { supabase } from '@/integrations/supabase/client';
import { ProvinceRegionMap } from '@/types/database';
import { useActivityTracking } from '@/hooks/useActivityTracking';

interface InvestmentByProvince {
  id: number;
  province: string;
  investment_name: string;
  year: number;
}

interface IncentiveCalculatorFormProps {
  onCalculate: (inputs: IncentiveCalculatorInputs) => void;
  isCalculating: boolean;
}

export const IncentiveCalculatorForm: React.FC<IncentiveCalculatorFormProps> = ({
  onCalculate,
  isCalculating
}) => {
  const { trackCalculation } = useActivityTracking();
  const [formData, setFormData] = useState<IncentiveCalculatorInputs>({
    incentiveType: 'Local Development Initiative',
    investmentType: 'İmalat',
    province: '',
    numberOfEmployees: 0,
    landCost: 0,
    constructionCost: 0,
    importedMachineryCost: 0,
    domesticMachineryCost: 0,
    otherExpenses: 0,
    bankInterestRate: 45,
    supportPreference: 'Interest/Profit Share Support',
    loanAmount: 0,
    loanTermMonths: 60,
    taxReductionSupport: 'Yes'
  });

  const [selectedInvestment, setSelectedInvestment] = useState<string>('');
  const [provinces, setProvinces] = useState<ProvinceRegionMap[]>([]);
  const [investments, setInvestments] = useState<InvestmentByProvince[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingInvestments, setIsLoadingInvestments] = useState(false);
  const [employeeFieldTouched, setEmployeeFieldTouched] = useState(false);
  const [loanValidationMessage, setLoanValidationMessage] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Calculate total fixed investment automatically
  const totalFixedInvestment = useMemo(() => {
    return formData.landCost + formData.constructionCost + formData.importedMachineryCost + 
           formData.domesticMachineryCost + formData.otherExpenses;
  }, [formData.landCost, formData.constructionCost, formData.importedMachineryCost, 
      formData.domesticMachineryCost, formData.otherExpenses]);

  // Calculate maximum allowed loan amount (70% of total fixed investment)
  const maxLoanAmount = useMemo(() => {
    return Math.floor(totalFixedInvestment * 0.7);
  }, [totalFixedInvestment]);

  // Re-validate loan amount when total fixed investment changes
  useEffect(() => {
    if (formData.loanAmount > 0 && totalFixedInvestment > 0) {
      if (formData.loanAmount > maxLoanAmount) {
        // Auto-correct to maximum allowed amount
        setFormData(prev => ({
          ...prev,
          loanAmount: maxLoanAmount
        }));
        setLoanValidationMessage({
          type: 'warning',
          message: `Kredi tutarı otomatik olarak maksimum değere (${maxLoanAmount.toLocaleString('tr-TR')} TL) düzeltildi. Kredi tutarı toplam sabit yatırımın %70'ini geçemez.`
        });
      } else {
        setLoanValidationMessage({
          type: 'success',
          message: `Kredi tutarı geçerli. Maksimum kredi tutarı: ${maxLoanAmount.toLocaleString('tr-TR')} TL`
        });
      }
    } else if (formData.loanAmount === 0 && totalFixedInvestment > 0) {
      setLoanValidationMessage({
        type: 'info',
        message: `Maksimum kredi tutarı: ${maxLoanAmount.toLocaleString('tr-TR')} TL (Toplam sabit yatırımın %70'i)`
      });
    } else {
      setLoanValidationMessage(null);
    }
  }, [maxLoanAmount, formData.loanAmount, totalFixedInvestment]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const { data, error } = await supabase
          .from('province_region_map')
          .select('*')
          .order('province_name');

        if (error) {
          console.error('Error fetching provinces:', error);
          return;
        }

        setProvinces(data || []);
      } catch (error) {
        console.error('Error fetching provinces:', error);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!formData.province || formData.incentiveType !== 'Local Development Initiative') {
        setInvestments([]);
        setSelectedInvestment('');
        return;
      }

      setIsLoadingInvestments(true);
      try {
        const currentYear = new Date().getFullYear();
        const { data, error } = await supabase
          .from('investments_by_province')
          .select('*')
          .eq('province', formData.province)
          .eq('year', currentYear)
          .order('investment_name');

        if (error) {
          console.error('Error fetching investments:', error);
          return;
        }

        setInvestments(data || []);
        setSelectedInvestment(''); // Reset selection when province changes
      } catch (error) {
        console.error('Error fetching investments:', error);
      } finally {
        setIsLoadingInvestments(false);
      }
    };

    fetchInvestments();
  }, [formData.province, formData.incentiveType]);

  const handleInputChange = (field: keyof IncentiveCalculatorInputs, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset investment selection when incentive type changes
    if (field === 'incentiveType') {
      setSelectedInvestment('');
    }
  };

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setEmployeeFieldTouched(true);
    handleInputChange('numberOfEmployees', value);
  };

  const handleEmployeeBlur = () => {
    setEmployeeFieldTouched(true);
  };

  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    
    if (value > maxLoanAmount && maxLoanAmount > 0) {
      // Auto-correct to maximum allowed amount
      handleInputChange('loanAmount', maxLoanAmount);
      setLoanValidationMessage({
        type: 'warning',
        message: `Kredi tutarı otomatik olarak maksimum değere (${maxLoanAmount.toLocaleString('tr-TR')} TL) düzeltildi. Kredi tutarı toplam sabit yatırımın %70'ini geçemez.`
      });
    } else {
      handleInputChange('loanAmount', value);
      if (value > 0 && maxLoanAmount > 0) {
        setLoanValidationMessage({
          type: 'success',
          message: `Kredi tutarı geçerli. Maksimum kredi tutarı: ${maxLoanAmount.toLocaleString('tr-TR')} TL`
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Calculate total investment
      const totalInvestment = formData.landCost + formData.constructionCost + 
                            formData.importedMachineryCost + formData.domesticMachineryCost + 
                            formData.otherExpenses;
      
      // Track calculation activity with details
      await trackCalculation({
        incentiveType: formData.incentiveType,
        province: formData.province,
        investmentType: formData.investmentType,
        totalInvestment,
        numberOfEmployees: formData.numberOfEmployees,
        timestamp: new Date().toISOString()
      }, {
        investmentTopic: formData.incentiveType === 'Local Development Initiative' ? selectedInvestment : undefined
      });
      
      // Increment legacy statistics counter as well
      await supabase.rpc('increment_stat', { stat_name_param: 'calculation_clicks' });
      
      // Include selected investment name when submitting
      const submissionData = {
        ...formData,
        investment: selectedInvestment || undefined
      };
      
      onCalculate(submissionData);
    } catch (error) {
      console.error('Error tracking calculation:', error);
      // Still proceed with calculation even if tracking fails
      const submissionData = {
        ...formData,
        investment: selectedInvestment || undefined
      };
      onCalculate(submissionData);
    }
  };

  // Only show alert if field has been touched and value is invalid
  const shouldShowEmployeeAlert = employeeFieldTouched && formData.numberOfEmployees <= 0;

  const isFormValid = formData.province && formData.numberOfEmployees > 0;

  // Check if we should show investment selection
  const shouldShowInvestmentSelection = formData.province && formData.incentiveType === 'Local Development Initiative';

  const getValidationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getValidationVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'destructive';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="incentiveType">Teşvik Türü</Label>
          <Select 
            value={formData.incentiveType} 
            onValueChange={(value) => handleInputChange('incentiveType', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Teşvik türü seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Local Development Initiative">Yerel Kalkınma Hamlesi</SelectItem>
              <SelectItem value="Technology Initiative">Teknoloji Hamlesi</SelectItem>
              <SelectItem value="Strategic Initiative">Stratejik Hamle</SelectItem>
            </SelectContent> 
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="investmentType">Yatırımın Sektörü</Label>
          <Select 
            value={formData.investmentType} 
            onValueChange={(value) => handleInputChange('investmentType', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Yatırım türü seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="İmalat">İmalat</SelectItem>
              <SelectItem value="Diğer">Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">Yatırım İli</Label>
          <Select 
            value={formData.province} 
            onValueChange={(value) => handleInputChange('province', value)}
            disabled={isLoadingProvinces}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingProvinces ? "Yükleniyor..." : "İl seçin"} />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province.id} value={province.province_name}>
                  {province.province_name} ({province.region_number}. Bölge)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {shouldShowInvestmentSelection && (
          <div className="space-y-2">
            <Label htmlFor="investment">Yatırım Konusu</Label>
            <Select 
              value={selectedInvestment} 
              onValueChange={setSelectedInvestment}
              disabled={isLoadingInvestments || investments.length === 0}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    isLoadingInvestments 
                      ? "Yükleniyor..." 
                      : investments.length === 0 
                        ? "Bu il için yatırım konusu bulunamadı"
                        : "Yatırım konusu seçin"
                  } 
                />
              </SelectTrigger>
              <SelectContent className="max-w-[600px]">
                {investments.map((investment) => (
                  <SelectItem 
                    key={investment.id} 
                    value={investment.investment_name}
                    title={investment.investment_name}
                  >
                    <span className="block truncate max-w-[500px]">
                      {investment.investment_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.province && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="taxReductionSupport">Vergi İndirimi Desteğinden Yararlanmayı Düşünüyor musunuz?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Firma tescil tarihi teşvik belgesi düzenlenmesi için yapılan müracaat tarihinden en fazla bir yıl öncesinde olan yatırımcılar tercih edebilir.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={formData.taxReductionSupport} 
              onValueChange={(value) => handleInputChange('taxReductionSupport', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vergi indirimi tercihi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Evet</SelectItem>
                <SelectItem value="No">Hayır</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="supportPreference">Destek Tercihi</Label>
          <Select 
            value={formData.supportPreference} 
            onValueChange={(value) => handleInputChange('supportPreference', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Destek türü seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Interest/Profit Share Support">Faiz/Kar Payı Desteği</SelectItem>
              <SelectItem value="Machinery Support">Makine Desteği</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Yatırım Maliyetleri (TL)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
          <Label htmlFor="numberOfEmployees">Çalışan Sayısı</Label>
          <Input
            id="numberOfEmployees"
            type="number"
            min="0"
            value={formData.numberOfEmployees}
            onChange={handleEmployeeChange}
            onBlur={handleEmployeeBlur}
          />
          {shouldShowEmployeeAlert && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Çalışan sayısı 0'dan büyük olmalıdır. Lütfen geçerli bir sayı girin.
              </AlertDescription>
            </Alert>
          )}
        </div> 
          <div className="space-y-2">
            <Label htmlFor="landCost">Arsa/Arazi Maliyeti</Label>
            <FormattedCurrencyInput
              id="landCost"
              value={formData.landCost}
              onChange={(value) => handleInputChange('landCost', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="constructionCost">İnşaat Maliyeti</Label>
            <FormattedCurrencyInput
              id="constructionCost"
              value={formData.constructionCost}
              onChange={(value) => handleInputChange('constructionCost', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="importedMachineryCost">İthal Makine Maliyeti</Label>
            <FormattedCurrencyInput
              id="importedMachineryCost"
              value={formData.importedMachineryCost}
              onChange={(value) => handleInputChange('importedMachineryCost', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domesticMachineryCost">Yerli Makine Maliyeti</Label>
            <FormattedCurrencyInput
              id="domesticMachineryCost"
              value={formData.domesticMachineryCost}
              onChange={(value) => handleInputChange('domesticMachineryCost', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherExpenses">Diğer Giderler</Label>
            <FormattedCurrencyInput
              id="otherExpenses"
              value={formData.otherExpenses}
              onChange={(value) => handleInputChange('otherExpenses', value)}
            />
          </div>
        </div>
       
        {/* Total Fixed Investment Display */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold text-blue-900">Toplam Sabit Yatırım Tutarı:</Label>
            <span className="text-lg font-bold text-blue-900">
              {totalFixedInvestment.toLocaleString('tr-TR')} TL
            </span>
          </div>
        </div>
      </div>

      {/* Loan Parameters - Only show if Interest/Profit Share Support is selected */}
      {formData.supportPreference === 'Interest/Profit Share Support' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Kredi Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Kredi Tutarı (TL)</Label>
              <FormattedCurrencyInput
                id="loanAmount"
                value={formData.loanAmount}
                onChange={(value) => handleInputChange('loanAmount', value)}
              />
              {loanValidationMessage && (
                <Alert variant={getValidationVariant(loanValidationMessage.type)} className={
                  loanValidationMessage.type === 'success' ? 'border-green-200 bg-green-50' :
                  loanValidationMessage.type === 'warning' ? 'border-orange-200 bg-orange-50' :
                  'border-blue-200 bg-blue-50'
                }>
                  {getValidationIcon(loanValidationMessage.type)}
                  <AlertDescription className={
                    loanValidationMessage.type === 'success' ? 'text-green-800' :
                    loanValidationMessage.type === 'warning' ? 'text-orange-800' :
                    'text-blue-800'
                  }>
                    {loanValidationMessage.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankInterestRate">Banka Faiz Oranı (%)</Label>
              <Input
                id="bankInterestRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.bankInterestRate}
                onChange={(e) => handleInputChange('bankInterestRate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanTermMonths">Kredi Vadesi (Ay)</Label>
              <Input
                id="loanTermMonths"
                type="number"
                min="1"
                value={formData.loanTermMonths}
                onChange={(e) => handleInputChange('loanTermMonths', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          type="submit" 
          disabled={!isFormValid || isCalculating}
          className="w-full md:w-auto"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {isCalculating ? 'Hesaplanıyor...' : 'Hesapla'}
        </Button>
      </div>
    </form>
  );
};

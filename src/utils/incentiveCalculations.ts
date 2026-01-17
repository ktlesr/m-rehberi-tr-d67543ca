
import { IncentiveCalculatorInputs, IncentiveCalculatorResults, PaymentPlanDetail } from '@/types/incentiveCalculator';
import { isRegion6Province } from '@/utils/regionUtils';

// Use the PaymentPlanDetail type from the main types file
type OdemeDetayi = PaymentPlanDetail;

// Banking constants for Turkish loan calculations
const BSMV_ORANI = 0.05; // Banka ve Sigorta Muameleleri Vergisi oranı (%5)
const KKDF_ORANI = 0.00; // Kaynak Kullanımını Destekleme Fonu oranı (%0)
const YILDAKI_AY_SAYISI = 12; // Bir yıldaki ay sayısı

const SGK_EMPLOYER_PREMIUM_RATE = 4355.92;
const SGK_EMPLOYEE_PREMIUM_RATE = 3640.77;

/**
 * Detailed Turkish loan payment plan calculator
 * @param anapara Total loan amount
 * @param yillikFaizOrani Annual interest rate (as decimal, e.g., 0.45 for 45%)
 * @param vadeAy Total term in months
 * @param options Optional tax rates for BSMV and KKDF
 * @returns Array of monthly payment details
 */
const aylikKrediPlaniHesapla = (
  anapara: number,
  yillikFaizOrani: number,
  vadeAy: number,
  options?: { bsmvOrani?: number; kkdfOrani?: number }
): OdemeDetayi[] => {
  const bsmvOrani = options?.bsmvOrani ?? BSMV_ORANI;
  const kkdfOrani = options?.kkdfOrani ?? KKDF_ORANI;
  const aylikFaizOrani = yillikFaizOrani / YILDAKI_AY_SAYISI;
  const taksitSayisi = vadeAy;

  if (aylikFaizOrani === 0) {
    // Zero interest rate - simple division
    const taksitTutari = anapara / taksitSayisi;
    const plan: OdemeDetayi[] = [];
    for (let i = 1; i <= taksitSayisi; i++) {
      plan.push({
        taksitNo: i,
        taksitTutari: taksitTutari,
        anaparaOdemesi: taksitTutari,
        faizTutari: 0,
        bsmv: 0,
        kkdf: 0,
        kalanAnapara: anapara - (i * taksitTutari)
      });
    }
    return plan;
  }

  // Annuity formula for monthly payment calculation
  const r = aylikFaizOrani;
  const n = taksitSayisi;
  const taksitTutari = anapara * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const odemePlani: OdemeDetayi[] = [];
  let kalanAnapara = anapara;

  for (let i = 1; i <= taksitSayisi; i++) {
    const faizTutari = kalanAnapara * aylikFaizOrani;
    const bsmv = faizTutari * bsmvOrani;
    const kkdf = faizTutari * kkdfOrani;

    let anaparaOdemesi: number;
    let guncelTaksitTutari = taksitTutari;

    if (i === taksitSayisi) {
      // Final payment - pay remaining principal to handle rounding differences
      anaparaOdemesi = kalanAnapara;
      guncelTaksitTutari = anaparaOdemesi + faizTutari + bsmv + kkdf;
      kalanAnapara = 0;
    } else {
      anaparaOdemesi = taksitTutari - faizTutari - bsmv - kkdf;
      kalanAnapara -= anaparaOdemesi;
    }

    odemePlani.push({
      taksitNo: i,
      taksitTutari: guncelTaksitTutari,
      anaparaOdemesi: anaparaOdemesi,
      faizTutari: faizTutari,
      bsmv: bsmv,
      kkdf: kkdf,
      kalanAnapara: Math.max(0, kalanAnapara), // Ensure non-negative
    });
  }

  return odemePlani;
};

// Province region mapping
const getProvinceRegion = (province: string): number => {
  const regionMap: { [key: string]: number } = {
    'Ankara' : 1, 'Antalya' : 1, 'Bursa' : 1, 'Eskişehir' : 1, 'İstanbul' : 1, 'İzmir' : 1, 'Kocaeli' : 1, 'Muğla' : 1, 'Aydın' : 2, 'Balıkesir' : 2, 'Bolu' : 2, 'Çanakkale' : 2, 'Denizli' : 2, 'Edirne' : 2, 'Kayseri' : 2, 'Konya' : 2, 'Manisa' : 2, 'Mersin' : 2, 'Sakarya' : 2, 'Tekirdağ' : 2, 'Yalova' : 2, 'Adana' : 3, 'Bilecik' : 3, 'Burdur' : 3, 'Düzce' : 3, 'Gaziantep' : 3, 'Isparta' : 3, 'Karabük' : 3, 'Karaman' : 3, 'Kırıkkale' : 3, 'Kırklareli' : 3, 'Kütahya' : 3, 'Nevşehir' : 3, 'Rize' : 3, 'Samsun' : 3, 'Trabzon' : 3, 'Uşak' : 3, 'Zonguldak' : 3, 'Afyonkarahisar' : 4, 'Aksaray' : 4, 'Amasya' : 4, 'Artvin' : 4, 'Çorum' : 4, 'Elâzığ' : 4, 'Erzincan' : 4, 'Kastamonu' : 4, 'Kırşehir' : 4, 'Malatya' : 4, 'Sivas' : 4, 'Bartın' : 5, 'Bayburt' : 5, 'Çankırı' : 5, 'Erzurum' : 5, 'Giresun' : 5, 'Hatay' : 5, 'Kahramanmaraş' : 5, 'Kilis' : 5, 'Niğde' : 5, 'Ordu' : 5, 'Osmaniye' : 5, 'Sinop' : 5, 'Tokat' : 5, 'Tunceli' : 5, 'Yozgat' : 5, 'Adıyaman' : 6, 'Ağrı' : 6, 'Ardahan' : 6, 'Batman' : 6, 'Bingöl' : 6, 'Bitlis' : 6, 'Diyarbakır' : 6, 'Gümüşhane' : 6, 'Hakkâri' : 6, 'Iğdır' : 6, 'Kars' : 6, 'Mardin' : 6, 'Muş' : 6, 'Siirt' : 6, 'Şanlıurfa' : 6, 'Şırnak' : 6, 'Van' : 6
  };
  return regionMap[province] || 1;
};

// Helper function to detect "Other" districts
const isOtherDistrict = (district: string): boolean => {
  return district === "Other" || district === "Diğer" || district === "other";
};

/**
 * Enhanced function to determine Alt Region and months based on province region, district, and OSB status
 * This implements the comprehensive table-based logic for all regions 1-6
 */
const determineAltRegionAndMonths = (
  provinceRegion: number, 
  district: string | undefined, 
  osbStatus: string | undefined
): { altRegion: number; months: number; multiplier: number } => {
  if (!district || !osbStatus) {
    // Fallback to original logic if sub-region data is missing
    return { altRegion: provinceRegion, months: provinceRegion === 6 ? 168 : 96, multiplier: provinceRegion === 6 ? 1.0 : 0.5 };
  }

  const isOther = isOtherDistrict(district);
  const isInside = osbStatus === 'inside';

  // Complete logic based on the comprehensive region table
  if (provinceRegion === 1) {
    if (isOther) {
      return { altRegion: 1, months: 96, multiplier: 0.5 };
    } else {
      return isInside ? { altRegion: 3, months: 96, multiplier: 0.5 } : { altRegion: 2, months: 96, multiplier: 0.5 };
    }
  }
  
  if (provinceRegion === 2) {
    if (isOther) {
      return { altRegion: 2, months: 96, multiplier: 0.5 };
    } else {
      return isInside ? { altRegion: 4, months: 96, multiplier: 0.5 } : { altRegion: 3, months: 96, multiplier: 0.5 };
    }
  }
  
  if (provinceRegion === 3) {
    if (isOther) {
      return { altRegion: 3, months: 96, multiplier: 0.5 };
    } else {
      return isInside ? { altRegion: 5, months: 144, multiplier: 0.5 } : { altRegion: 4, months: 96, multiplier: 0.5 };
    }
  }
  
  if (provinceRegion === 4) {
    if (isOther) {
      return { altRegion: 4, months: 96, multiplier: 0.5 };
    } else {
      return isInside ? { altRegion: 6, months: 168, multiplier: 1.0 } : { altRegion: 5, months: 144, multiplier: 0.5 };
    }
  }
  
  if (provinceRegion === 5) {
    if (isOther) {
      return { altRegion: 5, months: 144, multiplier: 0.5 };
    } else {
      return isInside ? { altRegion: 6, months: 168, multiplier: 1.0 } : { altRegion: 6, months: 144, multiplier: 1.0 };
    }
  }
  
  if (provinceRegion === 6) {
    return isInside ? { altRegion: 6, months: 168, multiplier: 1.0 } : { altRegion: 6, months: 144, multiplier: 1.0 };
  }

  // Fallback for any unexpected cases
  return { altRegion: provinceRegion, months: 96, multiplier: 0.5 };
};

export const calculateIncentives = async (inputs: IncentiveCalculatorInputs): Promise<IncentiveCalculatorResults> => {
  const validationErrors: string[] = [];
  const warningMessages: string[] = [];
  
  // Fetch current SGK premium rates from admin settings
  const { adminSettingsService } = await import('@/services/adminSettingsService');
  const settings = await adminSettingsService.getIncentiveCalculationSettings();
  
  // Fetch dynamic support upper limits from YDO settings
  const { investmentThresholdsService } = await import('@/services/investmentThresholdsService');
  const thresholds = await investmentThresholdsService.getActiveThresholds();
  
  // Check if sub-region support is enabled
  const isSubRegionSupportEnabled = settings.sub_region_support_enabled === 1;
  
  // Calculate total fixed investment
  const totalFixedInvestment = inputs.landCost + inputs.constructionCost + 
    inputs.importedMachineryCost + inputs.domesticMachineryCost + inputs.otherExpenses;

  // Validation: Check minimum investment requirement (6,000,000 TL)
  if (totalFixedInvestment < 6000000) {
    validationErrors.push(
      `Toplam sabit yatırım tutarı minimum 6.000.000 TL olmalıdır. Mevcut tutar: ${totalFixedInvestment.toLocaleString('tr-TR')} TL`
    );
  }

  if (inputs.numberOfEmployees <= 0) {
    validationErrors.push('Çalışan sayısı 0\'dan büyük olmalıdır.');
  }

  if (inputs.supportPreference === 'Interest/Profit Share Support' && inputs.loanAmount <= 0) {
    validationErrors.push('Faiz/Kar Payı Desteği için kredi tutarı 0\'dan büyük olmalıdır.');
  }

  if (inputs.supportPreference === 'Interest/Profit Share Support' && inputs.loanTermMonths <= 0) {
    validationErrors.push('Faiz/Kar Payı Desteği için kredi vadesi 0\'dan büyük olmalıdır.');
  }

  // Calculate VAT and Customs Duty exemptions
  const machineryCostForExemptions = inputs.importedMachineryCost + inputs.domesticMachineryCost;
  const vatExemptionAmount = machineryCostForExemptions * (settings.vat_rate / 100);
  const customsExemptionAmount = inputs.importedMachineryCost * (settings.customs_duty_rate / 100);

  if (validationErrors.length > 0) {
    return {
      totalFixedInvestment,
      sgkEmployerPremiumSupport: 0,
      sgkEmployeePremiumSupport: 0,
      machinerySupportAmount: 0,
      interestProfitShareSupportAmount: 0,
      totalInterestAmount: 0,
      taxReductionInvestmentContribution: 0,
      vatCustomsExemption: 'MEVCUT',
      vatExemptionAmount,
      customsExemptionAmount,
      isEligible: false,
      validationErrors,
      warningMessages
    };
  }

  // Get province region and determine alt region with enhanced logic
  const provinceRegion = getProvinceRegion(inputs.province);
  
  // Validate sub-region inputs when support is enabled
  if (isSubRegionSupportEnabled && (!inputs.district || !inputs.osbStatus)) {
    validationErrors.push('Alt bölge desteği etkinleştirildiğinde ilçe ve OSB durumu bilgileri gereklidir.');
    return {
      totalFixedInvestment,
      sgkEmployerPremiumSupport: 0,
      sgkEmployeePremiumSupport: 0,
      machinerySupportAmount: 0,
      interestProfitShareSupportAmount: 0,
      totalInterestAmount: 0,
      taxReductionInvestmentContribution: 0,
      vatCustomsExemption: 'MEVCUT',
      vatExemptionAmount,
      customsExemptionAmount,
      isEligible: false,
      validationErrors,
      warningMessages
    };
  }

  // Get appropriate SGK rates based on investment type
  const sgkEmployerRate = inputs.investmentType === 'İmalat' 
    ? settings.sgk_employer_premium_rate_manufacturing 
    : settings.sgk_employer_premium_rate_other;
    
  const sgkEmployeeRate = inputs.investmentType === 'İmalat' 
    ? settings.sgk_employee_premium_rate_manufacturing 
    : settings.sgk_employee_premium_rate_other;

  // Determine Alt Region, months, and multiplier using enhanced logic
  let altRegionData;
  let sgkEmployeeDurationMonths = 0;

  if (isSubRegionSupportEnabled) {
    // Use enhanced sub-region logic
    altRegionData = determineAltRegionAndMonths(provinceRegion, inputs.district, inputs.osbStatus);
    
    // SGK Employee Premium Support only for Alt Region 6
    if (altRegionData.altRegion === 6) {
      sgkEmployeeDurationMonths = altRegionData.months === 168 ? 120 : 0; // 10 years for actual Region 6 only
    }
  } else {
    // Legacy logic for backward compatibility
    const isRegion6 = isRegion6Province(inputs.province);
    altRegionData = {
      altRegion: isRegion6 ? 6 : provinceRegion,
      months: isRegion6 ? 144 : 96,
      multiplier: isRegion6 ? 1.0 : 0.5
    };
    
    if (isRegion6) {
      sgkEmployeeDurationMonths = 120; // 10 years for Region 6
    }
  }

  // Calculate SGK Employer Premium Support using the enhanced formula
  const sgkEmployerPremiumSupport = inputs.numberOfEmployees * 
    altRegionData.multiplier * 
    sgkEmployerRate * 
    altRegionData.months;

  // Calculate SGK Employee Premium Support (only for Alt Region 6)
  const sgkEmployeePremiumSupport = sgkEmployeeDurationMonths > 0
    ? sgkEmployeeDurationMonths * sgkEmployeeRate * inputs.numberOfEmployees
    : 0;

  // Calculate Machinery Support with new logic based on tax reduction preference
  const totalMachineryCost = inputs.importedMachineryCost + inputs.domesticMachineryCost;
  let machinerySupportCalculated = 0;
  let machinerySupportLimit = 0;
  
  
  // Apply caps based on incentive type and tax reduction preference
  let monetaryCap = 0;
  let investmentCapPercentage = 0;
  let cappedMachinerySupport = 0;
  
  // Dynamic upper limits from YDO settings (with fallbacks)
  const maxMachineryTechLocal = thresholds?.max_machinery_support_tech_local ?? 300000000;
  const maxMachineryStrategic = thresholds?.max_machinery_support_strategic ?? 226000000;
  
  if (inputs.incentiveType === 'Technology Initiative' || inputs.incentiveType === 'Local Development Initiative') {
    if (inputs.taxReductionSupport === 'No') {
      monetaryCap = maxMachineryTechLocal; // Dynamic: max_machinery_support_tech_local
      investmentCapPercentage = 0.20;
      machinerySupportCalculated = totalMachineryCost * 0.30;
      machinerySupportLimit = totalFixedInvestment * 0.20;
      cappedMachinerySupport = Math.min(machinerySupportCalculated, machinerySupportLimit);
    } else {
      monetaryCap = Math.round(maxMachineryTechLocal * 0.8); // %80 of tech/local limit
      investmentCapPercentage = 0.15;
      machinerySupportCalculated = totalMachineryCost * 0.25;
      machinerySupportLimit = totalFixedInvestment * 0.15;
      cappedMachinerySupport = Math.min(machinerySupportCalculated, machinerySupportLimit);
    }
  } else if (inputs.incentiveType === 'Strategic Initiative') {
    if (inputs.taxReductionSupport === 'No') {
      monetaryCap = maxMachineryStrategic; // Dynamic: max_machinery_support_strategic
      investmentCapPercentage = 0.20;
      machinerySupportCalculated = totalMachineryCost * 0.30;
      machinerySupportLimit = totalFixedInvestment * 0.20;
      cappedMachinerySupport = Math.min(machinerySupportCalculated, machinerySupportLimit);
    } else {
      monetaryCap = Math.round(maxMachineryStrategic * 0.8); // %80 of strategic limit
      investmentCapPercentage = 0.15;
      machinerySupportCalculated = totalMachineryCost * 0.25;
      machinerySupportLimit = totalFixedInvestment * 0.15;
      cappedMachinerySupport = Math.min(machinerySupportCalculated, machinerySupportLimit);
    }
  }
  
  // Apply the investment cap percentage
  const investmentCap = totalFixedInvestment * investmentCapPercentage;
  cappedMachinerySupport = Math.min(cappedMachinerySupport, investmentCap, monetaryCap);
  
  const machinerySupportAmount = inputs.supportPreference === 'Machinery Support' 
    ? cappedMachinerySupport 
    : 0;

  // Calculate Interest/Profit Share Support with updated logic based on tax reduction preference
  let interestProfitShareSupportAmount = 0;
  let totalInterestAmount = 0;
  let preliminarySupportAmount =0;
  
  if (inputs.supportPreference === 'Interest/Profit Share Support') {
    // Calculate support rate based on incentive type and tax reduction preference
    let supportRate = 0;
    let maxReductionCap = 0;
    let monetaryCap = 0;
    let investmentCapPercentage = 0;
    
    // Dynamic interest support upper limits from YDO settings (with fallbacks)
    const maxInterestTechLocal = thresholds?.max_interest_support_tech_local ?? 300000000;
    const maxInterestStrategic = thresholds?.max_interest_support_strategic ?? 226000000;
    
    if (inputs.incentiveType === 'Technology Initiative' || inputs.incentiveType === 'Local Development Initiative') {
      if (inputs.taxReductionSupport === 'No') {
        supportRate = Math.min(inputs.bankInterestRate * 0.40, 20);
        maxReductionCap = 25;
        monetaryCap = maxInterestTechLocal; // Dynamic: max_interest_support_tech_local
        investmentCapPercentage = 0.25;
      } else {
        supportRate = Math.min(inputs.bankInterestRate * 0.40, 20);
        maxReductionCap = 20;
        monetaryCap = Math.round(maxInterestTechLocal * 0.8); // %80 of tech/local limit
        investmentCapPercentage = 0.20;
      }
    } else if (inputs.incentiveType === 'Strategic Initiative') {
      if (inputs.taxReductionSupport === 'No') {
        supportRate = Math.min(inputs.bankInterestRate * 0.30, 15);
        maxReductionCap = 20;
        monetaryCap = maxInterestStrategic; // Dynamic: max_interest_support_strategic
        investmentCapPercentage = 0.20;
      } else {
        supportRate = Math.min(inputs.bankInterestRate * 0.30, 15);
        maxReductionCap = 15;
        monetaryCap = Math.round(maxInterestStrategic * 0.8); // %80 of strategic limit
        investmentCapPercentage = 0.15;
      }
    }

    // Calculate detailed payment plan using Turkish banking methodology
    const yillikFaizOrani = inputs.bankInterestRate / 100; // Convert percentage to decimal
    const paymentPlan = aylikKrediPlaniHesapla(
      inputs.loanAmount,
      yillikFaizOrani,
      inputs.loanTermMonths
    );
    console.log( "yillik FaizOrani: ", yillikFaizOrani)
    // Calculate total interest including BSMV and KKDF
    totalInterestAmount = paymentPlan.reduce((total, payment) => 
      total + payment.faizTutari, 0
    );

    console.log("Faiz Tutarı: ", totalInterestAmount)
    // Preliminary support amount based on detailed interest calculation
    if (supportRate < 20){
      preliminarySupportAmount = totalInterestAmount * 0.4;
    } else {
      preliminarySupportAmount = totalInterestAmount * (0.2 / yillikFaizOrani);
    }
    

    console.log("%40 Faiz İnidirimi Tutarı: ", preliminarySupportAmount)
    
    // Apply caps
    const investmentCap = totalFixedInvestment * investmentCapPercentage;
    interestProfitShareSupportAmount = Math.min(
      Math.min(preliminarySupportAmount, monetaryCap),
      investmentCap
    );
  }
 console.log("Faiz Desteği Tutarı (TL): ", interestProfitShareSupportAmount)
    
  // Calculate Investment Contribution based on tax reduction preference
  const supportAmount = inputs.supportPreference === 'Machinery Support' 
    ? machinerySupportAmount 
    : interestProfitShareSupportAmount;
  
  let taxReductionInvestmentContribution: number;
  
  if (inputs.taxReductionSupport === 'No') {
    taxReductionInvestmentContribution = 0;
  } else if (inputs.incentiveType === 'Strategic Initiative') {
    taxReductionInvestmentContribution = (totalFixedInvestment - supportAmount - inputs.landCost) * 0.40;
  } else {
    taxReductionInvestmentContribution = (totalFixedInvestment - supportAmount - inputs.landCost) * 0.50;
  }

  return {
    totalFixedInvestment,
    sgkEmployerPremiumSupport,
    sgkEmployeePremiumSupport,
    machinerySupportAmount,
    interestProfitShareSupportAmount,
    totalInterestAmount,
    taxReductionInvestmentContribution,
    vatCustomsExemption: 'MEVCUT',
    vatExemptionAmount,
    customsExemptionAmount,
    isEligible: true,
    validationErrors: [],
    warningMessages,
    paymentPlan: inputs.supportPreference === 'Interest/Profit Share Support' ? 
      aylikKrediPlaniHesapla(
        inputs.loanAmount,
        inputs.bankInterestRate / 100,
        inputs.loanTermMonths
      ) : undefined
  };
};


export interface SectorData {
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: "Evet" | "Hayır";
  oncelikli_yatirim: "Evet" | "Hayır";
  yuksek_teknoloji: "Evet" | "Hayır";
  orta_yuksek_teknoloji: "Evet" | "Hayır";
  sartlar: string;
  "1. Bolge": number;
  "2. Bolge": number;
  "3. Bolge": number;
  "4. Bolge": number;
  "5. Bolge": number;
  "6. Bolge": number;
}

export interface LocationData {
  il: string;
  ilce: string;
  alt_bolge: string;
  kdv_istisnasi: boolean;
  gumruk_muafiyeti: boolean;
  oncelikli_vergi_indirimi_yko: string;
  oncelikli_faiz_karpayi_do: string;
  oncelikli_faiz_karpayi_ust_limit_tutari: string;
  oncelikli_faiz_karpayi_syt_orani: string;
  hedef_vergi_indirimi_yko: string;
  hedef_faiz_karpayi_do: string;
  hedef_faiz_karpayi_ust_limit_tutari: string;
  hedef_faiz_karpayi_syt_orani: string;
  sgk_destek_suresi: string;
}

export interface SpecialProgram {
  isEligible: boolean;
  programType: 'earthquake_zone' | 'cazibe_merkezleri' | null;
  description?: string;
  originalRegion?: number;
  appliedRegion?: number;
}

export interface IncentiveResult {
  sector: {
    nace_code: string;
    name: string;
    gtip?: string;  // GTİP code (if selected from GTIP row)
    gtip_aciklamasi?: string;  // GTİP description
    selectedAsHamle?: boolean;  // Was GTİP row selected in dropdown?
    isTarget: boolean;
    isPriority: boolean;
    isHighTech: boolean;
    isMidHighTech: boolean;
    isTechInitiative?: boolean;  // Teknoloji Hamlesi
    investmentStatusExplanation?: string;  // Explanation of investment status
    conditions: string;
    minInvestment: number;
  };
  location: {
    province: string;
    district: string;
    osb_status: "İÇİ" | "DIŞI";
    region: number;
    originalRegion?: number;
    subregion: string;
    sgk_duration: string;
    specialProgram?: SpecialProgram;
  };
  supports: {
    vat_exemption: boolean;
    customs_exemption: boolean;
    target_tax_discount: string;
    target_interest_support: string;
    target_cap: string;
    target_cap_ratio: string;
    priority_tax_discount: string;
    priority_interest_support: string;
    priority_cap: string;
    priority_cap_ratio: string;
  };
}

export interface WizardData {
  selectedSector: SectorData | null;
  selectedProvince: string;
  selectedDistrict: string;
  osbStatus: "İÇİ" | "DIŞI" | null;
}

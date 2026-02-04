/**
 * Investment Status Helper - Hierarchical Investment Type Determination
 *
 * Implements the legal hierarchy (mevzuat hiyerarşisi) for determining
 * investment status based on teknoloji_hamlesi, yüksek_teknoloji,
 * orta_yüksek_teknoloji, and hedef_yatirim flags.
 */

import { investmentThresholdsService, InvestmentThreshold } from '@/services/investmentThresholdsService';

export type InvestmentStatus =
  | "TEKNOLOJI_HAMLESI"
  | "YUKSEK_TEKNOLOJI_ONCELIKLI"
  | "YUKSEK_TEKNOLOJI_HEDEF"
  | "ORTA_YUKSEK_TEKNOLOJI_ONCELIKLI"
  | "ORTA_YUKSEK_TEKNOLOJI_HEDEF"
  | "ONCELIKLI_ONLY" // DURUM 4 - Raw oncelikli_yatirim tag
  | "HEDEF_ONLY"
  | "NONE";

export interface InvestmentStatusResult {
  status: InvestmentStatus;
  isPriority: boolean;
  isTarget: boolean;
  isTechInitiative: boolean; // Teknoloji Hamlesi
  isHighTech: boolean;
  isMidHighTech: boolean;
  explanation: string;
  minInvestmentRequirement?: number; // Öncelikli için minimum tutar
  minTargetInvestmentByRegion?: {
    // Hedef için bölgesel minimum tutarlar
    regions12: number; // 1. ve 2. Bölge için
    regions3456: number; // 3., 4., 5., 6. Bölge için
  };
  requiresNonIstanbul?: boolean;
}

export interface SectorDataForStatus {
  is_hamle?: boolean;                   // New boolean field - primary check
  teknoloji_hamlesi?: string | null;    // Legacy field - fallback
  gtip?: string | null;                 // GTİP code
  gtip_aciklamasi?: string | null;      // GTİP description
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
}

// Default fallback thresholds (will be overridden by DB values)
const DEFAULT_MIN_HIGH_TECH_INVESTMENT = 627_000_000; // 627.000.000 TL
const DEFAULT_MIN_MID_HIGH_TECH_INVESTMENT = 1_255_000_000; // 1.255.000.000 TL
const DEFAULT_MIN_REGION_1_2 = 15_100_000;
const DEFAULT_MIN_REGION_3_6 = 7_500_000;

// Cached thresholds for sync access
let cachedThresholds: InvestmentThreshold | null = null;

/**
 * Initialize thresholds from database (call this early in app lifecycle)
 */
export async function initializeThresholds(): Promise<InvestmentThreshold | null> {
  cachedThresholds = await investmentThresholdsService.getActiveThresholds();
  return cachedThresholds;
}

/**
 * Get current thresholds (sync - uses cached values)
 */
export function getCurrentThresholds(): {
  minHighTech: number;
  minMidHighTech: number;
  minRegion12: number;
  minRegion36: number;
  // Support upper limits
  maxInterestTechLocal: number;
  maxInterestStrategic: number;
  maxInterestPriority: number;
  maxInterestTarget: number;
  maxMachineryTechLocal: number;
  maxMachineryStrategic: number;
  maxExtraInterestTurkeyCentury: number;
  maxExtraInterestPriority: number;
  maxExtraInterestTarget: number;
} {
  return {
    minHighTech: cachedThresholds?.min_high_tech_priority ?? DEFAULT_MIN_HIGH_TECH_INVESTMENT,
    minMidHighTech: cachedThresholds?.min_mid_high_tech_priority ?? DEFAULT_MIN_MID_HIGH_TECH_INVESTMENT,
    minRegion12: cachedThresholds?.min_investment_region_1_2 ?? DEFAULT_MIN_REGION_1_2,
    minRegion36: cachedThresholds?.min_investment_region_3_6 ?? DEFAULT_MIN_REGION_3_6,
    // Support upper limits from YDO settings
    maxInterestTechLocal: cachedThresholds?.max_interest_support_tech_local ?? 300000000,
    maxInterestStrategic: cachedThresholds?.max_interest_support_strategic ?? 226000000,
    maxInterestPriority: cachedThresholds?.max_interest_support_priority ?? 150000000,
    maxInterestTarget: cachedThresholds?.max_interest_support_target ?? 100000000,
    maxMachineryTechLocal: cachedThresholds?.max_machinery_support_tech_local ?? 300000000,
    maxMachineryStrategic: cachedThresholds?.max_machinery_support_strategic ?? 226000000,
    maxExtraInterestTurkeyCentury: cachedThresholds?.max_extra_interest_turkey_century ?? 50000000,
    maxExtraInterestPriority: cachedThresholds?.max_extra_interest_priority ?? 40000000,
    maxExtraInterestTarget: cachedThresholds?.max_extra_interest_target ?? 30000000,
  };
}

/**
 * Determines investment status according to the legal hierarchy (mevzuat hiyerarşisi)
 *
 * Hierarchy order:
 * 1. Teknoloji Hamlesi (EVET) → Always Priority (overrides all)
 * 2. Yüksek Teknoloji (investment >= 627.45M TL) → Priority, else Target
 * 3. Orta-Yüksek Teknoloji (non-Istanbul + investment >= 1.25B TL) → Priority, else Target
 * 4. Hedef Yatırım → Target only
 *
 * @param sectorData - Sector data from sector_search table
 * @param investmentAmount - Investment amount in TL (optional, for priority threshold checks)
 * @param province - Province name (for Istanbul check in orta-yüksek teknoloji)
 */
export function determineInvestmentStatus(
  sectorData: SectorDataForStatus,
  investmentAmount?: number,
  province?: string,
): InvestmentStatusResult {
  // Get current thresholds (use cached values)
  const thresholds = getCurrentThresholds();
  
  // Check if is_hamle is true (new field) OR teknoloji_hamlesi starts with "EVET" (legacy fallback)
  const isTeknolojHamlesi = 
    sectorData.is_hamle === true || 
    sectorData.teknoloji_hamlesi?.toUpperCase().startsWith("EVET") || 
    false;
  const isHighTech = sectorData.yuksek_teknoloji || false;
  const isMidHighTech = sectorData.orta_yuksek_teknoloji || false;
  const isHedef = sectorData.hedef_yatirim || false;

  // Check if province is Istanbul (various spellings)
  const isIstanbul =
    province?.toLowerCase().includes("istanbul") ||
    province?.toLowerCase().includes("İstanbul") ||
    province?.toLocaleLowerCase("tr-TR").includes("istanbul") ||
    false;

  // Format currency for explanations
  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR').format(val);

  // DURUM 1: Teknoloji Hamlesi - Always Priority (override)
  if (isTeknolojHamlesi) {
    return {
      status: "TEKNOLOJI_HAMLESI",
      isPriority: true, // Override - always priority
      isTarget: false,
      isTechInitiative: true,
      isHighTech,
      isMidHighTech,
      explanation: `Teknoloji Hamlesi Programı kapsamında yer aldığından, 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Bu kapsamda asgari yatırım tutarı 1. ve 2. Bölgeler için ${formatCurrency(thresholds.minRegion12)} TL, 3., 4., 5. ve 6. Bölgelerde ${formatCurrency(thresholds.minRegion36)} TL olmalıdır.`,
    };
  }

  // DURUM 2: Hamle Değil + Yüksek Teknoloji
  if (isHighTech) {
    const meetsPriorityRequirement = investmentAmount !== undefined && investmentAmount >= thresholds.minHighTech;

    return {
      status: meetsPriorityRequirement ? "YUKSEK_TEKNOLOJI_ONCELIKLI" : "YUKSEK_TEKNOLOJI_HEDEF",
      isPriority: meetsPriorityRequirement,
      isTarget: !meetsPriorityRequirement,
      isTechInitiative: false,
      isHighTech: true,
      isMidHighTech: false,
      minInvestmentRequirement: thresholds.minHighTech,
      minTargetInvestmentByRegion: {
        regions12: thresholds.minRegion12,
        regions3456: thresholds.minRegion36,
      },
      explanation: `Teknoloji Hamlesi Programı kapsamında yer almamakla birlikte yüksek teknoloji yatırımı niteliğinde olduğundan, yatırım tutarının en az ${formatCurrency(thresholds.minHighTech)} TL olması kaydıyla 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Asgari yatırım tutarı en az ${formatCurrency(thresholds.minHighTech)} TL olması şartını sağlamaması durumunda ise Hedef yatırım olarak değerlendirilir.`,
    };
  }

  // DURUM 3: Hamle Değil + Orta-Yüksek Teknoloji
  if (isMidHighTech) {
    const meetsPriorityRequirement =
      !isIstanbul && investmentAmount !== undefined && investmentAmount >= thresholds.minMidHighTech;

    return {
      status: meetsPriorityRequirement ? "ORTA_YUKSEK_TEKNOLOJI_ONCELIKLI" : "ORTA_YUKSEK_TEKNOLOJI_HEDEF",
      isPriority: meetsPriorityRequirement,
      isTarget: !meetsPriorityRequirement,
      isTechInitiative: false,
      isHighTech: false,
      isMidHighTech: true,
      minInvestmentRequirement: thresholds.minMidHighTech,
      minTargetInvestmentByRegion: {
        regions12: thresholds.minRegion12,
        regions3456: thresholds.minRegion36,
      },
      requiresNonIstanbul: true,
      explanation: `Teknoloji Hamlesi Programı kapsamında yer almamakla birlikte orta-yüksek teknoloji yatırımı niteliğinde olduğundan, İstanbul ili dışında gerçekleştirilmesi ve yatırım tutarının en az ${formatCurrency(thresholds.minMidHighTech)} TL olması kaydıyla 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Asgari yatırım tutarı en az ${formatCurrency(thresholds.minMidHighTech)} TL olması şartını sağlamaması durumunda ise Hedef yatırım olarak değerlendirilir.`,
    };
  }

  // DURUM 4a: Ham "ÖNCELİKLİ" etiketi (Hamle/Yüksek/Orta-Yüksek değil ama öncelikli listede)
  const isOncelikliRaw = sectorData.oncelikli_yatirim || false;
  if (isOncelikliRaw) {
    return {
      status: "ONCELIKLI_ONLY",
      isPriority: true,
      isTarget: false, // Öncelikli ise hedef gösterilmez
      isTechInitiative: false,
      isHighTech: false,
      isMidHighTech: false,
      explanation: `9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir.`,
    };
  }

  // DURUM 4b: Sadece Hedef (if in hedef list)
  if (isHedef) {
    return {
      status: "HEDEF_ONLY",
      isPriority: false,
      isTarget: true,
      isTechInitiative: false,
      isHighTech: false,
      isMidHighTech: false,
      explanation: `9903 sayılı Karar kapsamında öncelikli yatırım şartlarını sağlamadığından, yalnızca hedef yatırım kapsamında değerlendirilir.`,
    };
  }

  // Hiçbir kategoriye girmiyorsa
  return {
    status: "NONE",
    isPriority: false,
    isTarget: false,
    isTechInitiative: false,
    isHighTech: false,
    isMidHighTech: false,
    explanation: `Bu yatırım konusu 9903 sayılı Karar kapsamında özel bir destek kategorisinde yer almamaktadır.`,
  };
}

/**
 * Format investment status for display as badges
 */
export function getStatusBadges(status: InvestmentStatusResult): {
  showTechInitiative: boolean;
  showPriority: boolean;
  showTarget: boolean;
  showHighTech: boolean;
  showMidHighTech: boolean;
} {
  return {
    showTechInitiative: status.isTechInitiative,
    showPriority: status.isPriority,
    showTarget: status.isTarget && !status.isPriority, // Don't show target if already priority
    showHighTech: status.isHighTech,
    showMidHighTech: status.isMidHighTech,
  };
}

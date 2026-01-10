/**
 * Investment Status Helper - Hierarchical Investment Type Determination
 * 
 * Implements the legal hierarchy (mevzuat hiyerarşisi) for determining
 * investment status based on teknoloji_hamlesi, yüksek_teknoloji, 
 * orta_yüksek_teknoloji, and hedef_yatirim flags.
 */

export type InvestmentStatus = 
  | 'TEKNOLOJI_HAMLESI'
  | 'YUKSEK_TEKNOLOJI_ONCELIKLI'
  | 'YUKSEK_TEKNOLOJI_HEDEF'
  | 'ORTA_YUKSEK_TEKNOLOJI_ONCELIKLI'
  | 'ORTA_YUKSEK_TEKNOLOJI_HEDEF'
  | 'HEDEF_ONLY'
  | 'NONE';

export interface InvestmentStatusResult {
  status: InvestmentStatus;
  isPriority: boolean;
  isTarget: boolean;
  isTechInitiative: boolean;  // Teknoloji Hamlesi
  isHighTech: boolean;
  isMidHighTech: boolean;
  explanation: string;
  minInvestmentRequirement?: number;  // Öncelikli için minimum tutar
  minTargetInvestmentByRegion?: {     // Hedef için bölgesel minimum tutarlar
    regions12: number;   // 1. ve 2. Bölge için
    regions3456: number; // 3., 4., 5., 6. Bölge için
  };
  requiresNonIstanbul?: boolean;
}

export interface SectorDataForStatus {
  teknoloji_hamlesi: string | null;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
}

// Minimum investment thresholds for priority status
const MIN_HIGH_TECH_INVESTMENT = 627_450_000; // 627.450.000 TL
const MIN_MID_HIGH_TECH_INVESTMENT = 1_254_900_000; // 1.254.900.000 TL

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
  province?: string
): InvestmentStatusResult {
  
  // Check if teknoloji_hamlesi is "EVET" (case-insensitive)
  const isTeknolojHamlesi = sectorData.teknoloji_hamlesi?.toUpperCase().startsWith('EVET') || false;
  const isHighTech = sectorData.yuksek_teknoloji || false;
  const isMidHighTech = sectorData.orta_yuksek_teknoloji || false;
  const isHedef = sectorData.hedef_yatirim || false;
  
  // Check if province is Istanbul (various spellings)
  const isIstanbul = province?.toLowerCase().includes('istanbul') || 
                     province?.toLowerCase().includes('İstanbul') ||
                     province?.toLocaleLowerCase('tr-TR').includes('istanbul') ||
                     false;

  // DURUM 1: Teknoloji Hamlesi - Always Priority (override)
  if (isTeknolojHamlesi) {
    return {
      status: 'TEKNOLOJI_HAMLESI',
      isPriority: true,  // Override - always priority
      isTarget: false,
      isTechInitiative: true,
      isHighTech,
      isMidHighTech,
      explanation: `Teknoloji Hamlesi Programı kapsamında yer aldığından, 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Bu kapsamda asgari yatırım tutarı 1. ve 2. Bölgeler için 15.100.000 TL, 3., 4., 5. ve 6. Bölgelerde 7.500.000 TL olmalıdır.`
    };
  }

  // DURUM 2: Hamle Değil + Yüksek Teknoloji
  if (isHighTech) {
    const meetsPriorityRequirement = investmentAmount !== undefined && 
                                      investmentAmount >= MIN_HIGH_TECH_INVESTMENT;
    
    return {
      status: meetsPriorityRequirement ? 'YUKSEK_TEKNOLOJI_ONCELIKLI' : 'YUKSEK_TEKNOLOJI_HEDEF',
      isPriority: meetsPriorityRequirement,
      isTarget: !meetsPriorityRequirement,
      isTechInitiative: false,
      isHighTech: true,
      isMidHighTech: false,
      minInvestmentRequirement: MIN_HIGH_TECH_INVESTMENT,
      minTargetInvestmentByRegion: {
        regions12: 15_100_000,    // 1. ve 2. Bölge için
        regions3456: 7_500_000    // 3., 4., 5., 6. Bölge için
      },
      explanation: `Teknoloji Hamlesi Programı kapsamında yer almamakla birlikte yüksek teknoloji yatırımı niteliğinde olduğundan, yatırım tutarının en az 627.450.000 TL olması kaydıyla 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Asgari yatırım tutarı en az 627.450.000 TL olması şartını sağlamaması durumunda ise Hedef yatırım olarak değerlendirilir.`
    };
  }

  // DURUM 3: Hamle Değil + Orta-Yüksek Teknoloji
  if (isMidHighTech) {
    const meetsPriorityRequirement = !isIstanbul && 
                                      investmentAmount !== undefined && 
                                      investmentAmount >= MIN_MID_HIGH_TECH_INVESTMENT;
    
    return {
      status: meetsPriorityRequirement ? 'ORTA_YUKSEK_TEKNOLOJI_ONCELIKLI' : 'ORTA_YUKSEK_TEKNOLOJI_HEDEF',
      isPriority: meetsPriorityRequirement,
      isTarget: !meetsPriorityRequirement,
      isTechInitiative: false,
      isHighTech: false,
      isMidHighTech: true,
      minInvestmentRequirement: MIN_MID_HIGH_TECH_INVESTMENT,
      minTargetInvestmentByRegion: {
        regions12: 15_100_000,    // 1. ve 2. Bölge için
        regions3456: 7_500_000    // 3., 4., 5., 6. Bölge için
      },
      requiresNonIstanbul: true,
      explanation: `Teknoloji Hamlesi Programı kapsamında yer almamakla birlikte orta-yüksek teknoloji yatırımı niteliğinde olduğundan, İstanbul ili dışında gerçekleştirilmesi ve yatırım tutarının en az 1.254.900.000 TL olması kaydıyla 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Asgari yatırım tutarı en az 1.254.900.000 TL olması şartını sağlamaması durumunda ise Hedef yatırım olarak değerlendirilir.`
    };
  }

  // DURUM 4: Diğer - Sadece Hedef (if in hedef list)
  if (isHedef) {
    return {
      status: 'HEDEF_ONLY',
      isPriority: false,
      isTarget: true,
      isTechInitiative: false,
      isHighTech: false,
      isMidHighTech: false,
      explanation: `9903 sayılı Karar kapsamında öncelikli yatırım şartlarını sağlamadığından, yalnızca hedef yatırım kapsamında değerlendirilir (hedef listede yer alması kaydıyla).`
    };
  }

  // Hiçbir kategoriye girmiyorsa
  return {
    status: 'NONE',
    isPriority: false,
    isTarget: false,
    isTechInitiative: false,
    isHighTech: false,
    isMidHighTech: false,
    explanation: `Bu yatırım konusu 9903 sayılı Karar kapsamında özel bir destek kategorisinde yer almamaktadır.`
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
    showMidHighTech: status.isMidHighTech
  };
}

import { supabase } from "@/integrations/supabase/client";

export interface InvestmentThreshold {
  id: string;
  year: number;
  revaluation_rate: number | null;
  min_investment_region_1_2: number;
  min_investment_region_3_6: number;
  min_high_tech_priority: number;
  min_mid_high_tech_priority: number;
  min_strategic_high_tech: number | null;
  min_strategic_other: number | null;
  min_strategic_green_digital: number | null;
  min_priority_high_tech: number | null;
  min_priority_mid_high_tech: number | null;
  min_priority_cloud: number | null;
  min_financial_leasing: number | null;
  min_machinery_support: number | null;
  completion_expert_fee: number | null;
  is_active: boolean;
  effective_from: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Cache for thresholds (page-level caching)
let cachedActiveThresholds: InvestmentThreshold | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Rounding rules based on amount magnitude
function applyRoundingRule(value: number): number {
  if (value >= 100_000_000) {
    // 100M+ → round to millions
    return Math.round(value / 1_000_000) * 1_000_000;
  } else if (value >= 1_000_000) {
    // 1M+ → round to hundred thousands
    return Math.round(value / 100_000) * 100_000;
  } else if (value >= 1_000) {
    // 1K+ → round to hundreds
    return Math.round(value / 100) * 100;
  }
  return Math.round(value);
}

export const investmentThresholdsService = {
  /**
   * Get active year thresholds (with caching)
   */
  async getActiveThresholds(): Promise<InvestmentThreshold | null> {
    // Check cache validity
    const now = Date.now();
    if (cachedActiveThresholds && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return cachedActiveThresholds;
    }

    const { data, error } = await supabase
      .from('investment_thresholds')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active thresholds:', error);
      return null;
    }

    // Update cache
    cachedActiveThresholds = data as InvestmentThreshold | null;
    cacheTimestamp = now;

    return cachedActiveThresholds;
  },

  /**
   * Clear cached thresholds (use after updates)
   */
  clearCache(): void {
    cachedActiveThresholds = null;
    cacheTimestamp = 0;
  },

  /**
   * Get all thresholds (for admin panel)
   */
  async getAllThresholds(): Promise<InvestmentThreshold[]> {
    const { data, error } = await supabase
      .from('investment_thresholds')
      .select('*')
      .order('year', { ascending: false });

    if (error) {
      console.error('Error fetching all thresholds:', error);
      return [];
    }

    return (data as InvestmentThreshold[]) || [];
  },

  /**
   * Get thresholds by year
   */
  async getThresholdsByYear(year: number): Promise<InvestmentThreshold | null> {
    const { data, error } = await supabase
      .from('investment_thresholds')
      .select('*')
      .eq('year', year)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching thresholds for year ${year}:`, error);
      return null;
    }

    return data as InvestmentThreshold | null;
  },

  /**
   * Calculate new year thresholds based on revaluation rate
   */
  calculateNewYearThresholds(
    baseThresholds: InvestmentThreshold,
    revaluationRate: number
  ): Partial<InvestmentThreshold> {
    const multiplier = 1 + revaluationRate / 100;

    return {
      min_investment_region_1_2: applyRoundingRule(baseThresholds.min_investment_region_1_2 * multiplier),
      min_investment_region_3_6: applyRoundingRule(baseThresholds.min_investment_region_3_6 * multiplier),
      min_high_tech_priority: applyRoundingRule(baseThresholds.min_high_tech_priority * multiplier),
      min_mid_high_tech_priority: applyRoundingRule(baseThresholds.min_mid_high_tech_priority * multiplier),
      min_strategic_high_tech: baseThresholds.min_strategic_high_tech 
        ? applyRoundingRule(baseThresholds.min_strategic_high_tech * multiplier) 
        : null,
      min_strategic_other: baseThresholds.min_strategic_other 
        ? applyRoundingRule(baseThresholds.min_strategic_other * multiplier) 
        : null,
      min_strategic_green_digital: baseThresholds.min_strategic_green_digital 
        ? applyRoundingRule(baseThresholds.min_strategic_green_digital * multiplier) 
        : null,
      min_priority_high_tech: baseThresholds.min_priority_high_tech 
        ? applyRoundingRule(baseThresholds.min_priority_high_tech * multiplier) 
        : null,
      min_priority_mid_high_tech: baseThresholds.min_priority_mid_high_tech 
        ? applyRoundingRule(baseThresholds.min_priority_mid_high_tech * multiplier) 
        : null,
      min_priority_cloud: baseThresholds.min_priority_cloud 
        ? applyRoundingRule(baseThresholds.min_priority_cloud * multiplier) 
        : null,
      min_financial_leasing: baseThresholds.min_financial_leasing 
        ? applyRoundingRule(baseThresholds.min_financial_leasing * multiplier) 
        : null,
      min_machinery_support: baseThresholds.min_machinery_support 
        ? applyRoundingRule(baseThresholds.min_machinery_support * multiplier) 
        : null,
      completion_expert_fee: baseThresholds.completion_expert_fee 
        ? applyRoundingRule(baseThresholds.completion_expert_fee * multiplier) 
        : null,
    };
  },

  /**
   * Save new threshold year
   */
  async saveThresholds(thresholds: Omit<InvestmentThreshold, 'id' | 'created_at' | 'updated_at'>): Promise<InvestmentThreshold | null> {
    const { data, error } = await supabase
      .from('investment_thresholds')
      .upsert({
        ...thresholds,
      }, { onConflict: 'year' })
      .select()
      .single();

    if (error) {
      console.error('Error saving thresholds:', error);
      throw new Error(`Kayıt hatası: ${error.message}`);
    }

    // Clear cache after update
    this.clearCache();

    return data as InvestmentThreshold;
  },

  /**
   * Update existing threshold
   */
  async updateThreshold(id: string, updates: Partial<InvestmentThreshold>): Promise<InvestmentThreshold | null> {
    const { data, error } = await supabase
      .from('investment_thresholds')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating threshold:', error);
      throw new Error(`Güncelleme hatası: ${error.message}`);
    }

    // Clear cache after update
    this.clearCache();

    return data as InvestmentThreshold;
  },

  /**
   * Set active year (deactivate all others first)
   */
  async setActiveYear(year: number): Promise<void> {
    // First, deactivate all
    const { error: deactivateError } = await supabase
      .from('investment_thresholds')
      .update({ is_active: false })
      .neq('year', 0); // This updates all rows

    if (deactivateError) {
      console.error('Error deactivating thresholds:', deactivateError);
      throw new Error(`Deaktivasyon hatası: ${deactivateError.message}`);
    }

    // Then activate the specified year
    const { error: activateError } = await supabase
      .from('investment_thresholds')
      .update({ is_active: true })
      .eq('year', year);

    if (activateError) {
      console.error(`Error activating year ${year}:`, activateError);
      throw new Error(`Aktivasyon hatası: ${activateError.message}`);
    }

    // Clear cache after update
    this.clearCache();
  },

  /**
   * Delete a threshold year
   */
  async deleteThreshold(id: string): Promise<void> {
    const { error } = await supabase
      .from('investment_thresholds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting threshold:', error);
      throw new Error(`Silme hatası: ${error.message}`);
    }

    // Clear cache after delete
    this.clearCache();
  },

  /**
   * Format currency for display
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  /**
   * Apply rounding rule (exposed for UI preview)
   */
  applyRoundingRule,
};

import { supabase } from "@/integrations/supabase/client";
import { AdminSetting, IncentiveCalculationSettings } from "@/types/adminSettings";

export type LogoColorMode = 'all_themed' | 'graphic_themed' | 'text_themed' | 'original' | 'all_white';
export type QnaDisplayMode = 'card' | 'accordion' | 'minimal';

export const adminSettingsService = {
  async getQnaDisplayMode(): Promise<QnaDisplayMode> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'qna_display_mode')
      .maybeSingle();

    if (error) {
      console.error('Error fetching QnA display mode:', error);
      return 'card'; // default
    }

    return (data?.setting_value_text as QnaDisplayMode) || 'card';
  },

  async setQnaDisplayMode(mode: QnaDisplayMode): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'qna_display_mode',
        category: 'qna',
        setting_value: 0,
        setting_value_text: mode,
        description: 'QnA display mode: card or accordion'
      }, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error setting QnA display mode:', error);
      throw error;
    }
  },
  async getIncentiveCalculationSettings(): Promise<IncentiveCalculationSettings> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .in('setting_key', [
        'sgk_employer_premium_rate_manufacturing', 
        'sgk_employer_premium_rate_other',
        'sgk_employee_premium_rate_manufacturing', 
        'sgk_employee_premium_rate_other',
        'vat_rate',
        'customs_duty_rate',
        'sub_region_support_enabled'
      ])
      .in('category', ['incentive_calculation', 'incentive_calculations']);

    if (error) {
      console.error('Error fetching incentive calculation settings:', error);
      // Return default values if database fetch fails
      return {
        sgk_employer_premium_rate_manufacturing: 4355.92,
        sgk_employer_premium_rate_other: 4095.87,
        sgk_employee_premium_rate_manufacturing: 3640.77,
        sgk_employee_premium_rate_other: 3420.64,
        vat_rate: 20.0,
        customs_duty_rate: 2.0,
        sub_region_support_enabled: 0,
      };
    }

    const settings: IncentiveCalculationSettings = {
      sgk_employer_premium_rate_manufacturing: 4355.92, // default
      sgk_employer_premium_rate_other: 4095.87, // default
      sgk_employee_premium_rate_manufacturing: 3640.77, // default
      sgk_employee_premium_rate_other: 3420.64, // default
      vat_rate: 20.0, // default
      customs_duty_rate: 2.0, // default
      sub_region_support_enabled: 0, // default
    };

    data?.forEach((setting: AdminSetting) => {
      if (setting.setting_key === 'sgk_employer_premium_rate_manufacturing') {
        settings.sgk_employer_premium_rate_manufacturing = setting.setting_value;
      } else if (setting.setting_key === 'sgk_employer_premium_rate_other') {
        settings.sgk_employer_premium_rate_other = setting.setting_value;
      } else if (setting.setting_key === 'sgk_employee_premium_rate_manufacturing') {
        settings.sgk_employee_premium_rate_manufacturing = setting.setting_value;
      } else if (setting.setting_key === 'sgk_employee_premium_rate_other') {
        settings.sgk_employee_premium_rate_other = setting.setting_value;
      } else if (setting.setting_key === 'vat_rate') {
        settings.vat_rate = setting.setting_value;
      } else if (setting.setting_key === 'customs_duty_rate') {
        settings.customs_duty_rate = setting.setting_value;
      } else if (setting.setting_key === 'sub_region_support_enabled') {
        settings.sub_region_support_enabled = setting.setting_value;
      }
    });

    return settings;
  },

  async updateIncentiveCalculationSettings(settings: IncentiveCalculationSettings): Promise<void> {
    const updates = [
      {
        setting_key: 'sgk_employer_premium_rate_manufacturing',
        setting_value: settings.sgk_employer_premium_rate_manufacturing,
      },
      {
        setting_key: 'sgk_employer_premium_rate_other',
        setting_value: settings.sgk_employer_premium_rate_other,
      },
      {
        setting_key: 'sgk_employee_premium_rate_manufacturing',
        setting_value: settings.sgk_employee_premium_rate_manufacturing,
      },
      {
        setting_key: 'sgk_employee_premium_rate_other',
        setting_value: settings.sgk_employee_premium_rate_other,
      },
      {
        setting_key: 'vat_rate',
        setting_value: settings.vat_rate,
      },
      {
        setting_key: 'customs_duty_rate',
        setting_value: settings.customs_duty_rate,
      },
      {
        setting_key: 'sub_region_support_enabled',
        setting_value: settings.sub_region_support_enabled,
      },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: update.setting_value })
        .eq('setting_key', update.setting_key);

      if (error) {
        throw new Error(`Failed to update ${update.setting_key}: ${error.message}`);
      }
    }
  },

  async updateEmployerPremiumRates(manufacturing: number, other: number): Promise<void> {
    const updates = [
      { setting_key: 'sgk_employer_premium_rate_manufacturing', setting_value: manufacturing },
      { setting_key: 'sgk_employer_premium_rate_other', setting_value: other },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: update.setting_value })
        .eq('setting_key', update.setting_key);

      if (error) {
        throw new Error(`Failed to update ${update.setting_key}: ${error.message}`);
      }
    }
  },

  async updateEmployeePremiumRates(manufacturing: number, other: number): Promise<void> {
    const updates = [
      { setting_key: 'sgk_employee_premium_rate_manufacturing', setting_value: manufacturing },
      { setting_key: 'sgk_employee_premium_rate_other', setting_value: other },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: update.setting_value })
        .eq('setting_key', update.setting_key);

      if (error) {
        throw new Error(`Failed to update ${update.setting_key}: ${error.message}`);
      }
    }
  },

  async updateTaxRates(vatRate: number, customsRate: number): Promise<void> {
    const updates = [
      { setting_key: 'vat_rate', setting_value: vatRate },
      { setting_key: 'customs_duty_rate', setting_value: customsRate },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: update.setting_value })
        .eq('setting_key', update.setting_key);

      if (error) {
        throw new Error(`Failed to update ${update.setting_key}: ${error.message}`);
      }
    }
  },

  async updateSubRegionSupport(enabled: number): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .update({ setting_value: enabled })
      .eq('setting_key', 'sub_region_support_enabled');

    if (error) {
      throw new Error(`Failed to update sub_region_support_enabled: ${error.message}`);
    }
  },

  async getAllSettings(): Promise<AdminSetting[]> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('setting_key', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return data || [];
  },

  async getActiveGeminiStore(): Promise<string | null> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'active_gemini_store')
      .single();

    if (error || !data) {
      return null;
    }

    return data.setting_value_text;
  },

  async setActiveGeminiStore(storeName: string | null): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .update({ setting_value_text: storeName })
      .eq('setting_key', 'active_gemini_store');

    if (error) {
      throw new Error(`Failed to set active Gemini store: ${error.message}`);
    }
  },

  async getActiveTheme(): Promise<string> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'active_app_theme')
      .single();

    if (error || !data || !data.setting_value_text) {
      return 'corporate-blue'; // fallback default
    }

    return data.setting_value_text;
  },

  async setActiveTheme(themeId: string): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'active_app_theme',
        category: 'appearance',
        setting_value_text: themeId,
        description: 'Active theme ID for the application',
        setting_value: 0,
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      throw new Error(`Failed to set active theme: ${error.message}`);
    }
  },

  async getChatbotRagMode(): Promise<'gemini_file_search' | 'custom_rag' | 'tesviksor_api'> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'chatbot_rag_mode')
      .single();

    if (error) {
      console.error('Error fetching chatbot RAG mode:', error);
      return 'gemini_file_search';
    }

    // Handle legacy 'vertex_rag_corpora' value
    const mode = data?.setting_value_text;
    if (mode === 'vertex_rag_corpora') {
      return 'tesviksor_api';
    }

    return (mode as 'gemini_file_search' | 'custom_rag' | 'tesviksor_api') || 'gemini_file_search';
  },

  async setChatbotRagMode(mode: 'gemini_file_search' | 'custom_rag' | 'tesviksor_api'): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'chatbot_rag_mode',
        category: 'chatbot',
        setting_value: 0,
        setting_value_text: mode,
        description: 'Chatbot RAG mode: gemini_file_search, custom_rag, or tesviksor_api'
      }, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error setting chatbot RAG mode:', error);
      throw error;
    }
  },

  async getActiveCustomRagStore(): Promise<string | null> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'active_custom_rag_store')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active custom RAG store:', error);
      return null;
    }

    return data?.setting_value_text || null;
  },

  async setActiveCustomRagStore(storeId: string | null): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'active_custom_rag_store',
        category: 'chatbot',
        setting_value: 0,
        setting_value_text: storeId,
        description: 'Active Custom RAG store ID'
      }, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error setting active custom RAG store:', error);
      throw error;
    }
  },

  async getActiveVertexCorpus(): Promise<string | null> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'active_vertex_corpus')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active Vertex corpus:', error);
      return null;
    }

    return data?.setting_value_text || null;
  },

  async setActiveVertexCorpus(corpusName: string | null): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'active_vertex_corpus',
        category: 'chatbot',
        setting_value: 0,
        setting_value_text: corpusName,
        description: 'Active Vertex AI RAG Corpus resource name'
      }, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error setting active Vertex corpus:', error);
      throw error;
    }
  },

  async setVertexRagSettings(settings: { topK: number; vectorDistanceThreshold: number }): Promise<void> {
    const updates = [
      {
        setting_key: 'vertex_rag_top_k',
        category: 'chatbot',
        setting_value: settings.topK,
        setting_value_text: null,
        description: 'Vertex RAG top K similarity count'
      },
      {
        setting_key: 'vertex_rag_threshold',
        category: 'chatbot',
        setting_value: settings.vectorDistanceThreshold,
        setting_value_text: null,
        description: 'Vertex RAG similarity threshold (0.0-1.0, higher = more strict matching)'
      }
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('admin_settings')
        .upsert(update, { onConflict: 'setting_key' });

      if (error) {
        console.error(`Error setting ${update.setting_key}:`, error);
        throw error;
      }
    }
  },

  async getChatbotShowSources(): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'chatbot_show_sources')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching chatbot show sources:', error);
      return true; // default to showing sources
    }

    return data?.setting_value === 1;
  },

  async setChatbotShowSources(show: boolean): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'chatbot_show_sources',
        category: 'chatbot',
        setting_value: show ? 1 : 0,
        setting_value_text: null,
        description: 'Show source citations in chatbot responses'
      }, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error setting chatbot show sources:', error);
      throw error;
    }
  },

  async getLogoColorMode(): Promise<LogoColorMode> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value_text')
      .eq('setting_key', 'logo_color_mode')
      .maybeSingle();

    if (error) {
      console.error('Error fetching logo color mode:', error);
      return 'all_themed';
    }

    return (data?.setting_value_text as LogoColorMode) || 'all_themed';
  },

  async setLogoColorMode(mode: LogoColorMode): Promise<void> {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'logo_color_mode',
        category: 'appearance',
        setting_value: 0,
        setting_value_text: mode,
        description: 'Logo color mode: all_themed, graphic_themed, text_themed, original, all_white'
      }, { onConflict: 'setting_key' });

    if (error) {
      console.error('Error setting logo color mode:', error);
      throw error;
    }
  },
};
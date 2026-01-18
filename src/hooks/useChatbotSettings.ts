import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatbotSettings {
  showSources: boolean;
  widgetVisible: boolean;
  isLoading: boolean;
}

export function useChatbotSettings(): ChatbotSettings {
  const [showSources, setShowSources] = useState(true);
  const [widgetVisible, setWidgetVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['chatbot_show_sources', 'chatbot_widget_visible']);

        if (!error && data) {
          data.forEach((setting) => {
            if (setting.setting_key === 'chatbot_show_sources') {
              setShowSources(setting.setting_value === 1);
            } else if (setting.setting_key === 'chatbot_widget_visible') {
              setWidgetVisible(setting.setting_value === 1);
            }
          });
        }
      } catch (error) {
        console.error('Error loading chatbot settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();

    // Subscribe to realtime updates for both settings
    const channel = supabase
      .channel('chatbot-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && typeof newData.setting_value === 'number') {
            if (newData.setting_key === 'chatbot_show_sources') {
              setShowSources(newData.setting_value === 1);
            } else if (newData.setting_key === 'chatbot_widget_visible') {
              setWidgetVisible(newData.setting_value === 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { showSources, widgetVisible, isLoading };
}

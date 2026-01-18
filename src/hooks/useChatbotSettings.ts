import { useState, useEffect, useRef } from 'react';
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
  
  // Use refs to prevent multiple subscriptions
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const channelIdRef = useRef(`chatbot-settings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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

    // Only subscribe once per hook instance
    if (!subscribedRef.current) {
      channelRef.current = supabase
        .channel(channelIdRef.current)
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
      subscribedRef.current = true;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscribedRef.current = false;
      }
    };
  }, []);

  return { showSources, widgetVisible, isLoading };
}

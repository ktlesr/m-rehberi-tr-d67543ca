import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityData {
  id: string;
  session_id: string;
  activity_type: string;
  ip_address: string;
  location_country: string;
  location_city: string;
  page_path: string;
  activity_data: any;
  created_at: string;
  module_name?: string;
  search_term?: string;
  incentive_type?: string;
  investment_topic?: string;
}

interface TodayActivityStats {
  todayCalculations: number;
  todaySearches: number;
  activeSessions: number;
  totalToday: number;
  recentActivities: ActivityData[];
}

export const useTodayActivity = () => {
  const [stats, setStats] = useState<TodayActivityStats>({
    todayCalculations: 0,
    todaySearches: 0,
    activeSessions: 0,
    totalToday: 0,
    recentActivities: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Realtime channel management per-hook instance
  const channelNameRef = useRef<string>(`today-activity-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef<boolean>(false);

  const fetchTodayStats = useCallback(async () => {
    try {
      console.log('Fetching today activity stats via RPC...');
      
      // Use secure RPC function - no direct table access needed
      const { data, error } = await supabase.rpc('get_today_activity_counts');

      if (error) throw error;

      const todayCalculations = Number(data?.[0]?.today_calculations) || 0;
      const todaySearches = Number(data?.[0]?.today_searches) || 0;
      const activeSessions = Number(data?.[0]?.active_sessions) || 0;

      console.log('Today activity stats fetched:', { todayCalculations, todaySearches, activeSessions });

      setStats(prevStats => {
        const newStats = {
          todayCalculations,
          todaySearches,
          activeSessions,
          totalToday: todayCalculations + todaySearches,
          recentActivities: [] // RPC doesn't return details for security
        };
        
        if (JSON.stringify(prevStats) === JSON.stringify(newStats)) {
          return prevStats;
        }
        
        return newStats;
      });
    } catch (error) {
      console.error('Error fetching today activity stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStats();

    // Initialize channel only once per hook instance
    if (!channelRef.current) {
      channelRef.current = supabase.channel(channelNameRef.current);
    }

    if (channelRef.current && !subscribedRef.current) {
      channelRef.current
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_sessions'
          },
          (payload) => {
            console.log('New user activity detected:', payload);
            if (payload.new && ['calculation', 'search'].includes(payload.new.activity_type)) {
              fetchTodayStats();
            }
          }
        )
        .subscribe((status) => {
          // Silently handle subscription errors - don't show to user
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Realtime subscription failed, using polling only');
          }
        });
      subscribedRef.current = true;
    }

    // Refresh stats every minute to keep active sessions updated
    const interval = setInterval(fetchTodayStats, 60000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscribedRef.current = false;
      }
      clearInterval(interval);
    };
  }, [fetchTodayStats]);

  return {
    stats,
    isLoading,
    refetch: fetchTodayStats
  };
};

-- Güvenli RPC fonksiyonu: anon kullanıcılar için sadece sayıları döndürür
-- SECURITY DEFINER ile çalıştığı için user_sessions tablosuna doğrudan erişim gerekmez

CREATE OR REPLACE FUNCTION public.get_today_activity_counts()
RETURNS TABLE (
  today_calculations bigint,
  today_searches bigint,
  active_sessions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  today_start TIMESTAMP WITH TIME ZONE;
  thirty_minutes_ago TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Türkiye saat dilimi için bugünün başlangıcı (UTC+3)
  today_start := (CURRENT_DATE AT TIME ZONE 'Europe/Istanbul')::TIMESTAMP WITH TIME ZONE;
  thirty_minutes_ago := NOW() - INTERVAL '30 minutes';
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_sessions 
     WHERE activity_type = 'calculation' AND created_at >= today_start)::bigint as today_calculations,
    (SELECT COUNT(*) FROM user_sessions 
     WHERE activity_type = 'search' AND created_at >= today_start)::bigint as today_searches,
    (SELECT COUNT(DISTINCT session_id) FROM user_sessions 
     WHERE created_at >= thirty_minutes_ago)::bigint as active_sessions;
END;
$$;

-- Anon kullanıcıların bu fonksiyonu çağırabilmesi için yetki ver
GRANT EXECUTE ON FUNCTION public.get_today_activity_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_today_activity_counts() TO authenticated;
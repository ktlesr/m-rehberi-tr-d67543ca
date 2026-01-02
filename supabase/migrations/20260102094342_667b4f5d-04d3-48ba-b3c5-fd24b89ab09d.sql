-- QnA display mode ayarını tüm kullanıcılara açık yap
CREATE POLICY "Public can read qna display mode"
ON public.admin_settings
FOR SELECT
TO public
USING (setting_key = 'qna_display_mode');
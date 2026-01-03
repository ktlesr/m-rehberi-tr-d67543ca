-- Drop dangerous SELECT policy that exposes all subscriber PII to anonymous users
DROP POLICY IF EXISTS "anon_can_select_for_email_check" ON public.bulten_uyeler;

-- Drop redundant INSERT policy (the validation policy already handles this)
DROP POLICY IF EXISTS "anon_can_subscribe" ON public.bulten_uyeler;
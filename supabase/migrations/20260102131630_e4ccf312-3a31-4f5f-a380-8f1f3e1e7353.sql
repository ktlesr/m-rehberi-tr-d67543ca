-- Allow anon users to SELECT from bulten_uyeler for email validation and ID retrieval after insert
CREATE POLICY "anon_can_select_for_email_check"
ON bulten_uyeler
FOR SELECT
TO anon
USING (true);
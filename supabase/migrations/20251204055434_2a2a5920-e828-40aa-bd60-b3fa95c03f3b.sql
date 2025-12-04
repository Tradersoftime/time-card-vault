-- Allow admins to view all profiles (fixes user count)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
);
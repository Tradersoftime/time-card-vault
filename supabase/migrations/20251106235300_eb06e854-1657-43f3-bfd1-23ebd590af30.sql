-- Fix critical privilege escalation vulnerability
-- Users should not be able to modify their role field

-- 1. Drop and recreate the profiles UPDATE policy with proper WITH CHECK constraint
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- 2. Fix webhook_events to use admins table instead of profiles.role
DROP POLICY IF EXISTS "Only admins can view webhook events" ON public.webhook_events;

CREATE POLICY "Only admins can view webhook events" 
ON public.webhook_events
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
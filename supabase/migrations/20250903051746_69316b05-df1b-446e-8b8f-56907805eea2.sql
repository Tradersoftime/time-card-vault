-- Add current user to admins table to enable admin functionality
INSERT INTO public.admins (user_id) 
SELECT auth.uid() 
WHERE auth.uid() IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
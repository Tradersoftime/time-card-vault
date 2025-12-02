-- Add unique constraint on filename to prevent duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_codes_filename_unique ON public.image_codes(filename);

-- Add RLS policy to allow admins to update image_codes (needed for replace functionality)
CREATE POLICY "Admins can update image codes"
ON public.image_codes
FOR UPDATE
USING (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid()));
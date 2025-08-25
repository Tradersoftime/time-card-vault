-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('card-images', 'card-images', true);

-- Create RLS policies for card images storage
CREATE POLICY "Admins can upload card images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'card-images' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view card images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'card-images');

CREATE POLICY "Admins can update card images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'card-images' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can delete card images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'card-images' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);
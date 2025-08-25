-- Create table for persistent image code storage
CREATE TABLE public.image_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.image_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for image codes
CREATE POLICY "Admins can view all image codes" 
ON public.image_codes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admins can create image codes" 
ON public.image_codes 
FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admins can delete image codes" 
ON public.image_codes 
FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Add index for code lookups
CREATE INDEX idx_image_codes_code ON public.image_codes(code);

-- Create function to resolve image code to URL
CREATE OR REPLACE FUNCTION public.resolve_image_code(p_code text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public_url 
  FROM public.image_codes 
  WHERE code = p_code
  LIMIT 1;
$function$;
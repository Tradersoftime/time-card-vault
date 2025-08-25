-- Add the missing current_target column for redirect URLs
ALTER TABLE public.cards 
ADD COLUMN current_target text;
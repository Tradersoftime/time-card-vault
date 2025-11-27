-- Make name column nullable to allow blank names in CSV import
ALTER TABLE public.cards ALTER COLUMN name DROP NOT NULL;
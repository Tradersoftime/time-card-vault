-- Add print_run column to cards table for predictable QR filenames
ALTER TABLE public.cards ADD COLUMN print_run text;
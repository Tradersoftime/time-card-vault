-- Add QR color columns to cards table for optional per-card color tracking
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS qr_dark text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS qr_light text;
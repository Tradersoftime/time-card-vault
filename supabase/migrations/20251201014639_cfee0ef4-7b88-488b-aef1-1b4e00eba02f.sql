-- Complete fresh start: Delete all card-related test data
-- Order matters due to foreign key constraints

-- 1. Delete redemptions first (references cards and users)
DELETE FROM public.card_redemptions;

-- 2. Delete ownership history (references cards)
DELETE FROM public.card_ownership_history;

-- 3. Delete scan events (references cards)
DELETE FROM public.scan_events;

-- 4. Delete user card collections (references cards)
DELETE FROM public.user_cards;

-- 5. Delete all cards (references print_batches)
DELETE FROM public.cards;

-- 6. Delete print batches
DELETE FROM public.print_batches;

-- 7. Delete image codes
DELETE FROM public.image_codes;
-- Reset all cards to unclaimed state for testing
UPDATE public.cards 
SET 
  is_claimed = false,
  claimed_by = NULL,
  claimed_at = NULL
WHERE is_claimed = true;
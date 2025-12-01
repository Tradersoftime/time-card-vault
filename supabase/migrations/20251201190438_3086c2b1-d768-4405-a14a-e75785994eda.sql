-- Migrate all existing cards to new random suffix format (data migration)
UPDATE public.cards
SET code = CASE 
  -- Extract suit code (first part before first dash)
  WHEN code ~ '^[A-Z]+-[A-Z0-9]+-' THEN
    split_part(code, '-', 1) || '-' || 
    split_part(code, '-', 2) || '-' || 
    public.generate_random_suffix(6)
  ELSE
    -- Handle edge cases (like CARD-56754954-9VGE)
    UPPER(LEFT(suit, 3)) || '-' || 
    CASE 
      WHEN rank = 'A' THEN 'ACE'
      WHEN rank = 'K' THEN 'KING'
      WHEN rank = 'Q' THEN 'QUEEN'
      WHEN rank = 'J' THEN 'JACK'
      ELSE UPPER(LEFT(rank, 4))
    END || '-' || 
    public.generate_random_suffix(6)
END
WHERE deleted_at IS NULL;
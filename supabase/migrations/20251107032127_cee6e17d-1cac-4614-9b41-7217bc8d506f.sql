-- Update user_card_collection to check if card was EVER credited to ANY user
CREATE OR REPLACE FUNCTION public.user_card_collection()
 RETURNS TABLE(card_id uuid, name text, suit text, rank text, era text, rarity text, trader_value text, time_value numeric, image_url text, claimed_at timestamp with time zone, redemption_status text, redemption_id uuid, admin_notes text, decided_at timestamp with time zone, credited_amount numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH 
  -- Check if card has EVER been credited to ANY user (global check)
  globally_credited_cards AS (
    SELECT DISTINCT card_id
    FROM public.card_redemptions
    WHERE status = 'credited'
  ),
  -- Get latest redemption for current user
  latest_redemptions AS (
    SELECT DISTINCT ON (card_id, user_id) 
      card_id,
      user_id,
      id,
      status,
      admin_notes,
      decided_at,
      credited_amount,
      submitted_at
    FROM public.card_redemptions 
    WHERE status IN ('pending', 'rejected', 'approved', 'credited')
    ORDER BY card_id, user_id, submitted_at DESC
  )
  SELECT 
    c.id as card_id,
    c.name,
    c.suit,
    c.rank,
    c.era,
    c.rarity,
    c.trader_value,
    c.time_value,
    c.image_url,
    uc.claimed_at,
    -- If card was globally credited AND current user hasn't been credited, mark as 'not_eligible'
    CASE 
      WHEN lr.status = 'credited' THEN 'credited'
      WHEN lr.status = 'approved' THEN 'credited'  -- Legacy support
      WHEN lr.status = 'pending' THEN 'pending'
      WHEN lr.status = 'rejected' THEN 'rejected'
      WHEN gcc.card_id IS NOT NULL AND (lr.status IS NULL OR lr.status != 'credited') THEN 'not_eligible'
      ELSE 'available'
    END as redemption_status,
    lr.id as redemption_id,
    lr.admin_notes,
    lr.decided_at,
    lr.credited_amount
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN latest_redemptions lr ON lr.card_id = uc.card_id AND lr.user_id = uc.user_id
  LEFT JOIN globally_credited_cards gcc ON gcc.card_id = c.id
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.claimed_at DESC;
$function$;
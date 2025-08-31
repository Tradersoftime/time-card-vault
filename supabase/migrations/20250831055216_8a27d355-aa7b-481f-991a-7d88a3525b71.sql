-- Fix user_card_collection to prioritize the most recent redemption per card
CREATE OR REPLACE FUNCTION public.user_card_collection()
 RETURNS TABLE(card_id uuid, name text, suit text, rank text, era text, rarity text, trader_value text, time_value numeric, image_url text, claimed_at timestamp with time zone, redemption_status text, redemption_id uuid, admin_notes text, decided_at timestamp with time zone, credited_amount numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH latest_redemptions AS (
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
    CASE 
      WHEN lr.status = 'credited' THEN 'credited'
      WHEN lr.status = 'approved' THEN 'credited'  -- Legacy support
      ELSE COALESCE(lr.status, 'available')
    END as redemption_status,
    lr.id as redemption_id,
    lr.admin_notes,
    lr.decided_at,
    lr.credited_amount
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN latest_redemptions lr ON lr.card_id = uc.card_id AND lr.user_id = uc.user_id
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.claimed_at DESC;
$function$;
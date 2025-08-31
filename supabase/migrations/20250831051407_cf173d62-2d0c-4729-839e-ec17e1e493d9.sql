-- Update admin_bulk_decision_cards to automatically credit when approving
CREATE OR REPLACE FUNCTION public.admin_bulk_decision_cards(p_redemption_ids uuid[], p_action text, p_admin_notes text DEFAULT NULL::text, p_credited_amount numeric DEFAULT NULL::numeric, p_external_ref text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin UUID := auth.uid();
  v_count INT := 0;
  v_total_amount NUMERIC := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_action = 'approve' THEN
    -- Approve and automatically credit in one step
    UPDATE public.card_redemptions cr
    SET 
      status = 'credited',
      admin_notes = p_admin_notes,
      decided_at = now(),
      decided_by = v_admin,
      credited_at = now(),
      credited_by = v_admin,
      credited_amount = COALESCE(p_credited_amount, (SELECT c.time_value FROM public.cards c WHERE c.id = cr.card_id)),
      external_ref = p_external_ref
    WHERE cr.id = ANY(p_redemption_ids) AND cr.status = 'pending';
    
  ELSIF p_action = 'reject' THEN
    UPDATE public.card_redemptions
    SET 
      status = 'rejected',
      admin_notes = p_admin_notes,
      decided_at = now(),
      decided_by = v_admin
    WHERE id = ANY(p_redemption_ids) AND status = 'pending';
    
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Calculate total credited amount if approving
  IF p_action = 'approve' THEN
    SELECT COALESCE(SUM(credited_amount), 0) INTO v_total_amount
    FROM public.card_redemptions
    WHERE id = ANY(p_redemption_ids) AND status = 'credited';
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 
    'updated', v_count,
    'total_credited', v_total_amount
  );
END;
$function$;

-- Update user_card_collection to properly show credited status
CREATE OR REPLACE FUNCTION public.user_card_collection()
 RETURNS TABLE(card_id uuid, name text, suit text, rank text, era text, rarity text, trader_value text, time_value numeric, image_url text, claimed_at timestamp with time zone, redemption_status text, redemption_id uuid, admin_notes text, decided_at timestamp with time zone, credited_amount numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      WHEN cr.status = 'credited' THEN 'credited'
      WHEN cr.status = 'approved' THEN 'credited'  -- Legacy support
      ELSE COALESCE(cr.status, 'available')
    END as redemption_status,
    cr.id as redemption_id,
    cr.admin_notes,
    cr.decided_at,
    cr.credited_amount
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN public.card_redemptions cr ON cr.card_id = uc.card_id AND cr.user_id = uc.user_id
    AND cr.status IN ('pending', 'rejected', 'approved', 'credited')
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.claimed_at DESC;
$function$;
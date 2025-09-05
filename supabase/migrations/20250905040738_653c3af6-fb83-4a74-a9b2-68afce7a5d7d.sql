-- Fix claim_card_by_token function to use 'scan' instead of 'token' for claim_source
-- This fixes the check constraint violation error

CREATE OR REPLACE FUNCTION public.claim_card_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_card_id UUID;
  v_already_claimed BOOLEAN;
  v_claimed_by UUID;
BEGIN
  -- Check if user is authenticated
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  -- Find card by claim_token
  SELECT id, is_claimed, claimed_by 
  INTO v_card_id, v_already_claimed, v_claimed_by
  FROM public.cards 
  WHERE claim_token = p_token AND status = 'active';

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found');
  END IF;

  -- Check if already claimed
  IF v_already_claimed THEN
    IF v_claimed_by = v_user THEN
      RETURN jsonb_build_object('ok', true, 'already_claimed_by_you', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'already_claimed_by_other');
    END IF;
  END IF;

  -- Claim the card
  UPDATE public.cards
  SET 
    is_claimed = true,
    claimed_by = v_user,
    claimed_at = now()
  WHERE claim_token = p_token;

  -- Also add to user_cards for consistency with existing system
  -- FIXED: Use 'scan' instead of 'token' to match the check constraint
  INSERT INTO public.user_cards (user_id, card_id, claim_source)
  VALUES (v_user, v_card_id, 'scan')
  ON CONFLICT (user_id, card_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'card_id', v_card_id);
END;
$function$
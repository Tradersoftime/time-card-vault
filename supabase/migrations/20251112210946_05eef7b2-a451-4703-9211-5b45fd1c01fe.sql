-- Add admin card transfer functions

-- Update user_cards claim_source constraint to allow admin_assigned
ALTER TABLE public.user_cards 
DROP CONSTRAINT IF EXISTS user_cards_claim_source_check;

ALTER TABLE public.user_cards 
ADD CONSTRAINT user_cards_claim_source_check 
CHECK (claim_source IN ('scan', 'qr', 'admin_assigned'));

-- Function to assign card to user by email
CREATE OR REPLACE FUNCTION public.admin_assign_card(
  p_card_id uuid,
  p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_target_user UUID;
  v_previous_owner UUID;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Find target user by email
  SELECT id INTO v_target_user 
  FROM auth.users 
  WHERE LOWER(email) = LOWER(p_user_email);

  IF v_target_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- Check if target user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_target_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_blocked');
  END IF;

  -- Check if card exists
  IF NOT EXISTS (SELECT 1 FROM public.cards WHERE id = p_card_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'card_not_found');
  END IF;

  -- Get current owner (if any)
  SELECT user_id INTO v_previous_owner
  FROM public.user_cards
  WHERE card_id = p_card_id
  LIMIT 1;

  -- If already owned by target user, return success
  IF v_previous_owner = v_target_user THEN
    RETURN jsonb_build_object('ok', true, 'already_owned', true);
  END IF;

  -- Remove from previous owner (if any)
  IF v_previous_owner IS NOT NULL THEN
    DELETE FROM public.user_cards
    WHERE card_id = p_card_id AND user_id = v_previous_owner;
  END IF;

  -- Assign to new owner
  INSERT INTO public.user_cards (user_id, card_id, claim_source)
  VALUES (v_target_user, p_card_id, 'admin_assigned')
  ON CONFLICT (user_id, card_id) DO NOTHING;

  -- Update cards table tracking
  UPDATE public.cards
  SET 
    is_claimed = true,
    claimed_by = v_target_user,
    claimed_at = now()
  WHERE id = p_card_id;

  RETURN jsonb_build_object(
    'ok', true,
    'previous_owner', v_previous_owner,
    'new_owner', v_target_user
  );
END;
$$;

-- Function to release card from collection to wild
CREATE OR REPLACE FUNCTION public.admin_release_card(
  p_card_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_current_owner UUID;
  v_redemption_status TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Check if card exists
  IF NOT EXISTS (SELECT 1 FROM public.cards WHERE id = p_card_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'card_not_found');
  END IF;

  -- Get current owner
  SELECT user_id INTO v_current_owner
  FROM public.user_cards
  WHERE card_id = p_card_id
  LIMIT 1;

  IF v_current_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  -- Check redemption status
  SELECT status INTO v_redemption_status
  FROM public.card_redemptions
  WHERE card_id = p_card_id AND user_id = v_current_owner
  ORDER BY submitted_at DESC
  LIMIT 1;

  -- Remove from user_cards
  DELETE FROM public.user_cards
  WHERE card_id = p_card_id AND user_id = v_current_owner;

  -- Reset card claim status
  UPDATE public.cards
  SET 
    is_claimed = false,
    claimed_by = NULL,
    claimed_at = NULL
  WHERE id = p_card_id;

  -- Log the admin action in card_ownership_history
  INSERT INTO public.card_ownership_history (
    card_id, 
    user_id, 
    action, 
    previous_owner_id, 
    metadata
  )
  VALUES (
    p_card_id,
    v_admin,
    'admin_released',
    v_current_owner,
    jsonb_build_object(
      'reason', p_reason,
      'had_pending_redemption', v_redemption_status = 'pending',
      'released_at', now()
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'released_from', v_current_owner,
    'had_pending_redemption', v_redemption_status = 'pending'
  );
END;
$$;
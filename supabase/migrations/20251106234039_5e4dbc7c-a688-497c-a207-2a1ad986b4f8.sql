-- Update delete_user_card function to fully reset card ownership
-- This allows cards to be re-scanned and re-added to collections

CREATE OR REPLACE FUNCTION public.delete_user_card(p_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_deleted_user_cards INT := 0;
  v_deleted_redemptions INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user owns the card
  IF NOT EXISTS (SELECT 1 FROM public.user_cards WHERE card_id = p_card_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  -- Delete any redemption records for this card/user combination
  DELETE FROM public.card_redemptions 
  WHERE card_id = p_card_id AND user_id = v_user;
  
  GET DIAGNOSTICS v_deleted_redemptions = ROW_COUNT;

  -- Delete the user card ownership
  DELETE FROM public.user_cards 
  WHERE card_id = p_card_id AND user_id = v_user;
  
  GET DIAGNOSTICS v_deleted_user_cards = ROW_COUNT;

  -- Reset the card's claim status so it can be re-scanned
  UPDATE public.cards
  SET 
    is_claimed = false,
    claimed_by = NULL,
    claimed_at = NULL
  WHERE id = p_card_id;

  IF v_deleted_user_cards = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'deletion_failed');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 
    'deleted_user_cards', v_deleted_user_cards,
    'deleted_redemptions', v_deleted_redemptions
  );
END;
$$;
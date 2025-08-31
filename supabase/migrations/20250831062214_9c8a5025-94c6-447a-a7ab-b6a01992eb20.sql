-- Update accept_card_rejection function to DELETE rejected records instead of updating status
CREATE OR REPLACE FUNCTION public.accept_card_rejection(p_redemption_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_deleted_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Delete the rejected redemption record completely
  DELETE FROM public.card_redemptions
  WHERE id = p_redemption_id AND user_id = v_user AND status = 'rejected';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_redemption');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$
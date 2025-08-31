-- Fix resubmit_rejected_card to update existing record instead of creating new one
CREATE OR REPLACE FUNCTION public.resubmit_rejected_card(p_redemption_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_card_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  -- Get card_id and verify ownership and rejection status
  SELECT card_id INTO v_card_id
  FROM public.card_redemptions
  WHERE id = p_redemption_id AND user_id = v_user AND status = 'rejected';

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_redemption');
  END IF;

  -- Update the existing rejected record to pending instead of creating a new one
  UPDATE public.card_redemptions 
  SET 
    status = 'pending',
    submitted_at = now(),
    decided_at = NULL,
    decided_by = NULL,
    admin_notes = NULL
  WHERE id = p_redemption_id AND user_id = v_user AND status = 'rejected';

  RETURN jsonb_build_object('ok', true);
END;
$function$;
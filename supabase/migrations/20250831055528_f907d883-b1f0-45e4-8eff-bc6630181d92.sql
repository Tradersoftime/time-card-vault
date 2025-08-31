-- Fix submit_card_for_redemption to handle existing records with UPSERT logic
CREATE OR REPLACE FUNCTION public.submit_card_for_redemption(p_card_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_existing_status TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  -- Check if user owns the card
  IF NOT EXISTS (SELECT 1 FROM public.user_cards WHERE card_id = p_card_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  -- Check for existing redemption record
  SELECT status INTO v_existing_status
  FROM public.card_redemptions 
  WHERE card_id = p_card_id AND user_id = v_user
  ORDER BY submitted_at DESC
  LIMIT 1;

  -- If already pending or credited, don't allow resubmission
  IF v_existing_status IN ('pending', 'credited') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  -- Use UPSERT: Insert new record or update existing rejected/rejected_accepted record to pending
  INSERT INTO public.card_redemptions (user_id, card_id, status, submitted_at)
  VALUES (v_user, p_card_id, 'pending', now())
  ON CONFLICT (user_id, card_id, status) 
  DO UPDATE SET 
    submitted_at = now(),
    decided_at = NULL,
    decided_by = NULL,
    admin_notes = NULL,
    credited_at = NULL,
    credited_by = NULL,
    credited_amount = NULL,
    external_ref = NULL
  WHERE card_redemptions.status IN ('rejected', 'rejected_accepted');

  -- If no conflict occurred (new insert) or conflict was resolved, return success
  -- If conflict occurred but status wasn't rejected/rejected_accepted, we need to handle differently
  IF v_existing_status IN ('rejected', 'rejected_accepted') THEN
    -- Update the existing rejected record to pending
    UPDATE public.card_redemptions 
    SET 
      status = 'pending',
      submitted_at = now(),
      decided_at = NULL,
      decided_by = NULL,
      admin_notes = NULL,
      credited_at = NULL,
      credited_by = NULL,
      credited_amount = NULL,
      external_ref = NULL
    WHERE card_id = p_card_id AND user_id = v_user AND status IN ('rejected', 'rejected_accepted');
  ELSIF v_existing_status IS NULL THEN
    -- This is a new submission, the INSERT above should have worked
    NULL; -- No additional action needed
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
-- Create function to delete pending redemptions
CREATE OR REPLACE FUNCTION public.admin_delete_pending_redemptions(p_redemption_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin UUID := auth.uid();
  v_count INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Only delete pending redemptions to prevent accidental deletion
  DELETE FROM public.card_redemptions
  WHERE id = ANY(p_redemption_ids) AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'deleted_count', v_count);
END;
$function$
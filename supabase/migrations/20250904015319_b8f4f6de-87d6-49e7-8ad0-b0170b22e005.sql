-- Fix admin_bulk_set_active function - remove updated_at column reference
CREATE OR REPLACE FUNCTION public.admin_bulk_set_active(p_card_ids uuid[], p_is_active boolean)
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

  UPDATE public.cards
  SET 
    is_active = p_is_active
  WHERE id = ANY(p_card_ids) AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated_count', v_count);
END;
$function$
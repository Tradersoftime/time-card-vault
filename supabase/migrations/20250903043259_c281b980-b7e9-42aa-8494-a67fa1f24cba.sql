-- Add image_code field to cards table
ALTER TABLE public.cards ADD COLUMN image_code text;

-- Create bulk operations functions
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
    is_active = p_is_active,
    updated_at = now()
  WHERE id = ANY(p_card_ids) AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated_count', v_count);
END;
$function$;

-- Update the existing admin_soft_delete_cards function to work with the UI
CREATE OR REPLACE FUNCTION public.admin_bulk_soft_delete(p_card_ids uuid[])
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
    deleted_at = now(),
    deleted_by = v_admin
  WHERE id = ANY(p_card_ids) AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'deleted_count', v_count);
END;
$function$;

-- Function to delete single card
CREATE OR REPLACE FUNCTION public.admin_soft_delete_card(p_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.cards
  SET 
    deleted_at = now(),
    deleted_by = v_admin
  WHERE id = p_card_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
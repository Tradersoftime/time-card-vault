-- Improved admin_resolve_image_codes function
-- Now re-resolves ALL cards with image_code (not just those with NULL URLs)
-- Also clears image_url for cards whose image_code no longer exists in library

CREATE OR REPLACE FUNCTION public.admin_resolve_image_codes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_updated INT := 0;
  v_cleared INT := 0;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Update cards where image_code exists in library (re-resolve ALL, not just NULL)
  UPDATE public.cards c
  SET image_url = ic.public_url
  FROM public.image_codes ic
  WHERE c.image_code = ic.code
    AND c.image_code IS NOT NULL
    AND (c.image_url IS DISTINCT FROM ic.public_url);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Clear image_url for cards where image_code no longer exists in library (orphaned)
  UPDATE public.cards c
  SET image_url = NULL
  WHERE c.image_code IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.image_codes ic WHERE ic.code = c.image_code)
    AND c.image_url IS NOT NULL;
  
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true, 
    'updated_count', v_updated,
    'cleared_count', v_cleared,
    'message', format('Updated %s cards, cleared %s orphaned images', v_updated, v_cleared)
  );
END;
$$;
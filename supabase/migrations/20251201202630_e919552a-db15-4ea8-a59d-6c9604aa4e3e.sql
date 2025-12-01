-- Function to sync image_url when image_code is uploaded
CREATE OR REPLACE FUNCTION public.sync_image_code_to_cards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update all cards that have this image_code but no image_url
  UPDATE public.cards
  SET image_url = NEW.public_url
  WHERE image_code = NEW.code
    AND (image_url IS NULL OR image_url = '');
  
  RETURN NEW;
END;
$$;

-- Trigger on image_codes insert to auto-sync
CREATE TRIGGER on_image_code_insert
AFTER INSERT ON public.image_codes
FOR EACH ROW
EXECUTE FUNCTION public.sync_image_code_to_cards();

-- Admin function to manually resolve/refresh image codes
CREATE OR REPLACE FUNCTION public.admin_resolve_image_codes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_count INT := 0;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Sync all cards that have image_code but no image_url
  UPDATE public.cards c
  SET image_url = ic.public_url
  FROM public.image_codes ic
  WHERE c.image_code = ic.code
    AND (c.image_url IS NULL OR c.image_url = '');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated_count', v_count);
END;
$$;

-- One-time sync: Update existing cards that have image_code but no image_url
UPDATE public.cards c
SET image_url = ic.public_url
FROM public.image_codes ic
WHERE c.image_code = ic.code
  AND (c.image_url IS NULL OR c.image_url = '');
-- Create function for bulk assigning cards to print batches
CREATE OR REPLACE FUNCTION admin_bulk_assign_batch(
  p_card_ids uuid[],
  p_batch_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_updated_count INT := 0;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Update batch assignment (NULL batch_id means unassigned)
  UPDATE public.cards 
  SET print_batch_id = p_batch_id
  WHERE id = ANY(p_card_ids)
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'updated_count', v_updated_count
  );
END;
$$;
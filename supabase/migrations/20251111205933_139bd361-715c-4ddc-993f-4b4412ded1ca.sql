-- Fix ambiguous column reference in admin_card_activity_log function
DROP FUNCTION IF EXISTS public.admin_card_activity_log(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.admin_card_activity_log(
  p_card_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  card_id uuid,
  card_code text,
  card_name text,
  user_id uuid,
  user_email text,
  action text,
  previous_owner_id uuid,
  previous_owner_email text,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Fix: Qualify user_id with table name to avoid ambiguity
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    h.id,
    h.card_id,
    c.code,
    c.name,
    h.user_id,
    u.email::text,
    h.action,
    h.previous_owner_id,
    pu.email::text,
    h.metadata,
    h.created_at
  FROM public.card_ownership_history h
  JOIN public.cards c ON c.id = h.card_id
  LEFT JOIN auth.users u ON u.id = h.user_id
  LEFT JOIN auth.users pu ON pu.id = h.previous_owner_id
  WHERE (p_card_id IS NULL OR h.card_id = p_card_id)
    AND (p_user_id IS NULL OR h.user_id = p_user_id)
  ORDER BY h.created_at DESC
  LIMIT p_limit;
END;
$$;
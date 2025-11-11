-- Add missing fields (qr_dark, qr_light, image_code, description, claim_token) to admin_list_cards
DROP FUNCTION IF EXISTS public.admin_list_cards(text, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.admin_list_cards(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0,
  p_include_deleted boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  code text,
  name text,
  era text,
  suit text,
  rank text,
  rarity text,
  trader_value text,
  time_value numeric,
  image_url text,
  redirect text,
  is_active boolean,
  status text,
  created_at timestamp with time zone,
  owner_user_id uuid,
  owner_email text,
  is_in_pending_redemption boolean,
  is_credited boolean,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  total_redemption_attempts integer,
  has_multiple_submitters boolean,
  print_batch_id uuid,
  batch_sort_order integer,
  qr_dark text,
  qr_light text,
  image_code text,
  description text,
  claim_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH cr_pending AS (
    SELECT DISTINCT cr.card_id
    FROM public.card_redemptions cr
    WHERE cr.status = 'pending'
  ),
  cr_credited AS (
    SELECT DISTINCT cr.card_id
    FROM public.card_redemptions cr
    WHERE cr.status = 'credited'
  ),
  redemption_stats AS (
    SELECT 
      card_id,
      COUNT(*)::INT AS attempt_count,
      COUNT(DISTINCT user_id)::INT AS submitter_count
    FROM public.card_redemptions
    GROUP BY card_id
  ),
  owners AS (
    SELECT uc.card_id, uc.user_id, u.email::text AS email
    FROM public.user_cards uc
    LEFT JOIN auth.users u ON u.id = uc.user_id
  ),
  base AS (
    SELECT
      c.id, c.code, c.name, c.era, c.suit, c.rank, c.rarity, c.trader_value,
      c.time_value::numeric, c.image_url,
      COALESCE(c.current_target, '') AS redirect,
      c.is_active, c.status, c.created_at,
      o.user_id AS owner_user_id,
      o.email::text AS owner_email,
      (cp.card_id IS NOT NULL) AS is_in_pending_redemption,
      (cc.card_id IS NOT NULL) AS is_credited,
      c.deleted_at,
      c.deleted_by,
      COALESCE(rs.attempt_count, 0) AS total_redemption_attempts,
      (rs.submitter_count > 1) AS has_multiple_submitters,
      c.print_batch_id,
      c.batch_sort_order,
      c.qr_dark,
      c.qr_light,
      c.image_code,
      c.description,
      c.claim_token
    FROM public.cards c
    LEFT JOIN owners o ON o.card_id = c.id
    LEFT JOIN cr_pending cp ON cp.card_id = c.id
    LEFT JOIN cr_credited cc ON cc.card_id = c.id
    LEFT JOIN redemption_stats rs ON rs.card_id = c.id
    WHERE (p_include_deleted = true OR c.deleted_at IS NULL)
  )
  SELECT base.*
  FROM base
  WHERE (p_search IS NULL OR p_search = '')
     OR (base.code ILIKE '%'||p_search||'%' 
         OR COALESCE(base.name,'') ILIKE '%'||p_search||'%' 
         OR COALESCE(base.owner_email,'') ILIKE '%'||p_search||'%')
  ORDER BY base.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
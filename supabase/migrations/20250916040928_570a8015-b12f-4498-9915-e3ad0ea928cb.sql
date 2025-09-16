-- Fix search_path security issue for admin_list_users function
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL::text, 
  p_status_filter text DEFAULT NULL::text, 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  created_at timestamp with time zone, 
  email_confirmed_at timestamp with time zone, 
  last_sign_in_at timestamp with time zone, 
  is_blocked boolean, 
  block_reason text, 
  blocked_at timestamp with time zone, 
  blocked_by_email text, 
  total_cards_owned integer, 
  pending_redemptions integer, 
  credited_redemptions integer, 
  total_scans integer, 
  last_activity timestamp with time zone,
  total_time_credited numeric,
  total_time_owned numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.id AS user_id,
      u.email::text,
      u.created_at,
      u.email_confirmed_at,
      u.last_sign_in_at,
      COALESCE(uc.card_count, 0)::integer AS total_cards_owned,
      COALESCE(pr.pending_count, 0)::integer AS pending_redemptions,
      COALESCE(cr.credited_count, 0)::integer AS credited_redemptions,
      COALESCE(se.scan_count, 0)::integer AS total_scans,
      GREATEST(u.last_sign_in_at, uc.last_claim, se.last_scan) AS last_activity,
      COALESCE(cr.total_credited_amount, 0)::numeric AS total_time_credited,
      COALESCE(co.total_owned_time, 0)::numeric AS total_time_owned
    FROM auth.users u
    LEFT JOIN (
      SELECT 
        uc.user_id, 
        COUNT(*)::integer AS card_count,
        MAX(uc.claimed_at) AS last_claim
      FROM public.user_cards uc
      GROUP BY uc.user_id
    ) uc ON uc.user_id = u.id
    LEFT JOIN (
      SELECT 
        cr.user_id, 
        COUNT(*)::integer AS pending_count
      FROM public.card_redemptions cr
      WHERE cr.status = 'pending'
      GROUP BY cr.user_id
    ) pr ON pr.user_id = u.id
    LEFT JOIN (
      SELECT 
        cr2.user_id, 
        COUNT(*)::integer AS credited_count,
        SUM(COALESCE(cr2.credited_amount, 0))::numeric AS total_credited_amount
      FROM public.card_redemptions cr2
      WHERE cr2.status = 'credited'
      GROUP BY cr2.user_id
    ) cr ON cr.user_id = u.id
    LEFT JOIN (
      SELECT 
        se.user_id, 
        COUNT(*)::integer AS scan_count,
        MAX(se.created_at) AS last_scan
      FROM public.scan_events se
      GROUP BY se.user_id
    ) se ON se.user_id = u.id
    LEFT JOIN (
      SELECT 
        uc.user_id,
        SUM(COALESCE(c.time_value, 0))::numeric AS total_owned_time
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      GROUP BY uc.user_id
    ) co ON co.user_id = u.id
  ),
  blocked_info AS (
    SELECT 
      b.user_id,
      b.reason::text AS block_reason,
      b.blocked_at,
      bu.email::text AS blocked_by_email
    FROM public.blocked_users b
    LEFT JOIN auth.users bu ON bu.id = b.blocked_by
  )
  SELECT 
    us.user_id,
    us.email,
    us.created_at,
    us.email_confirmed_at,
    us.last_sign_in_at,
    (bi.user_id IS NOT NULL) AS is_blocked,
    bi.block_reason,
    bi.blocked_at,
    bi.blocked_by_email,
    us.total_cards_owned,
    us.pending_redemptions,
    us.credited_redemptions,
    us.total_scans,
    us.last_activity,
    us.total_time_credited,
    us.total_time_owned
  FROM user_stats us
  LEFT JOIN blocked_info bi ON bi.user_id = us.user_id
  WHERE 
    (p_search IS NULL OR btrim(p_search) = '' OR us.email ILIKE '%' || btrim(p_search) || '%')
    AND (
      p_status_filter IS NULL OR 
      btrim(p_status_filter) = '' OR 
      lower(btrim(p_status_filter)) = 'all' OR
      (lower(btrim(p_status_filter)) = 'blocked' AND bi.user_id IS NOT NULL) OR
      (lower(btrim(p_status_filter)) = 'active' AND bi.user_id IS NULL)
    )
  ORDER BY us.last_activity DESC NULLS LAST, us.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$
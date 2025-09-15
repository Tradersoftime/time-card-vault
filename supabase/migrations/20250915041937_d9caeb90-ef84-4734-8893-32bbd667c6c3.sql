-- Create function to list users with comprehensive data for admin management
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
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
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.id as user_id,
      u.email,
      u.created_at,
      u.email_confirmed_at,
      u.last_sign_in_at,
      COALESCE(uc.card_count, 0) as total_cards_owned,
      COALESCE(pr.pending_count, 0) as pending_redemptions,
      COALESCE(cr.credited_count, 0) as credited_redemptions,
      COALESCE(se.scan_count, 0) as total_scans,
      GREATEST(u.last_sign_in_at, uc.last_claim, se.last_scan) as last_activity
    FROM auth.users u
    LEFT JOIN (
      SELECT 
        user_id, 
        COUNT(*) as card_count,
        MAX(claimed_at) as last_claim
      FROM public.user_cards 
      GROUP BY user_id
    ) uc ON uc.user_id = u.id
    LEFT JOIN (
      SELECT 
        user_id, 
        COUNT(*) as pending_count
      FROM public.card_redemptions 
      WHERE status = 'pending'
      GROUP BY user_id
    ) pr ON pr.user_id = u.id
    LEFT JOIN (
      SELECT 
        user_id, 
        COUNT(*) as credited_count
      FROM public.card_redemptions 
      WHERE status = 'credited'
      GROUP BY user_id
    ) cr ON cr.user_id = u.id
    LEFT JOIN (
      SELECT 
        user_id, 
        COUNT(*) as scan_count,
        MAX(created_at) as last_scan
      FROM public.scan_events 
      GROUP BY user_id
    ) se ON se.user_id = u.id
  ),
  blocked_info AS (
    SELECT 
      b.user_id,
      b.reason as block_reason,
      b.blocked_at,
      bu.email as blocked_by_email
    FROM public.blocked_users b
    LEFT JOIN auth.users bu ON bu.id = b.blocked_by
  )
  SELECT 
    us.user_id,
    us.email,
    us.created_at,
    us.email_confirmed_at,
    us.last_sign_in_at,
    (bi.user_id IS NOT NULL) as is_blocked,
    bi.block_reason,
    bi.blocked_at,
    bi.blocked_by_email,
    us.total_cards_owned,
    us.pending_redemptions,
    us.credited_redemptions,
    us.total_scans,
    us.last_activity
  FROM user_stats us
  LEFT JOIN blocked_info bi ON bi.user_id = us.user_id
  WHERE 
    (p_search IS NULL OR p_search = '' OR us.email ILIKE '%' || p_search || '%')
    AND (p_status_filter IS NULL OR 
         (p_status_filter = 'blocked' AND bi.user_id IS NOT NULL) OR
         (p_status_filter = 'active' AND bi.user_id IS NULL))
  ORDER BY us.last_activity DESC NULLS LAST, us.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
-- Fix admin_recent_credited function to work with card_redemptions table
CREATE OR REPLACE FUNCTION public.admin_recent_credited(p_limit integer DEFAULT 200)
 RETURNS TABLE(redemption_id uuid, credited_at timestamp with time zone, user_id uuid, user_email text, card_id uuid, card_code text, amount_time numeric, credited_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    cr.id as redemption_id,
    cr.credited_at,
    cr.user_id,
    COALESCE(p.email, au.email) as user_email,
    c.id as card_id,
    c.code as card_code,
    COALESCE(cr.credited_amount, c.time_value) as amount_time,
    1 as credited_count  -- Each redemption is for one card now
  FROM public.card_redemptions cr
  LEFT JOIN public.profiles p ON p.user_id = cr.user_id
  LEFT JOIN auth.users au ON au.id = cr.user_id
  JOIN public.cards c ON c.id = cr.card_id
  WHERE cr.status = 'credited'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  ORDER BY cr.credited_at DESC NULLS LAST
  LIMIT LEAST(p_limit, 1000);
$function$;

-- Fix accept_card_rejection to properly update status
CREATE OR REPLACE FUNCTION public.accept_card_rejection(p_redemption_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Update status to mark as accepted (user acknowledged the rejection)
  UPDATE public.card_redemptions
  SET status = 'rejected_accepted'
  WHERE id = p_redemption_id AND user_id = v_user AND status = 'rejected';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_redemption');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
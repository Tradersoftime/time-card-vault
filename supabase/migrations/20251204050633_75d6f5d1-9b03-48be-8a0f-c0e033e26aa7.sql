-- Update claim_card (1-parameter version) with input validation
CREATE OR REPLACE FUNCTION public.claim_card(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_card record;
  v_existing record;
begin
  if v_user is null then 
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Input validation: code must be 3-50 characters
  if p_code is null or length(trim(p_code)) < 3 or length(trim(p_code)) > 50 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- Blocked check
  if exists (select 1 from public.blocked_users b where b.user_id = v_user) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  select id, status
  into v_card
  from public.cards
  where code = p_code;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_card.status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;

  -- Already owned?
  select user_id
  into v_existing
  from public.user_cards
  where card_id = v_card.id
  limit 1;

  if found then
    if v_existing.user_id = v_user then
      return jsonb_build_object('ok', true, 'already_owned', true);
    else
      return jsonb_build_object('ok', false, 'error', 'claimed_by_other');
    end if;
  end if;

  insert into public.user_cards (user_id, card_id, claim_source)
  values (v_user, v_card.id, 'qr');

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    select user_id into v_existing
    from public.user_cards
    where card_id = v_card.id
    limit 1;

    if v_existing.user_id = v_user then
      return jsonb_build_object('ok', true, 'already_owned', true);
    else
      return jsonb_build_object('ok', false, 'error', 'claimed_by_other');
    end if;
end;
$function$;

-- Update claim_card (2-parameter version) with input validation
CREATE OR REPLACE FUNCTION public.claim_card(p_code text, p_source text DEFAULT 'scan'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user  uuid := auth.uid();
  v_card  record;
  v_owner uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  -- Input validation: code must be 3-50 characters
  if p_code is null or length(trim(p_code)) < 3 or length(trim(p_code)) > 50 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- Input validation: source must be valid
  if p_source is not null and p_source not in ('scan', 'qr', 'admin_assigned') then
    return jsonb_build_object('ok', false, 'error', 'invalid_source');
  end if;

  if exists (select 1 from public.blocked_users b where b.user_id = v_user) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  select c.*
    into v_card
  from public.cards c
  where lower(trim(c.code)) = lower(trim(p_code))
    and coalesce(c.is_active, (c.status = 'active')) is true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select uc.user_id into v_owner
  from public.user_cards uc
  where uc.card_id = v_card.id
  limit 1;

  if found then
    if v_owner = v_user then
      return jsonb_build_object('ok', true, 'card_id', v_card.id, 'already_owner', true);
    else
      return jsonb_build_object('ok', false, 'error', 'owned_by_other');
    end if;
  end if;

  insert into public.user_cards(card_id, user_id, claim_source)
  values (v_card.id, v_user, coalesce(p_source, 'scan'));

  return jsonb_build_object('ok', true, 'card_id', v_card.id);
end;
$function$;

-- Update claim_card_by_token with input validation
CREATE OR REPLACE FUNCTION public.claim_card_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_card_id UUID;
  v_already_claimed BOOLEAN;
  v_claimed_by UUID;
BEGIN
  -- Check if user is authenticated
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Input validation: token must be exactly 22 alphanumeric characters
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9]{22}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  -- Find card by claim_token
  SELECT id, is_claimed, claimed_by 
  INTO v_card_id, v_already_claimed, v_claimed_by
  FROM public.cards 
  WHERE claim_token = p_token AND status = 'active';

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found');
  END IF;

  -- Check if already claimed
  IF v_already_claimed THEN
    IF v_claimed_by = v_user THEN
      RETURN jsonb_build_object('ok', true, 'already_claimed_by_you', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'already_claimed_by_other');
    END IF;
  END IF;

  -- Claim the card
  UPDATE public.cards
  SET 
    is_claimed = true,
    claimed_by = v_user,
    claimed_at = now()
  WHERE claim_token = p_token;

  -- Also add to user_cards for consistency with existing system
  INSERT INTO public.user_cards (user_id, card_id, claim_source)
  VALUES (v_user, v_card_id, 'scan')
  ON CONFLICT (user_id, card_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'card_id', v_card_id);
END;
$function$;

-- Update admin_list_cards with input sanitization
CREATE OR REPLACE FUNCTION public.admin_list_cards(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0, p_include_deleted boolean DEFAULT false)
 RETURNS TABLE(id uuid, code text, name text, era text, suit text, rank text, rarity text, trader_value text, time_value numeric, image_url text, redirect text, is_active boolean, status text, created_at timestamp with time zone, owner_user_id uuid, owner_email text, is_in_pending_redemption boolean, is_credited boolean, deleted_at timestamp with time zone, deleted_by uuid, total_redemption_attempts integer, has_multiple_submitters boolean, print_batch_id uuid, batch_sort_order integer, qr_dark text, qr_light text, image_code text, description text, claim_token text, print_run text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Input sanitization: truncate search to max 100 characters
  p_search := LEFT(COALESCE(p_search, ''), 100);

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
      c.claim_token,
      c.print_run
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
$function$;

-- Update admin_list_users with input sanitization
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL::text, p_status_filter text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone, email_confirmed_at timestamp with time zone, last_sign_in_at timestamp with time zone, is_blocked boolean, block_reason text, blocked_at timestamp with time zone, blocked_by_email text, total_cards_owned integer, pending_redemptions integer, credited_redemptions integer, total_scans integer, last_activity timestamp with time zone, total_time_credited numeric, total_time_owned numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Input sanitization: truncate search to max 100 characters
  p_search := LEFT(COALESCE(p_search, ''), 100);

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
$function$;

-- Update admin_block_user_by_email with input validation
CREATE OR REPLACE FUNCTION public.admin_block_user_by_email(p_email text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin uuid := auth.uid();
  v_user uuid;
begin
  if not exists (select 1 from public.admins a where a.user_id = v_admin) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Input validation: email must be valid format
  if p_email is null or length(p_email) > 255 or position('@' in p_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  -- Input sanitization: truncate reason to max 1000 characters
  p_reason := LEFT(COALESCE(p_reason, ''), 1000);

  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.blocked_users(user_id, reason, blocked_by)
  values (v_user, p_reason, v_admin)
  on conflict (user_id) do update
    set reason = excluded.reason,
        blocked_at = now(),
        blocked_by = v_admin;

  return jsonb_build_object('ok', true);
end;
$function$;
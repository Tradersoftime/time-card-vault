-- Add soft delete columns to cards table
ALTER TABLE public.cards ADD COLUMN deleted_at timestamp with time zone NULL;
ALTER TABLE public.cards ADD COLUMN deleted_by uuid NULL;

-- Update admin_list_cards function to exclude soft deleted cards by default
CREATE OR REPLACE FUNCTION public.admin_list_cards(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0, p_include_deleted boolean DEFAULT false)
RETURNS TABLE(id uuid, code text, name text, era text, suit text, rank text, rarity text, trader_value text, time_value numeric, image_url text, redirect text, is_active boolean, status text, created_at timestamp with time zone, owner_user_id uuid, owner_email text, is_in_pending_redemption boolean, is_credited boolean, deleted_at timestamp with time zone, deleted_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from admins where user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;

  return query
  with rc_pending as (
    select distinct rc.card_id
    from redemption_cards rc
    join redemptions r on r.id = rc.redemption_id
    where rc.decision = 'pending' and r.status = 'pending'
  ),
  rc_credited as (
    select distinct rc.card_id
    from redemption_cards rc
    where rc.decision = 'credited'
  ),
  owners as (
    select uc.card_id, uc.user_id, u.email
    from user_cards uc
    left join auth.users u on u.id = uc.user_id
  ),
  base as (
    select
      c.id, c.code, c.name, c.era, c.suit, c.rank, c.rarity, c.trader_value,
      c.time_value, c.image_url,
      coalesce(c.current_target, c.redirect_url) as redirect,
      c.is_active, c.status, c.created_at,
      o.user_id as owner_user_id,
      o.email   as owner_email,
      (rp.card_id is not null) as is_in_pending_redemption,
      (rc.card_id is not null) as is_credited,
      c.deleted_at,
      c.deleted_by
    from cards c
    left join owners o      on o.card_id = c.id
    left join rc_pending rp on rp.card_id = c.id
    left join rc_credited rc on rc.card_id = c.id
    where (p_include_deleted = true OR c.deleted_at IS NULL)
  )
  select *
  from base
  where (p_search is null or p_search = '')
     or (code ilike '%'||p_search||'%' or coalesce(name,'') ilike '%'||p_search||'%' or coalesce(owner_email,'') ilike '%'||p_search||'%')
  order by created_at desc
  limit p_limit offset p_offset;
end;
$function$;

-- Create function to soft delete cards
CREATE OR REPLACE FUNCTION public.admin_soft_delete_cards(p_card_ids uuid[])
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

-- Create function to restore deleted cards
CREATE OR REPLACE FUNCTION public.admin_restore_cards(p_card_ids uuid[])
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
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = ANY(p_card_ids) AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'restored_count', v_count);
END;
$function$;

-- Create function to permanently delete old cards (30+ days in trash)
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INT := 0;
BEGIN
  DELETE FROM public.cards 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'permanently_deleted', v_count);
END;
$function$;
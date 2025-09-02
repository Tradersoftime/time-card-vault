-- Fix admin_list_cards function to use correct table name card_redemptions instead of redemption_cards
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
  with cr_pending as (
    select distinct cr.card_id
    from card_redemptions cr
    where cr.status = 'pending'
  ),
  cr_credited as (
    select distinct cr.card_id
    from card_redemptions cr
    where cr.status = 'credited'
  ),
  owners as (
    select uc.card_id, uc.user_id, u.email
    from user_cards uc
    left join auth.users u on u.id = uc.user_id
  ),
  base as (
    select
      c.id, c.code, c.name, c.era, c.suit, c.rank, c.rarity, c.trader_value,
      c.time_value::numeric, c.image_url,
      coalesce(c.current_target, '') as redirect,
      c.is_active, c.status, c.created_at,
      o.user_id as owner_user_id,
      o.email   as owner_email,
      (cp.card_id is not null) as is_in_pending_redemption,
      (cc.card_id is not null) as is_credited,
      c.deleted_at,
      c.deleted_by
    from cards c
    left join owners o      on o.card_id = c.id
    left join cr_pending cp on cp.card_id = c.id
    left join cr_credited cc on cc.card_id = c.id
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
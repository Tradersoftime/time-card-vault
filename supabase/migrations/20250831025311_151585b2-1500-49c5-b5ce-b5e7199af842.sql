-- Add admin reject functionality
CREATE OR REPLACE FUNCTION public.admin_reject_redemption(p_redemption_id uuid, p_admin_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin uuid := auth.uid();
begin
  if not exists (select 1 from public.admins a where a.user_id = v_admin) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Update redemption to rejected status
  update public.redemptions
  set status = 'rejected',
      admin_notes = p_admin_notes,
      credited_at = now(),
      credited_by = v_admin
  where id = p_redemption_id
    and status = 'pending';

  -- Mark all cards in this redemption as rejected
  update public.redemption_cards
  set decision = 'rejected',
      decided_at = now()
  where redemption_id = p_redemption_id
    and decision = 'pending';

  return jsonb_build_object('ok', true);
end;
$$;

-- Function to get user's redemption history
CREATE OR REPLACE FUNCTION public.user_redemption_history()
RETURNS TABLE(
  id uuid,
  status text,
  submitted_at timestamp with time zone,
  credited_at timestamp with time zone,
  credited_amount numeric,
  admin_notes text,
  total_cards integer,
  approved_cards integer,
  rejected_cards integer,
  pending_cards integer,
  cards jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    r.id,
    r.status,
    r.submitted_at,
    r.credited_at,
    r.credited_amount,
    r.admin_notes,
    count(rc.card_id)::integer as total_cards,
    count(case when rc.decision = 'approved' or rc.decision = 'credited' then 1 end)::integer as approved_cards,
    count(case when rc.decision = 'rejected' then 1 end)::integer as rejected_cards,
    count(case when rc.decision = 'pending' then 1 end)::integer as pending_cards,
    jsonb_agg(
      jsonb_build_object(
        'card_id', c.id,
        'name', c.name,
        'image_url', c.image_url,
        'era', c.era,
        'suit', c.suit,
        'rank', c.rank,
        'rarity', c.rarity,
        'trader_value', c.trader_value,
        'time_value', c.time_value,
        'decision', rc.decision,
        'decided_at', rc.decided_at
      ) order by c.name
    ) as cards
  from public.redemptions r
  join public.redemption_cards rc on rc.redemption_id = r.id
  join public.cards c on c.id = rc.card_id
  where r.user_id = auth.uid()
  group by r.id, r.status, r.submitted_at, r.credited_at, r.credited_amount, r.admin_notes
  order by r.submitted_at desc;
$$;

-- Function to resubmit rejected cards
CREATE OR REPLACE FUNCTION public.resubmit_rejected_cards(p_original_redemption_id uuid, p_card_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user uuid := auth.uid();
  v_new_redemption_id uuid;
  v_card_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Check if user is blocked
  if exists (select 1 from public.blocked_users where user_id = v_user) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  -- Verify the original redemption belongs to the user and cards were rejected
  if not exists (
    select 1 from public.redemptions r
    join public.redemption_cards rc on rc.redemption_id = r.id
    where r.id = p_original_redemption_id
      and r.user_id = v_user
      and rc.card_id = any(p_card_ids)
      and rc.decision = 'rejected'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_cards');
  end if;

  -- Create new redemption
  insert into public.redemptions (user_id)
  values (v_user)
  returning id into v_new_redemption_id;

  -- Add cards to new redemption
  foreach v_card_id in array p_card_ids loop
    insert into public.redemption_cards (redemption_id, card_id)
    values (v_new_redemption_id, v_card_id);
  end loop;

  return jsonb_build_object('ok', true, 'redemption_id', v_new_redemption_id);
end;
$$;
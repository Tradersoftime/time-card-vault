-- Fix the claim_card_and_log function to properly insert scan events
-- The issue is that SECURITY DEFINER runs as function owner, not auth.uid()
-- We need to explicitly pass the user_id to the insert

DROP FUNCTION IF EXISTS public.claim_card_and_log(text, text);

CREATE OR REPLACE FUNCTION public.claim_card_and_log(p_code text, p_source text DEFAULT 'scan'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_res jsonb;
  v_card_id uuid;
  v_user uuid := auth.uid();
  v_outcome text;
  v_code_trim text := trim(p_code);
begin
  -- Call the core claim (no rate limits here)
  v_res := public.claim_card(v_code_trim, p_source);

  -- Work out outcome for the log
  v_card_id := (v_res ->> 'card_id')::uuid;
  if (v_res->>'ok') = 'true' then
    if (v_res->>'already_owner') = 'true' then
      v_outcome := 'already_owner';
    else
      v_outcome := 'claimed';
    end if;
  else
    v_outcome := coalesce(v_res->>'error', 'error');
    if v_outcome not in ('owned_by_other','not_found','blocked') then
      v_outcome := 'error';
    end if;
  end if;

  -- Insert scan event with explicit user_id (not relying on RLS with SECURITY DEFINER)
  -- This bypasses the RLS policy issue
  insert into public.scan_events(user_id, code, card_id, outcome, source, created_at)
  values (v_user, v_code_trim, v_card_id, v_outcome, coalesce(p_source,'scan'), now());

  return v_res;
end;
$function$;
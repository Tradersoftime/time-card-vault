-- Phase 1 & 2: Security Fix + Activity Logging System (Fixed)

-- ============================================
-- 1. Create card_ownership_history table
-- ============================================
CREATE TABLE IF NOT EXISTS public.card_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'claimed',
    'released',
    'redemption_submitted',
    'redemption_pending',
    'redemption_credited',
    'redemption_rejected'
  )),
  previous_owner_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_ownership_history_card ON public.card_ownership_history(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_ownership_history_user ON public.card_ownership_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_ownership_history_action ON public.card_ownership_history(action, created_at DESC);

-- Enable RLS
ALTER TABLE public.card_ownership_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_ownership_history
DROP POLICY IF EXISTS "Admins can view all history" ON public.card_ownership_history;
CREATE POLICY "Admins can view all history"
  ON public.card_ownership_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their own history" ON public.card_ownership_history;
CREATE POLICY "Users can view their own history"
  ON public.card_ownership_history FOR SELECT
  USING (user_id = auth.uid() OR previous_owner_id = auth.uid());

-- ============================================
-- 2. Create trigger functions for automatic logging
-- ============================================

-- Trigger 1: Log card claims
CREATE OR REPLACE FUNCTION public.log_card_claim()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.card_ownership_history (card_id, user_id, action, metadata)
  VALUES (NEW.card_id, NEW.user_id, 'claimed', jsonb_build_object(
    'claim_source', NEW.claim_source,
    'claimed_at', NEW.claimed_at
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_log_card_claim ON public.user_cards;
CREATE TRIGGER tr_log_card_claim
  AFTER INSERT ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_card_claim();

-- Trigger 2: Log card releases (before delete)
CREATE OR REPLACE FUNCTION public.log_card_release()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.card_ownership_history (card_id, user_id, action, previous_owner_id, metadata)
  VALUES (OLD.card_id, OLD.user_id, 'released', OLD.user_id, jsonb_build_object(
    'released_at', now(),
    'claim_source', OLD.claim_source
  ));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_log_card_release ON public.user_cards;
CREATE TRIGGER tr_log_card_release
  BEFORE DELETE ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_card_release();

-- Trigger 3: Log redemption status changes
CREATE OR REPLACE FUNCTION public.log_redemption_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.card_ownership_history (card_id, user_id, action, metadata)
    VALUES (NEW.card_id, NEW.user_id, 'redemption_submitted', jsonb_build_object(
      'redemption_id', NEW.id,
      'submitted_at', NEW.submitted_at
    ));
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.card_ownership_history (card_id, user_id, action, metadata)
    VALUES (NEW.card_id, NEW.user_id,
      CASE NEW.status
        WHEN 'credited' THEN 'redemption_credited'
        WHEN 'rejected' THEN 'redemption_rejected'
        WHEN 'pending' THEN 'redemption_pending'
      END,
      jsonb_build_object(
        'redemption_id', NEW.id,
        'status', NEW.status,
        'decided_at', NEW.decided_at,
        'credited_amount', NEW.credited_amount,
        'admin_notes', NEW.admin_notes
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_log_redemption_status ON public.card_redemptions;
CREATE TRIGGER tr_log_redemption_status
  AFTER INSERT OR UPDATE ON public.card_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.log_redemption_status();

-- ============================================
-- 3. Replace delete_user_card with release_card_to_wild
-- ============================================

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.delete_user_card(UUID);

-- Create new release_card_to_wild function
CREATE OR REPLACE FUNCTION public.release_card_to_wild(p_card_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_redemption_status TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user owns the card
  IF NOT EXISTS (SELECT 1 FROM public.user_cards WHERE card_id = p_card_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  -- Check redemption status - BLOCK if pending
  SELECT status INTO v_redemption_status
  FROM public.card_redemptions
  WHERE card_id = p_card_id AND user_id = v_user
  ORDER BY submitted_at DESC
  LIMIT 1;

  IF v_redemption_status = 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_redemption', 'message', 'Cannot release card with pending redemption. Please wait for admin review.');
  END IF;

  -- IMPORTANT: Do NOT delete card_redemptions records (preserve audit trail)
  -- Only remove ownership from user_cards
  DELETE FROM public.user_cards
  WHERE card_id = p_card_id AND user_id = v_user;

  -- Reset card claim status so it can be re-scanned
  UPDATE public.cards
  SET 
    is_claimed = false,
    claimed_by = NULL,
    claimed_at = NULL
  WHERE id = p_card_id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Card released successfully. It can now be scanned by anyone.',
    'had_redemption', v_redemption_status IS NOT NULL
  );
END;
$$;

-- ============================================
-- 4. Update submit_card_for_redemption to block double-submission
-- ============================================

CREATE OR REPLACE FUNCTION public.submit_card_for_redemption(p_card_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_existing_status TEXT;
  v_credited_by UUID;
  v_credited_at TIMESTAMPTZ;
  v_credited_email TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  -- Check if user owns the card
  IF NOT EXISTS (SELECT 1 FROM public.user_cards WHERE card_id = p_card_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owned');
  END IF;

  -- CRITICAL: Check if this card has EVER been credited (by ANY user)
  SELECT cr.user_id, cr.credited_at, u.email
  INTO v_credited_by, v_credited_at, v_credited_email
  FROM public.card_redemptions cr
  LEFT JOIN auth.users u ON u.id = cr.user_id
  WHERE cr.card_id = p_card_id AND cr.status = 'credited'
  ORDER BY cr.credited_at DESC
  LIMIT 1;

  IF v_credited_by IS NOT NULL THEN
    -- Card has already been credited - block submission
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'card_already_credited',
      'message', 'This card has already been credited for TIME rewards',
      'credited_by', v_credited_email,
      'credited_by_user_id', v_credited_by,
      'credited_at', v_credited_at,
      'is_you', v_credited_by = v_user
    );
  END IF;

  -- Check for existing redemption record by current user
  SELECT status INTO v_existing_status
  FROM public.card_redemptions 
  WHERE card_id = p_card_id AND user_id = v_user
  ORDER BY submitted_at DESC
  LIMIT 1;

  -- If already pending, don't allow resubmission
  IF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  -- If rejected, update to pending instead of creating new record
  IF v_existing_status = 'rejected' THEN
    UPDATE public.card_redemptions 
    SET 
      status = 'pending',
      submitted_at = now(),
      decided_at = NULL,
      decided_by = NULL,
      admin_notes = NULL,
      credited_at = NULL,
      credited_by = NULL,
      credited_amount = NULL,
      external_ref = NULL
    WHERE card_id = p_card_id AND user_id = v_user AND status = 'rejected';
  ELSE
    -- Create new redemption record
    INSERT INTO public.card_redemptions (user_id, card_id, status, submitted_at)
    VALUES (v_user, p_card_id, 'pending', now());
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================
-- 5. Create admin function to view card activity
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_card_activity_log(
  p_card_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  card_id UUID,
  card_code TEXT,
  card_name TEXT,
  user_id UUID,
  user_email TEXT,
  action TEXT,
  previous_owner_id UUID,
  previous_owner_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 6. Update admin_list_cards to include ownership data
-- ============================================

-- Drop existing function with all possible signatures
DROP FUNCTION IF EXISTS public.admin_list_cards(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_list_cards(text, integer, integer, boolean);

-- Recreate with new return columns
CREATE FUNCTION public.admin_list_cards(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0,
  p_include_deleted BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  era TEXT,
  suit TEXT,
  rank TEXT,
  rarity TEXT,
  trader_value TEXT,
  time_value NUMERIC,
  image_url TEXT,
  redirect TEXT,
  is_active BOOLEAN,
  status TEXT,
  created_at TIMESTAMPTZ,
  owner_user_id UUID,
  owner_email TEXT,
  is_in_pending_redemption BOOLEAN,
  is_credited BOOLEAN,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  total_redemption_attempts INT,
  has_multiple_submitters BOOLEAN
) AS $$
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
    SELECT uc.card_id, uc.user_id, u.email
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
      o.email AS owner_email,
      (cp.card_id IS NOT NULL) AS is_in_pending_redemption,
      (cc.card_id IS NOT NULL) AS is_credited,
      c.deleted_at,
      c.deleted_by,
      COALESCE(rs.attempt_count, 0) AS total_redemption_attempts,
      (rs.submitter_count > 1) AS has_multiple_submitters
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
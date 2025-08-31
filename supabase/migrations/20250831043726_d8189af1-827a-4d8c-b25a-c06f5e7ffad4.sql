-- Drop the old redemption system tables and functions
DROP FUNCTION IF EXISTS public.admin_pending_redemptions();
DROP FUNCTION IF EXISTS public.admin_finalize_redemption(uuid, uuid[], text, numeric);
DROP FUNCTION IF EXISTS public.admin_reject_redemption(uuid, text);
DROP FUNCTION IF EXISTS public.user_redemption_history();
DROP FUNCTION IF EXISTS public.resubmit_rejected_cards(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.admin_credit_selected_cards(uuid, uuid[], text, numeric);
DROP FUNCTION IF EXISTS public.admin_bulk_credit(uuid[], numeric, text);
DROP FUNCTION IF EXISTS public.admin_redemptions_pending();

-- Drop old tables
DROP TABLE IF EXISTS public.redemption_cards CASCADE;
DROP TABLE IF EXISTS public.redemptions CASCADE;

-- Create new individual card redemptions table
CREATE TABLE public.card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'credited')),
  admin_notes TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by UUID,
  credited_at TIMESTAMP WITH TIME ZONE,
  credited_by UUID,
  credited_amount NUMERIC,
  external_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, card_id, status) -- Prevent duplicate pending redemptions for same card
);

-- Enable RLS
ALTER TABLE public.card_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own redemptions"
ON public.card_redemptions FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can submit their own redemptions"
ON public.card_redemptions FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.card_id = card_redemptions.card_id AND uc.user_id = auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.blocked_users b WHERE b.user_id = auth.uid())
);

CREATE POLICY "Admins can view all redemptions"
ON public.card_redemptions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admins can update redemptions"
ON public.card_redemptions FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_card_redemptions_user_status ON public.card_redemptions(user_id, status);
CREATE INDEX idx_card_redemptions_status_submitted ON public.card_redemptions(status, submitted_at);
CREATE INDEX idx_card_redemptions_card_id ON public.card_redemptions(card_id);

-- Create updated_at trigger
CREATE TRIGGER update_card_redemptions_updated_at
  BEFORE UPDATE ON public.card_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to submit card for redemption
CREATE OR REPLACE FUNCTION public.submit_card_for_redemption(p_card_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
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

  -- Check if card is already pending or credited
  IF EXISTS (
    SELECT 1 FROM public.card_redemptions 
    WHERE card_id = p_card_id AND user_id = v_user AND status IN ('pending', 'credited')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  -- Submit card for redemption
  INSERT INTO public.card_redemptions (user_id, card_id)
  VALUES (v_user, p_card_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function to get user's card collection with redemption status
CREATE OR REPLACE FUNCTION public.user_card_collection()
RETURNS TABLE(
  card_id UUID,
  name TEXT,
  suit TEXT,
  rank TEXT,
  era TEXT,
  rarity TEXT,
  trader_value TEXT,
  time_value NUMERIC,
  image_url TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  redemption_status TEXT,
  redemption_id UUID,
  admin_notes TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  credited_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.id as card_id,
    c.name,
    c.suit,
    c.rank,
    c.era,
    c.rarity,
    c.trader_value,
    c.time_value,
    c.image_url,
    uc.claimed_at,
    COALESCE(cr.status, 'available') as redemption_status,
    cr.id as redemption_id,
    cr.admin_notes,
    cr.decided_at,
    cr.credited_amount
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN public.card_redemptions cr ON cr.card_id = uc.card_id AND cr.user_id = uc.user_id
    AND cr.status IN ('pending', 'rejected', 'approved', 'credited')
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.claimed_at DESC;
$$;

-- Function to get pending redemptions for admin
CREATE OR REPLACE FUNCTION public.admin_pending_card_redemptions()
RETURNS TABLE(
  redemption_id UUID,
  user_id UUID,
  user_email TEXT,
  card_id UUID,
  card_name TEXT,
  card_suit TEXT,
  card_rank TEXT,
  card_era TEXT,
  card_rarity TEXT,
  card_image_url TEXT,
  time_value NUMERIC,
  trader_value TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    cr.id as redemption_id,
    cr.user_id,
    u.email as user_email,
    c.id as card_id,
    c.name as card_name,
    c.suit as card_suit,
    c.rank as card_rank,
    c.era as card_era,
    c.rarity as card_rarity,
    c.image_url as card_image_url,
    c.time_value,
    c.trader_value,
    cr.submitted_at
  FROM public.card_redemptions cr
  JOIN public.cards c ON c.id = cr.card_id
  LEFT JOIN auth.users u ON u.id = cr.user_id
  WHERE cr.status = 'pending'
    AND EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  ORDER BY cr.submitted_at ASC;
$$;

-- Function to bulk approve/reject cards
CREATE OR REPLACE FUNCTION public.admin_bulk_decision_cards(
  p_redemption_ids UUID[],
  p_action TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_credited_amount NUMERIC DEFAULT NULL,
  p_external_ref TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_count INT := 0;
  v_total_amount NUMERIC := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = v_admin) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.card_redemptions
    SET 
      status = 'approved',
      admin_notes = p_admin_notes,
      decided_at = now(),
      decided_by = v_admin
    WHERE id = ANY(p_redemption_ids) AND status = 'pending';
    
  ELSIF p_action = 'reject' THEN
    UPDATE public.card_redemptions
    SET 
      status = 'rejected',
      admin_notes = p_admin_notes,
      decided_at = now(),
      decided_by = v_admin
    WHERE id = ANY(p_redemption_ids) AND status = 'pending';
    
  ELSIF p_action = 'credit' THEN
    -- Credit approved cards
    UPDATE public.card_redemptions cr
    SET 
      status = 'credited',
      credited_at = now(),
      credited_by = v_admin,
      credited_amount = COALESCE(p_credited_amount, (SELECT c.time_value FROM public.cards c WHERE c.id = cr.card_id)),
      external_ref = p_external_ref
    WHERE cr.id = ANY(p_redemption_ids) AND cr.status = 'approved';
    
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Calculate total credited amount if crediting
  IF p_action = 'credit' THEN
    SELECT COALESCE(SUM(credited_amount), 0) INTO v_total_amount
    FROM public.card_redemptions
    WHERE id = ANY(p_redemption_ids) AND status = 'credited';
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 
    'updated', v_count,
    'total_credited', v_total_amount
  );
END;
$$;

-- Function to resubmit rejected card
CREATE OR REPLACE FUNCTION public.resubmit_rejected_card(p_redemption_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_card_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
  END IF;

  -- Get card_id and verify ownership and rejection status
  SELECT card_id INTO v_card_id
  FROM public.card_redemptions
  WHERE id = p_redemption_id AND user_id = v_user AND status = 'rejected';

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_redemption');
  END IF;

  -- Create new redemption
  INSERT INTO public.card_redemptions (user_id, card_id)
  VALUES (v_user, v_card_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function to accept rejection (remove from user's view)
CREATE OR REPLACE FUNCTION public.accept_card_rejection(p_redemption_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;
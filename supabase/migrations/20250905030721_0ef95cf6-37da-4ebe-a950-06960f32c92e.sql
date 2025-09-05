-- Add claim_token system to cards table
ALTER TABLE public.cards 
ADD COLUMN claim_token TEXT,
ADD COLUMN is_claimed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN claimed_by UUID,
ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;

-- Create unique index on claim_token
CREATE UNIQUE INDEX idx_cards_claim_token ON public.cards(claim_token) WHERE claim_token IS NOT NULL;

-- Function to generate URL-safe random tokens
CREATE OR REPLACE FUNCTION public.generate_claim_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
  token_length INTEGER := 22;
BEGIN
  FOR i IN 1..token_length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.cards WHERE claim_token = result) LOOP
    result := '';
    FOR i IN 1..token_length LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Set default for claim_token column
ALTER TABLE public.cards 
ALTER COLUMN claim_token SET DEFAULT public.generate_claim_token();

-- Backfill existing cards with claim tokens
UPDATE public.cards 
SET claim_token = public.generate_claim_token() 
WHERE claim_token IS NULL;

-- Make claim_token NOT NULL after backfill
ALTER TABLE public.cards 
ALTER COLUMN claim_token SET NOT NULL;

-- Secure claim function
CREATE OR REPLACE FUNCTION public.claim_card_by_token(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  VALUES (v_user, v_card_id, 'token')
  ON CONFLICT (user_id, card_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'card_id', v_card_id);
END;
$$;
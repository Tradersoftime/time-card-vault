-- Part 1: Create helper function for random suffix generation
CREATE OR REPLACE FUNCTION public.generate_random_suffix(p_length INTEGER DEFAULT 6)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (0/O, 1/I/L)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..p_length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Part 2: Update generate_card_code to use random suffix
CREATE OR REPLACE FUNCTION public.generate_card_code(p_suit text, p_rank text, p_batch_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_suit_code TEXT;
  v_rank_code TEXT;
  v_code TEXT;
  v_suffix TEXT;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
BEGIN
  -- Generate 3-letter suit code
  v_suit_code := UPPER(LEFT(p_suit, 3));
  
  -- Generate rank code (handle special cases)
  v_rank_code := CASE 
    WHEN p_rank IN ('Ace', 'A') THEN 'ACE'
    WHEN p_rank IN ('King', 'K') THEN 'KING'
    WHEN p_rank IN ('Queen', 'Q') THEN 'QUEEN'
    WHEN p_rank IN ('Jack', 'J') THEN 'JACK'
    ELSE UPPER(LEFT(p_rank, 4))
  END;
  
  -- Generate code with random suffix, ensure uniqueness
  LOOP
    v_suffix := public.generate_random_suffix(6);
    v_code := v_suit_code || '-' || v_rank_code || '-' || v_suffix;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cards WHERE code = v_code);
    
    -- Safety check to prevent infinite loop
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
  
  RETURN v_code;
END;
$$;
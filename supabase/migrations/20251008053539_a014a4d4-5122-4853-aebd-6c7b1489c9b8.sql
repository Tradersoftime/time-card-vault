-- Create print_batches table for organizing cards into print runs
CREATE TABLE public.print_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  print_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS on print_batches
ALTER TABLE public.print_batches ENABLE ROW LEVEL SECURITY;

-- Only admins can view print batches
CREATE POLICY "Admins can view all print batches"
ON public.print_batches
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Only admins can manage print batches
CREATE POLICY "Admins can manage print batches"
ON public.print_batches
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Add print_batch_id to cards table
ALTER TABLE public.cards 
ADD COLUMN print_batch_id UUID REFERENCES public.print_batches(id) ON DELETE SET NULL,
ADD COLUMN batch_sort_order INTEGER;

-- Create index for better query performance
CREATE INDEX idx_cards_print_batch_id ON public.cards(print_batch_id);

-- Create function to generate unique card codes
CREATE OR REPLACE FUNCTION public.generate_card_code(
  p_suit TEXT,
  p_rank TEXT,
  p_batch_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suit_code TEXT;
  v_rank_code TEXT;
  v_sequence INT;
  v_code TEXT;
BEGIN
  -- Generate 3-letter suit code
  v_suit_code := UPPER(LEFT(p_suit, 3));
  
  -- Generate rank code (handle special cases)
  v_rank_code := CASE 
    WHEN p_rank = 'Ace' THEN 'ACE'
    WHEN p_rank = 'King' THEN 'KING'
    WHEN p_rank = 'Queen' THEN 'QUEEN'
    WHEN p_rank = 'Jack' THEN 'JACK'
    ELSE UPPER(LEFT(p_rank, 4))
  END;
  
  -- Find next available sequence number
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^[A-Z]+-[A-Z]+-[0-9]+$' 
      THEN CAST(split_part(code, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM public.cards
  WHERE (p_batch_id IS NULL OR print_batch_id = p_batch_id);
  
  -- Format: SUIT-RANK-SEQUENCE (e.g., SPA-ACE-001)
  v_code := v_suit_code || '-' || v_rank_code || '-' || LPAD(v_sequence::TEXT, 3, '0');
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.cards WHERE code = v_code) LOOP
    v_sequence := v_sequence + 1;
    v_code := v_suit_code || '-' || v_rank_code || '-' || LPAD(v_sequence::TEXT, 3, '0');
  END LOOP;
  
  RETURN v_code;
END;
$$;
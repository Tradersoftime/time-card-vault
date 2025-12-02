-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tickets
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
-- Allow admins to insert cards
CREATE POLICY "admins_can_insert_cards" ON public.cards
  FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Allow admins to update cards  
CREATE POLICY "admins_can_update_cards" ON public.cards
  FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Allow admins to delete cards
CREATE POLICY "admins_can_delete_cards" ON public.cards  
  FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
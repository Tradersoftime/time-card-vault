-- Add explicit DELETE policy to user_cards for documentation
-- This makes it clear that deletions must go through the delete_user_card() function

CREATE POLICY "Deletions must use delete_user_card function" 
ON public.user_cards
FOR DELETE
USING (false); -- Explicitly deny all direct deletes

COMMENT ON POLICY "Deletions must use delete_user_card function" ON public.user_cards IS 
'All card deletions must go through the delete_user_card() SECURITY DEFINER function to ensure proper ownership validation, cascading cleanup of redemptions, and proper card status reset.';
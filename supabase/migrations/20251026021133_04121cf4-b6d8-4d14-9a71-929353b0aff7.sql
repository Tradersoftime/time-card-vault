-- Fix PUBLIC_DATA_EXPOSURE: Remove public access to cards table
-- This prevents unauthorized access to sensitive data including claim_tokens

-- Drop the overly permissive policy that allows anyone to view all card data
DROP POLICY IF EXISTS "Cards are viewable by everyone" ON public.cards;

-- The existing policies already provide appropriate access:
-- 1. "cards_admin_select_all" - Admins can see all cards
-- 2. "cards_select_if_owned" - Users can see cards they own
-- 3. card_preview() function provides safe public preview without claim_token

-- No additional policies needed - the existing restrictive policies are correct
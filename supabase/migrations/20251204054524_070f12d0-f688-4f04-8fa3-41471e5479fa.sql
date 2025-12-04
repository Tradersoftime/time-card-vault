-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Anyone can view avatars (public)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Function to delete own account
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Delete user's cards ownership
  DELETE FROM public.user_cards WHERE user_id = v_user;
  -- Delete user's redemptions  
  DELETE FROM public.card_redemptions WHERE user_id = v_user;
  -- Delete user's scan events
  DELETE FROM public.scan_events WHERE user_id = v_user;
  -- Delete user's support tickets
  DELETE FROM public.support_tickets WHERE user_id = v_user;
  -- Delete ownership history
  DELETE FROM public.card_ownership_history WHERE user_id = v_user;
  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = v_user;
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = v_user;
  
  RETURN jsonb_build_object('ok', true);
END;
$$;
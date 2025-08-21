-- Add foreign key relationship between redemptions and profiles
ALTER TABLE public.redemptions 
ADD CONSTRAINT fk_redemptions_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;
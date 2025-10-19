-- Add tot.tcg@gmail.com as admin
INSERT INTO public.admins (user_id)
VALUES ('8f4ccdf6-c05c-4765-8fd2-a1c168e8d07c')
ON CONFLICT (user_id) DO NOTHING;
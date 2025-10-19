-- NUCLEAR OPTION: Complete data wipe for fresh start
-- This will delete ALL data including the current admin account

-- Step 1: Delete all redemption data
DELETE FROM public.card_redemptions;

-- Step 2: Delete all user card ownership
DELETE FROM public.user_cards;

-- Step 3: Delete all scan events
DELETE FROM public.scan_events;

-- Step 4: Delete all image codes
DELETE FROM public.image_codes;

-- Step 5: Delete all cards (including soft-deleted ones)
DELETE FROM public.cards;

-- Step 6: Delete all print batches
DELETE FROM public.print_batches;

-- Step 7: Delete all profiles
DELETE FROM public.profiles;

-- Step 8: Delete all admins (will be recreated after new signup)
DELETE FROM public.admins;

-- Step 9: Delete all blocked users
DELETE FROM public.blocked_users;

-- Step 10: Delete all webhook events
DELETE FROM public.webhook_events;

-- Step 11: Delete ALL users from auth.users (including admin)
-- This uses auth schema which requires special handling
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
END $$;
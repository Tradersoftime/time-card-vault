-- Drop the old constraint
ALTER TABLE public.card_ownership_history 
DROP CONSTRAINT IF EXISTS card_ownership_history_action_check;

-- Add new constraint with admin actions included
ALTER TABLE public.card_ownership_history 
ADD CONSTRAINT card_ownership_history_action_check 
CHECK (action IN (
  'claimed', 
  'released', 
  'redemption_submitted', 
  'redemption_pending', 
  'redemption_credited', 
  'redemption_rejected',
  'admin_released',
  'admin_assigned'
));
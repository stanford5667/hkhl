-- Add purchase_date column to synced_positions
ALTER TABLE public.synced_positions 
ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;

-- Add comment
COMMENT ON COLUMN public.synced_positions.purchase_date IS 'Date the position was purchased';
-- Add payment-related columns to orders table
-- Safe to run multiple times thanks to IF NOT EXISTS checks

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_provider text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_token text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_status text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS iyzico_payment_id text;

-- Add postal_code column if it doesn't exist (used in iyzico integration)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS postal_code text;

-- Update status enum to include 'pending_payment' and 'paid' and 'payment_failed' if needed
-- Note: This assumes status is a text column. If it's an enum, you'll need to alter the enum type.
-- For text columns, this is safe to run multiple times.







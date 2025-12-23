-- Add shipping-related columns to orders table
-- Safe to run multiple times thanks to IF NOT EXISTS checks

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_carrier text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_tracking_number text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_payment_type text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_label_url text;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_status text;


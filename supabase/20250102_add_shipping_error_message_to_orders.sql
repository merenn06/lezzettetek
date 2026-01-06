-- Add shipping_error_message column to orders table
-- Safe to run multiple times thanks to IF NOT EXISTS check

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_error_message text;







-- Fix incorrect LT... cargoKey values in shipping_tracking_number
-- Moves LT... values to shipping_reference_number and clears tracking_number
-- Safe to run multiple times (idempotent)

UPDATE public.orders
SET
  shipping_reference_number = COALESCE(shipping_reference_number, shipping_tracking_number),
  shipping_tracking_number = NULL,
  shipping_status = 'created_pending_barcode'
WHERE shipping_tracking_number LIKE 'LT%';



-- Backfill: Set payment_status='awaiting_payment' for COD orders where payment_status IS NULL
-- COD orders: payment_method in ('kapida', 'cod')
UPDATE orders
SET payment_status = 'awaiting_payment'
WHERE payment_method IN ('kapida', 'cod')
  AND payment_status IS NULL;





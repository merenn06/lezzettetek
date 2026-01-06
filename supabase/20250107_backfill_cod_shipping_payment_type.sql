-- Backfill shipping_payment_type for COD orders
-- Kontrat gereği tüm COD siparişler "card" (kredi kartı) olarak ayarlanmalı
-- Nakit seçeneği kaldırıldı

UPDATE orders
SET shipping_payment_type = 'card'
WHERE payment_method IN ('kapida', 'cod')
  AND (shipping_payment_type IS NULL OR shipping_payment_type != 'card');



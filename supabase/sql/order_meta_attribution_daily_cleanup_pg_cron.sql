-- Günlük attribution PII / reklam tanımlayıcı temizliği (pg_cron).
-- Uygulama bu job'ı çalıştırmaz; Supabase Dashboard veya SQL ile cron tanımlanır.
--
-- Örnek zamanlama (her gün 03:15 UTC):
--   SELECT cron.schedule(
--     'order_meta_attribution_daily_cleanup',
--     '15 3 * * *',
--     $$ ... aşağıdaki UPDATE ... $$
--   );
--
-- Korunan alanlar: order_id, consent_granted, purchase_capi_sent_at,
-- captured_at, expires_at. Aktif claim (purchase_capi_claimed_until > now()) korunur.

UPDATE public.order_meta_attribution
SET
  meta_fbp = NULL,
  meta_fbc = NULL,
  meta_event_source_url = NULL,
  meta_client_ip = NULL,
  meta_client_user_agent = NULL,
  purchase_capi_claimed_until = CASE
    WHEN purchase_capi_claimed_until IS NOT NULL
      AND purchase_capi_claimed_until > now()
    THEN purchase_capi_claimed_until
    ELSE NULL
  END,
  updated_at = now()
WHERE expires_at IS NOT NULL
  AND expires_at < now()
  AND (
    meta_fbp IS NOT NULL
    OR meta_fbc IS NOT NULL
    OR meta_event_source_url IS NOT NULL
    OR meta_client_ip IS NOT NULL
    OR meta_client_user_agent IS NOT NULL
    OR (
      purchase_capi_claimed_until IS NOT NULL
      AND purchase_capi_claimed_until <= now()
    )
  );
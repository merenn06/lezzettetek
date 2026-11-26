-- Meta Purchase CAPI attribution snapshot (service role only).
-- Idempotent: safe to re-run on fresh DB; constraint blocks use DO on existing DB.

CREATE TABLE IF NOT EXISTS public.order_meta_attribution (
  order_id uuid PRIMARY KEY REFERENCES public.orders (id) ON DELETE CASCADE,
  consent_granted boolean NOT NULL DEFAULT false,
  meta_fbp text,
  meta_fbc text,
  meta_event_source_url text,
  meta_client_ip text,
  meta_client_user_agent text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  purchase_capi_sent_at timestamptz,
  purchase_capi_claimed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.order_meta_attribution IS
  'Meta reklam eşleştirme snapshot; yalnızca service role (Next.js API).';

ALTER TABLE public.order_meta_attribution
  ADD COLUMN IF NOT EXISTS purchase_capi_claimed_until timestamptz;

DO $$
BEGIN
  ALTER TABLE public.order_meta_attribution
    ADD CONSTRAINT order_meta_attribution_meta_fbc_length
      CHECK (meta_fbc IS NULL OR char_length(meta_fbc) <= 256);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.order_meta_attribution
    ADD CONSTRAINT order_meta_attribution_meta_fbp_length
      CHECK (meta_fbp IS NULL OR char_length(meta_fbp) <= 256);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.order_meta_attribution
    ADD CONSTRAINT order_meta_attribution_event_source_url_length
      CHECK (meta_event_source_url IS NULL OR char_length(meta_event_source_url) <= 2048);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS order_meta_attribution_expires_at_idx
  ON public.order_meta_attribution (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_meta_attribution_purchase_sent_idx
  ON public.order_meta_attribution (purchase_capi_sent_at)
  WHERE purchase_capi_sent_at IS NOT NULL;

ALTER TABLE public.order_meta_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_meta_attribution_deny_anon ON public.order_meta_attribution;
CREATE POLICY order_meta_attribution_deny_anon
  ON public.order_meta_attribution
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS order_meta_attribution_deny_authenticated ON public.order_meta_attribution;
CREATE POLICY order_meta_attribution_deny_authenticated
  ON public.order_meta_attribution
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Direct table access: service_role only (RLS still enabled; service role bypasses RLS).
REVOKE ALL ON TABLE public.order_meta_attribution FROM PUBLIC;
REVOKE ALL ON TABLE public.order_meta_attribution FROM anon;
REVOKE ALL ON TABLE public.order_meta_attribution FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_meta_attribution TO service_role;

CREATE OR REPLACE FUNCTION public.try_claim_order_purchase_capi(
  p_order_id uuid,
  p_claim_until timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.order_meta_attribution WHERE order_id = p_order_id
  ) THEN
    RETURN 'no_row';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.order_meta_attribution
    WHERE order_id = p_order_id AND purchase_capi_sent_at IS NOT NULL
  ) THEN
    RETURN 'already_sent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.order_meta_attribution
    WHERE order_id = p_order_id AND consent_granted IS NOT TRUE
  ) THEN
    RETURN 'consent_denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.order_meta_attribution
    WHERE order_id = p_order_id
      AND expires_at IS NOT NULL
      AND expires_at <= now()
  ) THEN
    RETURN 'expired';
  END IF;

  UPDATE public.order_meta_attribution
  SET
    purchase_capi_claimed_until = p_claim_until,
    updated_at = now()
  WHERE order_id = p_order_id
    AND purchase_capi_sent_at IS NULL
    AND consent_granted IS TRUE
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      purchase_capi_claimed_until IS NULL
      OR purchase_capi_claimed_until < now()
    );

  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  RETURN 'locked';
END;
$$;

REVOKE ALL ON FUNCTION public.try_claim_order_purchase_capi(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_claim_order_purchase_capi(uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.try_claim_order_purchase_capi(uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.try_claim_order_purchase_capi(uuid, timestamptz) TO service_role;

-- Günlük PII temizliği: supabase/sql/order_meta_attribution_daily_cleanup_pg_cron.sql
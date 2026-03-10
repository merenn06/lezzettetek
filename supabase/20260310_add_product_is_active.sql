-- Soft delete / archive support for products
-- 1) Add is_active flag with default TRUE
-- 2) Backfill existing rows as active

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT TRUE;

UPDATE public.products
SET is_active = TRUE
WHERE is_active IS NULL;


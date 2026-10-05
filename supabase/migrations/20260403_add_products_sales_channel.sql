-- Perakende vs 995 TL kampanya SKU ayrımı
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sales_channel text NOT NULL DEFAULT 'retail';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sales_channel_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_sales_channel_check
  CHECK (sales_channel IN ('retail', 'campaign_995'));

COMMENT ON COLUMN public.products.sales_channel IS
  'retail: vitrin/perakende; campaign_995: 995 TL kampanya paketi (vitrinde listelenmez).';

UPDATE public.products
SET sales_channel = 'retail'
WHERE sales_channel IS NULL OR sales_channel = '';

CREATE INDEX IF NOT EXISTS idx_products_sales_channel_active
  ON public.products (sales_channel, is_active);

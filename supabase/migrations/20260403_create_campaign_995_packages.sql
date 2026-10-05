CREATE TABLE IF NOT EXISTS public.campaign_995_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  pack_quantity integer NOT NULL CHECK (pack_quantity > 0),
  quantity_label text NOT NULL,
  price numeric(10, 2) NOT NULL DEFAULT 995 CHECK (price >= 0),
  image_url text,
  description text,
  section text NOT NULL CHECK (
    section IN ('reklam', 'tursu', 'klasik', 'ozel')
  ),
  card_style text NOT NULL DEFAULT 'standard' CHECK (
    card_style IN ('standard', 'full_art')
  ),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_995_packages_list
  ON public.campaign_995_packages (is_active, section, sort_order);

COMMENT ON TABLE public.campaign_995_packages IS
  '995 TL kampanya landing paketleri; checkout SKU products.product_id üzerinden.';

COMMENT ON COLUMN public.campaign_995_packages.pack_quantity IS
  'Paket içi ürün/kavanoz adedi (sepet quantity değil).';

COMMENT ON COLUMN public.campaign_995_packages.quantity_label IS
  'Kart/rozet metni; pack_quantity ile aynı olmayabilir.';

ALTER TABLE public.campaign_995_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_995_packages_public_read" ON public.campaign_995_packages;

CREATE POLICY "campaign_995_packages_public_read"
  ON public.campaign_995_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

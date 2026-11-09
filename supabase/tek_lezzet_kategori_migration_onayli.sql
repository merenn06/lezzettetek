-- Tek Lezzet onaylı kategori migrationı (ÇALIŞTIRMADAN ÖNCE YEDEK / ONAY)
-- Repo şeması: products.sales_channel, products.is_active, products.sort_order mevcut.
-- Çakışma: daha önce eklenmiş `retail_category` kolonu varsa kaldırılır (bu repoda prod'da yok).
-- NOT: SQL otomatik çalıştırılmaz; Supabase SQL Editor'da sizin onayınızla uygulanır.

BEGIN;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id uuid;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_id_fkey;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);

-- Önceki deneme kolonu (uygulanmışsa temizler)
ALTER TABLE public.products DROP COLUMN IF EXISTS retail_category;

INSERT INTO public.categories (slug, name, sort_order)
VALUES
  ('taze-enginar', 'Taze Enginar', 10),
  ('kavanoz-enginar', 'Kavanoz Enginar', 20),
  ('ac-bitir-mezelikler', 'Aç Bitir Mezelikler', 30),
  ('tursular', 'Turşular', 40),
  ('egenin-zengin-mutfagi', 'Egenin Zengin Mutfağı', 50),
  ('soslar-salcalar', 'Soslar & Salçalar', 60)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

WITH product_mapping (slug, category_slug) AS (
  VALUES

  ('4-adet-5li-enginar', 'kavanoz-enginar'),
  ('4-adet-buyuk-enginar', 'kavanoz-enginar'),
  ('4-adet-dogranmis-domates-ve-biber', 'soslar-salcalar'),
  ('4-adet-dogranmis-enginar', 'kavanoz-enginar'),
  ('4-adet-domates-sos', 'soslar-salcalar'),
  ('4-adet-garnitur', 'egenin-zengin-mutfagi'),
  ('4-adet-kereviz', 'egenin-zengin-mutfagi'),
  ('4-adet-kol-kucuk-enginar', 'kavanoz-enginar'),
  ('4-adet-kucuk-baklali-enginar', 'kavanoz-enginar'),
  ('4-adet-sapli-buyuk-kalp', 'kavanoz-enginar'),
  ('4-adet-sarimsak', 'ac-bitir-mezelikler'),
  ('4-borulce', 'egenin-zengin-mutfagi'),
  ('4-sevketibostan', 'egenin-zengin-mutfagi'),
  ('4_adet_bamya', 'egenin-zengin-mutfagi'),
  ('4_adet_bezelye', 'egenin-zengin-mutfagi'),
  ('4_adet_buyuk_sapsiz_kalp', 'kavanoz-enginar'),
  ('4adet_sapsiz_kucuk_kalp', 'kavanoz-enginar'),
  ('4lu-enginar-4-adet', 'kavanoz-enginar'),
  ('bamya-2li', 'egenin-zengin-mutfagi'),
  ('besli-enginar-2li', 'kavanoz-enginar'),
  ('bezelye-2li', 'egenin-zengin-mutfagi'),
  ('bezelyeli-enginar-sos', 'ac-bitir-mezelikler'),
  ('borulce-2li', 'egenin-zengin-mutfagi'),
  ('buyuk-enginar-2li', 'kavanoz-enginar'),
  ('buyuk-enginar-kalbi-2li', 'kavanoz-enginar'),
  ('byk-sapsz-enginar-kalbi', 'kavanoz-enginar'),
  ('dogranmis_enginar', 'kavanoz-enginar'),
  ('dolmalik-enginar', 'taze-enginar'),
  ('domates-sosu-2li', 'soslar-salcalar'),
  ('dortlu-sofralik-2li', 'kavanoz-enginar'),
  ('garnitur-2li', 'egenin-zengin-mutfagi'),
  ('isli-enginar-kalbi', 'ac-bitir-mezelikler'),
  ('ithal-enginar-10-adet', 'taze-enginar'),
  ('ithal-enginar-100-adet', 'taze-enginar'),
  ('ithal-enginar-20-adet', 'taze-enginar'),
  ('ithal-enginar-30-adet', 'taze-enginar'),
  ('ithal-enginar-40-adet', 'taze-enginar'),
  ('ithal-enginar-50-adet', 'taze-enginar'),
  ('kalp-salata', 'ac-bitir-mezelikler'),
  ('kampanya-enginar-100', 'taze-enginar'),
  ('kampanya-enginar-30', 'taze-enginar'),
  ('kampanya-enginar-50', 'taze-enginar'),
  ('kapyali-marine-enginar', 'ac-bitir-mezelikler'),
  ('kereviz-2li', 'egenin-zengin-mutfagi'),
  ('korili-marine-enginar', 'ac-bitir-mezelikler'),
  ('kucuk-enginar-2li', 'kavanoz-enginar'),
  ('kucuk-enginar-kalbi-2li', 'kavanoz-enginar'),
  ('menemen-sosu-2li', 'soslar-salcalar'),
  ('salata-2li', 'ac-bitir-mezelikler'),
  ('sapli-enginar-kalbi-2li', 'kavanoz-enginar'),
  ('sarımsak-2li', 'ac-bitir-mezelikler'),
  ('sevketibostan-2li', 'egenin-zengin-mutfagi'),
  ('soslu-enginar', 'ac-bitir-mezelikler'),
  ('soslu-enginarkalbi', 'ac-bitir-mezelikler'),
  ('soyulmamis-enginar', 'taze-enginar'),
  ('tek-lezzet-ithal-enginar-10-adet-7-9', 'taze-enginar'),
  ('tek-lezzet-ithal-enginar-100-adet-7-9', 'taze-enginar'),
  ('tek-lezzet-ithal-enginar-20-adet-7-9', 'taze-enginar'),
  ('tek-lezzet-ithal-enginar-30-adet-7-9', 'taze-enginar'),
  ('tek-lezzet-ithal-enginar-40-adet-7-9', 'taze-enginar'),
  ('tek-lezzet-ithal-enginar-50-adet-7-9', 'taze-enginar'),
  ('tek-lezzet-soslu-kalp', 'ac-bitir-mezelikler'),
  ('tek-lezzet-turpotu', 'egenin-zengin-mutfagi'),
  ('tekli-enginar-salatasi', 'ac-bitir-mezelikler'),
  ('urun-10-ithal-enginar', 'taze-enginar'),
  ('urun-100-taze-enginar', 'taze-enginar'),
  ('urun-20-taze-enginar', 'taze-enginar'),
  ('urun-3-adet-baklali-enginar', 'kavanoz-enginar'),
  ('urun-3-adet-bamya-tursusu', 'tursular'),
  ('urun-3-adet-erik-tursusu', 'tursular'),
  ('urun-3-adet-karisik-tursu', 'tursular'),
  ('urun-3-adet-kornison-tursusu', 'tursular'),
  ('urun-3-adet-pancar-tursusu', 'tursular'),
  ('urun-30-taze-enginar', 'taze-enginar'),
  ('urun-4-adet-aci-biber-tursusu', 'tursular'),
  ('urun-4-adet-domates-salcasi', 'soslar-salcalar'),
  ('urun-4-adet-jalapeno-biber-tursusu', 'tursular'),
  ('urun-4-adet-kucuk-baklali-enginar', 'kavanoz-enginar'),
  ('urun-4-adet-misir', 'egenin-zengin-mutfagi'),
  ('urun-4-adet-sarimsak-tursusu', 'tursular'),
  ('urun-50-taze-enginar', 'taze-enginar'),
  ('urun-bakla', 'egenin-zengin-mutfagi'),
  ('urun-baklalıenginar', 'kavanoz-enginar'),
  ('urun-bebek-enginar', 'taze-enginar'),
  ('urun-besli-domates-salcasi', 'soslar-salcalar'),
  ('urun-besli-enginar', 'kavanoz-enginar'),
  ('urun-bezelye', 'egenin-zengin-mutfagi'),
  ('urun-borulce', 'egenin-zengin-mutfagi'),
  ('urun-buyuk-boy-baklali-enginar', 'kavanoz-enginar'),
  ('urun-buyuk-sapli-kalp', 'kavanoz-enginar'),
  ('urun-cibes', 'egenin-zengin-mutfagi'),
  ('urun-dogranmis-kapyali-enginar', 'ac-bitir-mezelikler'),
  ('urun-domates-biber-sos', 'soslar-salcalar'),
  ('urun-domates-sos', 'soslar-salcalar'),
  ('urun-enginarsalatasi', 'ac-bitir-mezelikler'),
  ('urun-garnitur', 'egenin-zengin-mutfagi'),
  ('urun-ithal-enginar', 'kavanoz-enginar'),
  ('urun-kahvaltilik-kurudomates', 'soslar-salcalar'),
  ('urun-kereviz', 'egenin-zengin-mutfagi'),
  ('urun-kucuk-enginar-ithal', 'kavanoz-enginar'),
  ('urun-kurutulmus-domates-sosu', 'soslar-salcalar'),
  ('urun-onlu-enginar', 'taze-enginar'),
  ('urun-sapsiz-kalp', 'kavanoz-enginar'),
  ('urun-sarimsak', 'ac-bitir-mezelikler'),
  ('urun-sevketibostan', 'egenin-zengin-mutfagi'),
  ('urun-tek-enginar', 'kavanoz-enginar'),
  ('urun-tekli-misir', 'egenin-zengin-mutfagi'),
  ('urun-tekli-sarimsak-tursusu', 'tursular'),
  ('urun-teklibakla', 'egenin-zengin-mutfagi'),
  ('urun-tombul-bamya', 'egenin-zengin-mutfagi'),
  ('urun-turbo-enginar-salatasi', 'ac-bitir-mezelikler'),
  ('urun-turbo-yagli-kalp', 'ac-bitir-mezelikler'),
  ('urun-turpotu', 'egenin-zengin-mutfagi'),
  ('urun-vakumlu-enginar', 'taze-enginar'),
  ('urun-vakumlu-enginar-kalbi', 'taze-enginar'),
  ('urun-zeytinyagli-pismis-enginar', 'ac-bitir-mezelikler'),
  ('urun-zeytinyagli-pismis-enginar-dogranmis', 'ac-bitir-mezelikler'),
  ('yemeklik-enginar-2li', 'kavanoz-enginar'),
  ('yerli-enginar-20-adet-1345', 'taze-enginar'),
  ('yerli-salamura-enginar-200-adet', 'taze-enginar')
)
)
UPDATE public.products p
SET category_id = c.id,
    updated_at = now()
FROM product_mapping m
JOIN public.categories c ON c.slug = m.category_slug
WHERE p.slug = m.slug
  AND p.sales_channel = 'retail'
  AND p.category_id IS DISTINCT FROM c.id;

UPDATE public.products
SET category_id = NULL,
    updated_at = now()
WHERE sales_channel = 'campaign_995'
   OR slug IN ('tek-lezzet-enginar-damitma-suyu', 'urun-enginar-damitma-suyu-1lt');

DO $$
DECLARE missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM public.products
  WHERE sales_channel = 'retail'
    AND slug NOT IN ('tek-lezzet-enginar-damitma-suyu', 'urun-enginar-damitma-suyu-1lt')
    AND category_id IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Kategorisiz retail urun var: %', missing_count;
  END IF;
END $$;

COMMIT;

-- KONTROL (ayrı çalıştırılabilir)
-- SELECT c.name, p.is_active, count(*) AS product_count
-- FROM public.products p
-- JOIN public.categories c ON c.id = p.category_id
-- GROUP BY c.name, c.sort_order, p.is_active
-- ORDER BY c.sort_order, p.is_active DESC;
--
-- SELECT name, slug, is_active, sales_channel
-- FROM public.products
-- WHERE category_id IS NULL
-- ORDER BY sales_channel, name;


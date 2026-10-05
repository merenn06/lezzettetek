-- 995 TL kampanya: 14 products SKU + 14 campaign_995_packages
-- Önkoşul: 20260403_add_products_sales_channel.sql ve 20260403_create_campaign_995_packages.sql uygulanmış olmalı.
-- Manuel çalıştırın (service role veya SQL editor). Remote'a sizin onayınız olmadan uygulamayın.
--
-- stock: Perakende sepet/checkout'ta stok kontrolü yok; Google feed campaign SKU'ları içermez.
-- Kampanya SKU'ları için stock = 100 (yapay 9999 değil, admin/operasyonel görünüm için pozitif değer).

BEGIN;

INSERT INTO public.products (
  name,
  slug,
  price,
  stock,
  description,
  image_url,
  is_active,
  sales_channel,
  sort_order,
  created_at,
  updated_at
)
VALUES
  ('20 Adet Enginar – 995 TL', '995-enginar-20', 995, 100, '995 TL kampanya paketi', '/995/20 Adet Enginar Dev Kampanyası.webp', true, 'campaign_995', 10, now(), now()),
  ('4 Adet Domates Sosu – 995 TL', '995-domates-sosu-4', 995, 100, '995 TL kampanya paketi', '/995/domates-sosu-4-adet-995.webp', true, 'campaign_995', 20, now(), now()),
  ('5 Adet Domates Salçası – 995 TL', '995-domates-salcasi-5', 995, 100, '995 TL kampanya paketi', '/995/Köy Tipi Domates Salçası Kampanyası.webp', true, 'campaign_995', 30, now(), now()),
  ('4 Adet Bamya – 995 TL', '995-bamya-4', 995, 100, '995 TL kampanya paketi', '/995/bamya-4-adet-995.webp', true, 'campaign_995', 40, now(), now()),
  ('4 Adet Sarımsak Turşusu – 995 TL', '995-sarimsak-tursusu-4', 995, 100, '995 TL kampanya paketi', '/995/Sarımsak Turşusu Dev Kampanya Posteriyesi.webp', true, 'campaign_995', 50, now(), now()),
  ('3 Adet Bamya Turşusu – 995 TL', '995-bamya-tursusu-3', 995, 100, '995 TL kampanya paketi', '/995/Bamya Turşusu Dev Kampanya.webp', true, 'campaign_995', 60, now(), now()),
  ('6 Adet Kornişon Turşusu – 995 TL', '995-kornison-6', 995, 100, '995 TL kampanya paketi', '/995/kornison-6-adet-995.webp', true, 'campaign_995', 70, now(), now()),
  ('5 Adet Garnitür – 995 TL', '995-garnitur-5', 995, 100, '995 TL kampanya paketi', '/995/5 Kavanoz Garnitür Kampanyası.webp', true, 'campaign_995', 80, now(), now()),
  ('5 Adet Bezelye – 995 TL', '995-bezelye-5', 995, 100, '995 TL kampanya paketi', '/995/Bezelye Şöleni_ Dev Kampanya.webp', true, 'campaign_995', 90, now(), now()),
  ('5 Adet Mısır – 995 TL', '995-misir-5', 995, 100, '995 TL kampanya paketi', '/995/misir-5-adet-995.webp', true, 'campaign_995', 100, now(), now()),
  ('4 Adet Menemen – 995 TL', '995-menemen-4', 995, 100, '995 TL kampanya paketi', '/995/menemen-4-adet-995.webp', true, 'campaign_995', 110, now(), now()),
  ('24 Adet Enginarın Doğranmışı – 995 TL', '995-dogranmis-enginar-4', 995, 100, '995 TL kampanya paketi', '/995/24-Kavanoz-Enginar-Kampanyası.webp', true, 'campaign_995', 130, now(), now()),
  ('3 Adet Kereviz – 995 TL', '995-kereviz-3', 995, 100, '995 TL kampanya paketi', '/995/3 Adet Kereviz Dev Kampanya.png', true, 'campaign_995', 150, now(), now()),
  ('4 Adet Enginar Damıtma Suyu – 995 TL', '995-enginar-damitma-4', 995, 100, '995 TL kampanya paketi', NULL, true, 'campaign_995', 160, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active,
  sales_channel = EXCLUDED.sales_channel,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.campaign_995_packages (
  slug,
  name,
  pack_quantity,
  quantity_label,
  price,
  image_url,
  description,
  section,
  card_style,
  product_id,
  is_active,
  sort_order
)
SELECT v.slug, v.name, v.pack_quantity, v.quantity_label, v.price, v.image_url, v.description, v.section, v.card_style, p.id, true, v.sort_order
FROM (VALUES
  ('995-enginar-20', 'Enginar', 20, '20 Adet', 995::numeric, '/995/20 Adet Enginar Dev Kampanyası.webp', NULL::text, 'reklam', 'full_art', 10),
  ('995-domates-sosu-4', 'Domates Sosu', 4, '4 Adet', 995, '/995/domates-sosu-4-adet-995.webp', NULL, 'reklam', 'standard', 20),
  ('995-domates-salcasi-5', 'Domates Salçası', 5, '5 Adet', 995, '/995/Köy Tipi Domates Salçası Kampanyası.webp', NULL, 'reklam', 'standard', 30),
  ('995-bamya-4', 'Bamya', 4, '4 Adet', 995, '/995/bamya-4-adet-995.webp', NULL, 'reklam', 'standard', 40),
  ('995-sarimsak-tursusu-4', 'Sarımsak Turşusu', 4, '4 Adet', 995, '/995/Sarımsak Turşusu Dev Kampanya Posteriyesi.webp', NULL, 'tursu', 'standard', 50),
  ('995-bamya-tursusu-3', 'Bamya Turşusu', 3, '3 Adet', 995, '/995/Bamya Turşusu Dev Kampanya.webp', NULL, 'tursu', 'standard', 60),
  ('995-kornison-6', 'Kornişon Turşusu', 6, '6 Adet', 995, '/995/kornison-6-adet-995.webp', NULL, 'tursu', 'standard', 70),
  ('995-garnitur-5', 'Garnitür', 5, '5 Adet', 995, '/995/5 Kavanoz Garnitür Kampanyası.webp', NULL, 'klasik', 'standard', 80),
  ('995-bezelye-5', 'Bezelye', 5, '5 Adet', 995, '/995/Bezelye Şöleni_ Dev Kampanya.webp', NULL, 'klasik', 'standard', 90),
  ('995-misir-5', 'Mısır', 5, '5 Adet', 995, '/995/misir-5-adet-995.webp', NULL, 'klasik', 'standard', 100),
  ('995-menemen-4', 'Menemen', 4, '4 Adet', 995, '/995/menemen-4-adet-995.webp', NULL, 'klasik', 'standard', 110),
  ('995-dogranmis-enginar-4', 'Doğranmış Enginar', 4, '24 Adet Enginarın Doğranmışı', 995, '/995/24-Kavanoz-Enginar-Kampanyası.webp', NULL, 'ozel', 'standard', 130),
  ('995-kereviz-3', 'Kereviz', 3, '3 Adet', 995, '/995/3 Adet Kereviz Dev Kampanya.png', NULL, 'ozel', 'standard', 150),
  ('995-enginar-damitma-4', 'Enginar Damıtma Suyu', 4, '4 Adet', 995, NULL, NULL, 'ozel', 'standard', 160)
) AS v(slug, name, pack_quantity, quantity_label, price, image_url, description, section, card_style, sort_order)
JOIN public.products p ON p.slug = v.slug
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  pack_quantity = EXCLUDED.pack_quantity,
  quantity_label = EXCLUDED.quantity_label,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  section = EXCLUDED.section,
  card_style = EXCLUDED.card_style,
  product_id = EXCLUDED.product_id,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

COMMIT;

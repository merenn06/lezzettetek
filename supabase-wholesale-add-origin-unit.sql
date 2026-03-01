-- wholesale_products tablosuna menşei ve birim fiyat alanlarını ekler.
-- Supabase SQL Editor'da veya migration ile çalıştırın.

ALTER TABLE wholesale_products
  ADD COLUMN IF NOT EXISTS origin TEXT;

ALTER TABLE wholesale_products
  ADD COLUMN IF NOT EXISTS unit_price_text TEXT;

-- Örnek güncelleme (isteğe bağlı):
-- UPDATE wholesale_products SET origin = 'İzmir Urla', unit_price_text = '79,50 ₺/adet' WHERE slug = 'ornek-urun';

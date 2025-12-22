-- Recipes table schema
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text,
  content text,
  image_url text,
  difficulty text,
  total_minutes int,
  created_at timestamptz default now()
);

-- Basic seed data for recipes
insert into public.recipes (title, slug, summary, difficulty, total_minutes)
values
  ('Zeytinyağlı Garnitürlü Enginar Kalbi', 'zeytinyagli-garniturlu-enginar-kalbi', 'Zeytinyağlı garnitür eşliğinde hafif ve dengeli bir enginar kalbi tarifi.', 'orta', 40),
  ('Domates Çorbası', 'domates-corbasi', 'Klasik, sıcak ve dengeli kıvama sahip bir domates çorbası.', 'kolay', 25),
  ('Menemen', 'menemen', 'Kahvaltı sofralarının vazgeçilmezi, pratik ve lezzetli menemen tarifi.', 'kolay', 20),
  ('Bolonez Soslu Makarna', 'bolonez-soslu-makarna', 'Yoğun domates ve et aromalı, klasik bolonez soslu makarna.', 'orta', 45),
  ('Zeytinyağlı Kereviz', 'zeytinyagli-kereviz', 'Narenciye dokunuşuyla ferahlayan zeytinyağlı kereviz yemeği.', 'orta', 35),
  ('Zeytinyağlı Garnitürlü Enginar', 'zeytinyagli-garniturlu-enginar', 'Sebze garnitürüyle zenginleşen geleneksel zeytinyağlı enginar.', 'orta', 40),
  ('Etli Bezelye Yemeği', 'etli-bezelye-yemegi', 'Bezelye ve etin uyumunu taşıyan, doyurucu bir ana yemek.', 'orta', 50),
  ('Sarımsaklı Balık', 'sarimsakli-balik', 'Sarımsak ve zeytinyağının lezzet kattığı, fırında hafif balık tarifi.', 'zor', 45)
on conflict (slug) do nothing;


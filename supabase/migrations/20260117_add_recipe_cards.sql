insert into public.recipes (title, slug, summary, difficulty, total_minutes)
values
  ('Zeytinyağlı Garnitürlü Enginar', 'zeytinyagli-garniturlu-enginar', 'Sebze garnitürüyle zenginleşen geleneksel zeytinyağlı enginar.', 'orta', 40),
  ('Zeytinyağlı Garnitürlü Enginar Kalbi', 'zeytinyagli-garniturlu-enginar-kalbi', 'Zeytinyağlı garnitür eşliğinde hafif ve dengeli bir enginar kalbi tarifi.', 'orta', 40),
  ('Etli Bezelye Yemeği', 'etli-bezelye-yemegi', 'Bezelye ve etin uyumunu taşıyan, doyurucu bir ana yemek.', 'orta', 50)
on conflict (slug) do update
set
  title = excluded.title,
  summary = excluded.summary,
  difficulty = excluded.difficulty,
  total_minutes = excluded.total_minutes;

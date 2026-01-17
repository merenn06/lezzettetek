update public.recipes
set created_at = now()
where slug in (
  'zeytinyagli-garniturlu-enginar',
  'zeytinyagli-garniturlu-enginar-kalbi',
  'etli-bezelye-yemegi'
);

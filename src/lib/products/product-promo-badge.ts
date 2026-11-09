import type { Product } from '@/types/product';

export type ProductPromoBadge = {
  label: '4 AL 3 ÖDE' | 'Kampanyalı';
};

/** Onaylı kampanya SKU — kategori tahmini değil, sabit slug eşlemesi. */
const BUY4_GET3_PRODUCT_SLUGS = new Set(['urun-turbo-enginar-salatasi']);

export function isBuy4Get3Product(product: Pick<Product, 'slug'>): boolean {
  const slug = product.slug?.trim();
  return Boolean(slug && BUY4_GET3_PRODUCT_SLUGS.has(slug));
}

export function getProductPromoBadge(
  product: Pick<Product, 'name' | 'slug' | 'price' | 'compare_at_price'>
): ProductPromoBadge | null {
  if (isBuy4Get3Product(product)) {
    return { label: '4 AL 3 ÖDE' };
  }

  const hasPrice = typeof product.price === 'number';
  const compareAt =
    typeof product.compare_at_price === 'number' ? product.compare_at_price : null;
  const hasDiscount = hasPrice && compareAt != null && compareAt > product.price;

  if (hasDiscount) {
    return { label: 'Kampanyalı' };
  }

  return null;
}

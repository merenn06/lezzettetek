import type { Product } from '@/types/product';

export const RETAIL_SALES_CHANNEL = 'retail' as const;

/** Kullanıcıya açık perakende vitrininde gösterilebilir ürün mü? */
export function isRetailStoreProduct(product: Pick<Product, 'sales_channel' | 'slug'>): boolean {
  if (product.sales_channel === 'campaign_995') return false;
  const slug = product.slug?.trim() ?? '';
  if (slug.startsWith('995-')) return false;
  return true;
}

export function filterRetailStoreProducts<T extends Pick<Product, 'sales_channel' | 'slug'>>(
  products: T[]
): T[] {
  return products.filter(isRetailStoreProduct);
}

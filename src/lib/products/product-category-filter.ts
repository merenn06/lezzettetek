import type { Product } from '@/types/product';

export type CategoryFilterId = 'all' | string;

export function parseCategoryFilterParam(value: string | null | undefined): CategoryFilterId {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'all') return 'all';
  return trimmed;
}

export function productMatchesCategoryFilter(
  product: Pick<Product, 'category'>,
  filter: CategoryFilterId
): boolean {
  if (filter === 'all') return true;
  return product.category?.slug === filter;
}

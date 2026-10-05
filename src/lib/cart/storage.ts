import type { Product } from '@/types/product';

export const CART_STORAGE_KEY = 'tek-lezzet-cart-v1';

export type StoredCartItem = {
  product: Product;
  quantity: number;
  imageUrl?: string | null;
};

function isValidProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const p = value as Product;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.slug === 'string' &&
    p.slug.length > 0 &&
    typeof p.name === 'string' &&
    typeof p.price === 'number' &&
    !Number.isNaN(p.price) &&
    typeof p.stock === 'number' &&
    typeof p.description === 'string' &&
    typeof p.image_url === 'string'
  );
}

function isValidCartItem(value: unknown): value is StoredCartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as StoredCartItem;
  if (!isValidProduct(item.product)) return false;
  if (typeof item.quantity !== 'number' || item.quantity <= 0) return false;
  if (
    item.imageUrl !== undefined &&
    item.imageUrl !== null &&
    typeof item.imageUrl !== 'string'
  ) {
    return false;
  }
  return true;
}

export function loadCartFromStorage(): StoredCartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidCartItem);
  } catch {
    return [];
  }
}

export function saveCartToStorage(items: StoredCartItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    if (items.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota / private mode — sepet bellekte çalışmaya devam eder
  }
}

/**
 * Shipping fee calculation constants and functions
 */
export const BASE_SHIPPING_FEE = 150.0;
export const FREE_SHIPPING_THRESHOLD = 750.0;

/**
 * Calculate shipping fee based on subtotal
 * @param subtotal - Cart subtotal amount
 * @returns Shipping fee (0 if free shipping threshold is met)
 */
export function calculateShipping(subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  return BASE_SHIPPING_FEE;
}

/**
 * Calculate remaining amount for free shipping
 * @param subtotal - Cart subtotal amount
 * @returns Remaining amount needed for free shipping, or 0 if already eligible
 */
export function remainingForFreeShipping(subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  return FREE_SHIPPING_THRESHOLD - subtotal;
}



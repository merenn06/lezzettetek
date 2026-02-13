export const COUPON_CODE = 'TEKLEZZET5';
export const COUPON_DISCOUNT_PERCENT = 5;
export const COUPON_DISCOUNT_RATE = COUPON_DISCOUNT_PERCENT / 100;

export function normalizeCoupon(code?: string | null): string {
  return (code || '').trim().toUpperCase();
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCouponDiscount(baseAmount: number, couponCode?: string | null) {
  const normalized = normalizeCoupon(couponCode);
  const isValid = normalized === COUPON_CODE;
  const discountPercent = isValid ? COUPON_DISCOUNT_PERCENT : 0;
  const discountAmount = isValid ? roundCurrency(baseAmount * COUPON_DISCOUNT_RATE) : 0;
  const totalAfterDiscount = roundCurrency(baseAmount - discountAmount);

  return {
    isValid,
    normalizedCoupon: isValid ? normalized : null,
    discountPercent,
    discountAmount,
    totalBeforeDiscount: roundCurrency(baseAmount),
    totalAfterDiscount,
  };
}

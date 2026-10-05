'use client';

import Link from 'next/link';

export type CheckoutOrderSummaryProps = {
  formatPrice: (price: number) => string;
  subtotal: number;
  shipping: number;
  isCodPayment: boolean;
  codFee: number;
  total: number;
  discountAmount: number;
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  onApplyCoupon: () => void;
  appliedCoupon: string | null;
  couponError: string | null;
  onClearCouponError: () => void;
  couponDiscountPercent: number;
  couponCodeLabel: string;
  isSubmitting: boolean;
  onSubmitClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  couponInputId: string;
  stickyOnDesktop?: boolean;
};

export default function CheckoutOrderSummary({
  formatPrice,
  subtotal,
  shipping,
  isCodPayment,
  codFee,
  total,
  discountAmount,
  couponInput,
  onCouponInputChange,
  onApplyCoupon,
  appliedCoupon,
  couponError,
  onClearCouponError,
  couponDiscountPercent,
  couponCodeLabel,
  isSubmitting,
  onSubmitClick,
  couponInputId,
  stickyOnDesktop = false,
}: CheckoutOrderSummaryProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-md p-6 ${
        stickyOnDesktop ? 'lg:sticky lg:top-8' : ''
      }`}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Özeti</h2>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-700">
          <span>Ara Toplam:</span>
          <span className="font-semibold">{formatPrice(subtotal)} ₺</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Kargo:</span>
          <span className="font-semibold">
            {shipping > 0 ? `${formatPrice(shipping)} ₺` : 'Ücretsiz'}
          </span>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor={couponInputId}>
            Kupon Kodu
          </label>
          <div className="flex gap-2">
            <input
              id={couponInputId}
              type="text"
              value={couponInput}
              onChange={(e) => {
                onCouponInputChange(e.target.value);
                if (couponError) {
                  onClearCouponError();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Kupon kodu"
            />
            <button
              type="button"
              onClick={onApplyCoupon}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Uygula
            </button>
          </div>
          {appliedCoupon && (
            <p className="text-sm text-green-700">
              Kupon uygulandı: {couponCodeLabel} (%{couponDiscountPercent})
            </p>
          )}
          {couponError && <p className="text-sm text-red-600">{couponError}</p>}
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>İndirim:</span>
            <span className="font-semibold">- {formatPrice(discountAmount)} ₺</span>
          </div>
        )}
        {isCodPayment && (
          <div className="flex justify-between text-gray-700">
            <span>Kapıda Ödeme Bedeli:</span>
            <span className="font-semibold">{formatPrice(codFee)} ₺</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-4 flex justify-between">
          <span className="text-lg font-bold text-gray-900">Toplam:</span>
          <span className="text-2xl font-bold text-green-700">{formatPrice(total)} ₺</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          form="checkout-form"
          onClick={onSubmitClick}
          disabled={isSubmitting}
          className="w-full py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Gönderiliyor...' : 'Siparişi Tamamla'}
        </button>
        <Link
          href="/cart"
          className="block w-full py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
        >
          Sepete Geri Dön
        </Link>
      </div>
    </div>
  );
}

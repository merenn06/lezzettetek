import type { GtagFn } from "@/lib/analytics/gtag";

export type Ga4PurchaseLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type Ga4PurchasePayload = {
  transaction_id: string;
  value: number;
  currency: "TRY";
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>;
};

export function buildGa4PurchasePayload(
  orderId: string,
  totalPrice: number,
  lineItems: Ga4PurchaseLineItem[]
): Ga4PurchasePayload | null {
  const transaction_id = orderId.trim();
  if (!transaction_id || totalPrice <= 0) return null;

  const items = lineItems
    .filter((item) => item.productId && item.quantity > 0)
    .map((item) => ({
      item_id: item.productId,
      item_name: item.productName || item.productId,
      price: Number(item.unitPrice) || 0,
      quantity: Number(item.quantity) || 0,
    }));

  if (items.length === 0) return null;

  return {
    transaction_id,
    value: totalPrice,
    currency: "TRY",
    items,
  };
}

/** GA4 önerilen purchase event'i (Measurement ID layout'ta zaten config edilmiş). */
export function sendGa4PurchaseEvent(
  gtag: GtagFn,
  payload: Ga4PurchasePayload
): void {
  gtag("event", "purchase", payload);
}

/**
 * Opsiyonel Google Ads dönüşümü — yalnızca env doluysa.
 * AW-XXXX / label, Ads arayüzündeki "Etiket kurulumu"ndan alınır (7436987405 gibi
 * iç conversion action ID'leri burada kullanılmaz).
 */
export function sendGoogleAdsPurchaseConversion(
  gtag: GtagFn,
  sendTo: string,
  payload: Pick<Ga4PurchasePayload, "transaction_id" | "value" | "currency">
): void {
  gtag("event", "conversion", {
    send_to: sendTo,
    value: payload.value,
    currency: payload.currency,
    transaction_id: payload.transaction_id,
  });
}

export function resolveGoogleAdsPurchaseSendTo(): string | null {
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL?.trim();
  if (!adsId || !label) return null;
  if (!adsId.startsWith("AW-")) return null;
  return `${adsId}/${label}`;
}

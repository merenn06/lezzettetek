/** Siparişin tarayıcıda purchase conversion göndermeye uygun olup olmadığını belirler. */

export type OrderPurchaseEligibilityInput = {
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
};

export function parseOrderTotalPrice(
  value: number | string | null | undefined
): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function shouldSendBrowserPurchaseEvent(
  order: OrderPurchaseEligibilityInput | null | undefined
): boolean {
  if (!order) return false;

  const status = order.status ?? "";
  if (status === "iptal" || status === "payment_failed") {
    return false;
  }

  const paymentMethod = order.payment_method ?? "";

  if (paymentMethod === "iyzico") {
    return order.payment_status === "paid";
  }

  if (paymentMethod === "kapida" || paymentMethod === "cod") {
    return true;
  }

  if (paymentMethod === "havale") {
    return order.payment_status === "paid";
  }

  return false;
}

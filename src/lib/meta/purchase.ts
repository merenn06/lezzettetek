import { META_EVENT_NAMES } from "./constants";
import { buildPurchaseEventId } from "./eventId";
import type { MetaCapiCustomData } from "./capi";

export type MetaPurchaseOrderInput = {
  id: string;
  total_price?: number | string | null;
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  customer_email?: string | null;
  city?: string | null;
  district?: string | null;
};

export type MetaPurchaseItemInput = {
  product_id: string;
  quantity: number;
  unit_price?: number | null;
};

export type MetaPurchaseEventData = {
  eventId: string;
  value: number;
  currency: "TRY";
  content_ids: string[];
  content_type: "product";
  num_items: number;
  contents: Array<{ id: string; quantity: number; item_price: number }>;
  order_id: string;
};

export type SendMetaPurchaseCapiOptions = {
  eventSourceUrl?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
};

function parseTotalPrice(value: number | string | null | undefined): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Builds shared Purchase payload fields for Pixel and CAPI. */
export function buildPurchaseEventData(
  order: MetaPurchaseOrderInput,
  items: MetaPurchaseItemInput[]
): MetaPurchaseEventData | null {
  const orderId = order.id?.trim();
  if (!orderId) return null;

  const validItems = items.filter(
    (item) => item.product_id && Number(item.quantity) > 0
  );
  if (validItems.length === 0) return null;

  const content_ids = validItems.map((item) => String(item.product_id));
  const num_items = validItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  if (num_items <= 0) return null;

  const contents = validItems.map((item) => ({
    id: String(item.product_id),
    quantity: Number(item.quantity),
    item_price: Number(item.unit_price ?? 0),
  }));

  const value = parseTotalPrice(order.total_price);
  if (value <= 0) return null;

  return {
    eventId: buildPurchaseEventId(orderId),
    value,
    currency: "TRY",
    content_ids,
    content_type: "product",
    num_items,
    contents,
    order_id: orderId,
  };
}

/** Sends Purchase to Meta CAPI. Never throws; logs errors instead. */
export async function sendMetaPurchaseCapi(
  order: MetaPurchaseOrderInput,
  items: MetaPurchaseItemInput[],
  options: SendMetaPurchaseCapiOptions = {}
): Promise<void> {
  try {
    const eventData = buildPurchaseEventData(order, items);
    if (!eventData) {
      console.warn("[meta-purchase] Skipping CAPI Purchase: invalid order/items payload", {
        orderId: order.id,
      });
      return;
    }

    const { sendMetaCapiEvent, splitCustomerName } = await import("./capi");
    const { firstName, lastName } = splitCustomerName(order.customer_name);

    const customData: MetaCapiCustomData = {
      value: eventData.value,
      currency: eventData.currency,
      content_ids: eventData.content_ids,
      content_type: eventData.content_type,
      contents: eventData.contents,
      num_items: eventData.num_items,
      order_id: eventData.order_id,
    };

    const result = await sendMetaCapiEvent({
      eventName: META_EVENT_NAMES.PURCHASE,
      eventId: eventData.eventId,
      eventSourceUrl: options.eventSourceUrl,
      userData: {
        email: order.email || order.customer_email || null,
        phone: order.phone || null,
        firstName,
        lastName,
        city: order.city || null,
        state: order.district || null,
        country: "tr",
        clientIpAddress: options.clientIpAddress || null,
        clientUserAgent: options.clientUserAgent || null,
        externalId: order.id,
      },
      customData,
    });

    if (!result.ok && !result.skipped) {
      console.error("[meta-purchase] CAPI Purchase failed:", {
        orderId: order.id,
        error: result.error,
        response: result.response,
      });
      return;
    }

    if (result.skipped) {
      console.log("[meta-purchase] CAPI Purchase skipped:", result.reason);
    }
  } catch (error) {
    console.error("[meta-purchase] Unexpected CAPI Purchase error:", {
      orderId: order.id,
      error,
    });
  }
}

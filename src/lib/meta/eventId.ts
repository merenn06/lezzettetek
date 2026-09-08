import { META_EVENT_NAMES, type MetaEventName } from "./constants";

export type MetaEventIdPrefix =
  | "pageview"
  | "viewcontent"
  | "addtocart"
  | "initiatecheckout"
  | "purchase";

const EVENT_PREFIX_MAP: Record<MetaEventName, MetaEventIdPrefix> = {
  [META_EVENT_NAMES.PAGE_VIEW]: "pageview",
  [META_EVENT_NAMES.VIEW_CONTENT]: "viewcontent",
  [META_EVENT_NAMES.ADD_TO_CART]: "addtocart",
  [META_EVENT_NAMES.INITIATE_CHECKOUT]: "initiatecheckout",
  [META_EVENT_NAMES.PURCHASE]: "purchase",
};

/** Builds a deterministic event_id for deduplication between Pixel and CAPI. */
export function buildMetaEventId(
  eventName: MetaEventName,
  uniqueKey: string
): string {
  const prefix = EVENT_PREFIX_MAP[eventName];
  const normalizedKey = uniqueKey.trim().toLowerCase().replace(/\s+/g, "_");
  return `${prefix}_${normalizedKey}`;
}

/** Purchase events should always use orderId for stable deduplication. */
export function buildPurchaseEventId(orderId: string): string {
  return buildMetaEventId(META_EVENT_NAMES.PURCHASE, orderId);
}

/** PageView dedup is optional; bucket by minute to avoid spam on rapid navigations. */
export function buildPageViewEventId(pathname: string, timestampMs = Date.now()): string {
  const minuteBucket = Math.floor(timestampMs / 60_000);
  return buildMetaEventId(META_EVENT_NAMES.PAGE_VIEW, `${pathname}_${minuteBucket}`);
}

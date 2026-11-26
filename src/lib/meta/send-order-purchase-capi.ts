import { sendMetaPurchaseCapi, type MetaPurchaseItemInput, type MetaPurchaseOrderInput } from "./purchase";
import type { OrderAttributionSnapshot } from "./order-attribution";
import { buildThankYouEventSourceUrl, sanitizeEventSourceUrl } from "./event-source-url";
import { shouldSendServerPurchaseCapi } from "./should-send-purchase-capi";
import {
  loadOrderAttribution,
  markPurchaseCapiSentSuccess,
  releasePurchaseCapiClaim,
  storedToCapiSnapshot,
  tryClaimPurchaseCapiSend,
} from "./order-attribution-db";

export type SendOrderPurchaseCapiParams = {
  order: MetaPurchaseOrderInput;
  items: MetaPurchaseItemInput[];
  /** Fallback when DB row missing (kapıda; kayıt başarısız). */
  snapshot: OrderAttributionSnapshot | null | undefined;
  /** iyzico callback: atomik claim zorunlu */
  requireDbClaim?: boolean;
};

function resolveEventSourceUrl(
  snapshot: OrderAttributionSnapshot,
  orderId: string
): string | undefined {
  const fromSnapshot = sanitizeEventSourceUrl(snapshot.eventSourceUrl, "/checkout");
  if (fromSnapshot) return fromSnapshot;
  return buildThankYouEventSourceUrl(orderId);
}

/**
 * Sends Purchase CAPI from DB snapshot (preferred) or fallback snapshot. Never throws.
 */
export async function sendOrderPurchaseCapi(
  params: SendOrderPurchaseCapiParams
): Promise<void> {
  const { order, items, snapshot: fallbackSnapshot, requireDbClaim = false } = params;
  const orderId = order.id;
  if (!orderId) return;

  let ownedClaimUntil: string | undefined;

  try {
    const stored = await loadOrderAttribution(orderId);
    const storedSnapshot = storedToCapiSnapshot(stored);
    const effectiveSnapshot = storedSnapshot ?? fallbackSnapshot ?? null;

    if (!shouldSendServerPurchaseCapi(effectiveSnapshot, { expiresAt: stored?.expiresAt })) {
      return;
    }

    const { state: claim, claimUntil } = await tryClaimPurchaseCapiSend(orderId);

    if (claim === "already_sent") {
      return;
    }

    if (claim === "locked" || claim === "consent_denied" || claim === "expired") {
      return;
    }

    if (claim === "no_row" && requireDbClaim) {
      return;
    }

    if (claim === "error" && requireDbClaim) {
      return;
    }

    if (claim === "no_row" && !requireDbClaim && !effectiveSnapshot) {
      return;
    }

    if (claim === "claimed") {
      ownedClaimUntil = claimUntil;
    }

    const sent = await sendMetaPurchaseCapi(order, items, {
      eventSourceUrl: resolveEventSourceUrl(effectiveSnapshot!, orderId),
      clientIpAddress: effectiveSnapshot!.clientIp,
      clientUserAgent: effectiveSnapshot!.clientUserAgent,
      fbc: effectiveSnapshot!.fbc,
      fbp: effectiveSnapshot!.fbp,
    });

    if (sent) {
      await markPurchaseCapiSentSuccess(orderId, ownedClaimUntil);
    } else if (claim === "claimed") {
      await releasePurchaseCapiClaim(orderId, claimUntil);
    }
  } catch {
    console.warn("[meta-purchase] sendOrderPurchaseCapi failed", { orderId });
    try {
      await releasePurchaseCapiClaim(orderId, ownedClaimUntil);
    } catch {
      // ignore
    }
  }
}
import type { OrderAttributionSnapshot } from "./order-attribution";
import { attributionSnapshotUsableForCapi } from "./attribution-expiry";

export type ShouldSendPurchaseCapiOptions = {
  expiresAt?: string | null;
};

/** Server Purchase CAPI only when marketing consent was granted and data not expired. */
export function shouldSendServerPurchaseCapi(
  snapshot: OrderAttributionSnapshot | null | undefined,
  options: ShouldSendPurchaseCapiOptions = {}
): boolean {
  return attributionSnapshotUsableForCapi(snapshot, options.expiresAt);
}
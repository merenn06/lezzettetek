/** Purchase CAPI gönderim kilidi TTL (ms). */
export const PURCHASE_CAPI_CLAIM_TTL_MS = 5 * 60 * 1000;

export const SAVE_ORDER_ATTRIBUTION_TIMEOUT_MS = 3_000;

export type PurchaseCapiClaimState =
  | "already_sent"
  | "claimed"
  | "locked"
  | "no_row"
  | "consent_denied"
  | "expired"
  | "error";

export type PurchaseCapiClaimResult = {
  state: PurchaseCapiClaimState;
  /** Set when state is "claimed"; used to release only this worker's lock. */
  claimUntil?: string;
};

export function isClaimLockExpired(
  claimedUntil: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!claimedUntil) return true;
  const ts = Date.parse(claimedUntil);
  if (Number.isNaN(ts)) return true;
  return ts < nowMs;
}

export function buildClaimExpiresAt(nowMs = Date.now()): string {
  return new Date(nowMs + PURCHASE_CAPI_CLAIM_TTL_MS).toISOString();
}
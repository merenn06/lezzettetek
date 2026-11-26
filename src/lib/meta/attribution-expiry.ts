import type { OrderAttributionSnapshot } from "./order-attribution";

export function isAttributionExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return false;
  return ts < Date.now();
}

/** Süresi dolmuş PII/tanımlayıcıları kullanım için eler; gönderime uygun değil. */
export function attributionSnapshotUsableForCapi(
  snapshot: OrderAttributionSnapshot | null | undefined,
  expiresAt?: string | null
): snapshot is OrderAttributionSnapshot {
  if (!snapshot?.consentGranted) return false;
  if (isAttributionExpired(expiresAt)) return false;
  return true;
}
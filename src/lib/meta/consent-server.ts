import { META_CONSENT_STORAGE_KEY } from "./consent";
import { parseCookieHeader } from "./server-cookies";

export type ServerMarketingConsent = "granted" | "denied" | "unknown";

/**
 * Server-side marketing consent. Does not trust client JSON body alone.
 * Only HTTP cookie value "granted" counts; denied and missing cookie are not granted.
 */
export function getServerMarketingConsent(request: Request): ServerMarketingConsent {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const raw = cookies[META_CONSENT_STORAGE_KEY]?.trim().toLowerCase();

  if (raw === "granted") return "granted";
  if (raw === "denied") return "denied";
  return "unknown";
}

export function isServerMarketingConsentGranted(request: Request): boolean {
  return getServerMarketingConsent(request) === "granted";
}
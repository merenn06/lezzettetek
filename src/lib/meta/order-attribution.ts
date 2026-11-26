import { isServerMarketingConsentGranted } from "./consent-server";
import { sanitizeEventSourceUrl } from "./event-source-url";
import { isValidFbcValue } from "./fbclid";
import { getMetaCookiesFromRequest } from "./server-cookies";

export type OrderAttributionSnapshot = {
  consentGranted: boolean;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  clientIp?: string;
  clientUserAgent?: string;
};

const ATTRIBUTION_RETENTION_DAYS = 90;

export function getAttributionRetentionExpiresAt(): string {
  return new Date(
    Date.now() + ATTRIBUTION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined
  );
}

function normalizeMetaCookieId(value: string | undefined, maxLen: number): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > maxLen) return trimmed.slice(0, maxLen);
  return trimmed;
}

export type CaptureAttributionInput = {
  request: Request;
  clientEventSourceUrl?: string | null;
};

/**
 * Builds attribution snapshot from request. Never throws.
 * Without consent: no fbc/fbp stored (consentGranted false).
 */
export function captureOrderAttributionFromRequest(
  input: CaptureAttributionInput
): OrderAttributionSnapshot {
  const consentGranted = isServerMarketingConsentGranted(input.request);

  if (!consentGranted) {
    return { consentGranted: false };
  }

  const { fbp: rawFbp, fbc: rawFbc } = getMetaCookiesFromRequest(input.request);
  const fbp = normalizeMetaCookieId(rawFbp, 256);
  const fbc =
    rawFbc && isValidFbcValue(rawFbc)
      ? normalizeMetaCookieId(rawFbc, 256)
      : undefined;

  const eventSourceUrl = sanitizeEventSourceUrl(
    input.clientEventSourceUrl ?? undefined,
    "/checkout"
  );

  return {
    consentGranted: true,
    fbp,
    fbc,
    eventSourceUrl,
    clientIp: getClientIp(input.request),
    clientUserAgent:
      normalizeMetaCookieId(requestUserAgent(input.request), 512) ?? undefined,
  };
}

function requestUserAgent(request: Request): string | undefined {
  const ua = request.headers.get("user-agent");
  return ua?.trim() || undefined;
}
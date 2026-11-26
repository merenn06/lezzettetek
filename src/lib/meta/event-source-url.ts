const SENSITIVE_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "email",
  "phone",
  "tel",
  "token",
  "turnstile_token",
]);

const ALLOWED_PATH_PREFIXES = ["/checkout", "/tesekkurler", "/cart", "/995-kampanyasi", "/urunlerimiz"];

/**
 * Sanitizes a customer page URL for Meta event_source_url (no sensitive query params).
 */
export function sanitizeEventSourceUrl(
  raw: string | null | undefined,
  fallbackPath?: string
): string | undefined {
  if (!raw?.trim()) {
    return fallbackPath ? buildSafeFallbackUrl(fallbackPath) : undefined;
  }

  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallbackPath ? buildSafeFallbackUrl(fallbackPath) : undefined;
    }

    for (const key of [...parsed.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (SENSITIVE_QUERY_KEYS.has(lower) || lower.startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }

    if (parsed.hash) {
      parsed.hash = "";
    }

    let result = parsed.toString();
    if (result.length > 2048) {
      result = `${parsed.origin}${parsed.pathname}`;
    }
    return result;
  } catch {
    return fallbackPath ? buildSafeFallbackUrl(fallbackPath) : undefined;
  }
}

function buildSafeFallbackUrl(path: string): string | undefined {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!site) return undefined;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  try {
    return new URL(normalizedPath, site).toString();
  } catch {
    return undefined;
  }
}

export function buildThankYouEventSourceUrl(orderId: string): string | undefined {
  const base = buildSafeFallbackUrl(`/tesekkurler?orderId=${encodeURIComponent(orderId)}`);
  if (base) return sanitizeEventSourceUrl(base);
  return undefined;
}

export function isAllowedCheckoutEventSource(pathname: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
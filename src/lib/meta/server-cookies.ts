/** Server-only cookie helpers for Meta CAPI. */

export function parseCookieHeader(
  cookieHeader: string | null | undefined
): Record<string, string> {
  if (!cookieHeader?.trim()) {
    return {};
  }

  const cookies: Record<string, string> = {};

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key) continue;

    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }

  return cookies;
}

export function getMetaCookiesFromRequest(request: Request): {
  fbp?: string;
  fbc?: string;
} {
  const cookies = parseCookieHeader(request.headers.get("cookie"));

  const fbp = cookies._fbp?.trim();
  const fbc = cookies._fbc?.trim();

  return {
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };
}

/** Meta Click ID / fbc helpers — client-safe pure logic (no window). */

const FBCLID_PATTERN = /^[A-Za-z0-9_-]{1,500}$/;

const FBC_PATTERN = /^fb\.1\.(\d+)\.(.+)$/;

export function isValidFbclid(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return FBCLID_PATTERN.test(trimmed);
}

/** Meta format: fb.1.{creationTimeMs}.{fbclid} */
export function buildFbcFromFbclid(fbclid: string, creationTimeMs = Date.now()): string | null {
  if (!isValidFbclid(fbclid)) return null;
  return `fb.1.${creationTimeMs}.${fbclid.trim()}`;
}

export function isValidFbcValue(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length > 256) return false;
  const match = FBC_PATTERN.exec(trimmed);
  if (!match) return false;
  const fbclidPart = match[2];
  return isValidFbclid(fbclidPart);
}

/** Returns fbclid embedded in a valid _fbc cookie value, if any. */
export function extractFbclidFromFbc(fbc: string | null | undefined): string | null {
  if (!isValidFbcValue(fbc)) return null;
  const match = FBC_PATTERN.exec(fbc!.trim());
  return match ? match[2] : null;
}

/**
 * Whether a new _fbc should replace an existing cookie when landing with fbclid.
 * Skip if existing fbc already matches this fbclid (avoid unnecessary rewrite).
 */
export function shouldSetFbcCookie(
  existingFbc: string | null | undefined,
  fbclid: string | null | undefined
): boolean {
  if (!isValidFbclid(fbclid)) return false;
  if (!existingFbc || !isValidFbcValue(existingFbc)) return true;
  const existingClickId = extractFbclidFromFbc(existingFbc);
  return existingClickId !== fbclid!.trim();
}
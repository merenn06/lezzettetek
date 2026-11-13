/**
 * Meta Pixel & Conversions API shared constants.
 * Enginar Bahçesi veri seti — tarayıcı ve CAPI aynı Pixel ID kullanır (env).
 * Safe to import from both client and server code.
 */

export const META_EVENT_NAMES = {
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",
  ADD_TO_CART: "AddToCart",
  INITIATE_CHECKOUT: "InitiateCheckout",
  PURCHASE: "Purchase",
} as const;

export type MetaEventName = (typeof META_EVENT_NAMES)[keyof typeof META_EVENT_NAMES];

export const META_DEFAULT_API_VERSION = "v21.0";
export const META_GRAPH_API_BASE = "https://graph.facebook.com";

/** Eski Lezzette Tek pixel — env'de kalırsa olaylar bilinçli olarak devre dışı bırakılır. */
export const DEPRECATED_LEZZETTEK_META_PIXEL_IDS = new Set([
  "1584232206584357",
]);

/** Enginar Bahçesi (yeni veri seti) — yalnızca dokümantasyon / .env.example referansı. */
export const ENGINAR_BAHCE_META_PIXEL_ID = "934965809358416";

let deprecatedPixelWarned = false;

function warnDeprecatedPixelId(source: string, id: string): void {
  if (typeof window !== "undefined") return;
  if (deprecatedPixelWarned) return;
  deprecatedPixelWarned = true;
  console.warn(
    `[meta] ${source} contains deprecated Lezzette Tek pixel (${id}). ` +
      `Use Enginar Bahçesi pixel ${ENGINAR_BAHCE_META_PIXEL_ID} in env instead.`
  );
}

function resolvePixelId(
  primary: string | undefined,
  fallback?: string | undefined,
  sourceLabel = "Pixel ID env"
): string | null {
  const candidates = [primary?.trim(), fallback?.trim()].filter(Boolean) as string[];

  let sawDeprecated = false;
  for (const id of candidates) {
    if (DEPRECATED_LEZZETTEK_META_PIXEL_IDS.has(id)) {
      sawDeprecated = true;
      warnDeprecatedPixelId(sourceLabel, id);
      continue;
    }
    return id;
  }

  if (sawDeprecated && !candidates.length) {
    return null;
  }
  return null;
}

/** Returns true when Meta Pixel should run in the browser. */
export function isMetaPixelEnabled(): boolean {
  if (process.env.META_PIXEL_ENABLED === "false") return false;
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED !== "true"
  ) {
    return false;
  }
  return Boolean(getPublicPixelId());
}

/** Returns true when server-side CAPI calls should be sent (token zorunlu). */
export function isMetaCapiEnabled(): boolean {
  if (process.env.META_CAPI_ENABLED === "false") return false;
  if (process.env.NODE_ENV === "development" && process.env.META_CAPI_ENABLED !== "true") {
    return false;
  }
  return Boolean(
    getServerPixelId() && process.env.META_CAPI_ACCESS_TOKEN?.trim()
  );
}

/** Tarayıcı — yalnızca NEXT_PUBLIC_META_PIXEL_ID */
export function getPublicPixelId(): string | null {
  return resolvePixelId(
    process.env.NEXT_PUBLIC_META_PIXEL_ID,
    undefined,
    "NEXT_PUBLIC_META_PIXEL_ID"
  );
}

/**
 * CAPI — META_PIXEL_ID, yoksa NEXT_PUBLIC_META_PIXEL_ID (aynı veri seti olmalı).
 * Eski pixel ID env'deyse null döner; graph.facebook.com çağrısı yapılmaz.
 */
export function getServerPixelId(): string | null {
  return resolvePixelId(
    process.env.META_PIXEL_ID,
    process.env.NEXT_PUBLIC_META_PIXEL_ID,
    "META_PIXEL_ID / NEXT_PUBLIC_META_PIXEL_ID"
  );
}

export function getMetaApiVersion(): string {
  return process.env.META_API_VERSION?.trim() || META_DEFAULT_API_VERSION;
}

export function getMetaTestEventCode(): string | null {
  const code = process.env.META_TEST_EVENT_CODE?.trim();
  return code || null;
}

/** Admin routes must not load Pixel or fire PageView. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

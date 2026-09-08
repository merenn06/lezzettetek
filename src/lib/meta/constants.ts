/**
 * Meta Pixel & Conversions API shared constants.
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

/** Returns true when Meta Pixel should run in the browser. */
export function isMetaPixelEnabled(): boolean {
  if (process.env.META_PIXEL_ENABLED === "false") return false;
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED !== "true"
  ) {
    return false;
  }
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());
}

/** Returns true when server-side CAPI calls should be sent. */
export function isMetaCapiEnabled(): boolean {
  if (process.env.META_CAPI_ENABLED === "false") return false;
  if (process.env.NODE_ENV === "development" && process.env.META_CAPI_ENABLED !== "true") {
    return false;
  }
  return Boolean(
    process.env.META_PIXEL_ID?.trim() && process.env.META_CAPI_ACCESS_TOKEN?.trim()
  );
}

export function getPublicPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id || null;
}

export function getServerPixelId(): string | null {
  const id = process.env.META_PIXEL_ID?.trim();
  return id || null;
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

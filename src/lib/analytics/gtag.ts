/** Mevcut layout.tsx içinde yüklenen gtag.js dataLayer API'si. */

export type GtagFn = (...args: unknown[]) => void;

export function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const gtag = (window as Window & { gtag?: GtagFn }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

import {
  getPublicPixelId,
  isAdminPath,
  isMetaPixelEnabled,
  type MetaEventName,
} from "./constants";

declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
  }
}

export type MetaFbq = {
  (command: "init", pixelId: string): void;
  (command: "track", eventName: MetaEventName, params?: MetaPixelEventParams, options?: MetaPixelTrackOptions): void;
  (command: "trackCustom", eventName: string, params?: MetaPixelEventParams, options?: MetaPixelTrackOptions): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: MetaFbq;
};

export type MetaPixelEventParams = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{ id: string; quantity?: number }>;
  num_items?: number;
  content_name?: string;
  [key: string]: unknown;
};

export type MetaPixelTrackOptions = {
  eventID?: string;
};

export function getFbq(): MetaFbq | undefined {
  if (typeof window === "undefined") return undefined;
  return window.fbq;
}

export function isPixelReady(): boolean {
  return Boolean(getFbq());
}

/** Returns false when Pixel should not run (disabled, missing ID, or admin route). */
export function shouldRunMetaPixel(pathname?: string): boolean {
  if (!isMetaPixelEnabled()) return false;
  if (pathname && isAdminPath(pathname)) return false;
  return Boolean(getPublicPixelId());
}

/**
 * Tracks a standard Meta Pixel event in the browser.
 * Pass `eventId` for deduplication with CAPI.
 */
export function trackMetaPixelEvent(
  eventName: MetaEventName,
  params?: MetaPixelEventParams,
  eventId?: string,
  pathname?: string
): boolean {
  if (!shouldRunMetaPixel(pathname)) {
    return false;
  }

  const fbq = getFbq();
  if (!fbq) {
    return false;
  }

  const options: MetaPixelTrackOptions | undefined = eventId
    ? { eventID: eventId }
    : undefined;

  fbq("track", eventName, params, options);
  return true;
}

/** Tracks PageView — used on initial load and App Router navigations. */
export function trackMetaPageView(eventId?: string, pathname?: string): boolean {
  return trackMetaPixelEvent("PageView", undefined, eventId, pathname);
}

import { META_EVENT_NAMES, type MetaEventName } from "./constants";
import {
  shouldRunMetaPixel,
  trackMetaPixelEvent,
  type MetaPixelEventParams,
} from "./pixel";
import type { BrowserCapiEventName } from "./browser-event-capi";

const BROWSER_TRACKABLE_EVENTS = new Set<MetaEventName>([
  META_EVENT_NAMES.PAGE_VIEW,
  META_EVENT_NAMES.VIEW_CONTENT,
  META_EVENT_NAMES.ADD_TO_CART,
  META_EVENT_NAMES.INITIATE_CHECKOUT,
]);

type BrowserCapiRequestBody = {
  eventName: BrowserCapiEventName;
  eventId: string;
  customData?: MetaPixelEventParams;
  eventSourceUrl?: string;
  pathname?: string;
};

const sentCapiEventIds = new Set<string>();

function sendBrowserEventToCapi(body: BrowserCapiRequestBody): void {
  if (typeof window === "undefined") {
    return;
  }

  if (sentCapiEventIds.has(body.eventId)) {
    return;
  }
  sentCapiEventIds.add(body.eventId);

  void fetch("/api/meta/capi/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // CAPI failures must not affect UX.
  });
}

/**
 * Tracks a browser event via Meta Pixel and server-side CAPI.
 * eventId must be generated once by the caller and shared across both channels.
 * CAPI is sent even when Pixel is blocked or not ready.
 */
export function trackBrowserEvent(
  eventName: MetaEventName,
  eventId: string,
  customData?: MetaPixelEventParams,
  pathname?: string
): boolean {
  if (!shouldRunMetaPixel(pathname)) {
    return false;
  }

  if (!BROWSER_TRACKABLE_EVENTS.has(eventName)) {
    return false;
  }

  const eventSourceUrl = window.location.href;
  const resolvedPathname = pathname ?? window.location.pathname;

  sendBrowserEventToCapi({
    eventName: eventName as BrowserCapiEventName,
    eventId,
    customData,
    eventSourceUrl,
    pathname: resolvedPathname,
  });

  return trackMetaPixelEvent(eventName, customData, eventId, pathname);
}

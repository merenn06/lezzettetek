import { sendMetaCapiEvent, type MetaCapiCustomData } from "./capi";
import { META_EVENT_NAMES, type MetaEventName } from "./constants";

export const BROWSER_CAPI_EVENT_NAMES = [
  META_EVENT_NAMES.PAGE_VIEW,
  META_EVENT_NAMES.VIEW_CONTENT,
  META_EVENT_NAMES.ADD_TO_CART,
  META_EVENT_NAMES.INITIATE_CHECKOUT,
] as const;

export type BrowserCapiEventName = (typeof BROWSER_CAPI_EVENT_NAMES)[number];

const BROWSER_CAPI_EVENT_NAME_SET = new Set<string>(BROWSER_CAPI_EVENT_NAMES);

export function isBrowserCapiEventName(
  value: string
): value is BrowserCapiEventName {
  return BROWSER_CAPI_EVENT_NAME_SET.has(value);
}

export type SendBrowserEventCapiInput = {
  eventName: BrowserCapiEventName;
  eventId: string;
  eventSourceUrl?: string;
  customData?: MetaCapiCustomData;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
};

/** Sends a browser-originated event to Meta CAPI. Never throws. */
export async function sendBrowserEventCapi(
  input: SendBrowserEventCapiInput
): Promise<void> {
  try {
    const result = await sendMetaCapiEvent({
      eventName: input.eventName as MetaEventName,
      eventId: input.eventId,
      eventSourceUrl: input.eventSourceUrl,
      actionSource: "website",
      userData: {
        clientIpAddress: input.clientIpAddress ?? null,
        clientUserAgent: input.clientUserAgent ?? null,
        fbp: input.fbp ?? null,
        fbc: input.fbc ?? null,
      },
      customData: input.customData,
    });

    if (!result.ok && !result.skipped) {
      console.error("[meta-browser-event] CAPI failed:", {
        eventName: input.eventName,
        eventId: input.eventId,
        error: result.error,
        response: result.response,
      });
    }
  } catch (error) {
    console.error("[meta-browser-event] Unexpected CAPI error:", {
      eventName: input.eventName,
      eventId: input.eventId,
      error,
    });
  }
}

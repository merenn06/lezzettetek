import { META_EVENT_NAMES } from "./constants";
import { buildViewContentEventId } from "./eventId";
import type { MetaPixelEventParams } from "./pixel";
import { trackMetaPixelEvent } from "./pixel";
import { trackBrowserEvent } from "./track-browser-event";

export const META_PIXEL_READY_EVENT = "meta-pixel-ready";

const VIEW_CONTENT_RETRY_INTERVAL_MS = 100;
const VIEW_CONTENT_MAX_RETRY_MS = 10_000;

export type MetaViewContentParams = {
  productId: string;
  productName: string;
  price: number;
  pathname?: string;
};

function createViewInstanceKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function buildViewContentCustomData(
  params: MetaViewContentParams
): MetaPixelEventParams {
  return {
    content_ids: [params.productId],
    content_name: params.productName,
    content_type: "product",
    value: params.price,
    currency: "TRY",
  };
}

export type ViewContentTrackState = {
  eventId: string;
  capiDispatched: boolean;
  completed: boolean;
};

/**
 * Tek ürün detay görüntülemesi için ViewContent (Pixel + CAPI).
 * - İlk çağrı: trackBrowserEvent (CAPI hemen; Pixel fbq hazırsa).
 * - Sonraki: yalnızca Pixel, aynı eventId (CAPI zaten gitti).
 * trackBrowserEvent'in dönüşü yalnızca Pixel başarısını yansıtır.
 */
export function trySendViewContent(
  params: MetaViewContentParams,
  state: ViewContentTrackState
): boolean {
  if (state.completed) {
    return true;
  }

  const pathname =
    params.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : undefined);

  const customData = buildViewContentCustomData(params);

  if (!state.capiDispatched) {
    const pixelOk = trackBrowserEvent(
      META_EVENT_NAMES.VIEW_CONTENT,
      state.eventId,
      customData,
      pathname
    );
    state.capiDispatched = true;
    if (pixelOk) {
      state.completed = true;
      return true;
    }
    return false;
  }

  const pixelSent = trackMetaPixelEvent(
    META_EVENT_NAMES.VIEW_CONTENT,
    customData,
    state.eventId,
    pathname
  );

  if (pixelSent) {
    state.completed = true;
    return true;
  }

  return false;
}

export function createViewContentTrackState(productId: string): ViewContentTrackState {
  const viewInstanceKey = createViewInstanceKey();
  return {
    eventId: buildViewContentEventId(productId, viewInstanceKey),
    capiDispatched: false,
    completed: false,
  };
}

/** PageView / InitiateCheckout ile uyumlu: fbq gecikmesinde sınırlı retry. */
export function scheduleViewContentUntilReady(
  params: MetaViewContentParams,
  state: ViewContentTrackState,
  onDone: () => void
): () => void {
  if (trySendViewContent(params, state)) {
    onDone();
    return () => {};
  }

  const startedAt = Date.now();

  let timer: number | undefined;

  const onPixelReady = () => {
    if (trySendViewContent(params, state)) {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
      onDone();
    }
  };

  window.addEventListener(META_PIXEL_READY_EVENT, onPixelReady);

  timer = window.setInterval(() => {
    if (Date.now() - startedAt > VIEW_CONTENT_MAX_RETRY_MS) {
      window.clearInterval(timer);
      onDone();
      return;
    }
    if (trySendViewContent(params, state)) {
      window.clearInterval(timer);
      onDone();
    }
  }, VIEW_CONTENT_RETRY_INTERVAL_MS);

  return () => {
    window.removeEventListener(META_PIXEL_READY_EVENT, onPixelReady);
    if (timer !== undefined) {
      window.clearInterval(timer);
    }
  };
}
import { getPublicPixelId } from "./constants";

export const META_PIXEL_READY_EVENT = "meta-pixel-ready";

type FbqLike = ((...args: unknown[]) => void) & { loaded?: boolean };

declare global {
  interface Window {
    __tekLezzetMetaPixelScriptPromise?: Promise<void>;
  }
}

function getFbqUnsafe(): FbqLike | undefined {
  if (typeof window === "undefined") return undefined;
  return window.fbq as unknown as FbqLike | undefined;
}

/** fbq consent API — izin yokken otomatik ve manuel gönderimleri keser. */
export function applyMetaPixelConsentState(granted: boolean): void {
  const fbq = getFbqUnsafe();
  if (!fbq) return;
  fbq("consent", granted ? "grant" : "revoke");
}

export function metaPixelInitStepLabels(pixelId: string): string[] {
  return [`set:autoConfig:false:${pixelId}`, "consent:grant", `init:${pixelId}`];
}

/**
 * İlk init: autoConfig kapalı (otomatik SubscribedButtonClick vb.), sonra consent grant + init.
 * Aynı pixel zaten init edildiyse yalnızca consent grant yenilenir.
 */
export function initMetaPixelWithConsent(pixelId: string): void {
  const fbq = getFbqUnsafe();
  if (!fbq || !pixelId) return;

  const existing = window.__tekLezzetMetaPixelInitId;
  if (existing === pixelId) {
    applyMetaPixelConsentState(true);
    window.dispatchEvent(new CustomEvent(META_PIXEL_READY_EVENT));
    return;
  }

  if (existing && existing !== pixelId) {
    console.warn(
      "[meta] Pixel already initialized with a different ID; reload the page after updating env."
    );
    return;
  }

  fbq("set", "autoConfig", false, pixelId);
  fbq("consent", "grant");
  fbq("init", pixelId);
  window.__tekLezzetMetaPixelInitId = pixelId;
  window.dispatchEvent(new CustomEvent(META_PIXEL_READY_EVENT));
}

function injectMetaPixelStub(): void {
  if (typeof window === "undefined" || window.fbq) return;

  type QueuedFbq = FbqLike & {
    queue: unknown[][];
    loaded: boolean;
    version: string;
    push: FbqLike;
    callMethod?: (...args: unknown[]) => void;
  };

  const n = function (...args: unknown[]) {
    const q = n as QueuedFbq;
    if (q.callMethod) {
      q.callMethod(...args);
    } else {
      q.queue.push(args);
    }
  } as QueuedFbq;

  n.queue = [];
  n.loaded = true;
  n.version = "2.0";
  n.push = n;
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
}

/** fbevents.js yalnızca bir kez yüklenir; fbq sayfa boyunca kalır (revoke için). */
export function ensureMetaPixelScriptLoaded(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.__tekLezzetMetaPixelScriptPromise) {
    return window.__tekLezzetMetaPixelScriptPromise;
  }

  injectMetaPixelStub();

  window.__tekLezzetMetaPixelScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-tek-meta-pixel="1"]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.setAttribute("data-tek-meta-pixel", "1");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("meta pixel script failed"));
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(script, first);
  });

  return window.__tekLezzetMetaPixelScriptPromise;
}

/** setMarketingConsent sonrası client tarafı senkronizasyon. */
export function syncMetaPixelAfterConsentChange(state: "granted" | "denied"): void {
  if (typeof window === "undefined") return;

  if (state === "denied") {
    applyMetaPixelConsentState(false);
    return;
  }

  const pixelId = getPublicPixelId();
  if (!pixelId) return;

  void ensureMetaPixelScriptLoaded()
    .then(() => {
      initMetaPixelWithConsent(pixelId);
    })
    .catch(() => {
      // ignore
    });
}
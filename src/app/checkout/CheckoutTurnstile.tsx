"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export type CheckoutTurnstileRef = {
  reset: () => void;
};

type CheckoutTurnstileProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError?: () => void;
};

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.turnstile) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${TURNSTILE_SCRIPT_SRC}"]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Turnstile script load failed")),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script load failed"));
    document.head.appendChild(script);
  });
}

const CheckoutTurnstile = forwardRef<CheckoutTurnstileRef, CheckoutTurnstileProps>(
  function CheckoutTurnstile({ siteKey, onToken, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const reset = useCallback(() => {
      onToken(null);
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }, [onToken]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    useEffect(() => {
      if (!siteKey || !containerRef.current) {
        return;
      }

      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) {
            return;
          }

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "light",
            callback: (token: string) => onToken(token),
            "expired-callback": () => onToken(null),
            "error-callback": () => {
              onToken(null);
              onError?.();
            },
          });
        })
        .catch(() => {
          onToken(null);
          onError?.();
        });

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, onToken, onError]);

    if (!siteKey) {
      return (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Güvenlik doğrulaması yapılandırılmamış. Sipariş gönderilemez.
        </p>
      );
    }

    return (
      <div
        ref={containerRef}
        className="min-h-[65px] flex items-center justify-start"
        aria-label="Güvenlik doğrulaması"
      />
    );
  }
);

export default CheckoutTurnstile;

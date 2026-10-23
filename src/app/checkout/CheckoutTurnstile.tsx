"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const EXECUTE_TIMEOUT_MS = 15_000;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export type CheckoutTurnstileRef = {
  execute: () => Promise<string>;
  reset: () => void;
  isReady: () => boolean;
};

type CheckoutTurnstileProps = {
  siteKey: string;
};

type PendingExecution = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
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
  function CheckoutTurnstile({ siteKey }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const pendingRef = useRef<PendingExecution | null>(null);
    const [ready, setReady] = useState(false);

    const rejectPending = useCallback((error: Error) => {
      const pending = pendingRef.current;
      if (!pending) return;
      clearTimeout(pending.timeoutId);
      pendingRef.current = null;
      pending.reject(error);
    }, []);

    const reset = useCallback(() => {
      rejectPending(new Error("Turnstile reset"));
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }, [rejectPending]);

    const execute = useCallback((): Promise<string> => {
      if (!siteKey) {
        return Promise.reject(
          new Error("Güvenlik doğrulaması yapılandırılmamış. Sipariş gönderilemez.")
        );
      }
      if (!ready || !window.turnstile || !widgetIdRef.current) {
        return Promise.reject(
          new Error(
            "Güvenlik doğrulaması henüz hazır değil. Lütfen birkaç saniye bekleyip tekrar deneyin."
          )
        );
      }

      if (pendingRef.current) {
        return Promise.reject(
          new Error("Güvenlik doğrulaması devam ediyor. Lütfen bekleyin.")
        );
      }

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingRef.current = null;
          reset();
          reject(
            new Error(
              "Güvenlik doğrulaması zaman aşımına uğradı. Lütfen tekrar deneyin."
            )
          );
        }, EXECUTE_TIMEOUT_MS);

        pendingRef.current = { resolve, reject, timeoutId };

        try {
          window.turnstile!.execute(widgetIdRef.current!);
        } catch (error) {
          clearTimeout(timeoutId);
          pendingRef.current = null;
          reject(
            error instanceof Error
              ? error
              : new Error("Güvenlik doğrulaması başlatılamadı.")
          );
        }
      });
    }, [ready, reset, siteKey]);

    useImperativeHandle(
      ref,
      () => ({
        execute,
        reset,
        isReady: () => ready,
      }),
      [execute, ready, reset]
    );

    useEffect(() => {
      if (!siteKey || !containerRef.current) {
        setReady(false);
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
            size: "invisible",
            execution: "execute",
            callback: (token: string) => {
              const pending = pendingRef.current;
              if (!pending) return;
              clearTimeout(pending.timeoutId);
              pendingRef.current = null;
              pending.resolve(token);
            },
            "expired-callback": () => {
              rejectPending(
                new Error(
                  "Güvenlik doğrulamasının süresi doldu. Lütfen tekrar deneyin."
                )
              );
              reset();
            },
            "error-callback": () => {
              rejectPending(
                new Error(
                  "Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin."
                )
              );
              reset();
            },
          });

          setReady(true);
        })
        .catch(() => {
          setReady(false);
        });

      return () => {
        cancelled = true;
        setReady(false);
        rejectPending(new Error("Turnstile unmounted"));
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [rejectPending, reset, siteKey]);

    if (!siteKey) {
      return null;
    }

    return (
      <div
        ref={containerRef}
        className="fixed left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    );
  }
);

export default CheckoutTurnstile;

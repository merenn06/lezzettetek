"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminPath } from "@/lib/meta/constants";
import {
  MARKETING_CONSENT_OPEN_PREFERENCES_EVENT,
  readMarketingConsentFromStorage,
  setMarketingConsent,
  shouldShowMarketingConsentBanner,
  type MarketingConsentChoice,
} from "@/lib/meta/consent";

/**
 * Alt çubuk reklam çerezi onayı — tam ekran engel değil; alışveriş devam eder.
 */
export default function MarketingConsentBanner() {
  const pathname = usePathname() ?? "";
  const isAdmin = isAdminPath(pathname);
  const [stored, setStored] = useState<MarketingConsentChoice | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStored(readMarketingConsentFromStorage());
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setPreferencesOpen(true);
      setStored(readMarketingConsentFromStorage());
    };
    window.addEventListener(MARKETING_CONSENT_OPEN_PREFERENCES_EVENT, onOpen);
    return () => window.removeEventListener(MARKETING_CONSENT_OPEN_PREFERENCES_EVENT, onOpen);
  }, []);

  const visible =
    mounted &&
    shouldShowMarketingConsentBanner({
      stored,
      isAdmin,
      preferencesOpen,
    });

  const closeAfterChoice = useCallback(() => {
    setStored(readMarketingConsentFromStorage());
    setPreferencesOpen(false);
  }, []);

  const onAccept = () => {
    setMarketingConsent("granted");
    closeAfterChoice();
  };

  const onDecline = () => {
    setMarketingConsent("denied");
    closeAfterChoice();
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 pointer-events-none"
      role="region"
      aria-label="Çerez ve reklam ölçümü tercihleri"
    >
      <div className="pointer-events-auto border-t border-gray-200/90 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto max-w-6xl px-4 py-4 md:py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm md:text-base tracking-tight">
                Reklam ve ölçüm çerezleri
              </p>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed max-w-3xl">
                Sitemizi geliştirmek ve size daha iyi deneyim sunmak için Meta reklam ölçümü
                kullanabiliriz. Tercihinizi dilediğiniz zaman footer üzerinden
                değiştirebilirsiniz. Ayrıntılar için{" "}
                <Link
                  href="/gizlilik-sozlesmesi"
                  className="text-green-800 underline underline-offset-2 hover:text-green-900"
                >
                  Gizlilik Sözleşmesi
                </Link>{" "}
                ve{" "}
                <Link
                  href="/kvkk"
                  className="text-green-800 underline underline-offset-2 hover:text-green-900"
                >
                  KVKK
                </Link>
                metinlerine bakabilirsiniz.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto md:shrink-0">
              <button
                type="button"
                onClick={onDecline}
                className="flex-1 sm:min-w-[9.5rem] px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 transition-colors"
              >
                Reddet
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 sm:min-w-[9.5rem] px-5 py-2.5 text-sm font-medium rounded-lg bg-green-700 text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 transition-colors shadow-sm"
              >
                Kabul Et
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
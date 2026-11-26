"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPublicPixelId, isAdminPath, isMetaPixelEnabled } from "@/lib/meta/constants";
import {
  hasMetaAdvertisingConsent,
  MARKETING_CONSENT_CHANGED_EVENT,
} from "@/lib/meta/consent";
import {
  applyMetaPixelConsentState,
  ensureMetaPixelScriptLoaded,
  initMetaPixelWithConsent,
} from "@/lib/meta/meta-pixel-runtime";

/**
 * Meta Pixel — script bir kez yüklenir; izin geri çekilince fbq('consent','revoke') ile otomatik olaylar durur.
 */
export default function MetaPixel() {
  const pathname = usePathname() ?? "";
  const pixelId = getPublicPixelId();
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    setConsentGranted(hasMetaAdvertisingConsent());
    const onConsentChange = () => setConsentGranted(hasMetaAdvertisingConsent());
    window.addEventListener(MARKETING_CONSENT_CHANGED_EVENT, onConsentChange);
    return () => window.removeEventListener(MARKETING_CONSENT_CHANGED_EVENT, onConsentChange);
  }, []);

  const storefrontActive =
    isMetaPixelEnabled() && Boolean(pixelId) && !isAdminPath(pathname);

  useEffect(() => {
    if (!storefrontActive) return;

    if (!consentGranted) {
      applyMetaPixelConsentState(false);
      return;
    }

    let cancelled = false;
    void ensureMetaPixelScriptLoaded()
      .then(() => {
        if (cancelled || !pixelId) return;
        initMetaPixelWithConsent(pixelId);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [consentGranted, pixelId, storefrontActive]);

  if (!storefrontActive || !consentGranted || !pixelId) {
    return null;
  }

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
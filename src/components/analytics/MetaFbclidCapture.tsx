"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isAdminPath } from "@/lib/meta/constants";
import {
  hasMetaAdvertisingConsent,
  MARKETING_CONSENT_CHANGED_EVENT,
  syncMarketingConsentCookie,
} from "@/lib/meta/consent";
import {
  buildFbcFromFbclid,
  isValidFbclid,
  shouldSetFbcCookie,
} from "@/lib/meta/fbclid";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeFbcCookie(value: string): void {
  const maxAge = 90 * 24 * 60 * 60;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `_fbc=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Sets _fbc from URL fbclid when consent is granted. Does not invent fbc without fbclid.
 */
export default function MetaFbclidCapture() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAdminPath(pathname)) return;

    syncMarketingConsentCookie();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "tek-lezzet-marketing-consent") return;
      syncMarketingConsentCookie();
      applyFbclidFromUrl();
    };

    const onConsentChange = () => {
      syncMarketingConsentCookie();
      applyFbclidFromUrl();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(MARKETING_CONSENT_CHANGED_EVENT, onConsentChange);
    applyFbclidFromUrl();

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MARKETING_CONSENT_CHANGED_EVENT, onConsentChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fbclid tied to search string
  }, [pathname, searchParams?.toString()]);

  function applyFbclidFromUrl() {
    if (!hasMetaAdvertisingConsent()) return;

    const fbclid = searchParams?.get("fbclid");
    if (!isValidFbclid(fbclid)) return;

    const existingFbc = readCookie("_fbc");
    if (!shouldSetFbcCookie(existingFbc, fbclid)) return;

    const fbc = buildFbcFromFbclid(fbclid!);
    if (fbc) {
      writeFbcCookie(fbc);
    }
  }

  return null;
}
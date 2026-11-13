/**
 * Pazarlama çerezleri / Meta Pixel onayı.
 * Sitede ayrı bir banner yoksa NEXT_PUBLIC_META_REQUIRE_CONSENT=false (varsayılan)
 * ile ölçüm çalışır; ileride banner eklendiğinde aynı storage anahtarı kullanılabilir.
 */

export const META_CONSENT_STORAGE_KEY = "tek-lezzet-marketing-consent";

export function isMetaConsentRequired(): boolean {
  return process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT === "true";
}

/** İstemci tarafında Pixel/CAPI tetiklenmeden önce çağrılır. */
export function hasMetaAdvertisingConsent(): boolean {
  if (!isMetaConsentRequired()) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(META_CONSENT_STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}

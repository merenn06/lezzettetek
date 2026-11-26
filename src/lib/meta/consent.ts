/**
 * Pazarlama çerezleri / Meta Pixel onayı.
 * Yalnızca açık "granted" seçimi ölçümü açar; denied ve karar verilmemiş (unknown) açmaz.
 * NEXT_PUBLIC_META_REQUIRE_CONSENT: banner zorunluluğu (ileride UI); ölçüm yine granted ister.
 */

export const META_CONSENT_STORAGE_KEY = "tek-lezzet-marketing-consent";

/** İstemci consent değiştiğinde (aynı sekme). */
export const MARKETING_CONSENT_CHANGED_EVENT = "tek-lezzet-marketing-consent-changed";

/** Footer vb. tercih panelini yeniden açar. */
export const MARKETING_CONSENT_OPEN_PREFERENCES_EVENT =
  "tek-lezzet-marketing-consent-open-preferences";

const CONSENT_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export type MarketingConsentChoice = "granted" | "denied";

export function isMetaConsentRequired(): boolean {
  return process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT === "true";
}

export function readMarketingConsentFromStorage(): MarketingConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(META_CONSENT_STORAGE_KEY);
    if (value === "granted" || value === "denied") return value;
    return null;
  } catch {
    return null;
  }
}

/** Banner görünürlüğü (saf fonksiyon; test edilebilir). */
export function shouldShowMarketingConsentBanner(input: {
  stored: MarketingConsentChoice | null;
  isAdmin: boolean;
  preferencesOpen: boolean;
}): boolean {
  if (input.isAdmin) return false;
  if (input.preferencesOpen) return true;
  return input.stored === null;
}

export function openMarketingConsentPreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MARKETING_CONSENT_OPEN_PREFERENCES_EVENT));
}

function dispatchConsentChanged(state: MarketingConsentChoice): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MARKETING_CONSENT_CHANGED_EVENT, { detail: { state } })
  );
}

/** Mirrors localStorage consent to first-party cookie for server verification. */
export function syncMarketingConsentCookie(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const state = readMarketingConsentFromStorage();
  if (state === "granted" || state === "denied") {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${META_CONSENT_STORAGE_KEY}=${state}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  }
}

export function setMarketingConsent(state: MarketingConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(META_CONSENT_STORAGE_KEY, state);
  } catch {
    // ignore
  }
  syncMarketingConsentCookie();
  if (state === "denied") {
    clearOptionalAdvertisingCookies();
  }
  dispatchConsentChanged(state);
}

function clearOptionalAdvertisingCookies(): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `_fbc=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `_fbp=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/** İstemci tarafında Pixel/CAPI tetiklenmeden önce çağrılır. */
export function hasMetaAdvertisingConsent(): boolean {
  return readMarketingConsentFromStorage() === "granted";
}

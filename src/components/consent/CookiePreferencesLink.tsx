"use client";

import { openMarketingConsentPreferences } from "@/lib/meta/consent";

export default function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={() => openMarketingConsentPreferences()}
      className="text-gray-600 hover:text-green-700 transition-colors"
    >
      Çerez Tercihleri
    </button>
  );
}
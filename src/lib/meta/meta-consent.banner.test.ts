import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowMarketingConsentBanner } from "./consent";

describe("Marketing consent banner visibility", () => {
  it("shows on storefront when no prior choice", () => {
    assert.equal(
      shouldShowMarketingConsentBanner({ stored: null, isAdmin: false, preferencesOpen: false }),
      true
    );
  });

  it("hides after granted or denied until preferences reopened", () => {
    assert.equal(
      shouldShowMarketingConsentBanner({ stored: "granted", isAdmin: false, preferencesOpen: false }),
      false
    );
    assert.equal(
      shouldShowMarketingConsentBanner({ stored: "denied", isAdmin: false, preferencesOpen: false }),
      false
    );
  });

  it("never shows on admin routes", () => {
    assert.equal(
      shouldShowMarketingConsentBanner({ stored: null, isAdmin: true, preferencesOpen: false }),
      false
    );
    assert.equal(
      shouldShowMarketingConsentBanner({ stored: "granted", isAdmin: true, preferencesOpen: true }),
      false
    );
  });

  it("reopens from footer preferences on storefront", () => {
    assert.equal(
      shouldShowMarketingConsentBanner({ stored: "denied", isAdmin: false, preferencesOpen: true }),
      true
    );
  });
});
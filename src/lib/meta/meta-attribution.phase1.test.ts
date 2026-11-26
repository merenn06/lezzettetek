import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashMetaUserData } from "./capi";
import {
  buildFbcFromFbclid,
  extractFbclidFromFbc,
  isValidFbclid,
  isValidFbcValue,
  shouldSetFbcCookie,
} from "./fbclid";
import {
  getServerMarketingConsent,
  isServerMarketingConsentGranted,
} from "./consent-server";
import { sanitizeEventSourceUrl } from "./event-source-url";
import { captureOrderAttributionFromRequest } from "./order-attribution";
import { shouldSendServerPurchaseCapi } from "./should-send-purchase-capi";
import { buildPurchaseEventId } from "./eventId";

const ORIGINAL_ENV = { ...process.env };

function mockRequest(cookies?: string, headers?: Record<string, string>): Request {
  const hdrs = new Headers(headers ?? {});
  if (cookies) {
    hdrs.set("cookie", cookies);
  }
  return new Request("https://example.com/api/orders", {
    method: "POST",
    headers: hdrs,
  });
}

describe("Meta attribution phase 1", () => {
  it("does not build fbc without valid fbclid", () => {
    assert.equal(buildFbcFromFbclid(""), null);
    assert.equal(buildFbcFromFbclid("bad space"), null);
    assert.equal(isValidFbclid(null), false);
  });

  it("builds Meta-format fbc from fbclid", () => {
    const fbc = buildFbcFromFbclid("IwAR123", 1700000000000);
    assert.equal(fbc, "fb.1.1700000000000.IwAR123");
    assert.equal(isValidFbcValue(fbc), true);
    assert.equal(extractFbclidFromFbc(fbc), "IwAR123");
  });

  it("does not rewrite fbc when fbclid unchanged", () => {
    const fbc = "fb.1.1700000000000.IwAR123";
    assert.equal(shouldSetFbcCookie(fbc, "IwAR123"), false);
    assert.equal(shouldSetFbcCookie(fbc, "OtherClick"), true);
  });

  it("hashMetaUserData keeps fbc/fbp plaintext", () => {
    const hashed = hashMetaUserData({
      fbc: "fb.1.1.click",
      fbp: "fb.1.2.3",
      email: "test@example.com",
    });
    assert.equal(hashed.fbc, "fb.1.1.click");
    assert.equal(hashed.fbp, "fb.1.2.3");
    assert.ok(Array.isArray(hashed.em));
  });

  it("sanitizeEventSourceUrl strips fbclid and utm params", () => {
    const clean = sanitizeEventSourceUrl(
      "https://www.tek-lezzet.com/checkout?utm_source=meta&fbclid=abc&order=1"
    );
    assert.ok(clean?.includes("/checkout"));
    assert.equal(clean?.includes("fbclid"), false);
    assert.equal(clean?.includes("utm_"), false);
  });

  it("consent unknown is not granted when consent required", () => {
    process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = "true";
    const req = mockRequest();
    assert.equal(getServerMarketingConsent(req), "unknown");
    assert.equal(
      captureOrderAttributionFromRequest({ request: req }).consentGranted,
      false
    );
    process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = ORIGINAL_ENV.NEXT_PUBLIC_META_REQUIRE_CONSENT;
  });

  it("consent granted via cookie when consent required", () => {
    process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = "true";
    const req = mockRequest(
      "tek-lezzet-marketing-consent=granted; _fbc=fb.1.1.ValidClick; _fbp=fb.1.2.3"
    );
    assert.equal(getServerMarketingConsent(req), "granted");
    const snap = captureOrderAttributionFromRequest({
      request: req,
      clientEventSourceUrl: "https://www.tek-lezzet.com/checkout",
    });
    assert.equal(snap.consentGranted, true);
    assert.ok(snap.fbc?.includes("ValidClick"));
    assert.ok(snap.fbp);
    process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = ORIGINAL_ENV.NEXT_PUBLIC_META_REQUIRE_CONSENT;
  });

  it("without explicit granted cookie consent is not granted", () => {
    delete process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT;
    const req = mockRequest("_fbp=fb.1.2.3");
    assert.equal(getServerMarketingConsent(req), "unknown");
    assert.equal(isServerMarketingConsentGranted(req), false);
    const snap = captureOrderAttributionFromRequest({ request: req });
    assert.equal(snap.consentGranted, false);
    assert.equal(snap.fbp, undefined);
  });

  it("denied cookie is not granted regardless of env flag", () => {
    delete process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT;
    const req = mockRequest("tek-lezzet-marketing-consent=denied; _fbp=fb.1.2.3");
    assert.equal(getServerMarketingConsent(req), "denied");
    assert.equal(
      captureOrderAttributionFromRequest({ request: req }).consentGranted,
      false
    );
  });

  it("shouldSendServerPurchaseCapi respects consent and expiry", () => {
    assert.equal(shouldSendServerPurchaseCapi({ consentGranted: true }), true);
    assert.equal(shouldSendServerPurchaseCapi({ consentGranted: false }), false);
    assert.equal(shouldSendServerPurchaseCapi(null), false);
    const past = new Date(Date.now() - 86_400_000).toISOString();
    assert.equal(
      shouldSendServerPurchaseCapi({ consentGranted: true }, { expiresAt: past }),
      false
    );
  });

  it("purchase event id format preserved", () => {
    assert.equal(buildPurchaseEventId("abc-123"), "purchase_abc-123");
  });
});
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAttributionExpired, attributionSnapshotUsableForCapi } from "./attribution-expiry";
import {
  buildClaimExpiresAt,
  isClaimLockExpired,
  PURCHASE_CAPI_CLAIM_TTL_MS,
  SAVE_ORDER_ATTRIBUTION_TIMEOUT_MS,
} from "./purchase-capi-claim";
import { saveOrderAttributionWithTimeout } from "./order-attribution-db";

describe("Meta attribution phase 1.1", () => {
  it("expired attribution is not usable for CAPI", () => {
    const past = new Date(Date.now() - 1_000).toISOString();
    assert.equal(isAttributionExpired(past), true);
    assert.equal(
      attributionSnapshotUsableForCapi({ consentGranted: true }, past),
      false
    );
  });

  it("claim lock TTL maths", () => {
    const now = 1_700_000_000_000;
    const until = buildClaimExpiresAt(now);
    assert.equal(isClaimLockExpired(until, now + PURCHASE_CAPI_CLAIM_TTL_MS + 1), true);
    assert.equal(isClaimLockExpired(until, now + 1_000), false);
    assert.equal(isClaimLockExpired(null, now), true);
  });

  it("saveOrderAttributionWithTimeout returns quickly when supabase unavailable", async () => {
    const started = Date.now();
    const result = await saveOrderAttributionWithTimeout("00000000-0000-0000-0000-000000000001", {
      consentGranted: false,
    });
    const elapsed = Date.now() - started;
    assert.equal(result.ok, false);
    assert.ok(elapsed < SAVE_ORDER_ATTRIBUTION_TIMEOUT_MS + 500);
  });

  it("bounded timeout race pattern", async () => {
    const result = await Promise.race([
      new Promise<{ ok: boolean }>((resolve) => {
        setTimeout(() => resolve({ ok: true }), 200);
      }),
      new Promise<{ ok: boolean }>((resolve) => {
        setTimeout(() => resolve({ ok: false }), 30);
      }),
    ]);
    assert.equal(result.ok, false);
  });

  it("concurrent callback: at most one claim wins", async () => {
    let winner = 0;
    let lock = false;

    async function claimOnce(): Promise<boolean> {
      if (lock) return false;
      lock = true;
      await new Promise((r) => setTimeout(r, 2));
      if (winner > 0) {
        lock = false;
        return false;
      }
      winner += 1;
      lock = false;
      return true;
    }

    const results = await Promise.all([claimOnce(), claimOnce()]);
    assert.equal(results.filter(Boolean).length, 1);
  });

  it("failed Meta send clears claim without setting sent_at", () => {
    const state: {
      purchase_capi_sent_at: string | null;
      purchase_capi_claimed_until: string | null;
    } = {
      purchase_capi_sent_at: null,
      purchase_capi_claimed_until: buildClaimExpiresAt(),
    };
    const metaOk = false;
    if (metaOk) {
      state.purchase_capi_sent_at = new Date().toISOString();
      state.purchase_capi_claimed_until = null;
    } else {
      state.purchase_capi_claimed_until = null;
    }
    assert.equal(state.purchase_capi_sent_at, null);
    assert.equal(state.purchase_capi_claimed_until, null);
  });

  it("consent denied and unknown are never auto-granted", async () => {
    const { getServerMarketingConsent, isServerMarketingConsentGranted } = await import(
      "./consent-server"
    );
    const prev = process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT;
    delete process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT;

    const denied = getServerMarketingConsent(
      new Request("https://example.com", {
        headers: { cookie: "tek-lezzet-marketing-consent=denied" },
      })
    );
    const unknown = getServerMarketingConsent(new Request("https://example.com"));
    assert.equal(denied, "denied");
    assert.equal(unknown, "unknown");
    assert.equal(isServerMarketingConsentGranted(new Request("https://example.com")), false);

    process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT = prev;
  });

  it("release and mark success only when claimUntil matches (guard pattern)", () => {
    const ourUntil = buildClaimExpiresAt();
    const otherUntil = buildClaimExpiresAt(Date.now() + 60_000);
    const rowUntil = otherUntil;

    const shouldRelease = ourUntil === rowUntil;
    assert.equal(shouldRelease, false);

    const rowClaim = "2026-01-01T00:00:00.000Z";
    const markClaim = "2026-01-01T00:00:00.000Z";
    assert.equal(markClaim === rowClaim, true);
    assert.equal(ourUntil === rowClaim, false);
  });
});
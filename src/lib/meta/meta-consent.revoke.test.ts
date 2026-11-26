import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasMetaAdvertisingConsent } from "./consent";

describe("Meta consent after revoke (storage semantics)", () => {
  it("denied storage state blocks advertising consent flag", () => {
    const priorWindow = globalThis.window;
    const prior = globalThis.localStorage;

    // @ts-expect-error test shim
    globalThis.window = globalThis;

    const mock = {
      store: {} as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
    };
    // @ts-expect-error test shim
    globalThis.localStorage = mock;

    mock.setItem("tek-lezzet-marketing-consent", "denied");
    assert.equal(hasMetaAdvertisingConsent(), false);

    mock.setItem("tek-lezzet-marketing-consent", "granted");
    assert.equal(hasMetaAdvertisingConsent(), true);

    globalThis.localStorage = prior;
    globalThis.window = priorWindow;
  });
});
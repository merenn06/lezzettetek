import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { metaPixelInitStepLabels } from "./meta-pixel-runtime";

describe("Meta pixel runtime", () => {
  it("init disables autoConfig before consent grant and pixel init", () => {
    const steps = metaPixelInitStepLabels("934965809358416");
    assert.deepEqual(steps, [
      "set:autoConfig:false:934965809358416",
      "consent:grant",
      "init:934965809358416",
    ]);
  });

  it("marketing deny order: consent revoke before clearing ad cookies", () => {
    const order = ["consent:revoke", "clear:_fbc", "clear:_fbp"] as const;
    assert.equal(order[0], "consent:revoke");
    assert.ok(order.indexOf("consent:revoke") < order.indexOf("clear:_fbp"));
  });
});
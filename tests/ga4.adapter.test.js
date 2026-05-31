import test from "node:test";
import assert from "node:assert/strict";

import { createEngine } from "../src/engine/runtime.js";
import {
  buildGa4ConversionPayload,
  buildGa4EventPayload,
  buildGa4ImpressionPayload,
  createGa4Adapter
} from "../src/analytics/ga4.js";

test("builds GA4 payloads with experiment metadata", () => {
  assert.deepEqual(buildGa4ImpressionPayload({
    experimentId: "hero-test",
    variantId: "v1",
    pagePath: "/home"
  }), {
    eventName: "split_test_impression",
    params: {
      experiment_id: "hero-test",
      variant_id: "v1",
      page_path: "/home"
    }
  });

  assert.deepEqual(buildGa4ConversionPayload({
    experimentId: "hero-test",
    variantId: "v1",
    goalId: "signup",
    pagePath: "/home"
  }), {
    eventName: "split_test_conversion",
    params: {
      experiment_id: "hero-test",
      variant_id: "v1",
      goal_id: "signup",
      page_path: "/home"
    }
  });

  assert.deepEqual(buildGa4EventPayload({
    eventName: "cta_click",
    experimentId: "hero-test",
    variantId: "v1",
    pagePath: "/home",
    payload: { source: "hero" }
  }), {
    eventName: "cta_click",
    params: {
      source: "hero",
      event_name: "cta_click",
      experiment_id: "hero-test",
      variant_id: "v1",
      page_path: "/home"
    }
  });
});

test("emits GA4 calls from the adapter", () => {
  const calls = [];
  const adapter = createGa4Adapter({
    gtag: (...args) => calls.push(args)
  });

  adapter.trackImpression({
    experimentId: "hero-test",
    variantId: "v1",
    pagePath: "/home"
  });
  adapter.trackConversion({
    experimentId: "hero-test",
    variantId: "v1",
    goalId: "signup",
    pagePath: "/home",
    payload: { currency: "USD" }
  });
  adapter.trackEvent({
    eventName: "cta_click",
    experimentId: "hero-test",
    variantId: "v1",
    pagePath: "/home",
    payload: { source: "hero" }
  });

  assert.deepEqual(calls, [
    [
      "event",
      "split_test_impression",
      {
        experiment_id: "hero-test",
        variant_id: "v1",
        page_path: "/home"
      }
    ],
    [
      "event",
      "split_test_conversion",
      {
        currency: "USD",
        experiment_id: "hero-test",
        variant_id: "v1",
        goal_id: "signup",
        page_path: "/home"
      }
    ],
    [
      "event",
      "cta_click",
      {
        source: "hero",
        event_name: "cta_click",
        experiment_id: "hero-test",
        variant_id: "v1",
        page_path: "/home"
      }
    ]
  ]);
});

test("passes page path to analytics event hooks", () => {
  const calls = [];
  const engine = createEngine({
    analytics: {
      trackEvent: (payload) => calls.push(payload)
    }
  });

  engine.trackEvent("cta_click", { source: "hero" }, { url: { pathname: "/pricing" } });

  assert.deepEqual(calls, [
    {
      eventName: "cta_click",
      payload: { source: "hero" },
      pagePath: "/pricing"
    }
  ]);
});

import { describe, expect, jest, test } from "@jest/globals";
import { createGa4Adapter } from "../src/analytics/ga4.js";
import { createEngine } from "../src/engine/runtime.js";
import { installRuntime } from "../src/runtime/index.js";

function createStorage() {
  const entries = new Map();

  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
    removeItem(key) {
      entries.delete(key);
    }
  };
}

function createPricingExperiment() {
  return {
    id: "pricing-test",
    status: "active",
    variants: [
      { id: "control", weight: 50 },
      { id: "variant-a", weight: 50 }
    ],
    variantRules: [
      {
        when: ({ events }) => events.includes("viewed_pricing"),
        variant: "variant-a"
      }
    ],
    goals: [
      {
        id: "pricing_view",
        events: ["viewed_pricing"]
      }
    ]
  };
}

describe("split tester workflow", () => {
  test("installs runtime, drains queued lazy definitions, and accepts queued registrations", () => {
    const scope = {
      splitTesterQueue: [
        ({ context }) => ({
          id: "hero-copy",
          status: "active",
          variants: [
            { id: "control", weight: 50 },
            { id: "variant-a", weight: 50 }
          ],
          variantRules: [
            {
              when: ({ events }) => events.includes("viewed_pricing") || context.url.pathname === "/pricing",
              variant: "variant-a"
            }
          ]
        })
      ]
    };

    const runtime = installRuntime(
      {
        getUserContext: () => ({ url: { pathname: "/pricing" }, user: { id: "user-1" } })
      },
      scope
    );

    expect(scope.splitTester).toBe(runtime);
    expect(runtime.listExperiments()).toHaveLength(1);
    expect(runtime.getVariant("hero-copy")).toBe("variant-a");

    scope.splitTesterQueue.push(() => ({
      id: "cta-color",
      status: "active",
      variants: [
        { id: "control", weight: 50 },
        { id: "variant-b", weight: 50 }
      ]
    }));

    expect(runtime.listExperiments()).toHaveLength(2);
    expect(runtime.getVariant("cta-color")).toEqual(expect.any(String));
  });

  test("persists sticky assignments and switches variants on tracked events", () => {
    const storage = createStorage();
    const context = () => ({ url: { pathname: "/pricing" }, user: { id: "user-1" } });

    const firstEngine = createEngine({
      storage,
      getUserContext: context,
      experiments: [createPricingExperiment()]
    });

    const firstVariant = firstEngine.getVariant("pricing-test");
    expect(firstVariant).toEqual(expect.any(String));

    const secondEngine = createEngine({
      storage,
      getUserContext: context,
      experiments: [createPricingExperiment()]
    });

    expect(secondEngine.getVariant("pricing-test")).toBe(firstVariant);

    const switchedAssignments = secondEngine.trackEvent("viewed_pricing", { source: "hero" });
    expect(switchedAssignments["pricing-test"]).toBe("variant-a");
    expect(storage.getItem("split-tester:pricing-test:user:user-1")).toBe("variant-a");
  });

  test("emits GA4 payloads for impressions, generic events, and conversions", () => {
    const gtagCalls = [];
    const analytics = createGa4Adapter({
      gtag: (...args) => gtagCalls.push(args),
      baseParams: { app_name: "split-tester" }
    });

    const engine = createEngine({
      analytics,
      getUserContext: () => ({ url: { pathname: "/pricing" }, user: { id: "user-1" } }),
      experiments: [createPricingExperiment()]
    });

    engine.trackEvent("viewed_pricing", { source: "hero" });

    expect(gtagCalls).toEqual([
      [
        "event",
        "viewed_pricing",
        expect.objectContaining({
          app_name: "split-tester",
          source: "hero",
          event_name: "viewed_pricing",
          page_path: "/pricing"
        })
      ],
      [
        "event",
        "split_test_impression",
        expect.objectContaining({
          app_name: "split-tester",
          experiment_id: "pricing-test",
          variant_id: "variant-a",
          page_path: "/pricing"
        })
      ],
      [
        "event",
        "split_test_conversion",
        expect.objectContaining({
          app_name: "split-tester",
          experiment_id: "pricing-test",
          variant_id: "variant-a",
          goal_id: "pricing_view",
          page_path: "/pricing"
        })
      ]
    ]);
  });
});

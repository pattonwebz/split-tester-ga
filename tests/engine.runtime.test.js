import test from "node:test";
import assert from "node:assert/strict";

import { createEngine } from "../src/engine/runtime.js";

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

test("registerExperiments is additive and rejects duplicate ids", () => {
  const engine = createEngine();

  engine.registerExperiments([
    {
      id: "exp-a",
      status: "active",
      variants: [
        { id: "control", weight: 50 },
        { id: "v1", weight: 50 }
      ]
    }
  ]);

  assert.throws(
    () =>
      engine.registerExperiments([
        {
          id: "exp-a",
          status: "active",
          variants: [
            { id: "control", weight: 50 },
            { id: "v2", weight: 50 }
          ]
        }
      ]),
    /Duplicate experiment id/
  );
});

test("assigns multiple experiments for the same page", () => {
  const engine = createEngine({
    getUserContext: () => ({
      url: { pathname: "/" },
      user: { id: "user-1" }
    }),
    experiments: [
      {
        id: "hero-test",
        status: "active",
        variants: [
          { id: "control", weight: 50 },
          { id: "v1", weight: 50 }
        ]
      },
      {
        id: "cta-color",
        status: "active",
        variants: [
          { id: "control", weight: 50 },
          { id: "v1", weight: 50 }
        ]
      }
    ]
  });

  const active = engine.getActiveExperimentsForPage();

  assert.equal(typeof active["hero-test"], "string");
  assert.equal(typeof active["cta-color"], "string");
});

test("persists sticky assignments across engine instances", () => {
  const storage = createStorage();
  const context = () => ({ url: { pathname: "/" }, user: { id: "user-1" } });
  const experiments = [
    {
      id: "sticky-test",
      status: "active",
      variants: [
        { id: "control", weight: 50 },
        { id: "variant-a", weight: 50 }
      ]
    }
  ];

  const first = createEngine({ getUserContext: context, experiments, storage });
  const firstVariant = first.getVariant("sticky-test");
  const second = createEngine({ getUserContext: context, experiments, storage });

  assert.equal(second.getVariant("sticky-test"), firstVariant);
});

test("uses priority for mutual exclusion groups", () => {
  const engine = createEngine({
    getUserContext: () => ({ url: { pathname: "/" }, user: { id: "user-1" } }),
    experiments: [
      {
        id: "checkout-a",
        status: "active",
        priority: 1,
        mutualExclusionGroup: "checkout",
        variants: [
          { id: "control", weight: 50 },
          { id: "v1", weight: 50 }
        ]
      },
      {
        id: "checkout-b",
        status: "active",
        priority: 10,
        mutualExclusionGroup: "checkout",
        variants: [
          { id: "control", weight: 50 },
          { id: "v2", weight: 50 }
        ]
      }
    ]
  });

  const active = engine.getActiveExperimentsForPage();

  assert.equal(active["checkout-a"], undefined);
  assert.equal(typeof active["checkout-b"], "string");
});

test("supports event-driven variant overrides", () => {
  const engine = createEngine({
    getUserContext: () => ({ url: { pathname: "/" }, user: { id: "user-1" } }),
    experiments: [
      {
        id: "pricing-test",
        status: "active",
        variants: [
          { id: "control", weight: 80 },
          { id: "high-intent", weight: 20 }
        ],
        variantRules: [
          {
            when: ({ events }) => events.includes("viewed_pricing"),
            variant: "high-intent"
          }
        ]
      }
    ]
  });

  const initial = engine.getVariant("pricing-test");
  assert.equal(typeof initial, "string");

  const updated = engine.trackEvent("viewed_pricing");
  assert.equal(updated["pricing-test"], "high-intent");
});

test("explicit assignment rules override sticky values", () => {
  const storage = createStorage();
  storage.setItem("split-tester:sticky-rule:user:user-1", "control");

  const engine = createEngine({
    storage,
    getUserContext: () => ({ url: { pathname: "/" }, user: { id: "user-1" } }),
    experiments: [
      {
        id: "sticky-rule",
        status: "active",
        variants: [
          { id: "control", weight: 50 },
          { id: "variant-a", weight: 50 }
        ],
        assignment: {
          forceVariant: ({ events }) => (events.includes("force_variant") ? "variant-a" : null)
        }
      }
    ]
  });

  const updated = engine.trackEvent("force_variant");

  assert.equal(updated["sticky-rule"], "variant-a");
  assert.equal(storage.getItem("split-tester:sticky-rule:user:user-1"), "variant-a");
});

test("accepts goals with multi-event mapping", () => {
  const engine = createEngine({
    experiments: [
      {
        id: "signup-flow",
        status: "active",
        variants: [
          { id: "control", weight: 50 },
          { id: "short-form", weight: 50 }
        ],
        goals: [
          {
            id: "signup-intent",
            events: ["cta_click", "form_start"]
          }
        ]
      }
    ]
  });

  assert.equal(typeof engine.getVariant("signup-flow"), "string");
});

import test from "node:test";
import assert from "node:assert/strict";

import { defineExperiments } from "../src/engine/contract.js";
import { validateExperimentConfig } from "../src/experiments/schema.js";

test("accepts a valid experiment config", () => {
  const experiment = {
    id: "hero-copy-test",
    status: "active",
    variants: [
      { id: "control", weight: 50 },
      { id: "v1", weight: 50 }
    ],
    targeting: ({ url }) => url.pathname === "/",
    mutualExclusionGroup: null,
    goals: [{ id: "signup_click", events: ["signup_click", "signup_submit"] }]
  };

  assert.doesNotThrow(() => validateExperimentConfig(experiment));
});

test("rejects duplicate experiment ids", () => {
  const experiments = [
    {
      id: "hero-copy-test",
      status: "active",
      variants: [
        { id: "control", weight: 50 },
        { id: "v1", weight: 50 }
      ]
    },
    {
      id: "hero-copy-test",
      status: "active",
      variants: [
        { id: "control", weight: 50 },
        { id: "v2", weight: 50 }
      ]
    }
  ];

  assert.throws(() => defineExperiments(experiments), /Duplicate experiment id/);
});

test("requires at least two variants", () => {
  const experiment = {
    id: "single-variant-test",
    status: "active",
    variants: [{ id: "control", weight: 100 }]
  };

  assert.throws(() => validateExperimentConfig(experiment), /at least two variants/);
});

test("accepts explicit assignment override and variant rules", () => {
  const experiment = {
    id: "pricing-test",
    status: "active",
    variants: [
      { id: "control", weight: 50 },
      { id: "high-intent", weight: 50 }
    ],
    assignment: {
      strategy: "sticky-hash",
      forceVariant: ({ context }) => (context.user?.tier === "pro" ? "high-intent" : null)
    },
    variantRules: [
      {
        when: ({ events }) => events.includes("viewed_pricing"),
        variant: "high-intent"
      }
    ]
  };

  assert.doesNotThrow(() => validateExperimentConfig(experiment));
});

# @pattonwebz/split-tester-client

Client-side split-testing engine for manually defined JavaScript experiments with GA4-friendly analytics hooks.

## Install

```bash
npm install @pattonwebz/split-tester-client
```

## ESM-only

This package is published as ESM-only.

## Public API

```js
import {
  createEngine,
  createGa4Adapter,
  defineExperiments
} from "@pattonwebz/split-tester-client";
```

## Basic usage

```js
const experiments = defineExperiments([
  {
    id: "hero-copy-test",
    status: "active",
    variants: [
      { id: "control", weight: 50 },
      { id: "v1", weight: 50 }
    ],
    goals: [
      {
        id: "signup-intent",
        events: ["cta_click", "form_start"]
      }
    ],
    variantRules: [
      {
        when: ({ events }) => events.includes("viewed_pricing"),
        variant: "v1"
      }
    ]
  }
]);

const engine = createEngine({
  experiments,
  analytics: createGa4Adapter({ gtag: window.gtag })
});

engine.getActiveExperimentsForPage();
engine.trackEvent("cta_click", { source: "hero" });
```

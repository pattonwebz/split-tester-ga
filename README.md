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
  createRuntime,
  installRuntime,
  createGa4Adapter,
  defineExperiments
} from "@pattonwebz/split-tester-client";
```

## Preferred usage

```js
import { installRuntime, createGa4Adapter } from "@pattonwebz/split-tester-client";

const splitTester = installRuntime({
  analytics: createGa4Adapter({ gtag: window.gtag }),
  getUserContext: () => ({
    url: { pathname: window.location.pathname },
    user: { id: window.__userId }
  })
});

splitTester.define(({ context }) => ({
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
      when: ({ events }) => events.includes("viewed_pricing") || context.url.pathname === "/pricing",
      variant: "v1"
    }
  ]
}));

splitTester.trackEvent("cta_click", { source: "hero" });
```

`installRuntime()` exposes a singleton on `window.splitTester` and accepts late `define(...)` calls, so other snippets can add tests after the base script loads.

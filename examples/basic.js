import { createGa4Adapter, installRuntime } from "../src/index.js";

const splitTester = installRuntime({
  analytics: createGa4Adapter({ gtag: window.gtag }),
  getUserContext: () => ({
    url: { pathname: window.location.pathname },
    user: { id: window.__userId, tier: window.__userTier }
  })
});

splitTester.define(({ context }) => ({
  id: "pricing-test",
  status: "active",
  variants: [
    { id: "control", weight: 50 },
    { id: "high-intent", weight: 50 }
  ],
  targeting: ({ url }) => url.pathname === "/pricing",
  assignment: {
    strategy: "sticky-hash",
    forceVariant: ({ context: runtimeContext }) =>
      runtimeContext.user?.tier === "pro" ? "high-intent" : null
  },
  variantRules: [
    {
      when: ({ events }) => events.includes("viewed_pricing") || context.url.pathname === "/pricing",
      variant: "high-intent"
    }
  ],
  goals: [
    {
      id: "pricing-cta-click",
      events: ["cta_click"]
    }
  ]
}));

const assignments = splitTester.getActiveExperimentsForPage();
console.log(assignments);

splitTester.trackEvent("viewed_pricing", { source: "hero" });

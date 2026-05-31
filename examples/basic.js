import { createEngine, createGa4Adapter, defineExperiments } from "../src/index.js";

const experiments = defineExperiments([
  {
    id: "pricing-test",
    status: "active",
    variants: [
      { id: "control", weight: 50 },
      { id: "high-intent", weight: 50 }
    ],
    targeting: ({ url }) => url.pathname === "/pricing",
    assignment: {
      strategy: "sticky-hash",
      forceVariant: ({ context }) => (context.user?.tier === "pro" ? "high-intent" : null)
    },
    variantRules: [
      {
        when: ({ events }) => events.includes("viewed_pricing"),
        variant: "high-intent"
      }
    ],
    goals: [
      {
        id: "pricing-cta-click",
        events: ["cta_click"]
      }
    ]
  }
]);

const engine = createEngine({
  experiments,
  getUserContext: () => ({
    url: { pathname: window.location.pathname },
    user: { id: window.__userId }
  }),
  analytics: createGa4Adapter({ gtag: window.gtag })
});

const assignments = engine.getActiveExperimentsForPage();
console.log(assignments);

engine.trackEvent("viewed_pricing", { source: "hero" });

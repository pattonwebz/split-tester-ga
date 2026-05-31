import {
  createEngine,
  createGa4Adapter,
  defineExperiments
} from "@pattonwebz/split-tester-client";

const root = document.getElementById("split-tester-ga-test-root");

if (root) {
  const experiments = defineExperiments([
    {
      id: "wp-hero-copy",
      status: "active",
      variants: [
        { id: "control", weight: 50 },
        { id: "variant", weight: 50 }
      ],
      targeting: ({ url }) => url.pathname.includes("split-tester"),
      assignment: {
        forceVariant: ({ context }) => (context.user?.tier === "pro" ? "variant" : null)
      },
      variantRules: [
        {
          when: ({ events }) => events.includes("viewed_wp_demo"),
          variant: "variant"
        }
      ],
      goals: [
        {
          id: "cta_click",
          events: ["clicked_cta"]
        }
      ]
    }
  ]);

  const engine = createEngine({
    experiments,
    getUserContext: () => ({
      url: { pathname: window.SplitTesterGaTest?.pathname || window.location.pathname },
      user: { tier: window.SplitTesterGaTest?.userTier || "free" },
      sessionId: "wp-test-session"
    }),
    analytics: createGa4Adapter({
      gtag: window.gtag
    })
  });

  const assignments = engine.getActiveExperimentsForPage();
  const currentVariant = assignments["wp-hero-copy"] || "unassigned";

  root.innerHTML = `
    <p><strong>Assignment:</strong> ${currentVariant}</p>
    <button type="button" id="split-tester-ga-test-button">Track click</button>
  `;

  const button = document.getElementById("split-tester-ga-test-button");
  if (button) {
    button.addEventListener("click", () => {
      engine.trackEvent("clicked_cta", { source: "wordpress-plugin" });
    });
  }

  engine.trackEvent("viewed_wp_demo", { source: "wordpress-plugin" });
}

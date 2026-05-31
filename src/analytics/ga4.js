const DEFAULT_EVENT_NAMES = Object.freeze({
  impression: "split_test_impression",
  conversion: "split_test_conversion"
});

function normalizePagePath(pagePath) {
  return typeof pagePath === "string" && pagePath.trim() !== "" ? pagePath : "/";
}

function addDefined(target, key, value) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}

export function buildGa4ImpressionPayload({
  experimentId,
  variantId,
  pagePath,
  payload = {},
  eventName = DEFAULT_EVENT_NAMES.impression
} = {}) {
  const params = { ...payload };
  addDefined(params, "experiment_id", experimentId);
  addDefined(params, "variant_id", variantId);
  addDefined(params, "page_path", normalizePagePath(pagePath));

  return { eventName, params };
}

export function buildGa4ConversionPayload({
  experimentId,
  variantId,
  goalId,
  pagePath,
  payload = {},
  eventName = DEFAULT_EVENT_NAMES.conversion
} = {}) {
  const params = { ...payload };
  addDefined(params, "experiment_id", experimentId);
  addDefined(params, "variant_id", variantId);
  addDefined(params, "goal_id", goalId);
  addDefined(params, "page_path", normalizePagePath(pagePath));

  return { eventName, params };
}

export function buildGa4EventPayload({
  eventName,
  experimentId,
  variantId,
  goalId,
  pagePath,
  payload = {}
} = {}) {
  const params = { ...payload };
  addDefined(params, "event_name", eventName);
  addDefined(params, "experiment_id", experimentId);
  addDefined(params, "variant_id", variantId);
  addDefined(params, "goal_id", goalId);
  addDefined(params, "page_path", normalizePagePath(pagePath));

  return { eventName, params };
}

function emit(gtag, eventName, params) {
  if (typeof gtag === "function") {
    gtag("event", eventName, params);
  }
}

/**
 * Creates a dependency-free GA4 adapter for engine analytics hooks.
 *
 * @param {{
 *   gtag: (...args: unknown[]) => void,
 *   eventNames?: { impression?: string, conversion?: string },
 *   baseParams?: Record<string, unknown>
 * }} options
 */
export function createGa4Adapter({ gtag, eventNames = {}, baseParams = {} } = {}) {
  if (typeof gtag !== "function") {
    throw new Error("createGa4Adapter requires a gtag-like function.");
  }

  const names = { ...DEFAULT_EVENT_NAMES, ...eventNames };

  return {
    trackImpression(input = {}) {
      const { eventName, params } = buildGa4ImpressionPayload({
        ...input,
        eventName: names.impression
      });
      emit(gtag, eventName, { ...baseParams, ...params });
    },

    trackConversion(input = {}) {
      const { eventName, params } = buildGa4ConversionPayload({
        ...input,
        eventName: names.conversion
      });
      emit(gtag, eventName, { ...baseParams, ...params });
    },

    trackEvent(input = {}) {
      const { eventName, params } = buildGa4EventPayload(input);
      emit(gtag, eventName, { ...baseParams, ...params });
    }
  };
}

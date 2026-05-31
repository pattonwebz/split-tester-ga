import { validateExperiments } from "../experiments/schema.js";
import { createAssignmentStore } from "../storage/assignment-store.js";

function defaultGetUserContext() {
  return { url: { pathname: "/" }, user: {} };
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function resolveUserKey(context) {
  if (context?.user && typeof context.user.id === "string" && context.user.id.trim() !== "") {
    return `user:${context.user.id}`;
  }

  if (typeof context?.sessionId === "string" && context.sessionId.trim() !== "") {
    return `session:${context.sessionId}`;
  }

  return "anonymous";
}

function getAssignmentKey(experimentId, context) {
  return `split-tester:${experimentId}:${resolveUserKey(context)}`;
}

function selectWeightedVariant(experiment, userKey) {
  const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
  const bucket = hashString(`${userKey}:${experiment.id}`) % totalWeight;

  let running = 0;
  for (const variant of experiment.variants) {
    running += variant.weight;
    if (bucket < running) {
      return variant.id;
    }
  }

  return experiment.variants[experiment.variants.length - 1].id;
}

function getPriority(experiment) {
  return experiment.priority ?? 0;
}

function assertKnownVariant(experiment, variantId) {
  if (!experiment.variants.some((variant) => variant.id === variantId)) {
    throw new Error(`Experiment "${experiment.id}" resolved unknown variant "${variantId}".`);
  }
}

function getGoalMatches(experiment, eventName) {
  if (!Array.isArray(experiment.goals)) {
    return [];
  }

  return experiment.goals.filter((goal) => Array.isArray(goal.events) && goal.events.includes(eventName));
}

/**
 * @param {import("./contract.js").EngineInitOptions} [options]
 */
export function createEngine(options = {}) {
  const analytics = options.analytics ?? {};
  const getUserContext = options.getUserContext ?? defaultGetUserContext;
  const assignmentStore = options.assignmentStore ?? createAssignmentStore(options.storage);

  /** @type {import("./contract.js").ExperimentConfig[]} */
  let experiments = [];
  const assignments = new Map();
  const emittedImpressions = new Set();
  const seenEvents = new Set();

  function registerExperiments(nextExperiments) {
    const merged = [...experiments, ...nextExperiments];
    experiments = validateExperiments(merged);
    return experiments;
  }

  if (options.experiments?.length) {
    registerExperiments(options.experiments);
  }

  function resolveExplicitVariant(experiment, context, eventNames) {
    const input = { context, events: eventNames };

    const forcedVariant = experiment.assignment?.forceVariant?.(input);
    if (forcedVariant) {
      assertKnownVariant(experiment, forcedVariant);
      return forcedVariant;
    }

    if (experiment.variantRules) {
      for (const rule of experiment.variantRules) {
        if (rule.when(input)) {
          assertKnownVariant(experiment, rule.variant);
          return rule.variant;
        }
      }
    }

    return null;
  }

  function readStickyVariant(experiment, context) {
    const stored = assignmentStore.get(getAssignmentKey(experiment.id, context));
    if (!stored) {
      return null;
    }

    if (!experiment.variants.some((variant) => variant.id === stored)) {
      assignmentStore.delete(getAssignmentKey(experiment.id, context));
      return null;
    }

    return stored;
  }

  function persistVariant(experiment, context, variantId) {
    const key = getAssignmentKey(experiment.id, context);
    assignmentStore.set(key, variantId);
    assignments.set(key, variantId);
  }

  function assignExperiment(experiment, context, eventNames) {
    const explicitVariant = resolveExplicitVariant(experiment, context, eventNames);
    if (explicitVariant) {
      persistVariant(experiment, context, explicitVariant);
      return explicitVariant;
    }

    const stickyVariant = readStickyVariant(experiment, context);
    if (stickyVariant) {
      assignments.set(getAssignmentKey(experiment.id, context), stickyVariant);
      return stickyVariant;
    }

    const existing = assignments.get(getAssignmentKey(experiment.id, context));
    if (existing) {
      return existing;
    }

    const userKey = resolveUserKey(context);
    const variantId = selectWeightedVariant(experiment, userKey);
    persistVariant(experiment, context, variantId);
    return variantId;
  }

  function shouldRunExperiment(experiment, context) {
    if (experiment.status !== "active") {
      return false;
    }

    if (!experiment.targeting) {
      return true;
    }

    return Boolean(experiment.targeting(context));
  }

  function getActiveExperimentsForPage(context = getUserContext()) {
    const eventNames = [...seenEvents];
    const active = experiments
      .filter((experiment) => shouldRunExperiment(experiment, context))
      .sort((left, right) => getPriority(right) - getPriority(left));

    const selectedGroups = new Set();
    const result = {};

    for (const experiment of active) {
      const group = experiment.mutualExclusionGroup;
      if (group && selectedGroups.has(group)) {
        continue;
      }

      const variantId = assignExperiment(experiment, context, eventNames);
      result[experiment.id] = variantId;

      if (group) {
        selectedGroups.add(group);
      }

      const impressionKey = `${resolveUserKey(context)}:${experiment.id}:${variantId}`;
      if (!emittedImpressions.has(impressionKey) && analytics.trackImpression) {
        analytics.trackImpression({
          experimentId: experiment.id,
          variantId,
          pagePath: context?.url?.pathname ?? "/"
        });
        emittedImpressions.add(impressionKey);
      }
    }

    return result;
  }

  function getVariant(experimentId, context = getUserContext()) {
    const assignmentsForPage = getActiveExperimentsForPage(context);
    return assignmentsForPage[experimentId] ?? null;
  }

  function trackEvent(eventName, payload = {}, context = getUserContext()) {
    seenEvents.add(eventName);

    if (analytics.trackEvent) {
      analytics.trackEvent({
        eventName,
        payload,
        pagePath: context?.url?.pathname ?? "/"
      });
    }

    const assignmentsForPage = getActiveExperimentsForPage(context);

    for (const experiment of experiments) {
      const variantId = assignmentsForPage[experiment.id];
      if (!variantId) {
        continue;
      }

      for (const goal of getGoalMatches(experiment, eventName)) {
        if (analytics.trackConversion) {
          analytics.trackConversion({
            experimentId: experiment.id,
            variantId,
            goalId: goal.id,
            eventName,
            payload,
            pagePath: context?.url?.pathname ?? "/"
          });
        }
      }
    }

    return assignmentsForPage;
  }

  function trackConversion(experimentId, goalId, payload = {}, context = getUserContext()) {
    const variantId = getVariant(experimentId, context);
    if (!variantId) {
      return null;
    }

    if (analytics.trackConversion) {
      analytics.trackConversion({
        experimentId,
        variantId,
        goalId,
        payload,
        pagePath: context?.url?.pathname ?? "/"
      });
    }

    return { experimentId, variantId, goalId };
  }

  return {
    registerExperiments,
    getActiveExperimentsForPage,
    getVariant,
    trackEvent,
    trackConversion
  };
}

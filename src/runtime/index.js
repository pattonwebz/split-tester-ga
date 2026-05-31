import { defineExperiments } from "../engine/contract.js";
import { createEngine } from "../engine/runtime.js";

const RUNTIME_KEY = Symbol.for("split-tester-client.runtime");

function normalizeDefinitions(definition, runtime) {
  const resolved =
    typeof definition === "function"
      ? definition({
          runtime,
          context: runtime.getUserContext(),
          experiments: runtime.listExperiments()
        })
      : definition;

  if (resolved === undefined || resolved === null) {
    return [];
  }

  return Array.isArray(resolved) ? resolved : [resolved];
}

function createQueue(runtime) {
  return {
    push(definition) {
      return runtime.define(definition);
    }
  };
}

export function createRuntime(options = {}) {
  const engine = createEngine(options);

  const runtime = {
    getUserContext: options.getUserContext ?? (() => ({ url: { pathname: "/" }, user: {} })),

    define(definition) {
      const configs = defineExperiments(normalizeDefinitions(definition, runtime));
      if (configs.length > 0) {
        engine.registerExperiments(configs);
      }
      return configs;
    },

    defineMany(definitions) {
      return runtime.define(definitions);
    },

    listExperiments() {
      return engine.listExperiments();
    },

    getActiveExperimentsForPage(context) {
      return engine.getActiveExperimentsForPage(context);
    },

    getVariant(experimentId, context) {
      return engine.getVariant(experimentId, context);
    },

    trackEvent(eventName, payload, context) {
      return engine.trackEvent(eventName, payload, context);
    },

    trackConversion(experimentId, goalId, payload, context) {
      return engine.trackConversion(experimentId, goalId, payload, context);
    }
  };

  return runtime;
}

export function installRuntime(options = {}, globalScope = globalThis) {
  const existing = globalScope[RUNTIME_KEY];
  if (existing) {
    return existing;
  }

  const runtime = createRuntime(options);
  const queue = createQueue(runtime);

  const preexistingQueue = globalScope.splitTesterQueue;
  if (Array.isArray(preexistingQueue)) {
    while (preexistingQueue.length > 0) {
      runtime.define(preexistingQueue.shift());
    }
  } else if (typeof preexistingQueue?.drain === "function") {
    preexistingQueue.drain();
  }

  globalScope.splitTester = runtime;
  globalScope.splitTesterQueue = queue;
  globalScope[RUNTIME_KEY] = runtime;

  return runtime;
}

export function getRuntime(globalScope = globalThis) {
  return globalScope[RUNTIME_KEY] ?? globalScope.splitTester ?? null;
}

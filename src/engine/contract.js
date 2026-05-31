import { validateExperiments } from "../experiments/schema.js";

/**
 * @typedef {Object} VariantConfig
 * @property {string} id
 * @property {number} weight
 */

/**
 * @typedef {Object} GoalConfig
 * @property {string} id
 * @property {string} [gaEventName]
 * @property {string[]} [events]
 */

/**
 * @typedef {Object} AssignmentConfig
 * @property {"sticky-hash"} [strategy]
 * @property {(input: AssignmentInput) => string|null|undefined} [forceVariant]
 */

/**
 * @typedef {Object} VariantRuleConfig
 * @property {(input: AssignmentInput) => boolean} when
 * @property {string} variant
 */

/**
 * @typedef {Object} ExperimentConfig
 * @property {string} id
 * @property {"draft"|"active"|"paused"} status
 * @property {VariantConfig[]} variants
 * @property {(context: UserContext) => boolean} [targeting]
 * @property {string|null} [mutualExclusionGroup]
 * @property {number} [priority]
 * @property {AssignmentConfig} [assignment]
 * @property {VariantRuleConfig[]} [variantRules]
 * @property {GoalConfig[]} [goals]
 */

/**
 * @typedef {Object} UserContext
 * @property {{ pathname: string }} url
 * @property {Record<string, unknown>} [user]
 * @property {string} [sessionId]
 */

/**
 * @typedef {Object} AssignmentInput
 * @property {UserContext} context
 * @property {string[]} events
 */

/**
 * @typedef {Object} AnalyticsAdapter
 * @property {(payload: Record<string, unknown>) => void} [trackImpression]
 * @property {(payload: { eventName: string, payload: Record<string, unknown>, pagePath?: string }) => void} [trackEvent]
 * @property {(payload: Record<string, unknown>) => void} [trackConversion]
 */

/**
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => string|null} [getItem]
 * @property {(key: string, value: string) => void} [setItem]
 * @property {(key: string) => void} [removeItem]
 */

/**
 * @typedef {Object} EngineInitOptions
 * @property {ExperimentConfig[]} experiments
 * @property {() => UserContext} [getUserContext]
 * @property {AnalyticsAdapter} [analytics]
 * @property {StorageAdapter} [storage]
 */

/**
 * Validates and returns experiment configs for runtime registration.
 *
 * @param {ExperimentConfig[]} experiments
 * @returns {ExperimentConfig[]}
 */
export function defineExperiments(experiments) {
  return validateExperiments(experiments);
}

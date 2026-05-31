const ALLOWED_STATUSES = new Set(["draft", "active", "paused"]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function validateVariant(variant, experimentId) {
  assertObject(variant, `Variant in experiment "${experimentId}"`);
  assertNonEmptyString(variant.id, `Variant id in experiment "${experimentId}"`);

  if (typeof variant.weight !== "number" || !Number.isFinite(variant.weight) || variant.weight <= 0) {
    throw new Error(`Variant "${variant.id}" in experiment "${experimentId}" must have a positive numeric weight.`);
  }
}

function validateVariantRules(experiment) {
  if (experiment.variantRules === undefined) {
    return;
  }

  if (!Array.isArray(experiment.variantRules)) {
    throw new Error(`Experiment "${experiment.id}" variantRules must be an array when provided.`);
  }

  for (const rule of experiment.variantRules) {
    assertObject(rule, `Variant rule in experiment "${experiment.id}"`);
    assertNonEmptyString(rule.variant, `Variant rule target in experiment "${experiment.id}"`);
    if (typeof rule.when !== "function") {
      throw new Error(`Variant rule "${rule.variant}" in experiment "${experiment.id}" must define a when function.`);
    }
  }
}

function validateAssignment(experiment) {
  if (experiment.assignment === undefined) {
    return;
  }

  assertObject(experiment.assignment, `Experiment "${experiment.id}" assignment`);

  if (experiment.assignment.strategy !== undefined && experiment.assignment.strategy !== "sticky-hash") {
    throw new Error(`Experiment "${experiment.id}" assignment.strategy must be "sticky-hash" when provided.`);
  }

  if (experiment.assignment.forceVariant !== undefined && typeof experiment.assignment.forceVariant !== "function") {
    throw new Error(`Experiment "${experiment.id}" assignment.forceVariant must be a function when provided.`);
  }
}

function validateGoal(goal, experimentId) {
  assertObject(goal, `Goal in experiment "${experimentId}"`);
  assertNonEmptyString(goal.id, `Goal id in experiment "${experimentId}"`);

  if (goal.gaEventName !== undefined) {
    assertNonEmptyString(goal.gaEventName, `Goal "${goal.id}" gaEventName in experiment "${experimentId}"`);
  }

  if (goal.events !== undefined) {
    if (!Array.isArray(goal.events) || goal.events.length === 0) {
      throw new Error(`Goal "${goal.id}" events in experiment "${experimentId}" must be a non-empty array.`);
    }
    for (const eventName of goal.events) {
      assertNonEmptyString(eventName, `Goal "${goal.id}" event name in experiment "${experimentId}"`);
    }
  }

  if (goal.gaEventName === undefined && goal.events === undefined) {
    throw new Error(`Goal "${goal.id}" in experiment "${experimentId}" must define gaEventName and/or events.`);
  }
}

export function validateExperimentConfig(experiment) {
  assertObject(experiment, "Experiment");
  assertNonEmptyString(experiment.id, "Experiment id");

  if (!ALLOWED_STATUSES.has(experiment.status)) {
    throw new Error(`Experiment "${experiment.id}" status must be one of: draft, active, paused.`);
  }

  if (!Array.isArray(experiment.variants) || experiment.variants.length < 2) {
    throw new Error(`Experiment "${experiment.id}" must define at least two variants.`);
  }

  let totalWeight = 0;
  const variantIds = new Set();
  for (const variant of experiment.variants) {
    validateVariant(variant, experiment.id);
    if (variantIds.has(variant.id)) {
      throw new Error(`Experiment "${experiment.id}" has duplicate variant id "${variant.id}".`);
    }
    variantIds.add(variant.id);
    totalWeight += variant.weight;
  }

  if (totalWeight <= 0) {
    throw new Error(`Experiment "${experiment.id}" must have a positive total variant weight.`);
  }

  if (experiment.targeting !== undefined && typeof experiment.targeting !== "function") {
    throw new Error(`Experiment "${experiment.id}" targeting must be a function when provided.`);
  }

  if (
    experiment.mutualExclusionGroup !== undefined &&
    experiment.mutualExclusionGroup !== null &&
    typeof experiment.mutualExclusionGroup !== "string"
  ) {
    throw new Error(`Experiment "${experiment.id}" mutualExclusionGroup must be a string or null when provided.`);
  }

  if (experiment.priority !== undefined && typeof experiment.priority !== "number") {
    throw new Error(`Experiment "${experiment.id}" priority must be a number when provided.`);
  }

  validateAssignment(experiment);
  validateVariantRules(experiment);

  if (experiment.goals !== undefined) {
    if (!Array.isArray(experiment.goals)) {
      throw new Error(`Experiment "${experiment.id}" goals must be an array when provided.`);
    }

    for (const goal of experiment.goals) {
      validateGoal(goal, experiment.id);
    }
  }

  if (experiment.variantRules) {
    for (const rule of experiment.variantRules) {
      if (!variantIds.has(rule.variant)) {
        throw new Error(`Experiment "${experiment.id}" variant rule points to unknown variant "${rule.variant}".`);
      }
    }
  }
}

export function validateExperiments(experiments) {
  if (!Array.isArray(experiments)) {
    throw new Error("Experiments must be provided as an array.");
  }

  const ids = new Set();
  for (const experiment of experiments) {
    validateExperimentConfig(experiment);

    if (ids.has(experiment.id)) {
      throw new Error(`Duplicate experiment id "${experiment.id}" is not allowed.`);
    }
    ids.add(experiment.id);
  }

  return experiments;
}

// FILE: index.ts
// PURPOSE: R-03 S250 public exports.

export * from "./types";
export { generateS250Org, orgStats } from "./seed-org";
export { generateS250Scenarios, FAILURE_CLASSES } from "./scenarios";
export { runScenarioPipeline, extractFromNaturalLanguage } from "./pipeline";
export { aggregateMetrics } from "./metrics";
export { runRepairLoop, repairScenarioSeed } from "./repair";
export { runS250Pressure } from "./run";
export type { S250RunReport } from "./run";
export {
  classifyS250ProofLevels,
  s250ProofSummary,
  s250ScaleProven,
} from "./proof-levels";
export type { S250ProofLevel, S250ProofLevelId } from "./proof-levels";
export { structuralCounts, validateOrgGraph } from "./validate-graph";
export type { StructuralCounts, GraphValidation } from "./validate-graph";
export {
  provisionS250Structural,
  assertStructuralHonesty,
} from "./canonical-provision";
export type { StructuralEnterprise, ProvisionPath } from "./canonical-provision";
export {
  sampleIdentityRuntime,
  runAllIdentityRuntimeSamples,
} from "./runtime-sample";
export { runS250Concurrency } from "./concurrency";
export { runL02AgainstS250 } from "./l02-s250";
export {
  generateMessyMultiSource,
  scoreMessyMultiSource,
} from "./v02-messy-sources";
export {
  runS250AcceptanceGate,
  S250_ACCEPTANCE_TARGETS,
} from "./acceptance-gate";
export type { S250AcceptanceReport } from "./acceptance-gate";

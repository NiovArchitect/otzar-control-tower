// FILE: extraction-source.ts
// PURPOSE: Phase 1278 — make the polyglot runtime fabric VISIBLE in the
//          employee's actual conversation-to-work flow. When Otzar turns
//          a conversation into a work artifact, the card honestly states
//          which runtime produced the extraction: the deterministic
//          TypeScript planner (today's default) or Python enrichment
//          (only when the Python worker is genuinely HEALTHY). Never
//          claims "Python enrichment" when Python is not configured.
// CONNECTS TO: api.system.runtimeCapabilities (python_worker.status),
//          command-planner output, WorkArtifactCard.

export type PythonRuntimeStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED_UNVERIFIED"
  | "HEALTHY"
  | "UNHEALTHY"
  | "DISABLED"
  | null; // null = registry not yet read

// WHAT: The honest extraction-source label for a work artifact.
// INPUT: the live python_worker status from the runtime registry.
// OUTPUT: a short, truthful label.
// WHY: Employees should see the runtime truth in their daily flow —
//      deterministic fallback is named as such; Python enrichment is
//      claimed ONLY when the worker actually health-checks.
export function extractionSourceLabel(python: PythonRuntimeStatus): string {
  switch (python) {
    case "HEALTHY":
      return "Python enrichment used";
    case "UNHEALTHY":
      return "Deterministic extraction (Python enrichment unhealthy — fallback)";
    case "NOT_CONFIGURED":
    case "DISABLED":
      return "Deterministic extraction (Python enrichment unavailable)";
    case "CONFIGURED_UNVERIFIED":
      return "Deterministic extraction (Python enrichment not yet verified)";
    default:
      return "Deterministic extraction";
  }
}

// WHAT: Whether Python enrichment was actually applied (vs. fallback).
// WHY: Guards against ever rendering a "Python-powered" claim that isn't
//      backed by a healthy worker + a real dispatch.
export function pythonEnrichmentApplied(python: PythonRuntimeStatus): boolean {
  return python === "HEALTHY";
}

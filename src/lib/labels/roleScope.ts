// FILE: roleScope.ts
// PURPOSE: Customer-safe labels for the My Twin role-scope profile
//          (ADR-0053 Wave 2A). The fixed substrate-style literals are
//          mapped to calm, enterprise-friendly copy; the backend's
//          already-friendly free-text fields (scope_label, postures,
//          assistance boundaries) are rendered verbatim by the panel.
// CONNECTS TO: src/components/employee/RoleScopeProfilePanel.tsx.
//
// The observation-mode literal MUST render as anti-surveillance copy;
// the panel never frames the Twin as monitoring or policing the human.

// WHAT: Map the observation-mode literal to anti-surveillance copy.
export function labelObservationMode(mode: string): string {
  return mode === "PERMISSIONED_WORK_CONTEXT_NOT_SURVEILLANCE"
    ? "Permissioned work context, not surveillance."
    : "Permissioned work context.";
}

// WHAT: Map the sensitive-actions literal to a friendly noun phrase.
export function labelSensitiveActions(value: string): string {
  return value === "PERMISSION_POLICY_OR_APPROVAL"
    ? "permission, policy, or approval"
    : "permission, policy, or approval";
}

// WHAT: Map a configuration/availability status literal to plain copy.
export function labelConfigStatus(value: string): string {
  switch (value) {
    case "CONFIGURED":
      return "Configured";
    case "AVAILABLE":
      return "Available";
    case "NOT_CONFIGURED":
      return "Not configured";
    default:
      return "Not configured";
  }
}

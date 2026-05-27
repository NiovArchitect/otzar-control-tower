// FILE: transparency.ts
// PURPOSE: Customer-safe labels for the Wave 1 chat transparency contract
//          (ADR-0051). Translates governed retrieval/scope/verification
//          tokens into calm, product-safe copy. Substrate tokens (e.g.
//          COE_ASSEMBLE_CONTEXT) are NEVER shown literally; unknown enum
//          values fall back to a title-cased safe string.
// CONNECTS TO: src/components/employee/TransparencyPanel.tsx.

// WHAT: Title-case a SCREAMING_SNAKE / lower token safely.
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// WHAT: Friendly label for retrieval_status.
export function labelRetrievalStatus(status: string): string {
  switch (status) {
    case "USED":
      return "Context used";
    case "NO_MATCHES":
      return "No matching context found";
    case "DEGRADED":
      return "Context lookup degraded";
    case "SKIPPED":
      return "Context lookup skipped";
    default:
      return "Context status unavailable";
  }
}

// WHAT: Friendly label for a context item's scope. UNKNOWN never leaks.
export function labelScope(scope: string): string {
  switch (scope) {
    case "PERSONAL":
      return "Your personal context";
    case "ENTERPRISE":
      return "Enterprise context";
    case "UNKNOWN":
    default:
      return "Scoped context";
  }
}

// WHAT: Friendly label for verification_status. NOT_ACTIVE -> not active yet.
export function labelVerificationStatus(status: string): string {
  return status === "NOT_ACTIVE" ? "Not active yet" : titleCase(status);
}

// WHAT: Friendly label for a context item's source_type. The governed
//       retrieval source token is never shown literally.
export function labelSourceType(source: string): string {
  switch (source) {
    case "COE_ASSEMBLE_CONTEXT":
      return "Governed context layer";
    default:
      return titleCase(source);
  }
}

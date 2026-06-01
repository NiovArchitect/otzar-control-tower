// FILE: src/lib/dandelion-activation/labels.ts
// PURPOSE: Human-readable labels for the D6 starter-pilot activation
//          step audit_literal strings. The mapping is the CT-side
//          customer-admin vocabulary translation of the Foundation
//          catalog's audit_literal values per the customer-admin
//          vocabulary discipline canonical at src/lib/nav.ts
//          (Foundation talks "ADMIN_ACTION:DMW_BASELINE_GRANTED";
//          customers see "Opened the memory baseline").
//
//          The mapping is closed — every catalog step has exactly
//          one label. An unknown audit_literal falls back to a
//          short scrubbed projection of the literal so the UI can
//          still render the step, but the test suite asserts every
//          known literal has a non-fallback entry.
// CONNECTS TO: src/pages/Onboarding.tsx (consumer),
//              docs/dandelion-activation/starter-pilot-activation.json
//              (Foundation source).

export interface StepLabel {
  /** Customer-admin label, no Foundation jargon. */
  title: string;
  /** Short one-sentence customer-facing summary. */
  summary: string;
}

const KNOWN_STEP_LABELS: Readonly<Record<string, StepLabel>> = Object.freeze({
  "ADMIN_ACTION:ENVELOPE_ACTIVATION_PRECHECK": {
    title: "Verified that the envelope is ready to activate",
    summary:
      "Confirmed the envelope has not been activated before and that you have admin access for this organization.",
  },
  "ADMIN_ACTION:DMW_BASELINE_GRANTED": {
    title: "Opened the memory baseline",
    summary:
      "Activated the baseline memory wallet for your organization. Always included at the base tier.",
  },
  "ADMIN_ACTION:ROLE_TEMPLATE_ASSIGNED": {
    title: "Assigned starter role templates",
    summary:
      "Registered the admin + standard twin role templates scoped to the pilot department.",
  },
  "ADMIN_ACTION:WORKFLOW_TEMPLATE_REGISTERED": {
    title: "Registered Stage 1 workflow templates",
    summary:
      "Made Stage 1 workflow templates visible to the assigned roles. Templates describe; they do not execute.",
  },
  "ADMIN_ACTION:AHA_MOMENT_REGISTERED": {
    title: "Registered first-week aha moments",
    summary:
      "Made safe-fallback first-week activation hints visible to the assigned roles.",
  },
  "ADMIN_ACTION:STARTER_ENVELOPE_ACTIVATED": {
    title: "Envelope marked as activated",
    summary:
      "All preceding steps succeeded; the starter envelope is now in the activated state.",
  },
});

export function getStepLabel(auditLiteral: string): StepLabel {
  const known = KNOWN_STEP_LABELS[auditLiteral];
  if (known !== undefined) return known;
  // Fallback for unknown literals — never echo the raw literal as-is
  // since it includes the ADMIN_ACTION: prefix that's Foundation
  // jargon. Strip the prefix and convert SCREAMING_SNAKE to title.
  const subString = auditLiteral.startsWith("ADMIN_ACTION:")
    ? auditLiteral.slice("ADMIN_ACTION:".length)
    : auditLiteral;
  const title = subString
    .toLowerCase()
    .split("_")
    .map((w) => (w.length === 0 ? "" : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
  return {
    title,
    summary: "An activation step was recorded.",
  };
}

export function getKnownStepLiterals(): ReadonlyArray<string> {
  return Object.keys(KNOWN_STEP_LABELS);
}

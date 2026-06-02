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
  "ADMIN_ACTION:DMW_TEAM_SCOPE_GRANTED": {
    title: "Extended memory to the team scope",
    summary:
      "Added a team-scoped memory extension on top of the baseline. Self-scoped + team-scoped only at this tier.",
  },
  "ADMIN_ACTION:DMW_PROJECT_CUSTOMER_SCOPE_GRANTED": {
    title: "Extended memory to project + customer scopes",
    summary:
      "Added project-scoped and customer-scoped memory extensions on top of the baseline. Available at the Business plan tier.",
  },
  "ADMIN_ACTION:DELEGATED_AUTHORITY_REGISTERED": {
    title: "Registered delegated authority profiles",
    summary:
      "Recorded the delegated authority profiles in the audit trail. Ceiling enforcement: delegated authority never exceeds the human ceiling (RULE 0).",
  },
  "ADMIN_ACTION:ADVANCED_AUDIT_TIER_ENABLED": {
    title: "Enabled the advanced audit tier",
    summary:
      "Recorded the advanced audit tier in the audit trail. The baseline audit chain stays on; the advanced tier extends it (never weakens it).",
  },
  "ADMIN_ACTION:DMW_ENTERPRISE_SCOPE_GRANTED": {
    title: "Extended memory to full enterprise scope",
    summary:
      "Added team + project + customer + regulator-observable memory extensions on top of the baseline. Available at the Enterprise plan tier.",
  },
  "ADMIN_ACTION:BREAK_GLASS_REGISTRY_ENABLED": {
    title: "Enabled the break-glass grant registry",
    summary:
      "Recorded at the audit tier; underlying substrate forward-substrate. Break-glass grants will be time-boxed with mandatory post-hoc two-person review (GOVSEC.5 / ADR-0050).",
  },
  "ADMIN_ACTION:LAWFUL_BASIS_ATTESTATION_ENABLED": {
    title: "Enabled the lawful-basis attestation surface",
    summary:
      "Recorded at the audit tier; underlying substrate forward-substrate. Regulator-grade attestation chain becomes available for future regulator-access workflows (ADR-0036).",
  },
  "ADMIN_ACTION:BOARD_OBSERVER_SCOPE_REGISTERED": {
    title: "Registered the board observer scope",
    summary:
      "Recorded at the audit tier; underlying substrate forward-substrate. Aggregate-only projection for designated board observers; no per-employee detail.",
  },
  "ADMIN_ACTION:WORKFLOW_TEMPLATE_REGISTERED_DUAL_CONTROL": {
    title: "Registered Stage 2 enterprise workflow templates",
    summary:
      "Recorded the catalog's design-intent that this step is dual-control-bound (ADR-0026). The actual dual-control approval flow is forward-substrate.",
  },
  "ADMIN_ACTION:REGULATOR_GRADE_AUDIT_ENABLED_DUAL_CONTROL": {
    title: "Enabled the regulator-grade audit tier",
    summary:
      "Recorded the catalog's design-intent that this step is dual-control-bound (ADR-0026). The actual dual-control approval flow is forward-substrate.",
  },
  "ADMIN_ACTION:ROLE_TEMPLATE_ASSIGNED": {
    title: "Assigned starter role templates",
    summary:
      "Registered the admin + standard twin role templates scoped to the pilot department.",
  },
  "ADMIN_ACTION:CONNECTOR_BINDING_REGISTERED": {
    title: "Registered the Slack read-first binding",
    summary:
      "Saved the SLACK_READ binding scoped to your organization. The env-var NAME is stored; the resolved bot token never crosses the API boundary.",
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
    .map((w) => {
      if (w.length === 0) return "";
      const first = w.charAt(0);
      return first.toUpperCase() + w.slice(1);
    })
    .join(" ");
  return {
    title,
    summary: "An activation step was recorded.",
  };
}

export function getKnownStepLiterals(): ReadonlyArray<string> {
  return Object.keys(KNOWN_STEP_LABELS);
}

// FILE: role-template-skills.ts
// PURPOSE: G-01 — Role-templated AI Teammates ship with skills that let
//          them act on the user's behalf. Each role_template maps to
//          default skill packages (matched by name/category against the
//          Foundation SkillPackage catalog). Pure + testable.
// CONNECTS TO: TwinDetailDrawer Skills, ApplyRoleTemplateSkillsButton,
//          FOUNDER G-01.

import type { SkillPackage } from "@/lib/types/foundation";

/** Normalized role template slug (lowercase, hyphen/underscore ok). */
export type RoleTemplateSlug = string;

/**
 * Default skill intents for a role template.
 * Matched against SkillPackage.name + category (case-insensitive substring).
 * Order is preference order when multiple packages match.
 */
export interface RoleTemplateSkillIntent {
  /** Human label for the skill capability (product copy). */
  label: string;
  /** Substrings that match package name or category. */
  match: ReadonlyArray<string>;
}

/**
 * Closed catalog: templated roles → skill intents.
 * Templates without an entry still get GENERAL defaults.
 */
export const ROLE_TEMPLATE_SKILL_INTENTS: Readonly<
  Record<string, ReadonlyArray<RoleTemplateSkillIntent>>
> = {
  // Executive / leadership
  ceo: [
    { label: "Executive briefings", match: ["executive", "briefing", "strategy"] },
    { label: "Decision support", match: ["decision", "approval", "board"] },
    { label: "Cross-team coordination", match: ["coordination", "collaboration", "org"] },
  ],
  founder: [
    { label: "Executive briefings", match: ["executive", "briefing", "strategy"] },
    { label: "Decision support", match: ["decision", "approval"] },
    { label: "Hiring & org", match: ["hiring", "people", "org"] },
  ],
  cto: [
    { label: "Architecture & engineering", match: ["engineering", "architecture", "technical"] },
    { label: "Security oversight", match: ["security", "risk", "compliance"] },
    { label: "AI/ML oversight", match: ["ai", "ml", "model"] },
  ],
  cmo: [
    { label: "Campaigns & launches", match: ["campaign", "marketing", "launch"] },
    { label: "Brand & messaging", match: ["brand", "messaging", "content"] },
    { label: "Pipeline influence", match: ["pipeline", "sales", "gtm"] },
  ],
  cfo: [
    { label: "Finance ops", match: ["finance", "accounting", "budget"] },
    { label: "Forecasting", match: ["forecast", "planning"] },
    { label: "Compliance", match: ["compliance", "audit", "risk"] },
  ],
  // Sales / GTM
  "sales-manager": [
    { label: "Pipeline coaching", match: ["pipeline", "sales", "crm"] },
    { label: "Forecast", match: ["forecast", "deal"] },
    { label: "Discount & approval", match: ["approval", "discount", "quote"] },
  ],
  "account-executive": [
    { label: "Deal support", match: ["sales", "deal", "crm", "pipeline"] },
    { label: "Outreach drafting", match: ["email", "outreach", "draft", "writing"] },
    { label: "Meeting prep", match: ["meeting", "calendar", "brief"] },
  ],
  "account-executive-ae": [
    { label: "Deal support", match: ["sales", "deal", "crm"] },
    { label: "Outreach drafting", match: ["email", "outreach", "draft"] },
  ],
  sdr: [
    { label: "Outbound sequences", match: ["outbound", "sales", "outreach"] },
    { label: "Lead research", match: ["research", "lead", "prospect"] },
  ],
  // Product / eng
  "product-manager": [
    { label: "Roadmap & specs", match: ["product", "roadmap", "spec"] },
    { label: "Customer insight", match: ["customer", "feedback", "research"] },
    { label: "Delivery coordination", match: ["coordination", "project", "delivery"] },
  ],
  "product-lead": [
    { label: "Roadmap & specs", match: ["product", "roadmap"] },
    { label: "Cross-team delivery", match: ["delivery", "project", "coordination"] },
  ],
  "ai-engineer": [
    { label: "Model & eval work", match: ["ai", "ml", "model", "eval"] },
    { label: "Engineering support", match: ["engineering", "code", "technical"] },
  ],
  "ml-engineer": [
    { label: "ML pipelines", match: ["ml", "model", "data"] },
    { label: "Engineering support", match: ["engineering", "technical"] },
  ],
  "software-engineer": [
    { label: "Engineering support", match: ["engineering", "code", "technical", "dev"] },
    { label: "Docs & RFCs", match: ["document", "writing", "spec"] },
  ],
  // People ops
  "people-ops": [
    { label: "People workflows", match: ["people", "hr", "hiring"] },
    { label: "Onboarding", match: ["onboarding", "employee"] },
  ],
  "hr-manager": [
    { label: "People workflows", match: ["people", "hr"] },
    { label: "Policy & compliance", match: ["policy", "compliance"] },
  ],
  // Support / ops
  "support-lead": [
    { label: "Support triage", match: ["support", "ticket", "customer"] },
    { label: "Escalation", match: ["escalation", "incident"] },
  ],
  "operations-manager": [
    { label: "Ops coordination", match: ["operations", "ops", "process"] },
    { label: "Vendor & tools", match: ["vendor", "tools", "procurement"] },
  ],
  // Comms
  "pr-lead": [
    { label: "PR & messaging", match: ["pr", "press", "comms", "brand"] },
    { label: "External drafts", match: ["writing", "draft", "content"] },
  ],
  // General
  employee: [
    { label: "Daily work support", match: ["productivity", "work", "general", "assistant"] },
    { label: "Writing & drafts", match: ["writing", "draft", "email"] },
    { label: "Calendar & meetings", match: ["calendar", "meeting", "schedule"] },
  ],
  "general-employee": [
    { label: "Daily work support", match: ["productivity", "work", "general", "assistant"] },
    { label: "Writing & drafts", match: ["writing", "draft", "email"] },
    { label: "Calendar & meetings", match: ["calendar", "meeting"] },
  ],
  contractor: [
    { label: "Scoped delivery", match: ["project", "delivery", "contractor"] },
    { label: "Writing & drafts", match: ["writing", "draft"] },
  ],
  manager: [
    { label: "Team coordination", match: ["team", "management", "coordination"] },
    { label: "Approvals & reviews", match: ["approval", "review"] },
    { label: "1:1 and coaching", match: ["coaching", "people", "feedback"] },
  ],
  executive: [
    { label: "Executive briefings", match: ["executive", "briefing", "strategy"] },
    { label: "Decision support", match: ["decision", "approval"] },
  ],
};

/** Fallback when template is unknown or empty — still acts as a work partner. */
export const GENERAL_ROLE_SKILL_INTENTS: ReadonlyArray<RoleTemplateSkillIntent> =
  ROLE_TEMPLATE_SKILL_INTENTS["general-employee"] ?? [
    { label: "Daily work support", match: ["productivity", "assistant", "general"] },
    { label: "Writing & drafts", match: ["writing", "draft"] },
  ];

export function normalizeRoleTemplateSlug(
  roleTemplate: string | null | undefined,
): string {
  if (typeof roleTemplate !== "string") return "";
  return roleTemplate
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function skillIntentsForRoleTemplate(
  roleTemplate: string | null | undefined,
): ReadonlyArray<RoleTemplateSkillIntent> {
  const slug = normalizeRoleTemplateSlug(roleTemplate);
  if (slug.length === 0) return GENERAL_ROLE_SKILL_INTENTS;
  if (ROLE_TEMPLATE_SKILL_INTENTS[slug]) {
    return ROLE_TEMPLATE_SKILL_INTENTS[slug]!;
  }
  // Fuzzy: try prefix match on catalog keys
  for (const key of Object.keys(ROLE_TEMPLATE_SKILL_INTENTS)) {
    if (slug.includes(key) || key.includes(slug)) {
      return ROLE_TEMPLATE_SKILL_INTENTS[key]!;
    }
  }
  return GENERAL_ROLE_SKILL_INTENTS;
}

function packageMatchesIntent(
  pkg: SkillPackage,
  intent: RoleTemplateSkillIntent,
): boolean {
  const hay = `${pkg.name} ${pkg.category} ${(pkg.description ?? "")}`.toLowerCase();
  return intent.match.some((m) => hay.includes(m.toLowerCase()));
}

/**
 * Resolve which catalog packages to assign for a role template.
 * One package per intent (first match); skips already-assigned packages.
 */
export function resolveSkillPackagesForRoleTemplate(input: {
  roleTemplate: string | null | undefined;
  catalog: ReadonlyArray<SkillPackage>;
  alreadyAssignedPackageIds?: ReadonlyArray<string>;
}): {
  roleTemplateSlug: string;
  intents: ReadonlyArray<RoleTemplateSkillIntent>;
  toAssign: SkillPackage[];
  matchedLabels: string[];
  unmatchedLabels: string[];
} {
  const slug = normalizeRoleTemplateSlug(input.roleTemplate);
  const intents = skillIntentsForRoleTemplate(input.roleTemplate);
  const assigned = new Set(input.alreadyAssignedPackageIds ?? []);
  const used = new Set<string>();
  const toAssign: SkillPackage[] = [];
  const matchedLabels: string[] = [];
  const unmatchedLabels: string[] = [];

  for (const intent of intents) {
    const hit = input.catalog.find(
      (pkg) =>
        !assigned.has(pkg.package_id) &&
        !used.has(pkg.package_id) &&
        packageMatchesIntent(pkg, intent),
    );
    if (hit) {
      toAssign.push(hit);
      used.add(hit.package_id);
      matchedLabels.push(intent.label);
    } else {
      unmatchedLabels.push(intent.label);
    }
  }

  return {
    roleTemplateSlug: slug || "general",
    intents,
    toAssign,
    matchedLabels,
    unmatchedLabels,
  };
}

export function roleTemplateSkillsSummary(input: {
  roleTemplate: string | null | undefined;
  catalog: ReadonlyArray<SkillPackage>;
  alreadyAssignedPackageIds?: ReadonlyArray<string>;
}): string {
  const r = resolveSkillPackagesForRoleTemplate(input);
  if (r.toAssign.length === 0 && (input.alreadyAssignedPackageIds?.length ?? 0) > 0) {
    return "Role template skills already assigned.";
  }
  if (r.toAssign.length === 0) {
    return r.unmatchedLabels.length > 0
      ? `No matching skill packages in catalog for this role template (${r.unmatchedLabels.join(", ")}).`
      : "No skill packages available to assign.";
  }
  return `Will assign ${r.toAssign.length} skill package(s) for this role template: ${r.toAssign.map((p) => p.name).join(", ")}.`;
}

/**
 * True when a templated twin is missing skills it should have for its role.
 */
export function needsRoleTemplateSkills(input: {
  roleTemplate: string | null | undefined;
  catalog: ReadonlyArray<SkillPackage>;
  alreadyAssignedPackageIds: ReadonlyArray<string>;
}): boolean {
  return (
    resolveSkillPackagesForRoleTemplate(input).toAssign.length > 0
  );
}

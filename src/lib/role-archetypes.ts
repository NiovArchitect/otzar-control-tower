// FILE: role-archetypes.ts
// PURPOSE: Phase 1218 (Wave 2.1) — closed-vocab CT registry of the
//          13 role archetypes the Founder listed. Maps each role_key
//          to a friendly display_name, plain-language description,
//          default risk surface, dashboard module hints, approval
//          gates, collaboration scope, memory scope, and the
//          Warmwind-language one-liner Otzar uses to brief the role
//          (the AI Twin briefing).
//
// SCOPE:
//   - This is a CT-side registry. Foundation's
//     EntityMembership.role_title is already a free-form string;
//     matching is case-insensitive on the canonical key. A future
//     bounded slice can promote this to a Foundation RoleArchetype
//     model + seed.
//   - The registry is consumed by MyOrganization (Phase 1217) to
//     surface the role's plain-language description + suggested
//     dashboard modules on the "Your place" card.
//   - Future phases plug role-aware Twin behavior + approval gates
//     into Foundation.
//
// PRIVACY / GOVERNANCE:
//   - The registry is static metadata about ROLES, not about
//     specific people. No TAR / wallet / clearance / permission
//     internals.
//   - Approval gates documented here are HINTS for the UI; the
//     load-bearing approval enforcement stays in Foundation's
//     ActionPolicy + dual-control mediator (ADR-0057 / ADR-0026
//     / Phase 1209).

export type RoleKey =
  | "CTO"
  | "CMO"
  | "SALES_MANAGER"
  | "PR_LEAD"
  | "AI_ENGINEER"
  | "ML_ENGINEER"
  | "RESEARCHER"
  | "DATA_SCIENTIST"
  | "UX_RESEARCHER"
  | "SUPPORT_LEAD"
  | "OPERATIONS_MANAGER"
  | "GENERAL_EMPLOYEE"
  | "INVESTOR_OBSERVER";

export interface RoleArchetype {
  role_key: RoleKey;
  display_name: string;
  description: string;
  /** Highest-risk area Otzar surfaces for this role -- e.g.
   *  "Architecture / security / AI oversight" for the CTO. Used
   *  to seed role-aware dashboards. */
  default_risk_surface: string;
  /** Dashboard module hints, ordered. The Wave-2.2 role-aware
   *  My Day landing will render the top 3-5. */
  default_dashboard_modules: ReadonlyArray<string>;
  /** Closed-vocab approval-gate hints. The actual enforcement is in
   *  Foundation's ActionPolicy. */
  approval_gates: ReadonlyArray<string>;
  /** Plain-language scope description for collaboration. */
  collaboration_scope: string;
  /** Plain-language scope description for memory. */
  memory_scope: string;
  /** Actions the role should NOT take. */
  restricted_actions: ReadonlyArray<string>;
  /** Plain-language description of how the role escalates. */
  escalation_rules: string;
  /** One-line briefing for the AI Twin -- this is the
   *  Warmwind-language sentence Otzar speaks when introducing
   *  itself to the role. */
  ai_twin_briefing: string;
}

export const ROLE_ARCHETYPES: ReadonlyArray<RoleArchetype> = [
  {
    role_key: "CTO",
    display_name: "CTO",
    description:
      "Architecture decision authority, infrastructure + security risk surface, AI/ML oversight.",
    default_risk_surface: "Architecture / security / AI oversight",
    default_dashboard_modules: [
      "Architecture decisions",
      "Security and infrastructure alerts",
      "AI/ML oversight",
      "Engineering risk",
      "Deployment readiness",
      "Technical approvals",
      "Cross-team dependency map",
    ],
    approval_gates: [
      "High-risk technical change",
      "AI/ML deployment",
      "Vendor/tooling addition",
      "Security or privacy escalation",
    ],
    collaboration_scope:
      "Engineering, security, AI/ML; cross-team coordination across the company.",
    memory_scope:
      "Architecture decisions, incident records, vendor evaluations, AI/ML safety review notes.",
    restricted_actions: [
      "Direct production data write without policy review",
      "External AI/ML model deployment without safety review",
    ],
    escalation_rules:
      "Security and privacy issues escalate to CEO/Legal; AI/ML model risks escalate to AI Engineer + Compliance.",
    ai_twin_briefing:
      "I'm your technical second seat: architecture decisions, infrastructure and security risk, and AI/ML oversight. I draft; you approve.",
  },
  {
    role_key: "CMO",
    display_name: "CMO / Marketing Lead",
    description:
      "Campaign planning, launch communications, brand risk, pipeline influence.",
    default_risk_surface: "Brand / launch communications / pipeline influence",
    default_dashboard_modules: [
      "Campaigns",
      "Launch calendar",
      "Brand risk",
      "Audience insights",
      "Pipeline influence",
      "Marketing approvals",
      "Communications alignment",
    ],
    approval_gates: [
      "Sensitive campaign messaging",
      "Public launch announcements",
      "Brand-risk-elevated statements",
    ],
    collaboration_scope:
      "Marketing, sales, PR, design, executive alignment; customer-facing materials.",
    memory_scope:
      "Campaign briefs, launch calendars, brand voice references, market positioning notes.",
    restricted_actions: [
      "Send public launch communications without CEO/legal approval",
      "Make competitive positioning claims without review",
    ],
    escalation_rules:
      "Sensitive campaigns escalate to CEO/Legal; brand-risk statements escalate to PR Lead.",
    ai_twin_briefing:
      "I'm your marketing second seat: campaigns, launches, brand risk, and pipeline influence. I draft; you approve.",
  },
  {
    role_key: "SALES_MANAGER",
    display_name: "Sales Manager",
    description:
      "Pipeline coaching, forecast, discount approval gating, rep performance.",
    default_risk_surface: "Forecast / discount approvals / deal risk",
    default_dashboard_modules: [
      "Pipeline coaching",
      "Forecast",
      "Deal risk",
      "Discount approvals",
      "Rep activity",
      "Customer commitments",
      "Handoff risks",
    ],
    approval_gates: [
      "Discount above policy threshold",
      "Custom contract terms",
      "Pricing exception",
    ],
    collaboration_scope:
      "Sales team, customer success handoff, marketing alignment.",
    memory_scope:
      "Pipeline notes, deal-risk flags, rep performance summaries, customer commitments.",
    restricted_actions: [
      "Approve pricing exception above threshold without VP Sales sign-off",
      "Share rep performance data outside the sales chain",
    ],
    escalation_rules:
      "Pricing exceptions escalate to VP Sales; deal risk escalates to CRO.",
    ai_twin_briefing:
      "I'm your sales second seat: pipeline coaching, forecast, discount gating, and deal risk. I draft; you approve.",
  },
  {
    role_key: "PR_LEAD",
    display_name: "PR / Communications Lead",
    description:
      "Press briefs, crisis response, media triage, executive talking points.",
    default_risk_surface: "Public statements / crisis response",
    default_dashboard_modules: [
      "Press brief",
      "Crisis response",
      "Media triage",
      "Executive talking points",
      "Approval-gated statements",
      "Brand risk",
      "Active narratives",
    ],
    approval_gates: [
      "Outbound press statement",
      "Crisis response messaging",
      "Sensitive media inquiry response",
    ],
    collaboration_scope:
      "PR team, CEO, Legal, Marketing, Executive briefings.",
    memory_scope:
      "Press inquiries, statement drafts, crisis logs, executive talking-point libraries.",
    restricted_actions: [
      "Send outbound press statement without CEO/Legal approval",
      "Respond to media inquiry without coordination",
    ],
    escalation_rules:
      "All outbound press requires CEO/Legal review; crisis response escalates to CEO.",
    ai_twin_briefing:
      "I'm your communications second seat: press briefs, crisis response, media triage, and executive talking points. I draft; you approve.",
  },
  {
    role_key: "AI_ENGINEER",
    display_name: "AI Engineer",
    description:
      "Model risk, evaluations, dataset lineage, prompt/system behavior review.",
    default_risk_surface: "Model risk / evaluations / safety review",
    default_dashboard_modules: [
      "Model evaluations",
      "Dataset lineage",
      "Safety and privacy review",
      "Model risk",
      "Deployment approvals",
      "Prompt/system behavior changes",
      "Experiment results",
    ],
    approval_gates: [
      "Model deployment",
      "Dataset addition with privacy implications",
      "Production prompt/system change",
    ],
    collaboration_scope:
      "ML Engineer, Researcher, Data Scientist, Risk & Compliance.",
    memory_scope:
      "Evaluation results, dataset lineage notes, safety review logs, prompt/system change history.",
    restricted_actions: [
      "Deploy model without safety/privacy review",
      "Use dataset with unverified lineage in production",
    ],
    escalation_rules:
      "Safety/privacy issues escalate to Risk & Compliance Lead + CTO.",
    ai_twin_briefing:
      "I'm your AI Engineer second seat: model risk, evaluations, dataset lineage, and safety review. I draft; you approve.",
  },
  {
    role_key: "ML_ENGINEER",
    display_name: "ML Engineer",
    description:
      "Experiment tracking, feature provenance, training pipeline visibility, model performance.",
    default_risk_surface: "Training pipelines / model performance / lineage",
    default_dashboard_modules: [
      "Experiments",
      "Training runs",
      "Model performance",
      "Data drift",
      "Feature provenance",
      "Reproducibility",
      "Handoff to AI/production review",
    ],
    approval_gates: [
      "Training pipeline material change",
      "Production model handoff",
    ],
    collaboration_scope:
      "AI Engineer, Data Scientist, Data Engineering, Production Ops.",
    memory_scope:
      "Experiment records, training run metadata, feature provenance, drift signals.",
    restricted_actions: [
      "Hand off model to production without reproducibility evidence",
      "Make material training pipeline changes without review",
    ],
    escalation_rules:
      "Model handoff requires AI Engineer review; reproducibility gaps escalate to AI Engineer.",
    ai_twin_briefing:
      "I'm your ML Engineer second seat: experiments, training runs, lineage, and performance. I draft; you approve.",
  },
  {
    role_key: "RESEARCHER",
    display_name: "Researcher / Research Scientist",
    description:
      "Research-to-product translation, experiment design, evidence tracking, safety review.",
    default_risk_surface: "Research safety / evidence quality / open questions",
    default_dashboard_modules: [
      "Research notes",
      "Hypotheses",
      "Evidence",
      "Product translation",
      "Safety review",
      "Experiment design",
      "Open questions",
    ],
    approval_gates: [
      "Research publication or external sharing",
      "Sensitive experiment design",
    ],
    collaboration_scope:
      "AI Engineer, Data Scientist, Product, Safety review.",
    memory_scope:
      "Research notes, hypotheses, experimental evidence, safety review notes, open questions.",
    restricted_actions: [
      "Share research externally without review",
      "Run sensitive experiments without safety sign-off",
    ],
    escalation_rules:
      "Sensitive experiments escalate to Safety Reviewer + CTO.",
    ai_twin_briefing:
      "I'm your research second seat: research notes, evidence, safety review, and product translation. I draft; you approve.",
  },
  {
    role_key: "DATA_SCIENTIST",
    display_name: "Data Scientist",
    description:
      "Analytics, experiment design, warehouse-scoped access, metric definitions.",
    default_risk_surface: "Analytics quality / metric definitions / data privacy",
    default_dashboard_modules: [
      "Metrics",
      "Experiments",
      "Analytics requests",
      "Data quality",
      "Warehouse access",
      "Insights",
      "Decision support",
    ],
    approval_gates: [
      "Customer-data access",
      "PII analytics request",
      "Metric definition change",
    ],
    collaboration_scope:
      "Product, Engineering, Marketing, Finance.",
    memory_scope:
      "Metric definitions, analytics request logs, experiment designs, warehouse access notes.",
    restricted_actions: [
      "Access PII without privacy review",
      "Change a load-bearing metric definition without alignment",
    ],
    escalation_rules:
      "Customer-data access requires Privacy review; metric changes require Product alignment.",
    ai_twin_briefing:
      "I'm your data-science second seat: metrics, experiments, data quality, and decision support. I draft; you approve.",
  },
  {
    role_key: "UX_RESEARCHER",
    display_name: "UX Researcher",
    description:
      "Research synthesis, participant privacy scope, interview summaries, usability findings.",
    default_risk_surface: "Participant privacy / research synthesis quality",
    default_dashboard_modules: [
      "Research sessions",
      "Participant privacy",
      "Findings",
      "Product recommendations",
      "Usability issues",
      "Research synthesis",
      "Consent notes",
    ],
    approval_gates: [
      "Participant data export",
      "Sensitive participant recruiting",
    ],
    collaboration_scope:
      "Product, Design, Research, Marketing.",
    memory_scope:
      "Interview summaries (sanitized), findings, consent records, product recommendations.",
    restricted_actions: [
      "Share participant data outside consented scope",
      "Use participant identifiers in product analytics",
    ],
    escalation_rules:
      "Participant privacy issues escalate to Privacy Lead + Risk & Compliance.",
    ai_twin_briefing:
      "I'm your UX research second seat: research sessions, findings, and consent-safe synthesis. I draft; you approve.",
  },
  {
    role_key: "SUPPORT_LEAD",
    display_name: "Support Lead",
    description:
      "Escalation triage, support queue visibility, team coaching, customer pain themes.",
    default_risk_surface: "SLA risk / escalations / quality review",
    default_dashboard_modules: [
      "Escalations",
      "Support queue",
      "SLA risk",
      "Team coaching",
      "Customer pain themes",
      "Bug handoff",
      "Quality review",
    ],
    approval_gates: [
      "Sensitive customer communication",
      "SLA exception",
    ],
    collaboration_scope:
      "Support team, CSM team, Engineering bug handoff, Product.",
    memory_scope:
      "Escalation history, customer pain themes, bug handoff logs, support quality notes.",
    restricted_actions: [
      "Share internal bug status with customer without product alignment",
    ],
    escalation_rules:
      "SLA risk escalates to VP Customer Experience; bug handoffs escalate to Engineering Manager.",
    ai_twin_briefing:
      "I'm your support second seat: escalations, SLA risk, team coaching, and quality review. I draft; you approve.",
  },
  {
    role_key: "OPERATIONS_MANAGER",
    display_name: "Operations Manager",
    description:
      "Operating cadence, vendor coordination, facility coordination, procurement, internal logistics.",
    default_risk_surface: "Vendor / procurement / facilities",
    default_dashboard_modules: [
      "Operating cadence",
      "Vendor coordination",
      "Facilities",
      "Procurement",
      "Open blockers",
      "Internal logistics",
      "Weekly review",
    ],
    approval_gates: [
      "Vendor contract over policy threshold",
      "Procurement exception",
      "Facilities change",
    ],
    collaboration_scope:
      "All-hands operating cadence; vendor and facilities counterparts; Finance.",
    memory_scope:
      "Operating cadence notes, vendor coordination logs, procurement records, internal logistics.",
    restricted_actions: [
      "Sign vendor contract above policy threshold without Finance approval",
    ],
    escalation_rules:
      "Vendor contracts above threshold escalate to Finance + CEO.",
    ai_twin_briefing:
      "I'm your operations second seat: operating cadence, vendors, facilities, procurement, and logistics. I draft; you approve.",
  },
  {
    role_key: "GENERAL_EMPLOYEE",
    display_name: "General Employee",
    description:
      "Self-scoped workday support — commitments, meetings, follow-ups, pending confirmations.",
    default_risk_surface:
      "Personal productivity support — your AI Twin works for you, not for your manager.",
    default_dashboard_modules: [
      "My workday",
      "My commitments",
      "Meeting follow-ups",
      "My pending confirmations",
      "My tasks",
      "My collaborations",
      "My Twin memory",
      "My permissions",
    ],
    approval_gates: [
      "External-write actions",
      "Cross-team requests above scope",
    ],
    collaboration_scope:
      "Your team, projects you belong to, scoped cross-team collaboration.",
    memory_scope:
      "Your own scoped memory + transcript summaries + commitments.",
    restricted_actions: [
      "External writes without approval",
      "Cross-team data sharing outside scope",
    ],
    escalation_rules:
      "Cross-team or external work routes through your manager + the relevant team's lead.",
    ai_twin_briefing:
      "I'm your AI Twin for your workday: commitments, follow-ups, decisions you need to make. I help YOU, not your manager.",
  },
  {
    role_key: "INVESTOR_OBSERVER",
    display_name: "Investor / Observer",
    description:
      "Read-only, purpose-bound access to approved company updates and metrics.",
    default_risk_surface: "Read-only scope / audited views only",
    default_dashboard_modules: [
      "Company updates",
      "Board/investor packet",
      "Metrics snapshot",
      "Read-only documents",
      "Approved reports",
      "Audit-visible access history",
    ],
    approval_gates: [
      "Access beyond purpose-bound scope (always requires CEO/CFO approval)",
    ],
    collaboration_scope:
      "Read-only access to approved investor materials. No employee-level visibility.",
    memory_scope:
      "Approved company updates + audited views only. No private memory access.",
    restricted_actions: [
      "Employee-level surveillance",
      "Operational control of the company",
      "Access to private memory without explicit sharing",
    ],
    escalation_rules:
      "All access requests escalate to CEO/CFO; all access is audit-logged.",
    ai_twin_briefing:
      "I'm a read-only AI guide for your investor view: approved company updates, metrics, and documents. Every view I show is purpose-bound and audit-logged.",
  },
];

/**
 * Resolve a free-form role_title (from EntityMembership.role_title or
 * an EntityProfile.job_title) to the canonical RoleArchetype. Returns
 * null when no archetype matches; the consumer should fall back to
 * the GENERAL_EMPLOYEE archetype or a "Custom role" label.
 *
 * Matching is intentionally tolerant: case-insensitive, accepts the
 * directive's canonical labels ("CTO", "CMO / Marketing Lead", etc.)
 * as well as the demo-team-seed.ts variants ("TECH LEAD" mapping to
 * GENERAL_EMPLOYEE since "tech lead" is not in the Wave-2.1 list,
 * etc.).
 */
export function resolveRoleArchetype(
  roleTitle: string | null | undefined,
): RoleArchetype | null {
  if (roleTitle === null || roleTitle === undefined) return null;
  const norm = roleTitle.trim().toLowerCase();
  if (norm.length === 0) return null;
  for (const a of ROLE_ARCHETYPES) {
    if (a.role_key.toLowerCase() === norm) return a;
    if (a.display_name.toLowerCase() === norm) return a;
  }
  // Fuzzy aliases the Founder's directive mentioned.
  const aliases: ReadonlyArray<[ReadonlyArray<string>, RoleKey]> = [
    [["cto"], "CTO"],
    [["cmo", "marketing lead", "marketing manager"], "CMO"],
    [["sales manager", "vp sales"], "SALES_MANAGER"],
    [["pr lead", "communications lead", "comms lead"], "PR_LEAD"],
    [["ai engineer", "ai/nlp engineer", "ai nlp engineer", "ai ui engineer"], "AI_ENGINEER"],
    [["ml engineer", "machine learning engineer"], "ML_ENGINEER"],
    [["researcher", "research scientist"], "RESEARCHER"],
    [["data scientist"], "DATA_SCIENTIST"],
    [["ux researcher", "user research"], "UX_RESEARCHER"],
    [["support lead", "head of support"], "SUPPORT_LEAD"],
    [["operations manager", "ops manager"], "OPERATIONS_MANAGER"],
    [["general employee", "individual contributor", "ic", "member", "team member"], "GENERAL_EMPLOYEE"],
    [["investor", "observer", "board observer"], "INVESTOR_OBSERVER"],
  ];
  for (const [matches, key] of aliases) {
    if (matches.some((m) => norm === m || norm.includes(m))) {
      return ROLE_ARCHETYPES.find((a) => a.role_key === key) ?? null;
    }
  }
  return null;
}

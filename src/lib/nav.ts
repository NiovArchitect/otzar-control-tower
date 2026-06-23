// FILE: nav.ts
// PURPOSE: Single source of truth for the Control Tower's left
//          navigation. Pages, sidebar, and route map all read from
//          this list so adding/removing a screen happens in one
//          place.
//
// VOCABULARY DISCIPLINE:
// Customer-admin vocabulary, NOT Foundation's internal data-model
// names. Foundation calls things "entities, wallets, capsules,
// twins, hives" because that's the patent-claim language; the
// Control Tower wraps that data model in enterprise-admin terms
// ("Users, AI Teammates, Data & Knowledge, Access Control") because
// that's what Fortune 500 and government admins recognize.
//
// Same architectural principle as Salesforce Lightning vs Apex/SOQL:
// the data model is internal, the admin console speaks customer
// language. If you find yourself adding "Capsules" or "Wallets" as
// a top-level nav item, STOP -- those concepts fold into Data &
// Knowledge or appear as columns inside other screens.
//
// CONNECTS TO: AdminSidebar (single renderer), App.tsx routes, every
//              page in src/pages/.

import {
  Activity,
  BarChart3,
  Bot,
  BookOpen,
  Boxes,
  ClipboardCheck,
  Compass,
  CreditCard,
  Database,
  PlugZap,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  Network,
  ScrollText,
  Mic,
  Store,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  showApprovalBadge?: boolean;
  /** Phase 1300-B — drives the Review Center "needs review" count badge. */
  showReviewBadge?: boolean;
  /** Phase 1255 slice 2 — OS-style admin section. */
  group: NavGroup;
  /** [OTZAR-V1-LIVE-1B] Placeholder screen ("reserved screen" notice). Hidden
   *  from the sidebar by default so v1 validation never lands on a stub; the
   *  route stays registered. Reveal with VITE_SHOW_COMING_SOON=true. */
  comingSoon?: boolean;
}

export type NavGroup =
  | "Command Center"
  | "Organization"
  | "Work"
  | "Data & Knowledge"
  | "Security & Governance"
  | "Integrations"
  | "System";

/** Render order for the grouped admin sidebar. */
export const NAV_GROUP_ORDER: readonly NavGroup[] = [
  "Command Center",
  "Organization",
  "Work",
  "Data & Knowledge",
  "Security & Governance",
  "Integrations",
  "System",
];

// 16 main nav entries in the spec-approved order, plus Pending
// Approvals as item 17 below the main nav (the orange-badge link
// driven by /org/analytics.pending_approvals_count). Keeping
// Approvals in the same NAV array preserves AdminSidebar as a single
// flat renderer; visual separation can land in a later sub-box
// without changing the data shape.
export const NAV: ReadonlyArray<NavItem> = [
  {
    label: "Home",
    to: "/",
    icon: LayoutDashboard,
    description: "Live snapshot of org activity, AI teammates, and Foundation health.",
    group: "Command Center",
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
    description: "People in your organization -- roles, last activity, access summary.",
    group: "Organization",
  },
  {
    label: "AI Teammates",
    to: "/ai-teammates",
    icon: Bot,
    description: "AI agents working alongside your team -- permission ceilings and hive memberships.",
    group: "Organization",
  },
  {
    label: "Access Control",
    to: "/access-control",
    icon: KeyRound,
    description: "Who can read, write, or share which knowledge items -- governed and audited.",
    group: "Data & Knowledge",
  },
  {
    label: "Data & Knowledge",
    to: "/data-knowledge",
    icon: Database,
    description: "Unified browser over your organization's knowledge items.",
    group: "Data & Knowledge",
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: Store,
    description: "Cross-org listings other organizations have opted into sharing. Safe metadata browse only — access stays governed by the provider.",
    group: "Data & Knowledge",
  },
  {
    label: "Federation Cloud Cohorts",
    to: "/cohorts",
    icon: Boxes,
    description: "Govern your organization's data cohorts — usage, mock-only economics, and buyer access requests. Cohorts deliver governed proofs, never raw data.",
    group: "Data & Knowledge",
  },
  {
    label: "Access & Grants",
    to: "/access-grants",
    icon: KeyRound,
    description: "What you have access to and who can use your data. Governed access leased under consent and proof — revocation is visible and enforced. Mock-only economics.",
    group: "Data & Knowledge",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: ScrollText,
    description: "Governed reporting -- regulator packages, readiness truth, and activity records. Scheduled internal reports arrive with the reports schema.",
    group: "Work",
  },
  {
    label: "Data retention",
    to: "/retention",
    icon: ScrollText,
    description: "How long data lives and who controls it -- memory revocation, transcript retention, legal hold, and what stays as tamper-evident proof.",
    group: "Data & Knowledge",
  },
  {
    label: "Security & Audit",
    to: "/security-audit",
    icon: Shield,
    description: "Immutable record of every action that touched data, plus session security events.",
    group: "Security & Governance",
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    description: "Usage trends, intelligence-score history, and monetization roll-ups.",
    group: "Work",
    comingSoon: true,
  },
  {
    label: "Conversations",
    to: "/conversations",
    icon: MessagesSquare,
    description: "Otzar conversations with audit-traceable AI activity per turn.",
    group: "Work",
    comingSoon: true,
  },
  {
    label: "Workflows",
    to: "/workflows",
    icon: Workflow,
    description: "Multi-step orchestrations spanning people and AI teammates.",
    group: "Work",
    comingSoon: true,
  },
  {
    label: "Playground",
    to: "/playground",
    icon: FlaskConical,
    description: "Stage a NEGOTIATE end to end -- the patent claims, made tangible for buyers.",
    group: "Work",
    comingSoon: true,
  },
  {
    label: "Agent Playground",
    to: "/agent-playground",
    icon: Network,
    description: "Enterprise decision cockpit -- scenario, candidates, comparison, recommendation, governed transition, and role-perspective simulation.",
    group: "Work",
  },
  {
    label: "Policies",
    to: "/policies",
    icon: ScrollText,
    description: "Active compliance frameworks (HIPAA, FERPA, FedRAMP, ...) and policy gates.",
    group: "Security & Governance",
  },
  {
    label: "Collaboration policy",
    to: "/collaboration-policy",
    icon: ScrollText,
    description: "Shape the operating envelope for autonomous collaboration — same-team / cross-team / sensitive domains.",
    group: "Security & Governance",
  },
  {
    label: "Review Center",
    to: "/review-center",
    icon: ClipboardCheck,
    description: "High-sensitivity data decisions you can see or act on. Safe projections only — no raw content.",
    showReviewBadge: true,
    group: "Security & Governance",
  },
  {
    label: "System Health",
    to: "/system-health",
    icon: Activity,
    description: "Foundation platform status plus the Seven Feedback Loops -- last run, lag, alerts.",
    group: "System",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    description: "API keys, monetization payouts, branding, integration credentials.",
    group: "System",
    comingSoon: true,
  },
  {
    label: "Onboarding",
    to: "/onboarding",
    icon: Compass,
    description: "Dandelion Preview -- read-only browse of the ADR-0080 Wave 2 OOTB role/tool/workflow catalog.",
    group: "Command Center",
  },
  {
    label: "Billing",
    to: "/billing",
    icon: CreditCard,
    description: "Billing & Entitlements Preview -- read-only browse of the Section 8 B2 plans, seats, packs, connector families, governance rules, and downgrade policies.",
    group: "System",
  },
  {
    label: "Connectors",
    to: "/connectors",
    icon: PlugZap,
    description: "Section 4 ConnectorBinding admin surface -- register, list, enable / disable, and soft-delete bindings for SLACK_READ and OUTBOUND_WEBHOOK connector types. C2 Slack runtime is LIVE.",
    group: "Integrations",
  },
  {
    label: "Integrations & MCP",
    to: "/connector-rails",
    icon: PlugZap,
    description: "Provider catalog, MCP server connections (vault-path references only -- never raw secrets), and per-tool policies (allow / approval / block / draft-only / dual-control). Org-scoped and audited.",
    group: "Integrations",
  },
  {
    label: "Voice Providers",
    to: "/voice-providers",
    icon: Mic,
    description: "Activate Otzar's premium voice -- realtime conversation, streaming voice input, premium voice output, speaker detection, and the pronunciation test. Org-scoped credentials; values never shown.",
    group: "Integrations",
  },
  {
    label: "Voice",
    to: "/voice",
    icon: Mic,
    description: "Voice-first talk surface per ADR-0085 -- text-only voice intent envelopes governed by Foundation. Voice is an interface layer, not a bypass.",
    group: "Integrations",
  },
  {
    label: "Documentation",
    to: "/documentation",
    icon: BookOpen,
    description: "In-product runbooks and API references, scoped to your org's enabled features.",
    group: "System",
    comingSoon: true,
  },
  {
    label: "Intelligence",
    to: "/intelligence",
    icon: Sparkles,
    description: "Curated org-level intelligence the COE has assembled across knowledge items.",
    group: "Organization",
    comingSoon: true,
  },
  // ────────────────────────────────────────────────────────────────
  // Side-section below the main nav -- Pending Approvals is reached
  // via the orange badge, not as one of the 16 main entries. Item
  // 17 here so AdminSidebar's single-array renderer keeps working.
  // ────────────────────────────────────────────────────────────────
  {
    label: "Pending Approvals",
    to: "/approvals",
    icon: ClipboardCheck,
    description: "NEGOTIATE-derived requests awaiting org admin sign-off.",
    group: "Security & Governance",
    showApprovalBadge: true,
  },
];

// FILE: nav.ts
// PURPOSE: Single source of truth for the Control Tower's left
//          navigation. Pages, sidebar, and route map all read from
//          this list so adding/removing a screen happens in one
//          place.
//
// PRODUCTION ADMIN CENTER IA (RC2 admin-coherence):
// Administrator jobs — not Otzar's internal architecture. ~6 primary
// areas so a customer admin never has to decide whether an approval
// lives under "Policies & Approvals" vs "Review Center" vs "Pending
// Approvals", or whether audit is "Audit & Activity" vs "Security".
//
//   1. Overview       — readiness, what needs attention, next step
//   2. People & AI    — people, AI Teammates (seeding/onboarding fold into setup)
//   3. Connections    — external tools, connection health (Voice is not primary)
//   4. Governance     — access, policies, retention, compliance
//   5. Action Center  — everything needing admin attention (approvals + review)
//   6. Intelligence   — reports, organization movement, health
//   7. Security       — security posture, audit (diagnostics advanced/hidden)
//
// Architecture names (Work Graph, Data & Knowledge as primary, dual
// Policy/Approval tabs, standalone Voice admin) are not primary nav.
// Useful capabilities appear under the jobs above; routes stay registered.
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
  /** Drives the Action Center "needs review" count badge. */
  showReviewBadge?: boolean;
  /** OS-style admin section (jobs model). */
  group: NavGroup;
  /** Placeholder/stub screen. Hidden from the sidebar by default. */
  comingSoon?: boolean;
  /** Route-only surface: registered in App.tsx, hidden from the sidebar. */
  hidden?: boolean;
}

export type NavGroup =
  | "Overview"
  | "People & AI"
  | "Connections"
  | "Governance"
  | "Action Center"
  | "Intelligence"
  | "Security";

/** Render order for the grouped admin sidebar. */
export const NAV_GROUP_ORDER: readonly NavGroup[] = [
  "Overview",
  "People & AI",
  "Connections",
  "Governance",
  "Action Center",
  "Intelligence",
  "Security",
];

// Production Admin Center IA. Stub screens keep comingSoon:true so the
// sidebar hides them (routes preserved in App.tsx). Architecture-oriented
// and duplicate destinations stay registered but hidden from primary nav.
export const NAV: ReadonlyArray<NavItem> = [
  // ── 1. Overview ────────────────────────────────────────────────
  {
    label: "Home",
    to: "/",
    icon: LayoutDashboard,
    description:
      "Is this organization operating normally? What needs attention, what is blocked, and what to do next.",
    group: "Overview",
  },
  {
    // One guided activation path — readiness, people, structure, connections,
    // governance, first workflow. Organization Seeding + Onboarding are not
    // separate primary tabs (routes remain deep-link safe).
    label: "Organization",
    to: "/setup",
    icon: Compass,
    description:
      "Organization readiness and guided setup — people, structure, AI Teammates, connections, and governance in one path.",
    group: "Overview",
  },
  {
    label: "Billing & Entitlements",
    to: "/billing",
    icon: CreditCard,
    description: "Plan, seats, and what this organization can use.",
    group: "Security",
    hidden: true,
  },

  // ── 2. People & AI ─────────────────────────────────────────────
  {
    label: "People",
    to: "/users",
    icon: Users,
    description:
      "People in your organization — roles, teams, last activity, and access summary.",
    group: "People & AI",
  },
  {
    label: "AI Teammates",
    to: "/ai-teammates",
    icon: Bot,
    description:
      "The AI Teammates working alongside your team — what each is allowed to do and where it belongs.",
    group: "People & AI",
  },
  {
    // Folded into Organization (/setup). Route kept for deep links and
    // in-progress discovery reviews.
    label: "Organization Seeding",
    to: "/organization-seeding",
    icon: Sparkles,
    description:
      "People and context Otzar discovered — review each seed before it joins. Reached from Organization setup.",
    group: "People & AI",
    hidden: true,
  },
  {
    // Folded into Organization (/setup). Not a competing primary tab.
    label: "Onboarding",
    to: "/onboarding",
    icon: Compass,
    description:
      "Setup catalog — roles, AI Teammates, tools, and workflows. Reached from Organization setup.",
    group: "People & AI",
    hidden: true,
  },

  // ── 3. Connections ─────────────────────────────────────────────
  {
    label: "Connections",
    to: "/tools-connections",
    icon: PlugZap,
    description:
      "Google Workspace, communication systems, business tools, data sources, and connection health.",
    group: "Connections",
  },
  {
    // Voice is an interaction method throughout Otzar — not a primary admin page.
    label: "Voice Providers",
    to: "/voice-providers",
    icon: Mic,
    description:
      "Advanced voice setup — provider activation and diagnostics. Otzar's branded voice works without visiting this page.",
    group: "Connections",
    hidden: true,
  },
  {
    // Voice policy / mic diagnostics: user preferences + Governance advanced.
    label: "Voice",
    to: "/voice",
    icon: Mic,
    description:
      "Organization voice settings. Voice itself is available throughout the product.",
    group: "Connections",
    hidden: true,
  },

  // ── 4. Governance ──────────────────────────────────────────────
  // ONE human job: Access + Policies + Retention. Deep routes stay live.
  {
    label: "Governance",
    to: "/governance",
    icon: Shield,
    description:
      "Access, policies, and retention — who may act, what Otzar may do, how long data lives.",
    group: "Governance",
  },
  {
    label: "Policies",
    to: "/policies",
    icon: ScrollText,
    description:
      "Access, autonomy, approvals, decision rights, sharing boundaries, and compliance gates.",
    group: "Governance",
    hidden: true,
  },
  {
    label: "Access",
    to: "/access-control",
    icon: KeyRound,
    description:
      "Who can see, use, and share what — org defaults, grants, revocations, and overrides.",
    group: "Governance",
    hidden: true,
  },
  {
    label: "Data retention",
    to: "/retention",
    icon: ScrollText,
    description:
      "How long data lives — memory revocation, transcript retention, legal hold, and proof.",
    group: "Governance",
    hidden: true,
  },
  {
    label: "Collaboration policy",
    to: "/collaboration-policy",
    icon: ScrollText,
    description:
      "Operating envelope for autonomous collaboration — same-team, cross-team, and sensitive domains.",
    group: "Governance",
    hidden: true,
  },
  {
    // Architecture-oriented knowledge surface — not a primary admin job.
    // Source connections live under Connections; retention under Governance.
    label: "Data & Knowledge",
    to: "/data-knowledge",
    icon: Database,
    description:
      "Knowledge sources and lineage. Prefer Connections and Governance for everyday admin work.",
    group: "Governance",
    hidden: true,
  },

  // ── 5. Action Center ───────────────────────────────────────────
  {
    // Single exception queue: pending approvals + high-sensitivity review.
    // Former separate "Review Center" + "Pending Approvals" primary tabs.
    label: "Action Center",
    to: "/approvals",
    icon: ClipboardCheck,
    description:
      "Everything needing your attention — pending approvals, access exceptions, policy and security items.",
    group: "Action Center",
    showApprovalBadge: true,
    showReviewBadge: true,
  },
  {
    // Merged into Action Center. Route kept for deep links.
    label: "Review Center",
    to: "/review-center",
    icon: ClipboardCheck,
    description:
      "High-sensitivity decisions. Prefer Action Center for the everyday exception queue.",
    group: "Action Center",
    hidden: true,
  },

  // ── 6. Intelligence ────────────────────────────────────────────
  {
    label: "Reports",
    to: "/reports",
    icon: BarChart3,
    description:
      "Organization movement, readiness, and activity records you can export — backed by audit evidence.",
    group: "Intelligence",
  },
  {
    label: "Intelligence",
    to: "/intelligence",
    icon: Sparkles,
    description:
      "Curated organization-level intelligence assembled across your knowledge.",
    group: "Intelligence",
    comingSoon: true,
    hidden: true,
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    description: "Usage trends and activity roll-ups.",
    group: "Intelligence",
    comingSoon: true,
    hidden: true,
  },

  // ── 7. Security ────────────────────────────────────────────────
  {
    label: "Security & Audit",
    to: "/security-audit",
    icon: Shield,
    description:
      "Security posture, audit history, access reviews, and evidence of what was approved, held, or rejected.",
    group: "Security",
  },
  {
    // Advanced operations — not competing with everyday Security.
    label: "System Health",
    to: "/system-health",
    icon: Activity,
    description:
      "Platform status and feedback loops — last run, lag, and alerts. Advanced operator view.",
    group: "Security",
    hidden: true,
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: Store,
    description: "Shared knowledge other organizations offer. Access stays governed.",
    group: "Security",
    hidden: true,
  },
  {
    label: "Federation Cloud Cohorts",
    to: "/cohorts",
    icon: Boxes,
    description: "Data cohorts and governed proofs for advanced operators.",
    group: "Security",
    hidden: true,
  },
  {
    label: "Conversations",
    to: "/conversations",
    icon: MessagesSquare,
    description: "Otzar conversations with audit-traceable AI activity per turn.",
    group: "Security",
    comingSoon: true,
    hidden: true,
  },
  {
    label: "Scenario Studio",
    to: "/agent-playground",
    icon: Network,
    description: "Internal experimental surface — not a primary admin workflow.",
    group: "Security",
    hidden: true,
  },
  {
    label: "Workflows",
    to: "/workflows",
    icon: Workflow,
    description: "Multi-step orchestrations spanning people and AI Teammates.",
    group: "Security",
    comingSoon: true,
    hidden: true,
  },
  {
    label: "Playground",
    to: "/playground",
    icon: FlaskConical,
    description: "Internal experimental surface.",
    group: "Security",
    comingSoon: true,
    hidden: true,
  },
  {
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    description: "API keys, payouts, branding, and integration credentials.",
    group: "Security",
    comingSoon: true,
    hidden: true,
  },
  {
    label: "Documentation",
    to: "/documentation",
    icon: BookOpen,
    description:
      "In-product runbooks and references, scoped to your organization's enabled features.",
    group: "Security",
    comingSoon: true,
    hidden: true,
  },
];

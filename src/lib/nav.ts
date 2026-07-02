// FILE: nav.ts
// PURPOSE: Single source of truth for the Control Tower's left
//          navigation. Pages, sidebar, and route map all read from
//          this list so adding/removing a screen happens in one
//          place.
//
// PRODUCTION ADMIN CENTER IA (approved directive):
// Eight coherent sections, powerful underneath and calm on the
// surface. A real customer admin should log in and immediately
// understand what is healthy, what needs setup, what is blocked, what
// Otzar is learning/proposing, what needs approval, and what is
// audited — WITHOUT every implementation page being a first-class
// destination.
//
//   1. Overview              — command landing + entitlements
//   2. People & Roles        — who belongs, AI Twins, org seeding, onboarding
//   3. Tools & Connections   — everything external Otzar can use/needs
//   4. Work Graph & Memory   — the org's source-of-truth layer
//   5. Policies & Approvals   — what Otzar may see/decide/route/execute
//   6. Workflows & Automation — what Otzar can do operationally
//   7. Audit & Activity      — proof of what happened
//   8. Diagnostics           — operator/technical health only
//
// VOCABULARY DISCIPLINE:
// Customer-admin vocabulary, NOT Foundation's internal data-model
// names. Foundation calls things "entities, wallets, capsules,
// twins, hives" because that's the patent-claim language; the
// Control Tower wraps that data model in enterprise-admin terms
// because that's what Fortune 500 and government admins recognize.
// No raw IDs, no "connector binding"/"MCP rail"/"TAR"/"schema" as
// primary labels — those live inside advanced/diagnostic detail only.
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
  /** OS-style admin section (production IA — 8 sections). */
  group: NavGroup;
  /** [OTZAR-V1-LIVE-1B] Placeholder/stub screen. Hidden from the sidebar by
   *  default so production validation never lands on a "reserved screen"; the
   *  route stays registered (deep-link safe). Reveal with VITE_SHOW_COMING_SOON. */
  comingSoon?: boolean;
  /** PROD-MODEL-P3 — route-only surface: registered in App.tsx, hidden
   *  from the sidebar (Advanced/diagnostic tier). */
  hidden?: boolean;
}

export type NavGroup =
  | "Overview"
  | "People & Roles"
  | "Tools & Connections"
  | "Work Graph & Memory"
  | "Policies & Approvals"
  | "Workflows & Automation"
  | "Audit & Activity"
  | "Diagnostics";

/** Render order for the grouped admin sidebar (production IA). */
export const NAV_GROUP_ORDER: readonly NavGroup[] = [
  "Overview",
  "People & Roles",
  "Tools & Connections",
  "Work Graph & Memory",
  "Policies & Approvals",
  "Workflows & Automation",
  "Audit & Activity",
  "Diagnostics",
];

// Production Admin Center IA. Stub screens keep comingSoon:true so the
// sidebar hides them (routes preserved in App.tsx). The two former
// top-level connector destinations (/connectors, /connector-rails) are
// folded into ONE "Tools & Connections" landing (/tools-connections)
// that composes both surfaces as tabs — their routes stay registered so
// existing deep links never break.
export const NAV: ReadonlyArray<NavItem> = [
  // ── 1. Overview ────────────────────────────────────────────────
  {
    label: "Home",
    to: "/",
    icon: LayoutDashboard,
    description: "Is this organization ready to run Otzar? Readiness, what needs attention, and what's blocked — at a glance.",
    group: "Overview",
  },
  {
    label: "Billing & Entitlements",
    to: "/billing",
    icon: CreditCard,
    description: "Your plan, seats, and what's available — the capacity and entitlements that govern what this organization can use.",
    group: "Overview",
  },

  // ── 2. People & Roles ──────────────────────────────────────────
  {
    label: "Users",
    to: "/users",
    icon: Users,
    description: "People in your organization — roles, teams, last activity, and access summary.",
    group: "People & Roles",
  },
  {
    label: "AI Teammates",
    to: "/ai-teammates",
    icon: Bot,
    description: "The AI Twins working alongside your team — what each is allowed to do and where it belongs.",
    group: "People & Roles",
  },
  {
    label: "Organization Seeding",
    to: "/organization-seeding",
    icon: Sparkles,
    description: "People and context Otzar discovered from your organization's workstream — review each seed before it joins the organization. Nothing is applied automatically.",
    group: "People & Roles",
  },
  {
    label: "Onboarding",
    to: "/onboarding",
    icon: Compass,
    description: "Setup preview — the out-of-the-box catalog of roles, AI Twins, tools, and workflows to get this organization ready to run.",
    group: "People & Roles",
  },

  // ── 3. Tools & Connections ─────────────────────────────────────
  {
    label: "Tools & Connections",
    to: "/tools-connections",
    icon: PlugZap,
    description: "Everything external Otzar can use — connected apps, what's missing or needs authorization, and the integration policies that govern them.",
    group: "Tools & Connections",
  },
  {
    // PROD-MODEL-P3 §7 — Otzar ships with a branded default voice; the
    // provider/vendor activation surface is Advanced setup, not everyday
    // admin IA. Route stays registered (deep-link-safe); hidden from the
    // sidebar like other route-only surfaces.
    label: "Voice Providers",
    to: "/voice-providers",
    icon: Mic,
    description: "Advanced voice setup — provider activation and diagnostics. Otzar's branded voice works without visiting this page.",
    group: "Tools & Connections",
    hidden: true,
  },
  {
    label: "Voice",
    to: "/voice",
    icon: Mic,
    description: "Otzar's voice — talk to it, and choose how it sounds for your organization. Spoken intent stays governed; voice is an interface, not a bypass.",
    group: "Tools & Connections",
  },

  // ── 4. Work Graph & Memory ─────────────────────────────────────
  {
    label: "Data & Knowledge",
    to: "/data-knowledge",
    icon: Database,
    description: "What Otzar knows, where it came from, and what it affects — your organization's knowledge sources and how they connect.",
    group: "Work Graph & Memory",
  },
  {
    // PROD-MODEL-P3 §9 — the ONE access area: permissions + grants as tabs.
    // /access-grants stays a registered route (deep-link-safe), no longer a
    // separate nav destination with divided access logic.
    label: "Access Control",
    to: "/access-control",
    icon: KeyRound,
    description: "One place for who can see, use, and share what — org defaults, grants, revocations, and overrides. Governed and audited.",
    group: "Work Graph & Memory",
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: Store,
    description: "Knowledge other organizations have opted into sharing. Safe metadata browse only — access stays governed by the provider.",
    group: "Work Graph & Memory",
  },
  {
    label: "Federation Cloud Cohorts",
    to: "/cohorts",
    icon: Boxes,
    description: "Govern your organization's data cohorts — usage, access requests, and governed proofs. Cohorts deliver proofs, never raw data.",
    group: "Work Graph & Memory",
  },
  {
    label: "Intelligence",
    to: "/intelligence",
    icon: Sparkles,
    description: "Curated organization-level intelligence assembled across your knowledge.",
    group: "Work Graph & Memory",
    comingSoon: true,
  },

  // ── 5. Policies & Approvals ────────────────────────────────────
  {
    label: "Policies",
    to: "/policies",
    icon: ScrollText,
    description: "What Otzar may see, decide, route, and execute — active compliance frameworks and the policy gates that govern autonomy.",
    group: "Policies & Approvals",
  },
  {
    label: "Collaboration policy",
    to: "/collaboration-policy",
    icon: ScrollText,
    description: "The operating envelope for autonomous collaboration — same-team, cross-team, and sensitive domains.",
    group: "Policies & Approvals",
  },
  {
    label: "Review Center",
    to: "/review-center",
    icon: ClipboardCheck,
    description: "High-sensitivity decisions you can see or act on. Safe projections only — no raw content.",
    showReviewBadge: true,
    group: "Policies & Approvals",
  },
  {
    label: "Pending Approvals",
    to: "/approvals",
    icon: ClipboardCheck,
    description: "Requests awaiting your sign-off — what's waiting on the admin right now.",
    group: "Policies & Approvals",
    showApprovalBadge: true,
  },

  // ── 6. Workflows & Automation ──────────────────────────────────
  {
    // CX-SLICE-2 — the ADR-0077 pipeline is real; the name undersold it.
    // "Scenario Studio": explore outcomes with your AI teammates, in
    // executive language. Route unchanged (deep-link-safe).
    label: "Scenario Studio",
    to: "/agent-playground",
    icon: Network,
    description: "Explore what could happen next. Your AI teammates compare options over your organization's own knowledge, recommend the best path, and — only with approval — turn it into real work. Governed and recorded.",
    group: "Workflows & Automation",
  },
  {
    label: "Workflows",
    to: "/workflows",
    icon: Workflow,
    description: "Multi-step orchestrations spanning people and AI Twins.",
    group: "Workflows & Automation",
    comingSoon: true,
  },
  {
    label: "Playground",
    to: "/playground",
    icon: FlaskConical,
    description: "Stage a NEGOTIATE end to end — the patent claims, made tangible for buyers.",
    group: "Workflows & Automation",
    comingSoon: true,
  },

  // ── 7. Audit & Activity ────────────────────────────────────────
  {
    label: "Security & Audit",
    to: "/security-audit",
    icon: Shield,
    description: "Proof of what happened — every action that touched data, what Otzar did, what was approved, held, or rejected, and the evidence behind it.",
    group: "Audit & Activity",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: ScrollText,
    description: "Readiness and activity records you can export — regulator, customer, and investor packages backed by audit evidence.",
    group: "Audit & Activity",
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    description: "Usage trends, intelligence-score history, and activity roll-ups.",
    group: "Audit & Activity",
    comingSoon: true,
  },
  {
    label: "Conversations",
    to: "/conversations",
    icon: MessagesSquare,
    description: "Otzar conversations with audit-traceable AI activity per turn.",
    group: "Audit & Activity",
    comingSoon: true,
  },

  // ── 8. Diagnostics (operator/technical only) ───────────────────
  {
    label: "System Health",
    to: "/system-health",
    icon: Activity,
    description: "Platform status and the feedback loops — last run, lag, and alerts. Operator view.",
    group: "Diagnostics",
  },
  {
    label: "Data retention",
    to: "/retention",
    icon: ScrollText,
    description: "How long data lives and who controls it — memory revocation, transcript retention, legal hold, and what stays as tamper-evident proof.",
    group: "Diagnostics",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    description: "API keys, payouts, branding, and integration credentials.",
    group: "Diagnostics",
    comingSoon: true,
  },
  {
    label: "Documentation",
    to: "/documentation",
    icon: BookOpen,
    description: "In-product runbooks and references, scoped to your organization's enabled features.",
    group: "Diagnostics",
    comingSoon: true,
  },
];

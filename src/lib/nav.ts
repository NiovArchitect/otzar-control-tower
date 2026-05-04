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
  ClipboardCheck,
  Compass,
  Database,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
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
}

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
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
    description: "People in your organization -- roles, last activity, access summary.",
  },
  {
    label: "AI Teammates",
    to: "/ai-teammates",
    icon: Bot,
    description: "AI agents working alongside your team -- permission ceilings and hive memberships.",
  },
  {
    label: "Access Control",
    to: "/access-control",
    icon: KeyRound,
    description: "Who can read, write, or share which knowledge items -- COSMP-governed.",
  },
  {
    label: "Data & Knowledge",
    to: "/data-knowledge",
    icon: Database,
    description: "Unified browser over your organization's knowledge items.",
  },
  {
    label: "Security & Audit",
    to: "/security-audit",
    icon: Shield,
    description: "Immutable record of every action that touched data, plus session security events.",
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    description: "Usage trends, intelligence-score history, and monetization roll-ups.",
  },
  {
    label: "Conversations",
    to: "/conversations",
    icon: MessagesSquare,
    description: "Otzar conversations with audit-traceable AI activity per turn.",
  },
  {
    label: "Workflows",
    to: "/workflows",
    icon: Workflow,
    description: "Multi-step orchestrations spanning people and AI teammates.",
  },
  {
    label: "Playground",
    to: "/playground",
    icon: FlaskConical,
    description: "Stage a NEGOTIATE end to end -- the patent claims, made tangible for buyers.",
  },
  {
    label: "Policies",
    to: "/policies",
    icon: ScrollText,
    description: "Active compliance frameworks (HIPAA, FERPA, FedRAMP, ...) and policy gates.",
  },
  {
    label: "System Health",
    to: "/system-health",
    icon: Activity,
    description: "Foundation platform status plus the Seven Feedback Loops -- last run, lag, alerts.",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    description: "API keys, monetization payouts, branding, integration credentials.",
  },
  {
    label: "Onboarding",
    to: "/onboarding",
    icon: Compass,
    description: "Guided setup for new org admins -- invite, register, govern, transact.",
  },
  {
    label: "Documentation",
    to: "/documentation",
    icon: BookOpen,
    description: "In-product runbooks and API references, scoped to your org's enabled features.",
  },
  {
    label: "Intelligence",
    to: "/intelligence",
    icon: Sparkles,
    description: "Curated org-level intelligence the COE has assembled across knowledge items.",
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
    showApprovalBadge: true,
  },
];

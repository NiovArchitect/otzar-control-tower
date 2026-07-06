// FILE: nav-employee.ts
// PURPOSE: Single source of truth for the EMPLOYEE Otzar shell's
//          navigation. Distinct from src/lib/nav.ts (the org-admin
//          Control Tower nav) so the two personas never share a menu.
// CONNECTS TO: EmployeeNav (renderer), App.tsx /app routes,
//              src/pages/app/*.
//
// EMPLOYEE IA — minimal, ambient, work-oriented (approved directive):
//   The employee shell must feel calm and human, never like an admin
//   console or a SaaS dashboard maze. An employee sees what needs them,
//   what they committed to, what Otzar is handling, who they work with,
//   and their recent work memory — and a SMALL curated "More" for
//   secondary surfaces.
//
//   PRIMARY  — the everyday loop (kept deliberately short):
//     My Day · Talk to Otzar · Action Center · My Work · Comms ·
//     People & Collaboration · My Digital Work Wallet (memory)
//     (+ Team Work, manager-only)
//   MORE     — secondary-but-useful surfaces, curated (not a junk drawer).
//   HIDDEN   — redundant/niche surfaces stay ROUTE-ONLY (reachable by URL,
//     not shown in nav) — same hide-from-nav/preserve-route pattern as the
//     admin stubs. No capability removed; deep links never break.
//
// VOCABULARY: human employee language only. Never "Dandelion",
// "propagation", "connector rail", "MCP", "capability object",
// "diagnostics", "schema", "TAR/RBAC/ABAC", or raw IDs in employee copy.

import {
  Sparkles,
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  BookOpen,
  Building2,
  Cable,
  ClipboardCheck,
  Eye,
  FolderKanban,
  Headphones,
  KeyRound,
  ListChecks,
  ListTodo,
  Mic,
  Network,
  MessageSquare,
  MessagesSquare,
  PencilLine,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface EmployeeNavItem {
  label: string;
  to: string;
  /** Phase 1235 — admin/diagnostic entries are hidden from normal
   *  employees; EmployeeNav filters on isOrgAdmin. */
  adminOnly?: boolean;
  /** Route-only surface: reachable by direct URL (App.tsx route preserved)
   *  but NOT shown in the employee nav, so redundant/niche pages don't crowd
   *  the everyday shell. Mirrors the admin `comingSoon` hide-but-route pattern. */
  hidden?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  group: "primary" | "more";
}

export const EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> = [
  // ── Primary — the everyday Otzar Work-OS loop (minimal) ───────
  {
    label: "My Day",
    to: "/app/my-day",
    icon: Sun,
    description: "What needs you today.",
    group: "primary",
  },
  {
    label: "Talk to Otzar",
    to: "/app/voice",
    icon: Mic,
    description: "Ask Otzar anything, by voice or text. Otzar drafts; you approve.",
    group: "primary",
  },
  {
    label: "Action Center",
    to: "/app/action-center",
    icon: ListChecks,
    description:
      "What Otzar is handling for you — pending, approved, completed, and blocked.",
    group: "primary",
  },
  {
    label: "My Work",
    to: "/app/my-work",
    icon: ListTodo,
    description:
      "What you committed to — what you owe, what's waiting on you, and what's blocked. Mark things done here.",
    group: "primary",
  },
  {
    // Manager/admin authority (can_admin_org) — the team view of who is
    // waiting on whom. Gated via adminOnly so it stays prominent for managers
    // and hidden for normal employees (matches the backend team-work gate).
    label: "Team Work",
    to: "/app/team-work",
    icon: Network,
    description:
      "Who is waiting on whom across your team — pending work, status, and what's stale.",
    group: "primary",
    adminOnly: true,
  },
  {
    label: "Comms",
    to: "/app/comms",
    icon: Headphones,
    description:
      "Otzar captures meetings and conversations, then turns them into follow-ups you can approve.",
    group: "primary",
  },
  {
    label: "People & Collaboration",
    to: "/app/collaboration",
    icon: Users,
    description:
      "See your team and the work you share. Otzar helps the right people stay connected to the right work — not everyone.",
    group: "primary",
  },
  {
    label: "My Digital Work Wallet",
    to: "/app/my-memory",
    icon: Wallet,
    description:
      "Your memory and recent work, plus what Otzar may do with them. You're in control.",
    group: "primary",
  },

  // ── More — secondary but useful, curated ─────────────────────
  {
    label: "My Twin",
    to: "/app/my-twin",
    icon: Bot,
    description: "Your aligned AI teammate.",
    group: "more",
  },
  {
    // [PASSWORD-LIFECYCLE] self-service credential control — admins
    // never see or set passwords.
    label: "Account & Security",
    to: "/app/account-security",
    icon: ShieldCheck,
    description: "Change your password. Admins never see or set it.",
    group: "more",
  },
  {
    label: "Blind Spots",
    to: "/app/blind-spots",
    icon: AlertTriangle,
    description:
      "What's slipping in your real work — overdue, stale, or blocked items, and anything with no next step. Managers see the team's.",
    group: "more",
  },
  {
    label: "Work health",
    to: "/app/operational-health",
    icon: Activity,
    description:
      "A simple read on how your work is going — what's on track and what needs attention. Plain language, no system jargon.",
    group: "more",
  },
  {
    label: "Workspaces",
    to: "/app/collaboration-workspaces",
    icon: Building2,
    description:
      "Shared workspaces — people, decisions, commitments, and follow-ups for each piece of work.",
    group: "more",
  },
  {
    label: "My Organization",
    to: "/app/my-organization",
    icon: Building2,
    description:
      "Your place in the company. Projects, teammates, and what Otzar can do for you here.",
    group: "more",
    // PROD-MODEL-P3 §17 — redundant as an employee destination (People & Collaboration + Today cover it); route stays deep-link-safe.
    hidden: true,
  },
  {
    label: "Projects",
    to: "/app/work-projects",
    icon: FolderKanban,
    description: "Your work projects and members.",
    group: "more",
  },
  {
    label: "Meeting captures",
    to: "/app/meeting-captures",
    icon: Mic,
    description:
      "Capture a meeting, log who agreed, and attach it to a workspace.",
    group: "more",
    // PROD-MODEL-P3 §17/§23 — ingestion is meant to be automatic; a manual employee capture page overstates the model. Route stays for detail/deep links.
    hidden: true,
  },
  {
    label: "Tool connections",
    to: "/app/connector-health",
    icon: Cable,
    description:
      "Honest status of your connected tools. A tool that isn't connected doesn't break the core product.",
    group: "more",
  },
  {
    label: "Approvals",
    to: "/app/approvals",
    icon: ClipboardCheck,
    description: "Approval requests waiting on you.",
    group: "more",
    // PROD-MODEL-P3 §13/§17 — duplicates Action Center (the ONE needs-me surface); route stays.
    hidden: true,
  },
  {
    label: "Authority",
    to: "/app/authority-grants",
    icon: KeyRound,
    description: "Choose what your Twin may do for you.",
    group: "more",
    // PROD-MODEL-P3 §7 — employees must not grant/revoke twin authority unless org policy allows; admin governs this. Route stays until the org-policy model lands.
    hidden: true,
  },
  {
    label: "Preferences",
    to: "/app/preferences",
    icon: BookOpen,
    description: "Teach your Twin how you work.",
    group: "more",
  },
  {
    label: "Corrections",
    to: "/app/corrections",
    icon: PencilLine,
    description: "Teach and correct your AI teammate.",
    group: "more",
  },
  {
    label: "Launch readiness",
    to: "/app/onboarding-readiness",
    icon: ShieldCheck,
    description:
      "Manager checklist of what's left before this Otzar workspace is ready to go live.",
    group: "more",
    adminOnly: true,
  },

  // ── Hidden — route-only (reachable by URL, not shown in nav) ──
  // Redundant or niche surfaces kept for deep-link safety. They duplicate a
  // primary surface (Chat↔Talk to Otzar, Voice captures↔Comms/Meeting
  // captures, Conversations↔Comms) or are one-time/edge utilities.
  {
    label: "Chat",
    to: "/app/chat",
    icon: MessageSquare,
    description: "Talk with your AI teammate.",
    group: "more",
    hidden: true,
  },
  {
    label: "Getting started",
    to: "/app/welcome",
    icon: Sparkles,
    description: "Meet Otzar — tell it what to call you and where to start.",
    group: "more",
    hidden: true,
  },
  {
    label: "Observe",
    to: "/app/observe",
    icon: Eye,
    description: "Submit context for Otzar to learn from.",
    group: "more",
    hidden: true,
  },
  {
    label: "Voice captures",
    to: "/app/voice-captures",
    icon: Mic,
    description:
      "Capture a meeting by voice, transcribe it, and turn it into governed follow-ups.",
    group: "more",
    hidden: true,
  },
  {
    label: "Conversations",
    to: "/app/conversations",
    icon: MessagesSquare,
    description: "Your recent Otzar conversations.",
    group: "more",
    hidden: true,
  },
];

// Convenience selectors used by the nav renderer. Hidden (route-only) items
// are excluded — they stay reachable by URL but never crowd the nav.
export const PRIMARY_EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> =
  EMPLOYEE_NAV.filter((i) => i.group === "primary" && i.hidden !== true);
export const MORE_EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> =
  EMPLOYEE_NAV.filter((i) => i.group === "more" && i.hidden !== true);

// Unused; intentionally exported for telemetry / tests / future use.
export { Bell };

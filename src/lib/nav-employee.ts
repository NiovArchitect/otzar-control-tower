// FILE: nav-employee.ts
// PURPOSE: Single source of truth for the EMPLOYEE Otzar shell's
//          navigation. Distinct from src/lib/nav.ts (the org-admin
//          Control Tower nav) so the two personas never share a menu.
// CONNECTS TO: EmployeeNav (renderer), App.tsx /app routes,
//              src/pages/app/*.
//
// Phase 1212 reorganization per [FOUNDER — WARMWIND OS REFERENCE]:
//   - PRIMARY group surfaces the everyday Otzar Work-OS journey:
//     My Day, Talk to Otzar, Action Center, My Twin, Collaboration.
//   - MORE group keeps the existing deeper surfaces accessible
//     (Approvals / Authority / Preferences / Projects / Conversations
//      / Corrections / Observe / Workspace) but visually quieter so
//     a new employee isn't overwhelmed.
//   - The Phase-3-debug "Voice envelope" entry is intentionally
//     dropped from the nav — it remains routeable for engineers via
//     direct URL /app/voice-ready, but no longer surfaces in the
//     employee shell.

import {
  Sparkles,
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
  Mic,
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  group: "primary" | "more";
}

export const EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> = [
  // ── Primary (warm, OS-style everyday journey) ────────────────
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
    description: "Voice or text. Otzar drafts; you approve.",
    group: "primary",
  },
  {
    label: "Action Center",
    to: "/app/action-center",
    icon: ListChecks,
    description:
      "Decisions Otzar is making on your behalf — pending, approved, completed, blocked.",
    group: "primary",
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
    label: "My Twin",
    to: "/app/my-twin",
    icon: Bot,
    description: "Your aligned AI teammate.",
    group: "primary",
  },
  {
    label: "People & Collaboration",
    to: "/app/collaboration",
    icon: Users,
    description:
      "See your team. Ask coworkers, teams, and projects for help. Powered by Dandelion.",
    group: "primary",
  },
  {
    label: "Workspaces",
    to: "/app/collaboration-workspaces",
    icon: Building2,
    description:
      "Shared workspaces — people, decisions, commitments, and follow-ups for each piece of work.",
    group: "primary",
  },

  // ── More (deeper / configuration / debug-adjacent) ──────────
  {
    label: "My Organization",
    to: "/app/my-organization",
    icon: Building2,
    description:
      "Your place in the company. Projects, teammates, what Otzar can do for you here.",
    group: "more",
  },
  {
    label: "My Digital Work Wallet",
    to: "/app/my-memory",
    icon: Wallet,
    description:
      "Your memory, your permissions, and what Otzar can do with them. You're in control.",
    group: "more",
  },
  {
    label: "Connector Health",
    to: "/app/connector-health",
    icon: Cable,
    description:
      "Honest status of integrations. Missing connectors don't break the core product.",
    group: "more",
  },
  {
    label: "Approvals",
    to: "/app/approvals",
    icon: ClipboardCheck,
    description: "Approval requests waiting on you.",
    group: "more",
  },
  {
    label: "Authority",
    to: "/app/authority-grants",
    icon: KeyRound,
    description: "Choose what your Twin may do for you.",
    group: "more",
  },
  {
    label: "Preferences",
    to: "/app/preferences",
    icon: BookOpen,
    description: "Teach your Twin how you work.",
    group: "more",
  },
  {
    label: "Projects",
    to: "/app/work-projects",
    icon: FolderKanban,
    description: "Your work projects and members.",
    group: "more",
  },
  {
    label: "Conversations",
    to: "/app/conversations",
    icon: MessagesSquare,
    description: "Your ambient console sessions.",
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
    label: "Chat",
    to: "/app/chat",
    icon: MessageSquare,
    description: "Talk with your AI teammate.",
    group: "more",
  },
  {
    label: "Getting started",
    to: "/app/welcome",
    icon: Sparkles,
    description: "Meet Otzar — tell it what to call you and where to start.",
    group: "more",
  },
  {
    label: "Observe",
    to: "/app/observe",
    icon: Eye,
    description: "Submit context for Otzar to learn from.",
    group: "more",
  },
  {
    label: "Meeting captures",
    to: "/app/meeting-captures",
    icon: Mic,
    description:
      "Capture a meeting, log who consented, and attach it to a workspace.",
    group: "more",
  },
  {
    label: "Production readiness",
    to: "/app/onboarding-readiness",
    icon: ShieldCheck,
    description:
      "Admin-only checklist of what's left before this Otzar deployment is production-ready.",
    group: "more",
    adminOnly: true,
  },
  {
    label: "Voice captures",
    to: "/app/voice-captures",
    icon: Mic,
    description:
      "Talk to Otzar — capture a meeting by voice, transcribe it, and turn it into governed follow-ups.",
    group: "more",
  },
];

// Convenience selectors used by the nav renderer.
export const PRIMARY_EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> =
  EMPLOYEE_NAV.filter((i) => i.group === "primary");
export const MORE_EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> =
  EMPLOYEE_NAV.filter((i) => i.group === "more");

// Unused; intentionally exported for telemetry / tests / future use.
export { Bell };

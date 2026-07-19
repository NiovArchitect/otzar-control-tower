// FILE: nav-employee.ts
// PURPOSE: Employee shell navigation — EXPERIENCE WAVE-1 consolidation.
//          Otzar is ambient intelligence, not a SaaS tab farm.
//          Primary loop is five human surfaces; everything else is
//          route-only or More (minimal). Backend vocabulary never
//          appears in labels.
// CONNECTS TO: EmployeeNav, App.tsx /app routes,
//              docs/otzar/EXPERIENCE_GOVERNING_SPEC.md

import {
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
  Sparkles,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface EmployeeNavItem {
  label: string;
  to: string;
  adminOnly?: boolean;
  /** Reachable by URL; not shown in nav. */
  hidden?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  group: "primary" | "more";
}

/**
 * WAVE-1 primary loop (experience-first):
 *   Today · Talk · Needs me · People · Memory
 * Manager-only: Team (capacity view).
 */
export const EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> = [
  {
    label: "Today",
    to: "/app",
    icon: Sun,
    description: "What needs you — one calm surface.",
    group: "primary",
  },
  {
    label: "Talk",
    to: "/app/voice",
    icon: Mic,
    description: "Ask Otzar by voice or text. You approve what leaves.",
    group: "primary",
  },
  {
    label: "Needs me",
    to: "/app/action-center",
    icon: ListChecks,
    description: "Approvals, handoffs, and work waiting on you.",
    group: "primary",
  },
  {
    label: "People",
    to: "/app/collaboration",
    icon: Users,
    description: "Teammates and shared work — the right people, not everyone.",
    group: "primary",
  },
  {
    label: "Memory",
    to: "/app/my-memory",
    icon: Wallet,
    description: "Your work memory and preferences. You stay in control.",
    group: "primary",
  },
  {
    label: "Team",
    to: "/app/team-work",
    icon: Network,
    description: "Who is waiting on whom across your team.",
    group: "primary",
    adminOnly: true,
  },

  // ── More — rare, not the daily path ───────────────────────────
  {
    label: "My AI Teammate",
    to: "/app/my-twin",
    icon: Bot,
    description: "Your AI Teammate identity and setup.",
    group: "more",
  },
  {
    label: "Captures",
    to: "/app/comms",
    icon: Headphones,
    description: "Meetings and conversations turned into follow-ups you approve.",
    group: "more",
    // Prefer Comms deep-link from Today; keep route, thin the More drawer.
    hidden: true,
  },
  {
    label: "Account & Security",
    to: "/app/account-security",
    icon: ShieldCheck,
    description: "Password and account security.",
    group: "more",
  },
  {
    label: "Schedule",
    to: "/app/work-schedule",
    icon: Sun,
    description: "Time zone and working hours.",
    group: "more",
    hidden: true,
  },
  {
    label: "Preferences",
    to: "/app/preferences",
    icon: BookOpen,
    description: "How you like to work.",
    group: "more",
    hidden: true,
  },
  {
    label: "Corrections",
    to: "/app/corrections",
    icon: PencilLine,
    description: "Teach and correct your AI Teammate.",
    group: "more",
    hidden: true,
  },
  {
    label: "Launch readiness",
    to: "/app/onboarding-readiness",
    icon: ShieldCheck,
    description: "Manager checklist before go-live.",
    group: "more",
    adminOnly: true,
    hidden: true,
  },

  // ── Hidden — deep links only (no nav) ─────────────────────────
  {
    label: "My Day (legacy)",
    to: "/app/my-day",
    icon: Sun,
    description: "Legacy workbench — use Today.",
    group: "more",
    hidden: true,
  },
  {
    label: "My Work",
    to: "/app/my-work",
    icon: ListTodo,
    description: "Redirects to Needs me.",
    group: "more",
    hidden: true,
  },
  {
    label: "Workspace",
    to: "/app/workspace",
    icon: Building2,
    description: "Redirects to Today.",
    group: "more",
    hidden: true,
  },
  {
    label: "Blind Spots",
    to: "/app/blind-spots",
    icon: AlertTriangle,
    description: "Redirects to Needs me.",
    group: "more",
    hidden: true,
  },
  {
    label: "Work health",
    to: "/app/operational-health",
    icon: Activity,
    description: "Operational health detail.",
    group: "more",
    hidden: true,
  },
  {
    label: "Workspaces",
    to: "/app/collaboration-workspaces",
    icon: Building2,
    description: "Shared workspaces.",
    group: "more",
    hidden: true,
  },
  {
    label: "My Organization",
    to: "/app/my-organization",
    icon: Building2,
    description: "Org place detail.",
    group: "more",
    hidden: true,
  },
  {
    label: "Projects",
    to: "/app/work-projects",
    icon: FolderKanban,
    description:
      "Projects you own or work on — so Otzar knows which work belongs together.",
    group: "more",
    // A.2 — Projects are Work OS core, not route-only. Still More (not primary)
    // so the ambient rail stays five calm entries.
    hidden: false,
  },
  {
    label: "Meeting captures",
    to: "/app/meeting-captures",
    icon: Mic,
    description: "Meeting capture detail.",
    group: "more",
    hidden: true,
  },
  {
    label: "Tool connections",
    to: "/app/connector-health",
    icon: Cable,
    description: "Connected tool status.",
    group: "more",
    hidden: true,
  },
  {
    label: "Approvals",
    to: "/app/approvals",
    icon: ClipboardCheck,
    description: "Redirects to Needs me.",
    group: "more",
    hidden: true,
  },
  {
    label: "Authority",
    to: "/app/authority-grants",
    icon: KeyRound,
    description: "Twin authority grants.",
    group: "more",
    hidden: true,
  },
  {
    label: "Chat",
    to: "/app/chat",
    icon: MessageSquare,
    description: "Text chat with Twin.",
    group: "more",
    hidden: true,
  },
  {
    label: "Getting started",
    to: "/app/welcome",
    icon: Sparkles,
    description: "Welcome.",
    group: "more",
    hidden: true,
  },
  {
    label: "Observe",
    to: "/app/observe",
    icon: Eye,
    description: "Context observe.",
    group: "more",
    hidden: true,
  },
  {
    label: "Voice captures",
    to: "/app/voice-captures",
    icon: Mic,
    description: "Voice capture list.",
    group: "more",
    hidden: true,
  },
  {
    label: "Conversations",
    to: "/app/conversations",
    icon: MessagesSquare,
    description: "Conversation list.",
    group: "more",
    hidden: true,
  },
];

export const PRIMARY_EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> =
  EMPLOYEE_NAV.filter((i) => i.group === "primary" && i.hidden !== true);
export const MORE_EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> =
  EMPLOYEE_NAV.filter((i) => i.group === "more" && i.hidden !== true);

export { Bell };

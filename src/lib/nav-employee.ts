// FILE: nav-employee.ts
// PURPOSE: Single source of truth for the EMPLOYEE Otzar shell's
//          navigation. Distinct from src/lib/nav.ts (the org-admin
//          Control Tower nav) so the two personas never share a menu.
// CONNECTS TO: EmployeeNav (renderer), App.tsx /app routes,
//              src/pages/app/*.
//
// Phase 1 employee surface = Home, Chat, Observe, Corrections. All map
// to REAL /otzar/* product endpoints. Future surfaces (My Twin, Teams,
// Context) are shown as disabled FutureFeatureCard tiles on Home, NOT
// as nav entries -- there is no backend contract for them yet.

import {
  Bot,
  BookOpen,
  ClipboardCheck,
  Eye,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Mic,
  MessageSquare,
  MessagesSquare,
  PencilLine,
  Users,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface EmployeeNavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

export const EMPLOYEE_NAV: ReadonlyArray<EmployeeNavItem> = [
  {
    label: "Home",
    to: "/app",
    icon: LayoutDashboard,
    description: "Your Otzar workspace.",
  },
  {
    label: "Chat",
    to: "/app/chat",
    icon: MessageSquare,
    description: "Talk with your AI teammate.",
  },
  {
    label: "Observe",
    to: "/app/observe",
    icon: Eye,
    description: "Submit context for Otzar to learn from.",
  },
  {
    label: "Corrections",
    to: "/app/corrections",
    icon: PencilLine,
    description: "Teach and correct your AI teammate.",
  },
  {
    label: "Approvals",
    to: "/app/approvals",
    icon: ClipboardCheck,
    description: "Approval requests waiting on you.",
  },
  {
    label: "My Twin",
    to: "/app/my-twin",
    icon: Bot,
    description: "Your aligned AI teammate.",
  },
  {
    label: "Authority",
    to: "/app/authority-grants",
    icon: KeyRound,
    description: "Choose what your Twin may do for you.",
  },
  {
    label: "Preferences",
    to: "/app/preferences",
    icon: BookOpen,
    description: "Teach your Twin how you work.",
  },
  {
    label: "Collaboration",
    to: "/app/collaboration",
    icon: Users,
    description: "Ask coworkers, teams, and projects for help.",
  },
  {
    label: "Projects",
    to: "/app/work-projects",
    icon: FolderKanban,
    description: "Your work projects and members.",
  },
  {
    label: "Voice",
    to: "/app/voice-ready",
    icon: Mic,
    description: "Talk to Otzar — speech-ready replies.",
  },
  {
    label: "Conversations",
    to: "/app/conversations",
    icon: MessagesSquare,
    description: "Your ambient console sessions.",
  },
];

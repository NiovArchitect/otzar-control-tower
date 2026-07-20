// FILE: role-intelligence-report.ts
// PURPOSE: P-01 — Role-specific intelligence reports (CEO/exec/manager/
//          employee/contractor). Not a generic dashboard wall and not
//          fake charts: a short, role-ordered set of real destinations
//          with counts from live signals the user can open.
// CONNECTS TO: role-home (HomeRole), AmbientWorkSurface, FOUNDER P-01.

import type { HomeRole } from "@/lib/today/role-home";

export type RoleIntelSectionId =
  | "decisions"
  | "team"
  | "missions"
  | "structure"
  | "tools"
  | "scoped_work"
  | "twin"
  | "docs"
  | "readiness";

export interface RoleIntelSignals {
  /** Needs-me / approvals / stuck count. */
  needsMeCount: number;
  /** Active projects the viewer is on. */
  projectCount: number;
  /** Team people with open obligations (managers/execs). */
  teamOpenCount: number;
  /** People awaiting placement / structure gaps. */
  structureGapCount: number;
  /** Tools needing reconnect. */
  toolsNeedReconnect: boolean;
  toolsLabel?: string | null;
  /** Twin / AI work in flight. */
  twinWorkingCount: number;
  /** Working doc present. */
  hasWorkingDoc: boolean;
  /** Org truth / coherence attention. */
  attentionCount: number;
  blockedOrUnpaired: boolean;
}

export interface RoleIntelSection {
  id: RoleIntelSectionId;
  title: string;
  /** Why this section exists for THIS role (not generic filler). */
  why: string;
  /** Live signal line (honest empty allowed). */
  signal: string;
  href: string;
  tone: "calm" | "attention" | "blocked";
}

export interface RoleIntelligenceReport {
  role: HomeRole;
  /** Report title — differs by role. */
  title: string;
  /** One-line framing for the role. */
  subtitle: string;
  sections: RoleIntelSection[];
  /** Always-honest provenance: not a surveillance score. */
  dataNote: string;
}

function needsSignal(n: number): { signal: string; tone: RoleIntelSection["tone"] } {
  if (n <= 0) return { signal: "Clear — nothing waiting on you", tone: "calm" };
  if (n === 1) return { signal: "1 item needs you", tone: "attention" };
  return { signal: `${n} items need you`, tone: "attention" };
}

function projectsSignal(n: number): string {
  if (n <= 0) return "No active missions yet";
  if (n === 1) return "1 active mission";
  return `${n} active missions`;
}

/** Section builders — shared content, role chooses order + framing. */
function sectionDecisions(s: RoleIntelSignals): RoleIntelSection {
  const n = needsSignal(s.needsMeCount + (s.blockedOrUnpaired ? 1 : 0));
  return {
    id: "decisions",
    title: "Decisions & approvals",
    why: "Executives only need the few things that require a call.",
    signal: n.signal,
    href: "/app/action-center",
    tone: s.blockedOrUnpaired ? "blocked" : n.tone,
  };
}

function sectionNeeds(s: RoleIntelSignals, why: string): RoleIntelSection {
  const n = needsSignal(s.needsMeCount);
  return {
    id: "decisions",
    title: "Needs me",
    why,
    signal: n.signal,
    href: "/app/action-center",
    tone: n.tone,
  };
}

function sectionTeam(s: RoleIntelSignals): RoleIntelSection {
  return {
    id: "team",
    title: "Team load",
    why: "Managers watch people and stuck work — not every org metric.",
    signal:
      s.teamOpenCount > 0
        ? `${s.teamOpenCount} open on your people`
        : "No team open-work signal yet",
    href: "/app/collaboration",
    tone: s.teamOpenCount > 5 ? "attention" : "calm",
  };
}

function sectionMissions(s: RoleIntelSignals, why: string): RoleIntelSection {
  return {
    id: "missions",
    title: "Missions",
    why,
    signal: projectsSignal(s.projectCount),
    href: "/app/work-projects",
    tone: "calm",
  };
}

function sectionStructure(s: RoleIntelSignals): RoleIntelSection {
  return {
    id: "structure",
    title: "Org structure",
    why: "Admins keep reporting lines honest so Otzar routes correctly.",
    signal:
      s.structureGapCount > 0
        ? `${s.structureGapCount} waiting for a first project`
        : "Structure quiet",
    href: "/app/work-projects",
    tone: s.structureGapCount > 0 ? "attention" : "calm",
  };
}

function sectionTools(s: RoleIntelSignals): RoleIntelSection {
  return {
    id: "tools",
    title: "Tools & connections",
    why: "Admin sees reconnect debt before the org feels it.",
    signal: s.toolsNeedReconnect
      ? (s.toolsLabel ?? "A connection needs reconnect")
      : "Connections look healthy from Today",
    href: "/app/connector-health",
    tone: s.toolsNeedReconnect ? "attention" : "calm",
  };
}

function sectionScoped(s: RoleIntelSignals): RoleIntelSection {
  const n = needsSignal(s.needsMeCount);
  return {
    id: "scoped_work",
    title: "Scoped work",
    why: "Contractors only see work inside their boundaries.",
    signal: n.signal,
    href: "/app/action-center",
    tone: n.tone,
  };
}

function sectionTwin(s: RoleIntelSignals): RoleIntelSection {
  return {
    id: "twin",
    title: "AI Teammate",
    why: "What your Twin is actively carrying — not a vanity score.",
    signal:
      s.twinWorkingCount > 0
        ? `${s.twinWorkingCount} in flight`
        : "No Twin work in flight",
    href: s.twinWorkingCount > 0 ? "/app/my-work" : "/app/my-twin",
    tone: "calm",
  };
}

function sectionDocs(s: RoleIntelSignals): RoleIntelSection {
  return {
    id: "docs",
    title: "Working doc",
    why: "One place to resume written work without hunting drives.",
    signal: s.hasWorkingDoc ? "Working doc ready" : "Start or reconnect a doc",
    href: "/app/connector-health",
    tone: "calm",
  };
}

function sectionReadiness(s: RoleIntelSignals): RoleIntelSection {
  return {
    id: "readiness",
    title: "Attention pulse",
    why: "Coherence attention is real DGI signal — not a productivity score.",
    signal:
      s.attentionCount > 0
        ? `${s.attentionCount} attention signal${s.attentionCount === 1 ? "" : "s"}`
        : s.blockedOrUnpaired
          ? "Pairing needs a fix"
          : "Coherence calm",
    href: "/app/action-center",
    tone: s.blockedOrUnpaired
      ? "blocked"
      : s.attentionCount > 0
        ? "attention"
        : "calm",
  };
}

const TITLE: Record<HomeRole, { title: string; subtitle: string }> = {
  administrator: {
    title: "Admin intelligence",
    subtitle: "Structure, tools, and what the org needs you to fix.",
  },
  executive: {
    title: "Executive intelligence",
    subtitle: "A few decisions and mission pulse — not a dashboard wall.",
  },
  manager: {
    title: "Manager intelligence",
    subtitle: "Your people, stuck work, and missions — not every org signal.",
  },
  employee: {
    title: "Your work intelligence",
    subtitle: "What needs you, then missions and Twin — calm and short.",
  },
  contractor: {
    title: "Scoped intelligence",
    subtitle: "Only work and missions inside your access boundaries.",
  },
};

/**
 * Build a role-specific intelligence report from live Today signals.
 * Max 4 sections — ADHD-safe, every row routes somewhere real.
 */
export function buildRoleIntelligenceReport(
  role: HomeRole,
  signals: RoleIntelSignals,
): RoleIntelligenceReport {
  const framing = TITLE[role] ?? TITLE.employee;
  let sections: RoleIntelSection[];

  switch (role) {
    case "administrator":
      sections = [
        sectionStructure(signals),
        sectionTools(signals),
        sectionNeeds(signals, "Admin still has personal approvals and stuck work."),
        sectionMissions(signals, "Missions you own or join for the org."),
      ];
      break;
    case "executive":
      sections = [
        sectionDecisions(signals),
        sectionMissions(signals, "Mission heart for org direction."),
        sectionReadiness(signals),
        sectionTeam(signals),
      ];
      break;
    case "manager":
      sections = [
        sectionNeeds(signals, "Approvals and stuck work for you and your line."),
        sectionTeam(signals),
        sectionMissions(signals, "Team missions — open the heart in one hop."),
        sectionTwin(signals),
      ];
      break;
    case "contractor":
      sections = [
        sectionScoped(signals),
        sectionMissions(signals, "Only missions you are placed on."),
        sectionDocs(signals),
        sectionTwin(signals),
      ];
      break;
    case "employee":
    default:
      sections = [
        sectionNeeds(signals, "Your queue first — then everything else."),
        sectionMissions(signals, "Missions you contribute to."),
        sectionTwin(signals),
        sectionDocs(signals),
      ];
      break;
  }

  // Cap at 4 always
  sections = sections.slice(0, 4);

  return {
    role,
    title: framing.title,
    subtitle: framing.subtitle,
    sections,
    dataNote:
      "Built from live signals you can open — not a surveillance score or fake chart.",
  };
}

/** Stable fingerprint for tests: role + ordered section ids. */
export function roleIntelFingerprint(report: RoleIntelligenceReport): string {
  return `${report.role}:${report.sections.map((s) => s.id).join(",")}`;
}

// FILE: route-inventory.ts
// PURPOSE: C-01 — employee + admin route inventory for "earn existence".
//          Primary / more / route-only / redirect / cull-candidate.
// CONNECTS TO: nav-employee.ts, nav.ts, App.tsx, FOUNDER register C-01.

import { EMPLOYEE_NAV } from "@/lib/nav-employee";
import { NAV } from "@/lib/nav";

export type RouteClass =
  | "primary"
  | "more"
  | "route_only"
  | "redirect"
  | "cull_candidate"
  | "admin_primary"
  | "admin_hidden"
  | "admin_coming_soon";

export interface RouteInventoryRow {
  path: string;
  shell: "employee" | "admin" | "public";
  class: RouteClass;
  label: string;
  earns_existence: "yes" | "thin" | "no" | "redirect";
  notes: string;
}

/** Employee App.tsx routes that are redirects (not destinations). */
export const EMPLOYEE_REDIRECTS: ReadonlyArray<{
  path: string;
  target: string;
}> = [
  { path: "/app/my-day", target: "/app" },
  { path: "/app/workspace", target: "/app" },
  { path: "/app/voice-ready", target: "/app/voice" },
];

/**
 * Employee routes registered in App.tsx but not in EMPLOYEE_NAV primary/more
 * as visible items — deep-link / legacy / power surfaces.
 */
export const EMPLOYEE_ROUTE_ONLY: ReadonlyArray<{
  path: string;
  label: string;
  earns: "yes" | "thin" | "no";
  notes: string;
}> = [
  {
    path: "/app/chat",
    label: "Chat",
    earns: "thin",
    notes: "Power surface; Talk is primary",
  },
  {
    path: "/app/observe",
    label: "Observe",
    earns: "thin",
    notes: "Diagnostics; not daily path",
  },
  {
    path: "/app/welcome",
    label: "Welcome",
    earns: "thin",
    notes: "Onboarding residue",
  },
  {
    path: "/app/corrections",
    label: "Corrections",
    earns: "yes",
    notes: "Memory corrections deep-link",
  },
  {
    path: "/app/my-organization",
    label: "My organization",
    earns: "thin",
    notes: "Prefer People hierarchy glance",
  },
  {
    path: "/app/work-schedule",
    label: "Work schedule",
    earns: "thin",
    notes: "Preferences adjacency",
  },
  {
    path: "/app/connector-health",
    label: "Tools health",
    earns: "yes",
    notes: "Reconnect path from Today",
  },
  {
    path: "/app/my-twin/calibration",
    label: "Twin calibration",
    earns: "yes",
    notes: "Sub of My AI Teammate",
  },
  {
    path: "/app/my-twin/calibration/writing-style",
    label: "Writing style",
    earns: "yes",
    notes: "Sub of calibration",
  },
  {
    path: "/app/authority-grants",
    label: "Authority grants",
    earns: "yes",
    notes: "Twin authority deep-link",
  },
  {
    path: "/app/preferences",
    label: "Preferences",
    earns: "yes",
    notes: "Account prefs",
  },
  {
    path: "/app/meeting-captures",
    label: "Meeting captures",
    earns: "thin",
    notes: "Comms adjacency",
  },
  {
    path: "/app/onboarding-readiness",
    label: "Onboarding readiness",
    earns: "thin",
    notes: "Admin-ish employee route",
  },
  {
    path: "/app/voice-captures",
    label: "Voice captures",
    earns: "thin",
    notes: "Talk history adjacency",
  },
  {
    path: "/app/work-projects",
    label: "Projects",
    earns: "yes",
    notes: "Mission heart; Today glance",
  },
  {
    path: "/app/my-work",
    label: "My work",
    earns: "yes",
    notes: "AI/work ledger deep-link",
  },
  {
    path: "/app/inbox/:id",
    label: "Inbox thread",
    earns: "yes",
    notes: "Notification deep-link",
  },
];

/**
 * Explicit cull candidates (C-01) — keep route for deep links but do not
 * promote; prefer redirect or hide from More.
 */
export const CULL_CANDIDATES: ReadonlyArray<{
  path: string;
  reason: string;
  recommended: "hide" | "redirect" | "keep_deep_link";
}> = [
  {
    path: "/app/welcome",
    reason: "Superseded by first-use strip on Today",
    recommended: "redirect",
  },
  {
    path: "/app/my-day",
    reason: "Already redirects to Today",
    recommended: "redirect",
  },
  {
    path: "/app/workspace",
    reason: "Already redirects to Today",
    recommended: "redirect",
  },
  {
    path: "/app/observe",
    reason: "Operator surface; not employee daily path",
    recommended: "keep_deep_link",
  },
  {
    path: "/admin/playground",
    reason: "Scenario Studio/Playground hidden from primary admin nav",
    recommended: "hide",
  },
];

export function buildRouteInventory(): RouteInventoryRow[] {
  const rows: RouteInventoryRow[] = [];

  rows.push({
    path: "/app",
    shell: "employee",
    class: "primary",
    label: "Today",
    earns_existence: "yes",
    notes: "Default Home",
  });

  for (const item of EMPLOYEE_NAV) {
    if (item.to === "/app") continue;
    const cls: RouteClass = item.hidden
      ? "route_only"
      : item.group === "primary"
        ? "primary"
        : "more";
    rows.push({
      path: item.to,
      shell: "employee",
      class: cls,
      label: item.label,
      earns_existence: item.hidden ? "thin" : "yes",
      notes: item.description,
    });
  }

  for (const r of EMPLOYEE_REDIRECTS) {
    rows.push({
      path: r.path,
      shell: "employee",
      class: "redirect",
      label: r.path,
      earns_existence: "redirect",
      notes: `→ ${r.target}`,
    });
  }

  const navPaths = new Set(EMPLOYEE_NAV.map((n) => n.to));
  for (const r of EMPLOYEE_ROUTE_ONLY) {
    if (navPaths.has(r.path)) continue;
    rows.push({
      path: r.path,
      shell: "employee",
      class: "route_only",
      label: r.label,
      earns_existence: r.earns,
      notes: r.notes,
    });
  }

  for (const c of CULL_CANDIDATES) {
    if (rows.some((row) => row.path === c.path && row.class === "cull_candidate")) {
      continue;
    }
    const existing = rows.find((row) => row.path === c.path);
    if (existing && existing.class !== "redirect") {
      // annotate only
      existing.notes = `${existing.notes} | cull: ${c.recommended} — ${c.reason}`;
    } else if (!existing) {
      rows.push({
        path: c.path,
        shell: c.path.startsWith("/admin") ? "admin" : "employee",
        class: "cull_candidate",
        label: c.path,
        earns_existence: "no",
        notes: `${c.recommended}: ${c.reason}`,
      });
    }
  }

  for (const item of NAV) {
    const cls: RouteClass = item.comingSoon
      ? "admin_coming_soon"
      : item.hidden
        ? "admin_hidden"
        : "admin_primary";
    rows.push({
      path: item.to,
      shell: "admin",
      class: cls,
      label: item.label,
      earns_existence: item.comingSoon || item.hidden ? "thin" : "yes",
      notes: `${item.group}: ${item.description}`,
    });
  }

  return rows;
}

export function inventorySummary(rows: RouteInventoryRow[] = buildRouteInventory()) {
  const byClass: Record<string, number> = {};
  for (const r of rows) {
    byClass[r.class] = (byClass[r.class] ?? 0) + 1;
  }
  return {
    total: rows.length,
    byClass,
    employeePrimary: rows.filter(
      (r) => r.shell === "employee" && r.class === "primary",
    ).length,
    cullCandidates: CULL_CANDIDATES.length,
  };
}

// FILE: relay-boundary.ts
// PURPOSE: T-01 — Otzar Relay remains a separate work-communications app
//          roadmap; never confuse with Control Tower employee shell.
// CONNECTS TO: RelayBoundaryCard, Comms, CompanyProfile, EXPERIENCE_GOVERNING_SPEC,
//          FOUNDER T-01.

export const T01_DOCTRINE =
  "Otzar Relay is a separate work-communications application roadmap. " +
  "Control Tower is the ambient Work OS employee shell (Today, Talk, Needs me, " +
  "People, Memory) plus admin setup. Relay is not merged into CT nav, and CT " +
  "is not a Slack-style channel product.";

export const RELAY_BOUNDARY_RULES = [
  {
    id: "separate_app",
    label: "Separate app",
    plain: "Relay ships as its own product surface — not a CT employee page rename.",
  },
  {
    id: "not_slack_clone",
    label: "Not a channel maze",
    plain: "Relay is not a Slack clone; CT Comms is meeting/source capture under gates.",
  },
  {
    id: "ct_shell_clear",
    label: "CT shell stays Work OS",
    plain: "Employee primary nav stays Today / Talk / Needs me / People / Memory.",
  },
  {
    id: "foundation_authority",
    label: "Shared Foundation authority",
    plain: "Identity, permissions, truth, and evidence stay Foundation — both products honor it.",
  },
  {
    id: "roadmap_honest",
    label: "Roadmap honesty",
    plain: "Messaging-first Relay slices are roadmap; CT must not claim Relay is fully built here.",
  },
] as const;

/** Copy that falsely collapses Relay into CT (must not appear as product claims). */
export const RELAY_CONFUSION_PATTERNS = [
  /relay is built into control tower/i,
  /relay is your today home/i,
  /this is otzar relay \(employee shell\)/i,
  /slack for otzar inside ct/i,
  /channel maze is relay in ct/i,
  /relay fully shipped in control tower/i,
] as const;

export function claimsRelayMergedIntoCt(text: string): boolean {
  return RELAY_CONFUSION_PATTERNS.some((re) => re.test(text));
}

export type ProductBoundary = "control_tower" | "relay" | "shared_foundation";

export function classifyProductSurface(path: string): ProductBoundary {
  const p = (path ?? "").split("?")[0] ?? "";
  if (p.startsWith("/relay") || p.includes("otzar-relay")) return "relay";
  // CT employee + admin shells
  if (
    p.startsWith("/app") ||
    p.startsWith("/setup") ||
    p.startsWith("/users") ||
    p.startsWith("/login") ||
    p === "/" ||
    p.startsWith("/ai-teammates") ||
    p.startsWith("/access")
  ) {
    return "control_tower";
  }
  return "shared_foundation";
}

export function isEmployeePrimaryNavPath(path: string): boolean {
  const p = (path ?? "").split("?")[0] ?? "";
  const primary = [
    "/app",
    "/app/",
    "/app/voice",
    "/app/action-center",
    "/app/collaboration",
    "/app/my-memory",
    "/app/people",
  ];
  if (p === "/app") return true;
  return primary.some((root) => p === root || p.startsWith(`${root}/`));
}

export const T01_RELAY_APP_RESIDUAL =
  "The Relay messaging application is not built in this Control Tower deploy. " +
  "Boundary product truth is enforced here: no merge into the employee shell, " +
  "no false claim that Relay is already CT. Roadmap messaging slices stay separate.";

export const CT_EMPLOYEE_SHELL_LABEL =
  "Control Tower employee shell — ambient Work OS (not Relay)";

export const RELAY_ROADMAP_LABEL =
  "Otzar Relay — separate work-communications roadmap";

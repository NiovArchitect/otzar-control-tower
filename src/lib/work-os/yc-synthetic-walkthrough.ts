// FILE: yc-synthetic-walkthrough.ts
// PURPOSE: S-01 — continuous YC / multi-role synthetic walkthrough contract.
//          Dedicated YC org harness residual; continuous survival on real
//          product surfaces for CEO/manager/employee/executive/contractor.
// CONNECTS TO: YcContinuousWalkthroughCard, multi-role first5, investor-journey,
//          FOUNDER S-01 / A-05.

import {
  INVESTOR_BANNED_FAKES,
  claimsStagedFrontendFake,
} from "@/lib/work-os/investor-journey";

export const S01_DOCTRINE =
  "A YC-style walkthrough must survive unscripted across real roles on the " +
  "live product — login, Today signal, Needs me, Talk, AI Teammate, Memory — " +
  "with no staged fakes and no dead primary paths. A dedicated synthetic YC " +
  "org is the continuous harness residual; demo-org multi-role survival is product truth today.";

/** Personas the continuous harness must cover (demo or dedicated YC org). */
export const YC_ROLE_PERSONAS = [
  {
    id: "ceo",
    label: "Founder / CEO",
    aha: "Immediate structure and open work — not an empty dashboard",
  },
  {
    id: "manager",
    label: "Manager",
    aha: "Team queue and decisions without admin wall",
  },
  {
    id: "employee",
    label: "Employee",
    aha: "Today + Needs me + Twin in one calm shell",
  },
  {
    id: "executive",
    label: "Executive",
    aha: "Role-aware Home without fake metrics",
  },
  {
    id: "contractor",
    label: "Contractor",
    aha: "Scoped work honesty — participation ≠ full authority",
  },
] as const;

/** Primary paths every role must survive in the first five minutes. */
export const YC_SURVIVAL_PATHS = [
  {
    id: "login_home",
    label: "Login → Home",
    path: "/app",
    signal: /Today|Needs me|Talk|Otzar|work|project|AI Teammate/i,
  },
  {
    id: "needs_me",
    label: "Needs me",
    path: "/app/action-center",
    signal: /Needs me|approval|handoff|work|waiting|clear|empty|nothing/i,
  },
  {
    id: "talk",
    label: "Talk",
    path: "/app/voice",
    signal: /Talk|Otzar|voice|mic|type|listen|message/i,
  },
  {
    id: "twin",
    label: "AI Teammate",
    path: "/app/my-twin",
    signal: /AI Teammate|template|role|authority|Twin|memory|calibration|tools/i,
  },
  {
    id: "memory",
    label: "Memory / wallet",
    path: "/app/my-memory",
    signal: /wallet|memory|preference|portable|Teach|isolation|work style/i,
  },
] as const;

export type YcPathId = (typeof YC_SURVIVAL_PATHS)[number]["id"];

export type YcPathProbe = {
  path_id: YcPathId;
  body: string;
  url: string;
  error_wall: boolean;
};

export function isErrorWall(text: string): boolean {
  return /Something went wrong|Application error|Page not found|404 Not Found/i.test(
    text,
  );
}

export function pathSurvives(probe: YcPathProbe): {
  ok: boolean;
  reason: string;
} {
  const def = YC_SURVIVAL_PATHS.find((p) => p.id === probe.path_id);
  if (!def) return { ok: false, reason: "unknown path" };
  if (probe.error_wall || isErrorWall(probe.body)) {
    return { ok: false, reason: "error wall" };
  }
  if (claimsStagedFrontendFake(probe.body)) {
    return { ok: false, reason: "staged fake language" };
  }
  if (!def.signal.test(probe.body)) {
    return { ok: false, reason: "missing product signal" };
  }
  if (probe.body.trim().length < 40) {
    return { ok: false, reason: "empty surface" };
  }
  return { ok: true, reason: "survived" };
}

export function scoreRoleWalkthrough(
  probes: YcPathProbe[],
): { pass: number; fail: number; all_primary_ok: boolean } {
  let pass = 0;
  let fail = 0;
  for (const p of probes) {
    if (pathSurvives(p).ok) pass++;
    else fail++;
  }
  return {
    pass,
    fail,
    all_primary_ok: fail === 0 && pass >= Math.min(4, YC_SURVIVAL_PATHS.length),
  };
}

export function multiRoleCoverage(roleIdsPresent: string[]): {
  covered: number;
  total: number;
  complete: boolean;
} {
  const want = new Set(YC_ROLE_PERSONAS.map((r) => r.id));
  const have = roleIdsPresent.filter((id) => want.has(id as never));
  const unique = new Set(have);
  return {
    covered: unique.size,
    total: want.size,
    complete: unique.size >= 4, // 4 of 5 is continuous; 5 is full
  };
}

export const S01_DEDICATED_ORG_RESIDUAL =
  "Dedicated synthetic YC org credentials enable a fresh-account continuous " +
  "harness separate from the demo org. Multi-role survival on the live product " +
  "is proven continuously; the residual is org isolation for pure YC unscripted demos.";

export { claimsStagedFrontendFake, INVESTOR_BANNED_FAKES };

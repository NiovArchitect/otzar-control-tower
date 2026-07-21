// FILE: live-cast.ts
// PURPOSE: R-03 — deterministic S250 cast plan for live Foundation provision.
//          Origin keys, markers, role mix. No network.
// CONNECTS TO: live provision script, structural seed-org.

import { mulberry32, pick } from "./prng";
import type { PersonKind } from "./types";

export const R03_MARKERS = {
  environment_class: "SYNTHETIC_SCALE",
  test_program: "R-03",
  scale_level: "S250",
  never_customer: true,
} as const;

export type LiveCastPerson = {
  index: number;
  origin_key: string;
  email_local: string;
  first_name: string;
  last_name: string;
  kind: PersonKind;
  role_title: string;
  department: string;
  manager_index: number | null;
  /** Suspend after create for a few samples. */
  suspend: boolean;
};

const FIRST = [
  "Ava", "Ben", "Cara", "Diego", "Elena", "Finn", "Gia", "Hugo", "Ivy", "Jade",
  "Kai", "Lena", "Milo", "Nora", "Omar", "Pia", "Quinn", "Rio", "Sara", "Theo",
] as const;
const LAST = [
  "Nguyen", "Patel", "Kim", "Garcia", "Chen", "Ali", "Brooks", "Singh", "Lopez",
  "Martinez", "Wright", "Hill", "Scott", "Green", "Adams", "Baker",
] as const;

const DEPTS = [
  "Executive", "Platform", "Growth", "Field Ops", "Customer Success", "Finance",
  "Legal", "Design", "Data", "Security", "Sales", "Support", "Mobile", "Web",
  "AI Lab", "Compliance", "RevOps", "People Ops", "Marketing", "QA",
] as const;

/**
 * Build a deterministic cast of `count` people for live provision.
 * origin_key = R03:S250:<runVersion>:<index>
 */
export function buildLiveCast(input: {
  count: number;
  run_version: string;
  seed?: number;
}): LiveCastPerson[] {
  const rng = mulberry32(input.seed ?? 250_001);
  const out: LiveCastPerson[] = [];
  const n = input.count;

  // Indices 0..3 execs, 4..23 managers (for 250), rest ICs
  const nManagers = Math.min(20, Math.max(2, Math.floor(n / 12)));

  for (let i = 0; i < n; i++) {
    let kind: PersonKind = "employee";
    let role_title = "IC Engineer";
    let manager_index: number | null = null;
    let department = DEPTS[4 + (i % (DEPTS.length - 4))]!;

    if (i === 0) {
      kind = "executive";
      role_title = "CEO";
      department = "Executive";
      manager_index = null;
    } else if (i < 4) {
      kind = "executive";
      role_title = pick(rng, ["VP Ops", "VP Product", "CFO"] as const);
      department = "Executive";
      manager_index = 0;
    } else if (i < 4 + nManagers) {
      kind = "manager";
      role_title = pick(rng, [
        "Engineering Manager",
        "CS Manager",
        "Sales Manager",
        "Ops Manager",
      ] as const);
      manager_index = 1 + ((i - 4) % 3);
      department = DEPTS[(i - 4) % DEPTS.length]!;
    } else {
      const cycle = (i - 4 - nManagers) % 8;
      if (cycle === 3) {
        kind = "contractor";
        role_title = "Contract Engineer";
      } else if (cycle === 5) {
        kind = "consultant";
        role_title = "External Consultant";
      } else if (cycle === 7) {
        kind = "external";
        role_title = "Client Contact";
      } else {
        kind = "employee";
        role_title = pick(rng, [
          "IC Engineer",
          "IC Designer",
          "IC Analyst",
          "IC CSM",
        ] as const);
      }
      const mgrBase = 4 + ((i - 4 - nManagers) % nManagers);
      manager_index = kind === "external" ? null : mgrBase;
    }

    const origin_key = `R03:S250:${input.run_version}:${i}`;
    // Non-deliverable synthetic address — invite API returns token, no real mail
    const email_local = `r03-s250+${input.run_version}-${i}`;
    out.push({
      index: i,
      origin_key,
      email_local,
      first_name: pick(rng, FIRST),
      last_name: `${pick(rng, LAST)}${i}`,
      kind,
      role_title,
      department,
      manager_index,
      suspend: i > 0 && i % 47 === 0, // sparse suspended samples
    });
  }
  return out;
}

export function syntheticEmail(local: string, domain = "niovlabs.com"): string {
  return `${local}@${domain}`;
}

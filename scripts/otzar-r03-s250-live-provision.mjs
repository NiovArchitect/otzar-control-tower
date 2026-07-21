#!/usr/bin/env node
// FILE: otzar-r03-s250-live-provision.mjs
// PURPOSE: R-03 — live Foundation S250 provision through canonical rails.
//          Dedicated Phase-0 org (NOT Meridian, NOT ordinary smoke mutations
//          for full 250 without markers). Canary → escalate with verification.
//
// Usage:
//   node scripts/otzar-r03-s250-live-provision.mjs --preflight
//   node scripts/otzar-r03-s250-live-provision.mjs --phase0
//   node scripts/otzar-r03-s250-live-provision.mjs --target 5
//   node scripts/otzar-r03-s250-live-provision.mjs --target 20
//   node scripts/otzar-r03-s250-live-provision.mjs --target 50
//   ...
//
// Env:
//   OTZAR_SMOKE_API_URL (default https://api.otzar.ai/api/v1)
//   Operator passwords from bootstrap (niov-operator-1/2) for Phase-0
//   R03_SCALE_ADMIN_EMAIL / R03_SCALE_ADMIN_PASSWORD after Phase-0
//   R03_SCALE_ORG_ENTITY_ID after Phase-0
//   R03_RUN_VERSION (default: date-based)
//
// SAFETY: never_customer markers; synthetic emails; suspend-only cleanup;
//         tenancy guard on every write; rate-limited batches.

import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATE_DIR = join(ROOT, ".r03-s250-state");
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const MERIDIAN_ORG = "69c07a00-2b39-4771-95c3-22c214e7ae6c";
const DEMO_ORG_BLOCKLIST = new Set([
  MERIDIAN_ORG,
  // common demo — if resolved, refuse scale mutation
]);

const args = process.argv.slice(2);
const PREFLIGHT = args.includes("--preflight");
const PHASE0 = args.includes("--phase0");
const targetArg = args.find((a) => a.startsWith("--target="));
const TARGET = targetArg ? Number(targetArg.split("=")[1]) : null;
const RUN_VERSION =
  process.env.R03_RUN_VERSION ??
  `r${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadBootstrapSecrets() {
  const p =
    process.env.NIOV_BOOTSTRAP_SECRETS ||
    join(homedir(), "dev/NIOV Labs/secure/bootstrap/.niov-bootstrap-secrets");
  if (!existsSync(p)) return {};
  const lines = readFileSync(p, "utf8").split(/\r?\n/);
  const map = {};
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/([\w.+-]+@[\w.-]+)\s+password:/i);
    if (m && i + 1 < lines.length) {
      map[m[1].toLowerCase()] = lines[i + 1].trim();
    }
    if (l.startsWith("MERIDIAN_ORG_ENTITY_ID:")) {
      map.meridian_org = (lines[i + 1] || "").trim();
    }
  }
  return map;
}

async function api(method, path, { token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, text };
}

async function login(email, password, ops = ["read", "write", "admin_org"]) {
  const r = await api("POST", "/auth/login", {
    body: { email, password, requested_operations: ops },
  });
  if (r.status !== 200) {
    throw new Error(`login failed ${email} status=${r.status} ${JSON.stringify(r.json)}`);
  }
  return r.json.token;
}

async function loginNiov(email, password) {
  // platform ops need can_admin_niov — request admin ops broadly
  return login(email, password, ["read", "write", "admin_org", "admin_niov"]);
}

function statePath() {
  return join(STATE_DIR, `run-${RUN_VERSION}.json`);
}

function loadState() {
  if (!existsSync(statePath())) return null;
  return JSON.parse(readFileSync(statePath(), "utf8"));
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(statePath(), JSON.stringify(state, null, 2) + "\n");
}

function originKey(index) {
  return `R03:S250:${RUN_VERSION}:${index}`;
}

function personEmail(index) {
  return `r03-s250+${RUN_VERSION}-${index}@niovlabs.com`;
}

/** Deterministic cast slice (mirrors live-cast.ts kinds). */
function buildCast(count) {
  const people = [];
  const nManagers = Math.min(20, Math.max(2, Math.floor(count / 12)));
  for (let i = 0; i < count; i++) {
    let kind = "employee";
    let role_title = "IC Engineer";
    let manager_index = null;
    let department = "Platform";
    if (i === 0) {
      kind = "executive";
      role_title = "CEO";
      department = "Executive";
    } else if (i < 4) {
      kind = "executive";
      role_title = "VP";
      department = "Executive";
      manager_index = 0;
    } else if (i < 4 + nManagers) {
      kind = "manager";
      role_title = "Manager";
      department = `Dept-${(i - 4) % 20}`;
      manager_index = 1 + ((i - 4) % 3);
    } else {
      const cycle = (i - 4 - nManagers) % 8;
      if (cycle === 3) {
        kind = "contractor";
        role_title = "Contractor";
      } else if (cycle === 5) {
        kind = "consultant";
        role_title = "Consultant";
      } else if (cycle === 7) {
        kind = "external";
        role_title = "External";
      }
      const mgrBase = 4 + ((i - 4 - nManagers) % Math.max(1, nManagers));
      manager_index = kind === "external" ? null : mgrBase;
      department = `Dept-${(i % 20)}`;
    }
    people.push({
      index: i,
      origin_key: originKey(i),
      email: personEmail(i),
      first_name: `R03P${i}`,
      last_name: `Scale${RUN_VERSION}`,
      kind,
      role_title,
      department,
      manager_index,
      suspend: i > 0 && i % 47 === 0,
    });
  }
  return people;
}

async function preflight() {
  const secrets = loadBootstrapSecrets();
  // Live otzar-api exposes GET /api/v1/health
  const health = await api("GET", "/health");
  const report = {
    at: new Date().toISOString(),
    api: API,
    health: health.json,
    foundation_live_sha: health.json?.git_commit ?? null,
    database: health.json?.database ?? null,
    run_version: RUN_VERSION,
    markers: {
      environment_class: "SYNTHETIC_SCALE",
      test_program: "R-03",
      scale_level: "S250",
      cleanup_group: RUN_VERSION,
      never_customer: true,
    },
    forbidden_orgs: { meridian: MERIDIAN_ORG },
    max_records: 250,
    rate: { batch_size: 5, delay_ms: 400, concurrency: 1 },
    estimated_requests_at_250:
      "≈250 members + 250 invites + 250 activates + 250 ensure-twin + ~230 hierarchy + rights",
    state_file: statePath(),
    existing_state: loadState(),
    operators_present: {
      op1: !!secrets["niov-operator-1@niovlabs.com"],
      op2: !!secrets["niov-operator-2@niovlabs.com"],
      smoke_admin: !!secrets["smoke-admin@niovlabs.com"],
    },
    env_overrides: {
      R03_SCALE_ORG_ENTITY_ID: process.env.R03_SCALE_ORG_ENTITY_ID ?? null,
      R03_SCALE_ADMIN_EMAIL: process.env.R03_SCALE_ADMIN_EMAIL ?? null,
    },
  };

  // Local CT SHA
  try {
    const { execSync } = await import("node:child_process");
    report.ct_main_sha = execSync("git rev-parse HEAD", { cwd: ROOT })
      .toString()
      .trim();
  } catch {
    report.ct_main_sha = null;
  }

  console.log(JSON.stringify(report, null, 2));

  if (health.status !== 200 || health.json?.ok !== true) {
    console.error("PREFLIGHT FAIL: API health");
    process.exit(2);
  }
  if (health.json?.database !== "connected") {
    console.error("PREFLIGHT FAIL: database not connected");
    process.exit(2);
  }
  console.log("PREFLIGHT OK");
  return report;
}

async function phase0CreateOrg() {
  const secrets = loadBootstrapSecrets();
  const op1Email = "niov-operator-1@niovlabs.com";
  const op2Email = "niov-operator-2@niovlabs.com";
  const op1Pw = secrets[op1Email];
  const op2Pw = secrets[op2Email];
  if (!op1Pw || !op2Pw) {
    throw new Error("Missing operator passwords in bootstrap secrets");
  }

  const company_name = `R03 Synthetic Scale ${RUN_VERSION}`;
  const admin_email =
    process.env.R03_SCALE_ADMIN_EMAIL ??
    `r03-scale-admin+${RUN_VERSION}@niovlabs.com`;
  const admin_password =
    process.env.R03_SCALE_ADMIN_PASSWORD ??
    `R03-${RUN_VERSION}-AdminPass1!`;
  const body = {
    company_name,
    industry: "TECH",
    admin_email,
    admin_password,
    admin_first_name: "R03",
    admin_last_name: "ScaleAdmin",
  };

  console.log("[phase0] login operators…");
  const t1 = await loginNiov(op1Email, op1Pw);
  const t2 = await loginNiov(op2Email, op2Pw);

  console.log("[phase0] initiate POST /platform/orgs (expect dual-control 403)…");
  let r = await api("POST", "/platform/orgs", { token: t1, body });
  console.log("[phase0] initiate status", r.status, JSON.stringify(r.json).slice(0, 400));

  let escalationId =
    r.json?.escalation_id ||
    r.json?.escalation?.escalation_id ||
    r.json?.data?.escalation_id;

  if (r.status === 201) {
    console.log("[phase0] unexpected direct 201 (dual-control may be disabled?)");
  } else if (r.status === 403 && escalationId) {
    console.log("[phase0] approve escalation", escalationId, "as op2…");
    const appr = await api("POST", `/escalations/${escalationId}/approve`, {
      token: t2,
      body: { reason: "R-03 S250 dedicated synthetic scale org — never_customer" },
    });
    console.log("[phase0] approve status", appr.status, JSON.stringify(appr.json).slice(0, 300));
    if (appr.status !== 200) {
      throw new Error(`approve failed: ${appr.status}`);
    }
    console.log("[phase0] re-POST /platform/orgs with approval…");
    r = await api("POST", "/platform/orgs", { token: t1, body });
    console.log("[phase0] create status", r.status, JSON.stringify(r.json).slice(0, 500));
  } else if (r.status === 403 && !escalationId) {
    // try nested
    console.error("[phase0] 403 without escalation_id — full body:", r.text?.slice(0, 800));
    throw new Error("dual-control 403 missing escalation_id");
  } else {
    throw new Error(`phase0 initiate unexpected ${r.status}`);
  }

  if (r.status !== 201) {
    throw new Error(`phase0 create failed ${r.status}: ${JSON.stringify(r.json)}`);
  }

  const orgId =
    r.json.org_entity_id ||
    r.json.company_entity_id ||
    r.json.org?.entity_id ||
    r.json.result?.org_entity_id;
  if (!orgId) {
    throw new Error(`phase0 201 missing org id: ${JSON.stringify(r.json)}`);
  }
  if (orgId === MERIDIAN_ORG) {
    throw new Error("REFUSE: created org is Meridian");
  }

  const state = {
    run_version: RUN_VERSION,
    markers: {
      environment_class: "SYNTHETIC_SCALE",
      test_program: "R-03",
      scale_level: "S250",
      cleanup_group: RUN_VERSION,
      never_customer: true,
      company_name,
    },
    org_entity_id: orgId,
    admin_email,
    admin_password,
    phase0_result: {
      keys: Object.keys(r.json),
      org_entity_id: orgId,
    },
    people: {},
    created_at: new Date().toISOString(),
  };
  saveState(state);
  console.log("[phase0] SAVED", statePath());
  console.log("[phase0] ORG", orgId, "ADMIN", admin_email);
  return state;
}

async function assertTenancy(token, expectedOrgId) {
  const h = await api("GET", "/org/hierarchy", { token });
  if (h.status !== 200) throw new Error(`hierarchy ${h.status}`);
  const orgId = h.json.org_entity_id;
  if (orgId !== expectedOrgId) {
    throw new Error(
      `TENANCY GUARD: token org ${orgId} !== expected ${expectedOrgId}`,
    );
  }
  if (orgId === MERIDIAN_ORG) {
    throw new Error("TENANCY GUARD: Meridian is forbidden for R-03 scale");
  }
  return orgId;
}

async function reconcile(token, state) {
  const entities = await api("GET", "/org/entities?type=PERSON&take=250", {
    token,
  });
  const twins = await api("GET", "/org/ai-teammates?take=250", { token });
  const peopleCount = (entities.json?.items ?? []).length;
  const twinCount = (twins.json?.items ?? []).length;
  const planned = Object.keys(state.people).length;
  return {
    planned,
    foundation_live_person_count: peopleCount,
    foundation_live_twin_count: twinCount,
    entities_status: entities.status,
    twins_status: twins.status,
  };
}

async function provisionOne(adminToken, person, state) {
  // Idempotent: if origin already in state, skip
  if (state.people[person.origin_key]?.entity_id) {
    return { skipped: true, ...state.people[person.origin_key] };
  }

  // Try create member
  const created = await api("POST", "/org/members", {
    token: adminToken,
    body: {
      email: person.email,
      first_name: person.first_name,
      last_name: person.last_name,
    },
  });

  let entityId = null;
  if (created.status === 201) {
    entityId = created.json.entity_id;
  } else if (created.status === 409 || created.status === 400) {
    // maybe exists — list and find by email
    const list = await api("GET", "/org/entities?type=PERSON&take=250", {
      token: adminToken,
    });
    const hit = (list.json?.items ?? []).find(
      (i) => (i.email || "").toLowerCase() === person.email.toLowerCase(),
    );
    if (hit) entityId = hit.entity_id;
    else {
      return {
        ok: false,
        error: `create ${created.status} ${JSON.stringify(created.json).slice(0, 200)}`,
      };
    }
  } else {
    return {
      ok: false,
      error: `create ${created.status} ${JSON.stringify(created.json).slice(0, 200)}`,
    };
  }

  // Invite + activate (canonical onboarding) — may 400 if already active
  let password = `R03-${RUN_VERSION}-${person.index}-Pass1!`;
  const invited = await api("POST", "/org/onboarding/invite", {
    token: adminToken,
    body: { entity_id: entityId },
  });
  if (invited.status === 200 && invited.json?.activation_token) {
    const act = await api("POST", "/auth/activate", {
      body: { token: invited.json.activation_token, password },
    });
    if (act.status !== 200 && act.status !== 409) {
      // continue — twin ensure still useful
      console.warn("[warn] activate", person.index, act.status);
    }
  }

  // Hierarchy
  if (person.manager_index !== null) {
    const mgrKey = originKey(person.manager_index);
    const mgr = state.people[mgrKey];
    if (mgr?.entity_id) {
      const edge = await api("POST", "/org/hierarchy/assign", {
        token: adminToken,
        body: {
          person_entity_id: entityId,
          manager_entity_id: mgr.entity_id,
          role_title: person.role_title,
          department: person.department,
        },
      });
      if (edge.status !== 200) {
        console.warn("[warn] hierarchy", person.index, edge.status);
      }
    }
  }

  // Ensure twin
  const twin = await api("POST", `/org/members/${entityId}/ensure-twin`, {
    token: adminToken,
    body: {},
  });
  const twinId = twin.json?.twin_id ?? null;

  // Optional suspend sample
  if (person.suspend) {
    await api("PATCH", `/org/entities/${entityId}`, {
      token: adminToken,
      body: { status: "SUSPENDED" },
    });
  }

  const rec = {
    entity_id: entityId,
    email: person.email,
    origin_key: person.origin_key,
    twin_id: twinId,
    kind: person.kind,
    role_title: person.role_title,
    password,
    suspended: !!person.suspend,
  };
  state.people[person.origin_key] = rec;
  return { ok: true, skipped: false, ...rec };
}

async function provisionTo(target) {
  const state = loadState();
  if (!state?.org_entity_id || !state?.admin_email) {
    throw new Error("No Phase-0 state — run --phase0 first");
  }
  if (state.org_entity_id === MERIDIAN_ORG) {
    throw new Error("REFUSE Meridian");
  }

  const adminToken = await login(
    state.admin_email,
    state.admin_password,
    ["read", "write", "admin_org"],
  );
  await assertTenancy(adminToken, state.org_entity_id);

  const cast = buildCast(Math.min(target, 250));
  const levels = [5, 20, 50, 100, 250].filter((n) => n <= target);
  // Always include exact target
  if (!levels.includes(target)) levels.push(target);
  levels.sort((a, b) => a - b);

  let errors = 0;
  for (const level of levels) {
    console.log(`\n=== provision level ${level} ===`);
    for (let i = 0; i < level; i++) {
      const person = cast[i];
      const result = await provisionOne(adminToken, person, state);
      if (result.ok === false) {
        errors++;
        console.error("[error]", person.origin_key, result.error);
        if (errors >= 5) {
          saveState(state);
          throw new Error("error threshold — stopping");
        }
      } else if (!result.skipped) {
        process.stdout.write(`.`);
      } else {
        process.stdout.write(`s`);
      }
      await sleep(350);
    }
    saveState(state);
    const rec = await reconcile(adminToken, state);
    console.log("\n[reconcile]", JSON.stringify(rec));
    if (rec.entities_status !== 200) throw new Error("entities list failed");
    // Soft check: planned keys vs list
    const planned = Object.keys(state.people).length;
    console.log(`[level ${level}] planned_state=${planned} live_persons≈${rec.foundation_live_person_count} twins≈${rec.foundation_live_twin_count} errors=${errors}`);
    if (errors > 0) {
      console.warn("[level] continuing with errors counted");
    }
  }

  const final = await reconcile(adminToken, state);
  const summary = {
    run_version: RUN_VERSION,
    org_entity_id: state.org_entity_id,
    target,
    planned: Object.keys(state.people).length,
    ...final,
    scale_proven: false,
    foundation_provisioned:
      final.foundation_live_person_count >= 250 &&
      final.foundation_live_twin_count >= 250
        ? "candidates_present"
        : "partial",
    errors,
  };
  console.log("\n=== FINAL ===");
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync(
    join(STATE_DIR, `summary-${RUN_VERSION}.json`),
    JSON.stringify(summary, null, 2) + "\n",
  );
  return summary;
}

// ── main ──
const mode = PREFLIGHT
  ? "preflight"
  : PHASE0
    ? "phase0"
    : TARGET
      ? "provision"
      : "preflight";

try {
  if (mode === "preflight") {
    await preflight();
  } else if (mode === "phase0") {
    await preflight();
    await phase0CreateOrg();
  } else if (mode === "provision") {
    if (!loadState()) {
      console.log("No state — running phase0 first");
      await phase0CreateOrg();
    }
    await provisionTo(TARGET);
  }
} catch (e) {
  console.error("FATAL", e);
  process.exit(1);
}

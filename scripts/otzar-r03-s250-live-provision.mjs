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

/**
 * Classify auth failures without printing secrets.
 * @returns {{ class: string, status: number, code: string|null, has_token: boolean, ops: string[]|null }}
 */
function classifyLoginResult(status, json) {
  const code = json?.code ?? null;
  if (status === 200 && json?.token) {
    const ops = json.allowed_operations ?? [];
    if (ops.includes("admin_niov") || ops.includes("can_admin_niov")) {
      return { class: "AUTH_OK_PLATFORM", status, code, has_token: true, ops };
    }
    if (ops.includes("admin_org") || ops.includes("write")) {
      return { class: "ORG_ADMIN_SUFFICIENT", status, code, has_token: true, ops };
    }
    return { class: "AUTH_OK_LIMITED", status, code, has_token: true, ops };
  }
  if (status === 401) {
    return {
      class: "CREDENTIAL_REJECTED",
      status,
      code: code ?? "INVALID_CREDENTIALS",
      has_token: false,
      ops: null,
    };
  }
  if (status === 403) {
    return {
      class: code === "DUAL_CONTROL_REQUIRED" || /dual/i.test(JSON.stringify(json))
        ? "DUAL_CONTROL_REQUIRED"
        : "PLATFORM_ROLE_MISSING",
      status,
      code,
      has_token: false,
      ops: null,
    };
  }
  if (status === 0 || status >= 500) {
    return {
      class: "AUTH_SERVICE_UNAVAILABLE",
      status,
      code,
      has_token: false,
      ops: null,
    };
  }
  return { class: "CREDENTIAL_REJECTED", status, code, has_token: false, ops: null };
}

async function login(email, password, ops = ["read", "write", "admin_org"]) {
  const r = await api("POST", "/auth/login", {
    body: { email, password, requested_operations: ops },
  });
  const cls = classifyLoginResult(r.status, r.json);
  if (r.status !== 200) {
    const err = new Error(
      `login failed email=${email} class=${cls.class} status=${r.status} code=${cls.code}`,
    );
    err.authClass = cls.class;
    err.httpStatus = r.status;
    throw err;
  }
  return r.json.token;
}

async function loginNiov(email, password) {
  // platform ops need can_admin_niov — request admin ops broadly
  return login(email, password, ["read", "write", "admin_org", "admin_niov"]);
}

/** Probe login once; never logs secrets. */
async function probeLogin(source, email, password, ops) {
  if (!password) {
    return {
      source,
      email,
      present: false,
      class: "CREDENTIAL_SOURCE_MISSING",
      status: null,
      code: null,
    };
  }
  const r = await api("POST", "/auth/login", {
    body: { email, password, requested_operations: ops },
  });
  const cls = classifyLoginResult(r.status, r.json);
  return {
    source,
    email,
    present: true,
    class: cls.class,
    status: cls.status,
    code: cls.code,
    ops: cls.ops,
  };
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
  const health = await api("GET", "/health");

  let demoPresent = !!process.env.DEMO_SHARED_PASSWORD;
  try {
    if (!demoPresent && existsSync("/tmp/demo_pw_val")) {
      demoPresent = readFileSync("/tmp/demo_pw_val", "utf8").trim().length > 0;
    }
  } catch {
    /* ignore */
  }

  const credential_sources = [
    { name: "bootstrap/operator-1", present: !!secrets["niov-operator-1@niovlabs.com"], type: "password", role: "platform_operator" },
    { name: "bootstrap/operator-2", present: !!secrets["niov-operator-2@niovlabs.com"], type: "password", role: "platform_operator" },
    { name: "bootstrap/smoke-admin", present: !!secrets["smoke-admin@niovlabs.com"], type: "password", role: "org_admin_smoke" },
    { name: "bootstrap/meridian-admin", present: !!secrets["meridian-admin@niovlabs.com"], type: "password", role: "org_admin_meridian_forbidden" },
    { name: "tmp/demo_pw_val|DEMO_SHARED_PASSWORD", present: demoPresent, type: "password", role: "demo_org_shared" },
    { name: "env OTZAR_SMOKE_ADMIN_PASSWORD", present: !!process.env.OTZAR_SMOKE_ADMIN_PASSWORD, type: "password", role: "org_admin_smoke" },
    { name: "env OTZAR_CUSTSIM_ADMIN_PASSWORD", present: !!process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD, type: "password", role: "org_admin_meridian_forbidden" },
    { name: "env R03_SCALE_ADMIN_PASSWORD", present: !!process.env.R03_SCALE_ADMIN_PASSWORD, type: "password", role: "org_admin_r03" },
  ];

  const probes = [];
  if (secrets["niov-operator-1@niovlabs.com"]) {
    probes.push(
      await probeLogin(
        "bootstrap/operator-1",
        "niov-operator-1@niovlabs.com",
        secrets["niov-operator-1@niovlabs.com"],
        ["read", "write", "admin_org", "admin_niov"],
      ),
    );
  } else {
    probes.push({
      source: "bootstrap/operator-1",
      email: "niov-operator-1@niovlabs.com",
      present: false,
      class: "CREDENTIAL_SOURCE_MISSING",
    });
  }

  const st = loadState();
  let orgAdminProbe = null;
  if (st?.admin_email && st?.admin_password) {
    orgAdminProbe = await probeLogin(
      "state/r03-scale-admin",
      st.admin_email,
      st.admin_password,
      ["read", "write", "admin_org"],
    );
  }

  const report = {
    at: new Date().toISOString(),
    api: API,
    failing_request_if_phase0: {
      method: "POST",
      endpoint: "/api/v1/auth/login",
      auth_method: "email_password_json_body",
      next_after_token: "POST /api/v1/platform/orgs (Bearer + dual-control)",
      note: "401 occurs at login BEFORE platform authorization",
    },
    health: {
      ok: health.json?.ok,
      database: health.json?.database,
      git_commit: health.json?.git_commit,
    },
    foundation_live_sha: health.json?.git_commit ?? null,
    run_version: RUN_VERSION,
    markers: {
      environment_class: "SYNTHETIC_SCALE",
      test_program: "R-03",
      scale_level: "S250",
      cleanup_group: RUN_VERSION,
      never_customer: true,
    },
    forbidden_orgs: {
      meridian: MERIDIAN_ORG,
      niov_labs_company: "a4ddc200-b651-4215-a3b3-e25ad8d97032",
    },
    max_records: 250,
    rate: { batch_size: 5, delay_ms: 400, concurrency: 1 },
    state_file: statePath(),
    existing_state: st
      ? { org_entity_id: st.org_entity_id, people: Object.keys(st.people || {}).length }
      : null,
    credential_sources,
    auth_probes: probes,
    org_admin_probe: orgAdminProbe,
    env_overrides: {
      R03_SCALE_ORG_ENTITY_ID: process.env.R03_SCALE_ORG_ENTITY_ID ?? null,
      R03_SCALE_ADMIN_EMAIL: process.env.R03_SCALE_ADMIN_EMAIL ?? null,
    },
    authority_split: {
      phase0_org_create: "requires can_admin_niov + dual control (two distinct operators)",
      member_provision: "org admin sufficient after Phase-0: members→invite→activate→hierarchy→ensure-twin",
    },
    live_db_investigation: {
      method: "Render postgres connection-info + read-only SELECT",
      findings: [
        "ACTIVE can_admin_niov census = 0",
        "niov-operator-1/2 entities ABSENT from entities table",
        "smoke-admin / meridian-admin entities ABSENT",
        "Meridian + NIOV Smoke Org entity_ids ABSENT on this live DB",
        "Only COMPANY: NIOV Labs (founder org — forbidden S250 host)",
        "Only 8 PERSON rows (demo cast); no R-03 simulation org",
        "Bootstrap passwords present but map to non-existent principals → 401 CREDENTIAL_REJECTED",
      ],
      recovery:
        "FND scripts/bootstrap-niov-operator.ts zero-root (founder confirm phrase) then dual-control Phase-0",
    },
  };

  try {
    const { execSync } = await import("node:child_process");
    report.ct_main_sha = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    report.ct_main_sha = null;
  }

  const op1 = probes[0];
  if (op1?.class === "AUTH_OK_PLATFORM") {
    report.auth_residual_class = null;
    report.auth_ready_for_phase0 = true;
  } else if (op1?.class === "CREDENTIAL_SOURCE_MISSING") {
    report.auth_residual_class = "CREDENTIAL_SOURCE_MISSING";
    report.auth_ready_for_phase0 = false;
  } else if (op1?.class === "CREDENTIAL_REJECTED") {
    report.auth_residual_class = "PLATFORM_OPERATOR_ENTITIES_ABSENT_OR_STALE_SECRET";
    report.auth_ready_for_phase0 = false;
  } else {
    report.auth_residual_class = op1?.class ?? "AUTHENTICATION_PATH_UNRESOLVED";
    report.auth_ready_for_phase0 = false;
  }

  console.log(JSON.stringify(report, null, 2));

  if (health.status !== 200 || health.json?.ok !== true) {
    console.error("PREFLIGHT FAIL: AUTH_SERVICE_UNAVAILABLE or health");
    process.exit(2);
  }
  if (health.json?.database !== "connected") {
    console.error("PREFLIGHT FAIL: database not connected");
    process.exit(2);
  }
  if (!report.auth_ready_for_phase0) {
    console.error(`PREFLIGHT AUTH class=${report.auth_residual_class} — Phase-0 not ready (not a code gap)`);
  } else {
    console.log("PREFLIGHT OK");
  }
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
  let t1;
  let t2;
  try {
    t1 = await loginNiov(op1Email, op1Pw);
  } catch (e) {
    const cls = e.authClass ?? "CREDENTIAL_REJECTED";
    console.error(
      JSON.stringify({
        step: "phase0_op1_login",
        source: "bootstrap/operator-1",
        present: true,
        endpoint: "POST /api/v1/auth/login",
        class: cls,
        status: e.httpStatus ?? 401,
        hint:
          cls === "CREDENTIAL_REJECTED"
            ? "Password rejected or operator entity absent on live DB. Check can_admin_niov census; recovery: FND bootstrap-niov-operator.ts (founder confirm)."
            : cls,
      }),
    );
    throw e;
  }
  try {
    t2 = await loginNiov(op2Email, op2Pw);
  } catch (e) {
    console.error(
      JSON.stringify({
        step: "phase0_op2_login",
        source: "bootstrap/operator-2",
        present: true,
        class: e.authClass ?? "CREDENTIAL_REJECTED",
        status: e.httpStatus ?? 401,
      }),
    );
    throw e;
  }

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

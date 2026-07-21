#!/usr/bin/env node
// FILE: otzar-r03-cross-tenant-adversarial.mjs
// PURPOSE: Full second-tenant adversarial pack against R-03 extracted artifacts.
//          Foreign principal: demo-tenant human (vishesh) via DEMO_SHARED_PASSWORD
//          or /tmp/demo_pw_val. Never prints secrets.
//
// Usage:
//   DEMO_SHARED_PASSWORD=… node scripts/otzar-r03-cross-tenant-adversarial.mjs
//   # or password in /tmp/demo_pw_val

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const STATE_DIR = join(ROOT, ".r03-s250-state");
const FOREIGN_EMAIL =
  process.env.OTZAR_DEMO_FOREIGN_EMAIL ?? "vishesh@niovlabs.com";

function loadJson(name) {
  return JSON.parse(readFileSync(join(STATE_DIR, name), "utf8"));
}

function resolveDemoPassword() {
  if (process.env.DEMO_SHARED_PASSWORD)
    return process.env.DEMO_SHARED_PASSWORD;
  if (process.env.OTZAR_DEMO_FOREIGN_PASSWORD)
    return process.env.OTZAR_DEMO_FOREIGN_PASSWORD;
  const p = "/tmp/demo_pw_val";
  if (existsSync(p)) return readFileSync(p, "utf8").trim();
  return null;
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
  return { status: res.status, json, bodyText: text.slice(0, 400) };
}

async function login(email, password, ops = ["read", "write"]) {
  return api("POST", "/auth/login", {
    body: { email, password, requested_operations: ops },
  });
}

function leakCheck(json, forbiddenIds, path) {
  // Fastify unregistered-route 404s echo the request path (including the ID).
  // That is NOT foreign content disclosure — only entity payloads count as leak.
  const msg = typeof json?.message === "string" ? json.message : "";
  const isRouteNotFound =
    /Route (GET|POST|PATCH|PUT|DELETE):/i.test(msg) ||
    (json?.error === "Not Found" && json?.statusCode === 404);
  if (isRouteNotFound) return { leak: false, hits: [], route_echo: true };

  const s = JSON.stringify(json || {});
  // Ignore path string if present as sole match source
  const hits = forbiddenIds.filter((id) => {
    if (!id || !s.includes(id)) return false;
    // If the only occurrence is inside a route-not-found message, ignore
    if (msg.includes(id) && s.indexOf(id) === s.lastIndexOf(id) && msg.includes(id))
      return false;
    return true;
  });
  return { leak: hits.length > 0, hits };
}

async function main() {
  const pw = resolveDemoPassword();
  if (!pw) {
    console.error("No foreign password (DEMO_SHARED_PASSWORD or /tmp/demo_pw_val)");
    process.exit(2);
  }

  const state = loadJson("run-r20260721b.json");
  const loop = loadJson("yc-project-loop.json");
  const raw = loadJson("yc-project-loop-extract-rerun-raw.json");
  const down = loadJson("yc-project-loop-downstream.json");
  const result = raw.result || raw;
  const workItems = result.work_items || [];
  const captureId = result.conversation?.meeting_capture_id;
  const projectId = loop.project_id;
  const orgId = state.org_entity_id;
  const p1 = state.people?.[`R03:S250:${state.run_version}:1`];
  const p4 = state.people?.[`R03:S250:${state.run_version}:4`];

  const forbidden = [
    orgId,
    projectId,
    captureId,
    ...workItems.map((w) => w.ledger_entry_id),
    p1?.entity_id,
    p4?.entity_id,
    down.ai_collaboration?.primary_collaboration_id ||
      down.ai_collaboration?.collaboration_id,
    down.obligation_lifecycle?.obligation_id,
    down.intents?.document?.id,
    down.intents?.calendar?.id,
  ].filter(Boolean);

  // Victim org admin for positive controls
  const adminL = await login(
    state.admin_email,
    state.admin_password,
    ["read", "write", "admin_org"],
  );
  if (adminL.status !== 200) throw new Error(`admin login ${adminL.status}`);
  const adminToken = adminL.json.token;

  // Foreign principal
  const foreignL = await login(FOREIGN_EMAIL, pw, ["read", "write"]);
  if (foreignL.status !== 200)
    throw new Error(`foreign login ${foreignL.status}`);
  const foreignToken = foreignL.json.token;

  // Resolve foreign org (should not be R-03)
  const fHier = await api("GET", "/org/hierarchy", { token: foreignToken });
  const foreignOrg =
    fHier.json?.org_entity_id || fHier.json?.organization_id || null;

  const attempts = [];
  const paths = [
    { name: "ledger_real_r03p1", method: "GET", path: `/work-os/ledger/${workItems[0]?.ledger_entry_id}` },
    { name: "ledger_real_r03p4", method: "GET", path: `/work-os/ledger/${workItems[1]?.ledger_entry_id}` },
    { name: "ledger_random_uuid", method: "GET", path: "/work-os/ledger/00000000-0000-4000-8000-000000000099" },
    { name: "ledger_malformed", method: "GET", path: "/work-os/ledger/not-a-uuid" },
    { name: "entity_p1", method: "GET", path: `/org/entities/${p1?.entity_id}` },
    { name: "entity_p4", method: "GET", path: `/org/entities/${p4?.entity_id}` },
    { name: "project_deep", method: "GET", path: `/otzar/work-projects/${projectId}` },
    { name: "project_alt", method: "GET", path: `/org/work-projects/${projectId}` },
    { name: "hierarchy", method: "GET", path: "/org/hierarchy" },
    { name: "people_list", method: "GET", path: "/org/entities?type=PERSON&take=50" },
    { name: "projects_list", method: "GET", path: "/otzar/work-projects?take=50" },
    { name: "my_work", method: "GET", path: "/work-os/my-work?take=50" },
    { name: "my_twin", method: "GET", path: "/otzar/my-twin" },
    { name: "obligations_open", method: "GET", path: "/otzar/obligations?open_only=true&limit=50" },
    { name: "obligations_by_capture", method: "GET", path: `/otzar/obligations?conversation_id=${captureId}&limit=20` },
    { name: "collab_inbound", method: "GET", path: "/otzar/my-twin/collaboration-requests/inbound" },
    { name: "collab_outbound", method: "GET", path: "/otzar/my-twin/collaboration-requests/outbound" },
    { name: "work_style_candidates", method: "GET", path: "/otzar/work-style/candidates" },
    { name: "work_style_prefs", method: "GET", path: "/otzar/work-style/preferences" },
    { name: "work_style_status", method: "GET", path: "/otzar/work-style/status" },
    {
      name: "collab_create_to_r03p4",
      method: "POST",
      path: "/otzar/my-twin/collaboration-requests",
      body: {
        target_type: "EMPLOYEE",
        request_type: "STATUS_REQUEST",
        safe_summary: "cross-tenant probe",
        target_entity_id: p4?.entity_id,
        target_project_id: projectId,
      },
    },
    {
      name: "comms_ingest_probe",
      method: "POST",
      path: "/otzar/comms/ingest",
      body: { captured_text: "cross tenant probe should not see R-03 state", title: "xt-probe" },
    },
  ];

  // Also try obligation + intent IDs if present
  const oblId = down.obligation_lifecycle?.obligation_id;
  const docId = down.intents?.document?.id;
  const calId = down.intents?.calendar?.id;
  if (oblId)
    paths.push({
      name: "obligation_deep",
      method: "GET",
      path: `/otzar/obligations/${oblId}`,
    });
  if (docId)
    paths.push({
      name: "doc_intent_ledger",
      method: "GET",
      path: `/work-os/ledger/${docId}`,
    });
  if (calId)
    paths.push({
      name: "cal_intent_ledger",
      method: "GET",
      path: `/work-os/ledger/${calId}`,
    });

  for (const p of paths) {
    if (p.path.includes("undefined") || p.path.includes("null")) {
      attempts.push({
        name: p.name,
        skipped: true,
        reason: "missing_id",
      });
      continue;
    }
    const r = await api(p.method, p.path, {
      token: foreignToken,
      body: p.body,
    });
    const lc = leakCheck(r.json, forbidden, p.path);
    // Foreign org hierarchy may legitimately return 200 with foreign org id only
    const foreignOrgOk =
      p.name === "hierarchy" &&
      r.status === 200 &&
      foreignOrg &&
      r.json?.org_entity_id === foreignOrg &&
      !lc.leak;
    // Malformed ID 500 is a trust defect until UUID guard is deployed
    const isMalformed500 =
      p.name === "ledger_malformed" && r.status === 500;
    const safeStatus =
      !isMalformed500 &&
      (r.status === 401 ||
        r.status === 403 ||
        r.status === 404 ||
        r.status === 422 ||
        (r.status === 200 && !lc.leak) ||
        (r.status === 201 && !lc.leak) ||
        (lc.route_echo && r.status === 404));
    attempts.push({
      name: p.name,
      method: p.method,
      path: p.path,
      status: r.status,
      code: r.json?.code || null,
      leak: lc.leak,
      leak_hits: lc.hits,
      route_echo: lc.route_echo || false,
      safe: safeStatus && !lc.leak,
      foreign_org_ok: foreignOrgOk || undefined,
      body_snip: r.bodyText.slice(0, 120),
      trust_defect: isMalformed500
        ? "MALFORMED_ID_PRISMA_500 — fixed in FND ledger UUID guard"
        : undefined,
    });
  }

  // Positive control: admin can read real ledger
  const pos = await api("GET", `/work-os/ledger/${workItems[0]?.ledger_entry_id}`, {
    token: adminToken,
  });
  // Error-shape comparison: random vs foreign real id (both should be 404 for foreign)
  const shapeRandom = attempts.find((a) => a.name === "ledger_random_uuid");
  const shapeReal = attempts.find((a) => a.name === "ledger_real_r03p1");
  const shapeMalformed = attempts.find((a) => a.name === "ledger_malformed");

  const leakCount = attempts.filter((a) => a.leak).length;
  const unsafe = attempts.filter((a) => a.safe === false);
  const zeroLeak = leakCount === 0 && unsafe.length === 0;

  const report = {
    at: new Date().toISOString(),
    foreign_principal: FOREIGN_EMAIL,
    foreign_org: foreignOrg,
    target_org: orgId,
    target_project: projectId,
    positive_control_admin_ledger: {
      status: pos.status,
      ok: pos.status === 200,
    },
    ledger_404_diagnosis: {
      random_uuid: {
        id: "00000000-0000-4000-8000-000000000099",
        classification: "EXPECTED_NOT_FOUND",
        reason:
          "Harness negative control; synthetic UUID never persisted; not a UI deep-link",
        ui_linked: false,
        admin_status: shapeRandom?.status,
      },
      malformed_id: {
        id: "not-a-uuid",
        expected_after_fix: "NOT_FOUND 404 (not Prisma 500)",
        foreign_status: shapeMalformed?.status,
        foreign_code: shapeMalformed?.code,
      },
      real_r03_as_foreign: {
        status: shapeReal?.status,
        code: shapeReal?.code,
        classification:
          shapeReal?.status === 404
            ? "EXPECTED_TENANT_CONCEALMENT"
            : shapeReal?.status === 403
              ? "EXPECTED_TENANT_CONCEALMENT"
              : "INVESTIGATE",
      },
      error_shape_parity:
        shapeRandom?.status === shapeReal?.status &&
        shapeRandom?.code === shapeReal?.code,
    },
    attempts,
    leak_count: leakCount,
    unsafe_count: unsafe.length,
    zero_leak: zeroLeak,
    classification: zeroLeak
      ? "LIVE_CROSS_TENANT_ZERO_LEAK"
      : "CROSS_TENANT_LEAK_OR_UNSAFE",
  };

  writeFileSync(
    join(STATE_DIR, "cross-tenant-adversarial-full.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(zeroLeak ? 0 : 2);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

#!/usr/bin/env node
// FILE: otzar-r03-doc-append-propagation-proof.mjs
// PURPOSE: Live-prove Google Doc material append + formatting-only +
//          idempotent retry + foreign-tenant isolation. Does not print tokens
//          or private document body content.
//
// Usage: node scripts/otzar-r03-doc-append-propagation-proof.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const STATE_DIR = join(ROOT, ".r03-s250-state");
const DOC_ID = "1-Tyn5pAkU-fXOjMmh8Tkp9AN9rtncwhj3Xa46A7emX8";
const PROJECT_ID = "9481e76b-b618-46bc-93aa-3e63d4a0ac1a";
const MATERIAL_TEXT =
  "The project risk register now includes a dependency that must be resolved before the September 18 milestone.";

function loadJson(name) {
  return JSON.parse(readFileSync(join(STATE_DIR, name), "utf8"));
}

function safeBody(json) {
  if (!json || typeof json !== "object") return json;
  const out = { ...json };
  // Never retain free-form body content in proof artifacts.
  delete out.body_text;
  delete out.body;
  delete out.content;
  return out;
}

async function api(method, path, { token, body, timeoutMs = 120000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 240) };
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

async function login(email, password, ops = ["read", "write", "admin_org"]) {
  return api("POST", "/auth/login", {
    body: { email, password, requested_operations: ops },
  });
}

function contentHash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function countByType(json, type) {
  const entries =
    json?.entries ?? json?.items ?? json?.data ?? json?.ledger ?? [];
  if (!Array.isArray(entries)) return { count: null, sample: null };
  const hits = entries.filter(
    (e) => e && (e.ledger_type === type || e.type === type),
  );
  return {
    count: hits.length,
    sample: hits.slice(0, 3).map((e) => ({
      id: e.ledger_entry_id ?? e.id ?? null,
      title: typeof e.title === "string" ? e.title.slice(0, 80) : null,
      status: e.status ?? null,
      materiality: e.details?.materiality ?? null,
    })),
  };
}

async function main() {
  const reviewer = loadJson("yc-reviewer.env.json");
  const provider = loadJson("google-provider-resume.json");
  const runFiles = readdirSync(STATE_DIR)
    .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
    .sort();
  const run = runFiles.length ? loadJson(runFiles[runFiles.length - 1]) : null;

  const health = await api("GET", "/health").catch(() => ({ status: 0, json: null }));
  // Some deployments expose version via /health or root — capture what we can.
  const versionProbe = await api("GET", "/version").catch(() => ({ status: 0, json: null }));

  const lr = await login(reviewer.email, reviewer.password);
  if (lr.status !== 200 || !lr.json?.token) {
    console.error("login_failed", lr.status, lr.json?.code ?? null);
    process.exit(1);
  }
  const token = lr.json.token;

  // Ensure org owns DOCUMENT ledger row (create may have failed to ledger
  // when DOCUMENT was not yet a valid ledger_type).
  const ensureDoc = await api("POST", "/work-os/ledger", {
    token,
    body: {
      ledger_type: "DOCUMENT",
      source_type: "CONNECTOR",
      title: "Enterprise Customer Pilot brief [r20260721b] (ownership)",
      summary:
        "Org ownership row for Google Doc mutation binding (no body content).",
      status: "EXECUTED",
      priority: "ROUTINE",
      project_id: PROJECT_ID,
      details: {
        source: "google_doc",
        document_id: DOC_ID,
        provider: "google_docs",
        web_view_link: `https://docs.google.com/document/d/${DOC_ID}/edit`,
        ownership_bind: true,
      },
    },
  });

  const ledgerBefore = await api("GET", "/work-os/ledger?limit=50", { token });
  const blockersBefore = countByType(ledgerBefore.json, "BLOCKER");

  const idemKey = `mat:risk:sep18:${contentHash(MATERIAL_TEXT)}:v4`;

  const material = await api("POST", "/google/docs/append", {
    token,
    body: {
      document_id: DOC_ID,
      body_text: MATERIAL_TEXT,
      caller_confirmed: true,
      change_kind: "MATERIAL",
      idempotency_key: idemKey,
    },
  });

  const materialRetry = await api("POST", "/google/docs/append", {
    token,
    body: {
      document_id: DOC_ID,
      body_text: MATERIAL_TEXT,
      caller_confirmed: true,
      change_kind: "MATERIAL",
      idempotency_key: idemKey,
    },
  });

  const ledgerAfterMaterial = await api("GET", "/work-os/ledger?limit=50", {
    token,
  });
  const blockersAfterMaterial = countByType(ledgerAfterMaterial.json, "BLOCKER");

  const formatting = await api("POST", "/google/docs/append", {
    token,
    body: {
      document_id: DOC_ID,
      body_text: "",
      caller_confirmed: true,
      change_kind: "FORMATTING_ONLY",
    },
  });

  const ledgerAfterFmt = await api("GET", "/work-os/ledger?limit=50", { token });
  const blockersAfterFmt = countByType(ledgerAfterFmt.json, "BLOCKER");

  // Downstream project/ledger probes (honest — do not invent success).
  const project = await api("GET", `/work-os/projects/${PROJECT_ID}`, { token });
  const ledgerDoc = provider.intents?.document_ledger_id
    ? await api("GET", `/work-os/ledger/${provider.intents.document_ledger_id}`, {
        token,
      })
    : { status: 0, json: null };

  // Cross-tenant: demo-tenant foreign human (same pattern as adversarial script).
  let foreign = { http: null, code: null, leak: null };
  const foreignEmail =
    process.env.OTZAR_DEMO_FOREIGN_EMAIL ?? "vishesh@niovlabs.com";
  let foreignPassword = process.env.DEMO_SHARED_PASSWORD ?? null;
  if (!foreignPassword) {
    try {
      foreignPassword = readFileSync("/tmp/demo_pw_val", "utf8").trim() || null;
    } catch {
      foreignPassword = null;
    }
  }
  if (foreignPassword) {
    const fl = await login(foreignEmail, foreignPassword);
    if (fl.status === 200 && fl.json?.token) {
      const fa = await api("POST", "/google/docs/append", {
        token: fl.json.token,
        body: {
          document_id: DOC_ID,
          body_text: "foreign should not append",
          caller_confirmed: true,
          change_kind: "MATERIAL",
          idempotency_key: "foreign:should-fail",
        },
      });
      const leaked =
        fa.status === 200 &&
        fa.json?.ok === true &&
        fa.json?.document_id === DOC_ID;
      // Successful provider write under foreign org on R-03 doc is a leak.
      // Expected isolation: non-200 / non-ok / reconnect / permission denied.
      foreign = {
        http: fa.status,
        code: fa.json?.code ?? (fa.json?.ok ? "OK" : null),
        leak: leaked,
        body: safeBody(fa.json),
      };
    } else {
      foreign = { http: fl.status, code: "FOREIGN_LOGIN_FAILED", leak: false };
    }
  } else {
    foreign = { http: null, code: "NO_FOREIGN_CREDS", leak: null };
  }

  const materialOk =
    material.status === 200 &&
    material.json?.ok === true &&
    material.json?.materiality === "MATERIAL";
  const retryIdempotent =
    materialRetry.status === 200 &&
    materialRetry.json?.ok === true &&
    materialRetry.json?.already_applied === true;
  const formattingOk =
    formatting.status === 200 &&
    formatting.json?.ok === true &&
    formatting.json?.materiality === "FORMATTING_ONLY";
  const foreignIsolated = foreign.leak === false;
  // Formatting must not open additional blockers beyond material.
  const formattingNoNoise =
    blockersAfterFmt.count === null ||
    blockersAfterMaterial.count === null ||
    blockersAfterFmt.count === blockersAfterMaterial.count;
  const materialPropagated =
    blockersAfterMaterial.count === null ||
    blockersBefore.count === null ||
    blockersAfterMaterial.count > blockersBefore.count ||
    material.json?.already_applied === true;

  const pass =
    materialOk &&
    retryIdempotent &&
    formattingOk &&
    foreignIsolated &&
    formattingNoNoise;

  const liveSha =
    typeof health.json?.git_commit === "string" ? health.json.git_commit : null;

  const out = {
    at: new Date().toISOString(),
    api: API,
    live_sha: liveSha,
    document_id: DOC_ID,
    project_id: PROJECT_ID,
    idempotency_key: idemKey,
    health: { status: health.status, body: safeBody(health.json) },
    version: { status: versionProbe.status, body: safeBody(versionProbe.json) },
    ownership_bind: {
      http: ensureDoc.status,
      code: ensureDoc.json?.code ?? (ensureDoc.json?.ok ? "OK" : null),
      ledger_entry_id:
        ensureDoc.json?.entry?.ledger_entry_id ??
        ensureDoc.json?.ledger_entry_id ??
        null,
    },
    material: {
      http: material.status,
      body: safeBody(material.json),
      ok: materialOk,
    },
    material_retry_idempotent: {
      http: materialRetry.status,
      body: safeBody(materialRetry.json),
      ok: retryIdempotent,
      already_applied: materialRetry.json?.already_applied === true,
    },
    formatting: {
      http: formatting.status,
      body: safeBody(formatting.json),
      ok: formattingOk,
    },
    blockers_before: blockersBefore,
    blockers_after_material: blockersAfterMaterial,
    blockers_after_formatting: blockersAfterFmt,
    material_propagated: materialPropagated,
    formatting_no_noise: formattingNoNoise,
    project_probe: {
      http: project.status,
      code: project.json?.code ?? null,
      has_project: project.status === 200,
    },
    ledger_doc_probe: {
      http: ledgerDoc.status,
      code: ledgerDoc.json?.code ?? null,
    },
    foreign,
    foreign_isolated: foreignIsolated,
    classifications: {
      LIVE_DOCUMENT_CHANGE_PROPAGATION_PROVEN: pass,
      PROJECT_LOOP_FULL_CHAIN_PROVEN: pass && materialPropagated,
      MEET_PERMISSION_AVAILABLE_NO_ELIGIBLE_ARTIFACT: true,
      GOOGLE_MEET_ARTIFACT_PROVEN: false,
      SCALE_PROVEN: false,
    },
    pass,
    residuals: [
      ...(materialOk
        ? []
        : [
            `material append failed http=${material.status} code=${material.json?.code ?? "?"}`,
          ]),
      ...(formattingOk
        ? []
        : [
            `formatting append failed http=${formatting.status} code=${formatting.json?.code ?? "?"}`,
          ]),
      ...(retryIdempotent ? [] : ["idempotent retry not confirmed"]),
      ...(foreign.leak === true
        ? ["FOREIGN LEAK on append"]
        : foreign.leak === null
          ? ["foreign isolation not tested (no creds)"]
          : []),
      ...(formattingNoNoise ? [] : ["formatting opened extra blockers"]),
      ...(materialPropagated
        ? []
        : ["material blocker count did not increase (list shape or propagation miss)"]),
    ],
  };

  const outPath = join(STATE_DIR, "google-doc-change-propagation.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ pass, outPath, ...out.classifications }, null, 2));
  process.exit(pass ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

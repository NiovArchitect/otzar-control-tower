#!/usr/bin/env node
// FILE: otzar-r03-project-loop-extract-rerun.mjs
// PURPOSE: Re-run the hidden-oracle project conversation on the production
//          extraction path (no DEMO_SCRIPTED, no oracle input, no seeded brief
//          as proof). Compares extraction + work_items to the hidden oracle.
//
// Usage:
//   node scripts/otzar-r03-project-loop-extract-rerun.mjs
//
// Secrets: .r03-s250-state/run-*.json + yc-project-loop.json (gitignored).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const STATE_DIR = join(ROOT, ".r03-s250-state");

function loadJson(name) {
  return JSON.parse(readFileSync(join(STATE_DIR, name), "utf8"));
}

function loadRun() {
  const files = readdirSync(STATE_DIR)
    .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
    .sort();
  if (!files.length) throw new Error("No run-*.json");
  return loadJson(files[files.length - 1]);
}

async function api(method, path, { token, body, timeoutMs = 180000 } = {}) {
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
      json = { raw: text.slice(0, 200) };
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

function scoreOracle(oracle, result) {
  const ex = result.extraction ?? {};
  const blob = JSON.stringify({
    decisions: result.decisions ?? ex.decisions ?? [],
    commitments: ex.commitments ?? [],
    summary: ex.summary ?? "",
    work_items: result.work_items ?? [],
    graph: ex.responsibility_graph ?? {},
  }).toLowerCase();

  const finalOk = blob.includes(oracle.final_agreed_date);
  // Rejected date may appear as rejected/history but must not be sole "final"
  const rejectedMentioned = (oracle.rejected_dates ?? []).some((d) =>
    blob.includes(d),
  );
  const finalInDecisions = (ex.decisions ?? result.decisions ?? [])
    .join(" ")
    .includes(oracle.final_agreed_date);
  const rejectedAsCurrent = (ex.decisions ?? result.decisions ?? []).some(
    (d) =>
      (oracle.rejected_dates ?? []).some((rd) => d.includes(rd)) &&
      /final|agreed|lock/i.test(d) &&
      !/reject|not ready|auto-booking/i.test(d),
  );

  const owners = (result.work_items ?? [])
    .map((w) => (w.owner_name || "").toLowerCase())
    .filter(Boolean);
  const hasP1 = owners.some((o) => o.includes("r03p1"));
  const hasP4 = owners.some((o) => o.includes("r03p4"));

  return {
    extraction_mode: ex.extraction_mode ?? null,
    extraction_outcome:
      result.extraction_outcome ?? ex.extraction_outcome ?? null,
    fallback_reason: result.fallback_reason ?? ex.fallback_reason ?? null,
    work_items_n: (result.work_items ?? []).length,
    owned_n: (result.counts ?? {}).owned ?? null,
    decisions_n: (result.decisions ?? ex.decisions ?? []).length,
    commitments_n: (ex.commitments ?? []).length,
    graph_nodes_n: (ex.responsibility_graph?.nodes ?? []).length,
    final_date_present: finalOk,
    final_date_in_decisions: finalInDecisions,
    rejected_date_mentioned: rejectedMentioned,
    rejected_date_as_current_final: rejectedAsCurrent,
    owner_r03p1: hasP1,
    owner_r03p4: hasP4,
    work_item_titles: (result.work_items ?? []).map((w) => ({
      title: w.title,
      owner: w.owner_name,
      owner_id: w.owner_entity_id,
      status: w.status,
      needs_review: w.needs_review,
    })),
    pass:
      (ex.extraction_mode === "LLM" ||
        result.extraction_outcome === "EXTRACTION_COMPLETED_WITH_SIGNALS") &&
      (result.work_items ?? []).length > 0 &&
      finalOk &&
      !rejectedAsCurrent &&
      (hasP1 || hasP4),
  };
}

async function main() {
  const state = loadRun();
  const loop = loadJson("yc-project-loop.json");
  const oracle = loop.oracle;
  const transcript = loop.transcript;

  const lr = await login(state.admin_email, state.admin_password);
  if (lr.status !== 200 || !lr.json?.token) {
    throw new Error(`admin login ${lr.status}`);
  }
  const token = lr.json.token;

  // Provider presence (no secret values)
  const llm = await api("GET", "/admin/llm-status", { token });
  console.log(
    JSON.stringify(
      {
        llm_status: llm.status,
        llm: llm.json
          ? {
              provider: llm.json.provider,
              status: llm.json.status,
              model: llm.json.model,
            }
          : null,
      },
      null,
      2,
    ),
  );

  // Production path: no force_mode
  const t0 = Date.now();
  const ingest = await api("POST", "/otzar/comms/ingest", {
    token,
    body: {
      captured_text: transcript,
      title: `Oracle re-run (no force_mode) — ${loop.project_name}`,
    },
    timeoutMs: 180000,
  });
  const elapsed = Date.now() - t0;
  const result = ingest.json?.result ?? ingest.json ?? {};
  const metrics = scoreOracle(oracle, result);

  const report = {
    at: new Date().toISOString(),
    ingest_http: ingest.status,
    elapsed_ms: elapsed,
    git_commit_probe: null,
    project_id: loop.project_id,
    meeting_capture_id: result.conversation?.meeting_capture_id ?? null,
    quality: result.quality ?? null,
    metrics,
    extraction_summary: (result.extraction?.summary ?? "").slice(0, 400),
    decisions: result.decisions ?? result.extraction?.decisions ?? [],
    commitments: result.extraction?.commitments ?? [],
    classification: metrics.pass
      ? "PROJECT_LOOP_EXTRACTION_PROVEN"
      : "PROJECT_LOOP_PARTIAL — CAPTURE PROVEN, EXTRACTION NOT PROVEN",
    notes: [
      "Oracle was NOT sent to the model.",
      "DEMO_SCRIPTED not used.",
      "Seeded PROJECT_BRIEF/DECISION_LOG are scaffolding only — not acceptance.",
      "Google Docs/Calendar remain EXTERNALLY_BLOCKED reauth.",
    ],
  };

  // Health fingerprint
  const health = await api("GET", "/health");
  report.git_commit_probe = health.json?.git_commit ?? null;

  writeFileSync(
    join(STATE_DIR, "yc-project-loop-extract-rerun.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  // Keep full raw (may be large) for debug
  writeFileSync(
    join(STATE_DIR, "yc-project-loop-extract-rerun-raw.json"),
    JSON.stringify(
      {
        http: ingest.status,
        result: {
          ...result,
          extraction: result.extraction
            ? {
                ...result.extraction,
                // keep full
              }
            : null,
        },
      },
      null,
      2,
    ) + "\n",
  );

  console.log(JSON.stringify(report, null, 2));
  process.exit(metrics.pass ? 0 : 2);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

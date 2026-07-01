// FILE: tests/e2e/workos-helpers.ts
// PURPOSE: Shared infrastructure for the DEEP Work OS live smoke suite. These
//          smokes prove product behavior (owner resolution, execution plans,
//          connector gaps, governed seeds, per-user scoping, source evidence),
//          not that a route returns 200. API-level assertions run against the
//          real default extraction path (NO forced LOCAL_FALLBACK) so they catch
//          the regressions production would hit.
// SAFETY:  Never prints tokens/passwords. Mutating smokes (seed lifecycle) scope
//          their writes to records they created this run, matched by the ingest's
//          own conversation id + a unique run marker.
// CONNECTS TO: playwright.live.config.ts, otzar-live-workos-*.spec.ts,
//              workos-smoke-reporter.ts.

import type { APIRequestContext, TestInfo } from "@playwright/test";

// UI base (the static SPA) vs API base (the Foundation API). They are DIFFERENT
// hosts: the static site does not proxy /api, so API-level smokes must hit the
// API host directly while UI smokes drive the SPA.
export const UI_BASE = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
export const API_BASE = process.env.OTZAR_API_BASE_URL ?? "https://api.otzar.ai";
export const BASE = API_BASE; // for request-context baseURL in API specs
export const API = `${API_BASE}/api/v1`;
export const PW = process.env.DEMO_SHARED_PASSWORD;

/** Explicit, non-misleading skip reason (never "passed"). */
export const SKIP_NO_PW = "SKIPPED: DEMO_SHARED_PASSWORD missing";
export const skipReasonNoAdmin = (email: string): string =>
  `SKIPPED: admin demo user unavailable (${email})`;

/** A unique per-run marker so a run's own artifacts are greppable/identifiable
 *  and never collide with another run. (Plain test file — Date/random allowed.) */
export function runMarker(): string {
  return `wos-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Mask an id for evidence output — never leak full identifiers into logs. */
export function mask(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 10) return `${id.slice(0, 2)}…`;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/** Attach a human-readable evidence line to the test — the reporter renders it. */
export function ev(testInfo: TestInfo, msg: string): void {
  testInfo.annotations.push({ type: "evidence", description: msg });
}

export type LoginResult = { token: string | null; code?: string; status: number };

/** API login (never the UI). Returns a bearer token or null with the reason. */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  requested_operations: string[],
): Promise<LoginResult> {
  const r = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations },
    headers: { "Content-Type": "application/json" },
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { token?: string; code?: string };
  return { token: j.token ?? null, status: r.status(), ...(j.code ? { code: j.code } : {}) };
}

export interface IngestResult {
  ok: boolean;
  status: number;
  result?: {
    conversation: { meeting_capture_id: string; status: string };
    quality: { total: number; trusted: number; quarantined: number; noisy_tail_start_index: number | null };
    decisions: string[];
    work_items: Array<{
      ledger_entry_id: string | null;
      owner_entity_id: string | null;
      owner_name: string;
      title: string;
      status: string;
      needs_review: boolean;
      execution: {
        execution_type: string;
        execution_mode: string;
        required_connector: string | null;
        capability_state: string | null;
        approval_required: boolean;
        blocker_reason: string | null;
        next_best_action: string | null;
      };
    }>;
    support_edges: Array<{ name: string; relation: string; entity_id: string | null }>;
    counts: { owned: number; needs_review: number; support_edges: number };
    dandelion_seeds: Array<{
      seedType: string;
      subjectName: string | null;
      approvalRequired: boolean;
      recommendedAction: string;
    }>;
    work_graph_event_count: number;
  };
  raw?: unknown;
}

/** Ingest a transcript via the REAL default path (no force_mode) unless a caller
 *  explicitly opts into a deterministic mode. Returns the governed Work OS result. */
export async function ingest(
  request: APIRequestContext,
  token: string,
  input: { text: string; title: string; forceMode?: "LLM" | "LOCAL_FALLBACK" | "DEMO_SCRIPTED" },
): Promise<IngestResult> {
  const r = await request.post(`${API}/otzar/comms/ingest`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: {
      captured_text: input.text,
      title: input.title,
      ...(input.forceMode ? { force_mode: input.forceMode } : {}),
    },
    // The real (LLM) extraction path is slow — well beyond the 15s default.
    timeout: 90_000,
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; result?: IngestResult["result"] };
  return { ok: j.ok === true, status: r.status(), raw: j, ...(j.result ? { result: j.result } : {}) };
}

/** Ingest a NON-transcript source event through the source-agnostic intake
 *  (Slice A). Returns the same governed result shape as transcript ingest. */
export async function ingestSourceEvent(
  request: APIRequestContext,
  token: string,
  source: Record<string, unknown>,
): Promise<IngestResult & { code?: string }> {
  const r = await request.post(`${API}/otzar/ingest/source-event`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: { source },
    timeout: 90_000,
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; result?: IngestResult["result"] };
  return { ok: j.ok === true, status: r.status(), raw: j, ...(j.result ? { result: j.result } : {}), ...(j.code ? { code: j.code } : {}) };
}

/** GET the caller's own governed work ledger (per-user scoped source of truth). */
export async function getMyWork(
  request: APIRequestContext,
  token: string,
): Promise<{ status: number; items: Array<Record<string, unknown>> }> {
  const r = await request.get(`${API}/work-os/my-work`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  const items = (j.items ?? j.work ?? j.entries ?? (Array.isArray(j) ? j : [])) as Array<Record<string, unknown>>;
  return { status: r.status(), items: Array.isArray(items) ? items : [] };
}

/** Grounded, caller-scoped recall across the org work record (the callable
 *  memory path). Results link back to durable ledger rows. */
export async function semanticQuery(
  request: APIRequestContext,
  token: string,
  query: string,
): Promise<{ status: number; ok: boolean; results: Array<Record<string, unknown>> }> {
  const r = await request.post(`${API}/work-os/semantic-retrieval/query`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: { query },
    timeout: 30_000,
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; results?: Array<Record<string, unknown>> };
  return { status: r.status(), ok: j.ok === true, results: j.results ?? [] };
}

/** Transition a seed (approve/hold/reject). Sends body {} — the API rejects an
 *  empty body with a JSON content-type (FST_ERR_CTP_EMPTY_JSON_BODY / 400), so a
 *  body is always sent. Only ever called on seeds this run created. */
export async function seedAction(
  request: APIRequestContext,
  token: string,
  seedId: string,
  verb: "approve" | "hold" | "reject",
  reason?: string,
): Promise<{ status: number; ok: boolean; seed: Record<string, unknown> | undefined }> {
  const r = await request.post(`${API}/org/dandelion/seeds/${encodeURIComponent(seedId)}/${verb}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: reason !== undefined ? { reason } : {},
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; seed?: Record<string, unknown> };
  return { status: r.status(), ok: j.ok === true, seed: j.seed };
}

/** Query the unified governed org query layer (Slice B). scope self|project|team|
 *  org|admin (+ optional query/filter/sort/project_id). */
export async function orgQuery(
  request: APIRequestContext,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; ok: boolean; code?: string; results: Array<Record<string, unknown>> }> {
  const r = await request.post(`${API}/work-os/org-query`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: body,
    timeout: 30_000,
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; results?: Array<Record<string, unknown>> };
  return { status: r.status(), ok: j.ok === true, results: j.results ?? [], ...(j.code ? { code: j.code } : {}) };
}

/** Ask Otzar (conductSession). Returns the answer text. */
export async function conversationMessage(
  request: APIRequestContext,
  token: string,
  message: string,
): Promise<{ status: number; ok: boolean; answer: string }> {
  const r = await request.post(`${API}/otzar/conversation/message`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: { message, conversation_history: [] },
    timeout: 60_000,
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; response?: string; message?: string };
  return { status: r.status(), ok: j.ok === true, answer: String(j.response ?? j.message ?? "") };
}

/** Slice D goal-layer helpers. */
export async function createGoal(
  request: APIRequestContext,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; ok: boolean; code?: string; goal?: Record<string, unknown> }> {
  const r = await request.post(`${API}/work-os/goals`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: body, timeout: 30_000, failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; goal?: Record<string, unknown> };
  return { status: r.status(), ok: j.ok === true, ...(j.code ? { code: j.code } : {}), ...(j.goal ? { goal: j.goal } : {}) };
}
export async function linkWorkToGoal(
  request: APIRequestContext,
  token: string,
  goalId: string,
  ledgerEntryId: string,
): Promise<{ status: number; ok: boolean; code?: string }> {
  const r = await request.post(`${API}/work-os/goals/${encodeURIComponent(goalId)}/link`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: { ledger_entry_id: ledgerEntryId }, timeout: 30_000, failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string };
  return { status: r.status(), ok: j.ok === true, ...(j.code ? { code: j.code } : {}) };
}
export async function goalProgress(
  request: APIRequestContext,
  token: string,
  goalId: string,
): Promise<{ status: number; ok: boolean; linked_count: number; done_count: number; progress_pct: number }> {
  const r = await request.get(`${API}/work-os/goals/${encodeURIComponent(goalId)}/progress`, {
    headers: { Authorization: `Bearer ${token}` }, timeout: 30_000, failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; linked_count?: number; done_count?: number; progress_pct?: number };
  return { status: r.status(), ok: j.ok === true, linked_count: j.linked_count ?? 0, done_count: j.done_count ?? 0, progress_pct: j.progress_pct ?? 0 };
}
export async function listGoals(
  request: APIRequestContext,
  token: string,
  scope = "self",
): Promise<{ status: number; ok: boolean; code?: string; goals: Array<Record<string, unknown>> }> {
  const r = await request.get(`${API}/work-os/goals?scope=${scope}`, {
    headers: { Authorization: `Bearer ${token}` }, timeout: 30_000, failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; goals?: Array<Record<string, unknown>> };
  return { status: r.status(), ok: j.ok === true, ...(j.code ? { code: j.code } : {}), goals: j.goals ?? [] };
}

/** Agent-grounding: governed context for (caller, query) with sufficient flag. */
export async function groundContext(
  request: APIRequestContext,
  token: string,
  query: string,
): Promise<{ status: number; sufficient: boolean; results: Array<Record<string, unknown>>; reason: string }> {
  const r = await request.post(`${API}/work-os/org-query/ground`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data: { query },
    timeout: 30_000,
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { sufficient?: boolean; results?: Array<Record<string, unknown>>; reason?: string };
  return { status: r.status(), sufficient: j.sufficient === true, results: j.results ?? [], reason: j.reason ?? "" };
}

/** GET the admin Dandelion seed queue (admin_org-gated). */
export async function listSeeds(
  request: APIRequestContext,
  token: string,
): Promise<{ status: number; ok: boolean; code: string | undefined; seeds: Array<Record<string, unknown>> }> {
  const r = await request.get(`${API}/org/dandelion/seeds`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; seeds?: Array<Record<string, unknown>> };
  return { status: r.status(), ok: j.ok === true, code: j.code, seeds: j.seeds ?? [] };
}

// FILE: live-tenancy.ts
// PURPOSE: [SMOKE-TENANCY] The single tenancy contract for MUTATING live
//          specs (founder directive 2026-07-07): the demo org is READ-ONLY
//          smoke territory; every mutating live spec runs against the NIOV
//          Smoke Org with OTZAR_SMOKE_ADMIN_* credentials and MUST
//          structurally verify its token resolves to the smoke org
//          (GET /org/hierarchy → org_entity_id) BEFORE any write. An env
//          mistake (demo credentials in the smoke vars) fails loudly
//          instead of mutating the demo org. Also provides the per-run
//          dynamic-member rail (create → invite → activate through the
//          live onboarding rails; caller suspends in cleanup) so smoke
//          specs never depend on named demo people.
// CONNECTS TO: otzar-live-onboard-activation / otzar-live-learn-loop /
//          otzar-live-assign-active-target / otzar-live-assign-workspace
//          (migrated 2026-07-07), otzar-live-redwood-{probe,corpus}
//          (same contract, self-contained), OTZAR_PILOT_OPS_RUNBOOK.md §3.

import { expect, type APIRequestContext } from "@playwright/test";

export const SMOKE_API =
  process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
export const SMOKE_APP =
  process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
export const SMOKE_ADMIN_EMAIL =
  process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "smoke-admin@niovlabs.com";
export const SMOKE_ADMIN_PASSWORD = process.env.OTZAR_SMOKE_ADMIN_PASSWORD;
/** The NIOV Smoke Org COMPANY entity id (Phase-0, 2026-07-06). An opaque
 *  identifier, not a credential — safe to default here; override with
 *  OTZAR_SMOKE_ORG_ENTITY_ID if the smoke org is ever re-created. */
export const SMOKE_ORG_ENTITY_ID =
  process.env.OTZAR_SMOKE_ORG_ENTITY_ID ??
  "ad9515e2-7a9a-4cbc-a6b9-ff1ec2ba4e54";
/** The smoke org's default enterprise hive (informational; specs that need
 *  a hive id should read it from the API, this is the documented value). */
export const SMOKE_DEFAULT_HIVE_ID =
  process.env.OTZAR_SMOKE_DEFAULT_HIVE_ID ??
  "17b56fac-f9ab-4ade-90fd-e30b4e366798";

export const SMOKE_GATE_MESSAGE =
  "Set OTZAR_SMOKE_ADMIN_PASSWORD — mutating live specs run on the NIOV Smoke Org only (demo org is read-only).";
export const DEMO_LOCK_MESSAGE =
  "DEMO ORG IS READ-ONLY (2026-07-07): this arc's live mutation is demo-fixture-bound (named demo people / approver edges) and stays disabled until its smoke-org cast port (gap ledger P1). Write coverage remains in integration tests.";

/** Login as any account and report which org its token resolves to.
 *  Returns null when the login fails or the hierarchy read fails —
 *  callers treat null as "not the smoke org". */
export async function resolveOrgEntityId(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string | null> {
  const login = await request.post(`${SMOKE_API}/auth/login`, {
    data: { email, password, requested_operations: ["read"] },
  });
  if (login.status() !== 200) return null;
  const token = ((await login.json()) as { token: string }).token;
  const h = await request.get(`${SMOKE_API}/org/hierarchy`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (h.status() !== 200) return null;
  return ((await h.json()) as { org_entity_id?: string }).org_entity_id ?? null;
}

/** The structural demo-org guard: the token MUST belong to the smoke org.
 *  Fails the spec loudly before any mutation otherwise. */
export async function assertSmokeOrgTenancy(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const h = await request.get(`${SMOKE_API}/org/hierarchy`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(h.status()).toBe(200);
  const orgId = ((await h.json()) as { org_entity_id?: string }).org_entity_id;
  expect(orgId, "TENANCY GUARD: this token does not resolve to the NIOV Smoke Org — refusing to mutate").toBe(
    SMOKE_ORG_ENTITY_ID,
  );
}

/** Smoke-admin login + tenancy assertion in one step. */
export async function smokeAdminLogin(
  request: APIRequestContext,
  ops: string[] = ["read", "write", "admin_org"],
): Promise<string> {
  const res = await request.post(`${SMOKE_API}/auth/login`, {
    data: {
      email: SMOKE_ADMIN_EMAIL,
      password: SMOKE_ADMIN_PASSWORD,
      requested_operations: ops,
    },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { token: string; allowed_operations: string[] };
  for (const op of ops) expect(body.allowed_operations).toContain(op);
  await assertSmokeOrgTenancy(request, body.token);
  return body.token;
}

export interface SmokeMember {
  entityId: string;
  email: string;
  password: string;
}

/** Provision a per-run dynamic member on the smoke org through the LIVE
 *  onboarding rails (create → invite → activate → password login proven).
 *  Callers own cleanup: suspendEntity() in afterAll/finally. */
export async function provisionSmokeMember(
  request: APIRequestContext,
  adminToken: string,
  runId: string,
  slug = "member",
): Promise<SmokeMember> {
  const auth = { authorization: `Bearer ${adminToken}` };
  const email = `pilot-smoke+${runId}-${slug}@niovlabs.com`;
  const created = await request.post(`${SMOKE_API}/org/members`, {
    headers: auth,
    data: { email, first_name: "Pilot", last_name: `Smoke-${slug}-${runId}` },
  });
  expect(created.status()).toBe(201);
  const entityId = ((await created.json()) as { entity_id: string }).entity_id;
  const invited = await request.post(`${SMOKE_API}/org/onboarding/invite`, {
    headers: auth,
    data: { entity_id: entityId },
  });
  expect(invited.status()).toBe(200);
  const token = ((await invited.json()) as { activation_token: string })
    .activation_token;
  const password = `Sm-${runId}-${slug}-Pass1!`;
  const activated = await request.post(`${SMOKE_API}/auth/activate`, {
    data: { token, password },
  });
  expect(activated.status()).toBe(200);
  return { entityId, email, password };
}

/** Canonical soft-rail cleanup for dynamic identities (RULE 10). */
export async function suspendEntity(
  request: APIRequestContext,
  adminToken: string,
  entityId: string,
): Promise<void> {
  await request.patch(`${SMOKE_API}/org/entities/${entityId}`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: { status: "SUSPENDED" },
  });
}

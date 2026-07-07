// FILE: otzar-live-assign-workspace.spec.ts
// PURPOSE: [GAP-C/P] LIVE workspace-assignment parity, now that the canonical
//          archive rail exists: create ACTIVE smoke workspace → admin assigns
//          a recommended person from the People & Collaboration card (UI,
//          workspace target) → membership + audit → recommendation gone on
//          recompute → idempotent → ARCHIVE via the new rail → targets drop
//          it, assignment refuses honestly, recommendation returns, org
//          restored to its pre-create baseline. Armed ONLY when
//          OTZAR_ASSIGN_SMOKE_MUTATE=1. Guaranteed afterAll archive.
//          TENANCY (migrated 2026-07-07): SMOKE ORG ONLY — smoke-admin +
//          structural tenancy guard; the assignee is a per-run dynamic
//          member (live rails), SUSPENDED in cleanup. Demo org read-only.
// RUN: OTZAR_SMOKE_ADMIN_PASSWORD=… OTZAR_ASSIGN_SMOKE_MUTATE=1 \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-assign-workspace.spec.ts

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  SMOKE_ADMIN_EMAIL,
  SMOKE_ADMIN_PASSWORD,
  SMOKE_GATE_MESSAGE,
  provisionSmokeMember,
  smokeAdminLogin,
  suspendEntity,
  type SmokeMember,
} from "./live-tenancy";

test.describe.configure({ mode: "serial", retries: 0 });

const ARMED = process.env.OTZAR_ASSIGN_SMOKE_MUTATE === "1";
const TAG = process.env.OTZAR_SHOT_TAG ?? "assign-ws";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

const SMOKE_PREFIX = "Otzar Smoke Workspace — Assignment Flow";

test.skip(!SMOKE_ADMIN_PASSWORD, SMOKE_GATE_MESSAGE);
test.skip(!ARMED, "Set OTZAR_ASSIGN_SMOKE_MUTATE=1 to run the reversible-mutation smoke.");

const authed = (t: string) => ({ authorization: `Bearer ${t}` });

interface TargetRow {
  kind: string;
  target_id: string;
  label: string;
  status: string;
}
interface GrowthRec {
  kind: string;
  context?: { person_entity_id: string };
}

async function assignmentTargets(request: APIRequestContext, token: string): Promise<TargetRow[]> {
  const res = await request.get(`${API}/org/assignment-targets`, { headers: authed(token) });
  expect(res.status()).toBe(200);
  return ((await res.json()).targets ?? []) as TargetRow[];
}

async function growthView(
  request: APIRequestContext,
  token: string,
): Promise<{ recs: GrowthRec[]; withoutCount: number }> {
  const res = await request.get(`${API}/otzar/dandelion/org-growth`, { headers: authed(token) });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return {
    recs: (body.growth?.recommendations ?? []) as GrowthRec[],
    withoutCount: (body.growth?.signals?.members_without_project_count ?? -1) as number,
  };
}

async function archiveWorkspace(
  request: APIRequestContext,
  token: string,
  workspaceId: string,
): Promise<{ ok: boolean; code?: string }> {
  const res = await request.post(
    `${API}/otzar/collaboration/workspaces/${workspaceId}/archive`,
    { headers: authed(token) },
  );
  return (await res.json()) as { ok: boolean; code?: string };
}

async function uiLoginToCollaboration(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SMOKE_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(SMOKE_ADMIN_PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/collaboration");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("dandelion-growth-card").waitFor({ state: "visible", timeout: 30_000 });
}

let smokeWorkspaceId = "";
let smokeTitle = "";
let personId = "";
let baselineWithoutCount = -1;
let archived = false;
let smokeMember: SmokeMember | null = null;

test.afterAll(async ({ request }) => {
  if (smokeWorkspaceId !== "" && !archived) {
    const adm = await smokeAdminLogin(request);
    await archiveWorkspace(request, adm, smokeWorkspaceId);
  }
  if (smokeMember !== null) {
    const adm = await smokeAdminLogin(request);
    await suspendEntity(request, adm, smokeMember.entityId);
  }
});

test("W1 api: reversible smoke workspace exists as an ACTIVE assignment target", async ({ request }) => {
  test.setTimeout(180_000);
  const adm = await smokeAdminLogin(request);

  // Pre-clean stale smoke workspaces from earlier runs via the archive rail.
  const before = await assignmentTargets(request, adm);
  for (const stale of before.filter((t) => t.kind === "workspace" && t.label.startsWith(SMOKE_PREFIX))) {
    const res = await archiveWorkspace(request, adm, stale.target_id);
    expect(res.ok === true || res.code === "ALREADY_ARCHIVED").toBe(true);
  }

  // Per-run dynamic member = the person the growth card recommends.
  smokeMember = await provisionSmokeMember(request, adm, RUN, "ws-assignee");

  baselineWithoutCount = (await growthView(request, adm)).withoutCount;
  expect(baselineWithoutCount).toBeGreaterThan(0);

  smokeTitle = `${SMOKE_PREFIX} — ${new Date().toISOString().slice(0, 10)}`;
  const created = await request.post(`${API}/otzar/collaboration/workspaces`, {
    headers: authed(adm),
    data: {
      title: smokeTitle,
      description: "Smoke fixture for workspace-assignment verification. Safe to archive.",
    },
  });
  expect(created.status()).toBe(201);
  const body = await created.json();
  expect(body.ok).toBe(true);
  smokeWorkspaceId = body.workspace.workspace_id as string;

  const targets = await assignmentTargets(request, adm);
  const mine = targets.find((t) => t.target_id === smokeWorkspaceId);
  expect(mine?.kind).toBe("workspace");
  expect(mine?.label).toBe(smokeTitle);
  expect(mine?.status).toBe("ACTIVE");

  // Pick the person from server truth (creating the workspace connected the
  // admin as APPROVE member, so the run's dynamic member must be the rec).
  const view = await growthView(request, adm);
  const needs = view.recs.filter(
    (r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context !== undefined,
  );
  expect(needs.length).toBeGreaterThan(0);
  personId =
    needs.find((r) => r.context?.person_entity_id === smokeMember!.entityId)
      ?.context?.person_entity_id ?? "";
  expect(personId, "the run's dynamic member must appear in the growth recommendations").toBe(
    smokeMember!.entityId,
  );
});

test("W2 ui: assigning to the WORKSPACE from the card changes server truth (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  await uiLoginToCollaboration(page);
  const card = page.locator(`[data-person-entity-id="${personId}"]`).first();
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.getByTestId("dandelion-assign-open").click();
  const targetBtn = card.locator(
    `[data-testid="dandelion-assign-target"][data-target-kind="workspace"][data-target-id="${smokeWorkspaceId}"]`,
  );
  await targetBtn.waitFor({ state: "visible", timeout: 20_000 });

  const assignResponse = page.waitForResponse(
    (r) => r.url().includes("/org/assignments") && r.request().method() === "POST",
    { timeout: 30_000 },
  );
  await targetBtn.click();
  const res = await assignResponse;
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.target_kind).toBe("workspace");
  expect(body.person_entity_id).toBe(personId);
  expect(typeof body.audit_event_id).toBe("string");

  await expect
    .poll(async () => page.locator(`[data-person-entity-id="${personId}"]`).count(), {
      timeout: 30_000,
    })
    .toBe(0);
  await page.screenshot({ path: `screenshots/${TAG}-1-after-assign.png`, fullPage: true });

  const adm = await smokeAdminLogin(request);
  const view = await growthView(request, adm);
  expect(
    view.recs.some(
      (r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context?.person_entity_id === personId,
    ),
  ).toBe(false);
});

test("W3 api: repeat assignment is idempotent", async ({ request }) => {
  const adm = await smokeAdminLogin(request);
  const repeat = await request.post(`${API}/org/assignments`, {
    headers: authed(adm),
    data: { person_entity_id: personId, target_kind: "workspace", target_id: smokeWorkspaceId },
  });
  expect(repeat.status()).toBe(200);
  expect((await repeat.json()).already_member).toBe(true);
});

test("W4 cleanup: the archive rail restores truth — targets drop it, assignment refuses, recommendation returns", async ({ request }) => {
  test.setTimeout(120_000);
  const adm = await smokeAdminLogin(request);

  const res = await archiveWorkspace(request, adm, smokeWorkspaceId);
  expect(res.ok).toBe(true);
  archived = true;

  const targets = await assignmentTargets(request, adm);
  expect(targets.some((t) => t.target_id === smokeWorkspaceId)).toBe(false);

  const rejoin = await request.post(`${API}/org/assignments`, {
    headers: authed(adm),
    data: { person_entity_id: personId, target_kind: "workspace", target_id: smokeWorkspaceId },
  });
  expect(rejoin.status()).toBe(422);
  expect((await rejoin.json()).code).toBe("TARGET_NOT_ACTIVE");

  // Org restored to its pre-create baseline (the admin's APPROVE membership
  // and the person's membership both point at an ARCHIVED workspace now).
  const view = await growthView(request, adm);
  expect(view.withoutCount).toBe(baselineWithoutCount);
  expect(
    view.recs.some(
      (r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context?.person_entity_id === personId,
    ),
  ).toBe(true);

  // Idempotent cleanup safety: archiving again refuses honestly.
  const again = await archiveWorkspace(request, adm, smokeWorkspaceId);
  expect(again.ok).toBe(false);
  expect(again.code).toBe("ALREADY_ARCHIVED");
});

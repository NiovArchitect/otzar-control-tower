// FILE: otzar-live-assign-active-target.spec.ts
// PURPOSE: [PROD-UX-ASSIGN-SMOKE] LIVE end-to-end proof of the governed
//          assignment loop with a REVERSIBLE smoke fixture:
//          create ACTIVE smoke project (canonical rail) → admin assigns a
//          recommended person from the People & Collaboration card (UI) →
//          server truth changes (membership + audit) → recommendation
//          disappears on recompute → idempotent re-assign → archive the
//          smoke project (canonical OWNER rail) → recommendation RETURNS
//          because growth counts only live assignments.
//          MUTATES the live org (reversibly). Armed ONLY when
//          OTZAR_ASSIGN_SMOKE_MUTATE=1 so routine live runs stay read-only.
//          Workspaces are intentionally NOT smoked live: no archive/remove
//          rail exists for them, so the workspace leg stays integration-only.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      OTZAR_ASSIGN_SMOKE_MUTATE=1 \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-assign-active-target.spec.ts

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial", retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const ARMED = process.env.OTZAR_ASSIGN_SMOKE_MUTATE === "1";
const TAG = process.env.OTZAR_SHOT_TAG ?? "assign-live";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

const SMOKE_PREFIX = "Otzar Smoke Project — Assignment Flow";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");
test.skip(!ARMED, "Set OTZAR_ASSIGN_SMOKE_MUTATE=1 to run the reversible-mutation smoke.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}
const authed = (t: string) => ({ authorization: `Bearer ${t}` });

interface TargetRow {
  kind: string;
  target_id: string;
  label: string;
  status: string;
}
interface GrowthRec {
  kind: string;
  title: string;
  context?: { person_entity_id: string };
}

async function assignmentTargets(request: APIRequestContext, token: string): Promise<TargetRow[]> {
  const res = await request.get(`${API}/org/assignment-targets`, { headers: authed(token) });
  expect(res.status()).toBe(200);
  return ((await res.json()).targets ?? []) as TargetRow[];
}

async function growthRecs(request: APIRequestContext, token: string): Promise<GrowthRec[]> {
  const res = await request.get(`${API}/otzar/dandelion/org-growth`, { headers: authed(token) });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return (body.growth?.recommendations ?? []) as GrowthRec[];
}

async function archiveProject(
  request: APIRequestContext,
  token: string,
  projectId: string,
): Promise<{ ok: boolean; code?: string }> {
  const res = await request.post(`${API}/otzar/work-projects/${projectId}/archive`, {
    headers: authed(token),
  });
  return (await res.json()) as { ok: boolean; code?: string };
}

async function uiLoginToCollaboration(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  // Client-side route (popstate keeps the in-memory session).
  await page.evaluate(() => {
    history.pushState({}, "", "/app/collaboration");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("dandelion-growth-card").waitFor({ state: "visible", timeout: 30_000 });
}

// Shared serial-mode state.
let smokeProjectId = "";
let smokeName = "";
let personId = "";
let membersWithoutProjectBefore = -1;
let archived = false;

test.afterAll(async ({ request }) => {
  // Guaranteed cleanup: whatever happened above, no ACTIVE smoke project
  // may survive this spec. ALREADY_ARCHIVED is fine.
  if (smokeProjectId !== "" && !archived) {
    const adm = await apiLogin(request, ADMIN_EMAIL);
    await archiveProject(request, adm, smokeProjectId);
  }
});

test("S1 api: reversible smoke project exists as an ACTIVE assignment target; employee refused", async ({ request }) => {
  test.setTimeout(120_000);
  const adm = await apiLogin(request, ADMIN_EMAIL);

  // Pre-clean: archive any stale smoke fixtures from earlier runs so
  // duplicates never pile up. (Admin created them, so admin is OWNER.)
  const before = await assignmentTargets(request, adm);
  for (const stale of before.filter((t) => t.kind === "project" && t.label.startsWith(SMOKE_PREFIX))) {
    const res = await archiveProject(request, adm, stale.target_id);
    expect(res.ok === true || res.code === "ALREADY_ARCHIVED").toBe(true);
  }

  // Create today's clearly-temporary fixture through the canonical rail.
  smokeName = `${SMOKE_PREFIX} — ${new Date().toISOString().slice(0, 10)}`;
  const created = await request.post(`${API}/otzar/work-projects`, {
    headers: authed(adm),
    data: { name: smokeName },
  });
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  expect(createdBody.ok).toBe(true);
  smokeProjectId = createdBody.project.project_id as string;
  expect(smokeProjectId.length).toBeGreaterThan(0);

  // It shows up as an ACTIVE assignment target with safe fields only.
  const targets = await assignmentTargets(request, adm);
  const mine = targets.find((t) => t.target_id === smokeProjectId);
  expect(mine).toBeDefined();
  expect(mine?.kind).toBe("project");
  expect(mine?.label).toBe(smokeName);
  expect(mine?.status).toBe("ACTIVE");
  const raw = JSON.stringify(targets);
  for (const banned of ["password_hash", "secret", "payload_redacted", "public_key"]) {
    expect(raw).not.toContain(banned);
  }

  // Employees still cannot see targets or assign.
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  const empRes = await request.get(`${API}/org/assignment-targets`, { headers: authed(emp) });
  expect(empRes.status()).toBe(403);

  // Pick the person to assign FROM SERVER TRUTH: creating the project made
  // the admin an OWNER member, so any remaining NEEDS_PROJECT_OR_WORKSPACE
  // recommendation is guaranteed to be someone else. Stable id only.
  const recs = await growthRecs(request, adm);
  const needs = recs.filter(
    (r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context !== undefined,
  );
  expect(needs.length).toBeGreaterThan(0);
  personId = needs[0]?.context?.person_entity_id ?? "";
  expect(personId.length).toBeGreaterThan(0);
  membersWithoutProjectBefore = needs.length;
});

test("S2 ui: picker lists the smoke project in human language (screenshot)", async ({ page }) => {
  test.setTimeout(150_000);
  await uiLoginToCollaboration(page);
  const card = page.locator(`[data-person-entity-id="${personId}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.getByTestId("dandelion-assign-open").click();
  const picker = card.getByTestId("dandelion-assign-picker");
  await picker.waitFor({ state: "visible", timeout: 15_000 });
  const targetBtn = card.locator(`[data-testid="dandelion-assign-target"][data-target-id="${smokeProjectId}"]`);
  await targetBtn.waitFor({ state: "visible", timeout: 20_000 });
  await expect(targetBtn).toContainText(SMOKE_PREFIX);
  // Human copy only — no UUIDs rendered as text.
  const pickerText = (await picker.textContent()) ?? "";
  expect(pickerText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  await page.screenshot({ path: `screenshots/${TAG}-1-picker-populated.png`, fullPage: true });
});

test("S3 ui: assigning from the card changes server truth — membership, audit, recommendation gone (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  await uiLoginToCollaboration(page);
  const card = page.locator(`[data-person-entity-id="${personId}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.getByTestId("dandelion-assign-open").click();
  const targetBtn = card.locator(`[data-testid="dandelion-assign-target"][data-target-id="${smokeProjectId}"]`);
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
  expect(body.person_entity_id).toBe(personId);
  expect(body.target_id).toBe(smokeProjectId);
  expect(typeof body.audit_event_id).toBe("string");
  expect((body.audit_event_id as string).length).toBeGreaterThan(0);

  // The card leaves ONLY via server recompute (query invalidation refetch).
  await expect
    .poll(async () => page.locator(`[data-person-entity-id="${personId}"]`).count(), {
      timeout: 30_000,
    })
    .toBe(0);
  await page.screenshot({ path: `screenshots/${TAG}-2-after-assign.png`, fullPage: true });

  // Server truth: canonical membership row exists exactly once.
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const membersRes = await request.get(`${API}/otzar/work-projects/${smokeProjectId}/members`, {
    headers: authed(adm),
  });
  expect(membersRes.status()).toBe(200);
  const members = ((await membersRes.json()).members ?? []) as Array<{ entity_id: string }>;
  expect(members.filter((m) => m.entity_id === personId)).toHaveLength(1);

  // Growth no longer recommends this person.
  const recs = await growthRecs(request, adm);
  expect(
    recs.some((r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context?.person_entity_id === personId),
  ).toBe(false);
});

test("S4 api: cross-surface coherence — one fewer person without a project, no duplicates", async ({ request }) => {
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const recs = await growthRecs(request, adm);
  const needs = recs.filter((r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE");
  expect(needs.length).toBe(membersWithoutProjectBefore - 1);
  // No raw backend codes surfaced anywhere in the growth copy.
  const raw = JSON.stringify(recs);
  for (const codeToken of ["PROJECT_ARCHIVED", "PERSON_NOT_IN_ORG", "TARGET_NOT_FOUND"]) {
    expect(raw).not.toContain(codeToken);
  }
});

test("S5 api: repeating the assignment is idempotent — already_member, still one row", async ({ request }) => {
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const repeat = await request.post(`${API}/org/assignments`, {
    headers: authed(adm),
    data: { person_entity_id: personId, target_kind: "project", target_id: smokeProjectId },
  });
  expect(repeat.status()).toBe(200);
  const body = await repeat.json();
  expect(body.ok).toBe(true);
  expect(body.already_member).toBe(true);
  const membersRes = await request.get(`${API}/otzar/work-projects/${smokeProjectId}/members`, {
    headers: authed(adm),
  });
  const members = ((await membersRes.json()).members ?? []) as Array<{ entity_id: string }>;
  expect(members.filter((m) => m.entity_id === personId)).toHaveLength(1);
});

test("S6 cleanup: archiving the smoke project restores truth — recommendation returns (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  const adm = await apiLogin(request, ADMIN_EMAIL);

  const res = await archiveProject(request, adm, smokeProjectId);
  expect(res.ok).toBe(true);
  archived = true;

  // No longer an active assignment target.
  const targets = await assignmentTargets(request, adm);
  expect(targets.some((t) => t.target_id === smokeProjectId)).toBe(false);

  // The archived fixture cannot silently come back to life.
  const rejoin = await request.post(`${API}/org/assignments`, {
    headers: authed(adm),
    data: { person_entity_id: personId, target_kind: "project", target_id: smokeProjectId },
  });
  expect(rejoin.status()).toBe(422);
  expect((await rejoin.json()).code).toBe("PROJECT_ARCHIVED");

  // Truth restored: the person's only membership points at an ARCHIVED
  // project, so the recommendation RETURNS on server recompute.
  const recs = await growthRecs(request, adm);
  expect(
    recs.some((r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context?.person_entity_id === personId),
  ).toBe(true);
  const needs = recs.filter((r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE");
  expect(needs.length).toBe(membersWithoutProjectBefore);

  // And the customer sees it: the card is back with the assign affordance.
  await uiLoginToCollaboration(page);
  const card = page.locator(`[data-person-entity-id="${personId}"]`);
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await expect(card.getByTestId("dandelion-assign-open")).toBeVisible();
  await page.screenshot({ path: `screenshots/${TAG}-3-after-cleanup.png`, fullPage: true });
});

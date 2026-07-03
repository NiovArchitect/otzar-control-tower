// FILE: otzar-live-assign-from-people.spec.ts
// PURPOSE: [PROD-UX-ASSIGN] LIVE verification of the People & Collaboration
//          assignment flow on app.otzar.ai — MUTATION-FREE by design: the live
//          org has no member-remove/workspace-delete product path, so a live
//          assignment would be irreversible. Per the founder-approved
//          condition, live coverage = targets + permissions + picker UI +
//          validation/denials; the assignment write + truth-changed proof are
//          covered by integration tests (admin-routes +7, dandelion-growth
//          truth-changed). Scenarios:
//          A1 API: admin loads assignment targets (safe fields only);
//             unauth 401; employee 403 on GET and POST.
//          A2 API: assignment route validates shape (bad kind = 422 human
//             message) — no write attempted.
//          A3 UI: admin sees the Assign affordance on a
//             NEEDS_PROJECT_OR_WORKSPACE card; the picker opens with real org
//             targets in human language OR the honest empty state. Screenshot.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-assign-from-people.spec.ts

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "assign";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}
const authed = (t: string) => ({ authorization: `Bearer ${t}` });

test("A1 api: targets are admin-only with safe fields; employees and unauth are refused", async ({ request }) => {
  // Unauth.
  const unauth = await request.get(`${API}/org/assignment-targets`);
  expect(unauth.status()).toBe(401);
  // Employee.
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  const asEmployee = await request.get(`${API}/org/assignment-targets`, { headers: authed(emp) });
  expect(asEmployee.status()).toBe(403);
  const empPost = await request.post(`${API}/org/assignments`, {
    headers: authed(emp),
    data: { person_entity_id: "00000000-0000-4000-8000-000000000000", target_kind: "project", target_id: "00000000-0000-4000-8000-000000000001" },
  });
  expect(empPost.status()).toBe(403);
  // Admin.
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const res = await request.get(`${API}/org/assignment-targets`, { headers: authed(adm) });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.targets)).toBe(true);
  for (const t of body.targets as Array<Record<string, unknown>>) {
    expect(["project", "workspace"]).toContain(t.kind);
    expect(typeof t.target_id).toBe("string");
    expect(typeof t.label).toBe("string");
  }
  // Safe scalars only — no credential/payload material.
  const raw = JSON.stringify(body);
  for (const banned of ["password_hash", "secret", "payload_redacted", "public_key"]) {
    expect(raw).not.toContain(banned);
  }
});

test("A2 api: assignment validation is honest — bad kind 422 with human copy, no write", async ({ request }) => {
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const bad = await request.post(`${API}/org/assignments`, {
    headers: authed(adm),
    data: { person_entity_id: "00000000-0000-4000-8000-000000000000", target_kind: "team", target_id: "00000000-0000-4000-8000-000000000001" },
  });
  expect(bad.status()).toBe(422);
  const bb = await bad.json();
  expect(bb.code).toBe("INVALID_FIELD");
  expect(bb.message).toContain("target_kind");
  // Unknown person with a valid shape → honest 404, still no write.
  const ghost = await request.post(`${API}/org/assignments`, {
    headers: authed(adm),
    data: { person_entity_id: "00000000-0000-4000-8000-00000000dead", target_kind: "project", target_id: "00000000-0000-4000-8000-000000000001" },
  });
  expect(ghost.status()).toBe(404);
  expect((await ghost.json()).code).toBe("PERSON_NOT_IN_ORG");
});

test("A3 ui: the Assign affordance + picker render for the admin (screenshot)", async ({ page, request }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await page.waitForTimeout(2500);
  // Client-side route (popstate keeps the in-memory session).
  await page.evaluate(() => {
    history.pushState({}, "", "/app/collaboration");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("dandelion-growth-card").waitFor({ state: "visible", timeout: 30_000 });
  const openBtn = page.getByTestId("dandelion-assign-open").first();
  await openBtn.waitFor({ state: "visible", timeout: 15_000 });
  await openBtn.click();
  const picker = page.getByTestId("dandelion-assign-picker");
  await picker.waitFor({ state: "visible", timeout: 15_000 });
  const pickerText = (await picker.textContent()) ?? "";
  expect(pickerText).toContain("should start");
  // Real targets in human language OR the honest empty state — never a fake.
  const targetCount = await page.getByTestId("dandelion-assign-target").count();
  const emptyCount = await page.getByTestId("dandelion-assign-empty").count();
  expect(targetCount > 0 || emptyCount === 1).toBe(true);
  if (targetCount > 0) {
    // Labels are human — no UUIDs rendered as copy.
    expect(pickerText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  } else {
    expect(pickerText).toContain("No active projects or workspaces yet");
  }
  await page.screenshot({ path: `screenshots/${TAG}-1-picker.png`, fullPage: true });
  test.info().annotations.push({
    type: "note",
    description:
      "Live mutation intentionally skipped: no member-remove/workspace-delete product path exists, so a live assignment would be irreversible. Assignment + truth-changed proof covered by integration tests (admin-routes +7, dandelion-growth truth-changed).",
  });
});

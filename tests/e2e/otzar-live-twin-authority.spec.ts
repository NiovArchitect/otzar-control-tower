// FILE: otzar-live-twin-authority.spec.ts
// PURPOSE: [GAP-G SLICE-1] LIVE read-only proof of the AI Teammates authority
//          truth surface: stored role template, current autonomy,
//          template recommendation, org ceiling, authority status — all in
//          human words with honest "Not set yet" states, zero raw enums,
//          zero live authority escalation, zero mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-twin-authority.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "twin-authority";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read"] },
  });
  return (await lr.json()).token as string;
}

test("T1 api: teammates route serves the authority truth fields, safe fields only", async ({ request }) => {
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const res = await request.get(`${API}/org/ai-teammates`, {
    headers: { authorization: `Bearer ${adm}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(["OBSERVE_ONLY", "APPROVAL_REQUIRED", "EXECUTIVE_OVERRIDE"]).toContain(
    body.twin_autonomy_ceiling,
  );
  for (const item of body.items as Array<{ config: Record<string, unknown> | null }>) {
    if (item.config === null) continue;
    expect("template_recommended_autonomy" in item.config).toBe(true);
    expect("autonomy_source" in item.config).toBe(true);
  }
  const raw = JSON.stringify(body);
  for (const banned of ["password_hash", "secret", "public_key", "payload_redacted"]) {
    expect(raw).not.toContain(banned);
  }
});

test("T2 ui: AI Teammates renders the truth columns in human words (screenshot)", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/ai-teammates");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByText("Template recommendation").waitFor({ state: "visible", timeout: 30_000 });
  await expect(page.getByText("Authority status")).toBeVisible();
  // Rows load async — wait for the first honest provenance cell (existing
  // twins are untouched by design, so "Not set yet" must appear).
  await page.getByText("Not set yet").first().waitFor({ state: "visible", timeout: 30_000 });
  const main = (await page.locator("main, body").first().textContent()) ?? "";
  expect(main).toContain("Not set yet");
  // [GAP-H] Identity truth: owner-based names, never raw twin-uuid strings,
  // never a false "Unassigned".
  expect(main).toContain("'s AI Twin");
  expect(main).not.toContain("Twin of ");
  expect(main).not.toContain("Unassigned");
  // Human labels only — the badge is humanized ("Admin-level authority"),
  // so NO raw autonomy/provenance token may render anywhere on the page.
  for (const banned of [
    "EXECUTIVE_OVERRIDE",
    "APPROVAL_REQUIRED",
    "OBSERVE_ONLY",
    "org_ceiling_capped",
    "role_template_default",
    "system_default",
    "admin_twin",
    "autonomy_source",
    "twin_autonomy_ceiling",
    "template_recommended_autonomy",
  ]) {
    expect(main).not.toContain(banned);
  }
  // [GAP-H OPS] Operational truth columns — honest, never fake ready.
  await expect(page.getByText("Tools", { exact: true })).toBeVisible();
  await expect(page.getByText("Last active", { exact: true })).toBeVisible();
  expect(main).toContain("Tool requirements not set yet");
  // Activity states must be one of the honest labels, never fabricated.
  expect(
    main.includes("No twin activity yet") ||
      main.includes("Owner has recent work") ||
      /Active .*ago/.test(main),
  ).toBe(true);
  expect(main).not.toContain("Ready for assigned tools"); // requirements unmodeled
  await page.screenshot({ path: `screenshots/${TAG}-1-teammates-truth.png`, fullPage: true });
});

test("T3 ui: employee sees their own twin's honest activity panel (screenshot)", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-twin");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  const panel = page.getByTestId("my-twin-activity");
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  await expect(panel).toContainText("My AI Twin");
  await expect(panel).toContainText("Recent work your twin helped move.");
  // Wait for the three self-scoped queries to SETTLE (the panel shows
  // "Loading…" first), then assert honest content: source-backed rows OR
  // the exact empty state — never fake activity.
  await expect
    .poll(
      async () => {
        const rows = await page.getByTestId("my-twin-activity-row").count();
        const empty = await page.getByTestId("my-twin-activity-empty").count();
        return rows > 0 || empty === 1;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  const text = (await panel.textContent()) ?? "";
  const hasRows = await page.getByTestId("my-twin-activity-row").count();
  if (hasRows === 0) {
    expect(text).toContain("Your AI Twin has no recorded activity yet.");
  }
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  for (const banned of ["correction_memory", "caller_confirmed", "PROPOSED", "escalation"]) {
    expect(text).not.toContain(banned);
  }
  await page.screenshot({ path: `screenshots/${TAG}-2-my-twin-activity.png`, fullPage: true });
});

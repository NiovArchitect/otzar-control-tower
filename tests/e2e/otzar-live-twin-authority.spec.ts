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
  await page.screenshot({ path: `screenshots/${TAG}-1-teammates-truth.png`, fullPage: true });
});

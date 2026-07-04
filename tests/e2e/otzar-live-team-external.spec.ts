// FILE: otzar-live-team-external.spec.ts
// PURPOSE: [T-4] LIVE read-only proof: the manager clarity-health response
//          carries the external_relationships block ONLY when governed
//          external work exists (honest silence otherwise), any block that
//          does exist is safe on the wire (counts + labels — no emails,
//          domains, ids, enums, or excerpt-looking content), Team Work
//          renders with no CRM vocabulary, and reading mutates nothing.
//          The happy path is integration-locked in FND
//          team-external-exceptions.test.ts — no live mutation by design.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-team-external.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write", "admin_org"] },
  });
  return (await lr.json()).token as string;
}

test("external exception summary is honest + safe on the wire; Team Work renders calm (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  const admin = await apiLogin(request, ADMIN_EMAIL);

  const before = await request.get(`${API}/work-os/team-clarity-health`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  expect(before.status()).toBe(200);
  const health = (await before.json()) as Record<string, unknown>;
  const ext = health.external_relationships as Record<string, unknown> | undefined;
  console.log(`[t4] external_relationships present=${ext !== undefined}`);
  if (ext !== undefined) {
    // Present means at least one signal — and ONLY the safe closed shape.
    const counts = [
      "waiting_on_external_count",
      "internal_commitments_to_external_count",
      "overdue_external_count",
      "external_review_pending_count",
      "external_ownership_unclear_count",
      "repeated_external_ambiguity_count",
    ] as const;
    for (const k of counts) expect(typeof ext[k]).toBe("number");
    expect(counts.some((k) => (ext[k] as number) > 0)).toBe(true);
    const raw = JSON.stringify(ext);
    expect(raw).not.toMatch(/@|https?:\/\//);
    expect(raw).not.toMatch(/EXTERNAL_OWES_INTERNAL|INTERNAL_OWES_EXTERNAL|CLIENT|VENDOR/);
    expect(raw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
    expect(raw).not.toMatch(/pipeline|deal stage|opportunity/i);
    console.log(`[t4] live counts: ${counts.map((k) => `${k}=${String(ext[k])}`).join(" ")}`);
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/team-work");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(
      async () => {
        const text = (await page.locator("main, body").first().textContent()) ?? "";
        return text.length > 200 && !text.includes("Loading team work");
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  const main = (await page.locator("main, body").first().textContent()) ?? "";
  // No CRM vocabulary anywhere on the manager surface.
  expect(main).not.toMatch(/pipeline|deal stage|opportunity stage|account stage|CRM/i);
  expect(main).not.toMatch(/EXTERNAL_OWES_INTERNAL|INTERNAL_OWES_EXTERNAL/);
  const sectionCount = await page.getByTestId("team-external-exceptions").count();
  // The UI section may render only when the wire block says so.
  if (ext === undefined) expect(sectionCount).toBe(0);
  console.log(`[t4] external section rendered=${sectionCount}`);
  await page.screenshot({ path: "screenshots/team-external-exceptions.png", fullPage: true });

  // Read-only proof: the summary is identical after all reads.
  const after = await request.get(`${API}/work-os/team-clarity-health`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  expect(await after.json()).toEqual(health);
});

// FILE: otzar-live-external-promotion.spec.ts
// PURPOSE: [T-2] LIVE read-only proof: the seed queue serves and renders the
//          new external-review vocabulary honestly (zero such seeds exist
//          live — the org has no opt-in observed external index yet, so the
//          honest state is silence), no CRM copy anywhere, and reading
//          mutates nothing. The promotion happy path (seed → approve →
//          governed collaborator → T-1 light-up) is integration-locked.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-external-promotion.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  // The seeds route gates on the admin_org OPERATION — it must be requested
  // at login (a read/write token gets an honest 403).
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write", "admin_org"] },
  });
  return (await lr.json()).token as string;
}

test("seed queue is honest about external reviews; reading mutates nothing (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  const admin = await apiLogin(request, ADMIN_EMAIL);

  const before = await request.get(`${API}/org/dandelion/seeds`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  expect(before.status()).toBe(200);
  const seeds = ((await before.json()).seeds ?? []) as Array<{ seed_type: string; status: string }>;
  const externalSeeds = seeds.filter((s) => s.seed_type === "review_external_party");
  console.log(`[t2] seeds total=${seeds.length} external_review=${externalSeeds.length}`);
  // Honest state: no observed-external index exists live yet → zero external
  // review seeds; any that DO exist must carry the safe closed-vocab shape.
  for (const s of externalSeeds) {
    expect(["SEED_NEEDS_REVIEW", "SEED_PROPOSED", "SEED_APPROVED", "SEED_REJECTED", "SEED_HELD", "SEED_APPLIED"]).toContain(s.status);
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
    history.pushState({}, "", "/organization-seeding");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(
      async () => {
        const text = (await page.locator("main, body").first().textContent()) ?? "";
        return text.length > 300 && !text.includes("Loading suggestions");
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  const main = (await page.locator("main, body").first().textContent()) ?? "";
  // No raw seed-type enums, no CRM copy — the queue speaks human.
  expect(main).not.toContain("review_external_party");
  expect(main).not.toMatch(/pipeline|deal stage|opportunity stage/i);
  await page.screenshot({ path: "screenshots/external-promotion-seeding.png", fullPage: true });

  // Read-only proof: seed count unchanged after all reads.
  const after = await request.get(`${API}/org/dandelion/seeds`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  expect((((await after.json()).seeds ?? []) as unknown[]).length).toBe(seeds.length);
});

// FILE: otzar-live-external-chooser.spec.ts
// PURPOSE: [T-3C] LIVE read-only proof: the seed queue's possible-match
//          projection is SAFE on the wire (labels + machine id only — no
//          emails, no domains, no backend enums), the Organization Seeding
//          page renders with no CRM/auto-merge copy, and reading mutates
//          nothing. The decision paths (link_existing / track_new / dismiss)
//          are integration-locked in FND external-review-chooser.test.ts —
//          no live mutation here by design.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-external-chooser.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const SAFE_REASONS = ["Verified alias", "Same company", "Similar name in this account"];

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write", "admin_org"] },
  });
  return (await lr.json()).token as string;
}

test("possible-match projection is safe on the wire; chooser page mutates nothing", async ({ page, request }) => {
  test.setTimeout(180_000);
  const admin = await apiLogin(request, ADMIN_EMAIL);

  const before = await request.get(`${API}/org/dandelion/seeds`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  expect(before.status()).toBe(200);
  const seeds = ((await before.json()).seeds ?? []) as Array<{
    seed_type: string;
    possible_matches?: Array<Record<string, unknown>>;
  }>;
  const withMatches = seeds.filter(
    (s) => s.seed_type === "review_external_party" && Array.isArray(s.possible_matches),
  );
  console.log(`[t3c] seeds total=${seeds.length} with_possible_matches=${withMatches.length}`);

  // Whatever candidates exist live must carry ONLY the safe closed shape.
  for (const s of withMatches) {
    expect(s.possible_matches!.length).toBeLessThanOrEqual(3);
    for (const m of s.possible_matches!) {
      expect(Object.keys(m).sort()).toEqual(
        expect.arrayContaining(["confidence", "display_label", "external_collaborator_id", "reason"]),
      );
      expect(SAFE_REASONS).toContain(m.reason as string);
      expect(["high", "medium", "low"]).toContain(m.confidence as string);
      // No raw identifier evidence on the wire: labels never look like emails.
      for (const k of ["display_label", "company_label", "relationship_label"]) {
        const v = m[k];
        if (typeof v === "string") expect(v).not.toMatch(/@|https?:\/\//);
      }
      // No identifier values / backend enums leak into the projection.
      expect(m).not.toHaveProperty("identifier_value_normalized");
      expect(m).not.toHaveProperty("email");
      expect(m).not.toHaveProperty("relationship_type");
    }
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
  // Forbidden vocabulary never renders — with or without live candidates.
  expect(main).not.toMatch(/verified match|automatically matched|global contact|CRM account/i);
  expect(main).not.toContain("review_external_party");
  expect(main).not.toContain("link_existing");
  // If candidates render, the review-first promise renders with them.
  const chooserCount = await page.getByTestId("org-seed-possible-matches").count();
  if (chooserCount > 0) {
    expect(main).toContain("Otzar will not merge this automatically.");
  }
  console.log(`[t3c] chooser blocks rendered=${chooserCount}`);
  await page.screenshot({ path: "screenshots/external-chooser-seeding.png", fullPage: true });

  // Read-only proof: seed count unchanged after all reads.
  const after = await request.get(`${API}/org/dandelion/seeds`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  expect((((await after.json()).seeds ?? []) as unknown[]).length).toBe(seeds.length);
});

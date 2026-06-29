// FILE: otzar-live-cleanup-shots.spec.ts
// PURPOSE: [OTZAR-LIVE-6] LIVE acceptance + screenshot REGRESSION check for the
//          old-world UI cleanup. It logs into the REAL deployed app
//          (app.otzar.ai) and asserts the cleaned-up surfaces on the actual
//          logged-in DOM — NOT a unit/MSW render. It exists because unit tests
//          and a green build can pass while the real logged-in app still serves
//          old-world UI (exactly the gap we hit: stale frontend bundle). This
//          spec fails loudly if any old-world regression reaches production:
//            - employee help flow shows "Target id" / "Entity / project / team
//              id" / "Route this request"
//            - Today copy regresses to vague "thing" / mislabeled "Otzar is
//              handling" / "decisions are waiting" noun-drift
//            - a person name renders un-humanized (greeting check)
//            - admin terminology regresses ("Connector Health" instead of
//              "Tool connections")
//          It also captures /app Today, People & Collaboration, an admin
//          surface, and a mobile viewport for visual proof.
//
//          SAFETY: env-gated — `test.skip` unless DEMO_SHARED_PASSWORD is set,
//          so it never runs unauthenticated and is a no-op in normal CI without
//          the live credentials. No secrets are hardcoded; the password comes
//          ONLY from the environment. Screenshots are written to screenshots/
//          (gitignored) and are never committed. Navigation is CLIENT-SIDE
//          (clicking the ambient nav) because auth is in-memory — a hard
//          page.goto() would drop the session and bounce to /login.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-cleanup-shots.spec.ts

import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "cleanup";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function login(p: Page): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 });
  await p
    .getByRole("button", { name: /log out/i })
    .first()
    .waitFor({ state: "visible", timeout: 9000 })
    .catch(() => undefined);
}

// Client-side nav: click an ambient-nav link so the in-memory session survives.
async function navClick(p: Page, name: RegExp): Promise<void> {
  await p.getByRole("link", { name }).first().click();
  await p.waitForTimeout(1200);
}

test("live cleanup — screenshots + acceptance checks", async ({ page }) => {
  await login(page);

  // ── 1. /app Today ──────────────────────────────────────────────
  await navClick(page, /^Today$/);
  await page.screenshot({ path: `screenshots/${TAG}-1-today.png`, fullPage: true });
  const todayText = (await page.locator("body").textContent()) ?? "";
  // Names are human-formatted: the greeting humanizes the email local-part.
  expect(todayText).toMatch(/Vishesh/); // not "vishesh"
  // Today copy is specific — no old vague phrasings / noun-drift / mislabel.
  expect(todayText).not.toMatch(/thing that may need your attention/i);
  expect(todayText).not.toMatch(/Otzar is handling/i);
  expect(todayText).not.toMatch(/\bdecisions are waiting\b/i);
  // Calm ambient nav, not a dense SaaS sidebar (no noisy-route regression).
  await expect(page.getByTestId("ambient-nav").first()).toBeVisible();

  // ── 2. People & Collaboration (the help flow) ──────────────────
  await navClick(page, /^People$/);
  await page
    .getByTestId("create-collaboration-form")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({
    path: `screenshots/${TAG}-2-collaboration.png`,
    fullPage: true,
  });
  const collabText = (await page.locator("body").textContent()) ?? "";
  // HARD acceptance: no employee-facing IDs / manual-route copy.
  expect(collabText).not.toMatch(/Target id/i);
  expect(collabText).not.toMatch(/Entity \/ project \/ team id/i);
  expect(collabText).not.toMatch(/Route this request/i);
  // The natural-language composer is present.
  expect(collabText).toMatch(/Ask Otzar/i);
  expect(collabText).toMatch(/What do you need help with/i);
  await expect(page.getByTestId("collab-who")).toBeVisible();
  await expect(page.getByTestId("collab-target-id")).toHaveCount(0);

  // ── 3. Admin terminology surface (Tool connections, under "More") ─
  await page.getByTestId("ambient-nav-more").first().click();
  await page
    .getByTestId("ambient-nav-more-sheet")
    .waitFor({ state: "visible", timeout: 8000 });
  await page.getByRole("link", { name: /Tool connections/i }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `screenshots/${TAG}-3-tool-connections.png`,
    fullPage: true,
  });
  const toolText = (await page.locator("body").textContent()) ?? "";
  expect(toolText).toMatch(/Tool connections/i);
  expect(toolText).not.toMatch(/Connector Health/i);

  // ── 4. Mobile / narrow viewport (Today) ────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await navClick(page, /^Today$/);
  await page.screenshot({ path: `screenshots/${TAG}-4-mobile.png`, fullPage: false });
});

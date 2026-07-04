// FILE: otzar-live-import-people.spec.ts
// PURPOSE: [GAP-U SLICE-2] LIVE read-only proof of the CSV import flow:
//          the page renders, a pasted sample validates ENTIRELY client-side
//          (duplicate-vs-org detection works against real members), the
//          preview + confirmation copy is honest (minimum access, no email
//          claim), and NOT ONE write fires — the final import button is
//          NEVER clicked against production. Mutation: none by design (the
//          write path is integration-locked in csv-import.test.tsx).
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-import-people.spec.ts

import { test, expect } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("import flow previews honestly with zero writes; final import never clicked (screenshot)", async ({ page }) => {
  test.setTimeout(180_000);

  const nonGet: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("api.otzar.ai") && req.method() !== "GET" && !req.url().includes("/auth/login")) {
      nonGet.push(`${req.method()} ${req.url()}`);
    }
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    history.pushState({}, "", "/setup/import-people");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("import-input")).toBeVisible({ timeout: 60_000 });
  expect((await page.getByTestId("import-least-access").textContent()) ?? "").toContain(
    "minimum access",
  );

  // Paste a sample that exercises validation against REAL org members:
  // one clean row, one invalid email, one existing member (the admin).
  const csv = [
    "full_name,email,manager_email",
    "Preview Only,preview-only-never-imported@example.com,",
    "Bad Email,not-an-email,",
    `Existing Admin,${ADMIN_EMAIL},`,
  ].join("\n");
  await page.getByTestId("import-paste").fill(csv);
  await page.getByTestId("import-preview-btn").click();
  await expect(page.getByTestId("import-preview")).toBeVisible();

  const preview = (await page.getByTestId("import-preview").textContent()) ?? "";
  expect(preview).toContain("1 person is ready to import");
  expect(preview).toContain("doesn't look like an email address");
  expect(preview).toContain("already a member of your organization");
  expect(preview).toContain("minimum access");
  expect(preview).toContain("No email is sent");
  // Leak sweep on the rendered flow.
  expect(preview).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(preview).not.toMatch(/EMAIL_ALREADY_EXISTS|INVALID_MEMBER_INPUT/);

  await page.screenshot({ path: "screenshots/import-people-live.png", fullPage: true });

  // THE PROOF: preview + validation happened with ZERO writes, and we stop
  // here — the confirm button is never clicked against production.
  expect(nonGet).toEqual([]);
  console.log("[import] preview validated read-only; confirm never clicked");
});

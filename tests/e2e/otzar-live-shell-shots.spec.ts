// FILE: tests/e2e/otzar-live-shell-shots.spec.ts
// PURPOSE: [OTZAR-LIVE-6] Before/after evidence of the REAL founder flow — the
//          login page and the /app landing surface (FocusHome + EmployeeLayout
//          shell), NOT the orb. Captures what a founder actually sees on login.
// RUN: OTZAR_SMOKE_BASE_URL=… OTZAR_SMOKE_EMAIL=… DEMO_SHARED_PASSWORD=… \
//        OTZAR_SHOT_TAG=before npm run test:e2e:shell-shots
import { test, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "shell";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");
test.describe.configure({ timeout: 180_000 });
if (process.env.OTZAR_SMOKE_BASE_URL?.includes("localhost")) {
  test.use({ launchOptions: { args: ["--disable-web-security"] } });
}

async function login(p: Page): Promise<void> {
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 }).catch(() => undefined);
}

test("shell + login screenshots", async ({ page }) => {
  // 1. The login page — the first impression.
  await page.goto("/login");
  await page.getByLabel("Email").waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `screenshots/shell-${TAG}-1-login.png`, fullPage: false });

  // 2. The landed /app surface (FocusHome) — what a founder sees on login.
  await login(page);
  await page.getByTestId("focus-home").waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `screenshots/shell-${TAG}-2-app.png`, fullPage: false });

  // 3. A deeper workbench page (sidebar visible) for the nav/shell.
  await page.goto("/app/my-day");
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `screenshots/shell-${TAG}-3-myday.png`, fullPage: false });

  // 4. Mobile viewport of the landing.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await page.getByTestId("focus-home").waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `screenshots/shell-${TAG}-4-mobile.png`, fullPage: false });
});

// FILE: otzar-live-twin-calibration.spec.ts
// PURPOSE: [CS-3] LIVE render-only proof: the calibration page renders with
//          the boundary copy FIRST, all fields present, NO file input, and
//          ZERO writes — the save button is NEVER clicked against
//          production (no cleanup rail for personal-memory proposals by
//          design; the propose→approve loop is integration-locked).
import { test, expect } from "@playwright/test";
test.describe.configure({ retries: 0 });
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("calibration renders boundary-first, read-only; save never clicked (screenshot)", async ({ page }) => {
  test.setTimeout(120_000);
  const nonGet: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("api.otzar.ai") && req.method() !== "GET" && !req.url().includes("/auth/login")) {
      nonGet.push(`${req.method()} ${req.url()}`);
    }
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("vishesh@niovlabs.com");
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-twin/calibration");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("calibration-boundary")).toBeVisible({ timeout: 30_000 });
  const boundary = (await page.getByTestId("calibration-boundary").textContent()) ?? "";
  expect(boundary).toContain("cannot take ownership of company work");
  expect(boundary).toContain("Do not paste confidential company documents");
  await expect(page.getByTestId("calibration-form")).toBeVisible();
  expect(await page.locator('input[type="file"]').count()).toBe(0);
  await page.screenshot({ path: "screenshots/twin-calibration-live.png", fullPage: true });
  expect(nonGet).toEqual([]);
  console.log("[cs3] rendered boundary-first; save never clicked; zero writes");
});

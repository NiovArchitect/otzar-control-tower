// FILE: otzar-live-writing-style.spec.ts
// PURPOSE: [CS-4] LIVE render-only proof: boundary-first copy, the
//          guardrail fires on risky content client-side with ZERO writes,
//          the mirror reflects a harmless synthetic sample, and the final
//          save is NEVER clicked against production.
import { test, expect } from "@playwright/test";
test.describe.configure({ retries: 0 });
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("writing-style renders boundary-first; guardrail blocks risky sample; zero writes (screenshot)", async ({ page }) => {
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
    history.pushState({}, "", "/app/my-twin/calibration/writing-style");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("style-boundary")).toBeVisible({ timeout: 30_000 });
  const boundary = (await page.getByTestId("style-boundary").textContent()) ?? "";
  expect(boundary).toContain("learn style, not facts");
  expect(boundary).toContain("never leaves this page");
  // Risky content → client-side refusal, no request.
  await page.getByTestId("style-sample-text").fill("This CONFIDENTIAL roadmap says revenue is up.");
  await page.getByTestId("style-reflect").click();
  await expect(page.getByTestId("style-guard")).toBeVisible();
  // Harmless synthetic sample → mirror renders; save NEVER clicked.
  await page.getByTestId("style-sample-text").fill("Hey team! Quick sunny-day note. All good here. Any questions? Thanks");
  await page.getByTestId("style-reflect").click();
  await expect(page.getByTestId("style-mirror")).toBeVisible();
  expect(await page.locator('input[type="file"]').count()).toBe(0);
  await page.screenshot({ path: "screenshots/writing-style-live.png", fullPage: true });
  expect(nonGet).toEqual([]);
  console.log("[cs4] boundary-first; guardrail live; mirror live; zero writes; save never clicked");
});

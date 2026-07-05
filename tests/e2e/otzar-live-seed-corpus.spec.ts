// FILE: otzar-live-seed-corpus.spec.ts
// PURPOSE: [CS-5] LIVE render-only proof: the corpus seeding flow renders
//          boundary-first, the review promises are honest, NO file input
//          exists, and ZERO writes fire — the final seed button is NEVER
//          clicked against production.
import { test, expect } from "@playwright/test";
test.describe.configure({ retries: 0 });
const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("seed-corpus renders boundary-first with honest review; zero writes; seed never clicked (screenshot)", async ({ page }) => {
  test.setTimeout(120_000);
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
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    history.pushState({}, "", "/setup/seed-corpus");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("corpus-boundary")).toBeVisible({ timeout: 30_000 });
  const boundary = (await page.getByTestId("corpus-boundary").textContent()) ?? "";
  expect(boundary).toContain("never becomes anyone's personal Twin memory");
  expect(boundary).toContain("background, not current truth");
  expect(await page.locator('input[type="file"]').count()).toBe(0);
  // Walk to the review step with a harmless synthetic doc — stop there.
  await page.getByText("Process / SOP", { exact: true }).click();
  await page.getByTestId("corpus-title").fill("Smoke synthetic SOP (never seeded)");
  await page.getByText("Historical", { exact: true }).click();
  await page.getByTestId("corpus-body").fill("Synthetic harmless text for render-only smoke.");
  await page.getByTestId("corpus-review").click();
  const confirm = page.getByTestId("corpus-confirm");
  await expect(confirm).toBeVisible();
  const copy = (await confirm.textContent()) ?? "";
  expect(copy).toContain("historical background, not current truth");
  expect(copy).toContain("Retention controls are not configurable in-product yet");
  await page.screenshot({ path: "screenshots/seed-corpus-live.png", fullPage: true });
  // THE proof: zero writes; the seed button was never clicked.
  expect(nonGet).toEqual([]);
  console.log("[cs5] boundary-first; review honest; zero writes; seed never clicked");
});

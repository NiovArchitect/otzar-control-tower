// FILE: otzar-live-transcript-actions-probe.spec.ts
// PURPOSE: Prove transcript → proposed actions on live (deep-smoke P0).
import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "need password");

const TRANSCRIPT =
  "Team, we decided to ship the onboarding flow next week. David is blocked on the API keys. " +
  "Samiksha owns the summary by Friday. William needs the investor decisions. " +
  "There is a risk the demo could slip if API access is not resolved. " +
  "It is unclear who owns the launch checklist.";

test("transcript context → create action items yields proposed cards", async ({ page }) => {
  test.setTimeout(180_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Inject selection + Add current context (same as matrix)
  await page.evaluate((t) => {
    let el = document.getElementById("__smoke_ctx__");
    if (!el) {
      el = document.createElement("div");
      el.id = "__smoke_ctx__";
      el.style.position = "fixed";
      el.style.bottom = "0";
      el.style.left = "0";
      el.style.opacity = "0.01";
      document.body.appendChild(el);
    }
    el.textContent = t;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, TRANSCRIPT);

  // Open orb so Add current context is available
  const orb = page.getByTestId("ambient-otzar-bar").first();
  await orb.click({ force: true });
  await page.waitForTimeout(500);
  // Re-assert selection immediately before add (click can clear it without
  // the product pointerdown capture on older deploys).
  await page.evaluate(() => {
    const el = document.getElementById("__smoke_ctx__");
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
  const add = page.getByTestId("surface-context-add");
  await expect(add).toBeVisible({ timeout: 10_000 });
  // pointerdown then click — mirrors real user; product captures on pointerdown
  await add.dispatchEvent("pointerdown");
  await add.click();
  await page.waitForTimeout(500);
  const chip = page.getByTestId("surface-context-chip");
  await expect(chip).toBeVisible({ timeout: 10_000 });

  const input = page.getByLabel(/Message to Otzar/i);
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.fill("Create action items from this meeting.");
  await page.getByRole("button", { name: /^send$/i }).click();
  await page.waitForTimeout(3000);

  const cards = page.getByTestId("transcript-action");
  const n = await cards.count();
  const outcome = ((await page.getByTestId("voice-action-outcome").textContent()) ?? "").trim();
  console.log(`[probe] cards=${n} outcome=${outcome.slice(0, 200)}`);
  expect(n).toBeGreaterThan(0);
  expect(outcome).toMatch(/proposed action|I found/i);
});

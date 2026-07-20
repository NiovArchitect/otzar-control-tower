// FILE: otzar-live-transcript-actions-probe.spec.ts
// PURPOSE: Prove transcript → proposed actions on live (deep-smoke P0).
import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "need password");

const TRANSCRIPT =
  "Team, we decided to ship the onboarding flow next week. David is blocked on the API keys. " +
  "Samiksha owns the summary by Friday. William needs the investor decisions. " +
  "There is a risk the demo could slip if API access is not resolved. " +
  "It is unclear who owns the launch checklist.";

/** Expand Talk until Message input + surface-context-add are available. */
async function expandTalk(page: Page): Promise<void> {
  const input = page.getByLabel(/Message to Otzar/i);
  const add = page.getByTestId("surface-context-add");
  const orb = page.getByTestId("ambient-otzar-bar").first();
  await orb.waitFor({ state: "visible", timeout: 12_000 }).catch(() => undefined);

  for (let attempt = 0; attempt < 4; attempt++) {
    const inputOk =
      (await input.count()) > 0 && (await input.first().isVisible().catch(() => false));
    const addOk =
      (await add.count()) > 0 && (await add.first().isVisible().catch(() => false));
    if (inputOk && addOk) return;

    if (!inputOk) {
      await orb.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
      if (!(await input.first().isVisible().catch(() => false))) {
        await page
          .getByTestId("header-talk-otzar")
          .click({ force: true })
          .catch(() => undefined);
        await page.waitForTimeout(400);
      }
      // Expanded panel may re-mount; re-click bar region if still collapsed.
      if (!(await input.first().isVisible().catch(() => false))) {
        await page
          .locator('[data-testid="ambient-otzar-bar"]')
          .last()
          .click({ force: true })
          .catch(() => undefined);
        await page.waitForTimeout(400);
      }
    }
  }
  await input.first().waitFor({ state: "visible", timeout: 12_000 });
  await add.first().waitFor({ state: "visible", timeout: 12_000 });
}

function injectSelection(page: Page, text: string) {
  return page.evaluate((t) => {
    let el = document.getElementById("__smoke_ctx__");
    if (!el) {
      el = document.createElement("div");
      el.id = "__smoke_ctx__";
      el.style.position = "fixed";
      el.style.bottom = "0";
      el.style.left = "0";
      el.style.opacity = "0.01";
      el.style.zIndex = "1";
      document.body.appendChild(el);
    }
    el.textContent = t;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, text);
}

test("transcript context → create action items yields proposed cards", async ({ page }) => {
  test.setTimeout(180_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await expandTalk(page);
  await injectSelection(page, TRANSCRIPT);

  const add = page.getByTestId("surface-context-add");
  await expect(add).toBeVisible({ timeout: 10_000 });
  // Re-assert selection immediately before add (safety for flaky DOM focus).
  await injectSelection(page, TRANSCRIPT);
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

  // Wait for reply / cards (extract can take a few seconds on live)
  const cards = page.getByTestId("transcript-action");
  try {
    await expect
      .poll(async () => await cards.count(), { timeout: 45_000 })
      .toBeGreaterThan(0);
  } catch {
    /* fall through — assert below with outcome evidence */
  }
  const n = await cards.count();
  const outcome = ((await page.getByTestId("voice-action-outcome").textContent()) ?? "").trim();
  console.log(`[probe] cards=${n} outcome=${outcome.slice(0, 200)}`);
  expect(n).toBeGreaterThan(0);
  expect(outcome).toMatch(/proposed action|I found/i);
});

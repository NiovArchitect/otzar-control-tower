// FILE: tests/e2e/otzar-ambient-screenshots.spec.ts
// PURPOSE: [OTZAR-LIVE-6] Ambient Node Interface — visual verification harness.
//          Dark-mode + frost/glow correctness is invisible to unit tests (CSS
//          tokens flip cleanly while hardcoded colors break). This captures the
//          ambient orb across key states + a mobile viewport so the premium-dark
//          ambient surface can be judged by eye before any production push.
//          POINT AT A LOCAL PREVIEW for pre-push verification:
//            npm run build && npm run preview &  (serves :4173)
//            OTZAR_SMOKE_BASE_URL=http://localhost:4173 DEMO_SHARED_PASSWORD=… \
//              OTZAR_SMOKE_EMAIL=… npm run test:e2e:screenshots
//          Output: screenshots/ambient-*.png
import { test, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "current";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");
test.describe.configure({ timeout: 300_000 });
// VISUAL VERIFICATION ONLY: when pointed at a LOCAL preview talking to the
// deployed backend, bypass the browser's same-origin policy so the prod API
// (api.otzar.ai) accepts the localhost:4173 origin. Never used against prod.
if (process.env.OTZAR_SMOKE_BASE_URL?.includes("localhost")) {
  test.use({ launchOptions: { args: ["--disable-web-security"] } });
}

async function login(p: Page): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 }).catch(() => undefined);
  await p.getByRole("button", { name: /log out/i }).first().waitFor({ state: "visible", timeout: 9000 }).catch(() => undefined);
}
async function expand(p: Page): Promise<void> {
  const region = p.getByRole("region", { name: /Talk to Otzar/i });
  await region.first().click().catch(() => undefined);
  await p.getByLabel(/Message to Otzar/i).first().waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
}
async function ask(p: Page, text: string): Promise<void> {
  const input = p.getByLabel(/Message to Otzar/i);
  await input.fill(text).catch(() => undefined);
  await p.getByRole("button", { name: /^send$/i }).click().catch(() => undefined);
  await p.getByTestId("voice-action-outcome").first().waitFor({ state: "visible", timeout: 25_000 }).catch(() => undefined);
}

test("capture ambient orb states", async ({ page }) => {
  await login(page);

  // 1. Focus home / shell (collapsed orb).
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `screenshots/ambient-${TAG}-1-shell.png`, fullPage: false });

  // 2. Expanded idle orb.
  await expand(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/ambient-${TAG}-2-expanded.png`, fullPage: false });

  // 3. After a work answer (responded state) — gated; the LLM round-trip is
  // slow, so skip it for fast visual iteration on the base surface.
  if (process.env.OTZAR_SHOT_ASK === "1") {
    await ask(page, "what is blocked right now");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `screenshots/ambient-${TAG}-3-answer.png`, fullPage: false });
  }

  // 4. Mobile viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/ambient-${TAG}-4-mobile.png`, fullPage: false });
});

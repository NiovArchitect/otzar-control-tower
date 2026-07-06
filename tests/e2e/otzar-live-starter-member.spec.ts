// FILE: otzar-live-starter-member.spec.ts
// PURPOSE: [TWIN-BOOTSTRAP] LIVE verification of the repaired starter
//          member: login succeeds, the app recognizes the user, My Twin
//          renders the REAL twin (not the empty state), one Otzar
//          message gets a real answer or honest starter guidance, and
//          `twin_not_found` / raw backend errors never appear.
//          Credentials come ONLY from env (OTZAR_SMOKE_MEMBER_EMAIL /
//          OTZAR_SMOKE_MEMBER_PASSWORD) and are never printed.
//          Mutation: the single authorized verification message turn.
// RUN: OTZAR_SMOKE_MEMBER_EMAIL=… OTZAR_SMOKE_MEMBER_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-starter-member.spec.ts

import { test, expect } from "@playwright/test";

test.describe.configure({ retries: 0 });

const EMAIL = process.env.OTZAR_SMOKE_MEMBER_EMAIL;
const PW = process.env.OTZAR_SMOKE_MEMBER_PASSWORD;

test.skip(!EMAIL || !PW, "Set OTZAR_SMOKE_MEMBER_EMAIL and OTZAR_SMOKE_MEMBER_PASSWORD.");

test("repaired starter member: login → recognized → My Twin renders → Otzar answers, never twin_not_found", async ({ page }) => {
  test.setTimeout(300_000);

  // 1) Login through the real UI.
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL as string);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  console.log(`[SMOKE] login OK — landed on ${new URL(page.url()).pathname}`);
  await page.waitForTimeout(2500);

  // 2) The landing shell renders without raw errors.
  let body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/twin_not_found|TWIN_NOT_FOUND/);
  expect(body.length).toBeGreaterThan(50); // not an empty shell

  // 3) My Twin — the REAL twin card must render (the twin exists), not
  //    the not-prepared empty state, and with no fake-ready claims.
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-twin");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  const card = page.getByTestId("my-twin-card");
  const empty = page.getByTestId("my-twin-empty");
  await expect(card.or(empty)).toBeVisible({ timeout: 60_000 });
  const emptyVisible = await empty.isVisible().catch(() => false);
  console.log(`[SMOKE] my-twin state: ${emptyVisible ? "EMPTY (unexpected — twin exists!)" : "twin card rendered"}`);
  expect(emptyVisible).toBe(false);
  body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/twin_not_found|TWIN_NOT_FOUND/);
  expect(body).not.toMatch(/fully ready|can do all work|company context loaded/i);

  // 4) One verification message through Ask your Twin.
  const input = page.getByTestId("ask-your-twin-input");
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill("What can you help me with right now?");
  await input.press("Enter");
  // Wait until the in-flight state resolves to a final answer/error.
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="ask-your-twin"]');
        const t = el?.textContent ?? "";
        return t.length > 0 && !t.includes("Asking...") && !t.includes("checking your governed context");
      },
      undefined,
      { timeout: 90_000 },
    )
    .catch(() => undefined); // capture whatever state exists either way
  body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/twin_not_found|TWIN_NOT_FOUND/);
  expect(body).not.toMatch(/INTERNAL_ERROR|Traceback|stack trace/i);
  // Capture what Otzar said (the ask box region) for the human report.
  const askBox = (await page.getByTestId("ask-your-twin").textContent()) ?? "";
  console.log(`[SMOKE] ask-box content (truncated): ${askBox.slice(0, 600)}`);
  // It must have moved past the input placeholder — some response text
  // exists (real answer or honest guidance).
  expect(askBox.replace(/\s+/g, " ").length).toBeGreaterThan(120);
});

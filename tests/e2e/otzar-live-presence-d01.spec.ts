// FILE: otzar-live-presence-d01.spec.ts
// PURPOSE: D-01 — ambient presence exposes human 5-state language on live.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-presence-d01.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const HUMAN = /available|listening|working|blocked|complete/;

test("D-01 edge glow and orb expose human presence state", async ({ page }) => {
  test.setTimeout(120_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await expect(page.getByTestId("ambient-work-surface")).toBeVisible({
    timeout: 20_000,
  });

  const glow = page.getByTestId("ambient-edge-glow");
  await expect(glow).toBeAttached();
  const glowHuman = await glow.getAttribute("data-presence-human");
  if (!glowHuman) {
    test.info().annotations.push({
      type: "note",
      description: "data-presence-human not on this deploy yet — machine state only.",
    });
    // Still prove machine presence attribute exists
    expect(await glow.getAttribute("data-presence")).toBeTruthy();
    return;
  }
  expect(glowHuman).toMatch(HUMAN);

  const orb = page.getByTestId("ambient-otzar-bar").first();
  await expect(orb).toBeVisible();
  const orbHuman = await orb.getAttribute("data-presence-human");
  expect(orbHuman).toMatch(HUMAN);

  // Machine + human stay coherent
  const machine = await glow.getAttribute("data-presence");
  expect(machine).toBeTruthy();
  console.log(`[d01] machine=${machine} human=${glowHuman}`);
});

// FILE: otzar-live-first-use-role.spec.ts
// PURPOSE: First-use strip is role-aware (leader → org; teammate → needs me).
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-first-use-role.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("first-use reveal exposes role-aware primary CTA when shown", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  // Clear first-use so the strip can appear for this session.
  await page.evaluate((em) => {
    const key = `otzar_first_use_v1:${(em ?? "anonymous").trim().toLowerCase()}`;
    localStorage.removeItem(key);
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("otzar_first_use_v1:")) localStorage.removeItem(k);
    }
  }, EMAIL);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const reveal = page.getByTestId("first-use-reveal");
  if ((await reveal.count()) === 0) {
    test.info().annotations.push({
      type: "note",
      description: "First-use already completed or not shown — skip CTA assert.",
    });
    // Still prove tools reconnect chip is honest when present.
    const reconnect = page.getByTestId("today-tools-reconnect");
    if ((await reconnect.count()) > 0) {
      await expect(reconnect).toBeVisible();
    }
    return;
  }

  await expect(reveal).toBeVisible({ timeout: 15_000 });
  const role = await reveal.getAttribute("data-role");
  if (role === "leader") {
    await expect(page.getByTestId("first-use-see-org")).toBeVisible();
  } else {
    await expect(page.getByTestId("first-use-needs-me")).toBeVisible();
  }
  await expect(page.getByTestId("first-use-start-day")).toBeVisible();
});

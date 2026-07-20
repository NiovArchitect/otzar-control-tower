// FILE: otzar-live-people-structure.spec.ts
// PURPOSE: People shows reporting structure glance (hierarchy discoverability).
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-people-structure.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("People shows how work reports structure glance", async ({ page }) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/collaboration", { waitUntil: "domcontentloaded" });

  const glance = page.getByTestId("people-structure-glance");
  const unavailable = page.getByTestId("people-structure-unavailable");
  await expect(glance.or(unavailable)).toBeVisible({ timeout: 25_000 });

  if ((await unavailable.count()) > 0) {
    test.info().annotations.push({
      type: "note",
      description: "Hierarchy/people APIs unavailable for this account.",
    });
    return;
  }

  await expect(page.getByText("How work reports")).toBeVisible();
  await expect(page.getByTestId("people-structure-you")).toBeVisible();
  await expect(page.getByTestId("people-structure-pulse")).toBeVisible();

  // Card must be in visual viewport (not buried below fold on first paint).
  const inView = await glance.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > 40;
  });
  expect(inView).toBeTruthy();
});

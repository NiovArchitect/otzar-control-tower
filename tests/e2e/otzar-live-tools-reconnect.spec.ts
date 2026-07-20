// FILE: otzar-live-tools-reconnect.spec.ts
// PURPOSE: Tools page honors ?need=reconnect from Comms (Meet scope honesty).
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-tools-reconnect.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("Tools deep-link need=reconnect shows honesty banner", async ({ page }) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/connector-health?need=reconnect&from=comms", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("connector-health-page")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("tools-reconnect-banner")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("tools-reconnect-headline")).toBeVisible();
  // Force-reconnect buttons when Google oauth_slugs exist; optional if none.
  const actions = page.getByTestId("tools-reconnect-actions");
  if ((await actions.count()) > 0) {
    await expect(page.getByTestId("tools-force-reconnect").first()).toBeVisible();
  }
});

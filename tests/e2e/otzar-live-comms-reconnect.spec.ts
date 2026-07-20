// FILE: otzar-live-comms-reconnect.spec.ts
// PURPOSE: Comms ambient path stays honest when tools need reconnect.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-comms-reconnect.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("Comms page exposes ambient sync and optional reconnect CTA", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/comms", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("comms-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("comms-ambient-hero")).toBeVisible();
  await expect(page.getByTestId("comms-ambient-sync")).toBeVisible();
  // Reconnect CTA only when backend signals reauth — optional.
  const reconnect = page.getByTestId("comms-reconnect-tools");
  if ((await reconnect.count()) > 0) {
    await expect(reconnect).toBeVisible();
  }
});

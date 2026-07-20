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
  // Clear versioned + legacy first-use keys so the strip can appear.
  await page.evaluate((em) => {
    const id = (em ?? "anonymous").trim().toLowerCase();
    localStorage.removeItem(`otzar_first_use_v1:${id}`);
    for (const k of Object.keys(localStorage)) {
      if (
        k.startsWith("otzar_first_use_v1:") ||
        k.startsWith("otzar_first_use_walkthrough:")
      ) {
        localStorage.removeItem(k);
      }
    }
  }, EMAIL);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const reveal = page.getByTestId("first-use-reveal");
  if ((await reveal.count()) === 0) {
    test.info().annotations.push({
      type: "note",
      description:
        "First-use already completed (server marker) or not shown — skip CTA assert.",
    });
    // Still prove tools reconnect chip is honest when present.
    const reconnect = page.getByTestId("today-tools-reconnect");
    if ((await reconnect.count()) > 0) {
      await expect(reconnect).toBeVisible();
    }
    return;
  }

  await expect(reveal).toBeVisible({ timeout: 15_000 });
  await expect(reveal).toHaveAttribute("data-walkthrough-version", /v\d+/);
  const role = await reveal.getAttribute("data-role");
  // A-04 roles: administrator | executive | manager | employee | contractor
  if (
    role === "administrator" ||
    role === "executive" ||
    role === "manager"
  ) {
    // Admin/leader primary path includes People (legacy testid on step 0 for admin).
    if (role === "administrator") {
      await expect(page.getByTestId("first-use-see-org")).toBeVisible();
    }
    await expect(page.getByTestId("walkthrough-step-title")).toBeVisible();
  } else {
    await expect(page.getByTestId("first-use-needs-me")).toBeVisible();
  }
  await expect(page.getByTestId("first-use-start-day")).toBeVisible();
  await expect(page.getByTestId("walkthrough-next")).toBeVisible();
});

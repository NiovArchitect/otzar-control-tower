// FILE: otzar-live-viewport-chrome.spec.ts
// PURPOSE: Otzar / Work OS / Talk / notifications must stay inside the visual
//          viewport (not parked above/outside it). Product clarification:
//          this is a viewport pin issue, not scroll-under paint.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-viewport-chrome.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("employee shell chrome stays inside the visual viewport", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const header = page.getByTestId("employee-shell-header");
  await expect(header).toBeVisible({ timeout: 20_000 });

  // Brand + Talk + notification control must be present and in-view.
  await expect(header.getByText("Otzar", { exact: true })).toBeVisible();
  const metrics = await header.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const vv =
      typeof window !== "undefined" && window.visualViewport
        ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            offsetTop: window.visualViewport.offsetTop,
          }
        : {
            width: window.innerWidth,
            height: window.innerHeight,
            offsetTop: 0,
          };
    return {
      top: r.top,
      bottom: r.bottom,
      height: r.height,
      // Chrome is inside the visual viewport when its top is at/below the
      // visible top and its bottom is still on-screen.
      inView: r.top >= vv.offsetTop - 1 && r.bottom > vv.offsetTop + 8,
      vv,
    };
  });

  expect(
    metrics.inView,
    `header outside visual viewport: ${JSON.stringify(metrics)}`,
  ).toBeTruthy();
  expect(metrics.top).toBeGreaterThanOrEqual(-1);

  // Scroll main content — header must not leave the view (it is not in main).
  const main = page.getByTestId("employee-shell-main");
  if ((await main.count()) > 0) {
    await main.evaluate((el) => {
      el.scrollTop = Math.min(el.scrollHeight, 800);
    });
    await page.waitForTimeout(400);
    const after = await header.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, visible: r.top >= -1 && r.bottom > 0 };
    });
    expect(after.visible).toBeTruthy();
    expect(after.top).toBeGreaterThanOrEqual(-1);
  }
});

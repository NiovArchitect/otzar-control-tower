// FILE: otzar-live-walkthrough-talk-pointer.spec.ts
// PURPOSE: RC2 F1–F5 — walkthrough coach must not steal Talk clicks.
//          Guide remains present; Talk expands, accepts input, and Send works.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-walkthrough-talk-pointer.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test.describe("walkthrough + Talk pointer architecture", () => {
  test("guide open + Talk collapsed: orb is clickable and expands", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await liveUiLogin(page, EMAIL, PW as string);
    // Ensure walkthrough visible (returning accounts may already have completed).
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.includes("walkthrough") || k.includes("first_use")) {
          localStorage.removeItem(k);
        }
      }
    });
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const guide = page.getByTestId("first-use-reveal");
    // If still completed server-side, this test cannot force it — soft pass.
    if ((await guide.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "Walkthrough already completed for this account; orb-only path.",
      });
    } else {
      await expect(guide).toBeVisible();
      const mode = await guide.getAttribute("data-coach-mode");
      expect(mode === "anchored" || mode === "compact").toBeTruthy();
      // Coach must not use full-width bottom-right stacking (pre-fix geometry).
      const box = await guide.boundingBox();
      expect(box).not.toBeNull();
      // Anchored coach sits on the left half for default viewport.
      if (mode === "anchored" && box) {
        expect(box.x).toBeLessThan(page.viewportSize()!.width * 0.55);
      }
    }

    const orb = page.getByTestId("ambient-otzar-bar");
    await expect(orb).toBeVisible();
    // Center of orb must not be covered by the guide card.
    const orbBox = await orb.boundingBox();
    expect(orbBox).not.toBeNull();
    const cx = orbBox!.x + orbBox!.width / 2;
    const cy = orbBox!.y + orbBox!.height / 2;
    const topEl = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const guideHost = el.closest("[data-testid='first-use-reveal']");
        return {
          tag: el.tagName,
          testId: (el as HTMLElement).dataset?.testid ?? null,
          underGuide: guideHost !== null,
        };
      },
      { x: cx, y: cy },
    );
    expect(topEl, "elementFromPoint at orb center").toBeTruthy();
    expect(
      topEl!.underGuide,
      "walkthrough must not cover orb center",
    ).toBe(false);

    await orb.click({ timeout: 15_000 });
    await expect(page.getByLabel(/Message to Otzar/i)).toBeVisible({
      timeout: 15_000,
    });

    // While Talk is open, guide should compact (if still active).
    if ((await guide.count()) > 0) {
      await expect(guide).toHaveAttribute("data-coach-mode", "compact", {
        timeout: 5_000,
      });
    }

    const input = page.getByLabel(/Message to Otzar/i);
    await input.fill("What needs me today?");
    await page.getByTestId("ambient-send").click({ timeout: 15_000 });
    // Don't require a model answer — only that Send was accepted (input path free).
    await page.waitForTimeout(500);
  });

  test("clicking outside guide does not finish walkthrough", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await liveUiLogin(page, EMAIL, PW as string);
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const guide = page.getByTestId("first-use-reveal");
    if ((await guide.count()) === 0) {
      test.skip(true, "Walkthrough not shown for this account.");
    }
    const stepBefore = await guide.getAttribute("data-step-index");
    // Click empty area of main content (not guide, not orb).
    await page.locator("main").click({ position: { x: 40, y: 40 } });
    await page.waitForTimeout(400);
    await expect(page.getByTestId("first-use-reveal")).toBeVisible();
    const stepAfter = await page
      .getByTestId("first-use-reveal")
      .getAttribute("data-step-index");
    expect(stepAfter).toBe(stepBefore);
  });
});

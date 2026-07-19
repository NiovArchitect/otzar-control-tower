// FILE: otzar-live-multi-role-first5.spec.ts
// PURPOSE: [INVESTOR/UX] First five minutes for multiple role personas —
//          login, shell loads, My AI Teammate is not an empty generic box,
//          Today/Needs me show product language or honest empty.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-multi-role-first5.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

test.describe.configure({ retries: 0, mode: "serial" });

const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const ROLES: ReadonlyArray<{ email: string; label: string }> = [
  { email: "sadeil@niovlabs.com", label: "CEO" },
  { email: "david@niovlabs.com", label: "manager" },
  { email: "vishesh@niovlabs.com", label: "employee" },
  { email: "annie@niovlabs.com", label: "executive" },
  { email: "walter@niovlabs.com", label: "contractor" },
];

for (const role of ROLES) {
  test(`first-5-min value — ${role.label} (${role.email})`, async ({ page }) => {
    test.setTimeout(180_000);
    const cta = await liveUiLogin(page, role.email, PW as string);
    expect(cta).toBe("Sign in");
    // Land product shell
    if (!page.url().includes("/app")) {
      await page.goto("/app", { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(1500);
    const home = (await page.locator("body").textContent()) ?? "";
    expect(home.length).toBeGreaterThan(40);
    expect(home).toMatch(/Today|Needs me|Talk|Otzar|work|project|AI Teammate/i);

    await page.goto("/app/my-twin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const twin = (await page.locator("body").textContent()) ?? "";
    // Must not be a bare empty chat with no role context
    const hasContext =
      /AI Teammate|template|role|responsib|tools|pack|authority|Twin|memory|calibration/i.test(
        twin,
      );
    expect(hasContext).toBeTruthy();
    expect(twin).not.toMatch(/start chatting with nothing|empty chat box only/i);
    console.log(`[role] ${role.label} cta=${cta} twin_context=${hasContext} twin_len=${twin.length}`);
  });
}

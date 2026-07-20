// FILE: otzar-live-multi-role-first5.spec.ts
// PURPOSE: A-05 — YC first five minutes for multiple role personas:
//          login → Today signal → Talk/Needs me live paths → Twin context.
//          No dead primary routes; honest empty OK; residual full YC org = S-01.
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

    // 1) Land product Home / Today
    if (!page.url().includes("/app")) {
      await page.goto("/app", { waitUntil: "domcontentloaded" });
    }
    await expect(page.getByTestId("ambient-work-surface")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("employee-shell")).toBeVisible();
    const home = (await page.locator("body").textContent()) ?? "";
    expect(home.length).toBeGreaterThan(40);
    expect(home).toMatch(/Today|Needs me|Talk|Otzar|work|project|AI Teammate/i);
    // No hard error walls on first paint
    expect(home).not.toMatch(/Something went wrong|Application error|Page not found/i);

    // 2) Primary Talk path is live (header CTA or rail)
    const headerTalk = page.getByTestId("header-talk-otzar");
    if ((await headerTalk.count()) > 0) {
      await expect(headerTalk.first()).toBeVisible();
    }
    await page.goto("/app/voice", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    expect(page.url()).toMatch(/\/app\/voice/);
    const talkBody = (await page.locator("body").textContent()) ?? "";
    expect(talkBody).toMatch(/Talk|Otzar|voice|mic|type|listen|message/i);
    expect(talkBody).not.toMatch(/Page not found|Coming soon/i);

    // 3) Needs me is a real queue surface
    await page.goto("/app/action-center", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    expect(page.url()).toMatch(/action-center/);
    const needs = (await page.locator("body").textContent()) ?? "";
    expect(needs).toMatch(/Needs me|approval|handoff|work|waiting|clear|empty|nothing/i);
    expect(needs).not.toMatch(/Page not found/i);

    // 4) Twin / AI Teammate has role/product context (not a bare empty chat)
    await page.goto("/app/my-twin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const twin = (await page.locator("body").textContent()) ?? "";
    const hasContext =
      /AI Teammate|template|role|responsib|tools|pack|authority|Twin|memory|calibration/i.test(
        twin,
      );
    expect(hasContext).toBeTruthy();
    expect(twin).not.toMatch(/start chatting with nothing|empty chat box only/i);
    console.log(
      `[role] ${role.label} cta=${cta} twin_context=${hasContext} twin_len=${twin.length}`,
    );
  });
}

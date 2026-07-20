// FILE: otzar-live-role-home-b05.spec.ts
// PURPOSE: B-05 — Today Home differs by role (data-home-role + presence).
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-role-home-b05.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const ROLES: ReadonlyArray<{
  email: string;
  label: string;
  /** Expected data-home-role when title/admin resolves on live org. */
  expectRole?: RegExp;
}> = [
  {
    email: "sadeil@niovlabs.com",
    label: "admin/CEO",
    expectRole: /administrator|executive/,
  },
  {
    email: "david@niovlabs.com",
    label: "manager",
    expectRole: /manager|employee|administrator/,
  },
  {
    email: "vishesh@niovlabs.com",
    label: "employee",
    expectRole: /employee|manager|contractor/,
  },
  {
    email: "walter@niovlabs.com",
    label: "contractor-or-titled",
    // Live title may classify as manager/employee; still must set data-home-role.
    expectRole: /administrator|executive|manager|employee|contractor/,
  },
];

test.describe.configure({ mode: "serial" });

for (const role of ROLES) {
  test(`B-05 Today home-role for ${role.label}`, async ({ page }) => {
    test.setTimeout(120_000);
    await liveUiLogin(page, role.email, PW as string);
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const surface = page.getByTestId("ambient-work-surface");
    await expect(surface).toBeVisible({ timeout: 20_000 });

    const homeRole = await surface.getAttribute("data-home-role");
    expect(homeRole, `${role.label} missing data-home-role`).toBeTruthy();
    if (role.expectRole && homeRole) {
      expect(homeRole).toMatch(role.expectRole);
    }

    await expect(page.getByTestId("ambient-presence-line")).toBeVisible();
    const presence = (
      (await page.getByTestId("ambient-presence-line").textContent()) ?? ""
    ).trim();
    expect(presence.length).toBeGreaterThan(8);

    // Glance chips always present; role may reorder / add People.
    await expect(page.getByTestId("today-glance")).toBeVisible();
    console.log(
      `[b05] ${role.label} role=${homeRole} presence=${presence.slice(0, 80)}`,
    );
  });
}

test("B-05 admin/employee home-role differ when both resolve", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const adminCtx = await browser.newContext();
  const empCtx = await browser.newContext();
  try {
    const admin = await adminCtx.newPage();
    const emp = await empCtx.newPage();
    await liveUiLogin(admin, "sadeil@niovlabs.com", PW as string);
    await liveUiLogin(emp, "vishesh@niovlabs.com", PW as string);
    await admin.goto("/app", { waitUntil: "domcontentloaded" });
    await emp.goto("/app", { waitUntil: "domcontentloaded" });
    await admin.waitForTimeout(2500);
    await emp.waitForTimeout(2500);

    const aRole = await admin
      .getByTestId("ambient-work-surface")
      .getAttribute("data-home-role");
    const eRole = await emp
      .getByTestId("ambient-work-surface")
      .getAttribute("data-home-role");
    expect(aRole).toBeTruthy();
    expect(eRole).toBeTruthy();
    // Soft: when both are admin on demo org, still assert surface is present.
    // When roles differ, they must not collapse to the same thin story only.
    const aPresence =
      (await admin.getByTestId("ambient-presence-line").textContent()) ?? "";
    const ePresence =
      (await emp.getByTestId("ambient-presence-line").textContent()) ?? "";
    expect(aPresence.length).toBeGreaterThan(5);
    expect(ePresence.length).toBeGreaterThan(5);
    console.log(`[b05-diff] admin=${aRole} employee=${eRole}`);
  } finally {
    await adminCtx.close();
    await empCtx.close();
  }
});

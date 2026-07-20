// FILE: otzar-live-workos-ia.spec.ts
// PURPOSE: DEEP Work OS live smoke — INFORMATION ARCHITECTURE. Proves the two
//          personas stay clean on the LIVE app: (employee) the ambient nav is
//          the minimal approved loop and leaks no admin surface; (admin) the
//          shipped nav has the 8 production sections with the approved
//          placements + the connector fold, and every deep link resolves.
//          Employee IA is asserted via the live UI; admin IA (no live UI admin
//          login available — sadeil is API-only) is asserted from the shipped
//          nav source + live route deep-link safety.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-workos-ia.spec.ts
import { test, expect, request as pwRequest, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UI_BASE, PW, SKIP_NO_PW, ev } from "./workos-helpers";

const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";

test.describe("live workos IA: employee minimal + admin production sections", () => {
  test.skip(!PW, SKIP_NO_PW);

  async function loginEmployee(p: Page): Promise<void> {
    await p.goto("/login");
    await p.getByLabel("Email").fill(EMPLOYEE_EMAIL);
    await p.getByLabel("Password").fill(PW as string);
    await p.getByRole("button", { name: /sign in/i }).click();
    await p.waitForURL(/\/app/, { timeout: 25_000 }).catch(() => undefined);
    await p.getByTestId("ambient-nav").waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  }

  test("employee ambient nav is the minimal loop and leaks NO admin surface", async ({ page }) => {
    await loginEmployee(page);
    const rail = page.getByTestId("ambient-nav");
    // C-03 / WAVE-1 primary: Today · Talk · Needs me · People · Memory
    for (const label of ["Today", "Talk", "Needs me", "People", "Memory"]) {
      expect(await rail.getByText(label, { exact: false }).count(), `primary rail has ${label}`).toBeGreaterThan(0);
    }
    expect(await rail.getByText("Comms", { exact: true }).count(), "Comms not on primary rail").toBe(0);
    // Admin/diagnostic surfaces must not be on the employee primary surface.
    for (const admin of ["Organization Seeding", "Diagnostics", "Policies & Approvals", "Tools & Connections", "Work Graph & Memory"]) {
      expect(await page.getByText(admin, { exact: true }).count(), `no admin surface "${admin}"`).toBe(0);
    }
    ev(test.info(), "employee rail = Today · Talk · Needs me · People · Memory (+ More); zero admin surfaces ✓");
  });

  test("employee More is curated — hidden route-only surfaces are absent", async ({ page }) => {
    await loginEmployee(page);
    await page.getByTestId("ambient-nav-more").first().click().catch(() => undefined);
    const sheet = page.getByTestId("ambient-nav-more-sheet");
    await sheet.waitFor({ state: "visible", timeout: 8000 });
    // Curated secondary surfaces present (Projects + Tools reconnect path).
    for (const present of ["My AI Teammate", "Projects", "Tools", "Account & Security"]) {
      expect(await sheet.getByText(present, { exact: true }).count(), `More has ${present}`).toBeGreaterThan(0);
    }
    // Route-only (hidden) surfaces are NOT dumped into the sheet.
    for (const hidden of ["Chat", "Getting started", "Observe", "Voice captures", "My Work", "Corrections", "Approvals"]) {
      expect(await sheet.getByText(hidden, { exact: true }).count(), `More hides ${hidden}`).toBe(0);
    }
    ev(test.info(), "More sheet curated: Projects/Tools present; route-only surfaces hidden ✓");
  });

  test("admin nav = 8 production sections with the approved placements + connector fold", () => {
    const nav = readFileSync(resolve(process.cwd(), "src/lib/nav.ts"), "utf8");
    for (const section of [
      '"Overview"', '"People & Roles"', '"Tools & Connections"', '"Work Graph & Memory"',
      '"Policies & Approvals"', '"Workflows & Automation"', '"Audit & Activity"', '"Diagnostics"',
    ]) {
      expect(nav.includes(section), `section ${section}`).toBe(true);
    }
    // Approved placements + connector fold (one merged destination, no separate entries).
    expect(nav.includes('to: "/tools-connections"'), "merged Tools & Connections entry").toBe(true);
    expect(nav.includes('to: "/connectors"'), "no separate Connectors nav entry").toBe(false);
    expect(nav.includes('to: "/connector-rails"'), "no separate MCP nav entry").toBe(false);
    // No raw developer labels as primary nav labels.
    expect(/label:\s*"[^"]*(binding|schema|MCP rail|capability object)/i.test(nav), "no dev jargon labels").toBe(false);
    ev(test.info(), "admin nav.ts: 8 sections ✓, /tools-connections merged ✓, /connectors + /connector-rails folded out ✓");
  });

  test("admin routes are deep-link safe (folded + moved + stub routes all resolve)", async () => {
    const req = await pwRequest.newContext({ baseURL: UI_BASE });
    const routes = [
      "/tools-connections", "/connectors", "/connector-rails", "/organization-seeding",
      "/reports", "/billing", "/onboarding", "/analytics", "/workflows", "/settings",
    ];
    const codes: string[] = [];
    for (const r of routes) {
      const res = await req.get(r, { failOnStatusCode: false });
      codes.push(`${r}:${res.status()}`);
      expect(res.status(), `route ${r} resolves`).toBeLessThan(400);
    }
    await req.dispose();
    ev(test.info(), `deep-link safe (SPA shell 200): ${codes.slice(0, 4).join("  ")} …`);
  });
});

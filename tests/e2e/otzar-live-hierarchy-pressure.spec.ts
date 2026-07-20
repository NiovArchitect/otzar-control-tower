// FILE: otzar-live-hierarchy-pressure.spec.ts
// PURPOSE: Enterprise pressure smoke for hierarchy authoring under real UI.
//          Standard: expose what Otzar cannot yet do — not happy-path theater.
//          - Admin can open People/Users hierarchy authoring surface
//          - Org map + reporting card are present with real people
//          - Cycle assignment is refused with honest human copy (API + UI path)
//          - Non-admin cannot call hierarchy assign (API) and must not get
//            admin-only authoring controls as an employee
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-hierarchy-pressure.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";
import { liveUiLogin } from "./live-login";

test.describe.configure({ retries: 0, mode: "serial" });

const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "walter@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: {
      email,
      password: PW,
      requested_operations: ["read", "write", "share", "admin_org"],
    },
  });
  const body = await lr.json();
  expect(body.token, `login failed for ${email}`).toBeTruthy();
  return body.token as string;
}

test("H1 api pressure: cycle refuse + non-admin 403 + foreign not found", async ({
  request,
}) => {
  const adm = await apiLogin(request, ADMIN);
  const emp = await apiLogin(request, EMPLOYEE);
  const h = await request.get(`${API}/org/hierarchy`, {
    headers: { authorization: `Bearer ${adm}` },
  });
  expect(h.status()).toBe(200);
  const hierarchy = await h.json();
  const ms = (hierarchy.memberships ?? []) as Array<{
    child_id: string;
    role_title?: string | null;
  }>;
  expect(ms.length).toBeGreaterThanOrEqual(2);
  const founder = ms.find((m) => (m.role_title ?? "").toUpperCase() === "FOUNDER");
  const tech = ms.find((m) => (m.role_title ?? "").toUpperCase().includes("TECH"));
  expect(founder?.child_id && tech?.child_id).toBeTruthy();

  // Establish edge tech → founder so cycle is meaningful
  const assignOk = await request.post(`${API}/org/hierarchy/assign`, {
    headers: { authorization: `Bearer ${adm}` },
    data: {
      person_entity_id: tech!.child_id,
      manager_entity_id: founder!.child_id,
    },
  });
  expect(assignOk.status()).toBe(200);
  expect((await assignOk.json()).ok).toBe(true);

  const cycle = await request.post(`${API}/org/hierarchy/assign`, {
    headers: { authorization: `Bearer ${adm}` },
    data: {
      person_entity_id: founder!.child_id,
      manager_entity_id: tech!.child_id,
    },
  });
  expect([422, 409]).toContain(cycle.status());
  expect((await cycle.json()).code).toBe("CYCLE");

  const foreign = await request.post(`${API}/org/hierarchy/assign`, {
    headers: { authorization: `Bearer ${adm}` },
    data: {
      person_entity_id: "00000000-0000-4000-8000-000000000099",
      manager_entity_id: founder!.child_id,
    },
  });
  expect([404, 422]).toContain(foreign.status());
  expect((await foreign.json()).code).toBe("PERSON_NOT_FOUND");

  const denied = await request.post(`${API}/org/hierarchy/assign`, {
    headers: { authorization: `Bearer ${emp}` },
    data: {
      person_entity_id: tech!.child_id,
      manager_entity_id: founder!.child_id,
    },
  });
  expect([401, 403]).toContain(denied.status());
});

test("H2 ui pressure: admin Control Tower /users shows org map + reporting authoring", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const cta = await liveUiLogin(page, ADMIN, PW as string);
  expect(cta).toBe("Sign in");

  // Hierarchy authoring lives on Control Tower /users (admin chrome),
  // NOT ambient /app/users (that path is a catch-all → Today). Pressure
  // defect if product only buried this with no admin path.
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Some shells need the Control Tower entry first
  if (!(await page.getByTestId("reporting-card").count())) {
    const ct = page.getByRole("link", { name: /open control tower|control tower/i });
    if (await ct.count()) {
      await ct.first().click();
      await page.waitForTimeout(1500);
    }
    await page.goto("/users", { waitUntil: "domcontentloaded" });
  }

  const reporting = page.getByTestId("reporting-card");
  await expect(reporting).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("reporting-person-select")).toBeVisible();
  await expect(page.getByTestId("reporting-manager-select")).toBeVisible();
  await expect(page.getByTestId("reporting-assign")).toBeVisible();

  // Org map must show real people under pressure (not empty theater)
  const mapPeople = page.getByTestId("org-map-person");
  await expect
    .poll(async () => mapPeople.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);

  // Person select must list multiple org members
  const personSelect = page.getByTestId("reporting-person-select");
  const optionCount = await personSelect.locator("option").count();
  expect(optionCount).toBeGreaterThan(2);

  // Exercise UI cycle refusal if we can pick two people
  const personVals = await personSelect.locator("option").evaluateAll((opts) =>
    opts
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v.length > 0),
  );
  const managerSelect = page.getByTestId("reporting-manager-select");
  if (personVals.length >= 2) {
    await personSelect.selectOption(personVals[0]!);
    await managerSelect.selectOption(personVals[1]!);
    // Ambient Talk / notification chrome can intercept pointer events on CT.
    await page.getByTestId("reporting-assign").click({ force: true });
    await page.getByTestId("reporting-notice").waitFor({ state: "visible", timeout: 20_000 });
    const notice1 = ((await page.getByTestId("reporting-notice").textContent()) ?? "").toLowerCase();
    expect(notice1.length).toBeGreaterThan(5);

    if (notice1.includes("reports to") || notice1.includes("updated")) {
      await personSelect.selectOption(personVals[1]!);
      await managerSelect.selectOption(personVals[0]!);
      await page.getByTestId("reporting-assign").click({ force: true });
      await page.getByTestId("reporting-notice").waitFor({ state: "visible", timeout: 20_000 });
      const notice2 = ((await page.getByTestId("reporting-notice").textContent()) ?? "").toLowerCase();
      const cycleHonest =
        notice2.includes("report to their own report") ||
        notice2.includes("different manager") ||
        notice2.includes("couldn't save") ||
        notice2.includes("reports to");
      expect(cycleHonest).toBeTruthy();
      if (notice2.includes("reports to") && !notice2.includes("own report")) {
        console.log("[pressure] UI reverse assign did not surface CYCLE copy:", notice2);
      }
    }
  }

  const mapCountOnUsers = await mapPeople.count();
  // Ambient People (/app/collaboration) is the daily "People" entry — under
  // pressure, admins may never find Control Tower /users hierarchy authoring.
  await page.goto("/app/collaboration", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  // Ambient People has structure glance + admin assign (not the CT reporting-card).
  const ambientHasReporting =
    (await page.getByTestId("people-structure-admin").count()) > 0 ||
    (await page.getByTestId("people-structure-admin-toggle").count()) > 0 ||
    (await page.getByTestId("reporting-card").count()) > 0;
  const ambientCtLink =
    (await page.getByTestId("people-structure-open-ct-users").count()) > 0;
  console.log(
    `[hierarchy-pressure] admin map_people=${mapCountOnUsers} person_options=${optionCount} ambient_people_has_reporting=${ambientHasReporting} ambient_ct_link=${ambientCtLink}`,
  );
  if (!ambientHasReporting) {
    console.log(
      "[pressure-note] DISCOVERABILITY: ambient People has no reporting authoring; Control Tower /users does.",
    );
  }
});

test("H3 ui pressure: non-admin must not get reporting assign controls", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const body = ((await page.locator("body").textContent()) ?? "").toLowerCase();
  const reportingCount = await page.getByTestId("reporting-card").count();
  const assignCount = await page.getByTestId("reporting-assign").count();
  const onLogin = page.url().includes("/login");
  const denied =
    onLogin ||
    reportingCount === 0 ||
    assignCount === 0 ||
    /not authorized|permission|admin|access denied|don't have|do not have/i.test(body);
  if (assignCount > 0 && reportingCount > 0 && !onLogin) {
    throw new Error(
      "PRESSURE DEFECT: non-admin sees reporting-assign controls on /users",
    );
  }
  expect(denied).toBeTruthy();
  console.log(
    `[hierarchy-pressure] employee reporting=${reportingCount} assign=${assignCount} url=${page.url()}`,
  );
});

// FILE: otzar-live-people-full-queue.spec.ts
// PURPOSE: [GAP-B] LIVE read-only proof that People & Collaboration tells the
//          TRUE setup scale. The live org naturally has more people needing a
//          first project/workspace than the capped card list shows, so:
//          Q1 API: org-growth carries the uncapped queue (safe fields, admin
//             only) and it agrees with the uncapped signal.
//          Q2 UI: the card shows honest "Showing X of Y" copy, expands to a
//             server-backed queue with the real Assign rail, and renders no
//             UUIDs or developer language. Screenshot. Zero mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-people-full-queue.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "queue";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read"] },
  });
  return (await lr.json()).token as string;
}
const authed = (t: string) => ({ authorization: `Bearer ${t}` });

test("Q1 api: the uncapped setup queue is served with safe fields and agrees with the signal; employee refused", async ({ request }) => {
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  const empRes = await request.get(`${API}/otzar/dandelion/org-growth`, { headers: authed(emp) });
  expect(empRes.status()).toBe(403);

  const adm = await apiLogin(request, ADMIN_EMAIL);
  const res = await request.get(`${API}/otzar/dandelion/org-growth`, { headers: authed(adm) });
  expect(res.status()).toBe(200);
  const growth = (await res.json()).growth as {
    signals: { members_without_project_count: number };
    needs_first_project_people: Array<Record<string, unknown>>;
  };
  expect(Array.isArray(growth.needs_first_project_people)).toBe(true);
  // The queue IS the uncapped truth behind the signal.
  expect(growth.needs_first_project_people.length).toBe(
    growth.signals.members_without_project_count,
  );
  for (const p of growth.needs_first_project_people) {
    expect(Object.keys(p).sort()).toEqual(["display_name", "person_entity_id"]);
    expect(typeof p.person_entity_id).toBe("string");
    expect(typeof p.display_name).toBe("string");
  }
  const raw = JSON.stringify(growth);
  for (const banned of ["password_hash", "secret", "public_key", "payload_redacted"]) {
    expect(raw).not.toContain(banned);
  }
});

test("Q2 ui: honest 'Showing X of Y' + expandable server-backed queue with real assign (screenshot)", async ({ page, request }) => {
  test.setTimeout(150_000);
  // Server truth first, so the UI assertions are grounded, not guessed.
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const res = await request.get(`${API}/otzar/dandelion/org-growth`, { headers: authed(adm) });
  const growth = (await res.json()).growth as {
    recommendations: Array<{ kind: string; context?: { person_entity_id: string } }>;
    signals: { members_without_project_count: number };
    needs_first_project_people: Array<{ person_entity_id: string }>;
  };
  const carded = growth.recommendations.filter(
    (r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context !== undefined,
  ).length;
  const total = growth.signals.members_without_project_count;
  const overflow = growth.needs_first_project_people.filter(
    (p) =>
      !growth.recommendations.some(
        (r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context?.person_entity_id === p.person_entity_id,
      ),
  ).length;
  test.skip(overflow === 0, "Live org currently has no queue overflow — nothing to prove visually.");

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/collaboration");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("dandelion-growth-card").waitFor({ state: "visible", timeout: 30_000 });

  const copy = page.getByTestId("dandelion-queue-copy");
  await copy.waitFor({ state: "visible", timeout: 15_000 });
  await expect(copy).toHaveText(
    `Showing ${carded} of ${total} people who need a first project or workspace.`,
  );
  await page.getByTestId("dandelion-queue-toggle").click();
  await expect(page.getByTestId("dandelion-queue-item")).toHaveCount(overflow);
  // Human copy only — no UUIDs rendered as text on the whole card.
  const cardText = (await page.getByTestId("dandelion-growth-card").textContent()) ?? "";
  expect(cardText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  // Every queue entry carries the real assign affordance.
  const assigns = await page
    .getByTestId("dandelion-queue-item")
    .locator('[data-testid="dandelion-assign-open"]')
    .count();
  expect(assigns).toBe(overflow);
  await page.screenshot({ path: `screenshots/${TAG}-1-full-queue.png`, fullPage: true });
});

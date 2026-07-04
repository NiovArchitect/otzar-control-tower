// FILE: otzar-live-team-clarity-health.spec.ts
// PURPOSE: [CE-4B] LIVE read-only proof of manager exception visibility:
//          the summary serves safe counts + labels to a manager (no answer
//          text, no excerpts, no ids/enums), an employee gets the honest
//          team-scope blocker, Team Work renders at most ONE calm box, and
//          reading creates nothing. Zero mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-team-clarity-health.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const MANAGER_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read"] },
  });
  return (await lr.json()).token as string;
}

test("T1 api: manager gets safe counts; employee gets the honest blocker; reading mutates nothing", async ({ request }) => {
  const mgr = await apiLogin(request, MANAGER_EMAIL);
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);

  const escBefore = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${mgr}` },
  });
  const escBeforeCount = ((await escBefore.json()).escalations ?? []).length;

  const res = await request.get(`${API}/work-os/team-clarity-health`, {
    headers: { authorization: `Bearer ${mgr}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  console.log(
    `[ce4] unresolved=${body.unresolved_clarifications_count} overdue=${body.overdue_clarifications_count} ownership_unclear=${body.ownership_unclear_count} topics=${JSON.stringify(body.repeated_ambiguity_topics)} top=${JSON.stringify(body.top_exception ?? null)}`,
  );
  expect(typeof body.unresolved_clarifications_count).toBe("number");
  expect(typeof body.ownership_unclear_count).toBe("number");
  // Safe summary only — no ids, enums, answer text, or excerpt-like content.
  const raw = JSON.stringify(body);
  expect(raw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  expect(raw).not.toMatch(/HUMAN_REVIEW_REQUIRED|SLACK:|source_system|resolution_metadata/);

  const blocked = await request.get(`${API}/work-os/team-clarity-health`, {
    headers: { authorization: `Bearer ${emp}` },
  });
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).code).toBe("TEAM_SCOPE_NOT_CONFIGURED");

  const escAfter = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${mgr}` },
  });
  expect(((await escAfter.json()).escalations ?? []).length).toBe(escBeforeCount);
});

test("T2 ui: Team Work shows at most ONE calm exception box (screenshot)", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill(MANAGER_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/team-work");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("team-work-page").waitFor({ state: "visible", timeout: 30_000 });
  // Settle: the box appears, or the work list finishes loading (whichever
  // truth arrives) — a fixed sleep raced the two fetches on the big org.
  await expect
    .poll(
      async () =>
        (await page.getByTestId("team-clarity-health").count()) > 0 ||
        !((await page.getByTestId("team-work-page").textContent()) ?? "").includes(
          "Loading team work",
        ),
      { timeout: 60_000 },
    )
    .toBe(true);
  await page.waitForTimeout(1500);

  const boxes = await page.getByTestId("team-clarity-health").count();
  console.log(`[ce4] exception boxes rendered: ${boxes}`);
  expect(boxes).toBeLessThanOrEqual(1); // one calm box or silence — never more
  if (boxes === 1) {
    const text = (await page.getByTestId("team-clarity-health").textContent()) ?? "";
    console.log(`[ce4] box: "${text.slice(0, 200)}"`);
    expect(text).not.toMatch(/HUMAN_REVIEW_REQUIRED|[0-9a-f]{8}-[0-9a-f]{4}/);
  }
  await page.screenshot({ path: "screenshots/team-clarity-health.png", fullPage: true });
});

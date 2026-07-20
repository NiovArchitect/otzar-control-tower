// FILE: otzar-live-org-setup.spec.ts
// PURPOSE: [GAP-U SLICE-1] LIVE read-only proof of the Organization Setup
//          page: it renders the guided journey for the real org, its counts
//          agree with the API truth it composes, it fires no writes, and no
//          UUIDs / raw backend enums / secrets appear in the rendered copy.
//          Mutation: NONE by design — this page owns no write paths.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-org-setup.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: PW, requested_operations: ["read", "write", "admin_org"] },
  });
  return (await lr.json()).token as string;
}

test("setup page renders the guided journey honestly; reads only; no leaks (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  const admin = await apiLogin(request);

  // API truth to compare against.
  const peopleR = await request.get(`${API}/org/entities?type=PERSON&take=250`, {
    headers: { authorization: `Bearer ${admin}` },
  });
  const people = ((await peopleR.json()).items ?? []) as Array<Record<string, unknown>>;
  const activeCount = people.filter(
    (p) => p.activation_status === "active" && p.status === "ACTIVE",
  ).length;

  // Track non-GET requests from the shell. Setup itself is read-only; ignore
  // ambient background posts (e.g. twin-work detect-edits-batch from Today shell).
  const nonGet: string[] = [];
  const ambientNoise = [
    "/auth/login",
    "/twin-work/detect-edits-batch",
    "/otzar/presence",
    "/work-style/signal",
  ];
  page.on("request", (req) => {
    if (!req.url().includes("api.otzar.ai") || req.method() === "GET") return;
    if (ambientNoise.some((p) => req.url().includes(p))) return;
    nonGet.push(`${req.method()} ${req.url()}`);
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    history.pushState({}, "", "/setup");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("setup-summary")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("setup-next-step")).toBeVisible();

  // All seven sections render.
  for (const key of ["foundation", "people", "roles", "twins", "tools", "governance", "workflows"]) {
    await expect(page.getByTestId(`setup-section-${key}`)).toBeVisible();
  }

  const body = (await page.locator("main, body").first().textContent()) ?? "";
  // Counts agree with API truth (the active-people line).
  expect(body).toContain(`${activeCount} ${activeCount === 1 ? "person" : "people"} can use Otzar today`);
  // Leak sweep.
  expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(body).not.toMatch(/EXECUTIVE_OVERRIDE|activation_pending|SEED_NEEDS_REVIEW|APP_CREDENTIALS_MISSING|connector_policy/);
  // Overclaim sweep.
  expect(body).not.toMatch(/email sent|invite delivered/i);
  expect(body).toContain("Retention windows and deletion are not configurable yet");
  // [SLICE-2] bulk import exists now — the card offers the CSV door.
  expect(body).toContain("Import them from a CSV");

  await page.screenshot({ path: "screenshots/org-setup-live.png", fullPage: true });

  // [SLICE-5] the setup coach renders grouped recommendations with the
  // separation promise (the live org has role/manager/review stalls).
  const coach = page.getByTestId("setup-coach");
  await expect(coach).toBeVisible();
  const coachText = (await coach.textContent()) ?? "";
  expect(coachText).toContain("Otzar noticed");
  expect(coachText).toContain("separate from your team's operational work");
  expect(coachText).not.toMatch(/task generated|system seed|seed_type|AI decided/i);

  // [SLICE-3] the data-flow trust panel renders read-only with honest rows.
  await page.evaluate(() => {
    history.pushState({}, "", "/setup/data-flow");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("dataflow-row-manual_comms")).toBeVisible({ timeout: 30_000 });
  const flowBody = (await page.locator("main, body").first().textContent()) ?? "";
  expect(flowBody).toContain("they cannot take the company's work");
  expect(flowBody).toContain("retired from active use (audit preserved)");
  expect(flowBody).not.toMatch(/synced|APP_CREDENTIALS_MISSING|source_lineage/);
  await page.screenshot({ path: "screenshots/data-flow-live.png", fullPage: true });

  // [SLICE-4] the go-live gate renders read-only with an honest verdict.
  await page.evaluate(() => {
    history.pushState({}, "", "/setup/go-live");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByTestId("go-live-verdict")).toBeVisible({ timeout: 30_000 });
  const gateBody = (await page.locator("main, body").first().textContent()) ?? "";
  // The live org has active people + flowing work → the honest verdict.
  expect(gateBody).toContain("Ready to run a first workflow");
  expect(gateBody).toContain("does not mean founder-free self-serve onboarding is complete");
  expect(gateBody).not.toMatch(/launch certified|production ready|self-serve complete/i);
  await page.screenshot({ path: "screenshots/go-live-live.png", fullPage: true });

  // Read-only proof: the page fired zero non-GET API calls.
  expect(nonGet).toEqual([]);
  console.log(`[setup] rendered; active=${activeCount}; nonGET=${nonGet.length}`);
});
